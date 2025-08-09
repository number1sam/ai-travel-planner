// Database-Aware Conversation Manager
// Following system instructions: integrates EnhancedUnifiedConversationManager with DatabaseOrchestrationService
// Provides persistent state management with single source of truth

import { EnhancedUnifiedConversationManager } from './EnhancedUnifiedConversationManager'
import { DatabaseOrchestrationService, TripSlot, TripSummary } from './DatabaseOrchestrationService'
import { TripBrief, createConstraint, Constraint } from '../types/TripBrief'
import { ConversationAnalysis } from './ConversationUnderstanding'

export interface DatabaseAwareResponse {
  response: string
  needsConfirmation: boolean
  confirmationSlot?: string
  expectsNext?: string
  searchTriggered?: string[]
  contextUpdates: any
  deepLinks: string[]
  metadata: {
    tripId: string
    turnToken: string
    slotsUpdated: string[]
    searchRequests: number[]
    decisionLogs: number
  }
}

export interface ConversationTurnResult {
  success: boolean
  response: DatabaseAwareResponse
  error?: string
}

export class DatabaseAwareConversationManager {
  private conversationManager: EnhancedUnifiedConversationManager
  private dbService: DatabaseOrchestrationService
  private tripId: string
  private turnCounter: number = 0
  
  constructor(
    tripId: string, 
    dbService: DatabaseOrchestrationService,
    userId?: string
  ) {
    this.tripId = tripId
    this.dbService = dbService
    this.conversationManager = new EnhancedUnifiedConversationManager(tripId)
    
    // Initialize trip in database
    this.initializeTrip(userId)
  }
  
  private async initializeTrip(userId?: string): Promise<void> {
    try {
      await this.dbService.ensureTrip(this.tripId, userId)
      console.log(`🗃️ Trip ${this.tripId} initialized in database`)
    } catch (error) {
      console.error(`❌ Failed to initialize trip ${this.tripId}:`, error)
    }
  }
  
  // Main conversation processing with database integration
  async processUserInput(userInput: string): Promise<ConversationTurnResult> {
    this.turnCounter++
    const turnToken = `${this.tripId}_turn_${this.turnCounter}_${Date.now()}`
    
    try {
      console.log(`🎯 Processing turn ${this.turnCounter} for trip ${this.tripId}`)
      console.log(`🔄 Turn token: ${turnToken}`)
      
      // Set turn token for idempotency
      this.dbService.setTurnToken(turnToken)
      
      // SINGLE SOURCE OF TRUTH: Load current trip state from database
      const tripState = await this.dbService.loadTripState(this.tripId)
      console.log(`📖 Loaded state: ${tripState.slots.length} slots, ${tripState.missingSlots.length} missing`)
      
      // Sync conversation manager with database state
      await this.syncConversationManagerWithDatabase(tripState)
      
      // Process input with enhanced conversation manager
      const conversationResult = await this.conversationManager.processUserInput(userInput)
      
      // NORMALIZE → CONFIRM → LOCK: Process conversation analysis
      const dbResponse = await this.processConversationAnalysis(
        conversationResult, 
        tripState,
        turnToken
      )
      
      console.log(`✅ Turn ${this.turnCounter} completed`)
      
      return {
        success: true,
        response: dbResponse
      }
      
    } catch (error) {
      console.error(`❌ Turn ${this.turnCounter} failed:`, error)
      
      // Log error to database
      await this.dbService.logDecision(
        this.tripId,
        'error',
        `Turn failed: ${error.message}`,
        { turn_token: turnToken, error: error.message }
      )
      
      return {
        success: false,
        response: {
          response: "I encountered an issue processing your request. Let me help you step by step. What would you like to plan?",
          needsConfirmation: false,
          contextUpdates: {},
          deepLinks: [],
          metadata: {
            tripId: this.tripId,
            turnToken,
            slotsUpdated: [],
            searchRequests: [],
            decisionLogs: 0
          }
        },
        error: error.message
      }
    }
  }
  
