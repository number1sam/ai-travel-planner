'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Save, Check, MapPin, Calendar, DollarSign, Users, Plane, Hotel, Camera, Coffee } from 'lucide-react'
import ChatInterface from '@/components/planner/ChatInterface'
import ItineraryPreview from '@/components/planner/ItineraryPreview'
import { findBestHotels, getBudgetRecommendation } from '@/lib/hotelDatabase'
import { 
  getActivitiesForDestination as getDestinationActivities, 
  filterActivitiesByPreferences,
  getActivitiesByTimeSlot,
  filterActivitiesByProximity,
  calculateDistance,
  Activity
} from '@/lib/activitiesDatabase'

interface Message {
  id: string
  text: string
  sender: 'user' | 'ai'
  timestamp: Date
  isTyping?: boolean
}

// Required data checklist - ALL must be collected before itinerary generation
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
  touristVsLocal: string // tourist, local, both
}

// Enhanced trip planning state with budget allocation
interface TripPlanningState {
  destination: string
  tripLength: number // in days
  budget: number
  people: number
  travelMonth: string
  accommodation: string
  departureLocation: string
  foodPreferences: string[]
  activities: string[]
  selectedHotel: HotelSelection | null
  budgetBreakdown: BudgetAllocation
  itinerary: DayPlan[]
}

interface BudgetAllocation {
  accommodationBudget: number // 55% of total
  activityBudget: number // 30% of total  
  foodBudget: number // 15% of total
  pricePerNight: number
  remainingActivityBudget: number
  remainingFoodBudget: number
}

interface HotelSelection {
  name: string
  pricePerNight: number
  totalCost: number
  location: string
  rating: number
  amenities: string[]
  distanceFromCenter: number
  reviewScore: number
}

interface DayPlan {
  day: number
  date: string
  title: string
  activities: ActivitySlot[]
  totalCost: number
}

interface ActivitySlot {
  id: string
  timeSlot: 'morning' | 'afternoon' | 'evening'
  time: string
  name: string
  type: 'sightseeing' | 'restaurant' | 'activity' | 'transport' | 'wellness'
  location: string
  description: string
  duration: number // minutes
  cost: number
  distanceFromHotel: number
  healthTip?: string
}

// Extended conversation state (includes optional fields)
interface ConversationState extends RequiredTripData {
  // Additional optional fields
  diningStyle: string | null
  accessibility: string[]
  healthRequirements: string[]
  specialRequests: string[]
  transportPreference: string | null
  groupType: string | null
  region: string | null // specific region within destination
}

interface QuestionDefinition {
  key: keyof ConversationState | string
  text: string
  priority: 'essential' | 'important' | 'optional'
  category: 'basic' | 'preferences' | 'activities' | 'logistics'
  condition?: (state: ConversationState) => boolean
}

interface ItineraryDay {
  id: string
  date: string
  activities: Activity[]
  flight?: FlightInfo
  hotel?: HotelInfo
}

interface Activity {
  id: string
  name: string
  type: 'sightseeing' | 'restaurant' | 'activity' | 'transport' | 'wellness'
  time: string
  duration: number
  location: string
  description: string
  price: number
  healthTip?: string
}

interface FlightInfo {
  airline: string
  flightNumber: string
  departure: string
  arrival: string
  duration: string
  price: number
}

interface HotelInfo {
  name: string
  rating: number
  location: string
  amenities: string[]
  pricePerNight: number
}

const suggestedPrompts = [
  "Add more local restaurants",
  "Find a cheaper hotel",
  "Include relaxation activities",
  "Add fitness activities",
  "Show cultural experiences",
  "Include family-friendly options"
]

// Required data fields - ALL must be collected before itinerary generation
const REQUIRED_FIELDS: (keyof RequiredTripData | string)[] = [
  'destination',
  'duration', 
  'budget',
  'travelers',
  'departureLocation',
  'dates.month',
  'accommodationType',
  'foodPreferences',
  'activities', 
  'pace',
  'touristVsLocal'
]

// Define the question queue with smart prioritization
const QUESTION_DEFINITIONS: QuestionDefinition[] = [
  // REQUIRED questions - must be answered for itinerary generation
  {
    key: 'destination',
    text: "Where would you like to go? 🌍 (e.g., Italy, Japan, France, Spain, etc.)",
    priority: 'essential',
    category: 'basic'
  },
  {
    key: 'duration',
    text: "How long would you like your trip to be? ⏰ (e.g., 7 days, 2 weeks, 10 days)",
    priority: 'essential',
    category: 'basic'
  },
  {
    key: 'budget',
    text: "What's your total budget for this trip? 💰 (Please include currency, e.g., £3000, $4000, €3500)",
    priority: 'essential',
    category: 'basic'
  },
  {
    key: 'travelers',
    text: "How many people will be traveling? 👥 (e.g., 2 adults, 4 people, just me)",
    priority: 'essential',
    category: 'basic'
  },
  {
    key: 'departureLocation',
    text: "Where will you be flying from? ✈️ (e.g., London, New York, Paris)",
    priority: 'essential',
    category: 'logistics'
  },
  {
    key: 'dates.month',
    text: "When would you like to travel? 📅 (e.g., March, summer, next month)",
    priority: 'essential',
    category: 'basic'
  },
  {
    key: 'accommodationType',
    text: "What type of accommodation do you prefer? 🏨 (luxury/5-star, mid-range/4-star, budget/3-star, boutique)",
    priority: 'essential',
    category: 'preferences'
  },
  {
    key: 'foodPreferences',
    text: "What type of cuisine experiences are you looking for? 🍽️ (Italian, Asian, local specialties, vegetarian, etc.)",
    priority: 'essential',
    category: 'preferences'
  },
  {
    key: 'activities',
    text: "What activities interest you most? 🎪 (culture, adventure, relaxation, nightlife, shopping, nature, sports)",
    priority: 'essential',
    category: 'activities'
  },
  {
    key: 'pace',
    text: "What pace do you prefer? ⚡ (fast-paced with lots to see, relaxed and leisurely, or balanced)",
    priority: 'essential',
    category: 'preferences'
  },
  {
    key: 'touristVsLocal',
    text: "Do you prefer popular tourist attractions or hidden local gems? 🗺️ (tourist spots, local experiences, or both)",
    priority: 'essential',
    category: 'activities'
  }
]

