// Database-Aware Conversation API
// Integrates DatabaseAwareConversationManager with robust state persistence
// Follows system instructions for travel planner with database orchestration

import { NextRequest, NextResponse } from 'next/server'
import { SystemInstructionsConversationManager } from '../../../services/SystemInstructionsConversationManager'
import { DatabaseOrchestrationService } from '../../../services/DatabaseOrchestrationService'

// Global manager for session management (system instructions compliant)
let conversationManager: SystemInstructionsConversationManager | null = null
let dbService: DatabaseOrchestrationService | null = null

// Initialize database service
const getDbService = (): DatabaseOrchestrationService => {
  if (!dbService) {
    const config = {
      connectionString: process.env.DATABASE_URL || 'postgresql://travel_agent:travel_agent@localhost:5432/travel_agent_db',
      ssl: process.env.DATABASE_SSL === 'true'
    }
    
    dbService = new DatabaseOrchestrationService(config)
    console.log('🗃️ Database orchestration service initialized')
  }
  
  return dbService
}

// Get or create system instructions compliant conversation manager
const getConversationManager = (): SystemInstructionsConversationManager => {
  if (!conversationManager) {
    const dbSvc = getDbService()
    conversationManager = new SystemInstructionsConversationManager(dbSvc)
    console.log(`✨ Created system instructions compliant conversation manager`)
  }
  
  return conversationManager
}

// POST: Process user message with database persistence
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tripId, message, userId } = body
    
    if (!tripId) {
      return NextResponse.json({ 
        error: 'tripId is required' 
      }, { status: 400 })
    }
    
    // Handle empty messages
    if (!message || message.trim() === '') {
      return NextResponse.json({
        success: true,
        response: {
          response: "I'd love to help you plan your trip! Where would you like to go? 🌍",
          needsConfirmation: false,
          expectsNext: 'destination',
          contextUpdates: {},
          deepLinks: [],
          metadata: {
            tripId,
            turnToken: `${tripId}_empty_${Date.now()}`,
            slotsUpdated: [],
            searchRequests: [],
            decisionLogs: 0
          }
        }
      })
    }
    
    console.log(`💬 Processing system instructions compliant message for trip ${tripId}: "${message}"`)
    
    // Get conversation manager
    const manager = getConversationManager()
    
    // Process conversation following system instructions exactly
    const result = await manager.processConversation(tripId, message, userId)
    
    console.log(`✅ System instructions compliant response generated for trip ${tripId}`)
    console.log(`📊 Metadata: ${result.metadata.slotsUpdated.length} slots updated, ${result.metadata.decisionsLogged} decisions logged`)
    
    return NextResponse.json({
      success: true,
      response: result.response,
      needsConfirmation: result.needsConfirmation,
      confirmationSlot: result.confirmationSlot,
      expectedNext: result.expectedNext,
      searchesTriggered: result.searchesTriggered,
      deepLinks: result.deepLinks,
      metadata: result.metadata
    })
    
  } catch (error) {
    console.error('❌ Database-aware conversation error:', error)
    return NextResponse.json({ 
      error: 'Failed to process conversation with database',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET: Retrieve trip state and history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tripId = searchParams.get('tripId')
    
    if (!tripId) {
      return NextResponse.json({ 
        error: 'tripId required' 
      }, { status: 400 })
    }
    
    const dbSvc = getDbService()
    
    // Load trip state
    const tripState = await dbSvc.loadTripState(tripId)
    
    // Get decision history
    const decisionHistory = await dbSvc.getDecisionHistory(tripId, 20)
    
    console.log(`📖 Retrieved trip state for ${tripId}: ${tripState.slots.length} slots, ${decisionHistory.length} decisions`)
    
    return NextResponse.json({
      tripId,
      summary: tripState.summary,
      slots: tripState.slots,
      preferences: tripState.preferences,
      constraints: tripState.constraints,
      budget: tripState.budget,
      missingSlots: tripState.missingSlots,
      decisionHistory: decisionHistory.slice(0, 10), // Return recent decisions
      metadata: {
        slotsCount: tripState.slots.length,
        missingCount: tripState.missingSlots.length,
        decisionCount: decisionHistory.length
      }
    })
    
  } catch (error) {
    console.error('❌ Error retrieving trip state:', error)
    return NextResponse.json({ 
      error: 'Failed to retrieve trip state',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// DELETE: Clear trip state
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tripId = searchParams.get('tripId')
    
    if (!tripId) {
      return NextResponse.json({ 
        error: 'tripId required' 
      }, { status: 400 })
    }
    
    // Clear conversation manager state (in production, implement proper session management)
    conversationManager = null
    
    // In a real implementation, you might want to soft-delete or archive trips
    // For now, we'll just remove from memory and log the deletion
    const dbSvc = getDbService()
    await dbSvc.logDecision(
      tripId,
      'trip_deleted',
      'Trip conversation cleared',
      { timestamp: new Date().toISOString() }
    )
    
    console.log(`🗑️ Cleared trip conversation ${tripId}`)
    
    return NextResponse.json({
      success: true,
      message: 'Trip conversation cleared'
    })
    
  } catch (error) {
    console.error('❌ Error clearing trip:', error)
    return NextResponse.json({ 
      error: 'Failed to clear trip' 
    }, { status: 500 })
  }
}

// Health check endpoint
export async function HEAD(request: NextRequest) {
  try {
    const dbSvc = getDbService()
    const health = await dbSvc.healthCheck()
    
    if (health.status === 'healthy') {
      return new NextResponse(null, { status: 200 })
    } else {
      return new NextResponse(null, { status: 503 })
    }
    
  } catch (error) {
    return new NextResponse(null, { status: 503 })
  }
}