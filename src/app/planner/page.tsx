'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Save, Check, MapPin, Calendar, DollarSign, Users, Plane, Hotel, Camera, Coffee } from 'lucide-react'
import ChatInterface from '@/components/planner/ChatInterface'
import ItineraryPreview from '@/components/planner/ItineraryPreview'
import ComprehensiveTripPreview from '@/components/planner/ComprehensiveTripPreview'

interface Message {
  id: string
  text: string
  sender: 'user' | 'ai'
  timestamp: Date
  isTyping?: boolean
}

interface TripDetails {
  destination: string
  startDate: string
  endDate: string
  budget: number
  travelers: number
  departureLocation: string
  accommodationType: string
  foodPreferences: string[]
  activities: string[]
  accessibility: string[]
}

interface ItineraryDay {
  id: string
  date: string
  flight?: {
    airline: string
    flightNumber: string
    departure: string
    arrival: string
    duration: string
    price: number
  }
  hotel?: {
    name: string
    rating: number
    location: string
    amenities: string[]
    pricePerNight: number
  }
  activities: Array<{
    id: string
    name: string
    type: string
    description: string
    duration: string
    price: number
    location: string
    rating: number
    timeSlot: 'morning' | 'afternoon' | 'evening'
  }>
}

const suggestedPrompts = [
  "I want to go to Italy for a week",
  "Plan a trip to Japan with £3000 budget",
  "Show me European destinations under £2000",
  "I need a relaxing beach vacation",
  "Adventure trip for 2 people to Thailand"
]

// Required trip information that needs to be collected
interface RequiredTripData {
  destination: string
  duration: number // in days
  budget: number
  travelers: number
  departureLocation: string
  dates: {
    month: string
    startDate?: string
    endDate?: string
  }
  accommodationType: string
  foodPreferences: string[]
  activities: string[]
  pace: string // fast-paced, relaxed, balanced
}

// Enhanced trip planning data structure
interface TripPlan {
  summary: {
    destination: string
    cities: string[]
    duration: number
    travelers: number
    totalBudget: number
    budgetBreakdown: {
      flights: number
      accommodation: number
      food: number
      activities: number
      transport: number
      emergency: number
    }
    departureLocation: string
    dates: {
      startDate: string
      endDate: string
      month: string
    }
  }
  flights: {
    outbound: FlightInfo
    return: FlightInfo
    totalCost: number
  }
  itinerary: DailyItinerary[]
  totalCost: number
  budgetRemaining: number
}

interface FlightInfo {
  airline: string
  flightNumber: string
  departure: {
    airport: string
    city: string
    time: string
    date: string
  }
  arrival: {
    airport: string
    city: string
    time: string
    date: string
  }
  duration: string
  price: number
  perPerson: number
}

interface DailyItinerary {
  day: number
  date: string
  city: string
  accommodation: {
    name: string
    type: string
    location: string
    rating: number
    pricePerNight: number
    amenities: string[]
    checkIn?: string
    checkOut?: string
  }
  activities: {
    time: string
    activity: string
    description: string
    location: string
    duration: string
    cost: number
    type: 'attraction' | 'restaurant' | 'transport' | 'free'
  }[]
  meals: {
    breakfast?: { restaurant: string, cost: number, location: string }
    lunch?: { restaurant: string, cost: number, location: string }
    dinner?: { restaurant: string, cost: number, location: string }
  }
  transport: {
    type: string
    cost: number
    details: string
  }[]
  dailyTotal: number
  runningTotal: number
}

// Questions tracking - what has been answered
interface QuestionsAnswered {
  destination: boolean
  duration: boolean
  budget: boolean
  travelers: boolean
  departureLocation: boolean
  dates: boolean
  accommodationType: boolean
  foodPreferences: boolean
  activities: boolean
  pace: boolean
}

// Question definitions with smart asking logic
const QUESTIONS = [
  {
    key: 'destination',
    question: "Where would you like to go? I can help you plan trips to amazing places like Italy, Japan, France, Spain, Thailand, and many more!",
    followUp: (destination: string) => `${destination} is a fantastic choice! I'll help you create an amazing itinerary there.`
  },
  {
    key: 'duration',
    question: "How many days are you planning to travel? This helps me create the perfect pace for your trip.",
    followUp: (duration: number) => `Perfect! ${duration} days will give us great flexibility to create an amazing itinerary.`
  },
  {
    key: 'budget',
    question: "What's your total budget for this trip? This helps me recommend the best hotels, activities, and dining options for you.",
    followUp: (budget: number) => `Great! With £${budget.toLocaleString()}, I can create a wonderful experience that fits your budget.`
  },
  {
    key: 'travelers',
    question: "How many people will be traveling? Just yourself, or will others be joining you?",
    followUp: (travelers: number) => `Got it! Planning for ${travelers} ${travelers === 1 ? 'traveler' : 'travelers'}.`
  },
  {
    key: 'departureLocation',
    question: "Where will you be departing from? Just tell me your city or airport (e.g., London, New York, Manchester).",
    followUp: (location: string) => `Perfect! I'll plan your journey starting from ${location}.`
  },
  {
    key: 'dates',
    question: "When are you planning to travel? Even just the month would be helpful for planning seasonal activities and pricing.",
    followUp: (month: string) => `Excellent! ${month} is a great time to travel. I'll factor in the seasonal highlights.`
  },
  {
    key: 'accommodationType',
    question: "What type of accommodation do you prefer? Hotels, boutique stays, luxury resorts, or budget-friendly options?",
    followUp: (type: string) => `${type} accommodations - great choice! I'll find the perfect places for you to stay.`
  },
  {
    key: 'foodPreferences',
    question: "Do you have any food preferences or dietary requirements? Are you excited to try local cuisine, or do you prefer familiar foods?",
    followUp: (prefs: string) => `Noted! I'll make sure your dining experiences align with your preferences.`
  },
  {
    key: 'activities',
    question: "What type of activities interest you most? Cultural sites, outdoor adventures, relaxation, nightlife, shopping, or a mix of everything?",
    followUp: (activities: string) => `${activities} - that sounds amazing! I'll include the best experiences along those lines.`
  },
  {
    key: 'pace',
    question: "What pace do you prefer for your trip? Fast-paced with lots of activities, relaxed with plenty of downtime, or a balanced mix?",
    followUp: (pace: string) => `A ${pace} pace it is! I'll structure your itinerary accordingly.`
  }
]

