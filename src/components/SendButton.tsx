'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Send, Clock, AlertCircle, RotateCcw, Loader2 } from 'lucide-react'

export type SendButtonState = 'disabled' | 'enabled' | 'sending' | 'sent' | 'failed'
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed'

interface SendButtonProps {
  state: SendButtonState
  onSend: () => void
  onRetry?: () => void
  disabled?: boolean
  isComposing?: boolean
  hasAttachments?: boolean
  attachmentsPending?: boolean
  rateLimited?: boolean
  rateLimitCountdown?: number
  className?: string
  size?: 'sm' | 'md' | 'lg'
  'aria-label'?: string
}

export default function SendButton({
  state,
  onSend,
  onRetry,
  disabled = false,
  isComposing = false,
  hasAttachments = false,
  attachmentsPending = false,
  rateLimited = false,
  rateLimitCountdown = 0,
  className = '',
  size = 'md',
  'aria-label': ariaLabel
}: SendButtonProps) {
  const [isPressed, setIsPressed] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-12 h-12 text-base',
    lg: 'w-14 h-14 text-lg'
  }

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4', 
    lg: 'w-5 h-5'
  }

  const isInteractive = !disabled && !isComposing && !attachmentsPending && !rateLimited
  const canSend = state === 'enabled' && isInteractive

  // Generate accessible label based on state
  const getAccessibleLabel = useCallback((): string => {
    if (ariaLabel) return ariaLabel
    
    if (rateLimited) return `Rate limited. Wait ${rateLimitCountdown} seconds`
    if (isComposing) return 'Composing text...'
    if (attachmentsPending) return 'Uploading attachments...'
    
    switch (state) {
      case 'disabled': return 'Send message (disabled)'
      case 'enabled': return 'Send message'
      case 'sending': return 'Sending message...'
      case 'sent': return 'Message sent'
      case 'failed': return 'Send failed. Click to retry'
      default: return 'Send message'
    }
  }, [state, ariaLabel, rateLimited, rateLimitCountdown, isComposing, attachmentsPending])

  // Handle button interactions with proper feedback
  const handleClick = useCallback(() => {
    if (!isInteractive) return
    
    setIsPressed(true)
    
    if (state === 'failed' && onRetry) {
      onRetry()
    } else if (canSend) {
      onSend()
    }
    
    // Haptic feedback on mobile if available
    if ('vibrate' in navigator) {
      navigator.vibrate(50)
    }
    
    setTimeout(() => setIsPressed(false), 150)
  }, [state, canSend, isInteractive, onSend, onRetry])

  // Show success feedback briefly when message is sent
  useEffect(() => {
    if (state === 'sent') {
      setShowFeedback(true)
      const timer = setTimeout(() => setShowFeedback(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [state])

  // Handle keyboard interaction
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }, [handleClick])

  // Get button styling based on state
  const getButtonClasses = (): string => {
    const baseClasses = `
      relative rounded-full transition-all duration-200 ease-in-out
      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
      disabled:cursor-not-allowed select-none
      ${sizeClasses[size]}
      ${className}
    `.trim()

    if (!isInteractive) {
      return `${baseClasses} bg-gray-300 text-gray-500 cursor-not-allowed`
    }

    switch (state) {
      case 'disabled':
        return `${baseClasses} bg-gray-300 text-gray-500 cursor-not-allowed`
      case 'enabled':
        return `${baseClasses} bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700 
                ${isPressed ? 'scale-95 bg-blue-700' : 'hover:scale-105'} 
                shadow-lg hover:shadow-xl`
      case 'sending':
        return `${baseClasses} bg-blue-400 text-white cursor-not-allowed`
      case 'sent':
        return `${baseClasses} bg-green-500 text-white ${showFeedback ? 'scale-110' : ''}`
      case 'failed':
        return `${baseClasses} bg-red-500 text-white hover:bg-red-600 active:bg-red-700
                ${isPressed ? 'scale-95 bg-red-700' : 'hover:scale-105'}
                shadow-lg hover:shadow-xl animate-pulse`
      default:
        return baseClasses
    }
  }

  // Render appropriate icon based on state
  const renderIcon = () => {
    const iconClass = iconSizes[size]
    
    if (rateLimited) {
      return (
        <div className="flex flex-col items-center">
          <Clock className={iconClass} />
          <span className="text-xs mt-1">{rateLimitCountdown}</span>
        </div>
      )
    }

    switch (state) {
      case 'sending':
        return <Loader2 className={`${iconClass} animate-spin`} />
      case 'sent':
        return showFeedback ? (
          <div className="flex items-center justify-center">
            <div className={`${iconClass} rounded-full bg-white/20 flex items-center justify-center`}>
              <div className="w-2 h-2 bg-white rounded-full" />
            </div>
          </div>
        ) : (
          <Send className={iconClass} />
        )
      case 'failed':
        return onRetry ? <RotateCcw className={iconClass} /> : <AlertCircle className={iconClass} />
      default:
        return <Send className={iconClass} />
    }
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={!isInteractive}
      className={getButtonClasses()}
      aria-label={getAccessibleLabel()}
      aria-pressed={isPressed}
      aria-describedby={state === 'failed' ? 'send-error' : undefined}
      tabIndex={0}
      style={{
        minWidth: '44px', // Ensure minimum touch target size
        minHeight: '44px'
      }}
    >
      {renderIcon()}
      
      {/* Status indicator */}
      {(state === 'sending' || state === 'sent') && (
        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white">
          <div className={`w-full h-full rounded-full ${
            state === 'sending' ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'
          }`} />
        </div>
      )}
      
      {/* Error message for screen readers */}
      {state === 'failed' && (
        <div id="send-error" className="sr-only">
          Message failed to send. Press button to retry.
        </div>
      )}
      
      {/* Success feedback tooltip */}
      {showFeedback && state === 'sent' && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 
                        px-2 py-1 bg-green-600 text-white text-xs rounded whitespace-nowrap
                        animate-fade-in-out">
          Sent!
        </div>
      )}
    </button>
  )
}

// CSS classes for animations (add to your global CSS)
const styles = `
  @keyframes fade-in-out {
    0% { opacity: 0; transform: translateY(10px) translateX(-50%); }
    50% { opacity: 1; transform: translateY(-4px) translateX(-50%); }
    100% { opacity: 0; transform: translateY(-8px) translateX(-50%); }
  }
  
  .animate-fade-in-out {
    animation: fade-in-out 2s ease-in-out forwards;
  }
`

export { styles as SendButtonStyles }