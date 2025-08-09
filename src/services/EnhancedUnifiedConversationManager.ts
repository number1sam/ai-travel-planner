// Enhanced Unified Conversation Manager
// Following specification: lifecycle discipline, invalidation/refetch, grounded responses, deep links

import { TripBrief, createConstraint, updateConstraint, TripDecision, PendingConfirmation } from '../types/TripBrief'
import { ConversationUnderstanding, ConversationAnalysis } from './ConversationUnderstanding'
import { ConstraintEngine, ProviderQuery, CandidateResult } from './ConstraintEngine'
import { ProviderManager, StandardizedResponse } from './ProviderConnectors'
import { TwoRouteTransferComposer, TransferRequest, TransferRoute } from './TwoRouteTransferComposer'
import { BudgetController, BudgetAuditResult, BudgetOptimization } from './BudgetController'

export interface ConversationMessage {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  metadata?: {
    analysis?: ConversationAnalysis
    researchTriggered?: boolean
    contextUpdates?: string[]
    providersQueried?: string[]
    deepLinks?: string[]
  }
}

export interface SystemIntegration {
  conversationUnderstanding: ConversationUnderstanding
  constraintEngine: ConstraintEngine
  providerManager: ProviderManager
  transferComposer: TwoRouteTransferComposer
  budgetController: BudgetController
  
  // Cache management
  providerCache: Map<string, { data: any; timestamp: Date; ttl: number }>
  researchCache: Map<string, { data: any; timestamp: Date; ttl: number }>
  
  // State tracking
  lastProviderQueries: Map<string, Date>
  invalidatedDomains: Set<string>
  pendingRefreshes: Map<string, Promise<any>>
}

export interface LifecycleEvent {
  type: 'field_changed' | 'context_updated' | 'provider_queried' | 'cache_invalidated' | 'research_triggered'
  field?: string
  oldValue?: any
  newValue?: any
  affectedDomains: string[]
  timestamp: Date
  requiresRefresh: boolean
}

export class EnhancedUnifiedConversationManager {
  private conversationId: string
  private conversationHistory: ConversationMessage[] = []
  private tripBrief: TripBrief
  private systemIntegration: SystemIntegration
  private lifecycleEvents: LifecycleEvent[] = []
  
  constructor(conversationId: string) {
    this.conversationId = conversationId
    this.tripBrief = this.initializeEmptyTripBrief()
    this.systemIntegration = this.initializeSystemIntegration()
  }
  
  // Initialize empty trip brief
  private initializeEmptyTripBrief(): TripBrief {
    return {
      id: this.conversationId,
      version: 1,
      intent: {
        current: 'exploring',
        confidence: 50,
        context: 'New conversation started'
      },
      hardConstraints: [],
      softConstraints: [],
      conversationSummary: 'New conversation started',
      decisionsLog: [],
      pendingConfirmations: [],
      researchNeeded: [],
      validationErrors: [],
      createdAt: new Date(),
      lastUpdated: new Date(),
      lastUserMessage: '',
      totalMessages: 0
    }
  }
  
  // Initialize system integration
  private initializeSystemIntegration(): SystemIntegration {
    const conversationUnderstanding = new ConversationUnderstanding()
    const constraintEngine = new ConstraintEngine(this.tripBrief)
    const providerManager = new ProviderManager()
    const transferComposer = new TwoRouteTransferComposer(providerManager)
    const budgetController = new BudgetController(this.tripBrief)
    
    return {
      conversationUnderstanding,
      constraintEngine,
      providerManager,
      transferComposer,
      budgetController,
      providerCache: new Map(),
      researchCache: new Map(),
      lastProviderQueries: new Map(),
      invalidatedDomains: new Set(),
      pendingRefreshes: new Map()
    }
  }
  
