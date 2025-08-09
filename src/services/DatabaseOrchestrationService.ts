// Database Orchestration Service
// Following system instructions: travel planner with database orchestration
// Integrates with EnhancedUnifiedConversationManager to provide persistent state management

import { Pool, PoolClient } from 'pg'
import { TripBrief, Constraint } from '../types/TripBrief'

export interface DatabaseConfig {
  connectionString: string
  ssl?: boolean
}

export interface TripSlot {
  slot_name: 'destination' | 'origin' | 'dates_start' | 'dates_end' | 'travellers' | 'budget_total' | 'budget_daily' | 'travel_style'
  value: any
  filled: boolean
  locked: boolean
  updated_at: Date
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

export interface PlaceResult {
  id: number
  name: string
  kind: string
  country_code?: string
  geom?: any
  timezone?: string
  parent_place_id?: number
}

export interface HotelOffer {
  id: number
  trip_id: string
  hotels_cached_id: number
  provider_id?: number
  checkin: string
  checkout: string
  guests: number
  rooms_json: any
  total_price_cents: number
  currency: string
  availability: boolean
  distance_meters?: number
  policies: any
  score_breakdown: any
  created_at: Date
}

export interface ActivityOffer {
  id: number
  trip_id: string
  activities_cached_id: number
  provider_id?: number
  activity_date: string
  price_cents: number
  currency: string
  slots_json: any
  availability: boolean
  distance_meters?: number
  score_breakdown: any
  created_at: Date
}

export interface SearchRequest {
  id: number
  trip_id: string
  domain: 'hotels' | 'activities' | 'restaurants' | 'flights' | 'transport' | 'geocode'
  params: any
  requested_at: Date
  request_hash: string
}

export interface DecisionLog {
  id: number
  trip_id: string
  event_type: string
  message: string
  meta: any
  created_at: Date
}

export class DatabaseOrchestrationService {
  private pool: Pool
  private turnToken: string = ''
  
  constructor(config: DatabaseConfig) {
    this.pool = new Pool({
      connectionString: config.connectionString,
      ssl: config.ssl
    })
    
    this.pool.on('error', (err) => {
      console.error('Database pool error:', err)
    })
  }
  
  // Single Source of Truth: Load current trip state at turn start
  async loadTripState(tripId: string): Promise<{
    summary: TripSummary | null
    slots: TripSlot[]
    preferences: any
    constraints: any[]
    budget: any
    missingSlots: string[]
  }> {
    const client = await this.pool.connect()
    
    try {
      console.log(`📖 Loading trip state for ${tripId}`)
      
      // Load trip summary
      const summaryQuery = `
        SELECT * FROM v_trip_summary 
        WHERE trip_id = $1
      `
      const summaryResult = await client.query(summaryQuery, [tripId])
      const summary = summaryResult.rows[0] || null
      
      // Load slots
      const slotsQuery = `
        SELECT slot_name, filled, locked, value, updated_at
        FROM trip_slots
        WHERE trip_id = $1
        ORDER BY slot_name
      `
      const slotsResult = await client.query(slotsQuery, [tripId])
      const slots = slotsResult.rows
      
      // Load preferences
      const prefsQuery = `
        SELECT * FROM trip_preferences 
        WHERE trip_id = $1
      `
      const prefsResult = await client.query(prefsQuery, [tripId])
      const preferences = prefsResult.rows[0] || {}
      
      // Load constraints
      const constraintsQuery = `
        SELECT * FROM trip_constraints 
        WHERE trip_id = $1
        ORDER BY created_at
      `
      const constraintsResult = await client.query(constraintsQuery, [tripId])
      const constraints = constraintsResult.rows
      
      // Load budget
      const budgetQuery = `
        SELECT * FROM budgets 
        WHERE trip_id = $1
      `
      const budgetResult = await client.query(budgetQuery, [tripId])
      const budget = budgetResult.rows[0] || {}
      
      // Identify missing slots
      const missingSlots = slots
        .filter(slot => !slot.filled || !slot.locked)
        .map(slot => slot.slot_name)
      
      console.log(`✅ Loaded trip state: ${slots.length} slots, ${constraints.length} constraints, ${missingSlots.length} missing`)
      
      return {
        summary,
        slots,
        preferences,
        constraints,
        budget,
        missingSlots
      }
      
    } finally {
      client.release()
    }
  }
  
