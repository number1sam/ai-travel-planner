'use client'

import { useState } from 'react'
import TripPlannerChat from '@/components/chat/TripPlannerChat'
import BackToHomeButton from '@/components/BackToHomeButton'

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

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'bot',
      content: 'Hello! I\'m your AI Travel Assistant. I can help you plan amazing trips, find the best hotels, discover activities, and much more. What would you like to plan today?',
      timestamp: new Date().toISOString(),
      status: 'delivered',
      suggestions: [
        'Plan a trip to Paris',
        'Find hotels in Tokyo',
        'Activities in London',
        'Beach destinations'
      ],
      metadata: {
        confidence: 0.95,
        category: 'general'
      }
    }
  ])
  const [isTyping, setIsTyping] = useState(false)

  const handleSendMessage = async (content: string, attachments?: File[]) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date().toISOString(),
      status: 'sending'
    }

    setMessages(prev => [...prev, userMessage])
    setIsTyping(true)

    // Simulate AI response
    setTimeout(() => {
      const botResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: `I understand you're interested in "${content}". Let me help you with that! I can provide detailed information about destinations, hotels, activities, and create personalized itineraries. What specific aspects would you like to explore?`,
        timestamp: new Date().toISOString(),
        status: 'delivered',
        suggestions: [
          'Show me hotels',
          'Find activities',
          'Plan itinerary',
          'Check flights'
        ],
        metadata: {
          confidence: 0.88,
          category: 'general'
        }
      }

      setMessages(prev => [...prev.map(msg => 
        msg.id === userMessage.id ? {...msg, status: 'delivered'} : msg
      ), botResponse])
      setIsTyping(false)
    }, 2000)

    // Update user message status
    setTimeout(() => {
      setMessages(prev => prev.map(msg => 
        msg.id === userMessage.id ? {...msg, status: 'sent'} : msg
      ))
    }, 500)
  }

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion)
  }

  return (
    <div className="min-h-screen p-4">
      <BackToHomeButton />
      <div className="absolute inset-0 bg-black bg-opacity-40"></div>
      
      <div className="max-w-4xl mx-auto pt-16 relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4 drop-shadow-lg">
            AI Travel Chat
          </h1>
          <p className="text-xl text-white drop-shadow-md">
            Chat with your intelligent travel planning assistant
          </p>
        </div>
        
        <div className="flex justify-center">
          <TripPlannerChat
            messages={messages}
            onSendMessage={handleSendMessage}
            onSuggestionClick={handleSuggestionClick}
            isTyping={isTyping}
            typingIndicator="AI is planning your perfect trip..."
          />
        </div>
      </div>
    </div>
  )
}