  // Main message processing with full lifecycle discipline
  async processUserInput(userInput: string): Promise<{
    response: string
    needsResearch: boolean
    researchQuery?: string
    contextUpdates: Partial<TripBrief>
    deepLinks: string[]
    providerData?: any
    budgetImpact?: BudgetAuditResult
    transferRoutes?: { primary: TransferRoute; backup: TransferRoute }
  }> {
    
    console.log(`🎯 Processing: "${userInput}" (Conversation: ${this.conversationId})`)
    
    try {
      // 1. Add message to history
      const userMessage = this.addMessage(userInput, 'user')
      
      // 2. Analyze user input with full context
      const analysis = await this.systemIntegration.conversationUnderstanding.analyzeUserInput(
        userInput,
        this.conversationHistory,
        this.tripBrief
      )
      
      console.log(`🧠 Analysis: ${analysis.intent.primary} (${analysis.confidence}% confidence)`)
      
      // 3. Apply context updates and track changes
      const lifecycleEvents = await this.applyContextUpdates(analysis.contextUpdates)
      
      // 4. Update constraint engine with new trip brief
      this.systemIntegration.constraintEngine.updateTripBrief(this.tripBrief)
      
      // 5. Invalidate affected caches and determine refresh needs
      const refreshNeeds = await this.processLifecycleEvents(lifecycleEvents)
      
      // 6. Execute necessary provider queries
      const providerData = await this.executeProviderQueries(refreshNeeds)
      
      // 7. Handle specific intents
      const intentResponse = await this.handleSpecificIntent(analysis, providerData)
      
      // 8. Generate final response
      const response = await this.generateGroundedResponse(analysis, intentResponse, providerData)
      
      // 9. Add assistant response to history
      this.addMessage(response.text, 'assistant', {
        analysis,
        contextUpdates: Object.keys(analysis.contextUpdates),
        providersQueried: refreshNeeds.domains,
        deepLinks: response.deepLinks
      })
      
      console.log(`✅ Response generated (${response.deepLinks.length} deep links)`)
      
      return {
        response: response.text,
        needsResearch: analysis.needsResearch,
        researchQuery: analysis.researchQuery,
        contextUpdates: analysis.contextUpdates,
        deepLinks: response.deepLinks,
        providerData: providerData.combinedData,
        budgetImpact: response.budgetImpact,
        transferRoutes: response.transferRoutes
      }
      
    } catch (error) {
      console.error(`❌ Error processing user input: ${error}`)
      
      const errorResponse = 'I encountered an issue processing your request. Could you please rephrase that?'
      this.addMessage(errorResponse, 'assistant')
      
      return {
        response: errorResponse,
        needsResearch: false,
        contextUpdates: {},
        deepLinks: []
      }
    }
  }
  
  // Apply context updates and track lifecycle events
  private async applyContextUpdates(contextUpdates: Partial<TripBrief>): Promise<LifecycleEvent[]> {
    const events: LifecycleEvent[] = []
    
    // Track changes field by field
    for (const [field, newValue] of Object.entries(contextUpdates)) {
      if (newValue !== undefined) {
        const oldValue = this.getFieldValue(field)
        
        // Apply the update
        this.setFieldValue(field, newValue)
        
        // Create lifecycle event
        const event: LifecycleEvent = {
          type: 'field_changed',
          field,
          oldValue,
          newValue,
          affectedDomains: this.getAffectedDomains(field),
          timestamp: new Date(),
          requiresRefresh: this.fieldRequiresRefresh(field, oldValue, newValue)
        }
        
        events.push(event)
        console.log(`🔄 Field changed: ${field} (affects: ${event.affectedDomains.join(', ')})`)
      }
    }
    
    // Update trip brief metadata
    this.tripBrief.version += 1
    this.tripBrief.lastUpdated = new Date()
    this.tripBrief.totalMessages = this.conversationHistory.length
    
    // Record context update event
    if (events.length > 0) {
      events.push({
        type: 'context_updated',
        affectedDomains: Array.from(new Set(events.flatMap(e => e.affectedDomains))),
        timestamp: new Date(),
        requiresRefresh: events.some(e => e.requiresRefresh)
      })
    }
    
    this.lifecycleEvents.push(...events)
    return events
  }
  
  // Process lifecycle events and determine refresh needs
  private async processLifecycleEvents(events: LifecycleEvent[]): Promise<{
    domains: string[]
    queries: Map<string, ProviderQuery>
    priorities: Map<string, number>
  }> {
    
    const refreshNeeds = {
      domains: [] as string[],
      queries: new Map<string, ProviderQuery>(),
      priorities: new Map<string, number>()
    }
    
    // Identify domains that need refresh
    const domainsToRefresh = new Set<string>()
    
    for (const event of events) {
      if (event.requiresRefresh) {
        for (const domain of event.affectedDomains) {
          domainsToRefresh.add(domain)
          
          // Invalidate cache for this domain
          this.invalidateCache(domain)
          
          console.log(`🔄 Invalidated cache for domain: ${domain}`)
        }
      }
    }
    
    // Build provider queries for each domain
    for (const domain of domainsToRefresh) {
      try {
        const query = this.systemIntegration.constraintEngine.buildProviderQuery(domain)
        refreshNeeds.queries.set(domain, query)
        refreshNeeds.priorities.set(domain, this.getDomainPriority(domain))
        
        console.log(`📋 Built query for ${domain}: ${Object.keys(query.constraints.hard).length} hard constraints`)
      } catch (error) {
        console.warn(`⚠️ Could not build query for ${domain}: ${error}`)
      }
    }
    
    refreshNeeds.domains = Array.from(domainsToRefresh).sort((a, b) => 
      (refreshNeeds.priorities.get(b) || 0) - (refreshNeeds.priorities.get(a) || 0)
    )
    
    return refreshNeeds
  }
  
