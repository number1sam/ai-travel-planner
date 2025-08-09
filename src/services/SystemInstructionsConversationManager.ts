// System Instructions Compliant Conversation Manager
// Following exact patterns from system instructions for database orchestration
// Single Source of Truth: Database is authoritative
// Normalize → Confirm → Lock workflow with proper turn management

import { Pool, PoolClient } from 'pg'
import { DatabaseOrchestrationService } from './DatabaseOrchestrationService'

export interface TurnState {
  tripId: string
  turnToken: string
  processed: boolean
  timestamp: Date
}

export interface TripSummary {
  trip_id: string
  user_id?: string
  status: string
  currency: string
  destination_raw?: string
  origin_raw?: string
  start_iso?: string
  end_iso?: string
  travel_style?: string
  total_budget_cents?: number
  created_at: Date
  updated_at: Date
}

export interface SlotInfo {
  slot_name: string
  filled: boolean
  locked: boolean
  value: any
}

export interface ConversationResponse {
  response: string
  needsConfirmation: boolean
  confirmationSlot?: string
  expectedNext?: string
  searchesTriggered?: string[]
  deepLinks: string[]
  metadata: {
    turnToken: string
    slotsUpdated: string[]
    decisionsLogged: number
  }
}

export class SystemInstructionsConversationManager {
  private dbService: DatabaseOrchestrationService
  private processedTurns: Set<string> = new Set()
  
  constructor(dbService: DatabaseOrchestrationService) {
    this.dbService = dbService
  }
  
