'use client'

import { useEffect, useCallback, useRef } from 'react'

interface KeyboardNavigationOptions {
  onSend?: () => void
  onRetry?: () => void
  onClearChat?: () => void
  onFocusInput?: () => void
  onFocusSend?: () => void
  onCopy?: () => void
  onAttach?: () => void
  enabled?: boolean
}

export function useKeyboardNavigation(options: KeyboardNavigationOptions = {}) {
  const {
    onSend,
    onRetry,
    onClearChat,
    onFocusInput,
    onFocusSend,
    onCopy,
    onAttach,
    enabled = true
  } = options

  const activeElementRef = useRef<string>('')

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return

    // Don't interfere with form inputs or content editable elements
    const target = event.target as HTMLElement
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true' ||
      target.getAttribute('role') === 'textbox'
    ) {
      // Only handle specific shortcuts in input contexts
      if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case 'enter':
            if (event.ctrlKey && onSend) {
              event.preventDefault()
              onSend()
              announceAction('Message sent')
            }
            break
          case 'k':
            if (onClearChat) {
              event.preventDefault()
              onClearChat()
              announceAction('Chat cleared')
            }
            break
        }
      }
      
      // Handle Alt key shortcuts in inputs
      if (event.altKey) {
        switch (event.key.toLowerCase()) {
          case 'r':
            if (onRetry) {
              event.preventDefault()
              onRetry()
              announceAction('Retrying message')
            }
            break
          case 'a':
            if (onAttach) {
              event.preventDefault()
              onAttach()
              announceAction('Attachment dialog opened')
            }
            break
        }
      }
      
      return
    }

    // Global shortcuts when not in input
    const isModifierPressed = event.ctrlKey || event.metaKey

    if (isModifierPressed) {
      switch (event.key.toLowerCase()) {
        case '/':
        case 'i':
          if (onFocusInput) {
            event.preventDefault()
            onFocusInput()
            announceAction('Focused input field')
          }
          break
        case 'enter':
          if (onSend) {
            event.preventDefault()
            onSend()
            announceAction('Message sent')
          }
          break
        case 'k':
          if (onClearChat) {
            event.preventDefault()
            onClearChat()
            announceAction('Chat cleared')
          }
          break
        case 'c':
          // Don't override default copy behavior, but provide feedback
          if (onCopy) {
            onCopy()
            announceAction('Text copied to clipboard')
          }
          break
      }
    }

    // Alt key shortcuts
    if (event.altKey) {
      switch (event.key.toLowerCase()) {
        case 's':
          if (onFocusSend) {
            event.preventDefault()
            onFocusSend()
            announceAction('Focused send button')
          }
          break
        case 'r':
          if (onRetry) {
            event.preventDefault()
            onRetry()
            announceAction('Retrying failed message')
          }
          break
        case 'a':
          if (onAttach) {
            event.preventDefault()
            onAttach()
            announceAction('Opening attachment dialog')
          }
          break
      }
    }

    // Arrow key navigation for messages (when not in input)
    if (['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
      handleMessageNavigation(event)
    }

  }, [enabled, onSend, onRetry, onClearChat, onFocusInput, onFocusSend, onCopy, onAttach])

  // Navigate through messages with arrow keys
  const handleMessageNavigation = useCallback((event: KeyboardEvent) => {
    const messages = document.querySelectorAll('[data-message-id]')
    if (messages.length === 0) return

    const currentIndex = Array.from(messages).findIndex(msg => 
      msg.getAttribute('data-message-id') === activeElementRef.current
    )

    let newIndex: number

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault()
        newIndex = currentIndex > 0 ? currentIndex - 1 : messages.length - 1
        break
      case 'ArrowDown':
        event.preventDefault()
        newIndex = currentIndex < messages.length - 1 ? currentIndex + 1 : 0
        break
      case 'Home':
        event.preventDefault()
        newIndex = 0
        break
      case 'End':
        event.preventDefault()
        newIndex = messages.length - 1
        break
      default:
        return
    }

    const targetMessage = messages[newIndex] as HTMLElement
    if (targetMessage) {
      targetMessage.focus()
      activeElementRef.current = targetMessage.getAttribute('data-message-id') || ''
      
      // Announce the message content for screen readers
      const messageText = targetMessage.querySelector('[data-message-text]')?.textContent || ''
      const messageSender = targetMessage.getAttribute('data-message-sender') || 'unknown'
      announceAction(`Message from ${messageSender}: ${messageText.slice(0, 100)}${messageText.length > 100 ? '...' : ''}`)
    }
  }, [])

  // Announce actions to screen readers
  const announceAction = useCallback((message: string) => {
    const announcement = document.createElement('div')
    announcement.setAttribute('aria-live', 'assertive')
    announcement.setAttribute('aria-atomic', 'true')
    announcement.className = 'sr-only'
    announcement.textContent = message

    document.body.appendChild(announcement)

    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement)
    }, 1000)
  }, [])

  // Set up keyboard event listeners
  useEffect(() => {
    if (!enabled) return

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enabled, handleKeyDown])

  // Focus management utilities
  const focusElement = useCallback((selector: string) => {
    const element = document.querySelector(selector) as HTMLElement
    if (element && element.focus) {
      element.focus()
      
      // Scroll into view if needed
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      })
    }
  }, [])

  const trapFocus = useCallback((containerSelector: string) => {
    const container = document.querySelector(containerSelector)
    if (!container) return

    const focusableElements = container.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable]'
    )

    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleTrap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    container.addEventListener('keydown', handleTrap)
    return () => container.removeEventListener('keydown', handleTrap)
  }, [])

  return {
    focusElement,
    trapFocus,
    announceAction,
    // Shortcut information for help dialog
    shortcuts: {
      global: [
        { keys: ['Ctrl', '/'], description: 'Focus input field' },
        { keys: ['Ctrl', 'Enter'], description: 'Send message' },
        { keys: ['Ctrl', 'K'], description: 'Clear chat' },
        { keys: ['Alt', 'S'], description: 'Focus send button' },
        { keys: ['Alt', 'R'], description: 'Retry failed message' },
        { keys: ['Alt', 'A'], description: 'Open attachments' },
        { keys: ['↑', '↓'], description: 'Navigate messages' },
        { keys: ['Home', 'End'], description: 'First/last message' }
      ],
      input: [
        { keys: ['Enter'], description: 'Send message (if not composing)' },
        { keys: ['Shift', 'Enter'], description: 'New line' },
        { keys: ['Ctrl', 'Enter'], description: 'Force send' },
        { keys: ['Alt', 'A'], description: 'Attach files' }
      ]
    }
  }
}