  // Sync in-memory conversation manager with database state
  private async syncConversationManagerWithDatabase(tripState: any): Promise<void> {
    console.log(`🔄 Syncing conversation manager with database state`)
    
    // Convert database slots to TripBrief format
    const tripBrief: Partial<TripBrief> = {
      id: this.tripId,
      version: 1,
      intent: {
        current: 'exploring',
        confidence: 50,
        context: 'Database sync'
      },
      conversationSummary: 'Synced from database',
      lastUpdated: new Date()
    }
    
    // Map database slots to trip brief constraints
    for (const slot of tripState.slots) {
      if (slot.filled) {
        const value = typeof slot.value === 'string' ? JSON.parse(slot.value) : slot.value
        
        switch (slot.slot_name) {
          case 'destination':
            tripBrief.destination = {
              type: value.type || 'city',
              primary: createConstraint(value.name || value, slot.locked ? 'hard' : 'soft', 90, 'database')
            }
            break
            
          case 'origin':
            tripBrief.origin = createConstraint(value.name || value, slot.locked ? 'hard' : 'soft', 90, 'database')
            break
            
          case 'dates_start':
            if (!tripBrief.dates) tripBrief.dates = {}
            tripBrief.dates.startDate = createConstraint(value.iso || value, slot.locked ? 'hard' : 'soft', 90, 'database')
            break
            
          case 'dates_end':
            if (!tripBrief.dates) tripBrief.dates = {}
            tripBrief.dates.endDate = createConstraint(value.iso || value, slot.locked ? 'hard' : 'soft', 90, 'database')
            // Calculate duration
            if (tripBrief.dates.startDate) {
              const start = new Date(tripBrief.dates.startDate.value)
              const end = new Date(value.iso || value)
              const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
              tripBrief.dates.duration = createConstraint(duration, slot.locked ? 'hard' : 'soft', 90, 'database')
            }
            break
            
          case 'travellers':
            tripBrief.travelers = {
              adults: createConstraint(value.adults || value, slot.locked ? 'hard' : 'soft', 90, 'database'),
              groupType: createConstraint(value.groupType || 'solo', slot.locked ? 'hard' : 'soft', 80, 'database')
            }
            break
            
          case 'budget_total':
            tripBrief.budget = {
              total: createConstraint(Math.round(value.amount_cents / 100) || value, slot.locked ? 'hard' : 'soft', 90, 'database'),
              currency: createConstraint(value.currency || 'USD', slot.locked ? 'hard' : 'soft', 90, 'database')
            }
            break
            
          case 'travel_style':
            if (!tripBrief.preferences) tripBrief.preferences = {}
            tripBrief.preferences.travelStyle = createConstraint(value, slot.locked ? 'hard' : 'soft', 90, 'database')
            break
        }
      }
    }
    
    // Update conversation manager with synced state
    this.conversationManager.updateTripContext(tripBrief)
  }
  
