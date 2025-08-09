'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Send, Bot, User, RotateCcw, Copy, Download } from 'lucide-react'
import { useState } from 'react'

interface Message {
  id: string
  text: string
  sender: 'user' | 'ai'
  timestamp: Date
  isTyping?: boolean
}

interface ChatInterfaceProps {
  messages: Message[]
  currentMessage: string
  isLoading: boolean
  availablePrompts: string[]
  messagesEndRef: React.RefObject<HTMLDivElement>
  inputRef: React.RefObject<HTMLInputElement>
  onMessageChange: (message: string) => void
  onSendMessage: () => void
  onPromptClick: (prompt: string) => void
  onClearChat?: () => void
  conversationId?: string
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void
}

export default function ChatInterface({
  messages,
  currentMessage,
  isLoading,
  availablePrompts,
  messagesEndRef,
  inputRef,
  onMessageChange,
  onSendMessage,
  onPromptClick,
  onClearChat,
  conversationId,
  onScroll
}: ChatInterfaceProps) {
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSendMessage()
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSendMessage()
    }
  }

  const handleCopyMessage = async (messageText: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(messageText)
      setCopiedMessageId(messageId)
      setTimeout(() => setCopiedMessageId(null), 2000)
    } catch (error) {
      console.error('Failed to copy message:', error)
    }
  }

  const handleExportConversation = () => {
    const conversationText = messages
      .map(msg => `${msg.sender === 'user' ? 'You' : 'AI Travel Assistant'}: ${msg.text}`)
      .join('\n\n')
    
    const blob = new Blob([conversationText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `travel-conversation-${conversationId || Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg flex flex-col h-full">
      {/* Chat Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-brand-green to-brand-seafoam rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">AI Travel Assistant</h2>
              <p className="text-sm text-gray-500">Online and ready to help ({messages.length} messages)</p>
            </div>
          </div>
          
          {/* Chat Controls */}
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleExportConversation}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Export conversation"
            >
              <Download className="w-4 h-4" />
            </motion.button>
            
            {onClearChat && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClearChat}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Clear conversation"
              >
                <RotateCcw className="w-4 h-4" />
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* Messages Container - Enhanced with better height and scrolling */}
      <div 
        className="flex-1 overflow-y-auto p-6 space-y-4 min-h-[500px] max-h-[600px]"
        onScroll={onScroll}
      >
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-3 max-w-[85%] ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.sender === 'user' 
                    ? 'bg-brand-green' 
                    : 'bg-gradient-to-br from-brand-green to-brand-seafoam'
                }`}>
                  {message.sender === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>

                {/* Message Bubble - Enhanced with better formatting */}
                <div className={`group relative rounded-2xl px-4 py-3 ${
                  message.sender === 'user'
                    ? 'bg-brand-green text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  {message.id === 'typing-indicator' ? (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      <span className="ml-2 text-sm text-gray-500">AI is thinking...</span>
                    </div>
                  ) : (
                    <>
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.text}
                      </div>
                      
                      {/* Copy button */}
                      {message.text && (
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleCopyMessage(message.text, message.id)}
                          className={`absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity ${
                            message.sender === 'user' 
                              ? 'text-green-100 hover:text-white hover:bg-green-600' 
                              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'
                          }`}
                          title="Copy message"
                        >
                          <Copy className="w-3 h-3" />
                          {copiedMessageId === message.id && (
                            <span className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs bg-black text-white px-1 py-0.5 rounded">
                              Copied!
                            </span>
                          )}
                        </motion.button>
                      )}
                      
                      <div className={`text-xs mt-1 ${
                        message.sender === 'user' ? 'text-green-100' : 'text-gray-500'
                      }`}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts */}
      {availablePrompts.length > 0 && (
        <div className="px-6 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-2">Suggested prompts:</p>
          <div className="flex flex-wrap gap-2">
            {availablePrompts.map((prompt, index) => (
              <motion.button
                key={index}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onPromptClick(prompt)}
                className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-brand-green hover:text-white rounded-full transition-colors duration-200"
              >
                {prompt}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-6 border-t border-gray-200">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={currentMessage}
              onChange={(e) => onMessageChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message or ask for suggestions..."
              disabled={isLoading}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              maxLength={500}
            />
            <div className="absolute bottom-2 right-2 text-xs text-gray-400">
              {currentMessage.length}/500
            </div>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={!currentMessage.trim() || isLoading}
            className="px-4 py-3 bg-gradient-to-r from-brand-green to-brand-seafoam text-white rounded-xl hover:opacity-90 transition-opacity duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[48px]"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </motion.button>
        </form>
        
        <p className="text-xs text-gray-400 mt-2 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}