  // Idempotency: Set unique turn token to prevent duplicate operations
  setTurnToken(token: string): void {
    this.turnToken = token
    console.log(`🔄 Set turn token: ${token}`)
  }
  
  // Normalize → Confirm → Lock: Update trip slots
  async upsertTripSlot(
    tripId: string, 
    slotName: TripSlot['slot_name'], 
    value: any, 
    filled: boolean = true,
    locked: boolean = false
  ): Promise<void> {
    const client = await this.pool.connect()
    
    try {
      console.log(`💾 Upserting slot ${slotName} for trip ${tripId}`)
      
      const query = `
        INSERT INTO trip_slots (trip_id, slot_name, value, filled, locked, updated_at)
        VALUES ($1, $2, $3, $4, $5, now())
        ON CONFLICT (trip_id, slot_name) 
        DO UPDATE SET 
          value = EXCLUDED.value,
          filled = EXCLUDED.filled,
          locked = EXCLUDED.locked,
          updated_at = now()
      `
      
      await client.query(query, [tripId, slotName, JSON.stringify(value), filled, locked])
      
      // Log the slot update
      if (locked) {
        await this.logDecision(
          tripId, 
          'slot_locked', 
          `Locked ${slotName}`, 
          { value, turn_token: this.turnToken }
        )
      } else {
        await this.logDecision(
          tripId, 
          'slot_filled', 
          `Filled ${slotName}`, 
          { value, turn_token: this.turnToken }
        )
      }
      
    } finally {
      client.release()
    }
  }
  
  // Lock a slot after user confirmation
  async lockTripSlot(tripId: string, slotName: TripSlot['slot_name']): Promise<void> {
    const client = await this.pool.connect()
    
    try {
      console.log(`🔒 Locking slot ${slotName} for trip ${tripId}`)
      
      const query = `
        UPDATE trip_slots 
        SET locked = TRUE, updated_at = now()
        WHERE trip_id = $1 AND slot_name = $2
      `
      
      await client.query(query, [tripId, slotName])
      
      await this.logDecision(
        tripId, 
        'slot_locked', 
        `Locked ${slotName}`, 
        { turn_token: this.turnToken }
      )
      
    } finally {
      client.release()
    }
  }
  
  // Create or get trip
  async ensureTrip(tripId: string, userId?: string): Promise<void> {
    const client = await this.pool.connect()
    
    try {
      const query = `
        INSERT INTO trips (id, user_id, status, currency, created_at, updated_at)
        VALUES ($1, $2, 'draft', 'USD', now(), now())
        ON CONFLICT (id) DO NOTHING
      `
      
      await client.query(query, [tripId, userId])
      
    } finally {
      client.release()
    }
  }
  
  // Place normalization and geocoding
  async findPlaceByName(name: string, kind?: string): Promise<PlaceResult | null> {
    const client = await this.pool.connect()
    
    try {
      console.log(`🌍 Finding place: ${name}${kind ? ` (${kind})` : ''}`)
      
      let query = `
        SELECT id, name, kind, country_code, timezone, parent_place_id
        FROM places
        WHERE name ILIKE $1
      `
      const params = [`%${name}%`]
      
      if (kind) {
        query += ` AND kind = $2`
        params.push(kind)
      }
      
      query += `
        ORDER BY similarity(name, $1) DESC
        LIMIT 1
      `
      
      const result = await client.query(query, params)
      return result.rows[0] || null
      
    } finally {
      client.release()
    }
  }
  
