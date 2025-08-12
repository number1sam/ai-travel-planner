'use client'

import { useState, useCallback, useRef } from 'react'
import { Check, CheckCheck, Clock, AlertCircle, RotateCcw, Copy, X } from 'lucide-react'
import { Message } from '../hooks/useMessageLifecycle'

interface MessageBubbleProps {
  message: Message
  onRetry?: (messageId: string) => void
  onCopy?: (text: string) => void
  onDelete?: (messageId: string) => void
  showTimestamp?: boolean
  showStatus?: boolean
  animate?: boolean
}

export default function MessageBubble({
  message,
  onRetry,
  onCopy,
  onDelete,
  showTimestamp = true,
  showStatus = true,
  animate = true
}: MessageBubbleProps) {
  const [showCopied, setShowCopied] = useState(false)
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())
  const bubbleRef = useRef<HTMLDivElement>(null)

  const handleCopy = useCallback(async () => {
    if (!onCopy) return
    
    try {
      await navigator.clipboard.writeText(message.text)
      onCopy(message.text)
      setShowCopied(true)
      setTimeout(() => setShowCopied(false), 2000)
      
      if ('vibrate' in navigator) {
        navigator.vibrate(50)
      }
    } catch (error) {
      console.error('Failed to copy message:', error)
    }
  }, [message.text, onCopy])

  const handleImageError = useCallback((attachmentId: string) => {
    setImageErrors(prev => new Set(prev).add(attachmentId))
  }, [])

  const handleRetry = useCallback(() => {
    if (onRetry && message.status === 'failed') {
      onRetry(message.id)
    }
  }, [message.id, message.status, onRetry])

  const getStatusIcon = () => {
    switch (message.status) {
      case 'pending':
        return <Clock className="w-3 h-3 text-gray-400 animate-pulse" />
      case 'sent':
        return <Check className="w-3 h-3 text-blue-500" />
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-blue-500" />
      case 'read':
        return <CheckCheck className="w-3 h-3 text-green-500 fill-current" />
      case 'failed':
        return <AlertCircle className="w-3 h-3 text-red-500" />
      default:
        return null
    }
  }

  const getStatusText = () => {
    switch (message.status) {
      case 'pending':
        return 'Sending...'
      case 'sent':
        return 'Sent'
      case 'delivered':
        return 'Delivered'
      case 'read':
        return 'Read'
      case 'failed':
        return message.error || 'Failed to send'
      default:
        return ''
    }
  }

  const getBubbleClasses = () => {
    const baseClasses = `
      relative max-w-[70%] rounded-2xl px-4 py-3 break-words
      ${animate ? 'transition-all duration-300 ease-in-out' : ''}
    `.trim()

    if (message.sender === 'user') {
      const opacity = message.status === 'pending' ? 'opacity-75' : 'opacity-100'
      const bg = message.status === 'failed' ? 'bg-red-500' : 'bg-blue-500'
      return `${baseClasses} ${bg} text-white ml-auto ${opacity}`
    } else {
      return `${baseClasses} bg-gray-100 text-gray-900`
    }
  }

  const getContainerClasses = () => {
    const baseClasses = `
      flex gap-3 mb-4 group
      ${animate ? 'animate-fade-in' : ''}
    `.trim()
    
    return message.sender === 'user' 
      ? `${baseClasses} justify-end flex-row-reverse`
      : `${baseClasses} justify-start`
  }

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date()
    const isToday = timestamp.toDateString() === now.toDateString()
    
    if (isToday) {
      return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else {
      return timestamp.toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit' 
      })
    }
  }

  const renderAttachments = () => {
    if (!message.attachments?.length) return null

    return (
      <div className="mt-2 space-y-2">
        {message.attachments.map((attachment) => {
          const isImage = attachment.type.startsWith('image/')
          const hasError = imageErrors.has(attachment.id)
          
          return (
            <div key={attachment.id} className="rounded-lg overflow-hidden">
              {isImage && !hasError ? (
                <img
                  src={attachment.url}
                  alt={attachment.name}
                  className="max-w-full h-auto rounded-lg"
                  onError={() => handleImageError(attachment.id)}
                  loading="lazy"
                />
              ) : (
                <div className={`
                  flex items-center gap-2 p-3 rounded-lg
                  ${message.sender === 'user' ? 'bg-blue-600' : 'bg-gray-200'}
                `}>
                  <div className="flex-shrink-0">
                    {attachment.uploadStatus === 'uploading' ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : attachment.uploadStatus === 'failed' ? (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    ) : (
                      <div className="w-4 h-4 bg-current rounded opacity-60" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{attachment.name}</p>
                    <p className="text-xs opacity-75">
                      {(attachment.size / 1024).toFixed(1)} KB
                      {attachment.uploadProgress && attachment.uploadStatus === 'uploading' && 
                        ` • ${attachment.uploadProgress}%`
                      }
                    </p>
                  </div>
                  
                  {attachment.uploadStatus === 'failed' && onRetry && (
                    <button
                      onClick={() => onRetry(attachment.id)}
                      className="p-1 hover:bg-white/10 rounded transition-colors"
                      title="Retry upload"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className={getContainerClasses()}>
      {/* Avatar */}
      <div className={`
        w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-medium
        ${message.sender === 'user' ? 'bg-blue-500' : 'bg-gray-500'}
      `}>
        {message.sender === 'user' ? 'U' : 'AI'}
      </div>

      {/* Message Bubble */}
      <div ref={bubbleRef} className={getBubbleClasses()}>
        {/* Message Text */}
        {message.text && (
          <div className="text-sm leading-relaxed whitespace-pre-wrap">
            {message.text}
          </div>
        )}

        {/* Attachments */}
        {renderAttachments()}

        {/* Timestamp and Status */}
        <div className={`
          flex items-center justify-between mt-2 text-xs
          ${message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'}
        `}>
          {showTimestamp && (
            <span>{formatTimestamp(message.timestamp)}</span>
          )}
          
          {showStatus && message.sender === 'user' && (
            <div className="flex items-center gap-1">
              {getStatusIcon()}
              <span className="sr-only">{getStatusText()}</span>
            </div>
          )}
        </div>

        {/* Error Display */}
        {message.status === 'failed' && message.error && (
          <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded-lg">
            <p className="text-xs text-red-700">{message.error}</p>
            {onRetry && (
              <button
                onClick={handleRetry}
                className="mt-1 flex items-center gap-1 text-xs text-red-600 hover:text-red-800 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Retry
              </button>
            )}
          </div>
        )}

        {/* Action Buttons (appear on hover) */}
        <div className={`
          absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity
          ${message.sender === 'user' ? '' : ''}
        `}>
          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className={`
              p-1 rounded transition-colors relative
              ${message.sender === 'user' 
                ? 'text-blue-100 hover:text-white hover:bg-blue-600' 
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'
              }
            `}
            title="Copy message"
          >
            <Copy className="w-3 h-3" />
            {showCopied && (
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap">
                Copied!
              </div>
            )}
          </button>

          {/* Delete Button */}
          {onDelete && (
            <button
              onClick={() => onDelete(message.id)}
              className={`
                p-1 rounded transition-colors
                ${message.sender === 'user'
                  ? 'text-blue-100 hover:text-white hover:bg-red-600'
                  : 'text-gray-400 hover:text-red-600 hover:bg-red-100'
                }
              `}
              title="Delete message"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Add these CSS classes to your global styles
export const MessageBubbleStyles = `
  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .animate-fade-in {
    animation: fade-in 0.3s ease-out;
  }
`