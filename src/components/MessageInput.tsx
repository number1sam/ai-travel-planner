'use client'

import { useState, useRef, useCallback, useEffect, KeyboardEvent, CompositionEvent } from 'react'
import { Paperclip, X, Image, FileText, Loader2 } from 'lucide-react'
import SendButton, { SendButtonState } from './SendButton'
import { useAttachmentUpload } from '../hooks/useAttachmentUpload'
import { Attachment } from '../hooks/useMessageLifecycle'

interface MessageInputProps {
  value: string
  onChange: (value: string) => void
  onSend: (text: string, attachments: Attachment[]) => void
  onRetry?: () => void
  disabled?: boolean
  placeholder?: string
  maxLength?: number
  className?: string
  sendButtonState?: SendButtonState
  rateLimited?: boolean
  rateLimitCountdown?: number
  'aria-label'?: string
}

export default function MessageInput({
  value,
  onChange,
  onSend,
  onRetry,
  disabled = false,
  placeholder = "Type your message...",
  maxLength = 2000,
  className = '',
  sendButtonState = 'disabled',
  rateLimited = false,
  rateLimitCountdown = 0,
  'aria-label': ariaLabel = "Message input"
}: MessageInputProps) {
  const [isComposing, setIsComposing] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const {
    attachments,
    isUploading,
    canSend: attachmentsReady,
    addFiles,
    removeAttachment,
    clearAttachments,
    getCompletedAttachments,
    handleDrop,
    handleDragOver,
    stats
  } = useAttachmentUpload()

  // Determine if message can be sent
  const canSendMessage = useCallback(() => {
    const trimmedText = value.trim()
    const hasContent = trimmedText.length > 0 || attachments.length > 0
    
    return hasContent && 
           attachmentsReady && 
           !disabled && 
           !isComposing && 
           !rateLimited &&
           sendButtonState !== 'sending' &&
           sendButtonState !== 'disabled'
  }, [value, attachments.length, attachmentsReady, disabled, isComposing, rateLimited, sendButtonState])
  
  // Get the appropriate send button state
  const getEffectiveSendButtonState = useCallback((): SendButtonState => {
    if (rateLimited) return 'disabled'
    if (disabled) return 'disabled'
    if (isComposing) return 'disabled'
    if (!attachmentsReady || isUploading) return 'sending'
    if (!value.trim() && attachments.length === 0) return 'disabled'
    if (sendButtonState) return sendButtonState
    return canSendMessage() ? 'enabled' : 'disabled'
  }, [rateLimited, disabled, isComposing, attachmentsReady, isUploading, value, attachments.length, sendButtonState, canSendMessage])

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    textarea.style.height = 'auto'
    const newHeight = Math.min(textarea.scrollHeight, 120) // Max 120px height
    textarea.style.height = `${newHeight}px`
  }, [])

  // Handle text changes
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    
    // Enforce max length
    if (newValue.length <= maxLength) {
      onChange(newValue)
    }
  }, [onChange, maxLength])

  // Handle key presses
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      
      if (canSendMessage() && !isComposing) {
        handleSend()
      }
    }
  }, [canSendMessage, isComposing])

  // Handle IME composition (for CJK languages)
  const handleCompositionStart = useCallback(() => {
    setIsComposing(true)
  }, [])

  const handleCompositionEnd = useCallback(() => {
    setIsComposing(false)
  }, [])

  // Handle send action
  const handleSend = useCallback(() => {
    if (!canSendMessage()) return

    const messageText = value.trim()
    const completedAttachments = getCompletedAttachments()
    
    onSend(messageText, completedAttachments)
    onChange('')
    clearAttachments()
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [canSendMessage, value, getCompletedAttachments, onSend, onChange, clearAttachments])

  // Handle file selection
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      addFiles(files)
      // Reset input so same file can be selected again
      e.target.value = ''
    }
  }, [addFiles])

  // Handle attachment button click
  const handleAttachmentClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  // Handle drag and drop
  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDropEvent = useCallback((e: DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    handleDrop(e)
  }, [handleDrop])

  // Auto-resize on value change
  useEffect(() => {
    adjustTextareaHeight()
  }, [value, adjustTextareaHeight])

  // Set up drag and drop listeners
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    textarea.addEventListener('dragenter', handleDragEnter as any)
    textarea.addEventListener('dragover', handleDragOver as any)
    textarea.addEventListener('dragleave', handleDragLeave as any)
    textarea.addEventListener('drop', handleDropEvent as any)

    return () => {
      textarea.removeEventListener('dragenter', handleDragEnter as any)
      textarea.removeEventListener('dragover', handleDragOver as any)  
      textarea.removeEventListener('dragleave', handleDragLeave as any)
      textarea.removeEventListener('drop', handleDropEvent as any)
    }
  }, [handleDragEnter, handleDragOver, handleDragLeave, handleDropEvent])

  // Get attachment icon
  const getAttachmentIcon = (attachment: Attachment) => {
    if (attachment.type.startsWith('image/')) {
      return <Image className="w-3 h-3" />
    }
    return <FileText className="w-3 h-3" />
  }

  // Get attachment status color
  const getAttachmentStatusColor = (status: Attachment['uploadStatus']) => {
    switch (status) {
      case 'pending': return 'border-gray-300 bg-gray-50'
      case 'uploading': return 'border-blue-300 bg-blue-50'
      case 'completed': return 'border-green-300 bg-green-50'
      case 'failed': return 'border-red-300 bg-red-50'
      default: return 'border-gray-300 bg-gray-50'
    }
  }

  return (
    <div className={`relative ${className}`}>
      {/* Attachment Previews */}
      {attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className={`
                relative flex items-center gap-2 px-3 py-2 rounded-lg border
                ${getAttachmentStatusColor(attachment.uploadStatus)}
                transition-all duration-200
              `}
            >
              {/* File Icon */}
              <div className="flex-shrink-0">
                {attachment.uploadStatus === 'uploading' ? (
                  <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                ) : (
                  getAttachmentIcon(attachment)
                )}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-700 truncate">
                  {attachment.name}
                </p>
                <p className="text-xs text-gray-500">
                  {(attachment.size / 1024).toFixed(1)} KB
                  {attachment.uploadProgress !== undefined && attachment.uploadStatus === 'uploading' && (
                    <span> • {attachment.uploadProgress}%</span>
                  )}
                </p>
              </div>

              {/* Remove Button */}
              <button
                onClick={() => removeAttachment(attachment.id)}
                className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 transition-colors"
                title="Remove attachment"
              >
                <X className="w-3 h-3" />
              </button>

              {/* Upload Progress Bar */}
              {attachment.uploadStatus === 'uploading' && attachment.uploadProgress !== undefined && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded-b-lg overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${attachment.uploadProgress}%` }}
                  />
                </div>
              )}

              {/* Error Indicator */}
              {attachment.uploadStatus === 'failed' && (
                <div className="absolute inset-0 border border-red-500 rounded-lg pointer-events-none" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Input Container */}
      <div className={`
        relative flex items-end gap-3 p-4 border rounded-xl transition-all duration-200
        ${isFocused ? 'border-blue-500 shadow-sm' : 'border-gray-300'}
        ${isDragOver ? 'border-blue-500 bg-blue-50' : 'bg-white'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}>
        {/* Attachment Button */}
        <button
          type="button"
          onClick={handleAttachmentClick}
          disabled={disabled}
          className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:cursor-not-allowed"
          title="Attach files"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.txt"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Text Area */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled}
            placeholder={isDragOver ? "Drop files here..." : placeholder}
            className={`
              w-full resize-none bg-transparent border-none outline-none
              text-sm leading-relaxed disabled:cursor-not-allowed
              ${isDragOver ? 'pointer-events-none' : ''}
            `}
            rows={1}
            style={{ maxHeight: '120px' }}
            aria-label={ariaLabel}
            aria-describedby="message-info"
          />

          {/* Character Counter */}
          <div 
            id="message-info"
            className="absolute bottom-1 right-1 text-xs text-gray-400 pointer-events-none"
          >
            {value.length}/{maxLength}
          </div>
        </div>

        {/* Send Button with full state support */}
        <SendButton
          state={getEffectiveSendButtonState()}
          onSend={handleSend}
          onRetry={onRetry}
          isComposing={isComposing}
          hasAttachments={attachments.length > 0}
          attachmentsPending={isUploading || !attachmentsReady}
          rateLimited={rateLimited}
          rateLimitCountdown={rateLimitCountdown}
          size="md"
          className="flex-shrink-0"
          aria-label="Send message"
        />
      </div>

      {/* Status Messages */}
      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-2">
          {/* Upload Status */}
          {stats.uploading > 0 && (
            <span>Uploading {stats.uploading} file{stats.uploading !== 1 ? 's' : ''}...</span>
          )}
          
          {/* Failed Uploads */}
          {stats.failed > 0 && (
            <span className="text-red-500">
              {stats.failed} upload{stats.failed !== 1 ? 's' : ''} failed
            </span>
          )}

          {/* Rate Limit */}
          {rateLimited && (
            <span className="text-orange-500">
              Rate limited. Wait {rateLimitCountdown}s
            </span>
          )}
        </div>

        {/* Keyboard Shortcuts */}
        <span>Press Enter to send, Shift+Enter for new line</span>
      </div>

      {/* Offline Indicator */}
      {!navigator.onLine && (
        <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-xs text-orange-700">
            You're offline. Messages will send when you're back online.
          </p>
        </div>
      )}

      {/* Drag Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 border-2 border-dashed border-blue-500 bg-blue-50/50 rounded-xl flex items-center justify-center pointer-events-none">
          <div className="text-blue-600 font-medium">Drop files to attach</div>
        </div>
      )}

      {/* Live Region for Screen Readers */}
      <div
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      >
        {isUploading && `Uploading ${stats.uploading} files`}
        {stats.completed > 0 && `${stats.completed} files ready to send`}
        {stats.failed > 0 && `${stats.failed} uploads failed`}
      </div>
    </div>
  )
}