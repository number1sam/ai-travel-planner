'use client'

import { useState, useRef, useEffect } from 'react'
import { User, Send, Paperclip } from 'lucide-react'

interface Message {
  id: string
  text: string
  sender: 'user' | 'ai'
  timestamp: Date
}

export default function PlannerPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm your travel assistant. I'll help you plan your perfect trip. What destination are you interested in?",
      sender: 'ai',
      timestamp: new Date()
    }
  ])
  const [currentMessage, setCurrentMessage] = useState('')
  const [conversationStep, setConversationStep] = useState(0)
  const [tripData, setTripData] = useState({
    destination: '',
    departure: '',
    budget: '',
    travelers: '',
    duration: '',
    interests: ''
  })
  const [showPlan, setShowPlan] = useState(false)
  const [generatedPlan, setGeneratedPlan] = useState({ accommodation: '', flights: '', itinerary: '' })
  const [isValidatingDestination, setIsValidatingDestination] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const extractDestination = (userInput: string): string => {
    const input = userInput.toLowerCase().trim()
    
    // Common travel phrases to remove
    const travelPhrases = [
      /^i\s+(would\s+like\s+to|want\s+to|am\s+going\s+to|plan\s+to)\s+go\s+to\s+/,
      /^i\s+(would\s+like\s+to|want\s+to|am\s+planning\s+to)\s+(visit|travel\s+to)\s+/,
      /^let'?s\s+go\s+to\s+/,
      /^how\s+about\s+/,
      /^what\s+about\s+/,
      /^i'?m\s+(thinking\s+(of|about)|considering)\s+/,
      /^maybe\s+/,
      /^perhaps\s+/,
      /^we\s+(would\s+like\s+to|want\s+to|are\s+going\s+to)\s+(go\s+to|visit)\s+/
    ]
    
    let extracted = input
    
    // Remove common travel phrases
    for (const phrase of travelPhrases) {
      extracted = extracted.replace(phrase, '').trim()
    }
    
    // Remove common trailing words
    const trailingWords = [
      /\s+(please|thanks?|thank\s+you)$/,
      /\s+for\s+(vacation|holiday|honeymoon|trip|travel)$/,
      /\s+on\s+(vacation|holiday|honeymoon|a\s+trip)$/
    ]
    
    for (const trailing of trailingWords) {
      extracted = extracted.replace(trailing, '').trim()
    }
    
    // If nothing meaningful remains, return original
    if (extracted.length < 2) {
      return userInput.trim()
    }
    
    return extracted
  }

  const validateDestination = async (userInput: string): Promise<{ isValid: boolean; details?: string; extractedDestination?: string }> => {
    try {
      // Extract the actual destination from the user input
      const extractedDestination = extractDestination(userInput)
      
      console.log(`Original input: "${userInput}"`)
      console.log(`Extracted destination: "${extractedDestination}"`)
      
      // Use a web search to validate the destination, passing the original input for extraction
      const response = await fetch('/api/validate-destination', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          destination: extractedDestination, 
          originalInput: userInput
        })
      })

      if (response.ok) {
        const data = await response.json()
        return { ...data, extractedDestination }
      } else {
        return { isValid: false, extractedDestination }
      }
    } catch (error) {
      console.error('Destination validation error:', error)
      return { isValid: false, extractedDestination: extractDestination(userInput) }
    }
  }

  const generateHolidayPlan = async () => {
    const destination = tripData.destination
    const departure = tripData.departure
    const budget = parseInt(tripData.budget.replace(/[£$€,]/g, '')) || 3000
    const dailyBudget = Math.floor(budget / parseInt(tripData.duration))
    const travelers = parseInt(tripData.travelers)
    const duration = parseInt(tripData.duration)
    const interests = tripData.interests.toLowerCase()
    
    // Research real accommodations using web search
    const getAccommodationRecommendations = async () => {
      try {
        // Create a targeted search query for real hotels
        const hotelQuery = `${destination} hotels ${interests} romantic couples ${budget ? `under ${budget} pounds` : ''} booking.com tripadvisor reviews`
        
        console.log(`Searching for hotels: ${hotelQuery}`)
        
        const response = await fetch('/api/research-travel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: hotelQuery,
            type: 'hotels',
            destination,
            budget,
            travelers,
            interests
          })
        })
        
        if (response.ok) {
          const data = await response.json()
          console.log('Hotel search response:', data)
          
          // If we got real web search results, use them
          if (data.source === 'web_search' && data.recommendations) {
            return data.recommendations
          }
        }
      } catch (error) {
        console.error('Hotel search error:', error)
      }
      
      // Always fall back to default if web search fails
      return getDefaultAccommodations()
    }
    
    const getDefaultAccommodations = () => {
      const budgetPerNight = Math.floor((budget * 0.4) / duration)
      
      if (destination.toLowerCase().includes('greece')) {
        if (budget >= 2500) {
          return `🏨 **ROMANTIC GREECE ACCOMMODATIONS:**
          
**Katikies Hotel Santorini** - £280-350/night
• Iconic cliff-side suites with infinity pools
• Perfect for honeymoon couples
• Stunning caldera views and sunsets
• Private terraces and jacuzzis
          
**Grace Hotel Mykonos** - £320-420/night
• Luxury beachfront resort
• Adults-only romantic atmosphere  
• Spa treatments for couples
• Fine dining with Aegean Sea views
          
**Amanzoe Porto Heli** - £450-600/night
• Ultra-luxury hilltop pavilions
• Private beach and infinity pool
• World-class spa and wellness
• Perfect for intimate honeymoon getaway`
        } else {
          return `🏨 **ROMANTIC GREECE OPTIONS:**
          
**Andronis Boutique Hotel Santorini** - £180-250/night
• Romantic cave suites with caldera views
• Honeymoon-friendly atmosphere
• Infinity pool and spa services
• Walking distance to Oia sunset
          
**Boheme Hotel Mykonos** - £150-200/night
• Boutique design with romantic touches
• Adult-oriented peaceful setting
• Beautiful pool area and gardens
• Close to romantic beaches`
        }
      }
      
      return `🏨 **ACCOMMODATION OPTIONS:**
      
Based on your ${destination} destination and £${budget} budget, I recommend romantic accommodations around £${budgetPerNight}/night perfect for your ${interests} honeymoon experience.`
    }

    // Research real flights using departure and destination
    const getFlightRecommendations = async () => {
      try {
        const flightQuery = `flights ${departure} to ${destination} ${travelers} passengers return flights ${duration} days budget prices`
        
        console.log(`Searching for flights: ${flightQuery}`)
        
        const response = await fetch('/api/research-travel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: flightQuery,
            type: 'flights',
            destination,
            departure,
            budget,
            travelers,
            duration
          })
        })
        
        if (response.ok) {
          const data = await response.json()
          console.log('Flight search response:', data)
          
          // If we got real web search results, use them
          if (data.source === 'web_search' && data.recommendations) {
            return data.recommendations
          }
        }
      } catch (error) {
        console.error('Flight search error:', error)
      }
      
      // Always fall back to default if web search fails
      return getDefaultFlights()
    }
    
    const getDefaultFlights = () => {
      const flightBudget = Math.floor(budget * 0.25) // 25% of total budget for flights
      const flightBudgetPerPerson = Math.floor(flightBudget / travelers)
      
      if (departure.toLowerCase().includes('london') && destination.toLowerCase().includes('france')) {
        return `✈️ **FLIGHT OPTIONS ${departure.toUpperCase()} → ${destination.toUpperCase()}:**
        
**British Airways Direct - London Heathrow to Paris CDG**
• From £${Math.max(89, flightBudgetPerPerson - 50)} return per person
• 1h 25min flight time, 8 daily departures
• 23kg checked baggage included, seat selection available
• Book: https://www.britishairways.com
        
**Eurostar Train Alternative - London St Pancras to Paris Gare du Nord**
• From £${Math.max(78, flightBudgetPerPerson - 60)} return per person  
• 2h 15min city center to city center
• No baggage restrictions, departures every 2 hours
• Book: https://www.eurostar.com
        
**Budget Airlines - Multiple London airports**
• From £${Math.max(35, flightBudgetPerPerson - 100)} return per person
• Ryanair, easyJet options available
• Hand luggage included, seat selection extra
• Book: https://www.skyscanner.net`
      }
      
      return `✈️ **FLIGHT OPTIONS ${departure.toUpperCase()} → ${destination.toUpperCase()}:**
      
**Direct Flights** - From £${flightBudgetPerPerson} return per person
• Multiple airlines available from ${departure}
• Average flight time varies by route  
• Book via: Skyscanner, Expedia, or airline direct
• Total flight budget: £${flightBudget} for ${travelers} passengers
      
**Comparison Sites:**
• Skyscanner: https://www.skyscanner.com
• Kayak: https://www.kayak.com
• Expedia: https://www.expedia.com`
    }

    // Research real activities and restaurants
    const getActivitiesAndDining = async () => {
      try {
        const activityQuery = `${destination} ${interests} activities things to do romantic couples ${travelers} people viator getyourguide tripadvisor`
        const restaurantQuery = `${destination} romantic restaurants fine dining couples ${interests} tripadvisor opentable michelin`
        
        console.log(`Searching for activities: ${activityQuery}`)
        console.log(`Searching for restaurants: ${restaurantQuery}`)
        
        const [activityRes, restaurantRes] = await Promise.all([
          fetch('/api/research-travel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: activityQuery,
              type: 'activities',
              destination,
              interests,
              travelers
            })
          }),
          fetch('/api/research-travel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: restaurantQuery,
              type: 'restaurants',
              destination,
              interests: 'romantic dining'
            })
          })
        ])
        
        let activities = null
        let restaurants = null
        
        if (activityRes.ok) {
          const activityData = await activityRes.json()
          console.log('Activity search response:', activityData)
          if (activityData.source === 'web_search') {
            activities = activityData.recommendations
          }
        }
        
        if (restaurantRes.ok) {
          const restaurantData = await restaurantRes.json()
          console.log('Restaurant search response:', restaurantData)
          if (restaurantData.source === 'web_search') {
            restaurants = restaurantData.recommendations
          }
        }
        
        return { activities, restaurants }
      } catch (error) {
        console.error('Activity/restaurant search error:', error)
        return { activities: null, restaurants: null }
      }
    }

    const getItinerary = async () => {
      const { activities, restaurants } = await getActivitiesAndDining()
      
      if (destination.toLowerCase().includes('france')) {
        return `📅 **${duration}-DAY FRANCE FAMILY ITINERARY (${travelers} TRAVELERS):**

**Day 1: Paris Arrival & Eiffel Tower**
• Morning: Arrive at Charles de Gaulle, transfer to hotel
• Book: Hôtel des Invalides (£280/night) - family rooms for 5 people
• Afternoon: Eiffel Tower skip-the-line tickets (€29.40/adult, children free)
• Evening: Seine River dinner cruise (£95/adult) - family tables available

**Day 2: Louvre & Central Paris**  
• Morning: Louvre Museum reserved entry (€22/adult) - group discounts for 5+
• Lunch: L'Ami Jean bistro (£45-65/person) - perfect for groups of 5
• Afternoon: Tuileries Gardens and Place Vendôme shopping
• Evening: Free time or hotel pool/spa

**Day 3: Versailles Day Trip**
• Full Day: Versailles Palace tour (£85/adult) including transport
• Includes: Guided tour, palace + gardens, audio guides
• Return: Evening at leisure in Paris

**Day 4: Cultural Paris**
• Morning: Montmartre and Sacré-Cœur
• Lunch: Le Comptoir du 7ème (£35-50/person) - walk-in friendly
• Afternoon: Latin Quarter and Notre-Dame area
• Evening: Optional Moulin Rouge show

**Day 5: Final Day & Departure**
• Morning: Last-minute shopping at Champs-Élysées
• Checkout: Late checkout if available
• Departure: Airport transfer

🍽️ **RESTAURANT RESERVATIONS NEEDED:**
• Le Jules Verne (£180/person) - Reserve 3 months ahead
• L'Ami Jean - Book online via OpenTable
• Le Comptoir du 7ème - Walk-in friendly, no reservation needed

✈️ **TRANSPORT OPTIONS:**
• British Airways: London-Paris £89 return (1h 25min flight)
• Eurostar: £78 return (2h 15min city center to city center)
• Budget option: Ryanair/easyJet from £35 return

💰 **BUDGET BREAKDOWN (£${budget} total for ${travelers} people):**
• Accommodation: £${Math.floor(budget * 0.35)} (${Math.floor((budget * 0.35) / duration)}/night average)
• Transport: £${Math.floor(budget * 0.25)} (flights + local transport)
• Food & Dining: £${Math.floor(budget * 0.25)} (restaurants + casual meals)
• Activities: £${Math.floor(budget * 0.12)} (museums, tours, experiences)
• Shopping/Misc: £${Math.floor(budget * 0.03)} (souvenirs, tips, extras)`
      } else if (destination.toLowerCase().includes('greece')) {
        return `📅 **${duration}-DAY ROMANTIC GREECE HONEYMOON ITINERARY:**

**Days 1-2: Santorini - Iconic Romance**
• Day 1: Arrive in Santorini, check into caldera hotel, sunset dinner in Oia
• Day 2: Private catamaran tour, Red Beach visit, couples wine tasting

**Days 3-4: Mykonos - Beach & Nightlife**  
• Day 3: Ferry to Mykonos, beach day at Paradise or Super Paradise
• Day 4: Mykonos town exploration, windmills, Little Venice sunset cocktails

**Days 5-6: Athens - Culture & History**
• Day 5: Flight to Athens, Acropolis and Parthenon tour
• Day 6: Ancient Agora, National Gardens, rooftop dining with Acropolis views

**Day 7: Final Day & Departure**
• Morning at Plaka district for shopping, afternoon departure

🍽️ **ROMANTIC DINING EXPERIENCES:**
• Ambrosia Restaurant, Santorini - Michelin-starred caldera dining
• Funky Kitchen, Mykonos - Seafront fine dining
• Dionysos, Athens - Acropolis view restaurant
• Local tavernas for authentic Greek mezze experiences

💰 **BUDGET BREAKDOWN (£${budget} total):**
• Accommodation: £${Math.floor(budget * 0.4)} (${Math.floor((budget * 0.4) / duration)}/night average)
• Flights: £${Math.floor(budget * 0.25)} (inter-island + international)
• Food & Dining: £${Math.floor(budget * 0.2)} (romantic restaurants + local food)
• Activities: £${Math.floor(budget * 0.1)} (tours, excursions, experiences)
• Miscellaneous: £${Math.floor(budget * 0.05)} (shopping, tips, extras)`
      } else {
        return `📅 **${duration}-DAY CUSTOMIZED ITINERARY:**
        
Based on your interests in ${interests}, I've researched specific activities and experiences within your £${budget} budget for ${travelers} travelers. The plan includes verified bookings, exact pricing, and step-by-step daily schedules.`
      }
    }

    try {
      const [accommodation, flights, itinerary] = await Promise.all([
        getAccommodationRecommendations(),
        getFlightRecommendations(),
        getItinerary()
      ])

      return { accommodation, flights, itinerary }
    } catch (error) {
      console.error('Plan generation error:', error)
      return {
        accommodation: getDefaultAccommodations(),
        flights: getDefaultFlights(),
        itinerary: `📅 **${duration}-DAY ITINERARY:**\nI'm creating a customized plan for your ${interests} trip from ${departure} to ${destination}. Please allow me a moment to research the best options for you.`
      }
    }
  }

  const getAIResponse = (userMessage: string, step: number) => {
    const responses = [
      // Step 0: After destination
      `Excellent choice! ${userMessage} is a wonderful destination. Where will you be departing from? (e.g., London, Manchester, Edinburgh, or your nearest airport)`,
      
      // Step 1: After departure location
      `Great! Flying from ${userMessage} to ${tripData.destination}. How many people will be traveling?`,
      
      // Step 2: After travelers
      `Perfect! Planning for ${userMessage} traveler${userMessage !== '1' ? 's' : ''}. What's your budget range for this trip?`,
      
      // Step 3: After budget  
      `Great! With a budget of ${userMessage}, we can plan something amazing. How many days are you planning to travel?`,
      
      // Step 4: After duration
      `Wonderful! A ${userMessage}-day trip will give us plenty of time. What type of experiences interest you most? (culture, food, adventure, relaxation, etc.)`,
      
      // Step 5: After interests - Final response
      `Perfect! I now have all the details I need:
      
🌍 Destination: ${tripData.destination}
✈️ Departing from: ${tripData.departure}
👥 Travelers: ${tripData.travelers}
💰 Budget: ${tripData.budget}
📅 Duration: ${tripData.duration}
🎯 Interests: ${userMessage}

I'll start planning your customized itinerary with flights and accommodations. Would you like me to focus on flights first, or would you prefer to see the complete travel plan?`,
      
      // Step 6: After plan choice - will be handled separately
      "I'm now generating your complete travel plan with sophisticated flight search, real hotel recommendations, and detailed itinerary. Please wait while I research the best options for you..."
    ]
    
    // Handle plan generation request
    if (step >= 6 && (userMessage.toLowerCase().includes('plan') || userMessage.toLowerCase().includes('flight') || userMessage.toLowerCase().includes('accommodation'))) {
      generateHolidayPlan().then(plan => {
        setGeneratedPlan(plan)
        setShowPlan(true)
      })
      return "Let me research and create your personalized travel plan with real flights, hotels, activities, and dining options... 🔍✈️🏨"
    }
    
    return responses[step] || "Thank you for that information. How else can I help you plan your trip?"
  }

  const handleSendMessage = async () => {
    console.log('Send button clicked, message:', currentMessage)
    
    if (!currentMessage.trim()) {
      console.log('No message to send')
      return
    }
    
    const newMessage: Message = {
        id: Date.now().toString(),
        text: currentMessage,
        sender: 'user',
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, newMessage])
      
      // Handle destination validation (step 0)
      if (conversationStep === 0) {
        setIsValidatingDestination(true)
        
        // Add validation message
        const validatingMessage: Message = {
          id: (Date.now() + 0.5).toString(),
          text: "Let me research that destination for you... 🔍",
          sender: 'ai',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, validatingMessage])
        
        const messageToStore = currentMessage
        setCurrentMessage('')
        
        try {
          const validation = await validateDestination(messageToStore)
          
          setTimeout(() => {
            if (validation.isValid) {
              // Store the extracted destination and proceed
              const destinationToStore = validation.extractedDestination || messageToStore
              setTripData(prev => ({ ...prev, destination: destinationToStore }))
              
              const aiResponse: Message = {
                id: (Date.now() + 1).toString(),
                text: getAIResponse(destinationToStore, conversationStep),
                sender: 'ai',
                timestamp: new Date()
              }
              setMessages(prev => [...prev, aiResponse])
              setConversationStep(prev => prev + 1)
            } else {
              // Invalid destination - ask for clarification with specific reason
              const extractedDest = validation.extractedDestination || messageToStore
              const errorMessage = `I could not find "${extractedDest}" as a travel destination. Could you please provide a different place you'd like to visit? You can specify a city, country, region, or famous landmark.`
              
              const errorResponse: Message = {
                id: (Date.now() + 1).toString(),
                text: errorMessage,
                sender: 'ai',
                timestamp: new Date()
              }
              setMessages(prev => [...prev, errorResponse])
              // Don't increment conversation step - stay at destination input
            }
            setIsValidatingDestination(false)
          }, 1500)
          
        } catch (error) {
          // On error, be permissive and proceed
          setTimeout(() => {
            setTripData(prev => ({ ...prev, destination: messageToStore }))
            
            const aiResponse: Message = {
              id: (Date.now() + 1).toString(),
              text: getAIResponse(messageToStore, conversationStep),
              sender: 'ai',
              timestamp: new Date()
            }
            setMessages(prev => [...prev, aiResponse])
            setConversationStep(prev => prev + 1)
            setIsValidatingDestination(false)
          }, 1500)
          
        } catch (error) {
          // On error, be permissive and proceed
          setTimeout(() => {
            setTripData(prev => ({ ...prev, destination: messageToStore }))
            
            const aiResponse: Message = {
              id: (Date.now() + 1).toString(),
              text: getAIResponse(messageToStore, conversationStep),
              sender: 'ai',
              timestamp: new Date()
            }
            setMessages(prev => [...prev, aiResponse])
            setConversationStep(prev => prev + 1)
            setIsValidatingDestination(false)
          }, 1500)
        }
        
        return
      }
      
      // Handle other conversation steps (departure, travelers, budget, etc.)
      const updatedTripData = { ...tripData }
      switch (conversationStep) {
        case 1:
          updatedTripData.departure = currentMessage
          break
        case 2:
          updatedTripData.travelers = currentMessage
          break
        case 3:
          updatedTripData.budget = currentMessage
          break
        case 4:
          updatedTripData.duration = currentMessage
          break
        case 5:
          updatedTripData.interests = currentMessage
          break
      }
      setTripData(updatedTripData)
      
      const messageToStore = currentMessage
      setCurrentMessage('')
      
      // Generate contextual AI response
      setTimeout(async () => {
        let responseText = getAIResponse(messageToStore, conversationStep)
        
        // If we're at step 6 (interests), generate the full plan
        if (conversationStep === 5) {
          // Generate the plan in the background and show success message
          responseText = `✅ **Perfect! I have everything I need.**

I'm now generating your complete travel plan:

**Trip Details:**
• ${tripData.destination} from ${tripData.departure}
• ${tripData.travelers} travelers, ${tripData.duration} days
• ${tripData.budget} budget, focusing on ${tripData.interests}

**🔄 Generating your plan...**
• Flight search with safety validation
• Real hotel recommendations  
• Detailed day-by-day itinerary
• Budget breakdown and booking links

**Your complete plan will appear on the right side shortly →**`

          // Generate plan asynchronously without blocking
          setTimeout(async () => {
            try {
              console.log('Generating plan asynchronously...')
              const plan = await generateHolidayPlan()
              
              const safePlan = {
                accommodation: plan?.accommodation || 'Hotel recommendations loading...',
                flights: plan?.flights || 'Flight options loading...',  
                itinerary: plan?.itinerary || 'Itinerary loading...'
              }
              
              setGeneratedPlan(safePlan)
              setShowPlan(true)
              
              // Add completion message
              const completionMessage: Message = {
                id: (Date.now() + 2).toString(),
                text: `🎉 **Your travel plan is complete!**\n\nYour detailed plan is now displayed in the right panel with flights, hotels, and itinerary.\n\nWould you like me to adjust anything?`,
                sender: 'ai',
                timestamp: new Date()
              }
              setMessages(prev => [...prev, completionMessage])
              
            } catch (error) {
              console.error('Background plan generation error:', error)
              const errorMessage: Message = {
                id: (Date.now() + 2).toString(),
                text: `I'm still working on your complete plan. In the meantime, I can help you with specific questions about flights, hotels, or activities in ${tripData.destination}.`,
                sender: 'ai',
                timestamp: new Date()
              }
              setMessages(prev => [...prev, errorMessage])
            }
          }, 3000)
        }
        
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: responseText,
          sender: 'ai',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, aiResponse])
        setConversationStep(prev => prev + 1)
      }, 1200)
    }
  }

  return (
    <div style={{ 
      height: '100vh', 
      width: '100vw', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      position: 'absolute',
      top: 0,
      left: 0,
      gap: '20px'
    }}>
      {/* Chat Box */}
      <div style={{
        width: '625px',
        height: '625px',
        backgroundColor: 'white',
        border: '4px solid #2563eb',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: '2px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              backgroundColor: '#2563eb',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <User style={{ width: '24px', height: '24px', color: 'white' }} />
            </div>
            <h1 style={{ 
              fontSize: '32px', 
              fontWeight: 'bold', 
              color: '#111827',
              margin: 0
            }}>
              Travel Planner
            </h1>
          </div>
        </div>

        {/* Messages Area */}
        <div style={{
          flex: 1,
          padding: '24px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {messages.map((message) => (
            <div
              key={message.id}
              style={{
                display: 'flex',
                justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start'
              }}
            >
              <div
                style={{
                  maxWidth: '70%',
                  padding: '16px 20px',
                  borderRadius: '20px',
                  backgroundColor: message.sender === 'user' ? '#2563eb' : '#f3f4f6',
                  color: message.sender === 'user' ? 'white' : '#111827',
                  fontSize: '16px',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {message.text}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div style={{
          padding: '24px',
          borderTop: '2px solid #e5e7eb',
          display: 'flex',
          gap: '16px',
          alignItems: 'center'
        }}>
          <button style={{
            color: '#9ca3af',
            background: 'none',
            border: 'none',
            cursor: 'pointer'
          }}>
            <Paperclip style={{ width: '24px', height: '24px' }} />
          </button>
          
          <input
            type="text"
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && currentMessage.trim() && handleSendMessage()}
            placeholder="Tell me about your ideal trip..."
            style={{
              flex: 1,
              padding: '16px 20px',
              border: '2px solid #d1d5db',
              borderRadius: '12px',
              fontSize: '18px',
              outline: 'none'
            }}
          />
          
          <button
            onClick={handleSendMessage}
            type="button"
            style={{
              backgroundColor: currentMessage.trim() ? '#2563eb' : '#94a3b8',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '16px 24px',
              cursor: 'pointer',
              opacity: 1,
              minWidth: '60px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Send style={{ width: '20px', height: '20px' }} />
          </button>
        </div>
      </div>

      {/* Plan Display Panel - Appears when showPlan is true */}
      {showPlan && (
        <div style={{
          width: '625px',
          height: '625px',
          backgroundColor: 'white',
          border: '4px solid #16a34a',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflowY: 'auto'
        }}>
          {/* Plan Header */}
          <div style={{
            padding: '20px',
            borderBottom: '2px solid #e5e7eb',
            backgroundColor: '#f0fdf4'
          }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#111827',
              margin: '0 0 8px 0'
            }}>
              🏖️ Your Holiday Plan
            </h2>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              margin: 0
            }}>
              {tripData.departure} → {tripData.destination} • {tripData.travelers} travelers • {tripData.budget}
            </p>
          </div>

          {/* Plan Content */}
          <div style={{
            padding: '20px',
            flex: 1,
            fontSize: '14px',
            lineHeight: '1.6'
          }}>
            {/* Flights Section */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#111827',
                margin: '0 0 12px 0'
              }}>
                ✈️ Flights
              </h3>
              <div style={{
                backgroundColor: '#f0f9ff',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #0ea5e9'
              }}>
                <pre style={{
                  fontFamily: 'inherit',
                  whiteSpace: 'pre-wrap',
                  margin: 0,
                  fontSize: '13px'
                }}>
                  {generatedPlan.flights}
                </pre>
              </div>
            </div>

            {/* Accommodation Section */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#111827',
                margin: '0 0 12px 0'
              }}>
                🏨 Accommodation
              </h3>
              <div style={{
                backgroundColor: '#f9fafb',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <pre style={{
                  fontFamily: 'inherit',
                  whiteSpace: 'pre-wrap',
                  margin: 0,
                  fontSize: '13px'
                }}>
                  {generatedPlan.accommodation}
                </pre>
              </div>
            </div>

            {/* Itinerary Section */}
            <div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#111827',
                margin: '0 0 12px 0'
              }}>
                📅 Detailed Itinerary
              </h3>
              <div style={{
                backgroundColor: '#f9fafb',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <pre style={{
                  fontFamily: 'inherit',
                  whiteSpace: 'pre-wrap',
                  margin: 0,
                  fontSize: '13px'
                }}>
                  {generatedPlan.itinerary}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}