// Intelligent Conversation API - ChatGPT-like conversation with web research
// Replaces fragmented conversation handlers with one unified system
// Maintains full context and researches ANY destination request

import { NextRequest, NextResponse } from 'next/server'
import { EnhancedUnifiedConversationManager } from '../../../services/EnhancedUnifiedConversationManager'
import { SystemInstructionsConversationManager } from '../../../services/SystemInstructionsConversationManager'
import { DatabaseOrchestrationService } from '../../../services/DatabaseOrchestrationService'
import DestinationResearchService from '../../../services/DestinationResearchService'
import DestinationDataService from '../../../services/DestinationDataService'
import ConversationPersistenceService from '../../../services/ConversationPersistenceService'
import { promises as fs } from 'fs'
import { join } from 'path'

// Itinerary generation function with real destination data
const generateItineraryFromContext = async (tripContext: any) => {
  const { destination, dates, budget, travelers, origin, preferences } = tripContext
  
  // Validate we have all required information
  const requiredFields = {
    destination: destination?.primary,
    duration: dates?.duration,
    budget: budget?.total,
    currency: budget?.currency,
    travelers: travelers?.adults,
    origin: origin,
    accommodation: preferences?.accommodation?.length,
    style: preferences?.style,
    interests: preferences?.interests?.length
  }
  
  const missingFields = Object.entries(requiredFields)
    .filter(([key, value]) => !value)
    .map(([key]) => key)
  
  if (missingFields.length > 0) {
    throw new Error(`Missing required information for itinerary generation: ${missingFields.join(', ')}`)
  }

  // Initialize destination data service
  const destinationDataService = new DestinationDataService()
  
  // Try to get real destination data first
  const realisticItinerary = destinationDataService.generateRealisticItinerary(tripContext)
  
  if (realisticItinerary) {
    console.log(`✅ Using real destination data for ${destination.primary}`)
    return realisticItinerary
  }
  
  console.log(`⚠️ No specific data for ${destination.primary}, using generic template`)
  // Fall back to generic generation for unknown destinations
  
  // Generate hotel recommendation
  const hotel = {
    name: `${destination.primary} Central Hotel`,
    location: `${destination.primary} City Center`,
    pricePerNight: Math.round(budget.total * 0.55 / dates.duration),
    rating: 4.2,
    amenities: ['Free WiFi', 'Breakfast Included', 'Fitness Center', 'Concierge'],
    description: `Perfectly located in the heart of ${destination.primary}, this hotel offers modern comfort and easy access to all major attractions.`
  }
  
  // Generate daily activities
  const days = []
  for (let dayNum = 1; dayNum <= dates.duration; dayNum++) {
    const isArrival = dayNum === 1
    const isDeparture = dayNum === dates.duration
    
    let activities = []
    
    if (isArrival) {
      activities = [
        {
          id: `arrival-${dayNum}`,
          name: `Arrival & Hotel Check-in`,
          type: 'logistics',
          time: '15:00',
          duration: 90,
          location: hotel.location,
          description: `Arrive in ${destination.primary} and check into ${hotel.name}. Take time to settle in and get oriented with the area.`,
          price: 0
        },
        {
          id: `welcome-dinner-${dayNum}`,
          name: `Welcome Dinner`,
          type: 'dining',
          time: '19:00',
          duration: 120,
          location: `Near ${hotel.name}`,
          description: `Start your ${destination.primary} adventure with a delicious local meal at a highly-rated restaurant within walking distance of your hotel.`,
          price: 35
        }
      ]
    } else if (isDeparture) {
      activities = [
        {
          id: `final-breakfast-${dayNum}`,
          name: `Final Breakfast`,
          type: 'dining',
          time: '08:00',
          duration: 60,
          location: hotel.name,
          description: `Enjoy your last breakfast at ${hotel.name} and take in the views of ${destination.primary} one final time.`,
          price: 20
        },
        {
          id: `checkout-${dayNum}`,
          name: `Hotel Checkout & Departure`,
          type: 'logistics',
          time: '11:00',
          duration: 120,
          location: hotel.location,
          description: `Check out from ${hotel.name} and prepare for your journey home. Consider last-minute souvenir shopping if time permits.`,
          price: 0
        }
      ]
    } else {
      // Full exploration day
      const morningActivity = preferences?.interests?.includes('History & Culture') ? 'Historic Walking Tour' : 
                             preferences?.interests?.includes('Nature & Outdoors') ? 'Scenic Park Visit' :
                             'City Highlights Tour'
      
      const afternoonActivity = preferences?.interests?.includes('Food & Dining') ? 'Local Food Experience' :
                               preferences?.interests?.includes('Shopping') ? 'Market & Shopping District' :
                               'Cultural Attractions'
      
      activities = [
        {
          id: `breakfast-${dayNum}`,
          name: `Hotel Breakfast`,
          type: 'dining',
          time: '08:00',
          duration: 60,
          location: hotel.name,
          description: `Start your day with a hearty breakfast at ${hotel.name} to fuel your exploration of ${destination.primary}.`,
          price: 20
        },
        {
          id: `morning-${dayNum}`,
          name: morningActivity,
          type: 'activity',
          time: '10:00',
          duration: 180,
          location: `${destination.primary} City Center`,
          description: `Explore the best of ${destination.primary} with a guided experience tailored to your interests. Just 10 minutes walk from ${hotel.name}.`,
          price: 45
        },
        {
          id: `lunch-${dayNum}`,
          name: `Local Lunch`,
          type: 'dining',
          time: '13:30',
          duration: 90,
          location: `${destination.primary} Historic District`,
          description: `Enjoy authentic local cuisine at a recommended restaurant in the heart of the city.`,
          price: 25
        },
        {
          id: `afternoon-${dayNum}`,
          name: afternoonActivity,
          type: 'activity',
          time: '15:30',
          duration: 150,
          location: `${destination.primary} Cultural Quarter`,
          description: `Continue your ${destination.primary} adventure with activities perfectly matched to your travel style and interests.`,
          price: 30
        },
        {
          id: `dinner-${dayNum}`,
          name: `Evening Dining`,
          type: 'dining',
          time: '19:00',
          duration: 120,
          location: `Near ${hotel.name}`,
          description: `End your day with a memorable dinner featuring the best of ${destination.primary}'s culinary scene.`,
          price: 40
        }
      ]
    }
    
    days.push({
      id: `day-${dayNum}`,
      date: new Date(Date.now() + (dayNum - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      activities
    })
  }
  
  // Calculate total cost
  const totalActivityCosts = days.reduce((sum, day) => 
    sum + day.activities.reduce((daySum, act) => daySum + act.price, 0), 0
  )
  const totalHotelCost = hotel.pricePerNight * dates.duration
  const totalCost = totalActivityCosts + totalHotelCost
  
  return {
    id: `itinerary-${Date.now()}`,
    title: `${dates.duration}-Day ${destination.primary} Adventure`,
    destination: destination.primary,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + dates.duration * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    totalDays: dates.duration,
    totalCost,
    travelers: travelers.adults,
    summary: `A carefully crafted ${dates.duration}-day journey through ${destination.primary}, perfectly tailored to your ${budget.currency}${budget.total} budget and ${preferences?.style || 'comfortable'} travel style.`,
    hotel,
    days,
    budgetBreakdown: {
      accommodation: totalHotelCost,
      activities: totalActivityCosts,
      remaining: Math.max(0, budget.total - totalCost)
    }
  }
}

// Persistent storage
const STORAGE_DIR = join(process.cwd(), '.intelligent-conversations')

const ensureStorageDir = async () => {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true })
  } catch (error) {
    // Directory already exists
  }
}