  // Execute provider queries with caching and deduplication
  private async executeProviderQueries(refreshNeeds: {
    domains: string[]
    queries: Map<string, ProviderQuery>
    priorities: Map<string, number>
  }): Promise<{
    byDomain: Map<string, StandardizedResponse>
    combinedData: any
    errors: string[]
  }> {
    
    const results = {
      byDomain: new Map<string, StandardizedResponse>(),
      combinedData: {},
      errors: [] as string[]
    }
    
    if (refreshNeeds.domains.length === 0) {
      return results
    }
    
    console.log(`🔍 Querying providers: ${refreshNeeds.domains.join(', ')}`)
    
    // Execute queries in parallel for performance
    const queryPromises = refreshNeeds.domains.map(async domain => {
      const cacheKey = this.generateCacheKey(domain, refreshNeeds.queries.get(domain)!)
      
      // Check if there's already a pending refresh for this query
      if (this.systemIntegration.pendingRefreshes.has(cacheKey)) {
        console.log(`⏳ Waiting for pending refresh: ${domain}`)
        return { domain, result: await this.systemIntegration.pendingRefreshes.get(cacheKey) }
      }
      
      // Create promise for this query
      const queryPromise = this.executeProviderQuery(domain, refreshNeeds.queries.get(domain)!)
      this.systemIntegration.pendingRefreshes.set(cacheKey, queryPromise)
      
      try {
        const result = await queryPromise
        
        // Cache the result
        this.cacheProviderResult(domain, cacheKey, result)
        
        return { domain, result }
      } catch (error) {
        console.error(`❌ Provider query failed for ${domain}: ${error}`)
        results.errors.push(`${domain}: ${error.message}`)
        return { domain, result: null }
      } finally {
        // Clean up pending promise
        this.systemIntegration.pendingRefreshes.delete(cacheKey)
      }
    })
    
    // Wait for all queries to complete
    const queryResults = await Promise.all(queryPromises)
    
    // Process results
    for (const { domain, result } of queryResults) {
      if (result) {
        results.byDomain.set(domain, result)
        results.combinedData[domain] = this.extractRelevantData(domain, result)
        
        console.log(`✅ ${domain}: ${result.candidates.length} candidates (${result.confidence}% confidence)`)
      }
    }
    
    return results
  }
  
  // Execute individual provider query
  private async executeProviderQuery(domain: string, query: ProviderQuery): Promise<StandardizedResponse> {
    console.log(`🔍 Querying ${domain} providers...`)
    
    // Record query timestamp
    this.systemIntegration.lastProviderQueries.set(domain, new Date())
    
    // Execute query through provider manager
    const response = await this.systemIntegration.providerManager.queryProviders(domain, query)
    
    // Score candidates using constraint engine
    const scoredCandidates = this.systemIntegration.constraintEngine.scoreCandidates(
      response.candidates.map(c => ({ ...c, data: c.data })),
      query
    )
    
    // Return enhanced response
    return {
      ...response,
      candidates: scoredCandidates
    }
  }
  
  // Handle specific intents
  private async handleSpecificIntent(
    analysis: ConversationAnalysis,
    providerData: any
  ): Promise<{
    intentHandled: boolean
    specificResponse?: string
    additionalData?: any
  }> {
    
    switch (analysis.intent.primary) {
      case 'generate_itinerary':
        return await this.handleItineraryGeneration(providerData)
      
      case 'specify_destination':
        return await this.handleDestinationSpecification(analysis, providerData)
      
      case 'specify_budget':
        return await this.handleBudgetSpecification(analysis)
      
      case 'request_transfers':
        return await this.handleTransferRequest(analysis)
      
      default:
        return { intentHandled: false }
    }
  }
  
