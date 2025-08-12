'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

export interface Message {
  id: string
  clientId?: string
  text: string
  sender: 'user' | 'ai'
  timestamp: Date
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
  attachments?: Attachment[]
  retryCount?: number
  error?: string
}

export interface Attachment {
  id: string
  name: string
  size: number
  type: string
  url?: string
  uploadStatus: 'pending' | 'uploading' | 'completed' | 'failed'
  uploadProgress?: number
  error?: string
}

interface MessageQueue {
  message: Omit<Message, 'id' | 'timestamp' | 'status'>
  resolve: (result: Message) => void
  reject: (error: Error) => void
}

interface UseMessageLifecycleOptions {
  maxRetries?: number
  retryDelay?: number
  idempotencyHeader?: string
  onMessageSent?: (message: Message) => void
  onMessageFailed?: (message: Message, error: Error) => void
  onStatusUpdate?: (messageId: string, status: Message['status']) => void
}

export function useMessageLifecycle(options: UseMessageLifecycleOptions = {}) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    idempotencyHeader = 'X-Client-ID',
    onMessageSent,
    onMessageFailed,
    onStatusUpdate
  } = options

  const [messages, setMessages] = useState<Message[]>([])
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [queuedMessages, setQueuedMessages] = useState<Message[]>([])
  
  const messageQueue = useRef<MessageQueue[]>([])
  const processingQueue = useRef(false)
  const retryTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map())

  // Generate unique client ID for idempotency
  const generateClientId = useCallback((): string => {
    return `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }, [])

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Process offline queue when coming online
  useEffect(() => {
    if (isOnline && queuedMessages.length > 0) {
      queuedMessages.forEach(message => {
        if (message.status === 'pending') {
          processMessageSend(message)
        }
      })
      setQueuedMessages([])
    }
  }, [isOnline])

  // Add message to timeline with optimistic UI
  const addMessage = useCallback((messageData: Omit<Message, 'id' | 'timestamp' | 'status'>) => {
    const clientId = messageData.clientId || generateClientId()
    const message: Message = {
      ...messageData,
      id: clientId,
      clientId,
      timestamp: new Date(),
      status: 'pending',
      retryCount: 0
    }

    // Immediately add to UI (optimistic)
    setMessages(prev => [...prev, message])

    // Queue for sending or add to offline queue
    if (!isOnline) {
      setQueuedMessages(prev => [...prev, message])
      return Promise.resolve(message)
    }

    return new Promise<Message>((resolve, reject) => {
      messageQueue.current.push({ message: messageData, resolve, reject })
      processQueue()
    })
  }, [generateClientId, isOnline])

  // Process message queue with concurrency control
  const processQueue = useCallback(async () => {
    if (processingQueue.current || messageQueue.current.length === 0) return

    processingQueue.current = true

    while (messageQueue.current.length > 0) {
      const item = messageQueue.current.shift()
      if (!item) break

      try {
        const result = await processMessageSend({
          ...item.message,
          id: item.message.clientId || generateClientId(),
          timestamp: new Date(),
          status: 'pending'
        } as Message)
        item.resolve(result)
      } catch (error) {
        item.reject(error as Error)
      }
    }

    processingQueue.current = false
  }, [generateClientId])

  // Send message to server with retry logic
  const processMessageSend = async (message: Message): Promise<Message> => {
    const sendAttempt = async (attempt: number): Promise<Message> => {
      try {
        // Update status to show sending
        updateMessageStatus(message.id, 'pending')

        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            [idempotencyHeader]: message.clientId || message.id
          },
          body: JSON.stringify({
            text: message.text,
            attachments: message.attachments,
            clientId: message.clientId
          })
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const result = await response.json()
        
        // Success - update message with server data
        const updatedMessage: Message = {
          ...message,
          id: result.id || message.id,
          status: 'sent',
          timestamp: new Date(result.timestamp || Date.now())
        }

        updateMessage(message.id, updatedMessage)
        onMessageSent?.(updatedMessage)
        return updatedMessage

      } catch (error) {
        console.error(`Send attempt ${attempt} failed:`, error)
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        const isRetryable = shouldRetry(error as Error, attempt)

        if (isRetryable && attempt < maxRetries) {
          // Schedule retry with exponential backoff
          const delay = Math.min(retryDelay * Math.pow(2, attempt - 1), 30000)
          
          return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(async () => {
              retryTimeouts.current.delete(message.id)
              try {
                const result = await sendAttempt(attempt + 1)
                resolve(result)
              } catch (retryError) {
                reject(retryError)
              }
            }, delay)
            
            retryTimeouts.current.set(message.id, timeoutId)
          })
        } else {
          // Max retries reached or non-retryable error
          const failedMessage = {
            ...message,
            status: 'failed' as const,
            error: errorMessage,
            retryCount: attempt
          }
          
          updateMessage(message.id, failedMessage)
          onMessageFailed?.(failedMessage, error as Error)
          throw error
        }
      }
    }

    return sendAttempt(1)
  }

  // Determine if error is retryable
  const shouldRetry = (error: Error, attempt: number): boolean => {
    if (attempt >= maxRetries) return false
    
    // Network errors are retryable
    if (error.message.includes('fetch') || error.message.includes('Network')) {
      return true
    }
    
    // HTTP 5xx errors are retryable
    if (error.message.includes('HTTP 5')) {
      return true
    }
    
    // Timeout errors are retryable
    if (error.message.includes('timeout')) {
      return true
    }
    
    return false
  }

  // Update message in timeline
  const updateMessage = useCallback((messageId: string, updates: Partial<Message>) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, ...updates } : msg
    ))
    
    if (updates.status) {
      onStatusUpdate?.(messageId, updates.status)
    }
  }, [onStatusUpdate])

  // Update just the message status
  const updateMessageStatus = useCallback((messageId: string, status: Message['status']) => {
    updateMessage(messageId, { status })
  }, [updateMessage])

  // Retry failed message
  const retryMessage = useCallback(async (messageId: string) => {
    const message = messages.find(m => m.id === messageId)
    if (!message || message.status !== 'failed') return

    // Clear any existing retry timeout
    const timeoutId = retryTimeouts.current.get(messageId)
    if (timeoutId) {
      clearTimeout(timeoutId)
      retryTimeouts.current.delete(messageId)
    }

    // Reset message status and retry
    const resetMessage = {
      ...message,
      status: 'pending' as const,
      error: undefined,
      retryCount: (message.retryCount || 0)
    }
    
    updateMessage(messageId, resetMessage)
    
    try {
      await processMessageSend(resetMessage)
    } catch (error) {
      console.error('Retry failed:', error)
    }
  }, [messages, updateMessage])

  // Handle real-time status updates (WebSocket/SSE)
  const handleStatusUpdate = useCallback((messageId: string, status: Message['status'], serverData?: any) => {
    updateMessage(messageId, {
      status,
      ...(serverData && {
        timestamp: new Date(serverData.timestamp),
        id: serverData.id || messageId
      })
    })
  }, [updateMessage])

  // Clear failed messages
  const clearFailedMessages = useCallback(() => {
    setMessages(prev => prev.filter(msg => msg.status !== 'failed'))
  }, [])

  // Cancel all pending operations
  const cancelPending = useCallback(() => {
    messageQueue.current = []
    retryTimeouts.current.forEach(timeout => clearTimeout(timeout))
    retryTimeouts.current.clear()
    processingQueue.current = false
  }, [])

  return {
    messages,
    queuedMessages,
    isOnline,
    addMessage,
    updateMessage,
    updateMessageStatus,
    retryMessage,
    handleStatusUpdate,
    clearFailedMessages,
    cancelPending,
    stats: {
      total: messages.length,
      pending: messages.filter(m => m.status === 'pending').length,
      sent: messages.filter(m => m.status === 'sent').length,
      failed: messages.filter(m => m.status === 'failed').length,
      queued: queuedMessages.length
    }
  }
}