'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { MapPin, DollarSign, Calendar, Users, Save, Check } from 'lucide-react'
import ChatInterface from '@/components/planner/ChatInterface'
import ItineraryPreview from '@/components/planner/ItineraryPreview'
import { findBestHotelForBudget, HotelSelection } from '@/lib/hotelDatabase'

// 🏗️ EXTRACTED AND REFACTORED 'NEW PLAN' FEATURE
// This component contains all the core trip planning functionality
// Previously scattered across the dashboard, now standalone and reusable

interface TripDetails {
  destination: string
  startDate: string
  endDate: string
  duration: number
  budget: number
  travelers: number
  preferences: string[]
  activities: string[]
  departureLocation: string
  accommodationType: string
  travelStyle: string
  specialRequests: string[]
}

interface PlanningQuestions {
  destination: boolean
  duration: boolean
  budget: boolean
  travelers: boolean
  activities: boolean
  accommodation: boolean
  departure: boolean
  travelStyle: boolean
}

interface Message {
  id: string
  text: string
  isUser: boolean
  timestamp: Date
}

interface ItineraryDay {
  id: string
  date: string
  flight?: any
  hotel?: any
  activities: any[]
}

export default function PlanForm() {
  // Generate unique conversation ID for this session
  const [conversationId] = useState(() => `conversation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! I\'m your AI Travel Planner with web research capabilities. I can help you plan trips to ANY destination - including small towns, villages, or places you\'ve heard about. I\'ll research and find the perfect places for your budget and interests! 🌍✈️',
      isUser: false,
      timestamp: new Date()
    }
  ])
  
  const [currentMessage, setCurrentMessage] = useState('')
  const [itinerary, setItinerary] = useState<ItineraryDay[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isDraftSaved, setIsDraftSaved] = useState(false)
  const [conversationContext, setConversationContext] = useState<any>({})
  const [researchedPlaces, setResearchedPlaces] = useState<string[]>([])
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)
  
  const [tripDetails, setTripDetails] = useState<TripDetails>({
    destination: '',
    startDate: '',
    endDate: '',
    duration: 0,
    budget: 0,
    travelers: 1,
    preferences: [],
    activities: [],
    departureLocation: '',
    accommodationType: '',
    travelStyle: '',
    specialRequests: []
  })
  
  const [questionsAnswered, setQuestionsAnswered] = useState<PlanningQuestions>({
    destination: false,
    duration: false,
    budget: false,
    travelers: false,
    activities: false,
    accommodation: false,
    departure: false,
    travelStyle: false
  })
  
  const [currentPreferenceQuestions, setCurrentPreferenceQuestions] = useState<string[]>([])
  const [preferencesGathered, setPreferencesGathered] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  const availablePrompts = [
    "I want to visit small charming towns in England for 7 days with a £2000 budget",
    "Find me beautiful villages in the French countryside for 2 people",
    "I'd like to explore traditional rural towns in Italy for 5 days",
    "Show me hidden gem destinations in Scotland for 10 days"
  ]

  useEffect(() => {
    if (shouldAutoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, shouldAutoScroll])

  // Check if user is near bottom to determine if we should auto-scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100 // 100px threshold
    setShouldAutoScroll(isNearBottom)
  }

  const handleClearChat = async () => {
    try {
      // Clear conversation on server
      await fetch(`/api/rule-based-conversation?conversationId=${conversationId}`, {
        method: 'DELETE'
      })
      
      // Reset local state
      setMessages([
        {
          id: '1',
          text: 'Hello! I\'m your AI Travel Planner with web research capabilities. I can help you plan trips to ANY destination - including small towns, villages, or places you\'ve heard about. I\'ll research and find the perfect places for your budget and interests! 🌍✈️',
          isUser: false,
          timestamp: new Date()
        }
      ])
      setConversationContext({})
      setResearchedPlaces([])
      setItinerary([])
      setTripDetails({
        destination: '',
        startDate: '',
        endDate: '',
        duration: 0,
        budget: 0,
        travelers: 1,
        preferences: [],
        activities: [],
        departureLocation: '',
        accommodationType: '',
        travelStyle: '',
        specialRequests: []
      })
      
      console.log('✅ Chat cleared successfully')
    } catch (error) {
      console.error('❌ Failed to clear chat:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return

    const userMessage = currentMessage.trim()
    const newUserMessage: Message = {
      id: Date.now().toString(),
      text: userMessage,
      isUser: true,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, newUserMessage])
    setCurrentMessage('')
    setIsLoading(true)
    setShouldAutoScroll(true) // Always auto-scroll when sending a message
    
    // Add typing indicator
    const typingMessage: Message = {
      id: 'typing-indicator',
      text: '',
      isUser: false,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, typingMessage])

    try {
      console.log(`💬 Sending to intelligent conversation: "${userMessage}"`)
      
      // Use rule-based conversation API that follows strict conversation rules
      const response = await fetch('/api/rule-based-conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId,
          message: userMessage
        })
      })

      if (!response.ok) {
        throw new Error('Failed to process conversation')
      }

      const result = await response.json()
      
      // Rule-based API has different response format
      console.log('✅ Rule-based response:', result)
      
      // Update conversation context (simplified for rule-based system)
      setConversationContext({
        tripContext: {},
        messageCount: messages.length + 1,
        hasResearchedDestinations: result.canStartSearches,
        researchedPlaces: []
      })
      
      // The rule-based system manages trip state internally
      // We'll update UI based on API feedback when searches can start
      if (result.canStartSearches) {
        console.log('🚀 Trip ready for searches!')
        // Could trigger search UI or itinerary generation here
      }
      
      // Remove typing indicator and add bot response
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: result.response,
        isUser: false,
        timestamp: new Date()
      }

      setMessages(prev => {
        // Remove typing indicator and add real response
        const filtered = prev.filter(msg => msg.id !== 'typing-indicator')
        return [...filtered, botMessage]
      })
      
      console.log(`✅ Response received. Context: ${JSON.stringify(result.conversationContext, null, 2)}`)
      
    } catch (error) {
      console.error('❌ Error processing intelligent conversation:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'I apologize, but I encountered an error processing your request. Please try again - I can research any destination you mention!',
        isUser: false,
        timestamp: new Date()
      }
      setMessages(prev => {
        // Remove typing indicator and add error message
        const filtered = prev.filter(msg => msg.id !== 'typing-indicator')
        return [...filtered, errorMessage]
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Removed old message processing - now using UnifiedConversationManager with web research

  const handlePromptClick = (prompt: string) => {
    setCurrentMessage(prompt)
    handleSendMessage()
  }

  const handleSaveDraft = async () => {
    try {
      const saved = await saveTripToAccount(tripDetails)
      if (saved) {
        setIsDraftSaved(true)
        setTimeout(() => setIsDraftSaved(false), 2000)
      }
    } catch (error) {
      console.error('Failed to save draft:', error)
    }
  }

  // Save trip as draft
  const saveTripToAccount = async (tripDetails: any, itineraryResult?: any) => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      if (!user.email) {
        console.log('No user logged in, skipping save')
        return
      }

      const response = await fetch('/api/user/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: user.email,
          tripData: { 
            ...tripDetails,
            itinerary: itineraryResult?.itinerary || [],
            hotel: itineraryResult?.hotel,
            totalCost: itineraryResult?.totalCost,
            status: itineraryResult ? 'completed' : 'draft',
            generatedAt: new Date().toISOString(),
            messages: messages.slice(-10)
          }
        })
      })
      
      if (response.ok) {
        console.log('✅ Trip saved to user account successfully')
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to save trip:', error)
      return false
    }
  }

  const handleFinalizePlan = async () => {
    try {
      console.log('🚀 Generating complete itinerary with enhanced multi-day planning...')
      
      // Validate we have all required information
      if (!tripDetails.destination || !tripDetails.duration || !tripDetails.budget || !tripDetails.travelers) {
        const missingFields = []
        if (!tripDetails.destination) missingFields.push('destination')
        if (!tripDetails.duration) missingFields.push('duration') 
        if (!tripDetails.budget) missingFields.push('budget')
        if (!tripDetails.travelers) missingFields.push('travelers')
        
        const errorMessage: Message = {
          id: Date.now().toString(),
          text: `I need a bit more information to create your perfect itinerary! Please provide: ${missingFields.join(', ')}`,
          isUser: false,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, errorMessage])
        return
      }
      
      setIsLoading(true)
      
      // Show generation progress message
      const progressMessage: Message = {
        id: Date.now().toString(),
        text: `🤖 Generating your complete ${tripDetails.duration}-day itinerary for ${tripDetails.destination}...\n\n🏨 Finding perfect accommodation within £${Math.round(tripDetails.budget * 0.55)} hotel budget\n🎯 Planning ${tripDetails.duration} full days with morning, afternoon & evening activities\n💰 Optimizing your £${tripDetails.budget} budget allocation\n\nThis will take a moment - I'm ensuring every day is perfectly planned!`,
        isUser: false,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, progressMessage])
      
      // Simulate the enhanced itinerary generation
      // In real implementation this would call the backend API
      await new Promise(resolve => setTimeout(resolve, 3000)) // Simulate processing time
      
      // Generate mock enhanced itinerary based on our system
      const mockItinerary = generateMockItinerary(tripDetails)
      setItinerary(mockItinerary.days)
      
      const successMessage: Message = {
        id: Date.now().toString(),
        text: `🎉 Your complete ${tripDetails.duration}-day itinerary is ready!\n\n🏨 **Hotel:** ${mockItinerary.hotel.name} - £${mockItinerary.hotel.pricePerNight}/night × ${tripDetails.duration} nights\n🗓️ **All ${tripDetails.duration} days planned** with morning, afternoon, and evening activities!\n💰 **Total Cost:** £${mockItinerary.totalCost} of £${tripDetails.budget} budget\n🎯 **Budget Breakdown:** 55% accommodation, 30% activities, 15% food\n\nCheck the itinerary preview on the right for your complete day-by-day plan! ✨`,
        isUser: false,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, successMessage])
      
      // Save to user account
      await saveTripToAccount(tripDetails, mockItinerary)
      
    } catch (error) {
      console.error('Failed to finalize plan:', error)
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: 'I apologize, but I encountered an issue generating your itinerary. Please try again or contact support if the problem persists.',
        isUser: false,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // Generate mock itinerary following our enhanced system
  const generateMockItinerary = (details: TripDetails) => {
    const hotel = {
      name: `${details.destination} Central Hotel`,
      location: `${details.destination} City Center`,
      pricePerNight: Math.round(details.budget * 0.55 / details.duration),
      rating: 4,
      amenities: ['WiFi', 'Breakfast', 'Gym']
    }
    
    const days = []
    for (let dayNum = 1; dayNum <= details.duration; dayNum++) {
      const isArrival = dayNum === 1
      const isDeparture = dayNum === details.duration
      
      let activities = []
      
      if (isArrival) {
        activities = [
          {
            id: `checkin-${dayNum}`,
            name: `Check-in at ${hotel.name}`,
            type: 'accommodation',
            time: '15:00',
            duration: 60,
            location: hotel.location,
            description: `Hotel check-in and settle into your accommodation at ${hotel.name}. Start with breakfast at ${hotel.name} tomorrow.`,
            price: 0
          },
          {
            id: `dinner-${dayNum}`,
            name: `Welcome Dinner`,
            type: 'restaurant', 
            time: '19:00',
            duration: 90,
            location: `Near ${hotel.name}`,
            description: `After settling in at ${hotel.name}, start your ${details.destination} adventure with a delicious local meal. Return to ${hotel.name} for rest.`,
            price: 25
          }
        ]
      } else if (isDeparture) {
        activities = [
          {
            id: `breakfast-${dayNum}`,
            name: `Breakfast at ${hotel.name}`,
            type: 'restaurant',
            time: '08:00', 
            duration: 60,
            location: hotel.name,
            description: `Final breakfast at ${hotel.name} before checkout.`,
            price: 15
          },
          {
            id: `checkout-${dayNum}`,
            name: `Check out from ${hotel.name}`,
            type: 'activity',
            time: '12:00',
            duration: 60, 
            location: hotel.location,
            description: `Check out from ${hotel.name} and prepare for departure.`,
            price: 0
          }
        ]
      } else {
        activities = [
          {
            id: `breakfast-${dayNum}`,
            name: `Breakfast at ${hotel.name}`,
            type: 'restaurant',
            time: '08:00',
            duration: 60,
            location: hotel.name,
            description: `Start your day with breakfast at ${hotel.name}. Fuel up for a full day of exploration.`,
            price: 15
          },
          {
            id: `morning-${dayNum}`,
            name: `Explore ${details.destination}`,
            type: 'sightseeing',
            time: '10:00',
            duration: 180,
            location: `${details.destination} Historic Center`,
            description: `After breakfast at ${hotel.name}, discover the main attractions and landmarks. Just 1.2km from your hotel.`,
            price: 20
          },
          {
            id: `afternoon-${dayNum}`,
            name: `Cultural Experience`,
            type: 'activity', 
            time: '14:00',
            duration: 120,
            location: `${details.destination} Museum District`,
            description: `Afternoon cultural immersion with local experiences. 0.8km from ${hotel.name}.`,
            price: 15
          },
          {
            id: `dinner-${dayNum}`,
            name: `Local Dining`,
            type: 'restaurant',
            time: '19:00',
            duration: 90,
            location: `Near ${hotel.name}`,
            description: `End your day with delicious local cuisine. Return to ${hotel.name} for a restful night.`,
            price: 30
          }
        ]
      }
      
      days.push({
        id: `day-${dayNum}`,
        date: new Date(Date.now() + (dayNum - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        activities
      })
    }
    
    const totalCost = days.reduce((sum, day) => 
      sum + day.activities.reduce((daySum, act) => daySum + act.price, 0), 0
    ) + (hotel.pricePerNight * details.duration)
    
    return {
      hotel,
      days,
      totalCost
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* Trip Context Bar - Enhanced with Research Status */}
      {(tripDetails.destination || tripDetails.budget > 0 || tripDetails.startDate || researchedPlaces.length > 0) && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-6 text-sm text-gray-600">
            {tripDetails.destination && (
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>{tripDetails.destination}</span>
              </div>
            )}
            {tripDetails.budget > 0 && (
              <div className="flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                <span>£{tripDetails.budget.toLocaleString()}</span>
              </div>
            )}
            {tripDetails.startDate && (
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{new Date(tripDetails.startDate).toLocaleDateString()}</span>
              </div>
            )}
            {tripDetails.travelers > 1 && (
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{tripDetails.travelers} travelers</span>
              </div>
            )}
            {researchedPlaces.length > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-600 font-medium">
                  {researchedPlaces.length} places researched
                </span>
              </div>
            )}
          </div>
          
          {/* Show researched places */}
          {researchedPlaces.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="text-xs text-gray-500 mb-1">Web-researched destinations:</div>
              <div className="flex flex-wrap gap-1">
                {researchedPlaces.slice(0, 5).map((place, index) => (
                  <span key={index} className="px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs">
                    {place}
                  </span>
                ))}
                {researchedPlaces.length > 5 && (
                  <span className="px-2 py-1 bg-gray-50 text-gray-500 rounded-full text-xs">
                    +{researchedPlaces.length - 5} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Planning Interface */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Chat Interface - 60% width with fixed height */}
        <div className="lg:col-span-3">
          <div className="h-[800px]">
            <ChatInterface
              messages={messages.map(msg => ({
                id: msg.id,
                text: msg.text,
                sender: msg.isUser ? 'user' : 'ai' as 'user' | 'ai',
                timestamp: msg.timestamp,
                isTyping: false
              }))}
              currentMessage={currentMessage}
              isLoading={isLoading}
              availablePrompts={messages.length <= 2 ? availablePrompts : []} // Hide prompts after conversation starts
              messagesEndRef={messagesEndRef}
              inputRef={inputRef}
              onMessageChange={setCurrentMessage}
              onSendMessage={handleSendMessage}
              onPromptClick={handlePromptClick}
              onClearChat={handleClearChat}
              conversationId={conversationId}
              onScroll={handleScroll}
            />
          </div>
        </div>

        {/* Itinerary Preview - 40% width with matching height */}
        <div className="lg:col-span-2">
          <div className="h-[800px] overflow-y-auto">
            <ItineraryPreview
            itinerary={itinerary.length > 0 ? {
              id: 'current-trip',
              title: `${tripDetails.destination || 'Your'} Adventure`,
              destination: tripDetails.destination || 'Unknown',
              startDate: tripDetails.startDate || new Date().toISOString(),
              endDate: tripDetails.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              totalDays: itinerary.length,
              totalCost: itinerary.reduce((total, day) => {
                const dayTotal = day.activities.reduce((sum, act) => sum + act.price, 0) +
                                (day.flight?.price || 0) +
                                (day.hotel?.pricePerNight || 0)
                return total + dayTotal
              }, 0),
              travelers: tripDetails.travelers || 1,
              summary: `A ${itinerary.length}-day trip to ${tripDetails.destination}`,
              itinerary: itinerary
            } : null}
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 mt-6">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSaveDraft}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors duration-200"
        >
          {isDraftSaved ? <Check className="w-4 h-4 text-green-600" /> : <Save className="w-4 h-4" />}
          {isDraftSaved ? 'Saved!' : 'Save Draft'}
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleFinalizePlan}
          className="px-6 py-2 bg-gradient-to-r from-[#0E7F76] to-[#A3C6AD] text-white font-medium rounded-xl hover:opacity-90 transition-opacity duration-200"
        >
          Generate Complete Itinerary
        </motion.button>
      </div>
    </div>
  )
}