  // Process conversation analysis and update database
  private async processConversationAnalysis(
    conversationResult: any,
    tripState: any,
    turnToken: string
  ): Promise<DatabaseAwareResponse> {
    
    const slotsUpdated: string[] = []
    const searchRequests: number[] = []
    let decisionLogCount = 0
    
    console.log(`🧠 Processing analysis with intent: ${conversationResult.intent?.primary}`)
    
    // Extract and normalize new information
    const analysis = conversationResult.analysis || conversationResult
    
    // NORMALIZE → CONFIRM: Process detected entities
    const needsConfirmation = await this.processDetectedEntities(
      analysis, 
      tripState, 
      slotsUpdated,
      turnToken
    )
    
    // Determine next expected slot
    const expectsNext = this.determineNextExpectedSlot(tripState.missingSlots)
    
    // Check if searches should be triggered
    const searchTriggered = await this.checkAndTriggerSearches(tripState, searchRequests)
    
    // Generate response based on current state
    let response = conversationResult.response || "I understand. Let me help you plan your trip."
    let confirmationSlot = ''
    
    // Handle confirmation flow
    if (needsConfirmation && slotsUpdated.length > 0) {
      confirmationSlot = slotsUpdated[slotsUpdated.length - 1]
      response = await this.generateConfirmationResponse(confirmationSlot, tripState)
    } else if (expectsNext) {
      response = await this.generateNextSlotRequest(expectsNext, tripState)
    } else if (searchTriggered.length > 0) {
      response = await this.generateSearchTriggeredResponse(searchTriggered)
    }
    
    decisionLogCount = slotsUpdated.length + searchRequests.length + 1 // +1 for turn completion
    
    // Log turn completion
    await this.dbService.logDecision(
      this.tripId,
      'turn_completed',
      `Turn completed: ${slotsUpdated.length} slots updated, ${searchRequests.length} searches triggered`,
      {
        turn_token: turnToken,
        slots_updated: slotsUpdated,
        searches_triggered: searchTriggered,
        expects_next: expectsNext
      }
    )
    
    return {
      response,
      needsConfirmation,
      confirmationSlot,
      expectsNext,
      searchTriggered,
      contextUpdates: conversationResult.contextUpdates || {},
      deepLinks: conversationResult.deepLinks || [],
      metadata: {
        tripId: this.tripId,
        turnToken,
        slotsUpdated,
        searchRequests,
        decisionLogs: decisionLogCount
      }
    }
  }
  
  // Process detected entities from conversation analysis
  private async processDetectedEntities(
    analysis: ConversationAnalysis | any,
    tripState: any,
    slotsUpdated: string[],
    turnToken: string
  ): Promise<boolean> {
    
    let needsConfirmation = false
    
    // Process destinations
    if (analysis.normalizedData?.destinations?.length > 0) {
      const destination = analysis.normalizedData.destinations[0]
      
      // Normalize place name
      const place = await this.dbService.findPlaceByName(destination.normalized, destination.type)
      
      const normalizedValue = {
        name: destination.normalized,
        type: destination.type,
        confidence: destination.confidence,
        place_id: place?.id
      }
      
      await this.dbService.upsertTripSlot(this.tripId, 'destination', normalizedValue, true, false)
      slotsUpdated.push('destination')
      needsConfirmation = true
    }
    
    // Process dates
    if (analysis.normalizedData?.dates) {
      const dates = analysis.normalizedData.dates
      
      if (dates.startDate) {
        const normalizedValue = {
          iso: dates.startDate,
          confidence: dates.confidence
        }
        
        await this.dbService.upsertTripSlot(this.tripId, 'dates_start', normalizedValue, true, false)
        slotsUpdated.push('dates_start')
        needsConfirmation = true
      }
      
      if (dates.endDate) {
        const normalizedValue = {
          iso: dates.endDate,
          confidence: dates.confidence
        }
        
        await this.dbService.upsertTripSlot(this.tripId, 'dates_end', normalizedValue, true, false)
        slotsUpdated.push('dates_end')
        needsConfirmation = true
      } else if (dates.duration && dates.startDate) {
        // Calculate end date from start date + duration
        const startDate = new Date(dates.startDate)
        const endDate = new Date(startDate.getTime() + (dates.duration * 24 * 60 * 60 * 1000))
        
        const normalizedValue = {
          iso: endDate.toISOString().split('T')[0],
          confidence: dates.confidence,
          inferred: true
        }
        
        await this.dbService.upsertTripSlot(this.tripId, 'dates_end', normalizedValue, true, false)
        slotsUpdated.push('dates_end')
        needsConfirmation = true
      }
    }
    
    // Process travelers
    if (analysis.normalizedData?.travelers) {
      const travelers = analysis.normalizedData.travelers
      
      const normalizedValue = {
        adults: travelers.adults,
        groupType: travelers.groupType,
        confidence: travelers.confidence
      }
      
      await this.dbService.upsertTripSlot(this.tripId, 'travellers', normalizedValue, true, false)
      slotsUpdated.push('travellers')
      needsConfirmation = true
    }
    
    // Process budget
    if (analysis.normalizedData?.budget?.total > 0) {
      const budget = analysis.normalizedData.budget
      
      const normalizedValue = {
        amount_cents: budget.total * 100, // Convert to cents
        currency: budget.currency,
        confidence: budget.confidence,
        source: budget.source
      }
      
      await this.dbService.upsertTripSlot(this.tripId, 'budget_total', normalizedValue, true, false)
      await this.dbService.upsertBudget(this.tripId, budget.currency, budget.total * 100)
      
      slotsUpdated.push('budget_total')
      needsConfirmation = true
    }
    
    // Process travel style
    if (analysis.normalizedData?.preferences?.travelStyle) {
      const style = analysis.normalizedData.preferences.travelStyle
      
      await this.dbService.upsertTripSlot(this.tripId, 'travel_style', style, true, false)
      slotsUpdated.push('travel_style')
      needsConfirmation = true
    }
    
    return needsConfirmation
  }
  
