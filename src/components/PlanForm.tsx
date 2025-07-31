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
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! I\'m your AI Travel & Health Planner. I\'ll help you create the perfect trip tailored to your preferences and health needs. Let\'s start planning your adventure! 🌍✈️',
      isUser: false,
      timestamp: new Date()
    }
  ])
  
  const [currentMessage, setCurrentMessage] = useState('')
  const [itinerary, setItinerary] = useState<ItineraryDay[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isDraftSaved, setIsDraftSaved] = useState(false)
  const [preferencesStarted, setPreferencesStarted] = useState(false)
  
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
    "I want to visit Italy for 7 days with a £2000 budget",
    "Plan a relaxing beach vacation for 2 people",
    "I need a healthy wellness retreat for 5 days",
    "Adventure trip to Japan for 10 days"
  ]

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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

    try {
      // Process the message and extract information
      const response = await processUserMessage(userMessage)
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        isUser: false,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, botMessage])
    } catch (error) {
      console.error('Error processing message:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'I apologize, but I encountered an error. Please try again.',
        isUser: false,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const processUserMessage = async (userMessage: string): Promise<string> => {
    const lowerMessage = userMessage.toLowerCase()
    const updates: Partial<TripDetails> = {}
    const questionsUpdate: Partial<PlanningQuestions> = {}

    // Extract destination
    const destinations = ['italy', 'france', 'spain', 'greece', 'japan', 'thailand', 'turkey', 'portugal', 'morocco', 'egypt']
    for (const dest of destinations) {
      if (lowerMessage.includes(dest)) {
        if (dest === 'italy') {
          updates.destination = 'Italy'
        } else if (dest === 'france') {
          updates.destination = 'France'
        } else if (dest === 'japan') {
          updates.destination = 'Japan'
        } else {
          updates.destination = dest.charAt(0).toUpperCase() + dest.slice(1)
        }
        questionsUpdate.destination = true
        break
      }
    }

    // Extract trip duration with enhanced parsing
    const durationPatterns = [
      /(\d+)\s*day\s*(?:round\s+)?(?:holiday|vacation|trip)/gi,
      /(\d+)\s*days?\s*(?:round\s+)?(?:trip|holiday|vacation)/gi,
      /(\d+)\s*days?(?:\s+(?:holiday|vacation|trip))?/gi,
      /(\d+)\s*weeks?(?:\s+(?:holiday|vacation|trip))?/gi,
      /(\d+)\s*nights?(?:\s+(?:holiday|vacation|trip))?/gi
    ]
    
    for (const pattern of durationPatterns) {
      const match = pattern.exec(lowerMessage)
      if (match) {
        const num = parseInt(match[1])
        let days = num
        
        if (pattern.source.includes('week')) {
          days = num * 7
        } else if (pattern.source.includes('night')) {
          days = num
        }
        
        const startDate = new Date()
        startDate.setDate(startDate.getDate() + 7)
        const endDate = new Date(startDate)
        endDate.setDate(endDate.getDate() + days)
        
        updates.startDate = startDate.toISOString().split('T')[0]
        updates.endDate = endDate.toISOString().split('T')[0]
        updates.duration = days
        questionsUpdate.duration = true
        break
      }
    }

    // Extract budget
    const budgetMatch = lowerMessage.match(/£(\d+(?:,\d{3})*(?:\.\d{2})?)/g)
    if (budgetMatch) {
      const budgetStr = budgetMatch[0].replace('£', '').replace(/,/g, '')
      const budget = parseFloat(budgetStr)
      if (budget > 0 && budget <= 50000) {
        updates.budget = budget
        questionsUpdate.budget = true
      }
    }

    // Extract number of travelers
    const travelersMatch = lowerMessage.match(/(\d+)\s*(?:people|person|travelers?)/gi)
    if (travelersMatch) {
      const num = parseInt(travelersMatch[0].match(/\d+/)?.[0] || '1')
      if (num > 0 && num <= 20) {
        updates.travelers = num
        questionsUpdate.travelers = true
      }
    }

    // Update state
    if (Object.keys(updates).length > 0) {
      setTripDetails(prev => ({ ...prev, ...updates }))
    }
    if (Object.keys(questionsUpdate).length > 0) {
      setQuestionsAnswered(prev => ({ ...prev, ...questionsUpdate }))
    }

    // Generate appropriate response
    return generateResponse(updates, questionsUpdate, lowerMessage)
  }

  const generateResponse = (updates: Partial<TripDetails>, questionsUpdate: Partial<PlanningQuestions>, message: string): string => {
    // Check if we have enough information to generate an itinerary
    const hasEssentials = tripDetails.destination && tripDetails.duration && tripDetails.budget && tripDetails.travelers

    if (updates.destination && !preferencesStarted && !preferencesGathered && currentPreferenceQuestions.length === 0) {
      setPreferencesStarted(true)
      const detailedQuestions = [
        `What kind of activities interest you most in ${updates.destination}?`,
        "What's your preferred travel pace?",
        "Any dietary preferences or restrictions?"
      ]
      setCurrentPreferenceQuestions(detailedQuestions)
      
      return `${updates.destination} is a fantastic choice! 🎉 To create the perfect itinerary for you, I'd love to learn more about your preferences.

${detailedQuestions[0]}

Please tell me what interests you most, and I'll ask a few more questions to personalize your trip perfectly!`
    }

    if (currentPreferenceQuestions.length > 0 && !preferencesGathered) {
      // Process preferences
      const preferences = extractPreferences(message)
      if (preferences.length > 0) {
        setTripDetails(prev => ({
          ...prev,
          preferences: [...prev.preferences, ...preferences],
          activities: [...prev.activities, ...preferences]
        }))
        
        if (currentPreferenceQuestions.length > 1) {
          const nextQuestion = currentPreferenceQuestions[1]
          setCurrentPreferenceQuestions(prev => prev.slice(1))
          return `Great insights! I see you're interested in ${preferences.join(', ')}. That helps me understand what you're looking for.

${nextQuestion}`
        } else {
          // Done with preferences
          setPreferencesGathered(true)
          setCurrentPreferenceQuestions([])
          setQuestionsAnswered(prev => ({ ...prev, activities: true }))
          return `Perfect! I have a good understanding of your interests. You're interested in ${preferences.join(', ')} - excellent choices!

Now let me get the essential planning details:

How many people will be traveling?`
        }
      }
    }

    // Ask for missing information
    if (!tripDetails.destination) {
      return "I'd love to help you plan your trip! Where would you like to go? 🌍"
    }
    
    if (!tripDetails.duration) {
      return `${tripDetails.destination} sounds amazing! How many days are you planning to stay?`
    }
    
    if (!tripDetails.budget) {
      return `Great choice for a ${tripDetails.duration}-day trip! What's your total budget for this adventure?`
    }
    
    if (!tripDetails.travelers) {
      return "Perfect! How many people will be traveling?"
    }

    // If we have all essential info, offer to generate itinerary
    if (hasEssentials && Object.keys(updates).length > 0) {
      return `Excellent! I have all the information I need:

🌍 **Destination:** ${tripDetails.destination}
📅 **Duration:** ${tripDetails.duration} days  
💰 **Budget:** £${tripDetails.budget.toLocaleString()}
👥 **Travelers:** ${tripDetails.travelers}

I'm ready to create your personalized itinerary! Should I start generating your trip plan?`
    }

    return "Thank you for that information! Is there anything else you'd like to tell me about your travel preferences?"
  }

  const extractPreferences = (message: string): string[] => {
    const lowerMessage = message.toLowerCase()
    const preferences: string[] = []
    
    const activityKeywords = {
      'sightseeing': ['sightseeing', 'sight seeing', 'tourist', 'attractions', 'landmarks', 'monuments', 'visiting'],
      'culture': ['culture', 'cultural', 'museums', 'history', 'historical', 'art', 'heritage'],
      'food': ['food', 'cuisine', 'dining', 'restaurants', 'culinary', 'eating', 'cooking'],
      'adventure': ['adventure', 'hiking', 'climbing', 'extreme', 'adrenaline', 'sports'],
      'relaxation': ['relaxation', 'spa', 'wellness', 'peaceful', 'calm', 'rest', 'beach'],
      'nightlife': ['nightlife', 'bars', 'clubs', 'party', 'evening', 'drinks'],
      'shopping': ['shopping', 'markets', 'boutiques', 'souvenirs', 'stores']
    }
    
    for (const [category, keywords] of Object.entries(activityKeywords)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        preferences.push(category)
      }
    }
    
    return preferences
  }

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
      {/* Trip Context Bar */}
      {(tripDetails.destination || tripDetails.budget > 0 || tripDetails.startDate) && (
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
          </div>
        </div>
      )}

      {/* Main Planning Interface */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Chat Interface - 60% width */}
        <div className="lg:col-span-3">
          <ChatInterface
            messages={messages}
            currentMessage={currentMessage}
            isLoading={isLoading}
            availablePrompts={availablePrompts}
            messagesEndRef={messagesEndRef}
            inputRef={inputRef}
            onMessageChange={setCurrentMessage}
            onSendMessage={handleSendMessage}
            onPromptClick={handlePromptClick}
          />
        </div>

        {/* Itinerary Preview - 40% width */}
        <div className="lg:col-span-2">
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