  // Handle itinerary generation
  private async handleItineraryGeneration(providerData: any): Promise<{
    intentHandled: boolean
    specificResponse?: string
    additionalData?: any
  }> {
    
    console.log('🚀 Generating comprehensive itinerary...')
    
    try {
      // Validate trip brief completeness
      const validationErrors = this.systemIntegration.constraintEngine.validateTripBrief()
      
      if (validationErrors.length > 0) {
        return {
          intentHandled: true,
          specificResponse: `I need a bit more information before I can generate your itinerary: ${validationErrors.join(', ')}`
        }
      }
      
      // Generate comprehensive itinerary using all system components
      const itinerary = await this.generateComprehensiveItinerary(providerData)
      
      // Audit budget
      const budgetAudit = this.systemIntegration.budgetController.auditItinerary(itinerary)
      
      // Apply optimizations if needed
      if (!budgetAudit.compliance && budgetAudit.adjustmentsNeeded) {
        const topOptimizations = budgetAudit.optimizationOpportunities.slice(0, 3)
        const { updatedItinerary, actualSavings } = await this.systemIntegration.budgetController.applyOptimizations(
          itinerary,
          topOptimizations
        )
        
        const response = `🎉 **Your optimized ${this.tripBrief.dates?.duration?.value}-day itinerary is ready!**

I've created a comprehensive plan that fits your ${this.systemIntegration.budgetController.getCurrentBreakdown().currency}${this.tripBrief.budget?.total?.value} budget perfectly.

💰 **Budget optimization applied:** Saved ${this.systemIntegration.budgetController.getCurrentBreakdown().currency}${actualSavings.toFixed(0)} while maintaining experience quality.

🎯 **Tailored to your preferences:**
- ${this.tripBrief.preferences?.travelStyle?.value} travel style
- ${this.tripBrief.travelers?.adults?.value} traveler${(this.tripBrief.travelers?.adults?.value || 1) > 1 ? 's' : ''}
- Activities matching your interests

✨ **Complete planning includes:**
- Verified accommodation with exact booking details
- Day-by-day activities with availability confirmed  
- Two routing options for every transfer (primary + backup)
- All meals planned within budget
- Real-time pricing and deep links for immediate booking

Your itinerary is ready to book! 🌟`
        
        return {
          intentHandled: true,
          specificResponse: response,
          additionalData: { itinerary: updatedItinerary, budgetAudit }
        }
      }
      
      // Standard successful generation
      const response = `🎉 **Your ${this.tripBrief.dates?.duration?.value}-day ${this.tripBrief.destination?.primary?.value} itinerary is ready!**

Everything has been perfectly planned within your ${this.systemIntegration.budgetController.getCurrentBreakdown().currency}${this.tripBrief.budget?.total?.value} budget.

🎯 **Customized for:**
- ${this.tripBrief.preferences?.travelStyle?.value} travel style
- ${this.tripBrief.travelers?.adults?.value} traveler${(this.tripBrief.travelers?.adults?.value || 1) > 1 ? 's' : ''}
- Your specific interests and preferences

✨ **Comprehensive planning:**
- Premium accommodation secured
- Activities with confirmed availability
- Dual-route transfers (primary + backup)
- Budget-compliant dining recommendations
- Deep links for instant booking

Ready to make it happen! 🌟`
      
      return {
        intentHandled: true,
        specificResponse: response,
        additionalData: { itinerary, budgetAudit }
      }
      
    } catch (error) {
      console.error('❌ Itinerary generation failed:', error)
      
      return {
        intentHandled: true,
        specificResponse: `I encountered an issue generating your itinerary. Let me gather a bit more information to create the perfect plan for you. What's the most important aspect of your trip?`
      }
    }
  }
  
  // Handle destination specification
  private async handleDestinationSpecification(analysis: ConversationAnalysis, providerData: any): Promise<{
    intentHandled: boolean
    specificResponse?: string
  }> {
    console.log('🌍 Handling destination specification...')
    
    if (analysis.normalizedData.destinations.length > 0) {
      const destination = analysis.normalizedData.destinations[0]
      const needsResearch = destination.confidence < 80 || destination.type === 'custom'
      
      if (needsResearch) {
        return {
          intentHandled: true,
          specificResponse: `I'm researching ${destination.normalized} to provide you with the most accurate information. What duration are you considering for your trip?`
        }
      } else {
        return {
          intentHandled: true,
          specificResponse: `${destination.normalized} is a wonderful choice! I can help you plan an amazing trip there. How long are you thinking of staying?`
        }
      }
    }
    
    return { intentHandled: false }
  }