  // Determine next expected slot based on missing slots
  private determineNextExpectedSlot(missingSlots: string[]): string | undefined {
    const slotPriority = [
      'destination',
      'dates_start', 
      'dates_end',
      'travellers',
      'budget_total',
      'travel_style'
    ]
    
    for (const slot of slotPriority) {
      if (missingSlots.includes(slot)) {
        return slot
      }
    }
    
    return undefined
  }
  
  // Check prerequisites and trigger searches
  private async checkAndTriggerSearches(
    tripState: any, 
    searchRequests: number[]
  ): Promise<string[]> {
    
    const searchTriggered: string[] = []
    
    // Check hotel search
    const hotelCheck = await this.dbService.canSearchDomain(this.tripId, 'hotels')
    if (hotelCheck.canSearch) {
      const requestId = await this.dbService.createSearchRequest(
        this.tripId, 
        'hotels', 
        { 
          destination: tripState.summary?.destination_raw,
          checkin: tripState.summary?.start_iso,
          checkout: tripState.summary?.end_iso
        }
      )
      
      searchRequests.push(requestId)
      searchTriggered.push('hotels')
      
      // Simulate hotel search results
      await this.simulateHotelSearch(requestId)
    }
    
    // Check activity search
    const activityCheck = await this.dbService.canSearchDomain(this.tripId, 'activities')
    if (activityCheck.canSearch) {
      const requestId = await this.dbService.createSearchRequest(
        this.tripId, 
        'activities', 
        {
          destination: tripState.summary?.destination_raw,
          start_date: tripState.summary?.start_iso,
          end_date: tripState.summary?.end_iso
        }
      )
      
      searchRequests.push(requestId)
      searchTriggered.push('activities')
      
      // Simulate activity search results
      await this.simulateActivitySearch(requestId)
    }
    
    return searchTriggered
  }
  
  // Generate confirmation response
  private async generateConfirmationResponse(slotName: string, tripState: any): Promise<string> {
    const slotLabels = {
      'destination': 'destination',
      'dates_start': 'start date',
      'dates_end': 'end date',
      'travellers': 'travelers',
      'budget_total': 'budget',
      'travel_style': 'travel style'
    }
    
    const label = slotLabels[slotName] || slotName
    const slot = tripState.slots.find(s => s.slot_name === slotName)
    
    if (slot && slot.value) {
      const value = typeof slot.value === 'string' ? JSON.parse(slot.value) : slot.value
      
      switch (slotName) {
        case 'destination':
          return `Perfect! I understand you want to visit ${value.name}. Is that correct?`
          
        case 'dates_start':
          return `Great! Your trip starts on ${value.iso}. Is this correct?`
          
        case 'dates_end':
          return `Excellent! Your trip ends on ${value.iso}. Does this look right?`
          
        case 'budget_total':
          return `Got it! Your budget is ${value.currency} ${Math.round(value.amount_cents / 100)}. Is this correct?`
          
        case 'travel_style':
          return `Perfect! You prefer ${value} style travel. Is that right?`
          
        default:
          return `I've noted your ${label}. Please confirm this is correct.`
      }
    }
    
    return `I've updated your ${label}. Is this correct?`
  }
  