const saveConversation = async (conversationId: string, data: any) => {
  await ensureStorageDir()
  const filePath = join(STORAGE_DIR, `${conversationId}.json`)
  await fs.writeFile(filePath, JSON.stringify(data, null, 2))
}

const loadConversation = async (conversationId: string): Promise<any | null> => {
  try {
    await ensureStorageDir()
    const filePath = join(STORAGE_DIR, `${conversationId}.json`)
    const data = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    return null // Conversation doesn't exist yet
  }
}

// Configuration: Use database-persistent system or in-memory system
const USE_DATABASE_SYSTEM = process.env.USE_DATABASE_CONVERSATION === 'true'

// Global conversation managers (in production, use proper session management)
const conversationManagers = new Map<string, EnhancedUnifiedConversationManager>()
let dbConversationManager: SystemInstructionsConversationManager | null = null
let dbService: DatabaseOrchestrationService | null = null

// Initialize persistence service
const persistenceService = new ConversationPersistenceService()
persistenceService.initializeStorage() // Initialize storage on startup

// Initialize database system if enabled
const getDbConversationManager = (): SystemInstructionsConversationManager => {
  if (!dbConversationManager) {
    if (!dbService) {
      const config = {
        connectionString: process.env.DATABASE_URL || 'postgresql://travel_agent:travel_agent@localhost:5432/travel_agent_db',
        ssl: process.env.DATABASE_SSL === 'true'
      }
      dbService = new DatabaseOrchestrationService(config)
    }
    
    dbConversationManager = new SystemInstructionsConversationManager(dbService)
    console.log(`✨ Created database-persistent conversation manager`)
  }
  
  return dbConversationManager
}