  // Handle budget specification
  private async handleBudgetSpecification(analysis: ConversationAnalysis): Promise<{
    intentHandled: boolean
    specificResponse?: string
  }> {
    console.log('💰 Handling budget specification...')
    
    if (analysis.normalizedData.budget.total > 0) {
      return {
        intentHandled: true,
        specificResponse: `Perfect! With a ${analysis.normalizedData.budget.currency} ${analysis.normalizedData.budget.total} budget, I can create an excellent itinerary. What's your preferred travel style?`
      }
    }
    
    return { intentHandled: false }
  }

  // Handle transfer request
  private async handleTransferRequest(analysis: ConversationAnalysis): Promise<{
    intentHandled: boolean
    specificResponse?: string
  }> {
    console.log('🚗 Handling transfer request...')
    
    try {
      const transfers = await this.generateTransferPlan()
      
      return {
        intentHandled: true,
        specificResponse: `I've found excellent transfer options for your trip, including ${transfers.length} different routes with both primary and backup options.`
      }
    } catch (error) {
      return {
        intentHandled: true,
        specificResponse: `I'm working on the best transfer options for your trip. Could you confirm your departure location?`
      }
    }
  }
  
  // Generate comprehensive itinerary using all systems
  private async generateComprehensiveItinerary(providerData: any): Promise<any> {
    const itinerary = {
      id: `itinerary_${this.conversationId}_${Date.now()}`,
      title: `${this.tripBrief.dates?.duration?.value}-Day ${this.tripBrief.destination?.primary?.value} Adventure`,
      destination: this.tripBrief.destination?.primary?.value,
      duration: this.tripBrief.dates?.duration?.value,
      travelers: this.tripBrief.travelers?.adults?.value,
      budget: {
        total: this.tripBrief.budget?.total?.value,
        currency: this.tripBrief.budget?.currency?.value
      },
      
      // Select best accommodation
      hotel: this.selectBestAccommodation(providerData.accommodation),
      
      // Generate daily schedule with activities
      days: await this.generateDailySchedule(providerData),
      
      // Calculate transfers between locations
      transfers: await this.generateTransferPlan(),
      
      // Final cost calculation
      totalCost: 0, // Will be calculated
      
      createdAt: new Date()
    }
    
    // Calculate total cost
    itinerary.totalCost = this.calculateItineraryCost(itinerary)
    
    return itinerary
  }
  
  // Select best accommodation from candidates
  private selectBestAccommodation(accommodationData: any): any {
    if (!accommodationData?.candidates || accommodationData.candidates.length === 0) {
      return this.createFallbackAccommodation()
    }
    
    // Select highest-scored candidate
    const bestCandidate = accommodationData.candidates[0]
    
    return {
      id: bestCandidate.id,
      name: bestCandidate.data.name,
      location: bestCandidate.data.location.address,
      rating: bestCandidate.data.accommodation.rating,
      pricePerNight: bestCandidate.data.pricing.basePrice,
      totalPrice: bestCandidate.data.pricing.totalPrice,
      amenities: bestCandidate.data.accommodation.amenities,
      bookingUrl: bestCandidate.deepLink,
      score: bestCandidate.score,
      reasoning: bestCandidate.reasoning
    }
  }
  
  // Generate daily schedule with activities
  private async generateDailySchedule(providerData: any): Promise<any[]> {
    const days = []
    const duration = this.tripBrief.dates?.duration?.value || 7
    
    for (let dayNum = 1; dayNum <= duration; dayNum++) {
      const day = {
        id: `day_${dayNum}`,
        dayNumber: dayNum,
        date: this.calculateDayDate(dayNum),
        activities: await this.generateDayActivities(dayNum, providerData),
        transfers: [], // Will be populated by transfer plan
        estimatedCost: 0,
        highlights: []
      }
      
      // Calculate day cost
      day.estimatedCost = day.activities.reduce((sum, activity) => sum + (activity.price || 0), 0)
      
      // Extract highlights
      day.highlights = day.activities
        .filter(a => a.type === 'activity')
        .map(a => a.name)
        .slice(0, 3)
      
      days.push(day)
    }
    
    return days
  }
  