export default function PlannerPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Welcome to your AI Travel Assistant! 🌍 I'm here to help you plan an amazing trip.\n\nYou can tell me everything at once like: \"I want to go to Italy for 7 days with £3000 budget for 2 people, departing from London in March, staying in hotels\" \n\nOr just start with your destination and I'll ask follow-up questions. What can you tell me about your dream trip?",
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
    duration: 0, // Add duration field
    budget: 0,
    travelers: 1,
    preferences: [],
    activities: [], // Add activities array
    departureLocation: '',
    accommodationType: '',
    travelStyle: '',
    specialRequests: []
  })

  const [questionsAnswered, setQuestionsAnswered] = useState<PlanningQuestions>({
    destination: false,
    budget: false,
    duration: false,
    travelers: false,
    departureLocation: false,
    accommodationType: false,
    travelStyle: false,
    dates: false
  })
  
  // Track all user-provided information to avoid repeated questions
  const [conversationMemory, setConversationMemory] = useState<{
    mentionedInfo: Set<string>
    extractedData: Record<string, any>
  }>({
    mentionedInfo: new Set(),
    extractedData: {}
  })
  
  const [itinerary, setItinerary] = useState<ItineraryDay[]>([])
  const [isDraftSaved, setIsDraftSaved] = useState(false)
  const [availablePrompts, setAvailablePrompts] = useState<string[]>(suggestedPrompts.slice(0, 3))
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Budget allocation system - 55% hotels, 30% activities, 15% food
  // CLAUDE'S WORKFLOW STEP 2: Allocate Budget - Split into 55% hotels, 30% activities, 15% food
  const calculateBudgetAllocation = (totalBudget: number, tripLength: number): BudgetAllocation => {
    console.log('💰 Claude\'s Step-by-Step Workflow - Step 2: Allocate Budget')
    console.log(`   Total Budget: £${totalBudget} for ${tripLength} days`)
    
    // EXACT allocation as specified: 55% hotels, 30% activities, 15% food
    const accommodationBudget = Math.round(totalBudget * 0.55)
    const activityBudget = Math.round(totalBudget * 0.30)
    const foodBudget = Math.round(totalBudget * 0.15)
    const pricePerNight = Math.round(accommodationBudget / tripLength)
    
    console.log(`   📊 Accommodation (55%): £${accommodationBudget} (£${pricePerNight}/night)`)
    console.log(`   🎯 Activities (30%): £${activityBudget}`)
    console.log(`   🍽️ Food & Dining (15%): £${foodBudget}`)
    
    // Budget validation as specified
    if (pricePerNight < 30) {
      console.log(`   ⚠️ Low accommodation budget: £${pricePerNight}/night - may suggest hostels or guesthouses`)
    }
    
    if (activityBudget < 50) {
      console.log(`   ⚠️ Low activity budget: £${activityBudget} total - will recommend free/low-cost activities`)
    }

    console.log('   ✅ Budget allocation complete')

    return {
      accommodationBudget,
      activityBudget,
      foodBudget,
      pricePerNight,
      remainingActivityBudget: activityBudget,
      remainingFoodBudget: foodBudget
    }
  }

  // Get city center coordinates for distance calculations
  const getCityCenterCoords = (destination: string): {lat: number, lng: number} | null => {
    const cityCenters: Record<string, {lat: number, lng: number}> = {
      'Italy': { lat: 41.9028, lng: 12.4964 }, // Rome
      'France': { lat: 48.8566, lng: 2.3522 }, // Paris
      'Japan': { lat: 35.6762, lng: 139.6503 }, // Tokyo
      'Spain': { lat: 40.4168, lng: -3.7038 }, // Madrid
      'Germany': { lat: 52.5200, lng: 13.4050 }, // Berlin
      'United Kingdom': { lat: 51.5074, lng: -0.1278 }, // London
      'Greece': { lat: 37.9755, lng: 23.7348 }, // Athens
      'Portugal': { lat: 38.7223, lng: -9.1393 }, // Lisbon
      'Netherlands': { lat: 52.3676, lng: 4.9041 }, // Amsterdam
      'Turkey': { lat: 41.0082, lng: 28.9784 }, // Istanbul
    }
    
    return cityCenters[destination] || null
  }

  // CLAUDE'S WORKFLOW STEP 3: Find Hotel - Select a real, budget-matching hotel with details
  const findBestHotelForBudget = (
    destination: string, 
    pricePerNight: number, 
    people: number,
    tripLength: number = 7
  ): HotelSelection => {
    console.log('🏨 Claude\'s Step-by-Step Workflow - Step 3: Find Hotel')
    console.log(`   Searching: ${destination}, £${pricePerNight}/night, ${people} people, ${tripLength} days`)
    
    // Use the real hotel database from hotelDatabase.ts
    const totalBudget = pricePerNight * tripLength
    const bestHotels = findBestHotels(destination, totalBudget, tripLength, 15) // Get more options
    
    console.log(`Found ${bestHotels.length} hotels in database for ${destination}`)
    
    if (bestHotels.length === 0) {
      console.log(`⚠️ No hotels found in database for ${destination}, using fallback`)
      // Fallback if no hotels found in database
      return {
        name: `${destination} Central Hotel`,
        pricePerNight: pricePerNight,
        totalCost: pricePerNight * tripLength,
        location: `${destination} City Center`,
        rating: 3.5,
        amenities: ['WiFi', 'Breakfast', '24h Reception'],
        distanceFromCenter: 1.2,
        reviewScore: 4.1
      }
    }
    
    // Convert hotel database format to HotelSelection format
    const hotelOptions: HotelSelection[] = bestHotels.map(hotel => ({
      name: hotel.name,
      pricePerNight: hotel.pricePerNight,
      totalCost: hotel.pricePerNight * tripLength,
      location: hotel.location,
      rating: Math.round(hotel.rating * 10) / 10,
      amenities: hotel.amenities,
      distanceFromCenter: hotel.coordinates ? 
        (() => {
          const cityCenter = getCityCenterCoords(destination)
          return cityCenter ? 
            Math.round(calculateDistance(hotel.coordinates.lat, hotel.coordinates.lng, cityCenter.lat, cityCenter.lng) * 10) / 10 :
            Math.round(Math.random() * 3 * 10) / 10
        })() :
        Math.round(Math.random() * 3 * 10) / 10,
      reviewScore: hotel.reviewScore
    }))
    
    // CRITICAL: Filter hotels within budget and destination constraints
    let suitableHotels = hotelOptions.filter(hotel => {
      const withinBudget = hotel.pricePerNight <= pricePerNight * 1.15 // 15% flexibility
      const inDestination = hotel.location.toLowerCase().includes(destination.toLowerCase()) ||
                          destination.toLowerCase().includes(hotel.location.toLowerCase())
      const reasonableDistance = hotel.distanceFromCenter <= 5 // Within 5km of center
      const goodRating = hotel.rating >= 3 // Minimum 3-star rating
      
      return withinBudget && inDestination && reasonableDistance && goodRating
    })
    
    console.log(`${suitableHotels.length} hotels meet all criteria (budget, location, rating)`)
    
    // EXACT FALLBACK LOGIC as specified in requirements
    if (suitableHotels.length === 0) {
      console.log('⚠️ No hotels within strict criteria, applying fallback logic...')
      
      // Step 1: Adjust budget slightly (take small amount from activity budget)
      const adjustedPricePerNight = pricePerNight * 1.15 // 15% increase
      console.log(`  → Adjusting budget from £${pricePerNight} to £${adjustedPricePerNight}/night`)
      
      // Step 2: Expand radius by 2-3 km
      const expandedRadius = 8 // Expand from 5km to 8km
      console.log(`  → Expanding search radius to ${expandedRadius}km from city center`)
      
      suitableHotels = hotelOptions.filter(hotel => {
        const withinAdjustedBudget = hotel.pricePerNight <= adjustedPricePerNight
        const withinExpandedRadius = hotel.distanceFromCenter <= expandedRadius
        const minimumRating = hotel.rating >= 2.5 // Lower minimum rating
        
        return withinAdjustedBudget && withinExpandedRadius && minimumRating
      })
      
      console.log(`  → Found ${suitableHotels.length} hotels with relaxed constraints`)
    }
    
    // Step 3: Suggest cheaper accommodation types if still no results
    if (suitableHotels.length === 0) {
      console.log('⚠️ Still no suitable hotels, suggesting alternative accommodation types...')
      
      // Create fallback accommodation options
      const alternativeAccommodation = [
        {
          name: `${destination} Guesthouse`,
          pricePerNight: Math.round(pricePerNight * 0.7),
          totalCost: Math.round(pricePerNight * 0.7) * tripLength,
          location: destination,
          rating: 3.2,
          amenities: ['WiFi', 'Shared Kitchen', 'Breakfast'],
          distanceFromCenter: 3.5,
          reviewScore: 4.0,
          type: 'guesthouse'
        },
        {
          name: `${destination} Apartment`,
          pricePerNight: Math.round(pricePerNight * 0.8),
          totalCost: Math.round(pricePerNight * 0.8) * tripLength,
          location: destination,
          rating: 3.5,
          amenities: ['WiFi', 'Kitchen', 'Living Area'],
          distanceFromCenter: 2.8,
          reviewScore: 4.2,
          type: 'apartment'
        },
        {
          name: `${destination} Hostel`,
          pricePerNight: Math.round(pricePerNight * 0.5),
          totalCost: Math.round(pricePerNight * 0.5) * tripLength,
          location: destination,
          rating: 3.0,
          amenities: ['WiFi', 'Shared Kitchen', 'Common Area'],
          distanceFromCenter: 4.2,
          reviewScore: 3.8,
          type: 'hostel'
        }
      ]
      
      suitableHotels = alternativeAccommodation
      console.log(`  → Suggesting ${suitableHotels.length} alternative accommodation types`)
      console.log(`  → Options: ${suitableHotels.map(h => `${h.type} (£${h.pricePerNight}/night)`).join(', ')}`)
    }
    
    // Final fallback - emergency accommodation
    if (suitableHotels.length === 0) {
      console.log('⚠️ Creating emergency accommodation fallback')
      suitableHotels = [{
        name: `${destination} Budget Stay`,
        pricePerNight: Math.round(pricePerNight * 0.6),
        totalCost: Math.round(pricePerNight * 0.6) * tripLength,
        location: destination,
        rating: 2.8,
        amenities: ['WiFi', 'Basic Room'],
        distanceFromCenter: 6.0,
        reviewScore: 3.5,
        type: 'budget_hotel'
      }]
    }
    
    // Sort by best value: rating, review score, distance, and price
    suitableHotels.sort((a, b) => {
      const scoreA = (a.rating * 0.3) + (a.reviewScore * 0.3) + 
                    (1 / Math.max(a.distanceFromCenter, 0.1) * 0.2) +
                    (1 / Math.max(a.pricePerNight, 1) * 0.2)
      const scoreB = (b.rating * 0.3) + (b.reviewScore * 0.3) + 
                    (1 / Math.max(b.distanceFromCenter, 0.1) * 0.2) +
                    (1 / Math.max(b.pricePerNight, 1) * 0.2)
      return scoreB - scoreA
    })
    
    const selectedHotel = suitableHotels[0]
    console.log(`✅ Selected Hotel: ${selectedHotel.name} - £${selectedHotel.pricePerNight}/night, Total: £${selectedHotel.totalCost}`)
    
    return selectedHotel
  }

  // Activity database with costs and preferences
  const getActivitiesForDestination = (
    destination: string, 
    preferences: string[], 
    hotelLat?: number,
    hotelLng?: number
  ): ActivitySlot[] => {
    // Get real activities from database
    let activities = getDestinationActivities(destination)
    
    // Filter by user preferences if provided
    if (preferences.length > 0) {
      activities = filterActivitiesByPreferences(activities, preferences)
    }
    
    // Filter by proximity to hotel if coordinates available
    if (hotelLat && hotelLng) {
      activities = filterActivitiesByProximity(activities, hotelLat, hotelLng, 8) // 8km radius
    }
    
    // Convert to ActivitySlot format
    const activitySlots = activities.map(activity => ({
      id: activity.id,
      timeSlot: activity.timeSlot as 'morning' | 'afternoon' | 'evening',
      time: getTimeForTimeSlot(activity.timeSlot),
      name: activity.name,
      type: activity.type,
      location: activity.location,
      description: activity.description,
      duration: activity.duration,
      cost: activity.cost,
      distanceFromHotel: hotelLat && hotelLng && activity.coordinates ? 
        calculateDistance(hotelLat, hotelLng, activity.coordinates.lat, activity.coordinates.lng) :
        Math.random() * 3, // Fallback for activities without coordinates
      healthTip: activity.healthTip || 'Stay hydrated and take breaks as needed'
    }))
    
    // If no activities found in database, provide fallback
    if (activitySlots.length === 0) {
      return [
        {
          id: 'city-tour',
          timeSlot: 'morning',
          time: '10:00',
          name: `${destination} City Walking Tour`,
          type: 'sightseeing',
          location: 'City Center',
          description: `Explore the main attractions and landmarks of ${destination}`,
          duration: 180,
          cost: 25,
          distanceFromHotel: 1.0,
          healthTip: 'Great way to get oriented and exercise'
        },
        {
          id: 'local-dining',
          timeSlot: 'evening',
          time: '19:00',
          name: `Traditional ${destination} Restaurant`,
          type: 'restaurant',
          location: 'Local District',
          description: `Authentic local cuisine of ${destination}`,
          duration: 120,
          cost: 45,
          distanceFromHotel: 1.5,
          healthTip: 'Try local ingredients for authentic flavors'
        }
      ]
    }
    
    return activitySlots
  }

  // Get hotel coordinates or city center coordinates
  const getHotelCoordinates = (hotel: HotelSelection, destination: string): {lat: number, lng: number} | null => {
    // City center coordinates for major destinations
    const cityCenters: Record<string, {lat: number, lng: number}> = {
      'Italy': { lat: 41.9028, lng: 12.4964 }, // Rome
      'France': { lat: 48.8566, lng: 2.3522 }, // Paris
      'Japan': { lat: 35.6762, lng: 139.6503 }, // Tokyo
      'Spain': { lat: 40.4168, lng: -3.7038 }, // Madrid
      'Germany': { lat: 52.5200, lng: 13.4050 }, // Berlin
      'United Kingdom': { lat: 51.5074, lng: -0.1278 }, // London
    }
    
    // Try to get city center coordinates, fallback to Rome if not found
    return cityCenters[destination] || cityCenters['Italy']
  }

  // Helper function to get time string for time slot
  const getTimeForTimeSlot = (timeSlot: string): string => {
    switch(timeSlot) {
      case 'morning': return '09:00'
      case 'afternoon': return '14:00'
      case 'evening': return '19:00'
      default: return '10:00'
    }
  }

  // CLAUDE'S WORKFLOW STEP 4: Plan Each Day - Generate activities for all days with proper structure
  const generateComprehensiveItinerary = (
    state: TripPlanningState,
    hotel: HotelSelection,
    budgetAllocation: BudgetAllocation
  ): DayPlan[] => {
    console.log('🗓️ Claude\'s Step-by-Step Workflow - Step 4: Plan Each Day')
    console.log(`   Generating complete ${state.tripLength}-day itinerary`)
    console.log(`   Budget allocation: Activities £${budgetAllocation.activityBudget}, Food £${budgetAllocation.foodBudget}`)
    
    const dayPlans: DayPlan[] = []
    // Get hotel coordinates for proximity calculations
    const hotelCoords = getHotelCoordinates(hotel, state.destination)
    const activities = getActivitiesForDestination(
      state.destination, 
      state.activities, 
      hotelCoords?.lat, 
      hotelCoords?.lng
    )
    
    console.log(`Found ${activities.length} activities for ${state.destination}`)
    
    let remainingActivityBudget = budgetAllocation.activityBudget
    let remainingFoodBudget = budgetAllocation.foodBudget
    
    // CRITICAL: Generate plan for EVERY day of the trip
    for (let dayNum = 1; dayNum <= state.tripLength; dayNum++) {
      console.log(`\n📅 Planning Day ${dayNum} of ${state.tripLength}`)
      const dayActivities: ActivitySlot[] = []
      let dayTitle = ''
      let dayCost = 0
      const currentDate = new Date()
      currentDate.setDate(currentDate.getDate() + dayNum - 1)
      const dateString = currentDate.toISOString().split('T')[0]
      
      if (dayNum === 1) {
        // Day 1: Arrival day - light activities
        dayTitle = `Welcome to ${state.destination}!`
        console.log(`  → Arrival day: Light activities, hotel check-in`)
        
        // Morning flight arrival (assumed)
        dayActivities.push({
          id: `arrival-day${dayNum}`,
          timeSlot: 'morning',
          time: '11:00',
          name: `Arrive in ${state.destination}`,
          type: 'transport',
          location: `${state.destination} Airport`,
          description: `Flight arrival from ${state.departureLocation}`,
          duration: 60,
          cost: 0,
          distanceFromHotel: 15,
          healthTip: 'Stay hydrated during your flight and stretch upon arrival'
        })
        
        // Check-in activity
        dayActivities.push({
          id: `checkin-day${dayNum}`,
          timeSlot: 'afternoon',
          time: '15:00',
          name: `Check-in at ${hotel.name}`,
          type: 'activity',
          location: hotel.location,
          description: `Hotel check-in and settle into your accommodation at ${hotel.name}. ${hotel.amenities.join(', ')} available. Start with breakfast at ${hotel.name} tomorrow.`,
          duration: 60,
          cost: 0,
          distanceFromHotel: 0,
          healthTip: 'Take time to rest and adjust to the new timezone'
        })
        
        // Light evening activity near hotel
        const eveningActivities = activities.filter(a => 
          a.timeSlot === 'evening' && 
          a.distanceFromHotel <= 2.0 &&
          a.type === 'restaurant'
        ).sort((a, b) => a.cost - b.cost) // Start with cheaper options
        
        if (eveningActivities.length > 0 && remainingFoodBudget >= eveningActivities[0].cost) {
          const dinnerActivity = eveningActivities[0]
          dayActivities.push({
            ...dinnerActivity,
            id: `${dinnerActivity.id}-day${dayNum}`,
            name: `Welcome Dinner at ${dinnerActivity.name}`,
            description: `After settling in at ${hotel.name}, start your ${state.destination} adventure with a delicious local meal. ${dinnerActivity.description} Return to ${hotel.name} for rest.`
          })
          dayCost += dinnerActivity.cost
          remainingFoodBudget -= dinnerActivity.cost
          console.log(`  → Added welcome dinner: ${dinnerActivity.name} (£${dinnerActivity.cost})`)
        }
        
      } else if (dayNum === state.tripLength) {
        // Last day: Departure - morning activities + checkout
        dayTitle = `Farewell ${state.destination}`
        console.log(`  → Departure day: Final morning activities + checkout`)
        
        // Morning activity - something memorable but close to hotel
        const morningActivities = activities.filter(a => 
          a.timeSlot === 'morning' && 
          a.duration <= 180 && // Max 3 hours
          a.distanceFromHotel <= 2.0 && // Close to hotel
          !dayPlans.some(dp => dp.activities.some(act => act.id.startsWith(a.id))) // Not already used
        ).sort((a, b) => a.distanceFromHotel - b.distanceFromHotel) // Closest first
        
        if (morningActivities.length > 0 && remainingActivityBudget >= morningActivities[0].cost) {
          const activity = morningActivities[0]
          dayActivities.push({
            ...activity,
            id: `${activity.id}-day${dayNum}`,
            name: `Final Experience: ${activity.name}`,
            description: `End your ${state.destination} trip with this memorable experience. ${activity.description}`
          })
          dayCost += activity.cost
          remainingActivityBudget -= activity.cost
          console.log(`  → Added final activity: ${activity.name} (£${activity.cost})`)
        }
        
        // Light brunch/coffee before departure
        const lightMeals = activities.filter(a => 
          a.timeSlot === 'morning' &&
          a.type === 'restaurant' &&
          a.cost <= 25 &&
          a.distanceFromHotel <= 1.0
        )
        
        if (lightMeals.length > 0 && remainingFoodBudget >= lightMeals[0].cost) {
          const brunch = lightMeals[0]
          dayActivities.push({
            ...brunch,
            id: `farewell-meal-day${dayNum}`,
            timeSlot: 'morning',
            time: '11:00',
            name: `Farewell Coffee at ${brunch.name}`,
            description: 'One last taste of local cuisine before departure'
          })
          dayCost += brunch.cost
          remainingFoodBudget -= brunch.cost
        }
        
        // Checkout
        dayActivities.push({
          id: `checkout-day${dayNum}`,
          timeSlot: 'afternoon',
          time: '12:00',
          name: `Check out from ${hotel.name}`,
          type: 'activity',
          location: hotel.location,
          description: `Check out from ${hotel.name} and prepare for departure to ${state.departureLocation}`,
          duration: 60,
          cost: 0,
          distanceFromHotel: 0,
          healthTip: 'Allow extra time for packing and airport transfers'
        })
        
        // Airport transfer
        dayActivities.push({
          id: `departure-day${dayNum}`,
          timeSlot: 'afternoon',
          time: '16:00',
          name: `Departure to ${state.departureLocation}`,
          type: 'transport',
          location: `${state.destination} Airport`,
          description: `Flight departure back to ${state.departureLocation}`,
          duration: 240, // 4 hours including airport time
          cost: 0,
          distanceFromHotel: 15,
          healthTip: 'Arrive at airport 2-3 hours early for international flights'
        })
        
      } else {
        // Middle days: Full activities (MUST have morning, afternoon, evening slots)
        dayTitle = `Discover ${state.destination} - Day ${dayNum} of ${state.tripLength}`
        console.log(`  → Full exploration day: Planning 3 activity slots with ${hotel.name} as base`)
        
        // START WITH BREAKFAST AT HOTEL (enforced hotel reference)
        dayActivities.push({
          id: `breakfast-${hotel.name}-day${dayNum}`,
          timeSlot: 'morning',
          time: '08:00',
          name: `Breakfast at ${hotel.name}`,
          type: 'restaurant',
          location: hotel.name,
          description: `Start your day with breakfast at ${hotel.name}. Fuel up for a full day of exploration in ${state.destination}.`,
          duration: 60,
          cost: 15, // Standard breakfast cost
          distanceFromHotel: 0,
          healthTip: 'Eat a hearty breakfast to sustain energy for the day'
        })
        dayCost += 15
        remainingFoodBudget -= 15
        
        // MORNING ACTIVITY SLOT - Cultural/sightseeing focus
        const morningOptions = activities.filter(a => 
          a.timeSlot === 'morning' && 
          !dayPlans.some(dp => dp.activities.some(act => act.id.startsWith(a.id))) &&
          (a.type === 'sightseeing' || a.type === 'activity')
        ).sort((a, b) => {
          // Prioritize: distance from hotel, then cost, then rating
          const scoreA = (1 / Math.max(a.distanceFromHotel, 0.1)) + (1 / Math.max(a.cost, 1))
          const scoreB = (1 / Math.max(b.distanceFromHotel, 0.1)) + (1 / Math.max(b.cost, 1))
          return scoreB - scoreA
        })
        
        if (morningOptions.length > 0) {
          // Find affordable morning activity
          const affordableMorning = morningOptions.find(a => a.cost <= remainingActivityBudget)
          if (affordableMorning) {
            dayActivities.push({
              ...affordableMorning,
              id: `${affordableMorning.id}-day${dayNum}`,
              description: `After breakfast at ${hotel.name}, ${affordableMorning.description} Located at ${affordableMorning.location}, just ${affordableMorning.distanceFromHotel.toFixed(1)}km from your hotel.`
            })
            dayCost += affordableMorning.cost
            remainingActivityBudget -= affordableMorning.cost
            console.log(`  → Morning: ${affordableMorning.name} (£${affordableMorning.cost})`)
          }
        }
        
        // AFTERNOON ACTIVITY SLOT - Adventure/exploration focus
        const afternoonOptions = activities.filter(a => 
          a.timeSlot === 'afternoon' && 
          !dayPlans.some(dp => dp.activities.some(act => act.id.startsWith(a.id))) &&
          !dayActivities.some(act => act.id.startsWith(a.id)) // Not already used this day
        ).sort((a, b) => {
          // Diversify - prefer different types from morning activity
          const morningType = dayActivities[0]?.type
          const preferDifferent = morningType !== a.type ? 1 : 0
          const scoreA = preferDifferent + (1 / Math.max(a.cost, 1))
          const scoreBPrefer = morningType !== b.type ? 1 : 0
          const scoreB = scoreBPrefer + (1 / Math.max(b.cost, 1))
          return scoreB - scoreA
        })
        
        if (afternoonOptions.length > 0) {
          const affordableAfternoon = afternoonOptions.find(a => a.cost <= remainingActivityBudget)
          if (affordableAfternoon) {
            dayActivities.push({
              ...affordableAfternoon,
              id: `${affordableAfternoon.id}-day${dayNum}`,
              description: `${affordableAfternoon.description} A great afternoon activity in ${state.destination}.`
            })
            dayCost += affordableAfternoon.cost
            remainingActivityBudget -= affordableAfternoon.cost
            console.log(`  → Afternoon: ${affordableAfternoon.name} (£${affordableAfternoon.cost})`)
          }
        }
        
        // EVENING DINING SLOT - Always include dinner
        const eveningOptions = activities.filter(a => 
          a.timeSlot === 'evening' && 
          a.type === 'restaurant' &&
          !dayPlans.some(dp => dp.activities.some(act => act.id.startsWith(a.id))) &&
          !dayActivities.some(act => act.id.startsWith(a.id))
        ).sort((a, b) => a.cost - b.cost) // Cheapest first to stay in budget
        
        if (eveningOptions.length > 0) {
          const affordableDining = eveningOptions.find(a => a.cost <= remainingFoodBudget)
          if (affordableDining) {
            dayActivities.push({
              ...affordableDining,
              id: `${affordableDining.id}-day${dayNum}`,
              name: `Dinner at ${affordableDining.name}`,
              description: `End your day with delicious local cuisine. ${affordableDining.description} Return to ${hotel.name} for a restful night.`
            })
            dayCost += affordableDining.cost
            remainingFoodBudget -= affordableDining.cost
            console.log(`  → Evening: ${affordableDining.name} (£${affordableDining.cost})`)
          } else if (remainingFoodBudget > 15) {
            // Fallback: generic dinner if no specific restaurant fits budget
            dayActivities.push({
              id: `generic-dinner-day${dayNum}`,
              timeSlot: 'evening',
              time: '19:00',
              name: `Local Dinner in ${state.destination}`,
              type: 'restaurant',
              location: `Near ${hotel.name}`,
              description: `Enjoy authentic local cuisine at a recommended restaurant near ${hotel.name}. Return to your hotel for a restful night.`,
              duration: 90,
              cost: Math.min(25, remainingFoodBudget),
              distanceFromHotel: 0.5,
              healthTip: 'Try local specialties and stay hydrated'
            })
            dayCost += Math.min(25, remainingFoodBudget)
            remainingFoodBudget -= Math.min(25, remainingFoodBudget)
            console.log(`  → Evening: Generic local dinner (£${Math.min(25, remainingFoodBudget)})`)
          }
        }
        
        // ENSURE MINIMUM 2 ACTIVITIES PER FULL DAY
        if (dayActivities.length < 2) {
          console.log(`  ⚠️ Only ${dayActivities.length} activities for day ${dayNum}, adding backup activities`)
          
          // Add backup activities if budget allows
          const backupActivities = activities.filter(a => 
            !dayPlans.some(dp => dp.activities.some(act => act.id.startsWith(a.id))) &&
            !dayActivities.some(act => act.id.startsWith(a.id)) &&
            a.cost <= Math.max(remainingActivityBudget, remainingFoodBudget)
          ).slice(0, 3 - dayActivities.length)
          
          backupActivities.forEach(backup => {
            const budgetToUse = backup.type === 'restaurant' ? remainingFoodBudget : remainingActivityBudget
            if (backup.cost <= budgetToUse) {
              dayActivities.push({
                ...backup,
                id: `${backup.id}-backup-day${dayNum}`,
                name: `Explore: ${backup.name}`,
                description: `Additional ${state.destination} experience. ${backup.description}`
              })
              dayCost += backup.cost
              if (backup.type === 'restaurant') {
                remainingFoodBudget -= backup.cost
              } else {
                remainingActivityBudget -= backup.cost
              }
              console.log(`  → Backup: ${backup.name} (£${backup.cost})`)
            }
          })
        }
        
        console.log(`  ✅ Day ${dayNum} complete: ${dayActivities.length} activities, £${dayCost} total`)
      }
      
      // Add day plan with proper date formatting
      const dayDate = new Date()
      dayDate.setDate(dayDate.getDate() + dayNum + 7) // Start trip a week from now
      
      dayPlans.push({
        day: dayNum,
        date: dateString,
        title: dayTitle,
        activities: dayActivities,
        totalCost: dayCost
      })
      
      console.log(`✅ Day ${dayNum} completed: ${dayActivities.length} activities, £${dayCost} cost, ${dayTitle}`)
    }
    
    // VALIDATION: Ensure we planned exactly tripLength days
    if (dayPlans.length !== state.tripLength) {
      console.error(`❌ PLANNING ERROR: Expected ${state.tripLength} days, but planned ${dayPlans.length} days`)
      throw new Error(`Incomplete itinerary: planned ${dayPlans.length} of ${state.tripLength} days`)
    }
    
    console.log(`\n✅ COMPLETE ITINERARY GENERATED: ${dayPlans.length} days planned successfully`)
    console.log(`🏨 Hotel: ${hotel.name} used for all ${dayPlans.length} days`)
    console.log(`💰 Total budget used: £${dayPlans.reduce((sum, day) => sum + day.totalCost, 0)} of £${state.budget}`)
    
    return dayPlans
  }

  // Convert new itinerary format to old format for display
  const convertToLegacyItinerary = (
    dayPlans: DayPlan[], 
    hotel: HotelSelection,
    flightInfo: any
  ): ItineraryDay[] => {
    return dayPlans.map((dayPlan, index) => ({
      id: `day-${dayPlan.day}`,
      date: dayPlan.date,
      flight: index === 0 ? flightInfo : undefined,
      hotel: index === 0 ? {
        name: hotel.name,
        rating: hotel.rating,
        location: hotel.location,
        amenities: hotel.amenities,
        pricePerNight: hotel.pricePerNight
      } : undefined,
      activities: dayPlan.activities.map(activity => ({
        id: activity.id,
        name: activity.name,
        type: activity.type,
        time: activity.time,
        duration: activity.duration,
        location: activity.location,
        description: activity.description,
        price: activity.cost,
        healthTip: activity.healthTip
      }))
    }))
  }

  // Function to save trip to user account
  const saveTripToAccount = async (tripDetails: any, itineraryResult: any) => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      if (!user.email) {
        console.log('No user logged in, skipping save')
        return
      }

      const response = await fetch('/api/user/trips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          destination: tripDetails.destination,
          startDate: tripDetails.startDate,
          endDate: tripDetails.endDate,
          budget: tripDetails.budget,
          travelers: tripDetails.travelers,
          preferences: {
            departureLocation: tripDetails.departureLocation,
            accommodationType: tripDetails.accommodationType,
            travelStyle: tripDetails.travelStyle,
            activities: tripDetails.preferences,
            specialRequests: tripDetails.specialRequests
          },
          itineraryData: {
            totalDays: itineraryResult.dayPlans.length,
            totalCost: tripDetails.budget,
            hotel: itineraryResult.hotel,
            budgetBreakdown: itineraryResult.budgetBreakdown,
            days: itineraryResult.dayPlans.map((day: any) => ({
              date: day.date,
              title: day.title,
              description: `Day ${day.day} in ${tripDetails.destination}`,
              totalCost: day.totalCost,
              activities: day.activities.map((activity: any) => ({
                name: activity.name,
                description: activity.description,
                time: activity.time,
                duration: activity.duration,
                location: activity.location,
                cost: activity.cost,
                type: activity.type,
                healthTip: activity.healthTip
              }))
            }))
          }
        })
      })

      if (response.ok) {
        console.log('Trip saved to user account successfully')
      } else {
        console.error('Failed to save trip to account')
      }
    } catch (error) {
      console.error('Error saving trip to account:', error)
    }
  }

  // CLAUDE SYSTEM PROMPT FOR FORCED ITERATION
  const generateSystemPromptForPlanning = (tripLength: number, destination: string, budget: number) => {
    return `
You must always plan one activity-filled day per line, for each day of the trip, from Day 1 to Day ${tripLength}.

Never stop at Day 2. You must continue planning days until the trip ends. Do not skip any days. The plan is incomplete until every single day has:
- A morning activity
- An afternoon activity  
- An evening dining or entertainment suggestion

Only stop planning when you have generated a full day-by-day plan that covers every single day of the trip.

START OF LOOPED ITINERARY
For a trip of ${tripLength} days in ${destination}, generate a full itinerary as follows:

Loop through each day from Day 1 to Day ${tripLength}:

Day [N]:
- Morning: [Activity related to user interests and location]
- Afternoon: [Cultural/tourist/local gem experience]  
- Evening: [Dinner/entertainment/relaxing walk]

Continue this structure for all ${tripLength} days. Only stop once you have planned Day ${tripLength}.

Budget allocation:
- 55% accommodation (£${Math.round(budget * 0.55)})
- 30% activities (£${Math.round(budget * 0.30)})
- 15% food (£${Math.round(budget * 0.15)})

Always refer to the selected hotel for arrival and evening activities. Do not leave any day unplanned.
END OF LOOPED ITINERARY
`
  }

  // Main itinerary generation function
  const generateEnhancedItinerary = (tripDetails: any) => {
    // CRITICAL: Validate trip length first
    const validatedTripLength = tripDetails.duration || 7
    console.log(`🎯 SYSTEM PROMPT: Planning exactly ${validatedTripLength} days for ${tripDetails.destination}`)
    
    // Generate system instruction for forced iteration
    const systemPrompt = generateSystemPromptForPlanning(
      validatedTripLength, 
      tripDetails.destination, 
      tripDetails.budget
    )
    console.log('📝 System Prompt Generated:', systemPrompt.substring(0, 200) + '...')
    
    // Step 1: Setup state
    const tripState: TripPlanningState = {
      destination: tripDetails.destination,
      tripLength: validatedTripLength, // Use validated length
      budget: tripDetails.budget,
      people: tripDetails.travelers,
      travelMonth: tripDetails.dates?.month || 'Next month',
      accommodation: tripDetails.accommodationType || 'hotel',
      departureLocation: tripDetails.departureLocation || 'London',
      foodPreferences: tripDetails.preferences || [],
      activities: tripDetails.activities || ['sightseeing', 'culture', 'dining'],
      selectedHotel: null,
      budgetBreakdown: calculateBudgetAllocation(tripDetails.budget, validatedTripLength),
      itinerary: []
    }
    
    // Step 2: Calculate budget allocation with EXACT percentages
    const budgetBreakdown = calculateBudgetAllocation(tripState.budget, tripState.tripLength)
    console.log(`💰 Budget Breakdown: 55% Hotel (£${budgetBreakdown.accommodationBudget}), 30% Activities (£${budgetBreakdown.activityBudget}), 15% Food (£${budgetBreakdown.foodBudget})`)
    
    // Step 3: HOTEL-FIRST LOCKING STRATEGY
    // Lock hotel selection BEFORE any day planning begins
    console.log(`\n🏨 HOTEL-FIRST STRATEGY: Locking accommodation for ${tripState.destination}...`)
    console.log(`🔍 Searching: £${budgetBreakdown.pricePerNight}/night × ${tripState.tripLength} nights = £${budgetBreakdown.accommodationBudget} total`)
    
    const selectedHotel = findBestHotelForBudget(
      tripState.destination,
      budgetBreakdown.pricePerNight,
      tripState.people,
      tripState.tripLength
    )
    
    // CRITICAL: Hotel must be locked before planning any day
    if (!selectedHotel.name) {
      throw new Error(`Unable to find suitable hotel in ${tripState.destination} within £${budgetBreakdown.pricePerNight}/night budget`)
    }
    
    console.log(`🔒 HOTEL LOCKED: ${selectedHotel.name} - £${selectedHotel.pricePerNight}/night × ${tripState.tripLength} = £${selectedHotel.totalCost} total`)
    console.log(`📍 Location: ${selectedHotel.location}, Rating: ${selectedHotel.rating}⭐`)
    console.log(`🎯 This hotel will be referenced in ALL ${tripState.tripLength} days of planning`)
    
    // CLAUDE'S WORKFLOW STEP 4: Plan Each Day (already implemented above)
    const dayPlans = generateComprehensiveItinerary(tripState, selectedHotel, budgetBreakdown)
    
    // CLAUDE'S WORKFLOW STEP 5: Check Completeness - Confirm all days filled and plans reference hotel
    console.log('✅ Claude\'s Step-by-Step Workflow - Step 5: Check Completeness')
    const totalDaysPlanned = dayPlans.length
    const allDaysHaveActivities = dayPlans.every(day => day.activities.length > 0)
    const allActivitiesReferenceHotel = dayPlans.every(day => 
      day.activities.some(activity => 
        activity.description?.includes(selectedHotel.name) || 
        activity.distanceFromHotel !== undefined
      )
    )
    
    console.log(`   📊 Days planned: ${totalDaysPlanned}/${tripState.tripLength}`)
    console.log(`   🎯 All days have activities: ${allDaysHaveActivities ? '✅' : '❌'}`)
    console.log(`   🏨 Activities reference hotel: ${allActivitiesReferenceHotel ? '✅' : '❌'}`)
    
    if (totalDaysPlanned === tripState.tripLength && allDaysHaveActivities) {
      console.log('   ✅ Itinerary completeness check: PASSED')
    } else {
      console.log('   ⚠️ Itinerary completeness check: NEEDS ATTENTION')
    }
    
    // Create flight info for context
    const flightInfo = {
      airline: 'British Airways',
      flightNumber: 'BA 123',
      departure: `09:00 ${tripState.departureLocation}`,
      arrival: `13:00 ${tripState.destination}`,
      duration: '4h 0m',
      price: Math.round(tripState.budget * 0.15) // Rough estimate for flight cost
    }
    
    // Convert to legacy format for display
    const legacyItinerary = convertToLegacyItinerary(dayPlans, selectedHotel, flightInfo)
    setItinerary(legacyItinerary)
    
    // Calculate total trip cost and activity count
    const totalActivitiesCost = dayPlans.reduce((sum, day) => sum + day.totalCost, 0)
    const totalActivitiesCount = dayPlans.reduce((sum, day) => sum + day.activities.length, 0)
    const totalTripCost = selectedHotel.totalCost + totalActivitiesCost
    const budgetRemaining = tripState.budget - totalTripCost
    
    // CLAUDE'S WORKFLOW STEP 6: Deliver Final Output - Present comprehensive results
    console.log('🎯 Claude\'s Step-by-Step Workflow - Step 6: Deliver Final Output')
    console.log(`   📊 Trip Summary:`)
    console.log(`     🏨 Hotel: ${selectedHotel.name} - £${selectedHotel.totalCost}`)
    console.log(`     🎯 Activities: ${totalActivitiesCount} experiences - £${totalActivitiesCost}`)
    console.log(`     💰 Total Cost: £${totalTripCost} of £${tripState.budget} budget`)
    console.log(`     💵 Remaining: £${budgetRemaining}`)
    console.log(`   ✅ Complete ${tripState.tripLength}-day itinerary delivered!`)
    
    // Create summary in EXACT format from the prompt requirements
    const summary = `🎯 **Perfect! I've created your complete ${tripState.tripLength}-day ${tripState.destination} itinerary!**

**🏨 Hotel:** ${selectedHotel.name} — £${selectedHotel.pricePerNight}/night × ${tripState.tripLength} = £${selectedHotel.totalCost} total.
📍 Location: ${selectedHotel.distanceFromCenter}km from ${tripState.destination} center, ${selectedHotel.rating}★ rating.
🏨 Amenities: ${selectedHotel.amenities.join(', ')}.

${dayPlans.map(day => {
  if (day.day === 1) {
    return `**Day 1 (Arrival):** Hotel check-in, evening walk around ${tripState.destination}, dinner at ${day.activities.find(a => a.type === 'restaurant')?.name || 'local restaurant'}.`
  } else if (day.day === tripState.tripLength) {
    return `**Day ${day.day} (Departure):** ${day.activities.filter(a => a.cost > 0).map(a => a.name).join(', ')}, airport transfer.`
  } else {
    const morning = day.activities.find(a => a.timeSlot === 'morning')
    const afternoon = day.activities.find(a => a.timeSlot === 'afternoon')  
    const evening = day.activities.find(a => a.timeSlot === 'evening')
    
    return `**Day ${day.day}:** Morning ${morning?.name || 'exploration'}, afternoon ${afternoon?.name || 'activities'}, evening ${evening?.name || 'dining'}.`
  }
}).join('\n')}

**💰 Budget Summary:**
• Hotel: £${selectedHotel.totalCost} (${Math.round((selectedHotel.totalCost/tripState.budget)*100)}% of budget)
• Activities & Food: £${totalActivitiesCost} (${Math.round((totalActivitiesCost/tripState.budget)*100)}% of budget)
• **Total Cost: £${totalTripCost} of £${tripState.budget} budget**
${budgetRemaining > 0 ? `• **Remaining: £${budgetRemaining}** for shopping and extras!` : '• **Budget optimally utilized!**'}

All activities are within ${Math.max(...dayPlans.flatMap(d => d.activities.map(a => a.distanceFromHotel))).toFixed(1)}km of your hotel. Your ${tripState.tripLength}-day ${tripState.destination} adventure awaits! ✈️`

    // Prepare return data
    const itineraryResult = {
      hotel: selectedHotel,
      budgetBreakdown,
      dayPlans,
      totalCost: totalTripCost,
      remainingBudget: budgetRemaining,
      activitiesCount: totalActivitiesCount,
      summary
    }
    
    // Save to user account if logged in
    saveTripToAccount(tripDetails, itineraryResult)
    
    return itineraryResult
  }

  // CLAUDE'S NEW STEP-BY-STEP WORKFLOW as specified in requirements
  // Check for Required Info: If destination, duration, budget, and preferences are known → proceed
  const checkDataCompleteness = (details: any, questions: any): { isComplete: boolean, missingFields: string[] } => {
    const missingFields: string[] = []
    
    console.log('🔍 Claude\'s Step-by-Step Workflow - Step 1: Check for Required Info')
    
    // Core required fields from prompt specification
    if (!details.destination) {
      missingFields.push('destination (country + city)')
      console.log('  ❌ Missing: Destination')
    } else {
      console.log(`  ✅ Destination: ${details.destination}`)
    }
    
    if (!questions.duration || !details.duration || details.duration === 0) {
      missingFields.push('trip duration (number of days)')
      console.log('  ❌ Missing: Trip Duration')
      console.log('     User must specify: "5 days in Rome" or "3 nights in Paris"')
    } else {
      console.log(`  ✅ Duration: ${details.duration} days`)
      console.log(`     Claude will plan exactly ${details.duration} days (not 1-2 days)`)
      console.log(`     Loop iteration: Day 1 to Day ${details.duration}`)
    }
    
    if (!details.budget || details.budget === 0) {
      missingFields.push('budget (total)')
      console.log('  ❌ Missing: Budget')
    } else {
      console.log(`  ✅ Budget: £${details.budget}`)
    }
    
    if (!details.travelers || details.travelers === 0) {
      missingFields.push('number of travelers')
      console.log('  ❌ Missing: Number of travelers')
    } else {
      console.log(`  ✅ Travelers: ${details.travelers}`)
    }
    
    if (!details.accommodationType) {
      missingFields.push('preferred accommodation type (hotel, apartment, etc.)')
      console.log('  ❌ Missing: Accommodation preference')
    } else {
      console.log(`  ✅ Accommodation: ${details.accommodationType}`)
    }
    
    if (!details.preferences || details.preferences.length === 0) {
      missingFields.push('food preferences')
      console.log('  ❌ Missing: Food preferences')
    } else {
      console.log(`  ✅ Food preferences: ${details.preferences.join(', ')}`)
    }
    
    if (!details.activities || details.activities.length === 0) {
      missingFields.push('activity preferences (history, adventure, calm, nightlife, etc.)')
      console.log('  ❌ Missing: Activity preferences')
    } else {
      console.log(`  ✅ Activities: ${details.activities?.join(', ') || 'general'}`)
    }
    
    const isComplete = missingFields.length === 0
    console.log(`🎯 Required Info Check: ${isComplete ? 'COMPLETE ✅' : 'INCOMPLETE ❌'}`)
    
    if (!isComplete) {
      console.log(`📋 Still need: ${missingFields.join(', ')}`)
    }
    
    return { isComplete, missingFields }
  }

  // Function to create final confirmation summary
  const createConfirmationSummary = (details: any): string => {
    const travelersText = details.travelers === 1 ? '1 person' : `${details.travelers} people`
    
    return `Perfect! Here's what I have for your trip:

🎯 **Destination:** ${details.destination}
💰 **Budget:** £${details.budget?.toLocaleString() || '0'} 
👥 **Travelers:** ${travelersText}
✈️ **Departing from:** ${details.departureLocation || 'Not specified'}
🏨 **Accommodation:** ${details.accommodationType || 'Not specified'}
🎯 **Travel style:** ${details.travelStyle || 'Not specified'}
🍽️ **Preferences:** ${details.preferences?.join(', ') || 'General recommendations'}

Is this correct? If so, say "**create my itinerary**" and I'll build your perfect trip plan! 🚀

Or let me know if you'd like to change anything.`
  }

  const extractTripInformation = (message: string) => {
    // Add type safety check
    if (typeof message !== 'string') {
      console.error('❌ extractTripInformation received non-string:', typeof message, message)
      return { updates: {}, questionsUpdate: {} }
    }
    
    if (!message || message.trim() === '') {
      console.warn('⚠️ extractTripInformation received empty message')
      return { updates: {}, questionsUpdate: {} }
    }
    
    const lowerMessage = message.toLowerCase()
    let updates: Partial<TripDetails> = {}
    let questionsUpdate: Partial<PlanningQuestions> = {}

    // Extract departure location first
    const departurePatterns = [
      /(?:flying|departing|leaving|starting|from)\s+(?:from\s+)?([a-z\s]+?)(?:\s+(?:to|in|for|on|during|airport|,))/gi,
      /(?:from|departure)\s+([a-z\s]+?)(?:\s+(?:to|airport|,))/gi,
      /(?:based|located|living)\s+(?:in|at)\s+([a-z\s]+)/gi
    ]
    
    for (const pattern of departurePatterns) {
      const match = pattern.exec(lowerMessage)
      if (match) {
        const location = match[1].trim()
        if (location.length > 2 && location.length < 30) {
          updates.departureLocation = location.charAt(0).toUpperCase() + location.slice(1)
          questionsUpdate.departureLocation = true
          break
        }
      }
    }

    // Extract accommodation preferences
    const accommodationPatterns = [
      /(?:stay|accommodation|hotel)(?:ing)?\s+(?:in|at)\s+(hotel|hostel|apartment|villa|resort|boutique|luxury|budget)/gi,
      /(hotel|hostel|apartment|villa|resort|boutique|luxury|budget)\s+(?:accommodation|stay)/gi,
      /prefer\s+(hotel|hostel|apartment|villa|resort|boutique|luxury|budget)/gi
    ]
    
    for (const pattern of accommodationPatterns) {
      const match = pattern.exec(lowerMessage)
      if (match) {
        updates.accommodationType = match[1].charAt(0).toUpperCase() + match[1].slice(1)
        questionsUpdate.accommodationType = true
        break
      }
    }

    // Extract travel style
    const travelStylePatterns = [
      /(luxury|budget|mid-range|backpacking|adventure|cultural|relaxing|romantic|family|business)\s+(?:trip|travel|holiday|vacation)/gi,
      /(?:trip|travel|holiday|vacation)\s+style.*?(luxury|budget|mid-range|backpacking|adventure|cultural|relaxing|romantic|family|business)/gi,
      /(?:prefer|want|looking for)\s+(?:a\s+)?(luxury|budget|mid-range|backpacking|adventure|cultural|relaxing|romantic|family|business)/gi
    ]
    
    for (const pattern of travelStylePatterns) {
      const match = pattern.exec(lowerMessage)
      if (match) {
        updates.travelStyle = match[1].charAt(0).toUpperCase() + match[1].slice(1)
        questionsUpdate.travelStyle = true
        break
      }
    }

    // Extract dates
    const datePatterns = [
      /(?:in|during|from)\s+(january|february|march|april|may|june|july|august|september|october|november|december)/gi,
      /(?:in|during)\s+(summer|winter|spring|autumn|fall)/gi,
      /(?:from|starting)\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi,
      /(?:from|starting)\s+(\d{1,2}(?:st|nd|rd|th)?\s+(?:january|february|march|april|may|june|july|august|september|october|november|december))/gi
    ]
    
    for (const pattern of datePatterns) {
      const match = pattern.exec(lowerMessage)
      if (match) {
        // For now, just mark that dates were mentioned
        questionsUpdate.dates = true
        
        // Set approximate dates based on current date
        const now = new Date()
        updates.startDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days from now
        break
      }
    }

    // Extract destination
    const destinations = [
      'italy', 'rome', 'venice', 'florence', 'milan', 'naples',
      'japan', 'tokyo', 'kyoto', 'osaka', 'hiroshima',
      'france', 'paris', 'lyon', 'nice', 'marseille',
      'spain', 'madrid', 'barcelona', 'seville', 'valencia',
      'greece', 'athens', 'santorini', 'mykonos', 'crete',
      'thailand', 'bangkok', 'phuket', 'chiang mai',
      'usa', 'new york', 'los angeles', 'chicago', 'miami',
      'uk', 'london', 'edinburgh', 'manchester',
      'germany', 'berlin', 'munich', 'hamburg'
    ]
    
    for (const dest of destinations) {
      if (lowerMessage.includes(dest)) {
        if (dest === 'rome' || dest === 'venice' || dest === 'florence' || dest === 'milan' || dest === 'naples') {
          updates.destination = 'Italy'
        } else if (dest === 'tokyo' || dest === 'kyoto' || dest === 'osaka' || dest === 'hiroshima') {
          updates.destination = 'Japan'
        } else if (dest === 'paris' || dest === 'lyon' || dest === 'nice' || dest === 'marseille') {
          updates.destination = 'France'
        } else if (dest === 'bangkok' || dest === 'phuket' || dest === 'chiang mai') {
          updates.destination = 'Thailand'
        } else {
          updates.destination = dest.charAt(0).toUpperCase() + dest.slice(1)
        }
        questionsUpdate.destination = true
        break
      }
    }

    // Extract number of travelers first (needed for budget calculation)
    let extractedTravelers = 1
    
    // Check for solo traveler indicators first
    if (lowerMessage.includes('just me') || lowerMessage.includes('solo') || lowerMessage.includes('myself') || 
        lowerMessage.match(/\b1\s*,?\s*me\b/) || lowerMessage.match(/\bme\s*,?\s*1\b/) ||
        lowerMessage.match(/^\s*1\s*,?\s*$/) || lowerMessage.match(/^\s*,?\s*1\s*$/) ||
        lowerMessage.match(/\bone\s+person\b/) || lowerMessage.match(/^\s*me\s*$/i)) {
      extractedTravelers = 1
      updates.travelers = 1
      questionsUpdate.travelers = true
    } else {
      // Look for specific numbers
      const travelersPatterns = [
        /(\d+)\s*(?:people|person|persons|travelers?|travellers?|adults?|guests?)/gi,
        /for\s+(\d+)/gi,
        /(?:group\s+of\s+|party\s+of\s+)(\d+)/gi,
        /^(\d+)(?:\s|,|$)/g // Match numbers at start of message like "2 people"
      ]
      
      for (const pattern of travelersPatterns) {
        const match = pattern.exec(lowerMessage)
        if (match) {
          const num = parseInt(match[1])
          if (num > 0 && num <= 20) {
            extractedTravelers = num
            updates.travelers = num
            questionsUpdate.travelers = true
            break
          }
        }
      }
    }

    // Enhanced budget extraction - handles "£2000 each", "£10000 total", etc.
    const budgetPatterns = [
      // Pattern for "£2000 each" or "£2000 per person"
      /(?:£|€|\$)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:each|per\s+person|per\s+traveler|per\s+guest)/gi,
      // Pattern for "each with a budget of £2000"
      /each\s+with\s+a\s+(?:budget|budge)\s+of\s+(?:£|€|\$)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/gi,
      // Pattern for total budget
      /(?:total\s+)?(?:budget|budge)(?:\s+of)?\s+(?:£|€|\$)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/gi,
      // Simple currency pattern - just £ followed by numbers
      /£(\d+)/gi,
      // General currency pattern (matches €5000, $3000, etc.)
      /(?:€|\$)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/gi
    ]
    
    for (let i = 0; i < budgetPatterns.length; i++) {
      const pattern = budgetPatterns[i]
      const match = pattern.exec(lowerMessage)
      if (match) {
        const budgetText = match[1].replace(/,/g, '')
        let budgetAmount = parseInt(budgetText)
        
        // If it's "per person" or "each", multiply by number of travelers
        if (i === 0 || i === 1) { // "each" or "per person" patterns
          budgetAmount = budgetAmount * extractedTravelers
        }
        
        updates.budget = budgetAmount
        questionsUpdate.budget = true
        break
      }
    }


    // Extract duration
    // EXPLICIT TRIP LENGTH PARSING AND VALIDATION
    console.log(`\n🔍 PARSING TRIP LENGTH from: "${userMessage}"`)
    
    const durationPatterns = [
      /(\d+)\s*day\s*(?:round\s+)?(?:holiday|holliday|vacation|trip)/gi,
      /(\d+)\s*days?\s*(?:round\s+)?(?:trip|holiday|holliday|vacation)/gi,
      /(\d+)\s*days?(?:\s+(?:holiday|holliday|vacation|trip|round\s+trip))?/gi,
      /(\d+)\s*weeks?(?:\s+(?:holiday|holliday|vacation|trip|round\s+trip))?/gi,
      /(\d+)\s*nights?(?:\s+(?:holiday|holliday|vacation|trip|round\s+trip))?/gi,
      /(\d+)\s*(?:d|days?)\s+(?:in|to|trip|vacation)/gi,
      /(?:^|\s)(\d+)(?:\s|$)(?=.*(?:day|days|night|nights))/gi
    ]
    
    for (const pattern of durationPatterns) {
      const match = pattern.exec(lowerMessage)
      if (match) {
        const num = parseInt(match[1])
        let days = num
        
        if (pattern.source.includes('week')) {
          days = num * 7
        } else if (pattern.source.includes('night')) {
          days = num // nights = days for trip duration
        }
        
        const startDate = new Date()
        startDate.setDate(startDate.getDate() + 7) // Start next week
        const endDate = new Date(startDate)
        endDate.setDate(endDate.getDate() + days)
        
        updates.startDate = startDate.toISOString().split('T')[0]
        updates.endDate = endDate.toISOString().split('T')[0]
        updates.duration = days // CRITICAL: Store the duration in days!
        questionsUpdate.duration = true
        
        console.log(`🎯 TRIP LENGTH LOCKED: ${days} days (from "${match[0]}")`)
        console.log(`  → Start: ${updates.startDate}`)
        console.log(`  → End: ${updates.endDate}`)
        console.log(`  → Claude will loop exactly ${days} times for complete planning`)
        console.log(`  → No stopping at Day 2 - complete ${days}-day itinerary required`)
        break
      }
    }


    // Extract accommodation preferences
    const accommodationTypes = ['luxury', '5 star', 'budget', 'mid-range', 'boutique', 'resort', 'hotel', 'hostel', 'apartment']
    for (const type of accommodationTypes) {
      if (lowerMessage.includes(type)) {
        updates.accommodationType = type
        questionsUpdate.accommodationType = true
        break
      }
    }

    // Extract travel style
    const travelStyles = ['adventure', 'relaxation', 'cultural', 'romantic', 'family', 'business', 'solo', 'backpacking', 'luxury']
    for (const style of travelStyles) {
      if (lowerMessage.includes(style)) {
        updates.travelStyle = style
        questionsUpdate.travelStyle = true
        break
      }
    }

    return { updates, questionsUpdate }
  }

  const getNextQuestion = (currentAnswered = questionsAnswered): string | null => {
    const questions = [
      {
        key: 'destination' as keyof PlanningQuestions,
        question: "Where would you like to go? 🌍 (e.g., Italy, Japan, France, Spain, etc.)"
      },
      {
        key: 'budget' as keyof PlanningQuestions,
        question: "What's your total budget for this trip? 💰 (Please include currency, e.g., £3000, $4000, €3500)"
      },
      {
        key: 'duration' as keyof PlanningQuestions,
        question: "How long would you like your trip to be? ⏰ (e.g., 7 days, 2 weeks, 10 days)"
      },
      {
        key: 'travelers' as keyof PlanningQuestions,
        question: "How many people will be traveling? 👥 (e.g., 2 adults, 4 people, just me)"
      },
      {
        key: 'departureLocation' as keyof PlanningQuestions,
        question: "Where will you be flying from? ✈️ (e.g., London, New York, Paris)"
      },
      {
        key: 'accommodationType' as keyof PlanningQuestions,
        question: "What type of accommodation do you prefer? 🏨 (luxury/5-star, mid-range/4-star, budget/3-star, boutique hotels)"
      },
      {
        key: 'travelStyle' as keyof PlanningQuestions,
        question: "What's your travel style? 🎯 (adventure, relaxation, cultural, romantic, family-friendly, business)"
      }
    ]

    for (const q of questions) {
      if (!currentAnswered[q.key]) {
        return q.question
      }
    }
    return null
  }

  const getDetailedPreferenceQuestions = (destination: string): string[] => {
    const baseQuestions = [
      `What kind of activities interest you most in ${destination}?`,
      `Are you more interested in popular tourist attractions or hidden local gems?`,
      `What type of cuisine experiences are you looking for?`,
      `Do you prefer a fast-paced itinerary or a more relaxed pace?`,
      `Any specific interests? (history, art, nature, adventure sports, wellness, shopping, nightlife)`
    ]

    // Add destination-specific questions
    const destinationQuestions: Record<string, string[]> = {
      'Italy': [
        'Which regions of Italy appeal to you most? (Rome/Vatican, Tuscany, Venice, Amalfi Coast, etc.)',
        'Are you interested in art museums, ancient ruins, or Renaissance architecture?',
        'Would you like wine tastings or cooking classes?',
        'Do you want to see famous landmarks or explore charming small towns?'
      ],
      'Japan': [
        'Are you interested in traditional culture (temples, gardens) or modern Japan (Tokyo, technology)?',
        'Would you like to experience a ryokan (traditional inn) or modern hotels?',
        'Any interest in specific experiences? (sushi making, tea ceremony, cherry blossoms, hot springs)',
        'Do you want to visit multiple cities or focus on one area?'
      ],
      'France': [
        'Are you most interested in Paris, the countryside, or both?',
        'Would you like wine regions, historic castles, or coastal areas?',
        'Any interest in art museums, fashion, or culinary experiences?',
        'Do you prefer bustling cities or charming villages?'
      ],
      'Thailand': [
        'Are you looking for beaches, cultural sites, or bustling cities?',
        'Would you like island hopping or staying on the mainland?',
        'Any interest in wellness activities like spas or yoga retreats?',
        'Do you want street food tours or fine dining experiences?'
      ],
      'Spain': [
        'Which regions interest you? (Madrid, Barcelona, Andalusia, Basque Country)',
        'Are you interested in art (Prado, Guggenheim), architecture (Gaudi), or flamenco culture?',
        'Would you like beach time or prefer inland cultural experiences?',
        'Any interest in food tours or cooking classes?'
      ]
    }

    return [...baseQuestions, ...(destinationQuestions[destination] || [])]
  }

  const extractPreferences = (message: string, destination: string): string[] => {
    const lowerMessage = message.toLowerCase()
    const preferences: string[] = []

    // Activity preferences
    const activityKeywords = {
      'sightseeing': ['sightseeing', 'sight seeing', 'tourist', 'attractions', 'landmarks', 'monuments', 'visiting'],
      'history': ['history', 'historical', 'ancient', 'ruins', 'museums', 'heritage', 'colosseum', 'forum'],
      'art': ['art', 'museums', 'galleries', 'renaissance', 'paintings', 'sculpture', 'vatican'],
      'food': ['food', 'cuisine', 'cooking', 'restaurants', 'dining', 'culinary', 'wine', 'tasting'],
      'nature': ['nature', 'outdoors', 'hiking', 'beaches', 'mountains', 'parks', 'gardens'],
      'adventure': ['adventure', 'sports', 'hiking', 'diving', 'skiing', 'climbing', 'cycling'],
      'wellness': ['wellness', 'spa', 'relaxation', 'yoga', 'meditation', 'health', 'rejuvenation'],
      'culture': ['culture', 'traditional', 'local', 'authentic', 'temples', 'festivals', 'customs'],
      'shopping': ['shopping', 'markets', 'boutiques', 'souvenirs', 'crafts', 'fashion'],
      'nightlife': ['nightlife', 'bars', 'clubs', 'entertainment', 'music', 'shows'],
      'architecture': ['architecture', 'buildings', 'monuments', 'churches', 'castles', 'palaces'],
      'photography': ['photography', 'photos', 'scenic', 'views', 'instagram']
    }

    // Check for activity preferences
    for (const [category, keywords] of Object.entries(activityKeywords)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        preferences.push(category)
      }
    }

    // Pace preferences
    if (lowerMessage.includes('relaxed') || lowerMessage.includes('slow') || lowerMessage.includes('leisurely')) {
      preferences.push('relaxed-pace')
    } else if (lowerMessage.includes('fast') || lowerMessage.includes('packed') || lowerMessage.includes('busy')) {
      preferences.push('fast-pace')
    }

    // Tourism style
    if (lowerMessage.includes('tourist') || lowerMessage.includes('famous') || lowerMessage.includes('popular')) {
      preferences.push('popular-attractions')
    } else if (lowerMessage.includes('local') || lowerMessage.includes('hidden') || lowerMessage.includes('authentic') || lowerMessage.includes('off-beaten')) {
      preferences.push('local-experiences')
    }

    // Destination-specific preferences
    if (destination === 'Italy') {
      if (lowerMessage.includes('rome') || lowerMessage.includes('vatican')) preferences.push('rome-vatican')
      if (lowerMessage.includes('tuscany') || lowerMessage.includes('florence')) preferences.push('tuscany')
      if (lowerMessage.includes('venice')) preferences.push('venice')
      if (lowerMessage.includes('amalfi') || lowerMessage.includes('coast')) preferences.push('amalfi-coast')
    } else if (destination === 'Japan') {
      if (lowerMessage.includes('traditional') || lowerMessage.includes('temple')) preferences.push('traditional-culture')
      if (lowerMessage.includes('modern') || lowerMessage.includes('tokyo') || lowerMessage.includes('technology')) preferences.push('modern-japan')
      if (lowerMessage.includes('ryokan')) preferences.push('ryokan-experience')
      if (lowerMessage.includes('onsen') || lowerMessage.includes('hot spring')) preferences.push('hot-springs')
    } else if (destination === 'Thailand') {
      if (lowerMessage.includes('beach') || lowerMessage.includes('island')) preferences.push('beaches-islands')
      if (lowerMessage.includes('temple') || lowerMessage.includes('cultural')) preferences.push('cultural-sites')
      if (lowerMessage.includes('street food')) preferences.push('street-food')
      if (lowerMessage.includes('spa') || lowerMessage.includes('wellness')) preferences.push('wellness-activities')
    }

    return preferences
  }

  const [currentPreferenceQuestions, setCurrentPreferenceQuestions] = useState<string[]>([])
  const [preferencesGathered, setPreferencesGathered] = useState(false)
  const [preferencesStarted, setPreferencesStarted] = useState(false) // Prevent loop

  const generateAIResponse = async (userMessage: string): Promise<string> => {
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
      
      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      console.log('✅ AI response generated successfully')
      
      const lowerMessage = userMessage.toLowerCase()
      
      // Simple responses based on user input
      if (lowerMessage.includes('italy') || lowerMessage.includes('rome') || lowerMessage.includes('florence')) {
        return "Italy is a fantastic choice! I can help you plan an amazing Italian adventure. Could you tell me more details like:\n\n• How many days are you planning to stay?\n• What's your budget?\n• How many travelers?\n• Any specific cities you want to visit?\n\nI'll create a personalized itinerary for you!"
      }
      
      if (lowerMessage.includes('japan') || lowerMessage.includes('tokyo') || lowerMessage.includes('kyoto')) {
        return "Japan is incredible! I'd love to help you plan your Japanese adventure. To create the perfect itinerary, I'll need:\n\n• Duration of your trip\n• Your budget\n• Number of travelers\n• Any specific interests (culture, food, nature, etc.)\n\nTell me more about what you're looking for!"
      }
      
      if (lowerMessage.includes('france') || lowerMessage.includes('paris')) {
        return "Magnifique! France offers so much to explore. To plan your perfect French getaway, please share:\n\n• How long is your trip?\n• What's your budget?\n• How many people are traveling?\n• Interested in Paris, countryside, or both?\n\nI'll craft a wonderful itinerary for you!"
      }
      
      if (lowerMessage.includes('budget') && lowerMessage.match(/\d+/)) {
        const budget = lowerMessage.match(/\d+/)[0]
        return `Great! I see you're working with a budget of ${budget}. That gives me a good starting point. Now I need to know:\n\n• Where would you like to go?\n• How many days?\n• How many travelers?\n\nWith this information, I can create a detailed itinerary that fits your budget perfectly!`
      }
      
      if (lowerMessage.includes('days') || lowerMessage.includes('week')) {
        return "Perfect! Duration is important for planning. Now I need a few more details:\n\n• What's your destination?\n• What's your budget?\n• How many people are traveling?\n\nOnce I have these details, I can create an amazing itinerary for your trip!"
      }
      
      // Default helpful response
      return "Hi there! I'm your AI travel assistant. I can help you plan amazing trips around the world!\n\nTo get started, just tell me:\n• Where would you like to go?\n• How many days?\n• What's your budget?\n• How many travelers?\n\nFor example, you could say: 'I want to go to Italy for 7 days with £3000 budget for 2 people'\n\nWhat adventure are you planning? 🌟"
    } catch (error) {
      console.error('🚨 Error in generateAIResponse:', error)
      return "I'm sorry, I encountered an error processing your message. Please try again, or let me know what you'd like to plan for your trip!"
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
    if (isComplete && !itinerary.length) {
      return createConfirmationSummary(updatedTripDetails)
    }

    // If they just mentioned a destination for the first time, get detailed preference questions
    if (updates.destination && !preferencesStarted && !preferencesGathered && currentPreferenceQuestions.length === 0) {
      const detailedQuestions = getDetailedPreferenceQuestions(updates.destination)
      setCurrentPreferenceQuestions(detailedQuestions)
      setPreferencesStarted(true) // Mark as started to prevent loop
      
      console.log('🎯 Starting preference gathering for:', updates.destination)
      
      return `${updates.destination} is a fantastic choice! 🎉 To create the perfect itinerary for you, I'd love to learn more about your preferences. 

${detailedQuestions[0]}

Please tell me what interests you most, and I'll ask a few more questions to personalize your trip perfectly!`
    }

    // If we're in the middle of gathering preferences
    if (currentPreferenceQuestions.length > 0 && !preferencesGathered) {
      // Extract preferences from their response
      const newPreferences = extractPreferences(userMessage, updatedTripDetails.destination)
      
      // Update both preferences and activities
      setTripDetails(prev => ({
        ...prev,
        preferences: [...prev.preferences, ...newPreferences],
        activities: [...(prev.activities || []), ...newPreferences], // Safe fallback for activities
        specialRequests: [...prev.specialRequests, userMessage]
      }))

      console.log('New preferences extracted:', newPreferences)
      console.log('Current preference questions remaining:', currentPreferenceQuestions.length)

      // Ask the next preference question or move to essential details
      if (currentPreferenceQuestions.length > 1) {
        const nextPreferenceQuestion = currentPreferenceQuestions[1]
        setCurrentPreferenceQuestions(prev => prev.slice(1))
        
        return `Great insights! I see you're interested in ${newPreferences.join(', ')}. That helps me understand what you're looking for. 

${nextPreferenceQuestion}`
      } else {
        // Done with preference questions, move to essential planning details
        setPreferencesGathered(true)
        setCurrentPreferenceQuestions([])
        
        // Mark activities as gathered since we have preferences
        setQuestionsAnswered(prev => ({
          ...prev,
          activities: true
        }))
        
        const nextQuestion = getNextQuestion({...updatedQuestionsAnswered, activities: true})
        if (nextQuestion) {
          return `Perfect! I have a good understanding of your interests in ${updatedTripDetails.destination}. You're interested in ${newPreferences.join(', ')} - excellent choices! 

Now let me get the essential planning details:

${nextQuestion}`
        } else {
          // If no more questions, check completeness
          const { isComplete, missingFields } = checkDataCompleteness(updatedTripDetails, {...updatedQuestionsAnswered, activities: true})
          if (isComplete) {
            return createConfirmationSummary(updatedTripDetails)
          } else {
            return `Great! I have your preferences. Now I just need: ${missingFields.join(', ')}. Can you provide these details?`
          }
        }
      }
    }

    // Check if we have enough information to create an itinerary (use updated state)
    const hasMinimumInfo = updatedQuestionsAnswered.destination && updatedQuestionsAnswered.budget && updatedQuestionsAnswered.duration && updatedQuestionsAnswered.travelers

    // If we don't have minimum info, ask the next question
    if (!hasMinimumInfo) {
      const nextQuestion = getNextQuestion(updatedQuestionsAnswered)
      if (nextQuestion) {
        // Acknowledge what they told us and ask the next question
        let acknowledgment = ""
        if (Object.keys(updates).length > 0) {
          acknowledgment = "Perfect! I've captured all that information. "
          const details = []
          if (updates.destination) details.push(`${updates.destination} - excellent choice!`)
          if (updates.budget) details.push(`Budget: £${updates.budget.toLocaleString()}`)
          if (updates.travelers) details.push(`${updates.travelers} ${updates.travelers === 1 ? 'traveler' : 'travelers'}`)
          if (updates.departureLocation) details.push(`Departing from: ${updates.departureLocation}`)
          if (updates.accommodationType) details.push(`Accommodation: ${updates.accommodationType}`)
          if (updates.travelStyle) details.push(`Style: ${updates.travelStyle}`)
          if (updates.startDate || questionsUpdate.dates) details.push(`Dates noted`)
          
          if (details.length > 0) {
            acknowledgment += details.join(', ') + ". "
          }
        }
        return acknowledgment + nextQuestion
      }
    }

    // We have minimum info - check if they want to create the itinerary or add more details
    if (hasMinimumInfo && !itinerary.length) {
      // Check if they're ready to generate or want to add more details
      if (lowerMessage.includes('create') || lowerMessage.includes('generate') || lowerMessage.includes('plan') || 
          lowerMessage.includes('make') || lowerMessage.includes('yes') || lowerMessage.includes('go ahead')) {
        
        // Generate the itinerary
        const tripData = { ...tripDetails, ...updates }
        const duration = Math.ceil((new Date(tripData.endDate).getTime() - new Date(tripData.startDate).getTime()) / (1000 * 3600 * 24))
        
        // Find best hotels based on budget
        const budgetInfo = getBudgetRecommendation(tripData.budget, duration)
        const bestHotels = findBestHotels(tripData.destination, tripData.budget, duration, 5)
        
        generateSmartItinerary(tripData.destination, tripData.budget, duration, bestHotels)
        
        return `Perfect! I've created your ${duration}-day ${tripData.destination} itinerary for ${tripData.travelers} ${tripData.travelers === 1 ? 'traveler' : 'travelers'} with a budget of £${tripData.budget.toLocaleString()}! 🎉

I've allocated £${Math.round(budgetInfo.accommodationBudget).toLocaleString()} (45%) for ${budgetInfo.recommendation}, and found ${bestHotels.length} excellent hotel options that match your preferences. Your itinerary includes flights, accommodation, activities, and dining recommendations.

Check out your personalized trip plan on the right! You can see all the details, costs, and even health tips for each activity. Would you like me to adjust anything or add specific experiences?`
      } else {
        // Ask if they want to add more details or proceed
        const remainingQuestions = [
          !questionsAnswered.departureLocation && "departure location",
          !questionsAnswered.accommodationType && "accommodation preferences", 
          !questionsAnswered.travelStyle && "travel style"
        ].filter(Boolean)

        if (remainingQuestions.length > 0) {
          return `Excellent! I have the essential details for your ${tripDetails.destination} trip. I can create your itinerary now, or would you like to specify additional preferences like ${remainingQuestions.join(', ')}? 

Just say "create my itinerary" when you're ready, or let me know about any other preferences you have! ✈️`
        } else {
          return `Perfect! I have all the details I need for your amazing ${tripDetails.destination} adventure. Would you like me to create your personalized itinerary now? Just say "yes" or "create my itinerary" and I'll get started! 🎯`
        }
      }
    }
    
    if (lowerMessage.includes('japan') || lowerMessage.includes('tokyo') || lowerMessage.includes('kyoto') || lowerMessage.includes('osaka')) {
      // Note: State updates moved to handleSendMessage
      return "Excellent choice! I've designed an incredible 10-day Japan adventure covering Tokyo, Kyoto, and Osaka. Your itinerary includes traditional ryokans, bullet train travel, cultural experiences, and authentic cuisine. Take a look at your personalized plan! Should I add more wellness activities like onsen visits?"
    }
    
    if (lowerMessage.includes('france') || lowerMessage.includes('paris') || lowerMessage.includes('french')) {
      // Note: State updates moved to handleSendMessage
      return "Magnifique! I've crafted a delightful 7-day French getaway featuring Paris and the Loire Valley. Your trip includes charming boutique hotels, wine tastings, museum visits, and gourmet dining experiences. Your itinerary is ready on the right! Any adjustments you'd like me to make?"
    }
    
    // Handle existing itinerary modifications
    if (itinerary.length > 0) {
      if (lowerMessage.includes('cheaper') || lowerMessage.includes('budget')) {
        // Update existing itinerary with budget options
        const updatedItinerary = itinerary.map(day => ({
          ...day,
          activities: day.activities.map(activity => ({
            ...activity,
            price: Math.round(activity.price * 0.7) // 30% reduction
          })),
          hotel: day.hotel ? {
            ...day.hotel,
            pricePerNight: Math.round(day.hotel.pricePerNight * 0.7),
            rating: Math.max(3, day.hotel.rating - 1)
          } : undefined,
          flight: day.flight ? {
            ...day.flight,
            price: Math.round(day.flight.price * 0.8)
          } : undefined
        }))
        // Note: State updates moved to handleSendMessage
        return "Great! I've updated your itinerary with budget-friendly alternatives. I've reduced accommodation costs by 30% with highly-rated 3-star hotels and found cheaper flight options. Check out the updated prices in your itinerary!"
      }
      
      if (lowerMessage.includes('wellness') || lowerMessage.includes('health') || lowerMessage.includes('relaxation') || lowerMessage.includes('spa')) {
        // Add wellness activities
        const updatedItinerary = itinerary.map(day => ({
          ...day,
          activities: [
            ...day.activities,
            {
              id: `wellness-${day.id}`,
              name: 'Wellness Session',
              type: 'wellness' as const,
              time: '18:00',
              duration: 90,
              location: 'Hotel Spa',
              description: 'Relaxing spa treatment or yoga session',
              price: 80,
              healthTip: 'Perfect for unwinding after a day of exploration!'
            }
          ]
        }))
        setItinerary(updatedItinerary)
        return "Perfect! I've added wellness-focused activities to your itinerary including spa treatments, yoga sessions, and relaxation time. I've also scheduled these activities based on optimal energy levels throughout your day. Check out your updated wellness-focused itinerary!"
      }
      
      if (lowerMessage.includes('food') || lowerMessage.includes('restaurant') || lowerMessage.includes('dining') || lowerMessage.includes('eat')) {
        // Add more restaurant activities
        const updatedItinerary = itinerary.map(day => ({
          ...day,
          activities: [
            ...day.activities,
            {
              id: `dining-${day.id}`,
              name: 'Local Culinary Experience',
              type: 'restaurant' as const,
              time: '19:30',
              duration: 120,
              location: 'City Center',
              description: 'Authentic local cuisine at a highly-rated restaurant',
              price: 65,
              healthTip: 'Try the local specialties for a true cultural experience!'
            }
          ]
        }))
        setItinerary(updatedItinerary)
        return "Delicious! I've added some fantastic local dining experiences to your itinerary. You'll get to taste authentic cuisine at highly-rated restaurants that showcase the best of local flavors. Bon appétit!"
      }
      
      if (lowerMessage.includes('show') || lowerMessage.includes('see') || lowerMessage.includes('what') || lowerMessage.includes('itinerary') || lowerMessage.includes('plan')) {
        return `Here's your current ${tripDetails.destination} itinerary! You have a ${itinerary.length}-day trip with ${itinerary.reduce((total, day) => total + day.activities.length, 0)} activities planned. The total estimated cost is £${itinerary.reduce((total, day) => {
          const dayTotal = day.activities.reduce((sum, act) => sum + act.price, 0) + (day.flight?.price || 0) + (day.hotel?.pricePerNight || 0)
          return total + dayTotal
        }, 0).toLocaleString()}. You can see all the details in the itinerary panel on the right. What would you like to modify?`
      }
      
      return "I understand you'd like to modify your trip. Let me update your itinerary based on your preferences. What specific changes would you like me to make? I can adjust the budget, add wellness activities, include more dining experiences, or help with any other preferences you have."
    }
    
    // Handle general travel planning requests
    if (lowerMessage.includes('travel') || lowerMessage.includes('trip') || lowerMessage.includes('vacation') || lowerMessage.includes('holiday')) {
      return "I'd love to help you plan an amazing trip! Where would you like to go? I can create detailed itineraries for destinations like Italy, Japan, France, Spain, Greece, Thailand, and many more. Just tell me your destination and any preferences you have!"
    }
    
    // Default response for first-time users
    return "Hello! I'm your AI travel assistant. I can help you plan incredible trips to destinations around the world. Just tell me where you'd like to go (like Italy, Japan, France, etc.) and I'll create a personalized itinerary for you with flights, hotels, activities, and dining recommendations. Where shall we start your adventure?"
    
    } catch (error) {
      console.error('🚨 Error in generateAIResponse:', error)
      console.error('Error details:', error instanceof Error ? error.message : 'Unknown error')
      throw new Error(`AI Response Generation Failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const generateSmartItinerary = (destination: string, budget: number, nights: number, bestHotels: any[]) => {
    if (destination === 'Italy') {
      // Create 7-day Italy itinerary with budget-optimized hotels
      const rome1Hotel = bestHotels.find(h => h.location.includes('Rome')) || bestHotels[0]
      const rome2Hotel = bestHotels.find(h => h.location.includes('Rome') && h.id !== rome1Hotel?.id) || rome1Hotel
      const florenceHotel = bestHotels.find(h => h.location.includes('Florence')) || bestHotels[1] || rome1Hotel
      const veniceHotel = bestHotels.find(h => h.location.includes('Venice')) || bestHotels[2] || rome1Hotel

      const smartItinerary: ItineraryDay[] = [
        {
          id: 'day-1',
          date: '2024-07-15',
          flight: {
            airline: 'British Airways',
            flightNumber: 'BA 2551',
            departure: '09:25 LHR',
            arrival: '13:45 FCO',
            duration: '2h 50m',
            price: Math.round(budget * 0.15) // 15% of budget for flights
          },
          hotel: rome1Hotel ? {
            name: rome1Hotel.name,
            rating: rome1Hotel.rating,
            location: rome1Hotel.location,
            amenities: rome1Hotel.amenities,
            pricePerNight: rome1Hotel.pricePerNight
          } : {
            name: 'Hotel Artemide',
            rating: 4,
            location: 'Near Termini Station',
            amenities: ['WiFi', 'Gym', 'Spa', 'Restaurant'],
            pricePerNight: 180
          },
          activities: [
            {
              id: 'act-1',
              name: 'Colosseum Skip-the-Line Tour',
              type: 'sightseeing',
              time: '15:30',
              duration: 180,
              location: 'Colosseum',
              description: 'Explore ancient Rome with expert guide',
              price: Math.round(budget * 0.012), // ~1.2% of budget
              healthTip: 'Wear comfortable walking shoes - lots of steps!'
            }
          ]
        },
        {
          id: 'day-2',
          date: '2024-07-16',
          activities: [
            {
              id: 'act-2',
              name: 'Vatican Museums & Sistine Chapel',
              type: 'sightseeing',
              time: '09:00',
              duration: 240,
              location: 'Vatican City',
              description: 'World-class art and Michelangelo masterpieces',
              price: Math.round(budget * 0.015),
              healthTip: 'Stay hydrated - lots of walking in warm museums'
            },
            {
              id: 'act-3',
              name: 'Lunch at Da Enzo al 29',
              type: 'restaurant',
              time: '13:30',
              duration: 90,
              location: 'Trastevere',
              description: 'Authentic Roman cuisine in charming neighborhood',
              price: Math.round(budget * 0.008),
              healthTip: 'Try the fresh seafood for omega-3s'
            },
            {
              id: 'act-4',
              name: 'Evening Stroll at Trevi Fountain',
              type: 'sightseeing',
              time: '19:00',
              duration: 60,
              location: 'Trevi Fountain',
              description: 'Make a wish at Rome\'s most famous fountain',
              price: 0,
              healthTip: 'Evening walks aid digestion after dinner'
            }
          ]
        },
        {
          id: 'day-3',
          date: '2024-07-17',
          activities: [
            {
              id: 'act-5',
              name: 'Roman Forum & Palatine Hill',
              type: 'sightseeing',
              time: '09:00',
              duration: 180,
              location: 'Roman Forum',
              description: 'Explore the heart of ancient Roman civilization',
              price: Math.round(budget * 0.01),
              healthTip: 'Bring sun protection - limited shade available'
            },
            {
              id: 'act-6',
              name: 'Aperitivo in Campo de\' Fiori',
              type: 'restaurant',
              time: '18:00',
              duration: 120,
              location: 'Campo de\' Fiori',
              description: 'Traditional Italian aperitivo with local wines',
              price: Math.round(budget * 0.007),
              healthTip: 'Light snacks before dinner help with portion control'
            }
          ]
        },
        {
          id: 'day-4',
          date: '2024-07-18',
          flight: {
            airline: 'Trenitalia',
            flightNumber: 'FR 9505',
            departure: '08:30 Roma Termini',
            arrival: '10:15 Firenze SMN',
            duration: '1h 45m',
            price: Math.round(budget * 0.015)
          },
          hotel: florenceHotel ? {
            name: florenceHotel.name,
            rating: florenceHotel.rating,
            location: florenceHotel.location,
            amenities: florenceHotel.amenities,
            pricePerNight: florenceHotel.pricePerNight
          } : {
            name: 'Hotel Davanzati',
            rating: 4,
            location: 'Historic Center Florence',
            amenities: ['WiFi', 'Concierge', 'Rooftop Terrace', 'Historic Building'],
            pricePerNight: 165
          },
          activities: [
            {
              id: 'act-7',
              name: 'Uffizi Gallery Tour',
              type: 'sightseeing',
              time: '14:00',
              duration: 180,
              location: 'Uffizi Gallery',
              description: 'Renaissance masterpieces by Botticelli, da Vinci, Michelangelo',
              price: Math.round(budget * 0.013),
              healthTip: 'Take breaks on museum benches to rest your feet'
            },
            {
              id: 'act-8',
              name: 'Tuscan Dinner with Wine Pairing',
              type: 'restaurant',
              time: '19:30',
              duration: 150,
              location: 'Oltrarno District',
              description: 'Traditional Tuscan cuisine with local Chianti wines',
              price: Math.round(budget * 0.018),
              healthTip: 'Tuscan olive oil is rich in healthy monounsaturated fats'
            }
          ]
        },
        {
          id: 'day-5',
          date: '2024-07-19',
          activities: [
            {
              id: 'act-9',
              name: 'Duomo & Climbing the Dome',
              type: 'sightseeing',
              time: '09:00',
              duration: 150,
              location: 'Florence Cathedral',
              description: 'Climb to the top of Florence\'s iconic dome for panoramic views',
              price: Math.round(budget * 0.008),
              healthTip: '463 steps to the top - great cardio workout!'
            },
            {
              id: 'act-10',
              name: 'Ponte Vecchio & Jewelry Shopping',
              type: 'activity',
              time: '15:00',
              duration: 120,
              location: 'Ponte Vecchio',
              description: 'Historic bridge with traditional gold and jewelry shops',
              price: 0,
              healthTip: 'Walking tours burn calories while exploring'
            },
            {
              id: 'act-11',
              name: 'Gelato Tasting at Vivoli',
              type: 'restaurant',
              time: '17:30',
              duration: 30,
              location: 'Santa Croce',
              description: 'Florence\'s oldest gelateria serving artisanal gelato since 1932',
              price: Math.round(budget * 0.003),
              healthTip: 'Gelato has less fat than ice cream - enjoy in moderation!'
            }
          ]
        },
        {
          id: 'day-6',
          date: '2024-07-20',
          flight: {
            airline: 'Trenitalia',
            flightNumber: 'FR 9720',
            departure: '11:15 Firenze SMN',
            arrival: '13:45 Venezia Mestre',
            duration: '2h 30m',
            price: Math.round(budget * 0.017)
          },
          hotel: veniceHotel ? {
            name: veniceHotel.name,
            rating: veniceHotel.rating,
            location: veniceHotel.location,
            amenities: veniceHotel.amenities,
            pricePerNight: veniceHotel.pricePerNight
          } : {
            name: 'Hotel Ai Reali',
            rating: 5,
            location: 'Near Rialto Bridge',
            amenities: ['WiFi', 'Spa', 'Restaurant', 'Canal Views', 'Concierge'],
            pricePerNight: 280
          },
          activities: [
            {
              id: 'act-12',
              name: 'Gondola Ride at Sunset',
              type: 'activity',
              time: '18:00',
              duration: 40,
              location: 'Grand Canal',
              description: 'Romantic gondola ride through Venice\'s historic canals',
              price: Math.round(budget * 0.027),
              healthTip: 'Relaxing water activities reduce stress and lower blood pressure'
            },
            {
              id: 'act-13',
              name: 'Seafood Dinner at Osteria alle Testiere',
              type: 'restaurant',
              time: '20:00',
              duration: 120,
              location: 'Castello District',
              description: 'Fresh Adriatic seafood in intimate Venetian setting',
              price: Math.round(budget * 0.022),
              healthTip: 'Fresh seafood provides omega-3 fatty acids for heart health'
            }
          ]
        },
        {
          id: 'day-7',
          date: '2024-07-21',
          flight: {
            airline: 'British Airways',
            flightNumber: 'BA 2596',
            departure: '14:20 VCE',
            arrival: '16:00 LHR',
            duration: '2h 40m',
            price: Math.round(budget * 0.097)
          },
          activities: [
            {
              id: 'act-14',
              name: 'St. Mark\'s Square & Basilica',
              type: 'sightseeing',
              time: '09:00',
              duration: 120,
              location: 'St. Mark\'s Square',
              description: 'Venice\'s main square and stunning Byzantine basilica',
              price: Math.round(budget * 0.005),
              healthTip: 'Morning sightseeing helps you start the day with energy'
            },
            {
              id: 'act-15',
              name: 'Murano Glass Workshop Visit',
              type: 'activity',
              time: '11:30',
              duration: 90,
              location: 'Murano Island',
              description: 'Watch master craftsmen create traditional Venetian glass',
              price: Math.round(budget * 0.008),
              healthTip: 'Learning new skills keeps your mind active and healthy'
            }
          ]
        }
      ]
      
      setItinerary(smartItinerary)
    } else if (destination === 'Thailand') {
      // Create 10-day Thailand itinerary with budget-optimized hotels
      const bangkokHotel = bestHotels.find(h => h.location.includes('Bangkok')) || bestHotels[0]
      const phuketHotel = bestHotels.find(h => h.location.includes('Phuket')) || bestHotels[1] || bangkokHotel
      const chiangMaiHotel = bestHotels.find(h => h.location.includes('Chiang Mai')) || bestHotels[2] || bangkokHotel
      
      const thailandItinerary: ItineraryDay[] = [
        {
          id: 'day-1',
          date: '2024-08-05',
          flight: {
            airline: 'Thai Airways',
            flightNumber: 'TG 910',
            departure: '22:30 LHR',
            arrival: '16:45+1 BKK',
            duration: '11h 15m',
            price: Math.round(budget * 0.12) // 12% of budget for flights
          },
          hotel: bangkokHotel ? {
            name: bangkokHotel.name,
            rating: bangkokHotel.rating,
            location: bangkokHotel.location,
            amenities: bangkokHotel.amenities,
            pricePerNight: bangkokHotel.pricePerNight
          } : {
            name: 'Chatrium Hotel Riverside',
            rating: 4.6,
            location: 'Riverside Bangkok',
            amenities: ['WiFi', 'Pool', 'River Views', 'Restaurant', 'Spa'],
            pricePerNight: 95
          },
          activities: [
            {
              id: 'act-1',
              name: 'Grand Palace & Wat Phra Kaew Tour',
              type: 'sightseeing',
              time: '09:00',
              duration: 180,
              location: 'Old City Bangkok',
              description: 'Explore Thailand\'s most sacred temple and the stunning Grand Palace complex',
              price: Math.round(budget * 0.008),
              healthTip: 'Wear comfortable shoes and dress modestly - shoulders and knees covered'
            },
            {
              id: 'act-2',
              name: 'Thai Cooking Class',
              type: 'activity',
              time: '15:00',
              duration: 240,
              location: 'Silom District',
              description: 'Learn to cook authentic Thai dishes including pad thai and green curry',
              price: Math.round(budget * 0.012),
              healthTip: 'Thai herbs like lemongrass and galangal have anti-inflammatory properties'
            }
          ]
        },
        {
          id: 'day-2',
          date: '2024-08-06',
          hotel: bangkokHotel ? {
            name: bangkokHotel.name,
            rating: bangkokHotel.rating,
            location: bangkokHotel.location,
            amenities: bangkokHotel.amenities,
            pricePerNight: bangkokHotel.pricePerNight
          } : {
            name: 'Chatrium Hotel Riverside',
            rating: 4.6,
            location: 'Riverside Bangkok',
            amenities: ['WiFi', 'Pool', 'River Views', 'Restaurant', 'Spa'],
            pricePerNight: 95
          },
          activities: [
            {
              id: 'act-3',
              name: 'Floating Market Tour',
              type: 'sightseeing',
              time: '07:00',
              duration: 300,
              location: 'Damnoen Saduak',
              description: 'Experience traditional Thai floating market with fresh fruits and local crafts',
              price: Math.round(budget * 0.015),
              healthTip: 'Early morning tours beat the heat and crowds'
            },
            {
              id: 'act-4',
              name: 'Traditional Thai Massage',
              type: 'wellness',
              time: '16:00',
              duration: 120,
              location: 'Wat Pho Temple',
              description: 'Authentic Thai massage at the birthplace of traditional Thai massage',
              price: Math.round(budget * 0.006),
              healthTip: 'Thai massage improves flexibility and relieves muscle tension'
            },
            {
              id: 'act-5',
              name: 'Street Food Tour',
              type: 'restaurant',
              time: '19:00',
              duration: 180,
              location: 'Chinatown Bangkok',
              description: 'Explore Bangkok\'s famous street food scene with local guide',
              price: Math.round(budget * 0.010),
              healthTip: 'Choose busy stalls with high turnover for freshest food'
            }
          ]
        },
        {
          id: 'day-3',
          date: '2024-08-07',
          hotel: bangkokHotel ? {
            name: bangkokHotel.name,
            rating: bangkokHotel.rating,
            location: bangkokHotel.location,
            amenities: bangkokHotel.amenities,
            pricePerNight: bangkokHotel.pricePerNight
          } : {
            name: 'Chatrium Hotel Riverside',
            rating: 4.6,
            location: 'Riverside Bangkok',
            amenities: ['WiFi', 'Pool', 'River Views', 'Restaurant', 'Spa'],
            pricePerNight: 95
          },
          activities: [
            {
              id: 'act-6',
              name: 'Chatuchak Weekend Market',
              type: 'activity',
              time: '10:00',
              duration: 240,
              location: 'Chatuchak District',
              description: 'Shop at one of the world\'s largest weekend markets with 15,000+ stalls',
              price: Math.round(budget * 0.008),
              healthTip: 'Stay hydrated and wear comfortable walking shoes'
            },
            {
              id: 'act-7',
              name: 'Chao Phraya River Cruise',
              type: 'sightseeing',
              time: '17:00',
              duration: 120,
              location: 'Chao Phraya River',
              description: 'Scenic sunset cruise along Bangkok\'s main river with temple views',
              price: Math.round(budget * 0.007),
              healthTip: 'Evening river breeze provides natural cooling'
            },
            {
              id: 'act-8',
              name: 'Rooftop Dinner',
              type: 'restaurant',
              time: '20:00',
              duration: 150,
              location: 'Sukhumvit District',
              description: 'Fine dining with panoramic Bangkok city views',
              price: Math.round(budget * 0.020),
              healthTip: 'Enjoy lighter portions at altitude for better digestion'
            }
          ]
        },
        {
          id: 'day-4',
          date: '2024-08-08',
          flight: {
            airline: 'Bangkok Airways',
            flightNumber: 'PG 145',
            departure: '14:30 BKK',
            arrival: '16:00 HKT',
            duration: '1h 30m',
            price: Math.round(budget * 0.025)
          },
          hotel: phuketHotel ? {
            name: phuketHotel.name,
            rating: phuketHotel.rating,
            location: phuketHotel.location,
            amenities: phuketHotel.amenities,
            pricePerNight: phuketHotel.pricePerNight
          } : {
            name: 'Katathani Phuket Beach Resort',
            rating: 4,
            location: 'Kata Noi Beach',
            amenities: ['WiFi', 'Beach Access', 'Multiple Pools', 'Spa'],
            pricePerNight: 165
          },
          activities: [
            {
              id: 'act-9',
              name: 'Beach Relaxation & Swimming',
              type: 'activity',
              time: '17:30',
              duration: 120,
              location: 'Kata Noi Beach',
              description: 'Relax on pristine white sand beach with crystal clear waters',
              price: 0,
              healthTip: 'Swimming is excellent low-impact cardio exercise'
            }
          ]
        },
        {
          id: 'day-5',
          date: '2024-08-09',
          hotel: phuketHotel ? {
            name: phuketHotel.name,
            rating: phuketHotel.rating,
            location: phuketHotel.location,
            amenities: phuketHotel.amenities,
            pricePerNight: phuketHotel.pricePerNight
          } : {
            name: 'Katathani Phuket Beach Resort',
            rating: 4.7,
            location: 'Kata Noi Beach',
            amenities: ['WiFi', 'Beach Access', 'Multiple Pools', 'Spa'],
            pricePerNight: 165
          },
          activities: [
            {
              id: 'act-10',
              name: 'Phi Phi Islands Day Trip',
              type: 'sightseeing',
              time: '08:00',
              duration: 480,
              location: 'Phi Phi Islands',
              description: 'Full day boat trip to stunning limestone islands with snorkeling',
              price: Math.round(budget * 0.025),
              healthTip: 'Snorkeling provides great exercise and vitamin D from sunshine'
            },
            {
              id: 'act-11',
              name: 'Beachfront Seafood Dinner',
              type: 'restaurant',
              time: '19:00',
              duration: 120,
              location: 'Patong Beach',
              description: 'Fresh seafood dinner with your feet in the sand',
              price: Math.round(budget * 0.015),
              healthTip: 'Fresh fish provides omega-3 fatty acids and lean protein'
            }
          ]
        },
        {
          id: 'day-6',
          date: '2024-08-10',
          hotel: phuketHotel ? {
            name: phuketHotel.name,
            rating: phuketHotel.rating,
            location: phuketHotel.location,
            amenities: phuketHotel.amenities,
            pricePerNight: phuketHotel.pricePerNight
          } : {
            name: 'Katathani Phuket Beach Resort',
            rating: 4.7,
            location: 'Kata Noi Beach',
            amenities: ['WiFi', 'Beach Access', 'Multiple Pools', 'Spa'],
            pricePerNight: 165
          },
          activities: [
            {
              id: 'act-12',
              name: 'Big Buddha & Wat Chalong',
              type: 'sightseeing',
              time: '09:00',
              duration: 180,
              location: 'Southern Phuket',
              description: 'Visit Phuket\'s most important Buddhist temple and giant Buddha statue',
              price: Math.round(budget * 0.005),
              healthTip: 'Temple climbing provides natural stair exercise'
            },
            {
              id: 'act-13',
              name: 'Thai Spa Treatment',
              type: 'wellness',
              time: '15:00',
              duration: 150,
              location: 'Hotel Spa',
              description: 'Traditional Thai herbal spa treatment with aromatherapy',
              price: Math.round(budget * 0.018),
              healthTip: 'Spa treatments reduce stress hormones and improve circulation'
            }
          ]
        },
        {
          id: 'day-7',
          date: '2024-08-11',
          flight: {
            airline: 'Thai Airways',
            flightNumber: 'TG 2104',
            departure: '11:30 HKT',
            arrival: '12:45 CNX',
            duration: '1h 15m',
            price: Math.round(budget * 0.020)
          },
          hotel: chiangMaiHotel ? {
            name: chiangMaiHotel.name,
            rating: chiangMaiHotel.rating,
            location: chiangMaiHotel.location,
            amenities: chiangMaiHotel.amenities,
            pricePerNight: chiangMaiHotel.pricePerNight
          } : {
            name: 'Le Meridien Chiang Mai',
            rating: 4,
            location: 'Night Bazaar Area',
            amenities: ['WiFi', 'Pool', 'Spa', 'Restaurant'],
            pricePerNight: 120
          },
          activities: [
            {
              id: 'act-14',
              name: 'Old City Temple Tour',
              type: 'sightseeing',
              time: '15:00',
              duration: 180,
              location: 'Chiang Mai Old City',
              description: 'Explore ancient Lanna temples including Wat Chedi Luang',
              price: Math.round(budget * 0.006),
              healthTip: 'Walking tours provide gentle exercise and cultural enrichment'
            }
          ]
        },
        {
          id: 'day-8',
          date: '2024-08-12',
          hotel: chiangMaiHotel ? {
            name: chiangMaiHotel.name,
            rating: chiangMaiHotel.rating,
            location: chiangMaiHotel.location,
            amenities: chiangMaiHotel.amenities,
            pricePerNight: chiangMaiHotel.pricePerNight
          } : {
            name: 'Le Meridien Chiang Mai',
            rating: 4.5,
            location: 'Night Bazaar Area',
            amenities: ['WiFi', 'Pool', 'Spa', 'Restaurant'],
            pricePerNight: 120
          },
          activities: [
            {
              id: 'act-15',
              name: 'Elephant Sanctuary Visit',
              type: 'activity',
              time: '08:00',
              duration: 420,
              location: 'Mae Taeng Valley',
              description: 'Ethical elephant sanctuary experience with feeding and bathing',
              price: Math.round(budget * 0.030),
              healthTip: 'Interaction with animals reduces stress and increases happiness'
            },
            {
              id: 'act-16',
              name: 'Night Bazaar Shopping',
              type: 'activity',
              time: '19:00',
              duration: 180,
              location: 'Chiang Mai Night Bazaar',
              description: 'Shop for handicrafts, textiles, and local art',
              price: Math.round(budget * 0.010),
              healthTip: 'Evening walking provides light exercise and aids digestion'
            }
          ]
        },
        {
          id: 'day-9',
          date: '2024-08-13',
          hotel: chiangMaiHotel ? {
            name: chiangMaiHotel.name,
            rating: chiangMaiHotel.rating,
            location: chiangMaiHotel.location,
            amenities: chiangMaiHotel.amenities,
            pricePerNight: chiangMaiHotel.pricePerNight
          } : {
            name: 'Le Meridien Chiang Mai',
            rating: 4.5,
            location: 'Night Bazaar Area',
            amenities: ['WiFi', 'Pool', 'Spa', 'Restaurant'],
            pricePerNight: 120
          },
          activities: [
            {
              id: 'act-17',
              name: 'Doi Suthep Temple',
              type: 'sightseeing',
              time: '09:00',
              duration: 240,
              location: 'Doi Suthep Mountain',
              description: 'Sacred mountain temple with panoramic views of Chiang Mai',
              price: Math.round(budget * 0.008),
              healthTip: 'Mountain air is cleaner and richer in oxygen'
            },
            {
              id: 'act-18',
              name: 'Traditional Khantoke Dinner',
              type: 'restaurant',
              time: '18:30',
              duration: 180,
              location: 'Cultural Center',
              description: 'Traditional Northern Thai dinner with cultural performances',
              price: Math.round(budget * 0.018),
              healthTip: 'Traditional seated dining promotes mindful eating'
            }
          ]
        },
        {
          id: 'day-10',
          date: '2024-08-14',
          flight: {
            airline: 'Thai Airways',
            flightNumber: 'TG 103',
            departure: '13:45 CNX',
            arrival: '15:30 BKK',
            duration: '1h 45m',
            price: Math.round(budget * 0.020)
          },
          activities: [
            {
              id: 'act-19',
              name: 'Sunday Walking Street Market',
              type: 'activity',
              time: '10:00',
              duration: 180,
              location: 'Rachadamnoen Road',
              description: 'Famous Sunday market with local crafts and street food',
              price: Math.round(budget * 0.008),
              healthTip: 'Morning market visits help maintain regular sleep patterns'
            }
          ]
        }
      ]
      
      setItinerary(thailandItinerary)
    } else {
      // Fallback to original method for other destinations
      generateSampleItinerary(destination)
    }
  }

  const generateSampleItinerary = (destination: string) => {
    const sampleItinerary: ItineraryDay[] = destination === 'Italy' ? [
      {
        id: 'day-1',
        date: '2024-07-15',
        flight: {
          airline: 'British Airways',
          flightNumber: 'BA 2551',
          departure: '09:25 LHR',
          arrival: '13:45 FCO',
          duration: '2h 50m',
          price: 285
        },
        hotel: {
          name: 'Hotel Artemide',
          rating: 4,
          location: 'Near Termini Station',
          amenities: ['WiFi', 'Gym', 'Spa', 'Restaurant'],
          pricePerNight: 180
        },
        activities: [
          {
            id: 'act-1',
            name: 'Colosseum Skip-the-Line Tour',
            type: 'sightseeing',
            time: '15:30',
            duration: 180,
            location: 'Colosseum',
            description: 'Explore ancient Rome with expert guide',
            price: 35,
            healthTip: 'Wear comfortable walking shoes - lots of steps!'
          }
        ]
      },
      {
        id: 'day-2',
        date: '2024-07-16',
        activities: [
          {
            id: 'act-2',
            name: 'Vatican Museums & Sistine Chapel',
            type: 'sightseeing',
            time: '09:00',
            duration: 240,
            location: 'Vatican City',
            description: 'World-class art and Michelangelo masterpieces',
            price: 45,
            healthTip: 'Stay hydrated - lots of walking in warm museums'
          },
          {
            id: 'act-3',
            name: 'Lunch at Da Enzo al 29',
            type: 'restaurant',
            time: '13:30',
            duration: 90,
            location: 'Trastevere',
            description: 'Authentic Roman cuisine in charming neighborhood',
            price: 25,
            healthTip: 'Try the fresh seafood for omega-3s'
          },
          {
            id: 'act-4',
            name: 'Evening Stroll at Trevi Fountain',
            type: 'sightseeing',
            time: '19:00',
            duration: 60,
            location: 'Trevi Fountain',
            description: 'Make a wish at Rome\'s most famous fountain',
            price: 0,
            healthTip: 'Evening walks aid digestion after dinner'
          }
        ]
      },
      {
        id: 'day-3',
        date: '2024-07-17',
        activities: [
          {
            id: 'act-5',
            name: 'Roman Forum & Palatine Hill',
            type: 'sightseeing',
            time: '09:00',
            duration: 180,
            location: 'Roman Forum',
            description: 'Explore the heart of ancient Roman civilization',
            price: 30,
            healthTip: 'Bring sun protection - limited shade available'
          },
          {
            id: 'act-6',
            name: 'Aperitivo in Campo de\' Fiori',
            type: 'restaurant',
            time: '18:00',
            duration: 120,
            location: 'Campo de\' Fiori',
            description: 'Traditional Italian aperitivo with local wines',
            price: 20,
            healthTip: 'Light snacks before dinner help with portion control'
          }
        ]
      },
      {
        id: 'day-4',
        date: '2024-07-18',
        flight: {
          airline: 'Trenitalia',
          flightNumber: 'FR 9505',
          departure: '08:30 Roma Termini',
          arrival: '10:15 Firenze SMN',
          duration: '1h 45m',
          price: 45
        },
        hotel: {
          name: 'Hotel Davanzati',
          rating: 4,
          location: 'Historic Center Florence',
          amenities: ['WiFi', 'Concierge', 'Rooftop Terrace', 'Historic Building'],
          pricePerNight: 165
        },
        activities: [
          {
            id: 'act-7',
            name: 'Uffizi Gallery Tour',
            type: 'sightseeing',
            time: '14:00',
            duration: 180,
            location: 'Uffizi Gallery',
            description: 'Renaissance masterpieces by Botticelli, da Vinci, Michelangelo',
            price: 40,
            healthTip: 'Take breaks on museum benches to rest your feet'
          },
          {
            id: 'act-8',
            name: 'Tuscan Dinner with Wine Pairing',
            type: 'restaurant',
            time: '19:30',
            duration: 150,
            location: 'Oltrarno District',
            description: 'Traditional Tuscan cuisine with local Chianti wines',
            price: 55,
            healthTip: 'Tuscan olive oil is rich in healthy monounsaturated fats'
          }
        ]
      },
      {
        id: 'day-5',
        date: '2024-07-19',
        activities: [
          {
            id: 'act-9',
            name: 'Duomo & Climbing the Dome',
            type: 'sightseeing',
            time: '09:00',
            duration: 150,
            location: 'Florence Cathedral',
            description: 'Climb to the top of Florence\'s iconic dome for panoramic views',
            price: 25,
            healthTip: '463 steps to the top - great cardio workout!'
          },
          {
            id: 'act-10',
            name: 'Ponte Vecchio & Jewelry Shopping',
            type: 'activity',
            time: '15:00',
            duration: 120,
            location: 'Ponte Vecchio',
            description: 'Historic bridge with traditional gold and jewelry shops',
            price: 0,
            healthTip: 'Walking tours burn calories while exploring'
          },
          {
            id: 'act-11',
            name: 'Gelato Tasting at Vivoli',
            type: 'restaurant',
            time: '17:30',
            duration: 30,
            location: 'Santa Croce',
            description: 'Florence\'s oldest gelateria serving artisanal gelato since 1932',
            price: 8,
            healthTip: 'Gelato has less fat than ice cream - enjoy in moderation!'
          }
        ]
      },
      {
        id: 'day-6',
        date: '2024-07-20',
        flight: {
          airline: 'Trenitalia',
          flightNumber: 'FR 9720',
          departure: '11:15 Firenze SMN',
          arrival: '13:45 Venezia Mestre',
          duration: '2h 30m',
          price: 50
        },
        hotel: {
          name: 'Hotel Ai Reali',
          rating: 5,
          location: 'Near Rialto Bridge',
          amenities: ['WiFi', 'Spa', 'Restaurant', 'Canal Views', 'Concierge'],
          pricePerNight: 280
        },
        activities: [
          {
            id: 'act-12',
            name: 'Gondola Ride at Sunset',
            type: 'activity',
            time: '18:00',
            duration: 40,
            location: 'Grand Canal',
            description: 'Romantic gondola ride through Venice\'s historic canals',
            price: 80,
            healthTip: 'Relaxing water activities reduce stress and lower blood pressure'
          },
          {
            id: 'act-13',
            name: 'Seafood Dinner at Osteria alle Testiere',
            type: 'restaurant',
            time: '20:00',
            duration: 120,
            location: 'Castello District',
            description: 'Fresh Adriatic seafood in intimate Venetian setting',
            price: 65,
            healthTip: 'Fresh seafood provides omega-3 fatty acids for heart health'
          }
        ]
      },
      {
        id: 'day-7',
        date: '2024-07-21',
        flight: {
          airline: 'British Airways',
          flightNumber: 'BA 2596',
          departure: '14:20 VCE',
          arrival: '16:00 LHR',
          duration: '2h 40m',
          price: 290
        },
        activities: [
          {
            id: 'act-14',
            name: 'St. Mark\'s Square & Basilica',
            type: 'sightseeing',
            time: '09:00',
            duration: 120,
            location: 'St. Mark\'s Square',
            description: 'Venice\'s main square and stunning Byzantine basilica',
            price: 15,
            healthTip: 'Morning sightseeing helps you start the day with energy'
          },
          {
            id: 'act-15',
            name: 'Murano Glass Workshop Visit',
            type: 'activity',
            time: '11:30',
            duration: 90,
            location: 'Murano Island',
            description: 'Watch master craftsmen create traditional Venetian glass',
            price: 25,
            healthTip: 'Learning new skills keeps your mind active and healthy'
          }
        ]
      }
    ] : destination === 'Japan' ? [
      {
        id: 'day-1',
        date: '2024-09-10',
        flight: {
          airline: 'Japan Airlines',
          flightNumber: 'JAL 44',
          departure: '11:45 LHR',
          arrival: '08:30+1 NRT',
          duration: '11h 45m',
          price: 650
        },
        hotel: {
          name: 'Park Hyatt Tokyo',
          rating: 5,
          location: 'Shinjuku',
          amenities: ['WiFi', 'Spa', 'Pool', 'City Views'],
          pricePerNight: 450
        },
        activities: [
          {
            id: 'act-j1',
            name: 'Tsukiji Outer Market Food Tour',
            type: 'activity',
            time: '10:00',
            duration: 180,
            location: 'Tsukiji',
            description: 'Fresh sushi and Japanese street food experience',
            price: 60,
            healthTip: 'Perfect for trying healthy, fresh Japanese cuisine'
          }
        ]
      },
      {
        id: 'day-2',
        date: '2024-09-11',
        activities: [
          {
            id: 'act-j2',
            name: 'Senso-ji Temple Visit',
            type: 'sightseeing',
            time: '09:00',
            duration: 120,
            location: 'Asakusa',
            description: 'Historic Buddhist temple and traditional shopping street',
            price: 0,
            healthTip: 'Lots of walking - wear comfortable shoes!'
          },
          {
            id: 'act-j3',
            name: 'Traditional Kaiseki Dinner',
            type: 'restaurant',
            time: '18:30',
            duration: 150,
            location: 'Ginza',  
            description: 'Multi-course traditional Japanese dining experience',
            price: 120,
            healthTip: 'Seasonal ingredients prepared for optimal nutrition'
          }
        ]
      }
    ] : destination === 'France' ? [
      {
        id: 'day-1',
        date: '2024-08-01',
        flight: {
          airline: 'Air France',
          flightNumber: 'AF 1280',
          departure: '10:15 LHR',
          arrival: '12:45 CDG',
          duration: '1h 30m',
          price: 180
        },
        hotel: {
          name: 'Hotel des Grands Boulevards',
          rating: 4,
          location: '2nd Arrondissement',
          amenities: ['WiFi', 'Restaurant', 'Bar', 'Concierge'],
          pricePerNight: 220
        },
        activities: [
          {
            id: 'act-f1',
            name: 'Louvre Museum Tour',
            type: 'sightseeing',
            time: '15:00',
            duration: 180,
            location: 'Louvre',
            description: 'World-famous art museum with Mona Lisa and Venus de Milo',
            price: 35,
            healthTip: 'Lots of walking - take breaks and stay hydrated!'
          }
        ]
      },
      {
        id: 'day-2',
        date: '2024-08-02',
        activities: [
          {
            id: 'act-f2',
            name: 'Eiffel Tower & Seine River Cruise', 
            type: 'sightseeing',
            time: '10:00',
            duration: 240,
            location: 'Trocadéro',
            description: 'Iconic tower visit followed by relaxing river cruise',
            price: 45,
            healthTip: 'Elevator available if you prefer not to climb stairs'
          },
          {
            id: 'act-f3',
            name: 'French Wine Tasting',
            type: 'activity',
            time: '17:00',
            duration: 90,
            location: 'Marais District',
            description: 'Sample fine French wines with expert sommelier',
            price: 55,
            healthTip: 'Drink water between tastings to stay hydrated'
          }
        ]
      }
    ] : [
      // Generic itinerary for other destinations
      {
        id: 'day-1',
        date: new Date().toISOString().split('T')[0],
        flight: {
          airline: 'British Airways',
          flightNumber: 'BA 001',
          departure: '10:00 LHR', 
          arrival: '14:00 Local',
          duration: '4h 0m',
          price: Math.round(tripDetails.budget * 0.2) || 400
        },
        hotel: {
          name: `${destination} Central Hotel`,
          rating: 4,
          location: 'City Center',
          amenities: ['WiFi', 'Restaurant', 'Concierge', 'Gym'],
          pricePerNight: Math.round(tripDetails.budget * 0.15 / 7) || 120
        },
        activities: [
          {
            id: 'act-1',
            name: `Explore ${destination} City Center`,
            type: 'sightseeing',
            time: '16:00',
            duration: 180,
            location: 'City Center',
            description: `Walking tour of ${destination}'s main attractions and landmarks`,
            price: 25,
            healthTip: 'Great way to get oriented and walk off jet lag!'
          },
          {
            id: 'act-2',
            name: `Traditional ${destination} Dinner`,
            type: 'restaurant',
            time: '20:00',
            duration: 120,
            location: 'Local Restaurant',
            description: `Authentic local cuisine and specialties of ${destination}`,
            price: 45,
            healthTip: 'Try local ingredients for a healthy, authentic experience'
          }
        ]
      },
      {
        id: 'day-2',
        date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        activities: [
          {
            id: 'act-3',
            name: `${destination} Cultural Experience`,
            type: 'sightseeing',
            time: '10:00',
            duration: 240,
            location: 'Cultural District',
            description: `Visit museums, galleries, and cultural sites in ${destination}`,
            price: 35,
            healthTip: 'Take breaks between exhibits to avoid museum fatigue'
          },
          {
            id: 'act-4',
            name: `Local Market & Shopping`,
            type: 'sightseeing',
            time: '15:00',
            duration: 150,
            location: 'Local Market',
            description: `Browse local markets and shop for souvenirs in ${destination}`,
            price: 30,
            healthTip: 'Walking through markets is great exercise!'
          },
          {
            id: 'act-5',
            name: `${destination} Nightlife Experience`,
            type: 'restaurant',
            time: '19:30',
            duration: 180,
            location: 'Entertainment District',
            description: `Experience the nightlife and entertainment in ${destination}`,
            price: 50,
            healthTip: 'Stay hydrated and pace yourself with drinks'
          }
        ]
      }
    ]
    
    setItinerary(sampleItinerary)
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
      const aiResponse = await generateAIResponse(messageText)
      console.log('✅ AI response generated successfully:', aiResponse.substring(0, 100) + '...')
      
      // Extract trip information and update state after AI response
      console.log('📝 Extracting trip information from user message...')
      const { updates, questionsUpdate } = extractTripInformation(messageText)
      console.log('✅ Trip information extracted:', { updates, questionsUpdate })
      
      // Update trip details and questions answered
      if (Object.keys(updates).length > 0) {
        setTripDetails(prev => ({ ...prev, ...updates }))
        console.log('✅ Trip details updated:', updates)
      }
      
      if (Object.keys(questionsUpdate).length > 0) {
        setQuestionsAnswered(prev => ({ ...prev, ...questionsUpdate }))
        console.log('✅ Questions answered updated:', questionsUpdate)
      }
      
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
      
      window.location.href = '/trip/confirmation'
      
    } catch (error) {
      console.error('Failed to finalize plan:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
              {tripDetails.startDate && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(tripDetails.startDate).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
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
              className="px-6 py-2 bg-gradient-to-r from-brand-green to-brand-seafoam text-white font-medium rounded-xl hover:opacity-90 transition-opacity duration-200"
            >
              Finalize Plan
            </motion.button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid lg:grid-cols-5 gap-6 h-[calc(100vh-140px)]">
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
                days: itinerary.map((day) => ({
                  id: day.id,
                  date: day.date,
                  hotel: day.hotel,
                  flight: day.flight,
                  activities: day.activities
                }))
              } : undefined}
            />
          </div>
        </div>
      </div>
    </div>
  )
}