  // Create search request for auditing
  async createSearchRequest(
    tripId: string, 
    domain: SearchRequest['domain'], 
    params: any
  ): Promise<number> {
    const client = await this.pool.connect()
    
    try {
      console.log(`🔍 Creating search request: ${domain} for trip ${tripId}`)
      
      const requestHash = this.generateHash(JSON.stringify(params))
      
      const query = `
        INSERT INTO search_requests (trip_id, domain, params, requested_at, request_hash)
        VALUES ($1, $2, $3, now(), $4)
        RETURNING id
      `
      
      const result = await client.query(query, [
        tripId, 
        domain, 
        JSON.stringify(params), 
        requestHash
      ])
      
      const requestId = result.rows[0].id
      
      await this.logDecision(
        tripId, 
        'search_run', 
        `Executed ${domain} search`, 
        { request_id: requestId, params, turn_token: this.turnToken }
      )
      
      return requestId
      
    } finally {
      client.release()
    }
  }
  
  // Hotel search and offer management
  async saveHotelOffers(
    tripId: string, 
    requestId: number,
    offers: Partial<HotelOffer>[]
  ): Promise<void> {
    const client = await this.pool.connect()
    
    try {
      console.log(`🏨 Saving ${offers.length} hotel offers for trip ${tripId}`)
      
      // First, clear existing offers for this trip and date range
      await client.query(`
        DELETE FROM hotel_offers 
        WHERE trip_id = $1
      `, [tripId])
      
      // Insert new offers
      for (const offer of offers) {
        const query = `
          INSERT INTO hotel_offers (
            trip_id, hotels_cached_id, provider_id, checkin, checkout, guests,
            rooms_json, total_price_cents, currency, availability, distance_meters, 
            policies, score_breakdown, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, now())
        `
        
        await client.query(query, [
          tripId,
          offer.hotels_cached_id,
          offer.provider_id,
          offer.checkin,
          offer.checkout,
          offer.guests,
          JSON.stringify(offer.rooms_json || {}),
          offer.total_price_cents,
          offer.currency,
          offer.availability ?? true,
          offer.distance_meters,
          JSON.stringify(offer.policies || {}),
          JSON.stringify(offer.score_breakdown || {})
        ])
      }
      
      // Log search results
      await client.query(`
        INSERT INTO search_results (request_id, item_type, score, snapshot, created_at)
        VALUES ($1, 'hotel', 1.0, $2, now())
      `, [requestId, JSON.stringify({ count: offers.length })])
      
    } finally {
      client.release()
    }
  }
  
  // Activity search and offer management
  async saveActivityOffers(
    tripId: string, 
    requestId: number,
    offers: Partial<ActivityOffer>[]
  ): Promise<void> {
    const client = await this.pool.connect()
    
    try {
      console.log(`🎯 Saving ${offers.length} activity offers for trip ${tripId}`)
      
      // Clear existing offers
      await client.query(`
        DELETE FROM activity_offers 
        WHERE trip_id = $1
      `, [tripId])
      
      // Insert new offers
      for (const offer of offers) {
        const query = `
          INSERT INTO activity_offers (
            trip_id, activities_cached_id, provider_id, activity_date, price_cents,
            currency, slots_json, availability, distance_meters, score_breakdown, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
        `
        
        await client.query(query, [
          tripId,
          offer.activities_cached_id,
          offer.provider_id,
          offer.activity_date,
          offer.price_cents,
          offer.currency,
          JSON.stringify(offer.slots_json || {}),
          offer.availability ?? true,
          offer.distance_meters,
          JSON.stringify(offer.score_breakdown || {})
        ])
      }
      
      // Log search results
      await client.query(`
        INSERT INTO search_results (request_id, item_type, score, snapshot, created_at)
        VALUES ($1, 'activity', 1.0, $2, now())
      `, [requestId, JSON.stringify({ count: offers.length })])
      
    } finally {
      client.release()
    }
  }
  