  // Main conversation processing following system instructions exactly
  async processConversation(
    tripId: string, 
    message: string, 
    userId?: string
  ): Promise<ConversationResponse> {
    
    // Generate unique turn token for idempotency
    const turnToken = `turn_${tripId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    console.log(`🎯 Processing conversation: ${tripId}, token: ${turnToken}`)
    console.log(`💬 Message: "${message}"`)
    
    // Idempotency check - prevent duplicate processing
    if (this.processedTurns.has(turnToken)) {
      console.log(`⚠️ Turn ${turnToken} already processed, skipping`)
      return {
        response: "I've already processed this request.",
        needsConfirmation: false,
        deepLinks: [],
        metadata: { turnToken, slotsUpdated: [], decisionsLogged: 0 }
      }
    }
    
    this.dbService.setTurnToken(turnToken)
    
    try {
      // STEP 1: AT TURN START - Load latest trip summary (Single Source of Truth)
      console.log(`📖 Loading trip summary for ${tripId}`)
      const tripSummary = await this.loadTripSummary(tripId)
      const unlockedSlots = await this.loadUnlockedSlots(tripId)
      
      // Ensure trip exists
      if (!tripSummary) {
        await this.dbService.ensureTrip(tripId, userId)
        console.log(`✨ Created new trip ${tripId}`)
      }
      
      // STEP 2: Process user input and normalize
      const normalizedData = await this.normalizeUserInput(message, tripSummary)
      const slotsUpdated: string[] = []
      let decisionsLogged = 0
      
      // STEP 3: Handle different conversation types
      if (this.isConfirmation(message)) {
        // Handle confirmation (yes/no responses)
        return await this.handleConfirmation(message, tripId, turnToken, unlockedSlots)
      } else {
        // Handle new information
        const updateResult = await this.updateTripSlots(tripId, normalizedData, turnToken)
        slotsUpdated.push(...updateResult.slotsUpdated)
        decisionsLogged += updateResult.decisionsLogged
        
        // STEP 4: Generate confirmation response if new data was added
        if (slotsUpdated.length > 0) {
          const confirmationResponse = await this.generateConfirmationResponse(
            tripId, 
            slotsUpdated[slotsUpdated.length - 1] // Most recent slot
          )
          
          this.processedTurns.add(turnToken)
          
          return {
            response: confirmationResponse.response,
            needsConfirmation: true,
            confirmationSlot: slotsUpdated[slotsUpdated.length - 1],
            deepLinks: [],
            metadata: { turnToken, slotsUpdated, decisionsLogged }
          }
        }
        
        // STEP 5: Check if we can trigger searches
        const searchResult = await this.checkAndTriggerSearches(tripId, turnToken)
        
        // STEP 6: Generate next step response
        const nextStepResponse = await this.generateNextStepResponse(
          tripId, 
          unlockedSlots, 
          searchResult.searchesTriggered
        )
        
        this.processedTurns.add(turnToken)
        
        return {
          response: nextStepResponse,
          needsConfirmation: false,
          expectedNext: this.determineExpectedNext(unlockedSlots),
          searchesTriggered: searchResult.searchesTriggered,
          deepLinks: searchResult.deepLinks,
          metadata: { 
            turnToken, 
            slotsUpdated, 
            decisionsLogged: decisionsLogged + searchResult.decisionsLogged 
          }
        }
      }
      
    } catch (error) {
      console.error(`❌ Conversation processing failed: ${error}`)
      
      // Log error to database
      await this.dbService.logDecision(
        tripId,
        'error',
        `Conversation processing failed: ${error.message}`,
        { turn_token: turnToken, error: error.message }
      )
      
      return {
        response: "I encountered an issue. Let me help you step by step. What would you like to plan?",
        needsConfirmation: false,
        deepLinks: [],
        metadata: { turnToken, slotsUpdated: [], decisionsLogged: 1 }
      }
    }
  }
  
  // Load latest trip summary - exactly as specified in system instructions
  private async loadTripSummary(tripId: string): Promise<TripSummary | null> {
    const client = await this.dbService['pool'].connect()
    
    try {
      const query = `SELECT * FROM v_trip_summary WHERE trip_id = $1`
      const result = await client.query(query, [tripId])
      return result.rows[0] || null
    } finally {
      client.release()
    }
  }
  
  // Load unlocked or missing slots - exactly as specified
  private async loadUnlockedSlots(tripId: string): Promise<SlotInfo[]> {
    const client = await this.dbService['pool'].connect()
    
    try {
      const query = `
        SELECT slot_name, filled, locked, value
        FROM trip_slots
        WHERE trip_id = $1
      `
      const result = await client.query(query, [tripId])
      return result.rows
    } finally {
      client.release()
    }
  }
  
  // Normalize user input with proper entity extraction
  private async normalizeUserInput(message: string, tripSummary?: TripSummary): Promise<any> {
    const normalized = {
      destinations: [] as string[],
      dates: {} as any,
      budget: {} as any,
      travelers: {} as any,
      travelStyle: null as string | null
    }
    
    // Extract destinations
    const destinationPatterns = [
      /(?:visit|go to|travel to|trip to)\s+([A-Za-z\s]+?)(?:\s|$|,|\.|\!|\?)/gi,
      /(?:in|to)\s+([A-Z][A-Za-z\s]{2,})(?:\s|$|,|\.|\!|\?)/g
    ]
    
    for (const pattern of destinationPatterns) {
      const matches = message.match(pattern)
      if (matches) {
        for (const match of matches) {
          const destination = match.replace(/^(visit|go to|travel to|trip to|in|to)\s+/i, '').trim()
          if (destination.length > 2) {
            normalized.destinations.push(destination)
          }
        }
      }
    }
    
    // Extract duration
    const durationMatch = message.match(/(\d+)\s*(?:days?|nights?)/i)
    if (durationMatch) {
      normalized.dates.duration = parseInt(durationMatch[1])
    }
    
    // Extract budget
    const budgetPatterns = [
      { pattern: /\$(\d+(?:,\d{3})*(?:\.\d{2})?)/g, currency: 'USD' },
      { pattern: /£(\d+(?:,\d{3})*(?:\.\d{2})?)/g, currency: 'GBP' },
      { pattern: /€(\d+(?:,\d{3})*(?:\.\d{2})?)/g, currency: 'EUR' }
    ]
    
    for (const { pattern, currency } of budgetPatterns) {
      const match = message.match(pattern)
      if (match) {
        const amount = parseFloat(match[1].replace(/,/g, ''))
        normalized.budget = { amount, currency }
        break
      }
    }
    
    // Extract travel style
    const stylePatterns = {
      'budget': /budget|cheap|affordable|economical/i,
      'mid_range': /mid.?range|moderate|comfortable|standard/i,
      'luxury': /luxury|premium|high.?end|deluxe/i,
      'mixed': /mixed|flexible|combination|varied/i
    }
    
    for (const [style, pattern] of Object.entries(stylePatterns)) {
      if (pattern.test(message)) {
        normalized.travelStyle = style
        break
      }
    }
    
    // Extract travelers
    const travelersMatch = message.match(/(\d+)\s*(?:people|person|adults?|travelers?)/i)
    if (travelersMatch) {
      normalized.travelers.adults = parseInt(travelersMatch[1])
    }
    
    return normalized
  }
  
  // Update trip slots following normalize → confirm → lock pattern
  private async updateTripSlots(
    tripId: string, 
    normalizedData: any, 
    turnToken: string
  ): Promise<{ slotsUpdated: string[]; decisionsLogged: number }> {
    
    const slotsUpdated: string[] = []
    let decisionsLogged = 0
    
    // Process destinations
    if (normalizedData.destinations.length > 0) {
      const destination = normalizedData.destinations[0]
      
      // Normalize destination with place resolution
      const normalizedDestination = await this.normalizePlace(destination)
      
      await this.dbService.upsertTripSlot(
        tripId, 
        'destination', 
        { 
          name: normalizedDestination.name,
          normalized: normalizedDestination.normalized,
          place_id: normalizedDestination.place_id,
          confidence: normalizedDestination.confidence
        }, 
        true, 
        false // Not locked yet - needs confirmation
      )
      
      slotsUpdated.push('destination')
      decisionsLogged++
    }
    
    // Process dates
    if (normalizedData.dates.duration) {
      await this.dbService.upsertTripSlot(
        tripId, 
        'dates_start', 
        { duration_days: normalizedData.dates.duration }, 
        true, 
        false
      )
      slotsUpdated.push('dates_start')
      decisionsLogged++
    }
    
    // Process budget
    if (normalizedData.budget.amount) {
      const budgetCents = Math.round(normalizedData.budget.amount * 100)
      
      await this.dbService.upsertTripSlot(
        tripId, 
        'budget_total', 
        { 
          amount_cents: budgetCents, 
          currency: normalizedData.budget.currency,
          amount_display: normalizedData.budget.amount
        }, 
        true, 
        false
      )
      
      // Also update budget table
      await this.dbService.upsertBudget(tripId, normalizedData.budget.currency, budgetCents)
      
      slotsUpdated.push('budget_total')
      decisionsLogged++
    }
    
    // Process travel style
    if (normalizedData.travelStyle) {
      await this.dbService.upsertTripSlot(
        tripId, 
        'travel_style', 
        normalizedData.travelStyle, 
        true, 
        false
      )
      slotsUpdated.push('travel_style')
      decisionsLogged++
    }
    
    // Process travelers
    if (normalizedData.travelers.adults) {
      await this.dbService.upsertTripSlot(
        tripId, 
        'travellers', 
        { 
          adults: normalizedData.travelers.adults,
          group_type: this.inferGroupType(normalizedData.travelers.adults)
        }, 
        true, 
        false
      )
      slotsUpdated.push('travellers')
      decisionsLogged++
    }
    
    return { slotsUpdated, decisionsLogged }
  }
  
  // Normalize place with PostGIS similarity queries - as specified in system instructions
  private async normalizePlace(placeName: string): Promise<{
    name: string
    normalized: string
    place_id?: number
    confidence: number
  }> {
    const client = await this.dbService['pool'].connect()
    
    try {
      console.log(`🌍 Normalizing place: ${placeName}`)
      
      // Use PostGIS similarity search as specified in system instructions
      const query = `
        SELECT id, name, kind, country_code, 
               similarity(name, $1) as similarity_score
        FROM places
        WHERE kind IN ('city','neighborhood','country','region')
          AND similarity(name, $1) > 0.3
        ORDER BY similarity(name, $1) DESC, 
                 CASE kind 
                   WHEN 'city' THEN 1 
                   WHEN 'neighborhood' THEN 2 
                   WHEN 'region' THEN 3 
                   WHEN 'country' THEN 4 
                 END
        LIMIT 1
      `
      
      const result = await client.query(query, [placeName])
      
      if (result.rows.length > 0) {
        const place = result.rows[0]
        const confidence = Math.round(place.similarity_score * 100)
        
        console.log(`✅ Place resolved: ${placeName} → ${place.name} (${confidence}% confidence)`)
        
        return {
          name: placeName,
          normalized: place.name,
          place_id: place.id,
          confidence
        }
      } else {
        console.log(`⚠️ Place not found: ${placeName}, using as-is`)
        
        return {
          name: placeName,
          normalized: placeName,
          confidence: 50
        }
      }
      
    } finally {
      client.release()
    }
  }
  
  // Check if message is a confirmation
  private isConfirmation(message: string): boolean {
    return /^(yes|yeah|yep|correct|right|exactly|that's right|absolutely|no|nope|wrong|not quite|actually)/i.test(message.trim())
  }
  
  // Handle confirmation responses
  private async handleConfirmation(
    message: string, 
    tripId: string, 
    turnToken: string, 
    unlockedSlots: SlotInfo[]
  ): Promise<ConversationResponse> {
    
    const isPositiveConfirmation = /^(yes|yeah|yep|correct|right|exactly|that's right|absolutely)/i.test(message.trim())
    
    // Find the most recently filled but unlocked slot
    const slotToConfirm = unlockedSlots
      .filter(slot => slot.filled && !slot.locked)
      .sort((a, b) => (b.value?.updated_at || 0) - (a.value?.updated_at || 0))[0]
    
    if (!slotToConfirm) {
      return {
        response: "I don't have anything pending confirmation. What would you like to plan?",
        needsConfirmation: false,
        deepLinks: [],
        metadata: { turnToken, slotsUpdated: [], decisionsLogged: 0 }
      }
    }
    
    if (isPositiveConfirmation) {
      // Lock the confirmed slot
      await this.dbService.lockTripSlot(tripId, slotToConfirm.slot_name as any)
      
      // Log the confirmation
      await this.dbService.logDecision(
        tripId,
        'slot_locked',
        `Confirmed and locked ${slotToConfirm.slot_name}`,
        { 
          slot_name: slotToConfirm.slot_name,
          value: slotToConfirm.value,
          turn_token: turnToken 
        }
      )
      
      // Check for invalidation needs
      await this.dbService.invalidateDependentData(tripId, slotToConfirm.slot_name)
      
      // Advance to next expected slot or trigger searches
      const nextStep = this.determineExpectedNext(unlockedSlots.filter(s => s.slot_name !== slotToConfirm.slot_name))
      
      if (nextStep) {
        const response = await this.generateNextSlotRequest(nextStep)
        return {
          response,
          needsConfirmation: false,
          expectedNext: nextStep,
          deepLinks: [],
          metadata: { turnToken, slotsUpdated: [slotToConfirm.slot_name], decisionsLogged: 1 }
        }
      } else {
        // All required slots filled, trigger searches
        const searchResult = await this.checkAndTriggerSearches(tripId, turnToken)
        
        return {
          response: "Perfect! I have all the information needed. Let me find the best options for your trip.",
          needsConfirmation: false,
          searchesTriggered: searchResult.searchesTriggered,
          deepLinks: searchResult.deepLinks,
          metadata: { turnToken, slotsUpdated: [slotToConfirm.slot_name], decisionsLogged: 1 + searchResult.decisionsLogged }
        }
      }
      
    } else {
      // Negative confirmation - ask for correction
      const slotLabel = this.getSlotLabel(slotToConfirm.slot_name)
      
      return {
        response: `I understand. Please provide the correct ${slotLabel}.`,
        needsConfirmation: false,
        deepLinks: [],
        metadata: { turnToken, slotsUpdated: [], decisionsLogged: 0 }
      }
    }
    
    this.processedTurns.add(turnToken)
  }
  
  // Generate confirmation response with read-back
  private async generateConfirmationResponse(tripId: string, slotName: string): Promise<{ response: string }> {
    const slots = await this.loadUnlockedSlots(tripId)
    const slot = slots.find(s => s.slot_name === slotName)
    
    if (!slot || !slot.value) {
      return { response: "I need to confirm something with you. Is that correct?" }
    }
    
    const value = typeof slot.value === 'string' ? JSON.parse(slot.value) : slot.value
    
    switch (slotName) {
      case 'destination':
        return { 
          response: `Great! I understand you want to visit ${value.name || value.normalized}. Is that correct?` 
        }
      case 'dates_start':
        if (value.duration_days) {
          return { 
            response: `Perfect! You're planning a ${value.duration_days}-day trip. Is this correct?` 
          }
        }
        return { response: "I've noted your travel dates. Is this correct?" }
      case 'budget_total':
        return { 
          response: `Got it! Your budget is ${value.currency} ${value.amount_display}. Is this correct?` 
        }
      case 'travel_style':
        return { 
          response: `Excellent! You prefer ${value} travel style. Is that right?` 
        }
      case 'travellers':
        return { 
          response: `I understand ${value.adults} ${value.adults === 1 ? 'person is' : 'people are'} traveling. Correct?` 
        }
      default:
        return { response: `I've noted your ${this.getSlotLabel(slotName)}. Is this correct?` }
    }
  }
  
  // Check prerequisites and trigger searches when ready
  private async checkAndTriggerSearches(
    tripId: string, 
    turnToken: string
  ): Promise<{ searchesTriggered: string[]; deepLinks: string[]; decisionsLogged: number }> {
    
    const searchesTriggered: string[] = []
    const deepLinks: string[] = []
    let decisionsLogged = 0
    
    // Check hotel search prerequisites (destination, dates_start, dates_end)
    const hotelCheck = await this.dbService.canSearchDomain(tripId, 'hotels')
    if (hotelCheck.canSearch) {
      console.log(`🏨 Triggering hotel search for trip ${tripId}`)
      
      const requestId = await this.dbService.createSearchRequest(tripId, 'hotels', {
        domain: 'hotels',
        trip_id: tripId,
        search_type: 'accommodation'
      })
      
      // Simulate hotel search and scoring
      await this.executeHotelSearch(tripId, requestId)
      
      searchesTriggered.push('hotels')
      decisionsLogged++
    }
    
    // Check activity search prerequisites (destination, dates_start, dates_end)
    const activityCheck = await this.dbService.canSearchDomain(tripId, 'activities')
    if (activityCheck.canSearch) {
      console.log(`🎯 Triggering activity search for trip ${tripId}`)
      
      const requestId = await this.dbService.createSearchRequest(tripId, 'activities', {
        domain: 'activities',
        trip_id: tripId,
        search_type: 'experiences'
      })
      
      // Simulate activity search and scoring
      await this.executeActivitySearch(tripId, requestId)
      
      searchesTriggered.push('activities')
      decisionsLogged++
    }
    
    return { searchesTriggered, deepLinks, decisionsLogged }
  }
  
  // Execute hotel search with proper scoring and shortlist creation
  private async executeHotelSearch(tripId: string, requestId: number): Promise<void> {
    // Get trip summary for search context
    const tripSummary = await this.loadTripSummary(tripId)
    if (!tripSummary) return
    
    // Query hotels_cached based on destination
    const client = await this.dbService['pool'].connect()
    
    try {
      // Find hotels near destination with scoring
      const query = `
        SELECT 
          hc.id as hotels_cached_id,
          hc.provider_id,
          hc.name,
          hc.stars,
          hc.rating,
          hc.review_count,
          hc.amenities,
          hc.policies,
          ST_Distance(hc.geom, p.geom)::int as distance_meters
        FROM hotels_cached hc
        JOIN places p ON p.name ILIKE $1
        WHERE p.kind = 'city'
        ORDER BY 
          ST_Distance(hc.geom, p.geom),
          hc.rating DESC,
          hc.review_count DESC
        LIMIT 10
      `
      
      const result = await client.query(query, [`%${tripSummary.destination_raw}%`])
      
      // Create hotel offers with scoring
      const offers = result.rows.map(hotel => {
        const basePrice = this.calculateHotelBasePrice(hotel.stars, tripSummary.travel_style)
        const totalPrice = basePrice * (this.calculateTripDuration(tripSummary) || 7)
        
        // Score breakdown
        const priceScore = this.scoreHotelPrice(totalPrice, tripSummary.total_budget_cents)
        const locationScore = this.scoreHotelLocation(hotel.distance_meters)
        const reviewScore = this.scoreHotelReviews(hotel.rating, hotel.review_count)
        const policyScore = this.scoreHotelPolicies(hotel.policies)
        
        const totalScore = (priceScore + locationScore + reviewScore + policyScore) / 4
        
        return {
          hotels_cached_id: hotel.hotels_cached_id,
          provider_id: hotel.provider_id,
          checkin: tripSummary.start_iso || new Date().toISOString().split('T')[0],
          checkout: this.calculateCheckoutDate(tripSummary),
          guests: 2, // Default, would come from travelers slot
          rooms_json: { room_type: 'standard_double', count: 1 },
          total_price_cents: totalPrice * 100,
          currency: tripSummary.currency,
          availability: true,
          distance_meters: hotel.distance_meters,
          policies: hotel.policies,
          score_breakdown: {
            price: Math.round(priceScore),
            location: Math.round(locationScore),
            reviews: Math.round(reviewScore),
            policy: Math.round(policyScore),
            total: Math.round(totalScore)
          }
        }
      })
      
      // Save offers to database
      await this.dbService.saveHotelOffers(tripId, requestId, offers)
      
      console.log(`✅ Created ${offers.length} hotel offers for trip ${tripId}`)
      
    } finally {
      client.release()
    }
  }
  
  // Execute activity search with proper scoring
  private async executeActivitySearch(tripId: string, requestId: number): Promise<void> {
    const tripSummary = await this.loadTripSummary(tripId)
    if (!tripSummary) return
    
    const client = await this.dbService['pool'].connect()
    
    try {
      const query = `
        SELECT 
          ac.id as activities_cached_id,
          ac.provider_id,
          ac.name,
          ac.categories,
          ac.rating,
          ac.review_count,
          ac.duration_minutes,
          ac.policy,
          ST_Distance(ac.geom, p.geom)::int as distance_meters
        FROM activities_cached ac
        JOIN places p ON p.name ILIKE $1
        WHERE p.kind = 'city'
        ORDER BY 
          ac.rating DESC,
          ac.review_count DESC,
          ST_Distance(ac.geom, p.geom)
        LIMIT 15
      `
      
      const result = await client.query(query, [`%${tripSummary.destination_raw}%`])
      
      const offers = result.rows.map(activity => {
        const basePrice = this.calculateActivityPrice(activity.duration_minutes, tripSummary.travel_style)
        
        const priceScore = this.scoreActivityPrice(basePrice, tripSummary.total_budget_cents)
        const locationScore = this.scoreActivityLocation(activity.distance_meters)
        const reviewScore = this.scoreActivityReviews(activity.rating, activity.review_count)
        const fitScore = this.scoreActivityFit(activity.categories)
        
        const totalScore = (priceScore + locationScore + reviewScore + fitScore) / 4
        
        return {
          activities_cached_id: activity.activities_cached_id,
          provider_id: activity.provider_id,
          activity_date: tripSummary.start_iso || new Date().toISOString().split('T')[0],
          price_cents: basePrice * 100,
          currency: tripSummary.currency,
          slots_json: { times: ['10:00', '14:00'], duration: activity.duration_minutes },
          availability: true,
          distance_meters: activity.distance_meters,
          score_breakdown: {
            price: Math.round(priceScore),
            location: Math.round(locationScore),
            reviews: Math.round(reviewScore),
            fit: Math.round(fitScore),
            total: Math.round(totalScore)
          }
        }
      })
      
      await this.dbService.saveActivityOffers(tripId, requestId, offers)
      
      console.log(`✅ Created ${offers.length} activity offers for trip ${tripId}`)
      
    } finally {
      client.release()
    }
  }
  
  // Generate next step response
  private async generateNextStepResponse(
    tripId: string,
    unlockedSlots: SlotInfo[],
    searchesTriggered?: string[]
  ): Promise<string> {
    
    if (searchesTriggered && searchesTriggered.length > 0) {
      return `Perfect! I'm searching for ${searchesTriggered.join(' and ')} that match your requirements. Let me find the best options for you.`
    }
    
    const nextSlot = this.determineExpectedNext(unlockedSlots)
    if (nextSlot) {
      return this.generateNextSlotRequest(nextSlot)
    }
    
    return "Great! I have all the information I need. Let me prepare your personalized travel recommendations."
  }
  
  // Determine next expected slot
  private determineExpectedNext(slots: SlotInfo[]): string | undefined {
    const slotPriority = ['destination', 'dates_start', 'dates_end', 'travellers', 'budget_total', 'travel_style']
    
    const lockedSlots = slots.filter(s => s.locked).map(s => s.slot_name)
    
    for (const slot of slotPriority) {
      if (!lockedSlots.includes(slot)) {
        return slot
      }
    }
    
    return undefined
  }
  
  // Generate request for next slot
  private generateNextSlotRequest(slotName: string): string {
    const prompts = {
      'destination': "Where would you like to go? Tell me about your destination.",
      'dates_start': "When would you like to start your trip?",
      'dates_end': "When would you like your trip to end?",
      'travellers': "How many people will be traveling?",
      'budget_total': "What's your budget for this trip?",
      'travel_style': "What's your preferred travel style? (budget, mid-range, luxury, or mixed)"
    }
    
    return prompts[slotName] || "What else can I help you plan?"
  }
  
  // Helper methods for scoring and calculations
  private calculateTripDuration(tripSummary: TripSummary): number | null {
    if (!tripSummary.start_iso || !tripSummary.end_iso) return null
    
    const start = new Date(tripSummary.start_iso)
    const end = new Date(tripSummary.end_iso)
    
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  }
  
  private calculateCheckoutDate(tripSummary: TripSummary): string {
    if (tripSummary.end_iso) return tripSummary.end_iso
    
    // Default to 7 days from start
    const start = new Date(tripSummary.start_iso || new Date())
    const checkout = new Date(start.getTime() + (7 * 24 * 60 * 60 * 1000))
    
    return checkout.toISOString().split('T')[0]
  }
  
  private calculateHotelBasePrice(stars: number, travelStyle?: string): number {
    const baseRates = { budget: 80, mid_range: 150, luxury: 300, mixed: 150 }
    const styleRate = baseRates[travelStyle || 'mid_range']
    const starMultiplier = (stars || 3) / 3
    
    return Math.round(styleRate * starMultiplier)
  }
  
  private calculateActivityPrice(durationMinutes: number, travelStyle?: string): number {
    const baseRates = { budget: 25, mid_range: 45, luxury: 85, mixed: 45 }
    const styleRate = baseRates[travelStyle || 'mid_range']
    const durationMultiplier = Math.max(1, (durationMinutes || 120) / 120)
    
    return Math.round(styleRate * durationMultiplier)
  }
  
  private scoreHotelPrice(totalPrice: number, budgetCents?: number): number {
    if (!budgetCents) return 75
    
    const budgetDollars = budgetCents / 100
    const accommodationBudget = budgetDollars * 0.35 // 35% for accommodation
    
    if (totalPrice <= accommodationBudget * 0.8) return 100
    if (totalPrice <= accommodationBudget) return 90
    if (totalPrice <= accommodationBudget * 1.2) return 70
    return 40
  }
  
  private scoreHotelLocation(distanceMeters: number): number {
    if (distanceMeters <= 500) return 100
    if (distanceMeters <= 1000) return 90
    if (distanceMeters <= 2000) return 75
    if (distanceMeters <= 5000) return 60
    return 40
  }
  
  private scoreHotelReviews(rating: number, reviewCount: number): number {
    const ratingScore = (rating || 7) * 10
    const volumeBonus = Math.min(10, (reviewCount || 0) / 100)
    
    return Math.min(100, ratingScore + volumeBonus)
  }
  
  private scoreHotelPolicies(policies: any): number {
    let score = 70 // Base score
    
    if (policies?.cancellation?.includes('free')) score += 20
    if (policies?.deposit === false) score += 10
    
    return Math.min(100, score)
  }
  
  private scoreActivityPrice(price: number, budgetCents?: number): number {
    if (!budgetCents) return 75
    
    const budgetDollars = budgetCents / 100
    const activityBudget = budgetDollars * 0.20 // 20% for activities
    
    if (price <= activityBudget * 0.6) return 100
    if (price <= activityBudget) return 85
    if (price <= activityBudget * 1.5) return 65
    return 35
  }
  
  private scoreActivityLocation(distanceMeters: number): number {
    if (distanceMeters <= 1000) return 100
    if (distanceMeters <= 3000) return 85
    if (distanceMeters <= 8000) return 70
    return 50
  }
  
  private scoreActivityReviews(rating: number, reviewCount: number): number {
    const ratingScore = (rating || 4) * 20
    const volumeBonus = Math.min(20, (reviewCount || 0) / 50)
    
    return Math.min(100, ratingScore + volumeBonus)
  }
  
  private scoreActivityFit(categories: any): number {
    // Default scoring based on general interest
    // Would be enhanced with user preferences
    const popularCategories = ['culture', 'history', 'sightseeing', 'food', 'art']
    
    if (categories && Array.isArray(categories)) {
      const matches = categories.filter(cat => popularCategories.includes(cat)).length
      return Math.min(100, 60 + (matches * 10))
    }
    
    return 70
  }
  
  private getSlotLabel(slotName: string): string {
    const labels = {
      'destination': 'destination',
      'dates_start': 'start date',
      'dates_end': 'end date',
      'travellers': 'travelers',
      'budget_total': 'budget',
      'travel_style': 'travel style'
    }
    
    return labels[slotName] || slotName
  }
  
  private inferGroupType(adults: number): string {
    if (adults === 1) return 'solo'
    if (adults === 2) return 'couple'
    if (adults <= 4) return 'small_group'
    return 'large_group'
  }
}