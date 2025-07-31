'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Send, 
  Paperclip, 
  Smile, 
  MoreVertical, 
  Bot, 
  User,
  Plane,
  Hotel,
  Calendar,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader,
  Image as ImageIcon,
  Mic,
  MicOff,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Refresh
} from 'lucide-react'

interface ChatMessage {
  id: string
  type: 'user' | 'bot' | 'system'
  content: string
  timestamp: string
  status: 'sending' | 'sent' | 'delivered' | 'error'
  attachments?: Array<{
    type: 'image' | 'document'
    url: string
    name: string
  }>
  suggestions?: string[]
  metadata?: {
    confidence?: number
    sources?: string[]
    category?: 'flight' | 'hotel' | 'activity' | 'general'
  }
}

interface TripPlannerChatProps {
  onSendMessage: (message: string, attachments?: File[]) => Promise<void>
  onSuggestionClick: (suggestion: string) => void
  messages: ChatMessage[]
  isTyping: boolean
  typingIndicator?: string
}

export default function TripPlannerChat({
  onSendMessage,
  onSuggestionClick,
  messages,
  isTyping,
  typingIndicator = "AI is thinking..."
}: TripPlannerChatProps) {
  const [inputValue, setInputValue] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  const handleSendMessage = async () => {
    if (!inputValue.trim() && attachments.length === 0) return

    try {
      await onSendMessage(inputValue.trim(), attachments)
      setInputValue('')
      setAttachments([])
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setAttachments(prev => [...prev, ...files])
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    })
  }

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'flight':
        return <Plane className="w-4 h-4" />
      case 'hotel':
        return <Hotel className="w-4 h-4" />
      case 'activity':
        return <MapPin className="w-4 h-4" />
      default:
        return <Bot className="w-4 h-4" />
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sending':
        return <Clock className="w-3 h-3 text-gray-400" />
      case 'sent':
        return <CheckCircle className="w-3 h-3 text-gray-400" />
      case 'delivered':
        return <CheckCircle className="w-3 h-3 text-green-500" />
      case 'error':
        return <AlertCircle className="w-3 h-3 text-red-500" />
      default:
        return null
    }
  }

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-3xl shadow-lg overflow-hidden">
      {/* Chat Header */}
      <div className="bg-gradient-to-r from-brand-green to-brand-seafoam p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg">AI Travel Assistant</h3>
              <p className="text-sm opacity-90">
                {isTyping ? typingIndicator : 'Ready to help plan your trip'}
              </p>
            </div>
          </div>
          <button className="p-2 hover:bg-white hover:bg-opacity-10 rounded-full transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        <AnimatePresence>
          {messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
                {/* Message Bubble */}
                <div
                  className={`
                    relative px-4 py-3 rounded-2xl shadow-sm
                    ${message.type === 'user' 
                      ? 'bg-gradient-to-r from-brand-green to-brand-seafoam text-white ml-4' 
                      : 'bg-white border border-gray-100 mr-4'
                    }
                    ${message.type === 'system' ? 'bg-gray-100 text-gray-600 text-center' : ''}
                  `}
                  style={{
                    borderRadius: message.type === 'user' 
                      ? '20px 20px 4px 20px'
                      : '20px 20px 20px 4px'
                  }}
                >
                  {/* Bot category indicator */}
                  {message.type === 'bot' && message.metadata?.category && (
                    <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
                      {getCategoryIcon(message.metadata.category)}
                      <span className="capitalize">{message.metadata.category} Assistant</span>
                      {message.metadata.confidence && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">
                          {Math.round(message.metadata.confidence * 100)}% confident
                        </span>
                      )}
                    </div>
                  )}

                  {/* Message Content */}
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </div>

                  {/* Attachments */}
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {message.attachments.map((attachment, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 p-2 bg-black bg-opacity-10 rounded-lg"
                        >
                          <ImageIcon className="w-4 h-4" />
                          <span className="text-xs">{attachment.name}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Suggestions */}
                  {message.suggestions && message.suggestions.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {message.suggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => onSuggestionClick(suggestion)}
                          className="block w-full text-left p-2 text-xs bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Message Actions (Bot messages only) */}
                  {message.type === 'bot' && (
                    <div className="absolute -bottom-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1 bg-white rounded-full shadow-sm hover:shadow-md transition-shadow">
                        <ThumbsUp className="w-3 h-3 text-gray-400 hover:text-green-500" />
                      </button>
                      <button className="p-1 bg-white rounded-full shadow-sm hover:shadow-md transition-shadow">
                        <ThumbsDown className="w-3 h-3 text-gray-400 hover:text-red-500" />
                      </button>
                      <button className="p-1 bg-white rounded-full shadow-sm hover:shadow-md transition-shadow">
                        <Copy className="w-3 h-3 text-gray-400 hover:text-blue-500" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Timestamp and Status */}
                <div className={`flex items-center gap-1 mt-1 text-xs text-gray-500 ${
                  message.type === 'user' ? 'justify-end' : 'justify-start'
                }`}>
                  <span>{formatTimestamp(message.timestamp)}</span>
                  {message.type === 'user' && getStatusIcon(message.status)}
                </div>
              </div>

              {/* Avatar */}
              <div className={`flex-shrink-0 ${message.type === 'user' ? 'order-1 ml-2' : 'order-2 mr-2'}`}>
                {message.type === 'user' ? (
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                ) : message.type === 'bot' ? (
                  <div className="w-8 h-8 bg-gradient-to-r from-brand-green to-brand-seafoam rounded-full flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                ) : null}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing Indicator */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 bg-gradient-to-r from-brand-green to-brand-seafoam rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100">
              <div className="flex items-center gap-1">
                <div className="flex gap-1">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1, delay: 0 }}
                    className="w-2 h-2 bg-brand-green rounded-full"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                    className="w-2 h-2 bg-brand-green rounded-full"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                    className="w-2 h-2 bg-brand-green rounded-full"
                  />
                </div>
                <span className="text-xs text-gray-500 ml-2">{typingIndicator}</span>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="flex gap-2 mb-3 overflow-x-auto">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="relative flex-shrink-0 p-2 bg-gray-100 rounded-lg flex items-center gap-2"
              >
                <ImageIcon className="w-4 h-4 text-gray-500" />
                <span className="text-xs text-gray-600 max-w-20 truncate">{file.name}</span>
                <button
                  onClick={() => removeAttachment(index)}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Container */}
        <div className="flex items-end gap-3">
          {/* Attachment Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-500 hover:text-brand-green hover:bg-gray-100 rounded-full transition-colors"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Text Input */}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about your trip..."
              className="w-full px-4 py-3 pr-12 bg-gray-100 border-0 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-brand-green focus:bg-white transition-all max-h-32"
              rows={1}
              style={{ minHeight: '48px' }}
            />
            
            {/* Emoji Button */}
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-500 hover:text-brand-green transition-colors"
            >
              <Smile className="w-4 h-4" />
            </button>
          </div>

          {/* Voice Recording Button */}
          <button
            onClick={() => setIsRecording(!isRecording)}
            className={`p-2 rounded-full transition-colors ${
              isRecording 
                ? 'bg-red-500 text-white' 
                : 'text-gray-500 hover:text-brand-green hover:bg-gray-100'
            }`}
          >
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Send Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSendMessage}
            disabled={!inputValue.trim() && attachments.length === 0}
            className={`p-3 rounded-full transition-all ${
              inputValue.trim() || attachments.length > 0
                ? 'bg-gradient-to-r from-brand-green to-brand-seafoam text-white shadow-lg hover:shadow-xl'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Send className="w-5 h-5" />
          </motion.button>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>
    </div>
  )
}