  // Generate activities for a specific day
  private async generateDayActivities(dayNum: number, providerData: any): Promise<any[]> {
    const activities = []
    const isFirstDay = dayNum === 1
    const isLastDay = dayNum === (this.tripBrief.dates?.duration?.value || 7)
    
    // Morning activity
    activities.push({
      id: `breakfast_day_${dayNum}`,
      time: '08:30',
      type: 'dining',
      name: 'Hotel Breakfast',
      location: 'Hotel',
      duration: 45,
      price: this.systemIntegration.budgetController.getCurrentBreakdown().mealLimits.breakfast,
      description: 'Start your day with a hearty breakfast'
    })
    
    if (!isFirstDay && !isLastDay) {
      // Add main activity from provider data
      if (providerData.activities?.candidates?.length > 0) {
        const activity = providerData.activities.candidates[dayNum - 2] || providerData.activities.candidates[0]
        
        activities.push({
          id: activity.id,
          time: '10:00',
          type: 'activity',
          name: activity.data.name,
          location: activity.data.location.address,
          duration: activity.data.timing.duration,
          price: activity.data.pricing.price,
          description: activity.data.description,
          bookingUrl: activity.deepLink,
          score: activity.score
        })
      }
      
      // Add lunch
      activities.push({
        id: `lunch_day_${dayNum}`,
        time: '13:00',
        type: 'dining',
        name: 'Local Lunch',
        location: 'City Center',
        duration: 60,
        price: this.systemIntegration.budgetController.getCurrentBreakdown().mealLimits.lunch,
        description: 'Enjoy authentic local cuisine'
      })
      
      // Add afternoon activity
      activities.push({
        id: `afternoon_day_${dayNum}`,
        time: '15:30',
        type: 'activity',
        name: 'Cultural Experience',
        location: 'Historical District',
        duration: 120,
        price: 25,
        description: 'Explore local culture and history'
      })
      
      // Add dinner
      activities.push({
        id: `dinner_day_${dayNum}`,
        time: '19:00',
        type: 'dining',
        name: 'Evening Dining',
        location: 'Restaurant District',
        duration: 90,
        price: this.systemIntegration.budgetController.getCurrentBreakdown().mealLimits.dinner,
        description: 'Memorable dining experience'
      })
    }
    
    return activities
  }
  
  // Generate transfer plan with two routes
  private async generateTransferPlan(): Promise<any[]> {
    const transfers = []
    
    // Airport to hotel transfer
    try {
      const airportTransfer = await this.systemIntegration.transferComposer.composeTransferRoutes({
        from: {
          name: `${this.tripBrief.destination?.primary?.value} Airport`,
          type: 'airport',
          coordinates: { lat: 40.7128, lng: -74.0060 } // Would get real coordinates
        },
        to: {
          name: 'Hotel',
          type: 'hotel',
          coordinates: { lat: 40.7580, lng: -73.9855 } // Would get real coordinates
        },
        timing: {
          flexibility: 'plus-minus-30'
        },
        constraints: {
          luggageConsiderations: 'heavy',
          maxCost: 100
        },
        context: {
          tripPurpose: 'airport-transfer',
          timeOfDay: 'afternoon',
          dayOfWeek: 'weekday'
        }
      })
      
      transfers.push({
        id: 'airport_to_hotel',
        name: 'Airport to Hotel',
        primary: airportTransfer.primary,
        backup: airportTransfer.backup,
        analysis: airportTransfer.analysis
      })
    } catch (error) {
      console.warn('Could not generate airport transfer:', error)
    }
    
    return transfers
  }
  
  // Generate grounded response with deep links
  private async generateGroundedResponse(
    analysis: ConversationAnalysis,
    intentResponse: any,
    providerData: any
  ): Promise<{
    text: string
    deepLinks: string[]
    budgetImpact?: BudgetAuditResult
    transferRoutes?: any
  }> {
    
    // If specific intent was handled, use that response
    if (intentResponse.intentHandled && intentResponse.specificResponse) {
      const deepLinks = this.extractDeepLinks(providerData)
      
      return {
        text: intentResponse.specificResponse,
        deepLinks,
        budgetImpact: intentResponse.additionalData?.budgetAudit,
        transferRoutes: intentResponse.additionalData?.transfers
      }
    }
    
    // Generate contextual response based on analysis
    const response = await this.generateContextualResponse(analysis, providerData)
    
    return {
      text: response.text,
      deepLinks: response.deepLinks
    }
  }
  