export default function PlannerPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm your AI travel assistant. I'll help you create the perfect trip by asking you a few questions.\n\nLet's start: Where would you like to go? I can help you plan trips to amazing places like Italy, Japan, France, Spain, Thailand, and many more!",
      sender: 'ai',
      timestamp: new Date()
    }
  ])

  const [currentMessage, setCurrentMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [tripDetails, setTripDetails] = useState<TripDetails>({
    destination: '',
    startDate: '',
    endDate: '',
    budget: 0,
    travelers: 1,
    departureLocation: '',
    accommodationType: '',
    foodPreferences: [],
    activities: [],
    accessibility: []
  })

  const [itinerary, setItinerary] = useState<ItineraryDay[]>([])
  const [isDraftSaved, setIsDraftSaved] = useState(false)
  const [availablePrompts, setAvailablePrompts] = useState<string[]>(suggestedPrompts.slice(0, 3))

  // Question tracking state
  const [questionsAnswered, setQuestionsAnswered] = useState<QuestionsAnswered>({
    destination: false,
    duration: false,
    budget: false,
    travelers: false,
    departureLocation: false,
    dates: false,
    accommodationType: false,
    foodPreferences: false,
    activities: false,
    pace: false
  })

  // Track if we've asked for plan confirmation
  const [hasAskedForConfirmation, setHasAskedForConfirmation] = useState(false)
  const [waitingForConfirmation, setWaitingForConfirmation] = useState(false)
  
  // Store destination information from web search
  const [destinationInfo, setDestinationInfo] = useState<{
    name: string
    country?: string
    region?: string
    description?: string
    attractions?: string[]
    bestTime?: string
    currency?: string
  } | null>(null)

  // Track conversation context
  const [conversationContext, setConversationContext] = useState<{
    lastQuestionAsked?: string
    lastQuestionKey?: string
    expectedAnswerType?: string
    conversationHistory: Array<{
      question: string
      answer?: string
      questionKey: string
      timestamp: Date
    }>
  }>({
    conversationHistory: []
  })

  const [requiredTripData, setRequiredTripData] = useState<Partial<RequiredTripData>>({
    destination: '',
    duration: 0,
    budget: 0,
    travelers: 1,
    departureLocation: '',
    dates: { month: '' },
    accommodationType: '',
    foodPreferences: [],
    activities: [],
    pace: ''
  })

  // Trip plan state
  const [tripPlan, setTripPlan] = useState<TripPlan | null>(null)
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Function to search for destination information  
  const searchDestinationInfo = async (destination: string) => {
    try {
      console.log('🔍 Searching for destination info:', destination)
      return null // Will be implemented with actual web search in generateAIResponse
    } catch (error) {
      console.error('❌ Error searching destination info:', error)
      return null
    }
  }

  // Function to analyze conversation context and understand what the user is answering
  const analyzeConversationContext = (userMessage: string, messages: Message[]) => {
    const lowerMessage = userMessage.toLowerCase().trim()
    
    // Get the last few AI messages to understand what was asked
    const recentAIMessages = messages
      .filter(m => m.sender === 'ai')
      .slice(-3) // Look at last 3 AI messages
      .reverse() // Most recent first
    
    console.log('🔍 Analyzing context with recent AI messages:', recentAIMessages.map(m => m.text.substring(0, 100)))
    
    // Check if the user is responding to a specific question
    const lastAIMessage = recentAIMessages[0]?.text || ''
    const contextualInfo: any = {}
    
    // Departure location context
    if (lastAIMessage.includes('Where will you be departing from') || 
        lastAIMessage.includes('departing from') ||
        conversationContext.lastQuestionKey === 'departureLocation') {
      console.log('🛫 User answering departure location question')
      
      // Enhanced departure location extraction with context
      if (lowerMessage.length < 30 && !lowerMessage.includes('want') && !lowerMessage.includes('like')) {
        // Short answer likely to be a city name
        const cityName = userMessage.trim()
        if (cityName.length > 1) {
          contextualInfo.departureLocation = cityName.split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ')
          contextualInfo.departureLocationConfidence = 'high'
        }
      }
    }
    
    // Duration context
    if (lastAIMessage.includes('How many days') || 
        lastAIMessage.includes('planning to travel') ||
        conversationContext.lastQuestionKey === 'duration') {
      console.log('📅 User answering duration question')
      
      // Look for duration patterns in context
      const durationPatterns = [
        /(\d+)\s*days?/i,
        /(\d+)\s*weeks?/i,
        /a\s+week/i,
        /two\s+weeks?/i,
        /three\s+weeks?/i
      ]
      
      for (const pattern of durationPatterns) {
        const match = lowerMessage.match(pattern)
        if (match) {
          let days = parseInt(match[1]) || 0
          if (match[0].includes('week')) {
            days = days || 1
            days *= 7
          }
          if (match[0].includes('a week')) days = 7
          if (match[0].includes('two weeks')) days = 14
          if (match[0].includes('three weeks')) days = 21
          
          if (days > 0) {
            contextualInfo.duration = days
            contextualInfo.durationConfidence = 'high'
          }
          break
        }
      }
    }
    
    // Budget context
    if (lastAIMessage.includes('budget') || 
        lastAIMessage.includes('What\'s your total budget') ||
        conversationContext.lastQuestionKey === 'budget') {
      console.log('💰 User answering budget question')
      
      // Enhanced budget extraction
      const budgetPatterns = [
        /[£$€]?(\d+(?:,\d{3})*(?:\.\d{2})?)/,
        /(\d+)\s*thousand/i,
        /(\d+)k\b/i
      ]
      
      for (const pattern of budgetPatterns) {
        const match = lowerMessage.match(pattern)
        if (match) {
          let budget = parseInt(match[1].replace(/,/g, ''))
          if (match[0].includes('thousand') || match[0].includes('k')) {
            budget *= 1000
          }
          if (budget > 100) {
            contextualInfo.budget = budget
            contextualInfo.budgetConfidence = 'high'
          }
          break
        }
      }
    }
    
    // Travelers context
    if (lastAIMessage.includes('How many people') || 
        lastAIMessage.includes('will be traveling') ||
        conversationContext.lastQuestionKey === 'travelers') {
      console.log('👥 User answering travelers question')
      
      if (lowerMessage.includes('just me') || lowerMessage.includes('myself') || lowerMessage.includes('solo')) {
        contextualInfo.travelers = 1
        contextualInfo.travelersConfidence = 'high'
      } else {
        const numberMatch = lowerMessage.match(/(\d+)/)
        if (numberMatch) {
          contextualInfo.travelers = parseInt(numberMatch[1])
          contextualInfo.travelersConfidence = 'high'
        }
      }
    }
    
    // Accommodation context
    if (lastAIMessage.includes('accommodation') || 
        lastAIMessage.includes('type of accommodation') ||
        conversationContext.lastQuestionKey === 'accommodationType') {
      console.log('🏨 User answering accommodation question')
      
      const accomTypes = ['hotel', 'resort', 'boutique', 'luxury', 'budget', 'hostel', 'apartment', 'villa', 'airbnb']
      for (const type of accomTypes) {
        if (lowerMessage.includes(type)) {
          contextualInfo.accommodationType = type
          contextualInfo.accommodationConfidence = 'high'
          break
        }
      }
    }
    
    // Travel dates context
    if (lastAIMessage.includes('When are you planning') || 
        lastAIMessage.includes('travel date') ||
        conversationContext.lastQuestionKey === 'dates') {
      console.log('📅 User answering travel dates question')
      
      const months = ['january', 'february', 'march', 'april', 'may', 'june', 
                     'july', 'august', 'september', 'october', 'november', 'december']
      for (const month of months) {
        if (lowerMessage.includes(month)) {
          contextualInfo.dates = { month: month.charAt(0).toUpperCase() + month.slice(1) }
          contextualInfo.datesConfidence = 'high'
          break
        }
      }
    }
    
    // Food preferences context - ENHANCED
    if (lastAIMessage.includes('food preferences') || 
        lastAIMessage.includes('dietary requirements') ||
        lastAIMessage.includes('excited to try local cuisine') ||
        lastAIMessage.includes('prefer familiar foods') ||
        conversationContext.lastQuestionKey === 'foodPreferences') {
      console.log('🍽️ User answering food preferences question')
      
      // Enhanced food preference extraction
      const foodIndicators = [
        // Positive responses to local cuisine
        /local|traditional|authentic|everything|anything|excited|love.*food|try.*new|adventurous|open.*mind/i,
        // Dietary restrictions
        /vegetarian|vegan|gluten.*free|dairy.*free|nut.*allerg|kosher|halal|pescatarian/i,
        // Cuisine types
        /italian|chinese|indian|mexican|japanese|thai|french|mediterranean|asian|european/i,
        // General preferences
        /familiar|picky|not.*adventurous|simple|basic|western|comfort.*food/i,
        // Explicit answers
        /no.*preference|anything.*fine|not.*picky|flexible|whatever|sure|yes|okay/i
      ]
      
      let foundFoodPref = false
      const foodPrefs = []
      
      for (const pattern of foodIndicators) {
        if (pattern.test(lowerMessage)) {
          foundFoodPref = true
          
          // Categorize the response
          if (/local|traditional|authentic|excited|adventurous|try.*new|open.*mind/.test(lowerMessage)) {
            foodPrefs.push('local cuisine')
          }
          if (/vegetarian/.test(lowerMessage)) {
            foodPrefs.push('vegetarian')
          }
          if (/vegan/.test(lowerMessage)) {
            foodPrefs.push('vegan')
          }
          if (/gluten.*free/.test(lowerMessage)) {
            foodPrefs.push('gluten-free')
          }
          if (/familiar|western|comfort/.test(lowerMessage)) {
            foodPrefs.push('familiar foods')
          }
          if (/no.*preference|anything.*fine|flexible|whatever/.test(lowerMessage)) {
            foodPrefs.push('no restrictions')
          }
          
          break
        }
      }
      
      // If any food-related response detected or it's a general positive response
      if (foundFoodPref || 
          /^(yes|yeah|sure|okay|ok|fine|good|sounds good|that works|no problem)$/i.test(lowerMessage.trim()) ||
          lowerMessage.length < 20) { // Short responses likely answering the question
        
        contextualInfo.foodPreferences = foodPrefs.length > 0 ? foodPrefs : ['open to trying local cuisine']
        contextualInfo.foodPreferencesConfidence = 'high'
        console.log('✅ Food preferences extracted:', contextualInfo.foodPreferences)
      }
    }
    
    // Activities context - ENHANCED  
    if (lastAIMessage.includes('type of activities') || 
        lastAIMessage.includes('Cultural sites, outdoor adventures') ||
        lastAIMessage.includes('interest you most') ||
        conversationContext.lastQuestionKey === 'activities') {
      console.log('🎯 User answering activities question')
      
      const activityTypes = [
        'cultural', 'culture', 'museums', 'history', 'historical', 'art', 'galleries',
        'outdoor', 'adventure', 'hiking', 'nature', 'beach', 'water sports', 'diving',
        'relaxation', 'spa', 'wellness', 'peaceful', 'quiet', 'chill',
        'nightlife', 'bars', 'clubs', 'party', 'dancing', 'entertainment',
        'shopping', 'markets', 'boutiques', 'souvenirs',
        'food', 'restaurants', 'dining', 'cuisine', 'cooking',
        'everything', 'mix', 'variety', 'all', 'bit of everything'
      ]
      
      const foundActivities = []
      for (const activity of activityTypes) {
        if (lowerMessage.includes(activity)) {
          if (!foundActivities.includes(activity)) {
            foundActivities.push(activity)
          }
        }
      }
      
      // Also accept short positive responses
      if (foundActivities.length > 0 || 
          /^(yes|everything|all|mix|variety|whatever|anything|sure|sounds good)$/i.test(lowerMessage.trim())) {
        contextualInfo.activities = foundActivities.length > 0 ? foundActivities : ['variety of activities']
        contextualInfo.activitiesConfidence = 'high'
        console.log('✅ Activities extracted:', contextualInfo.activities)
      }
    }
    
    // Pace context - ENHANCED
    if (lastAIMessage.includes('What pace do you prefer') || 
        lastAIMessage.includes('Fast-paced with lots of activities') ||
        lastAIMessage.includes('relaxed with plenty of downtime') ||
        conversationContext.lastQuestionKey === 'pace') {
      console.log('⚡ User answering pace question')
      
      if (/fast|busy|packed|lots.*activit|action|energetic|full.*schedule/i.test(lowerMessage)) {
        contextualInfo.pace = 'fast-paced'
        contextualInfo.paceConfidence = 'high'
      } else if (/relax|slow|leisure|peaceful|calm|easy|downtime|rest/i.test(lowerMessage)) {
        contextualInfo.pace = 'relaxed'
        contextualInfo.paceConfidence = 'high'
      } else if (/balanc|mix|medium|moderate|bit.*both|some.*each/i.test(lowerMessage)) {
        contextualInfo.pace = 'balanced'
        contextualInfo.paceConfidence = 'high'
      } else if (/^(whatever|anything|sure|okay|fine|good)$/i.test(lowerMessage.trim())) {
        contextualInfo.pace = 'balanced'
        contextualInfo.paceConfidence = 'high'
      }
    }
    
    return contextualInfo
  }

  // Function to extract information from user message
  const extractTripInformation = (message: string, contextualInfo?: any) => {
    const lowerMessage = message.toLowerCase()
    const updates: Partial<RequiredTripData> = {}
    const questionsUpdate: Partial<QuestionsAnswered> = {}

    // First, use contextual information if available (high confidence)
    if (contextualInfo) {
      console.log('🎯 Using contextual information:', contextualInfo)
      
      if (contextualInfo.departureLocation && contextualInfo.departureLocationConfidence === 'high') {
        updates.departureLocation = contextualInfo.departureLocation
        questionsUpdate.departureLocation = true
        console.log('✅ Departure location from context:', contextualInfo.departureLocation)
      }
      
      if (contextualInfo.duration && contextualInfo.durationConfidence === 'high') {
        updates.duration = contextualInfo.duration
        questionsUpdate.duration = true
        console.log('✅ Duration from context:', contextualInfo.duration)
      }
      
      if (contextualInfo.budget && contextualInfo.budgetConfidence === 'high') {
        updates.budget = contextualInfo.budget
        questionsUpdate.budget = true
        console.log('✅ Budget from context:', contextualInfo.budget)
      }
      
      if (contextualInfo.travelers && contextualInfo.travelersConfidence === 'high') {
        updates.travelers = contextualInfo.travelers
        questionsUpdate.travelers = true
        console.log('✅ Travelers from context:', contextualInfo.travelers)
      }
      
      if (contextualInfo.accommodationType && contextualInfo.accommodationConfidence === 'high') {
        updates.accommodationType = contextualInfo.accommodationType
        questionsUpdate.accommodationType = true
        console.log('✅ Accommodation from context:', contextualInfo.accommodationType)
      }
      
      if (contextualInfo.dates && contextualInfo.datesConfidence === 'high') {
        updates.dates = contextualInfo.dates
        questionsUpdate.dates = true
        console.log('✅ Dates from context:', contextualInfo.dates)
      }
      
      if (contextualInfo.foodPreferences && contextualInfo.foodPreferencesConfidence === 'high') {
        updates.foodPreferences = contextualInfo.foodPreferences
        questionsUpdate.foodPreferences = true
        console.log('✅ Food preferences from context:', contextualInfo.foodPreferences)
      }
      
      if (contextualInfo.activities && contextualInfo.activitiesConfidence === 'high') {
        updates.activities = contextualInfo.activities
        questionsUpdate.activities = true
        console.log('✅ Activities from context:', contextualInfo.activities)
      }
      
      if (contextualInfo.pace && contextualInfo.paceConfidence === 'high') {
        updates.pace = contextualInfo.pace
        questionsUpdate.pace = true
        console.log('✅ Pace from context:', contextualInfo.pace)
      }
    }

    // Extract destination - enhanced to capture more specific places
    const destinations = ['italy', 'japan', 'france', 'spain', 'thailand', 'greece', 'germany', 'uk', 'usa', 'canada', 'australia', 'rome', 'tokyo', 'paris', 'london', 'new york', 'bangkok', 'punta cana', 'cancun', 'bali', 'santorini', 'mykonos', 'ibiza', 'maldives', 'seychelles', 'fiji', 'hawaii', 'miami', 'las vegas', 'dubai', 'singapore', 'hong kong', 'barcelona', 'amsterdam', 'berlin', 'vienna', 'prague', 'budapest', 'stockholm', 'copenhagen', 'oslo', 'lisbon', 'madrid', 'florence', 'venice', 'milan', 'naples', 'sicily', 'sardinia', 'corsica', 'crete', 'rhodes', 'cyprus', 'malta', 'iceland', 'ireland', 'scotland', 'wales', 'morocco', 'egypt', 'turkey', 'croatia', 'montenegro', 'albania', 'bosnia', 'serbia', 'romania', 'bulgaria', 'poland', 'lithuania', 'latvia', 'estonia']
    
    let foundDestination = null
    for (const dest of destinations) {
      if (lowerMessage.includes(dest)) {
        foundDestination = dest.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
        updates.destination = foundDestination
        questionsUpdate.destination = true
        break
      }
    }
    
    // If no predefined destination found, try to extract potential place names
    if (!foundDestination) {
      const placePatterns = [
        /(?:want to go to|visiting|traveling to|trip to|going to)\\s+([a-z\\s,]+?)(?:\\s+(?:for|in|on|with|\\.|,)|$)/i,
        /(?:^|\\s)((?:[A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*))(?:\\s+(?:sounds|looks|seems|is)|$)/,
        /(?:heard about|been to|love)\\s+([a-z\\s,]+?)(?:\\s+(?:is|was|looks)|$)/i
      ]
      
      for (const pattern of placePatterns) {
        const match = lowerMessage.match(pattern)
        if (match && match[1] && match[1].trim().length > 2) {
          const potentialPlace = match[1].trim()
          // Filter out common words that aren't places
          if (!['want', 'like', 'need', 'days', 'week', 'people', 'budget', 'money', 'time', 'really', 'very', 'quite', 'somewhere', 'anywhere'].includes(potentialPlace.toLowerCase())) {
            foundDestination = potentialPlace.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
            updates.destination = foundDestination
            questionsUpdate.destination = true
            break
          }
        }
      }
    }

    // Extract duration
    const durationMatch = lowerMessage.match(/(\d+)\s*(day|days|week|weeks)/i)
    if (durationMatch) {
      let days = parseInt(durationMatch[1])
      if (durationMatch[2].toLowerCase().includes('week')) {
        days *= 7
      }
      updates.duration = days
      questionsUpdate.duration = true
    }

    // Extract budget
    const budgetMatch = lowerMessage.match(/[£$€]?(\d+(?:,\d{3})*(?:\.\d{2})?)/i)
    if (budgetMatch) {
      const budget = parseInt(budgetMatch[1].replace(/,/g, ''))
      if (budget > 100) { // Assume amounts over 100 are budgets
        updates.budget = budget
        questionsUpdate.budget = true
      }
    }

    // Extract number of travelers
    const travelersMatch = lowerMessage.match(/(\d+)\s*(people|person|traveler|travelers|passenger|passengers)/i)
    if (travelersMatch) {
      updates.travelers = parseInt(travelersMatch[1])
      questionsUpdate.travelers = true
    } else if (lowerMessage.includes('just me') || lowerMessage.includes('myself') || lowerMessage.includes('solo')) {
      updates.travelers = 1
      questionsUpdate.travelers = true
    }

    // Extract departure location - multiple strategies
    let foundDeparture = false
    
    // Strategy 1: Common departure patterns
    const departurePatterns = [
      /(?:from|departing from|leaving from|starting from)\s+([a-z\s,]+?)(?:\s+(?:to|for|in|on)|$)/i,
      /(?:^|\s)([a-z\s,]+?)(?:\s+to\s+)/i, // "London to Paris" pattern
      /(?:i'm in|i live in|based in|located in)\s+([a-z\s,]+)/i
    ]
    
    for (const pattern of departurePatterns) {
      const match = lowerMessage.match(pattern)
      if (match && match[1]) {
        const location = match[1].trim()
        // Filter out destination words
        if (!['italy', 'japan', 'france', 'spain', 'thailand', 'want', 'like', 'need', 'days', 'week', 'people', 'budget'].includes(location.toLowerCase())) {
          updates.departureLocation = location
          questionsUpdate.departureLocation = true
          foundDeparture = true
          break
        }
      }
    }
    
    // Strategy 2: If no departure found yet, check for common city names (when user gives simple answer)
    if (!foundDeparture) {
      const commonCities = ['london', 'manchester', 'birmingham', 'liverpool', 'leeds', 'bristol', 'cardiff', 'edinburgh', 'glasgow', 'belfast', 'dublin', 'new york', 'los angeles', 'chicago', 'boston', 'miami', 'toronto', 'vancouver', 'sydney', 'melbourne', 'paris', 'madrid', 'berlin', 'amsterdam', 'brussels']
      const trimmedMessage = lowerMessage.trim()
      
      for (const city of commonCities) {
        if (trimmedMessage === city || trimmedMessage === city + ' airport') {
          updates.departureLocation = city.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
          questionsUpdate.departureLocation = true
          foundDeparture = true
          break
        }
      }
    }
    
    // Strategy 3: If still no departure and message is short and looks like a city name
    if (!foundDeparture && lowerMessage.trim().length > 2 && lowerMessage.trim().length < 20 && !lowerMessage.includes(' ')) {
      // Simple word that could be a city name
      const potentialCity = lowerMessage.trim()
      if (!['italy', 'japan', 'france', 'spain', 'thailand', 'want', 'like', 'need', 'days', 'week', 'people', 'budget', 'yes', 'no', 'maybe'].includes(potentialCity)) {
        updates.departureLocation = potentialCity.charAt(0).toUpperCase() + potentialCity.slice(1)
        questionsUpdate.departureLocation = true
      }
    }

    // Extract dates/months
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
    for (const month of months) {
      if (lowerMessage.includes(month)) {
        updates.dates = { month: month.charAt(0).toUpperCase() + month.slice(1) }
        questionsUpdate.dates = true
        break
      }
    }

    // Extract accommodation preferences
    const accomTypes = ['hotel', 'resort', 'boutique', 'luxury', 'budget', 'hostel', 'apartment', 'villa']
    for (const type of accomTypes) {
      if (lowerMessage.includes(type)) {
        updates.accommodationType = type
        questionsUpdate.accommodationType = true
        break
      }
    }

    // Extract activity preferences
    const activities = ['culture', 'adventure', 'relaxation', 'nightlife', 'shopping', 'food', 'nature', 'history', 'art', 'museums']
    const foundActivities = activities.filter(activity => lowerMessage.includes(activity))
    if (foundActivities.length > 0) {
      updates.activities = foundActivities
      questionsUpdate.activities = true
    }

    // Extract pace preferences
    if (lowerMessage.includes('fast-paced') || lowerMessage.includes('busy') || lowerMessage.includes('packed')) {
      updates.pace = 'fast-paced'
      questionsUpdate.pace = true
    } else if (lowerMessage.includes('relaxed') || lowerMessage.includes('slow') || lowerMessage.includes('leisurely')) {
      updates.pace = 'relaxed'
      questionsUpdate.pace = true
    } else if (lowerMessage.includes('balanced') || lowerMessage.includes('mix')) {
      updates.pace = 'balanced'
      questionsUpdate.pace = true
    }

    return { updates, questionsUpdate }
  }

  // Function to get the next question to ask
  const getNextQuestion = () => {
    for (const question of QUESTIONS) {
      if (!questionsAnswered[question.key as keyof QuestionsAnswered]) {
        return question
      }
    }
    return null // All questions answered
  }

  // Function to check if all required data is collected
  const isDataComplete = () => {
    return Object.values(questionsAnswered).every(answered => answered)
  }

  // Helper function to determine expected answer type for a question
  const getExpectedAnswerType = (questionKey: string): string => {
    const answerTypes: Record<string, string> = {
      'destination': 'place_name',
      'duration': 'number_days',
      'budget': 'currency_amount',
      'travelers': 'number_people',
      'departureLocation': 'city_name',
      'dates': 'month_or_date',
      'accommodationType': 'accommodation_preference',
      'foodPreferences': 'food_type',
      'activities': 'activity_types',
      'pace': 'travel_pace'
    }
    return answerTypes[questionKey] || 'general'
  }

  // 💸 2. Intelligent Budget Splitting
  const calculateBudgetBreakdown = (totalBudget: number, travelers: number, duration: number, destination: string): TripPlan['summary']['budgetBreakdown'] => {
    console.log('💰 Calculating budget breakdown:', { totalBudget, travelers, duration, destination })
    
    const perPersonBudget = totalBudget / travelers
    
    // Budget allocation percentages based on destination and duration
    const isEuropeanDestination = ['italy', 'france', 'spain', 'greece', 'germany'].some(country => 
      destination.toLowerCase().includes(country)
    )
    
    let allocations = {
      flights: 0.20,      // 20% for flights
      accommodation: 0.40, // 40% for hotels
      food: 0.25,         // 25% for food 
      activities: 0.10,   // 10% for activities
      transport: 0.03,    // 3% for local transport
      emergency: 0.02     // 2% emergency buffer
    }
    
    // Adjust for destination - more expensive cities
    if (isEuropeanDestination) {
      allocations.accommodation = 0.45
      allocations.food = 0.20
      allocations.flights = 0.25
    }
    
    // Adjust for trip length - longer trips need more transport budget
    if (duration > 7) {
      allocations.transport = 0.05
      allocations.accommodation = 0.38
    }
    
    const breakdown = {
      flights: Math.round(totalBudget * allocations.flights),
      accommodation: Math.round(totalBudget * allocations.accommodation),
      food: Math.round(totalBudget * allocations.food),
      activities: Math.round(totalBudget * allocations.activities),
      transport: Math.round(totalBudget * allocations.transport),
      emergency: Math.round(totalBudget * allocations.emergency)
    }
    
    console.log('💰 Budget breakdown:', breakdown)
    return breakdown
  }

  // 🗺️ 3. Smart Route and City Selection
  const selectCitiesForDestination = (destination: string, duration: number, month: string): { cities: string[], reasoning: string } => {
    console.log('🗺️ Selecting cities for:', { destination, duration, month })
    
    const cityRecommendations: Record<string, any> = {
      'italy': {
        short: { cities: ['Rome'], reasoning: 'Rome offers the perfect introduction to Italy with world-class attractions within walking distance.' },
        medium: { cities: ['Rome', 'Florence'], reasoning: 'Rome and Florence provide the perfect combination of ancient history and Renaissance art, connected by high-speed rail.' },
        long: { cities: ['Rome', 'Florence', 'Venice'], reasoning: 'The classic Italian triangle - Rome for history, Florence for art, and Venice for romance.' }
      },
      'france': {
        short: { cities: ['Paris'], reasoning: 'Paris offers endless attractions and experiences perfect for a focused city break.' },
        medium: { cities: ['Paris', 'Lyon'], reasoning: 'Paris for iconic sights and Lyon for authentic French culture and cuisine.' },
        long: { cities: ['Paris', 'Lyon', 'Nice'], reasoning: 'Experience diverse French regions from capital culture to Mediterranean charm.' }
      },
      'spain': {
        short: { cities: ['Madrid'], reasoning: 'Madrid provides authentic Spanish culture with world-class museums and vibrant nightlife.' },
        medium: { cities: ['Madrid', 'Barcelona'], reasoning: 'Madrid and Barcelona showcase Spain\'s diverse character - traditional capital meets modern Catalonia.' },
        long: { cities: ['Madrid', 'Barcelona', 'Seville'], reasoning: 'Explore Spain\'s three distinct regions - royal Madrid, artistic Barcelona, and Moorish Andalusia.' }
      },
      'greece': {
        short: { cities: ['Athens'], reasoning: 'Athens offers the perfect introduction to ancient Greek civilization and modern Mediterranean life.' },
        medium: { cities: ['Athens', 'Santorini'], reasoning: 'Combine ancient Athens with the stunning sunsets and unique architecture of Santorini.' },
        long: { cities: ['Athens', 'Santorini', 'Mykonos'], reasoning: 'Experience ancient history in Athens and the best of Greek island life in the Cyclades.' }
      }
    }
    
    const destKey = destination.toLowerCase()
    const recommendation = cityRecommendations[destKey]
    
    if (recommendation) {
      if (duration <= 4) return recommendation.short
      if (duration <= 8) return recommendation.medium
      return recommendation.long
    }
    
    // Fallback for unknown destinations
    return {
      cities: [destination],
      reasoning: `We recommend focusing on ${destination} to fully experience this destination without rushing.`
    }
  }

  // 🚀 Comprehensive Trip Planning Orchestrator
  const generateComprehensiveTripPlan = async () => {
    try {
      console.log('🎯 Starting comprehensive trip planning with data:', requiredTripData)
      setIsGeneratingPlan(true)
      
      // Validate required data
      if (!requiredTripData.destination || !requiredTripData.duration || !requiredTripData.budget || !requiredTripData.travelers || !requiredTripData.departureLocation) {
        console.error('❌ Missing required trip data')
        return
      }

      // 📊 1. Understanding User Intent - Create structured plan object
      const planData: Partial<TripPlan> = {
        summary: {
          destination: requiredTripData.destination!,
          cities: [],
          duration: requiredTripData.duration!,
          travelers: requiredTripData.travelers!,
          totalBudget: requiredTripData.budget!,
          budgetBreakdown: {} as any,
          departureLocation: requiredTripData.departureLocation!,
          dates: {
            startDate: '',
            endDate: '',
            month: requiredTripData.dates?.month || ''
          }
        },
        itinerary: [],
        totalCost: 0,
        budgetRemaining: 0
      }

      // 💸 2. Budget Allocation
      console.log('💰 Step 2: Calculating budget breakdown')
      const budgetBreakdown = calculateBudgetBreakdown(
        requiredTripData.budget!,
        requiredTripData.travelers!,
        requiredTripData.duration!,
        requiredTripData.destination!
      )
      planData.summary!.budgetBreakdown = budgetBreakdown

      // 🗺️ 3. City Selection
      console.log('🌍 Step 3: Selecting cities and route')
      const { cities, reasoning } = selectCitiesForDestination(
        requiredTripData.destination!,
        requiredTripData.duration!,
        requiredTripData.dates?.month || ''
      )
      planData.summary!.cities = cities
      console.log('📍 Selected cities:', cities, 'Reasoning:', reasoning)

      // Calculate dates
      const startDate = new Date()
      startDate.setDate(startDate.getDate() + 30) // 30 days from now
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + requiredTripData.duration!)
      
      planData.summary!.dates = {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        month: requiredTripData.dates?.month || ''
      }

      // 🛫 4. Flight Search
      console.log('✈️ Step 4: Searching flights')
      const flightResponse = await fetch('/api/flights/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departure: requiredTripData.departureLocation,
          destination: requiredTripData.destination,
          departureDate: planData.summary!.dates.startDate,
          returnDate: planData.summary!.dates.endDate,
          travelers: requiredTripData.travelers,
          budget: budgetBreakdown.flights
        })
      })

      const flightData = await flightResponse.json()
      if (flightData.success) {
        planData.flights = flightData.flights
        console.log('✅ Flights found:', flightData.flights)
      }

      // 🏨 5. Hotel Search for each city
      console.log('🏨 Step 5: Searching hotels')
      const hotelPromises = cities.map(async (city, index) => {
        const cityStartDate = new Date(startDate)
        cityStartDate.setDate(cityStartDate.getDate() + (index * Math.floor(requiredTripData.duration! / cities.length)))
        
        const cityEndDate = new Date(cityStartDate)
        cityEndDate.setDate(cityEndDate.getDate() + Math.floor(requiredTripData.duration! / cities.length))

        const hotelResponse = await fetch('/api/hotels/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            city,
            checkIn: cityStartDate.toISOString().split('T')[0],
            checkOut: cityEndDate.toISOString().split('T')[0],
            travelers: requiredTripData.travelers,
            budget: budgetBreakdown.accommodation,
            accommodationType: requiredTripData.accommodationType || 'hotel'
          })
        })

        return await hotelResponse.json()
      })

      const hotelResults = await Promise.all(hotelPromises)
      console.log('🏨 Hotel results:', hotelResults)

      // 🎯 6. Activity Planning
      console.log('🎯 Step 6: Planning activities')
      const activityPromises = cities.map(async (city) => {
        const activityResponse = await fetch('/api/activities/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            city,
            duration: Math.floor(requiredTripData.duration! / cities.length),
            budget: budgetBreakdown.activities / cities.length,
            preferences: requiredTripData.activities || [],
            pace: requiredTripData.pace || 'balanced'
          })
        })

        return await activityResponse.json()
      })

      const activityResults = await Promise.all(activityPromises)
      console.log('🎯 Activity results:', activityResults)

      // 📅 7. Build Day-by-Day Itinerary
      console.log('📅 Step 7: Building daily itinerary')
      const dailyItinerary: DailyItinerary[] = []
      let runningTotal = planData.flights?.totalCost || 0
      let currentDate = new Date(startDate)

      for (let day = 1; day <= requiredTripData.duration!; day++) {
        const cityIndex = Math.floor((day - 1) / (requiredTripData.duration! / cities.length))
        const city = cities[cityIndex] || cities[0]
        const hotelData = hotelResults[cityIndex]
        const activityData = activityResults[cityIndex]
        
        const hotel = hotelData?.success ? hotelData.hotels[0] : null
        const dayActivities = activityData?.success ? activityData.activities.dailyItineraries.find((d: any) => d.day === (day - cityIndex * Math.floor(requiredTripData.duration! / cities.length))) : null

        const dailyTotal = (hotel?.pricePerNight || 0) + (dayActivities?.dailyCost || 0) + (budgetBreakdown.food / requiredTripData.duration!) + (budgetBreakdown.transport / requiredTripData.duration!)
        runningTotal += dailyTotal

        dailyItinerary.push({
          day,
          date: currentDate.toISOString().split('T')[0],
          city,
          accommodation: hotel ? {
            name: hotel.name,
            type: hotel.type,
            location: hotel.location,
            rating: hotel.rating,
            pricePerNight: hotel.pricePerNight,
            amenities: hotel.amenities,
            checkIn: day === 1 ? '15:00' : undefined,
            checkOut: day === requiredTripData.duration ? '11:00' : undefined
          } : {
            name: `${city} Hotel`,
            type: 'hotel',
            location: 'City Center',
            rating: 4.0,
            pricePerNight: budgetBreakdown.accommodation / requiredTripData.duration!,
            amenities: ['WiFi', 'Breakfast']
          },
          activities: dayActivities?.activities?.map((activity: any) => ({
            time: activity.name.includes('Breakfast') ? '09:00' : activity.name.includes('Lunch') ? '13:00' : activity.name.includes('Dinner') ? '19:00' : '10:00',
            activity: activity.name,
            description: activity.description,
            location: city,
            duration: activity.duration,
            cost: activity.cost,
            type: activity.type
          })) || [
            {
              time: '10:00',
              activity: `Explore ${city}`,
              description: `Discover the highlights of ${city}`,
              location: city,
              duration: '4h',
              cost: budgetBreakdown.activities / requiredTripData.duration!,
              type: 'attraction' as const
            }
          ],
          meals: {
            breakfast: { restaurant: `${city} Café`, cost: budgetBreakdown.food / requiredTripData.duration! * 0.3, location: city },
            lunch: { restaurant: `Local Restaurant`, cost: budgetBreakdown.food / requiredTripData.duration! * 0.4, location: city },
            dinner: { restaurant: `Traditional ${city} Restaurant`, cost: budgetBreakdown.food / requiredTripData.duration! * 0.3, location: city }
          },
          transport: [{
            type: day === 1 ? 'Flight arrival' : day === requiredTripData.duration ? 'Flight departure' : 'Local transport',
            cost: budgetBreakdown.transport / requiredTripData.duration!,
            details: day === 1 ? 'Airport to hotel' : day === requiredTripData.duration ? 'Hotel to airport' : 'City transport'
          }],
          dailyTotal: Math.round(dailyTotal),
          runningTotal: Math.round(runningTotal)
        })

        currentDate.setDate(currentDate.getDate() + 1)
      }

      // 📤 8. Finalize Plan
      planData.itinerary = dailyItinerary
      planData.totalCost = runningTotal
      planData.budgetRemaining = requiredTripData.budget! - runningTotal

      console.log('✅ Comprehensive trip plan generated:', planData)
      setTripPlan(planData as TripPlan)
      
      // Add success message to chat
      const successMessage: Message = {
        id: Date.now().toString(),
        text: `🎉 **Your comprehensive ${requiredTripData.duration}-day trip to ${requiredTripData.destination} is ready!**\\n\\n✅ Budget: £${requiredTripData.budget?.toLocaleString()} (£${planData.budgetRemaining} remaining)\\n✅ Cities: ${cities.join(', ')}\\n✅ Flights: ${planData.flights ? 'Found within budget' : 'Estimated'}\\n✅ Hotels: Booked for all ${requiredTripData.duration} nights\\n✅ Activities: ${dailyItinerary.reduce((total, day) => total + day.activities.length, 0)} planned experiences\\n\\n📋 **Check the detailed itinerary in the right panel!**\\n\\nYou can now save, download, or make adjustments to your perfect trip plan.`,
        sender: 'ai',
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, successMessage])

    } catch (error) {
      console.error('❌ Error generating comprehensive trip plan:', error)
      
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: `I apologize, but I encountered an error while creating your comprehensive trip plan. Let me try a simplified approach or you can try again. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        sender: 'ai',
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsGeneratingPlan(false)
    }
  }

  const generateAIResponse = async (userMessage: string, currentMessages?: Message[]): Promise<string> => {
    try {
      console.log('🔄 Processing user message:', userMessage)
      
      // Add type safety check
      if (typeof userMessage !== 'string') {
        console.error('❌ generateAIResponse received non-string userMessage:', typeof userMessage, userMessage)
        return "I'm sorry, I didn't receive your message properly. Could you please try typing your message again?"
      }
      
      if (!userMessage || userMessage.trim() === '') {
        console.warn('⚠️ generateAIResponse received empty message')
        return "I didn't receive any message from you. What would you like to tell me about your trip?"
      }
      
      const lowerMessage = userMessage.toLowerCase()
      
      // Handle confirmation responses when waiting for plan confirmation
      if (waitingForConfirmation) {
        if (lowerMessage.includes('yes') || lowerMessage.includes('create') || lowerMessage.includes('proceed') || lowerMessage.includes('go ahead')) {
          // User wants to create the plan - trigger comprehensive planning
          console.log('🚀 User confirmed - starting comprehensive trip planning')
          
          // Start the comprehensive planning process
          setTimeout(() => {
            generateComprehensiveTripPlan()
          }, 1000)
          
          return `🎉 Excellent! I'm creating your personalized ${requiredTripData.duration}-day adventure to ${requiredTripData.destination} for ${requiredTripData.travelers} ${requiredTripData.travelers === 1 ? 'traveler' : 'travelers'} with your £${requiredTripData.budget?.toLocaleString()} budget.\\n\\n🔄 **Creating your comprehensive itinerary:**\\n\\n• 💸 Allocating budget across flights, hotels, food & activities\\n• 🗺️ Selecting the best cities and route for your ${requiredTripData.duration} days\\n• 🛫 Finding flights within budget from ${requiredTripData.departureLocation}\\n• 🏨 Booking accommodation for every night\\n• 🎯 Planning daily activities and attractions\\n• 📅 Building your day-by-day itinerary with cost tracking\\n\\nThis comprehensive plan will appear in the panel on the right once ready!\\n\\n✨ **Estimated completion: 10-15 seconds**`
        } else if (lowerMessage.includes('no') || lowerMessage.includes('wait') || lowerMessage.includes('more info') || lowerMessage.includes('additional')) {
          // User wants to provide more information
          return "Of course! What additional information would you like to share? You can tell me about:\\n\\n• Specific places you want to visit\\n• Types of cuisine you'd like to try\\n• Special occasions or celebrations\\n• Accessibility needs\\n• Any other preferences or requirements\\n\\nJust let me know what's on your mind!"
        } else {
          // User's response is unclear
          return "I'd love to help! Would you like me to:\\n\\n✅ **Create your travel plan** based on the information we've discussed?\\n\\n📝 **Gather more details** - if you have additional preferences to share?\\n\\nJust let me know which you'd prefer!"
        }
      }
      
      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      console.log('✅ AI response generated successfully')
      
      // Analyze conversation context first
      const messagesToAnalyze = currentMessages || messages
      const contextualInfo = analyzeConversationContext(userMessage, messagesToAnalyze)
      console.log('🧠 Contextual analysis:', contextualInfo)
      
      // Extract information from the user's message using contextual understanding
      const { updates, questionsUpdate } = extractTripInformation(userMessage, contextualInfo)
      console.log('📝 Extracted info with context:', { updates, questionsUpdate })
      
      // Build acknowledgment response for any new information provided
      let acknowledgments: string[] = []
      
      if (questionsUpdate.destination && updates.destination) {
        const question = QUESTIONS.find(q => q.key === 'destination')
        
        // Search for destination information when a new destination is provided
        try {
          console.log('🔍 Fetching destination info for:', updates.destination)
          const response = await fetch('/api/destinations/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ destination: updates.destination })
          })
          
          if (response.ok) {
            const data = await response.json()
            if (data.success && data.destinationInfo) {
              console.log('✅ Destination info received:', data.destinationInfo)
              setDestinationInfo(data.destinationInfo)
              
              // Enhanced acknowledgment with location context
              const info = data.destinationInfo
              let enhancedAck = `${updates.destination} - excellent choice!`
              
              if (info.country && info.country !== 'Unknown') {
                enhancedAck += ` That's in ${info.country}.`
              }
              
              if (info.description && info.description.length > 50) {
                enhancedAck += ` ${info.description.substring(0, 100)}...`
              }
              
              if (info.bestTime && info.bestTime !== 'Year-round') {
                enhancedAck += ` The best time to visit is ${info.bestTime}.`
              }
              
              acknowledgments.push(enhancedAck)
            } else {
              acknowledgments.push(question?.followUp(updates.destination) || `${updates.destination} - excellent choice!`)
            }
          } else {
            acknowledgments.push(question?.followUp(updates.destination) || `${updates.destination} - excellent choice!`)
          }
        } catch (error) {
          console.error('❌ Error fetching destination info:', error)
          acknowledgments.push(question?.followUp(updates.destination) || `${updates.destination} - excellent choice!`)
        }
      }
      
      if (questionsUpdate.duration && updates.duration) {
        const question = QUESTIONS.find(q => q.key === 'duration')
        acknowledgments.push(question?.followUp(updates.duration) || `${updates.duration} days - perfect!`)
      }
      
      if (questionsUpdate.budget && updates.budget) {
        const question = QUESTIONS.find(q => q.key === 'budget')
        acknowledgments.push(question?.followUp(updates.budget) || `£${updates.budget.toLocaleString()} budget noted!`)
      }
      
      if (questionsUpdate.travelers && updates.travelers) {
        const question = QUESTIONS.find(q => q.key === 'travelers')
        acknowledgments.push(question?.followUp(updates.travelers) || `${updates.travelers} travelers - got it!`)
      }
      
      if (questionsUpdate.departureLocation && updates.departureLocation) {
        const question = QUESTIONS.find(q => q.key === 'departureLocation')
        acknowledgments.push(question?.followUp(updates.departureLocation) || `Departing from ${updates.departureLocation}!`)
      }
      
      if (questionsUpdate.dates && updates.dates?.month) {
        const question = QUESTIONS.find(q => q.key === 'dates')
        acknowledgments.push(question?.followUp(updates.dates.month) || `${updates.dates.month} - great timing!`)
      }
      
      if (questionsUpdate.accommodationType && updates.accommodationType) {
        const question = QUESTIONS.find(q => q.key === 'accommodationType')
        acknowledgments.push(question?.followUp(updates.accommodationType) || `${updates.accommodationType} - noted!`)
      }
      
      if (questionsUpdate.foodPreferences && updates.foodPreferences && updates.foodPreferences.length > 0) {
        const question = QUESTIONS.find(q => q.key === 'foodPreferences')
        acknowledgments.push(question?.followUp(updates.foodPreferences.join(', ')) || `Great food preferences noted! I'll make sure your dining experiences align with ${updates.foodPreferences.join(', ')}.`)
      }
      
      if (questionsUpdate.activities && updates.activities && updates.activities.length > 0) {
        const question = QUESTIONS.find(q => q.key === 'activities')
        acknowledgments.push(question?.followUp(updates.activities.join(', ')) || `${updates.activities.join(', ')} activities - sounds amazing!`)
      }
      
      if (questionsUpdate.pace && updates.pace) {
        const question = QUESTIONS.find(q => q.key === 'pace')
        acknowledgments.push(question?.followUp(updates.pace) || `${updates.pace} pace - perfect!`)
      }
      
      // Check if we can create the itinerary now
      const updatedQuestionsAnswered = { ...questionsAnswered, ...questionsUpdate }
      const willBeComplete = Object.values(updatedQuestionsAnswered).every(answered => answered)
      
      if (willBeComplete && !hasAskedForConfirmation) {
        const ackText = acknowledgments.length > 0 ? acknowledgments.join(' ') + '\\n\\n' : ''
        // Set flags for confirmation flow
        setHasAskedForConfirmation(true)
        setWaitingForConfirmation(true)
        
        const destinationName = updates.destination || requiredTripData.destination
        let destinationSummary = `• Destination: ${destinationName}`
        
        // Add destination context if available
        if (destinationInfo && destinationInfo.name.toLowerCase() === destinationName?.toLowerCase()) {
          if (destinationInfo.country && destinationInfo.country !== 'Unknown') {
            destinationSummary += ` (${destinationInfo.country})`
          }
          if (destinationInfo.region && destinationInfo.region !== 'Unknown') {
            destinationSummary += ` - ${destinationInfo.region}`
          }
        }
        
        return `${ackText}🎉 Perfect! I now have all the information I need to create your amazing trip itinerary!\\n\\n**Here's what I've gathered:**\\n${destinationSummary}\\n• Duration: ${updates.duration || requiredTripData.duration} days\\n• Travelers: ${updates.travelers || requiredTripData.travelers}\\n• Budget: £${(updates.budget || requiredTripData.budget)?.toLocaleString()}\\n• Departure: ${updates.departureLocation || requiredTripData.departureLocation}\\n• Travel month: ${updates.dates?.month || requiredTripData.dates?.month}\\n\\n**Ready to proceed?**\\n\\n✅ **Yes, create my travel plan!** - I'll design your perfect itinerary\\n\\n📝 **Wait, I have more details to share** - Tell me what else you'd like to add\\n\\nWhat would you like to do?`
      }
      
      // Get the next question to ask
      const nextQuestion = QUESTIONS.find(q => !updatedQuestionsAnswered[q.key as keyof QuestionsAnswered])
      
      if (nextQuestion) {
        // Track the question being asked for context
        console.log('❓ Asking question:', nextQuestion.key, nextQuestion.question)
        
        // Update conversation context
        setConversationContext(prev => ({
          ...prev,
          lastQuestionAsked: nextQuestion.question,
          lastQuestionKey: nextQuestion.key,
          expectedAnswerType: getExpectedAnswerType(nextQuestion.key),
          conversationHistory: [
            ...prev.conversationHistory,
            {
              question: nextQuestion.question,
              questionKey: nextQuestion.key,
              timestamp: new Date()
            }
          ]
        }))
        
        const ackText = acknowledgments.length > 0 ? acknowledgments.join(' ') + '\\n\\n' : ''
        return `${ackText}${nextQuestion.question}`
      }
      
      // Fallback - shouldn't reach here
      return "I'm here to help you plan your perfect trip! Tell me where you'd like to go and I'll ask you a few questions to create an amazing itinerary."
      
    } catch (error) {
      console.error('🚨 Error in generateAIResponse:', error)
      return "I'm sorry, I encountered an error processing your message. Please try again, or let me know what you'd like to plan for your trip!"
    }
  }

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return

    // Store the message before clearing it
    const messageText = currentMessage.trim()

    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      sender: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setCurrentMessage('')
    setIsLoading(true)

    // Add typing indicator
    const typingMessage: Message = {
      id: 'typing',
      text: '',
      sender: 'ai',
      timestamp: new Date(),
      isTyping: true
    }
    setMessages(prev => [...prev, typingMessage])

    try {
      console.log('🤖 Starting AI response generation for:', messageText)
      
      const lowerMessage = messageText.toLowerCase()
      
      // Handle confirmation responses
      if (waitingForConfirmation) {
        if (lowerMessage.includes('yes') || lowerMessage.includes('create') || lowerMessage.includes('proceed') || lowerMessage.includes('go ahead')) {
          // User confirmed - stop waiting for confirmation
          setWaitingForConfirmation(false)
        } else if (lowerMessage.includes('no') || lowerMessage.includes('wait') || lowerMessage.includes('more info') || lowerMessage.includes('additional')) {
          // User wants to add more info - reset confirmation state
          setWaitingForConfirmation(false)
          setHasAskedForConfirmation(false)
        }
      }
      
      // Extract information from user message and update state (only if not just confirming)
      let updates = {}
      let questionsUpdate = {}
      
      if (!waitingForConfirmation || (!lowerMessage.includes('yes') && !lowerMessage.includes('create') && !lowerMessage.includes('proceed'))) {
        // Analyze context first
        const contextualInfo = analyzeConversationContext(messageText, messages)
        const extractedInfo = extractTripInformation(messageText, contextualInfo)
        updates = extractedInfo.updates
        questionsUpdate = extractedInfo.questionsUpdate
        console.log('📝 Updating state with contextual info:', { updates, questionsUpdate, contextualInfo })
      }
      
      // Update the trip data state
      if (Object.keys(updates).length > 0) {
        setRequiredTripData(prev => ({ ...prev, ...updates }))
        setTripDetails(prev => ({ 
          ...prev, 
          destination: updates.destination || prev.destination,
          budget: updates.budget || prev.budget,
          travelers: updates.travelers || prev.travelers,
          startDate: updates.dates?.startDate || prev.startDate,
          endDate: updates.dates?.endDate || prev.endDate
        }))
      }
      
      // Update questions answered state
      if (Object.keys(questionsUpdate).length > 0) {
        setQuestionsAnswered(prev => ({ ...prev, ...questionsUpdate }))
        
        // Update conversation context with user's answer
        setConversationContext(prev => {
          const updatedHistory = prev.conversationHistory.map(item => {
            // Find the most recent unanswered question that matches what was just answered
            if (!item.answer) {
              const answeredKeys = Object.keys(questionsUpdate)
              if (answeredKeys.some(key => item.questionKey === key)) {
                return { ...item, answer: messageText }
              }
            }
            return item
          })
          
          return {
            ...prev,
            conversationHistory: updatedHistory
          }
        })
      }
      
      const aiResponse = await generateAIResponse(messageText, messages)
      console.log('✅ AI response generated successfully:', aiResponse.substring(0, 100) + '...')
      
      // Remove typing indicator and add actual response
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== 'typing')
        return [...filtered, {
          id: Date.now().toString(),
          text: aiResponse,
          sender: 'ai',
          timestamp: new Date()
        }]
      })

      // Update suggested prompts based on context
      updateSuggestedPrompts(messageText)
      
    } catch (error) {
      console.error('❌ Chat error:', error)
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
      
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== 'typing')
        return [...filtered, {
          id: Date.now().toString(),
          text: `I apologize, but I encountered an error processing your request. Error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
          sender: 'ai',
          timestamp: new Date()
        }]
      })
    } finally {
      setIsLoading(false)
    }
  }

  const updateSuggestedPrompts = (userMessage: string) => {
    const lowerMessage = userMessage.toLowerCase()
    let newPrompts = [...suggestedPrompts]
    
    if (lowerMessage.includes('italy') || lowerMessage.includes('japan')) {
      newPrompts = ["Add more local restaurants", "Include wellness activities", "Find walking tours"]
    } else if (lowerMessage.includes('budget') || lowerMessage.includes('cheap')) {
      newPrompts = ["Show luxury options", "Add premium experiences", "Include fine dining"]
    } else if (lowerMessage.includes('wellness') || lowerMessage.includes('health')) {
      newPrompts = ["Add adventure activities", "Include nightlife", "Show cultural sites"]
    }
    
    setAvailablePrompts(newPrompts.slice(0, 3))
  }

  const handlePromptClick = (prompt: string) => {
    setCurrentMessage(prompt)
    inputRef.current?.focus()
  }

  const handleSaveDraft = async () => {
    try {
      const draftData = {
        tripDetails,
        itinerary,
        messages: messages.slice(-10) // Save last 10 messages
      }
      
      // Simulate API call
      await fetch('/api/trips/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draftData)
      })
      
      setIsDraftSaved(true)
      setTimeout(() => setIsDraftSaved(false), 3000)
      
    } catch (error) {
      console.error('Failed to save draft:', error)
    }
  }

  const handleFinalizePlan = async () => {
    if (itinerary.length === 0) {
      alert('Please create an itinerary first!')
      return
    }
    
    try {
      const finalPlan = {
        tripDetails,
        itinerary,
        status: 'finalized'
      }
      
      await fetch('/api/trips/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalPlan)
      })
      
      alert('Trip plan finalized successfully!')
      
    } catch (error) {
      console.error('Failed to finalize plan:', error)
      alert('Failed to finalize plan. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => window.location.href = '/home'}
              className="text-brand-green hover:text-brand-seafoam transition-colors"
            >
              ← Back to Home
            </button>
            
            {/* Trip Context Bar */}
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
              {tripDetails.travelers > 0 && (
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{tripDetails.travelers} {tripDetails.travelers === 1 ? 'traveler' : 'travelers'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveDraft}
              disabled={messages.length <= 1}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDraftSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {isDraftSaved ? 'Saved!' : 'Save Draft'}
            </button>
            
            <button
              onClick={handleFinalizePlan}
              disabled={itinerary.length === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-brand-green hover:bg-brand-green/90 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              Finalize Plan
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid lg:grid-cols-5 gap-6 h-[calc(100vh-200px)]">
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
            <ComprehensiveTripPreview 
              tripPlan={tripPlan}
              isGenerating={isGeneratingPlan}
            />
          </div>
        </div>
      </div>
    </div>
  )
}