  // Generate next slot request
  private async generateNextSlotRequest(nextSlot: string, tripState: any): Promise<string> {
    const prompts = {
      'destination': "Where would you like to go? Tell me about your destination.",
      'dates_start': "When would you like to start your trip?",
      'dates_end': "When would you like your trip to end?",
      'travellers': "How many people will be traveling?",
      'budget_total': "What's your budget for this trip?",
      'travel_style': "What's your preferred travel style? (budget, mid-range, luxury, or mixed)"
    }
    
    return prompts[nextSlot] || "What else can I help you plan?"
  }
  
  // Generate search triggered response
  private async generateSearchTriggeredResponse(searchTriggered: string[]): Promise<string> {
    if (searchTriggered.length === 1) {
      return `Excellent! I'm now searching for ${searchTriggered[0]} that match your requirements. Let me find the best options for you.`
    } else if (searchTriggered.length > 1) {
      return `Perfect! I have all the information I need. I'm now searching for ${searchTriggered.join(' and ')} that fit your trip perfectly.`
    }
    
    return "I'm working on finding the perfect options for your trip."
  }
  
  // Handle user confirmation (yes/no responses)
  async processConfirmation(userInput: string, slotName: string): Promise<ConversationTurnResult> {
    const isConfirmation = /^(yes|yeah|yep|correct|right|exactly|that's right|absolutely)$/i.test(userInput.trim())
    
    if (isConfirmation) {
      // Lock the slot
      await this.dbService.lockTripSlot(this.tripId, slotName as any)
      
      // Check if this triggers invalidation
      await this.dbService.invalidateDependentData(this.tripId, slotName)
      
      // Continue conversation
      return this.processUserInput('continue')
    } else {
      // Ask for correction
      return this.processUserInput(`Please provide the correct ${slotName}`)
    }
  }
  
  // Simulate hotel search (replace with real provider integration)
  private async simulateHotelSearch(requestId: number): Promise<void> {
    const mockOffers = [
      {
        hotels_cached_id: 1,
        provider_id: 1,
        checkin: '2025-09-01',
        checkout: '2025-09-07',
        guests: 2,
        rooms_json: { room_type: 'standard_double', count: 1 },
        total_price_cents: 85000, // $850 for 6 nights
        currency: 'USD',
        availability: true,
        distance_meters: 500,
        policies: { cancellation: 'free_24h', deposit: false },
        score_breakdown: { price: 85, location: 95, reviews: 88, policy: 92, total: 90 }
      }
    ]
    
    await this.dbService.saveHotelOffers(this.tripId, requestId, mockOffers)
  }
  
  // Simulate activity search (replace with real provider integration)
  private async simulateActivitySearch(requestId: number): Promise<void> {
    const mockOffers = [
      {
        activities_cached_id: 1,
        provider_id: 2,
        activity_date: '2025-09-02',
        price_cents: 4500, // $45
        currency: 'USD',
        slots_json: { times: ['10:00', '14:00'], duration: 180 },
        availability: true,
        distance_meters: 800,
        score_breakdown: { price: 80, location: 85, reviews: 90, fit: 95, total: 88 }
      }
    ]
    
    await this.dbService.saveActivityOffers(this.tripId, requestId, mockOffers)
  }
  
  // Get trip summary for external use
  async getTripSummary(): Promise<TripSummary | null> {
    const state = await this.dbService.loadTripState(this.tripId)
    return state.summary
  }
  
  // Get decision history for debugging
  async getDecisionHistory(limit: number = 20): Promise<any[]> {
    return this.dbService.getDecisionHistory(this.tripId, limit)
  }
  
  // Health check
  async healthCheck(): Promise<any> {
    return this.dbService.healthCheck()
  }
}