  // Budget management
  async upsertBudget(
    tripId: string, 
    currency: string, 
    totalBudgetCents: number,
    allocations?: any
  ): Promise<void> {
    const client = await this.pool.connect()
    
    try {
      console.log(`💰 Upserting budget for trip ${tripId}: ${totalBudgetCents} ${currency}`)
      
      // Calculate per-day and per-meal from trip duration
      const slotsResult = await client.query(`
        SELECT value FROM trip_slots 
        WHERE trip_id = $1 AND slot_name IN ('dates_start', 'dates_end')
      `, [tripId])
      
      let perDayCents = Math.round(totalBudgetCents / 7) // Default to 7 days
      let perMealCents = Math.round(perDayCents / 3)
      
      // If we have actual dates, calculate real duration
      if (slotsResult.rows.length >= 2) {
        const startDate = new Date(JSON.parse(slotsResult.rows[0].value).iso)
        const endDate = new Date(JSON.parse(slotsResult.rows[1].value).iso)
        const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        
        if (duration > 0) {
          perDayCents = Math.round(totalBudgetCents / duration)
          perMealCents = Math.round(perDayCents * 0.3 / 3) // 30% for food, divided by 3 meals
        }
      }
      
      const query = `
        INSERT INTO budgets (trip_id, currency, total_budget_cents, per_day_cents, per_meal_cents, allocations)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (trip_id) DO UPDATE
        SET currency = EXCLUDED.currency,
            total_budget_cents = EXCLUDED.total_budget_cents,
            per_day_cents = EXCLUDED.per_day_cents,
            per_meal_cents = EXCLUDED.per_meal_cents,
            allocations = EXCLUDED.allocations
      `
      
      await client.query(query, [
        tripId,
        currency,
        totalBudgetCents,
        perDayCents,
        perMealCents,
        JSON.stringify(allocations || {})
      ])
      
      await this.logDecision(
        tripId, 
        'budget_set', 
        `Set budget to ${totalBudgetCents} ${currency}`, 
        { per_day: perDayCents, per_meal: perMealCents, turn_token: this.turnToken }
      )
      
    } finally {
      client.release()
    }
  }
  
  // Transfer management - always save primary + backup
  async saveTransfer(
    tripId: string,
    fromPlaceId: number,
    toPlaceId: number,
    departAt: Date,
    arriveBy: Date,
    primaryRoute: any,
    backupRoute: any,
    notes?: any
  ): Promise<void> {
    const client = await this.pool.connect()
    
    try {
      console.log(`🚗 Saving transfer for trip ${tripId}: place ${fromPlaceId} → ${toPlaceId}`)
      
      const query = `
        INSERT INTO transfers (
          trip_id, from_place_id, to_place_id, depart_at, arrive_by,
          primary_route, backup_route, notes, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
      `
      
      await client.query(query, [
        tripId,
        fromPlaceId,
        toPlaceId,
        departAt,
        arriveBy,
        JSON.stringify(primaryRoute),
        JSON.stringify(backupRoute),
        JSON.stringify(notes || {})
      ])
      
      await this.logDecision(
        tripId, 
        'transfer_saved', 
        `Saved transfer with primary and backup routes`, 
        { 
          from_place_id: fromPlaceId, 
          to_place_id: toPlaceId,
          turn_token: this.turnToken 
        }
      )
      
    } finally {
      client.release()
    }
  }
  