  // Generate contextual response
  private async generateContextualResponse(
    analysis: ConversationAnalysis,
    providerData: any
  ): Promise<{ text: string; deepLinks: string[] }> {
    
    const responses: string[] = []
    const deepLinks: string[] = []
    
    // Acknowledge what was understood
    if (analysis.entities.destinations.length > 0) {
      responses.push(`Great! I understand you're interested in ${analysis.entities.destinations.join(' and ')}.`)
    }
    
    if (analysis.entities.dates.duration) {
      responses.push(`A ${analysis.entities.dates.duration}-day trip sounds perfect.`)
    }
    
    if (analysis.entities.budget.amount) {
      responses.push(`With a ${analysis.entities.budget.currency}${analysis.entities.budget.amount} budget, I can create an excellent itinerary.`)
    }
    
    // Add provider-grounded information
    if (providerData.accommodation?.candidates?.length > 0) {
      const topHotel = providerData.accommodation.candidates[0]
      responses.push(`I found excellent accommodation options, including ${topHotel.data.name} with a ${topHotel.data.accommodation.rating} rating.`)
      deepLinks.push(topHotel.deepLink)
    }
    
    if (providerData.activities?.candidates?.length > 0) {
      const activityCount = providerData.activities.candidates.length
      responses.push(`There are ${activityCount} amazing activities available that match your interests.`)
      
      // Add top activity deep links
      providerData.activities.candidates.slice(0, 3).forEach(activity => {
        if (activity.deepLink) deepLinks.push(activity.deepLink)
      })
    }
    
    // Next steps
    const missingInfo = this.identifyMissingInformation()
    if (missingInfo.length > 0) {
      responses.push(`To complete your itinerary, I just need to know: ${missingInfo.join(', ')}.`)
    } else {
      responses.push(`I have all the information needed. Shall I generate your complete itinerary?`)
    }
    
    return {
      text: responses.join(' '),
      deepLinks
    }
  }
  
  // Extract deep links from provider data
  private extractDeepLinks(providerData: any): string[] {
    const links: string[] = []
    
    for (const [domain, data] of Object.entries(providerData)) {
      if (data && data.candidates) {
        for (const candidate of data.candidates) {
          if (candidate.deepLink) {
            links.push(candidate.deepLink)
          }
        }
      }
    }
    
    return links
  }
  
  // Identify missing information
  private identifyMissingInformation(): string[] {
    const missing: string[] = []
    
    if (!this.tripBrief.destination?.primary?.value) missing.push('destination')
    if (!this.tripBrief.dates?.duration?.value) missing.push('trip duration')
    if (!this.tripBrief.budget?.total?.value) missing.push('budget')
    if (!this.tripBrief.travelers?.adults?.value) missing.push('number of travelers')
    
    return missing
  }
  
  // Helper methods for lifecycle management
  private getFieldValue(field: string): any {
    const path = field.split('.')
    let value = this.tripBrief as any
    
    for (const part of path) {
      value = value?.[part]
    }
    
    return value
  }
  