// Initialize conversation manager for a session with state recovery
const getConversationManager = async (conversationId: string): Promise<EnhancedUnifiedConversationManager> => {
  if (conversationManagers.has(conversationId)) {
    return conversationManagers.get(conversationId)!
  }
  
  // Try to recover conversation from persistent storage
  const { conversationManager, recoveryMetadata } = await persistenceService.loadConversationState(conversationId)
  
  if (conversationManager && recoveryMetadata.isRecovered) {
    // Successfully recovered from persistent storage
    console.log(`🔄 Conversation ${conversationId} recovered from persistent storage`)
    console.log(`📊 Recovery: ${recoveryMetadata.lastAction} (${recoveryMetadata.missedDuration}s ago)`)
    
    // Inject research service
    const researchService = new DestinationResearchService()
    conversationManager.setResearchService(researchService)
    
    conversationManagers.set(conversationId, conversationManager)
    return conversationManager
  }
  
  // Create new conversation manager
  const manager = new EnhancedUnifiedConversationManager(conversationId)
  
  // Inject research service
  const researchService = new DestinationResearchService()
  manager.setResearchService(researchService)
  
  conversationManagers.set(conversationId, manager)
  console.log(`✨ Created new conversation manager for ${conversationId}`)
  return manager
}

// POST: Process user message with full context and research
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { conversationId, message } = body
    
    if (!conversationId) {
      return NextResponse.json({ 
        error: 'conversationId is required' 
      }, { status: 400 })
    }
    
    // Handle empty messages gracefully
    if (!message || message.trim() === '') {
      return NextResponse.json({
        success: true,
        response: "I'd love to help you plan your trip! Could you please tell me where you'd like to go? 🌍",
        conversationContext: {
          tripContext: {},
          messageCount: 0,
          hasResearchedDestinations: false,
          researchedPlaces: []
        },
        itinerary: null,
        metadata: {
          needsResearch: false,
          contextUpdates: {},
          itineraryGenerated: false
        }
      })
    }
    
    console.log(`💬 Processing message in conversation ${conversationId}: "${message}"`)
    console.log(`📊 Using ${USE_DATABASE_SYSTEM ? 'database-persistent' : 'in-memory enhanced'} conversation system`)
    
    let result: any
    let fullContext: any
    
    if (USE_DATABASE_SYSTEM) {
      // Use database-persistent system instructions compliant manager
      const dbManager = getDbConversationManager()
      result = await dbManager.processConversation(conversationId, message)
      
      // For database system, create simplified response structure
      console.log(`✅ Database-persistent response generated for ${conversationId}`)
      
      return NextResponse.json({
        success: true,
        response: result.response,
        conversationContext: {
          tripContext: {}, // Database system manages state internally
          messageCount: 1,
          hasResearchedDestinations: result.searchesTriggered?.length > 0,
          researchedPlaces: []
        },
        itinerary: null, // Database system doesn't generate itineraries in this endpoint
        metadata: {
          needsConfirmation: result.needsConfirmation,
          confirmationSlot: result.confirmationSlot,
          expectedNext: result.expectedNext,
          searchesTriggered: result.searchesTriggered,
          turnToken: result.metadata.turnToken,
          slotsUpdated: result.metadata.slotsUpdated,
          decisionsLogged: result.metadata.decisionsLogged
        }
      })
      
    } else {
      // Use in-memory enhanced conversation manager
      const conversationManager = await getConversationManager(conversationId)
      result = await conversationManager.processUserInput(message)
      fullContext = conversationManager.getFullContext()
      
      // Check if itinerary generation was requested (in-memory system only)
      let itinerary = null
      let finalResponse = result.response
      
      if (fullContext.tripBrief.intent?.current === 'generating_itinerary') {
        console.log('🚀 Generating itinerary for completed trip context...')
        
        try {
          // Generate itinerary using the trip brief
          itinerary = await generateItineraryFromContext(fullContext.tripBrief)
          
          // Process success message to update conversation state
          const successResult = await conversationManager.processUserInput('SYSTEM_ITINERARY_GENERATED')
        
        // Apply context updates from the system message (CRITICAL FIX)
        conversationManager.updateTripContext(successResult.contextUpdates)
        
        // Generate enhanced response with real hotel data
        const context = conversationManager.getFullContext().tripBrief
        const duration = context.dates?.duration?.value || 7
        const destination = context.destination?.primary?.value || 'your destination'
        const budget = context.budget?.total?.value || 0
        const currency = context.budget?.currency?.value || 'USD'
        const travelers = context.travelers?.adults?.value || 1
        const style = context.preferences?.travelStyle?.value || 'comfortable'
        
        finalResponse = `🎉 **Your ${duration}-day ${destination} itinerary is ready!**

🏨 **Hotel:** ${itinerary.hotel.name} - ${currency}${itinerary.hotel.pricePerNight}/night × ${duration} nights
📅 **All ${duration} days planned** with personalized activities matching your interests!
💰 **Total Budget:** ${currency}${budget} (optimally allocated)
🎯 **Tailored to:** ${style} travel style, ${travelers} traveler${travelers > 1 ? 's' : ''}

Your complete day-by-day itinerary is now available in the preview! Each day includes perfectly timed activities, dining recommendations, and seamless transitions between experiences. ✨`
        
        console.log('✅ Itinerary generated successfully!')
      } catch (error) {
        console.error('❌ Itinerary generation failed:', error)
        
        // Process error message and use error response
        const errorResult = await conversationManager.processUserInput('SYSTEM_ITINERARY_FAILED')
        
        // Apply context updates from the error system message
        conversationManager.updateTripContext(errorResult.contextUpdates)
        
        finalResponse = errorResult.response
        }
      }
      
      // Get updated conversation context (important for state changes)
      const updatedContext = conversationManager.getFullContext()
      
      // Save conversation state with persistence service for recovery
      try {
        await persistenceService.saveConversationState(conversationId, conversationManager)
      } catch (error) {
        console.error(`⚠️ Failed to persist conversation ${conversationId}:`, error)
        // Don't fail the request if persistence fails
      }
      
      // Legacy save for compatibility (remove when ready)
      await saveConversation(conversationId, {
        conversationId,
        messages: updatedContext.messages,
        tripContext: updatedContext.tripBrief, // Use tripBrief for legacy compatibility
        conversationSummary: updatedContext.conversationSummary,
        lastUpdated: new Date().toISOString()
      })
      
      // Log the interaction
      console.log(`✅ Response generated for ${conversationId}`)
      if (result.needsResearch) {
        console.log(`🔍 Research will be triggered for: "${result.researchQuery}"`)
      }
      
      return NextResponse.json({
        success: true,
        response: finalResponse,
        conversationContext: {
          tripContext: updatedContext.tripBrief, // Use tripBrief instead of tripContext for backward compatibility
          messageCount: updatedContext.messages.length,
          hasResearchedDestinations: updatedContext.tripBrief.destination?.researched?.length > 0,
          researchedPlaces: updatedContext.tripBrief.destination?.researched?.map(d => d.name) || []
        },
        itinerary: itinerary,
        metadata: {
          needsResearch: result.needsResearch,
          researchQuery: result.researchQuery,
          contextUpdates: result.contextUpdates,
          itineraryGenerated: !!itinerary
        }
      })
    }
    
  } catch (error) {
    console.error('❌ Intelligent conversation error:', error)
    return NextResponse.json({ 
      error: 'Failed to process conversation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET: Retrieve conversation context and history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')
    
    if (!conversationId) {
      return NextResponse.json({ 
        error: 'conversationId required' 
      }, { status: 400 })
    }
    
    // Load conversation
    const conversationData = await loadConversation(conversationId)
    
    if (!conversationData) {
      // Return empty conversation
      return NextResponse.json({
        conversationId,
        messages: [],
        tripContext: {},
        conversationSummary: "New conversation",
        lastUpdated: new Date().toISOString()
      })
    }
    
    return NextResponse.json(conversationData)
    
  } catch (error) {
    console.error('❌ Error retrieving conversation:', error)
    return NextResponse.json({ 
      error: 'Failed to retrieve conversation' 
    }, { status: 500 })
  }
}

// DELETE: Clear conversation history
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')
    
    if (!conversationId) {
      return NextResponse.json({ 
        error: 'conversationId required' 
      }, { status: 400 })
    }
    
    // Remove from memory
    conversationManagers.delete(conversationId)
    
    // Remove from persistent storage and all backups
    try {
      await persistenceService.deleteConversation(conversationId)
    } catch (error) {
      console.error(`⚠️ Failed to delete persistent conversation:`, error)
    }
    
    // Remove from legacy storage
    try {
      const filePath = join(STORAGE_DIR, `${conversationId}.json`)
      await fs.unlink(filePath)
    } catch (error) {
      // File doesn't exist - that's fine
    }
    
    console.log(`🗑️ Cleared conversation ${conversationId}`)
    
    return NextResponse.json({
      success: true,
      message: 'Conversation cleared'
    })
    
  } catch (error) {
    console.error('❌ Error clearing conversation:', error)
    return NextResponse.json({ 
      error: 'Failed to clear conversation' 
    }, { status: 500 })
  }
}