  // Invalidation when locked fields change
  async invalidateDependentData(tripId: string, changedSlot: string): Promise<void> {
    const client = await this.pool.connect()
    
    try {
      console.log(`🔄 Invalidating dependent data for slot change: ${changedSlot}`)
      
      const invalidationMap = {
        'destination': ['hotel_offers', 'activity_offers', 'transfers'],
        'dates_start': ['hotel_offers', 'activity_offers', 'flight_offers', 'transfers'],
        'dates_end': ['hotel_offers', 'activity_offers', 'flight_offers', 'transfers'],
        'travellers': ['hotel_offers', 'activity_offers', 'flight_offers'],
        'budget_total': ['hotel_offers', 'activity_offers'],
        'travel_style': ['hotel_offers', 'activity_offers']
      }
      
      const tablesToInvalidate = invalidationMap[changedSlot] || []
      
      for (const table of tablesToInvalidate) {
        if (table === 'hotel_offers') {
          await client.query(`DELETE FROM hotel_offers WHERE trip_id = $1`, [tripId])
        } else if (table === 'activity_offers') {
          await client.query(`DELETE FROM activity_offers WHERE trip_id = $1`, [tripId])
        } else if (table === 'flight_offers') {
          await client.query(`DELETE FROM flight_offers WHERE trip_id = $1`, [tripId])
        } else if (table === 'transfers') {
          await client.query(`DELETE FROM transfers WHERE trip_id = $1`, [tripId])
        }
        
        console.log(`  ✅ Invalidated ${table}`)
      }
      
      await this.logDecision(
        tripId, 
        'refresh', 
        `Invalidated dependent data due to ${changedSlot} change`, 
        { 
          changed_slot: changedSlot, 
          invalidated_tables: tablesToInvalidate,
          turn_token: this.turnToken 
        }
      )
      
    } finally {
      client.release()
    }
  }
  
  // Decision logging for traceability
  async logDecision(
    tripId: string, 
    eventType: string, 
    message: string, 
    meta: any = {}
  ): Promise<void> {
    const client = await this.pool.connect()
    
    try {
      const query = `
        INSERT INTO decision_logs (trip_id, event_type, message, meta, created_at)
        VALUES ($1, $2, $3, $4, now())
      `
      
      await client.query(query, [tripId, eventType, message, JSON.stringify(meta)])
      
    } finally {
      client.release()
    }
  }
  
  // Get decision history for debugging/explanation
  async getDecisionHistory(tripId: string, limit: number = 50): Promise<DecisionLog[]> {
    const client = await this.pool.connect()
    
    try {
      const query = `
        SELECT * FROM decision_logs 
        WHERE trip_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2
      `
      
      const result = await client.query(query, [tripId, limit])
      return result.rows
      
    } finally {
      client.release()
    }
  }
  
  // Check if prerequisites are met for searching
  async canSearchDomain(tripId: string, domain: string): Promise<{ canSearch: boolean; missingSlots: string[] }> {
    const state = await this.loadTripState(tripId)
    
    const prerequisites = {
      'hotels': ['destination', 'dates_start', 'dates_end'],
      'activities': ['destination', 'dates_start', 'dates_end'],
      'restaurants': ['destination'],
      'flights': ['origin', 'destination', 'dates_start'],
      'transport': ['destination']
    }
    
    const requiredSlots = prerequisites[domain] || []
    const lockedSlots = state.slots.filter(s => s.locked).map(s => s.slot_name)
    
    const missingSlots = requiredSlots.filter(slot => !lockedSlots.includes(slot))
    
    return {
      canSearch: missingSlots.length === 0,
      missingSlots
    }
  }
  
  // Utility: Generate hash for request deduplication
  private generateHash(input: string): string {
    // Simple hash - in production use crypto
    let hash = 0
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }
  
  // Health check and connection management
  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      const client = await this.pool.connect()
      
      try {
        const result = await client.query('SELECT NOW() as current_time, version() as pg_version')
        const row = result.rows[0]
        
        return {
          status: 'healthy',
          details: {
            current_time: row.current_time,
            pg_version: row.pg_version.split(' ')[0],
            pool_total: this.pool.totalCount,
            pool_idle: this.pool.idleCount,
            pool_waiting: this.pool.waitingCount
          }
        }
      } finally {
        client.release()
      }
      
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error.message
        }
      }
    }
  }
  
  // Close pool when done
  async close(): Promise<void> {
    await this.pool.end()
    console.log('📴 Database pool closed')
  }
}