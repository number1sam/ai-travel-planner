// Rule-Based Conversation API
// Implements the strict conversation rules for travel planning
// Never re-asks locked fields, always reads state first

import { NextRequest, NextResponse } from 'next/server'
import { RuleBasedConversationManager } from '../../../services/RuleBasedConversationManager'

// Global conversation managers (in production, use proper session management)
const conversationManagers = new Map<string, RuleBasedConversationManager>()

// POST: Process user message following strict rules
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { conversationId, message } = body
    
    if (!conversationId) {
      return NextResponse.json({ 
        error: 'conversationId is required' 
      }, { status: 400 })
    }

    // Handle empty messages
    if (!message || message.trim() === '') {
      return NextResponse.json({
        success: true,
        response: "I'd love to help you plan your trip! Where would you like to go?",
        needsConfirmation: false,
        canStartSearches: false,
        searchableFields: [],
        metadata: {
          conversationId,
          rulesFollowed: ['state_check_completed'],
          lockedFields: [],
          missingFields: ['all']
        }
      })
    }

    console.log(`🎯 Rule-based processing: ${conversationId} - "${message}"`)
    
    // Get or create conversation manager
    let manager = conversationManagers.get(conversationId)
    if (!manager) {
      manager = new RuleBasedConversationManager(conversationId)
      conversationManagers.set(conversationId, manager)
      console.log(`✨ Created rule-based manager for ${conversationId}`)
    }

    // Process input following the rules
    const result = await manager.processInput(message)
    
    // Get current state for metadata
    const tripState = manager.getTripState()
    const lockedFields = Object.entries(tripState)
      .filter(([_, field]) => field?.locked)
      .map(([name, _]) => name)
    
    const missingFields = Object.keys(manager['QUESTIONS']) // Access questions for missing fields check
      .filter(field => !tripState[field as keyof typeof tripState]?.locked)

    console.log(`✅ Rule-based response generated`)
    console.log(`📊 Locked: [${lockedFields.join(', ')}], Missing: [${missingFields.join(', ')}]`)
    
    return NextResponse.json({
      success: true,
      response: result.message,
      needsConfirmation: result.needsConfirmation,
      fieldToConfirm: result.fieldToConfirm,
      readbackValue: result.readbackValue,
      nextQuestion: result.nextQuestion,
      canStartSearches: result.canStartSearches,
      searchableFields: result.searchableFields,
      metadata: {
        conversationId,
        rulesFollowed: ['state_read_first', 'no_reask_locked', 'confirm_before_lock'],
        lockedFields,
        missingFields,
        readyForSearches: result.canStartSearches
      }
    })
    
  } catch (error) {
    console.error('❌ Rule-based conversation error:', error)
    return NextResponse.json({ 
      error: 'Failed to process conversation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET: Retrieve trip state and conversation status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')
    
    if (!conversationId) {
      return NextResponse.json({ 
        error: 'conversationId required' 
      }, { status: 400 })
    }
    
    const manager = conversationManagers.get(conversationId)
    
    if (!manager) {
      return NextResponse.json({
        conversationId,
        tripState: {},
        lockedFields: [],
        missingFields: Object.keys({
          travelDates: true,
          origin: true, 
          travelers: true,
          travelStyle: true,
          accommodation: true,
          activities: true,
          dietary: true,
          flights: true,
          transport: true,
          schedule: true,
          constraints: true,
          budgetCaps: true
        }),
        canStartSearches: false,
        searchableFields: []
      })
    }
    
    const tripState = manager.getTripState()
    const lockedFields = Object.entries(tripState)
      .filter(([_, field]) => field?.locked)
      .map(([name, field]) => ({
        name,
        value: field?.value,
        confirmedAt: field?.confirmedAt
      }))
    
    const missingFields = Object.keys(manager['QUESTIONS'])
      .filter(field => !tripState[field as keyof typeof tripState]?.locked)
    
    return NextResponse.json({
      conversationId,
      tripState,
      lockedFields,
      missingFields,
      canStartSearches: manager['canStartSearches'](), // Access private method for status
      searchableFields: manager['getSearchableFields']()
    })
    
  } catch (error) {
    console.error('❌ Error retrieving rule-based conversation:', error)
    return NextResponse.json({ 
      error: 'Failed to retrieve conversation state' 
    }, { status: 500 })
  }
}

// DELETE: Clear conversation and reset state
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
    
    console.log(`🗑️ Cleared rule-based conversation ${conversationId}`)
    
    return NextResponse.json({
      success: true,
      message: 'Conversation cleared, all fields unlocked'
    })
    
  } catch (error) {
    console.error('❌ Error clearing rule-based conversation:', error)
    return NextResponse.json({ 
      error: 'Failed to clear conversation' 
    }, { status: 500 })
  }
}

// Example of proper rule-following
export async function HEAD(request: NextRequest) {
  // Example response that shows the rule in action
  const example = {
    rule: "Before asking any question, the bot must read the current trip state. If a field is already filled and locked, the bot must not ask about it again.",
    example: {
      user: "I want to go to Paris",
      bot_reads_state: { locked: [], missing: ["all"] },
      bot_response: "I understand you want to visit Paris. Is this correct?",
      user_confirms: "Yes",
      bot_locks_field: "destination",
      next_response: "I already have your destination (Paris) locked. I won't re-ask that. Next, I need to set your travel window precisely, what are your exact dates and times?"
    }
  }
  
  return NextResponse.json(example)
}