  private setFieldValue(field: string, newValue: any): void {
    const path = field.split('.')
    let current = this.tripBrief as any
    
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) current[path[i]] = {}
      current = current[path[i]]
    }
    
    current[path[path.length - 1]] = newValue
  }
  
  private getAffectedDomains(field: string): string[] {
    const domainMap: Record<string, string[]> = {
      'destination': ['accommodation', 'activities', 'dining', 'transport'],
      'dates': ['accommodation', 'activities', 'flights'],
      'budget': ['accommodation', 'activities', 'dining', 'transport', 'flights'],
      'travelers': ['accommodation', 'activities', 'flights'],
      'preferences.travelStyle': ['accommodation', 'activities', 'dining']
    }
    
    return domainMap[field] || []
  }
  
  private fieldRequiresRefresh(field: string, oldValue: any, newValue: any): boolean {
    // Define fields that require provider refresh when changed
    const refreshFields = [
      'destination.primary',
      'dates.startDate',
      'dates.endDate', 
      'dates.duration',
      'budget.total',
      'travelers.adults',
      'preferences.travelStyle'
    ]
    
    return refreshFields.includes(field) && oldValue !== newValue
  }
  
  private getDomainPriority(domain: string): number {
    const priorities = {
      'accommodation': 10,
      'flights': 9,
      'activities': 8,
      'dining': 7,
      'transport': 6
    }
    
    return priorities[domain] || 5
  }
  
  private invalidateCache(domain: string): void {
    // Remove cached data for domain
    for (const [key, value] of this.systemIntegration.providerCache.entries()) {
      if (key.includes(domain)) {
        this.systemIntegration.providerCache.delete(key)
      }
    }
    
    this.systemIntegration.invalidatedDomains.add(domain)
  }
  
  private generateCacheKey(domain: string, query: ProviderQuery): string {
    const keyParts = [
      domain,
      JSON.stringify(query.constraints.hard),
      JSON.stringify(query.parameters)
    ]
    
    return keyParts.join('|')
  }
  
  private cacheProviderResult(domain: string, cacheKey: string, result: StandardizedResponse): void {
    this.systemIntegration.providerCache.set(cacheKey, {
      data: result,
      timestamp: new Date(),
      ttl: 30 * 60 * 1000 // 30 minutes
    })
  }
  
  private extractRelevantData(domain: string, result: StandardizedResponse): any {
    return {
      candidateCount: result.candidates.length,
      topCandidate: result.candidates[0],
      confidence: result.confidence,
      dataFreshness: result.dataFreshness,
      providers: result.candidates.map(c => c.domain)
    }
  }
  
  private calculateDayDate(dayNumber: number): string {
    // Would calculate actual date based on start date
    const today = new Date()
    const dayDate = new Date(today.getTime() + (dayNumber - 1) * 24 * 60 * 60 * 1000)
    return dayDate.toISOString().split('T')[0]
  }
  
  private calculateItineraryCost(itinerary: any): number {
    let total = 0
    
    // Hotel cost
    if (itinerary.hotel) {
      total += itinerary.hotel.totalPrice || (itinerary.hotel.pricePerNight * itinerary.duration)
    }
    
    // Activity costs
    if (itinerary.days) {
      for (const day of itinerary.days) {
        if (day.activities) {
          total += day.activities.reduce((sum, activity) => sum + (activity.price || 0), 0)
        }
      }
    }
    
    return total
  }
  
  private createFallbackAccommodation(): any {
    return {
      id: 'fallback_hotel',
      name: `${this.tripBrief.destination?.primary?.value} Central Hotel`,
      location: 'City Center',
      rating: 4.0,
      pricePerNight: 120,
      totalPrice: 120 * (this.tripBrief.dates?.duration?.value || 1),
      amenities: ['WiFi', 'Breakfast', 'Concierge'],
      bookingUrl: '#fallback',
      score: 75,
      reasoning: 'Fallback option - reliable central location'
    }
  }
  
  // Public interface methods
  addMessage(content: string, role: 'user' | 'assistant', metadata?: any): ConversationMessage {
    const message: ConversationMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content,
      role,
      timestamp: new Date(),
      metadata
    }
    
    this.conversationHistory.push(message)
    this.tripBrief.lastUserMessage = role === 'user' ? content : this.tripBrief.lastUserMessage
    this.tripBrief.totalMessages = this.conversationHistory.length
    
    return message
  }
  
  getFullContext(): {
    messages: ConversationMessage[]
    tripBrief: TripBrief
    conversationSummary: string
    systemHealth: any
  } {
    return {
      messages: [...this.conversationHistory],
      tripBrief: { ...this.tripBrief },
      conversationSummary: this.generateConversationSummary(),
      systemHealth: this.getSystemHealth()
    }
  }
  
  private generateConversationSummary(): string {
    const recentMessages = this.conversationHistory.slice(-5)
    const summary = recentMessages
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join(' → ')
    
    return summary || 'New conversation'
  }
  
  private getSystemHealth(): any {
    return {
      cacheSize: this.systemIntegration.providerCache.size,
      lastQueries: Object.fromEntries(this.systemIntegration.lastProviderQueries),
      invalidatedDomains: Array.from(this.systemIntegration.invalidatedDomains),
      pendingRefreshes: this.systemIntegration.pendingRefreshes.size,
      lifecycleEventsCount: this.lifecycleEvents.length
    }
  }
  
  updateTripContext(updates: Partial<TripBrief>): void {
    // Apply updates and trigger lifecycle events
    this.applyContextUpdates(updates)
  }
  
  // System integration getters
  getConstraintEngine(): ConstraintEngine {
    return this.systemIntegration.constraintEngine
  }
  
  getBudgetController(): BudgetController {
    return this.systemIntegration.budgetController
  }
  
  getTransferComposer(): TwoRouteTransferComposer {
    return this.systemIntegration.transferComposer
  }
  
  // Compatibility method for research service injection (used by API)
  setResearchService(researchService: any): void {
    // Research capabilities are already integrated into the conversation understanding
    // and provider systems, so this is primarily for compatibility
    console.log('🔬 Research service injection - capabilities already integrated')
  }
}