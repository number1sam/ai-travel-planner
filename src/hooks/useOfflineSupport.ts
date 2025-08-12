'use client'

import { useState, useEffect, useCallback } from 'react'
import { Message } from './useMessageLifecycle'

interface QueuedMessage extends Message {
  originalTimestamp: Date
  queuedAt: Date
  attempts: number
  lastAttemptAt?: Date
  nextRetryAt?: Date
}

interface OfflineQueueOptions {
  storageKey?: string
  maxQueueSize?: number
  maxRetries?: number
  retryDelay?: number
  syncOnReconnect?: boolean
}

export function useOfflineSupport(options: OfflineQueueOptions = {}) {
  const {
    storageKey = 'travel-agent-offline-queue',
    maxQueueSize = 100,
    maxRetries = 5,
    retryDelay = 1000,
    syncOnReconnect = true
  } = options

  const [isOnline, setIsOnline] = useState(() => 
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [queuedMessages, setQueuedMessages] = useState<QueuedMessage[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncAttempt, setLastSyncAttempt] = useState<Date | null>(null)

  // Load queued messages from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        const messages = parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
          originalTimestamp: new Date(msg.originalTimestamp),
          queuedAt: new Date(msg.queuedAt),
          lastAttemptAt: msg.lastAttemptAt ? new Date(msg.lastAttemptAt) : undefined,
          nextRetryAt: msg.nextRetryAt ? new Date(msg.nextRetryAt) : undefined
        }))
        setQueuedMessages(messages)
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error)
    }
  }, [storageKey])

  // Save queued messages to localStorage
  const saveQueue = useCallback((messages: QueuedMessage[]) => {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(storageKey, JSON.stringify(messages))
    } catch (error) {
      console.error('Failed to save offline queue:', error)
    }
  }, [storageKey])

  // Network status detection
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleOnline = () => {
      setIsOnline(true)
      if (syncOnReconnect && queuedMessages.length > 0) {
        syncQueuedMessages()
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [syncOnReconnect, queuedMessages.length])

  // Add message to offline queue
  const queueMessage = useCallback((message: Message): QueuedMessage => {
    const queuedMessage: QueuedMessage = {
      ...message,
      originalTimestamp: message.timestamp,
      queuedAt: new Date(),
      attempts: 0,
      status: 'pending'
    }

    setQueuedMessages(prev => {
      const newQueue = [...prev, queuedMessage]
      
      // Enforce queue size limit
      if (newQueue.length > maxQueueSize) {
        newQueue.splice(0, newQueue.length - maxQueueSize)
      }
      
      saveQueue(newQueue)
      return newQueue
    })

    return queuedMessage
  }, [maxQueueSize, saveQueue])

  // Send queued message
  const sendQueuedMessage = useCallback(async (
    queuedMessage: QueuedMessage,
    sendFunction: (message: Message) => Promise<Message>
  ): Promise<{ success: boolean; updatedMessage?: QueuedMessage; error?: Error }> => {
    const now = new Date()
    const updatedMessage: QueuedMessage = {
      ...queuedMessage,
      attempts: queuedMessage.attempts + 1,
      lastAttemptAt: now,
      nextRetryAt: undefined
    }

    try {
      const result = await sendFunction(queuedMessage)
      
      // Success - remove from queue
      setQueuedMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== queuedMessage.id)
        saveQueue(filtered)
        return filtered
      })

      return { success: true, updatedMessage: { ...updatedMessage, status: 'sent' } }

    } catch (error) {
      console.error(`Failed to send queued message (attempt ${updatedMessage.attempts}):`, error)

      if (updatedMessage.attempts >= maxRetries) {
        // Max retries reached - mark as failed but keep in queue for manual retry
        const failedMessage = { 
          ...updatedMessage, 
          status: 'failed' as const,
          error: `Max retries reached: ${error instanceof Error ? error.message : 'Unknown error'}`
        }

        setQueuedMessages(prev => {
          const updated = prev.map(msg => 
            msg.id === queuedMessage.id ? failedMessage : msg
          )
          saveQueue(updated)
          return updated
        })

        return { success: false, updatedMessage: failedMessage, error: error as Error }
      } else {
        // Schedule next retry
        const delay = Math.min(retryDelay * Math.pow(2, updatedMessage.attempts - 1), 60000) // Max 1 minute
        const nextRetryAt = new Date(now.getTime() + delay)
        
        const retryMessage = { ...updatedMessage, nextRetryAt }

        setQueuedMessages(prev => {
          const updated = prev.map(msg => 
            msg.id === queuedMessage.id ? retryMessage : msg
          )
          saveQueue(updated)
          return updated
        })

        return { success: false, updatedMessage: retryMessage, error: error as Error }
      }
    }
  }, [maxRetries, retryDelay, saveQueue])

  // Sync all queued messages
  const syncQueuedMessages = useCallback(async (
    sendFunction?: (message: Message) => Promise<Message>
  ) => {
    if (!sendFunction || queuedMessages.length === 0 || isSyncing) return

    setIsSyncing(true)
    setLastSyncAttempt(new Date())

    const results = {
      sent: 0,
      failed: 0,
      skipped: 0
    }

    for (const queuedMessage of queuedMessages) {
      // Skip if still waiting for retry delay
      if (queuedMessage.nextRetryAt && queuedMessage.nextRetryAt > new Date()) {
        results.skipped++
        continue
      }

      // Skip if already failed max times and not manually retriggered
      if (queuedMessage.status === 'failed' && queuedMessage.attempts >= maxRetries) {
        results.skipped++
        continue
      }

      const result = await sendQueuedMessage(queuedMessage, sendFunction)
      
      if (result.success) {
        results.sent++
      } else {
        results.failed++
      }

      // Small delay between sends to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    setIsSyncing(false)
    
    return results
  }, [queuedMessages, isSyncing, maxRetries, sendQueuedMessage])

  // Manually retry a failed message
  const retryMessage = useCallback(async (
    messageId: string,
    sendFunction: (message: Message) => Promise<Message>
  ) => {
    const queuedMessage = queuedMessages.find(msg => msg.id === messageId)
    if (!queuedMessage) return

    // Reset retry count for manual retry
    const resetMessage = {
      ...queuedMessage,
      attempts: 0,
      nextRetryAt: undefined,
      status: 'pending' as const,
      error: undefined
    }

    setQueuedMessages(prev => {
      const updated = prev.map(msg => 
        msg.id === messageId ? resetMessage : msg
      )
      saveQueue(updated)
      return updated
    })

    return sendQueuedMessage(resetMessage, sendFunction)
  }, [queuedMessages, saveQueue, sendQueuedMessage])

  // Remove message from queue
  const removeFromQueue = useCallback((messageId: string) => {
    setQueuedMessages(prev => {
      const filtered = prev.filter(msg => msg.id !== messageId)
      saveQueue(filtered)
      return filtered
    })
  }, [saveQueue])

  // Clear all queued messages
  const clearQueue = useCallback(() => {
    setQueuedMessages([])
    saveQueue([])
  }, [saveQueue])

  // Get queue statistics
  const getQueueStats = useCallback(() => {
    const total = queuedMessages.length
    const pending = queuedMessages.filter(msg => msg.status === 'pending').length
    const failed = queuedMessages.filter(msg => msg.status === 'failed').length
    const retrying = queuedMessages.filter(msg => 
      msg.nextRetryAt && msg.nextRetryAt > new Date()
    ).length
    const queued = total

    const oldestMessage = queuedMessages.length > 0 
      ? queuedMessages.reduce((oldest, msg) => 
          msg.queuedAt < oldest.queuedAt ? msg : oldest
        )
      : null

    return {
      total,
      pending,
      failed,
      retrying,
      queued,
      oldestQueuedAt: oldestMessage?.queuedAt || null,
      lastSyncAttempt
    }
  }, [queuedMessages, lastSyncAttempt])

  // Auto-sync on interval when online
  useEffect(() => {
    if (!isOnline || queuedMessages.length === 0 || isSyncing) return

    // Check for messages ready to retry
    const now = new Date()
    const readyToRetry = queuedMessages.some(msg => 
      msg.nextRetryAt && msg.nextRetryAt <= now
    )

    if (readyToRetry) {
      // Trigger a sync check - but we need a send function
      // This would typically be passed from the parent component
      console.log('Messages ready for retry, but no send function provided')
    }
  }, [isOnline, queuedMessages, isSyncing])

  return {
    isOnline,
    queuedMessages,
    isSyncing,
    queueMessage,
    syncQueuedMessages,
    retryMessage,
    removeFromQueue,
    clearQueue,
    getQueueStats,
    stats: getQueueStats()
  }
}