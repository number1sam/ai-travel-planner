// Two-Route Transfer Composer System
// Following specification: every transfer has primary and backup routes with full specifications

import { TransportCandidate } from './ProviderConnectors'

export interface TransferRoute {
  id: string
  type: 'primary' | 'backup'
  confidence: number
  
  // Route composition
  segments: TransferSegment[]
  totalDuration: number // minutes
  totalDistance: number // meters
  totalCost: number
  currency: string
  
  // Reliability factors
  operatingHours: { start: string; end: string }
  frequency: string // "every 10 minutes" or "on-demand"
  weatherSensitive: boolean
  seasonalOperation: boolean
  capacity: 'low' | 'medium' | 'high' | 'unlimited'
  
  // User experience
  complexity: 'simple' | 'moderate' | 'complex' // number of transfers
  walkingRequired: number // total walking minutes
  luggage: 'easy' | 'manageable' | 'difficult'
  accessibility: boolean
  comfort: 'basic' | 'standard' | 'premium'
  
  // Real-time considerations
  punctuality: 'very-reliable' | 'reliable' | 'variable' | 'unpredictable'
  trackingAvailable: boolean
  alternativeOptions: boolean // if this fails, are there immediate alternatives?
  
  // Instructions
  instructions: RouteInstruction[]
  estimatedTime: { optimistic: number; realistic: number; pessimistic: number }
  contingencyPlan?: string // what to do if this route fails
  
  // Provider data
  providerInfo: { name: string; bookingRequired: boolean; advanceNotice?: string }
  lastUpdated: Date
}

export interface TransferSegment {
  id: string
  mode: 'walking' | 'metro' | 'bus' | 'train' | 'taxi' | 'rideshare' | 'ferry' | 'tram'
  
  // Locations
  startPoint: TransferPoint
  endPoint: TransferPoint
  
  // Timing
  duration: number // minutes
  waitTime?: number // waiting for transport
  frequency?: string
  
  // Details
  provider: string
  line?: string // bus line, metro line, etc.
  direction?: string
  fare: number
  ticketType?: string
  
  // Conditions
  operatingHours: string
  weatherDependent: boolean
  accessibility: boolean
  luggageFriendly: boolean
  
  // Instructions
  instruction: string
  landmarks?: string[]
  warnings?: string[]
}

export interface TransferPoint {
  name: string
  type: 'hotel' | 'airport' | 'station' | 'stop' | 'landmark' | 'address'
  coordinates: { lat: number; lng: number }
  address?: string
  
  // Context
  facilities?: string[] // restrooms, food, WiFi, etc.
  accessibility?: boolean
  waitingArea?: boolean
  indoorWaiting?: boolean
  
  // Navigation
  platform?: string
  terminal?: string
  gate?: string
  floor?: string
  entrance?: string
  
  // Timing considerations
  minimumTransferTime?: number // if connecting
  peakHourCrowding?: 'low' | 'medium' | 'high'
}

export interface RouteInstruction {
  step: number
  action: string // "Walk to", "Board", "Transfer to", etc.
  detail: string // detailed instruction
  duration: number
  distance?: number
  landmarks?: string[]
  warnings?: string[]
  alternatives?: string[] // backup options for this step
}

export interface TransferRequest {
  from: TransferPoint
  to: TransferPoint
  timing: {
    departureTime?: string // ISO datetime, or "flexible"
    arrivalBy?: string // must arrive by this time
    flexibility: 'exact' | 'plus-minus-15' | 'plus-minus-30' | 'flexible'
  }
  constraints: {
    maxWalkingTime?: number
    avoidModes?: string[]
    preferModes?: string[]
    maxCost?: number
    mustBeAccessible?: boolean
    luggageConsiderations?: 'none' | 'light' | 'heavy'
  }
  context: {
    tripPurpose: 'airport-transfer' | 'hotel-to-activity' | 'sightseeing' | 'return-journey'
    timeOfDay: 'early-morning' | 'morning' | 'afternoon' | 'evening' | 'night'
    dayOfWeek: string
    season?: 'spring' | 'summer' | 'autumn' | 'winter'
    weatherForecast?: 'clear' | 'rain' | 'snow' | 'storm'
  }
}

export class TwoRouteTransferComposer {
  private routeCache: Map<string, TransferRoute[]> = new Map()
  private providerManager: any // Would inject ProviderManager
  
  constructor(providerManager: any) {
    this.providerManager = providerManager
  }
  
  // Main method: compose two routes for any transfer
  async composeTransferRoutes(request: TransferRequest): Promise<{
    primary: TransferRoute
    backup: TransferRoute
    analysis: RouteAnalysis
  }> {
    
    console.log(`🚊 Composing transfer routes from ${request.from.name} to ${request.to.name}`)
    
    // Generate cache key
    const cacheKey = this.generateCacheKey(request)
    
    // Check cache first (with expiry)
    const cachedRoutes = this.routeCache.get(cacheKey)
    if (cachedRoutes && this.isCacheValid(cachedRoutes)) {
      console.log(`📦 Using cached routes for ${cacheKey}`)
      return this.selectBestRoutes(cachedRoutes, request)
    }
    
    // Generate multiple route candidates
    const candidates = await this.generateRouteCandidates(request)
    console.log(`🔍 Generated ${candidates.length} route candidates`)
    
    // Score and rank candidates
    const scoredCandidates = this.scoreAndRankRoutes(candidates, request)
    
    // Select primary and backup ensuring they use different strategies
    const { primary, backup } = this.selectOptimalPair(scoredCandidates, request)
    
    // Enhance routes with detailed instructions
    const enhancedPrimary = await this.enhanceRoute(primary, request, 'primary')
    const enhancedBackup = await this.enhanceRoute(backup, request, 'backup')
    
    // Generate analysis
    const analysis = this.analyzeRoutes(enhancedPrimary, enhancedBackup, request)
    
    // Cache the results
    this.routeCache.set(cacheKey, [enhancedPrimary, enhancedBackup])
    
    return {
      primary: enhancedPrimary,
      backup: enhancedBackup,
      analysis
    }
  }
  
  // Generate multiple route candidates using different strategies
  private async generateRouteCandidates(request: TransferRequest): Promise<TransferRoute[]> {
    const candidates: TransferRoute[] = []
    
    // Strategy 1: Fastest route (minimize time)
    const fastestRoute = await this.generateFastestRoute(request)
    if (fastestRoute) candidates.push(fastestRoute)
    
    // Strategy 2: Most reliable route (minimize risk)
    const reliableRoute = await this.generateMostReliableRoute(request)
    if (reliableRoute) candidates.push(reliableRoute)
    
    // Strategy 3: Cheapest route (minimize cost)
    const cheapestRoute = await this.generateCheapestRoute(request)
    if (cheapestRoute) candidates.push(cheapestRoute)
    
    // Strategy 4: Simplest route (minimize transfers)
    const simplestRoute = await this.generateSimplestRoute(request)
    if (simplestRoute) candidates.push(simplestRoute)
    
    // Strategy 5: Walking + taxi combination
    const hybridRoute = await this.generateHybridRoute(request)
    if (hybridRoute) candidates.push(hybridRoute)
    
    // Strategy 6: Public transport only
    const publicTransportRoute = await this.generatePublicTransportRoute(request)
    if (publicTransportRoute) candidates.push(publicTransportRoute)
    
    return this.deduplicateRoutes(candidates)
  }
  
  // Strategy 1: Generate fastest route
  private async generateFastestRoute(request: TransferRequest): Promise<TransferRoute | null> {
    try {
      // Query transport providers for fastest route
      const query = {
        domain: 'transport',
        parameters: {
          origin: `${request.from.coordinates.lat},${request.from.coordinates.lng}`,
          destination: `${request.to.coordinates.lat},${request.to.coordinates.lng}`,
          departure_time: request.timing.departureTime || 'now',
          mode: 'fastest'
        },
        constraints: {
          hard: {
            maxWalkingTime: request.constraints.maxWalkingTime || 15,
            avoidModes: request.constraints.avoidModes || []
          },
          soft: {
            preferSpeed: true
          }
        },
        filters: ['available', 'operating'],
        scoring: { weights: { duration: 0.7, cost: 0.1, comfort: 0.2 }, penalties: {}, bonuses: {} }
      }
      
      const response = await this.providerManager.queryProviders('transport', query)
      
      if (response.candidates.length === 0) return null
      
      // Take the fastest candidate and convert to our format
      const bestCandidate = response.candidates[0]
      return this.convertToTransferRoute(bestCandidate, 'fastest', request)
      
    } catch (error) {
      console.warn('Failed to generate fastest route:', error)
      return null
    }
  }
  
  // Strategy 2: Generate most reliable route
  private async generateMostReliableRoute(request: TransferRequest): Promise<TransferRoute | null> {
    try {
      // Prefer routes with:
      // - Metro/train over buses
      // - Direct routes over transfers
      // - Well-established services
      
      const segments: TransferSegment[] = []
      
      // Check if there's a direct metro/train connection
      const directConnection = await this.findDirectConnection(request.from, request.to, ['metro', 'train'])
      
      if (directConnection) {
        segments.push(directConnection)
      } else {
        // Build multi-modal route prioritizing reliable modes
        const reliableSegments = await this.buildReliableMultiModalRoute(request)
        segments.push(...reliableSegments)
      }
      
      if (segments.length === 0) return null
      
      return this.buildRouteFromSegments(segments, 'reliable', request)
      
    } catch (error) {
      console.warn('Failed to generate reliable route:', error)
      return null
    }
  }
  
  // Strategy 3: Generate cheapest route
  private async generateCheapestRoute(request: TransferRequest): Promise<TransferRoute | null> {
    try {
      const segments: TransferSegment[] = []
      
      // Calculate walking distance
      const walkingDistance = this.calculateDistance(request.from.coordinates, request.to.coordinates)
      const walkingTime = Math.round(walkingDistance / 80) // ~5km/h walking speed
      
      // If walkable distance (under max walking time), suggest walking
      if (walkingTime <= (request.constraints.maxWalkingTime || 20)) {
        segments.push({
          id: 'walking_segment',
          mode: 'walking',
          startPoint: request.from,
          endPoint: request.to,
          duration: walkingTime,
          provider: 'Walking',
          fare: 0,
          operatingHours: '24/7',
          weatherDependent: true,
          accessibility: true,
          luggageFriendly: request.constraints.luggageConsiderations !== 'heavy',
          instruction: `Walk ${walkingDistance}m (${walkingTime} minutes) from ${request.from.name} to ${request.to.name}`,
          warnings: walkingTime > 15 ? ['Long walking distance', 'Consider weather conditions'] : []
        })
      } else {
        // Find cheapest public transport combination
        const cheapSegments = await this.findCheapestPublicRoute(request)
        segments.push(...cheapSegments)
      }
      
      if (segments.length === 0) return null
      
      return this.buildRouteFromSegments(segments, 'cheapest', request)
      
    } catch (error) {
      console.warn('Failed to generate cheapest route:', error)
      return null
    }
  }
  
  // Strategy 4: Generate simplest route (minimal transfers)
  private async generateSimplestRoute(request: TransferRequest): Promise<TransferRoute | null> {
    try {
      // Try taxi/rideshare first (0 transfers)
      const directTaxi = await this.generateTaxiRoute(request)
      if (directTaxi) return directTaxi
      
      // Try direct public transport (0 transfers)
      const directPublic = await this.findDirectConnection(request.from, request.to, ['metro', 'bus', 'train'])
      if (directPublic) {
        return this.buildRouteFromSegments([directPublic], 'simple', request)
      }
      
      // Try 1-transfer route
      const oneTransferRoute = await this.findOneTransferRoute(request)
      if (oneTransferRoute) return oneTransferRoute
      
      return null
      
    } catch (error) {
      console.warn('Failed to generate simplest route:', error)
      return null
    }
  }
  
  // Strategy 5: Generate hybrid route (walking + taxi)
  private async generateHybridRoute(request: TransferRequest): Promise<TransferRoute | null> {
    try {
      const segments: TransferSegment[] = []
      
      // Walk to a better pickup point (major street, transport hub)
      const betterPickupPoint = await this.findBetterPickupPoint(request.from)
      
      if (betterPickupPoint && betterPickupPoint !== request.from) {
        // Add walking segment to pickup point
        const walkingSegment = await this.createWalkingSegment(request.from, betterPickupPoint)
        segments.push(walkingSegment)
        
        // Add taxi from better pickup point
        const taxiSegment = await this.createTaxiSegment(betterPickupPoint, request.to)
        segments.push(taxiSegment)
      } else {
        // Direct taxi if no better pickup point
        const taxiSegment = await this.createTaxiSegment(request.from, request.to)
        segments.push(taxiSegment)
      }
      
      return this.buildRouteFromSegments(segments, 'hybrid', request)
      
    } catch (error) {
      console.warn('Failed to generate hybrid route:', error)
      return null
    }
  }
  
  // Strategy 6: Public transport only route
  private async generatePublicTransportRoute(request: TransferRequest): Promise<TransferRoute | null> {
    try {
      const segments: TransferSegment[] = []
      
      // Find path using only public transport (no taxis, no excessive walking)
      const publicSegments = await this.planPublicTransportJourney(request)
      
      if (publicSegments.length === 0) return null
      
      return this.buildRouteFromSegments(publicSegments, 'public-transport', request)
      
    } catch (error) {
      console.warn('Failed to generate public transport route:', error)
      return null
    }
  }
  
  // Convert provider response to TransferRoute format
  private convertToTransferRoute(
    candidate: any, 
    strategy: string, 
    request: TransferRequest
  ): TransferRoute {
    
    const segments: TransferSegment[] = []
    const transportData = candidate.data
    
    // Convert transport candidate to segments
    if (transportData.route && transportData.route.stops) {
      // Multi-segment route
      for (let i = 0; i < transportData.route.stops.length - 1; i++) {
        const start = transportData.route.stops[i]
        const end = transportData.route.stops[i + 1]
        
        segments.push({
          id: `segment_${i}`,
          mode: transportData.mode || 'transit',
          startPoint: this.convertToTransferPoint(start),
          endPoint: this.convertToTransferPoint(end),
          duration: Math.round(transportData.timing.duration / transportData.route.stops.length),
          provider: transportData.details.provider,
          fare: transportData.pricing.price / transportData.route.stops.length,
          operatingHours: transportData.timing.operatingHours,
          weatherDependent: transportData.mode === 'walking',
          accessibility: transportData.details.accessibility,
          luggageFriendly: true,
          instruction: `Take ${transportData.details.provider} from ${start.name} to ${end.name}`
        })
      }
    } else {
      // Single segment
      segments.push({
        id: 'main_segment',
        mode: transportData.mode || 'transit',
        startPoint: request.from,
        endPoint: request.to,
        duration: transportData.timing.duration,
        provider: transportData.details.provider,
        fare: transportData.pricing.price,
        operatingHours: transportData.timing.operatingHours,
        weatherDependent: transportData.mode === 'walking',
        accessibility: transportData.details.accessibility,
        luggageFriendly: transportData.details.luggage !== 'restricted',
        instruction: `Take ${transportData.details.provider} from ${request.from.name} to ${request.to.name}`
      })
    }
    
    return {
      id: `route_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'primary', // Will be set later
      confidence: candidate.score,
      segments,
      totalDuration: transportData.timing.duration,
      totalDistance: 5000, // Would calculate from segments
      totalCost: transportData.pricing.price,
      currency: transportData.pricing.currency,
      operatingHours: { start: '05:00', end: '01:00' }, // Would extract from segments
      frequency: transportData.timing.frequency || 'variable',
      weatherSensitive: segments.some(s => s.weatherDependent),
      seasonalOperation: false,
      capacity: 'medium',
      complexity: segments.length === 1 ? 'simple' : segments.length <= 2 ? 'moderate' : 'complex',
      walkingRequired: segments.filter(s => s.mode === 'walking').reduce((sum, s) => sum + s.duration, 0),
      luggage: 'manageable',
      accessibility: segments.every(s => s.accessibility),
      comfort: transportData.details.comfort || 'standard',
      punctuality: 'reliable',
      trackingAvailable: transportData.realtime?.trackingAvailable || false,
      alternativeOptions: true,
      instructions: this.generateRouteInstructions(segments),
      estimatedTime: {
        optimistic: Math.round(transportData.timing.duration * 0.9),
        realistic: transportData.timing.duration,
        pessimistic: Math.round(transportData.timing.duration * 1.3)
      },
      providerInfo: {
        name: transportData.details.provider,
        bookingRequired: false
      },
      lastUpdated: new Date()
    }
  }
  
  // Score and rank all route candidates
  private scoreAndRankRoutes(candidates: TransferRoute[], request: TransferRequest): TransferRoute[] {
    return candidates
      .map(candidate => ({
        ...candidate,
        score: this.calculateRouteScore(candidate, request)
      }))
      .sort((a, b) => b.score - a.score)
  }
  
  // Calculate comprehensive route score
  private calculateRouteScore(route: TransferRoute, request: TransferRequest): number {
    let score = 100 // Start with perfect score
    
    // Time factors (30% weight)
    const timeWeight = 0.3
    const timeScore = this.scoreTimeFactor(route, request)
    score = score * (1 - timeWeight) + timeScore * timeWeight
    
    // Reliability factors (25% weight)
    const reliabilityWeight = 0.25
    const reliabilityScore = this.scoreReliabilityFactor(route)
    score = score * (1 - reliabilityWeight) + reliabilityScore * reliabilityWeight
    
    // Cost factors (20% weight)
    const costWeight = 0.2
    const costScore = this.scoreCostFactor(route, request)
    score = score * (1 - costWeight) + costScore * costWeight
    
    // Convenience factors (15% weight)
    const convenienceWeight = 0.15
    const convenienceScore = this.scoreConvenienceFactor(route, request)
    score = score * (1 - convenienceWeight) + convenienceScore * convenienceWeight
    
    // Comfort factors (10% weight)
    const comfortWeight = 0.1
    const comfortScore = this.scoreComfortFactor(route, request)
    score = score * (1 - comfortWeight) + comfortScore * comfortWeight
    
    return Math.round(score)
  }
  
  // Time scoring
  private scoreTimeFactor(route: TransferRoute, request: TransferRequest): number {
    let score = 100
    
    // Penalize long journeys
    if (route.totalDuration > 60) score -= 20
    if (route.totalDuration > 90) score -= 20
    if (route.totalDuration > 120) score -= 30
    
    // Penalize excessive walking
    if (route.walkingRequired > 15) score -= 15
    if (route.walkingRequired > 25) score -= 25
    
    return Math.max(0, score)
  }
  
  // Reliability scoring
  private scoreReliabilityFactor(route: TransferRoute): number {
    let score = 100
    
    // Weather sensitivity penalty
    if (route.weatherSensitive) score -= 15
    
    // Complexity penalty
    if (route.complexity === 'complex') score -= 20
    else if (route.complexity === 'moderate') score -= 10
    
    // Punctuality bonus/penalty
    switch (route.punctuality) {
      case 'very-reliable': score += 10; break
      case 'reliable': break // no change
      case 'variable': score -= 15; break
      case 'unpredictable': score -= 30; break
    }
    
    return Math.max(0, score)
  }
  
  // Cost scoring
  private scoreCostFactor(route: TransferRoute, request: TransferRequest): number {
    let score = 100
    
    // Penalize high costs
    if (route.totalCost > 50) score -= 25
    if (route.totalCost > 100) score -= 25
    
    // Bonus for free options
    if (route.totalCost === 0) score += 20
    
    // Check against max cost constraint
    if (request.constraints.maxCost && route.totalCost > request.constraints.maxCost) {
      score -= 50
    }
    
    return Math.max(0, score)
  }
  
  // Convenience scoring
  private scoreConvenienceFactor(route: TransferRoute, request: TransferRequest): number {
    let score = 100
    
    // Luggage considerations
    if (request.constraints.luggageConsiderations === 'heavy' && route.luggage === 'difficult') {
      score -= 30
    }
    
    // Accessibility requirements
    if (request.constraints.mustBeAccessible && !route.accessibility) {
      score -= 50
    }
    
    // Mode preferences
    const avoidsDislikedModes = !route.segments.some(s => 
      request.constraints.avoidModes?.includes(s.mode)
    )
    if (!avoidsDislikedModes) score -= 25
    
    return Math.max(0, score)
  }
  
  // Comfort scoring
  private scoreComfortFactor(route: TransferRoute, request: TransferRequest): number {
    let score = 100
    
    // Comfort level bonus
    switch (route.comfort) {
      case 'premium': score += 20; break
      case 'standard': break // no change
      case 'basic': score -= 10; break
    }
    
    // Indoor waiting bonus
    const hasIndoorWaiting = route.segments.some(s => 
      s.startPoint.indoorWaiting || s.endPoint.indoorWaiting
    )
    if (hasIndoorWaiting) score += 5
    
    return Math.max(0, score)
  }
  
  // Select optimal primary/backup pair
  private selectOptimalPair(
    rankedCandidates: TransferRoute[], 
    request: TransferRequest
  ): { primary: TransferRoute; backup: TransferRoute } {
    
    if (rankedCandidates.length === 0) {
      throw new Error('No valid route candidates found')
    }
    
    // Primary is highest scored
    const primary = { ...rankedCandidates[0], type: 'primary' as const }
    
    // Backup should use different strategy/mode to avoid single points of failure
    let backup = rankedCandidates.find(candidate => 
      this.routesUseDifferentStrategies(primary, candidate)
    )
    
    // If no strategically different route found, use second best
    if (!backup && rankedCandidates.length > 1) {
      backup = rankedCandidates[1]
    }
    
    // If still no backup, create a simple fallback (taxi)
    if (!backup) {
      backup = this.createFallbackRoute(request)
    }
    
    return {
      primary,
      backup: { ...backup, type: 'backup' as const }
    }
  }
  
  // Check if routes use different strategies
  private routesUseDifferentStrategies(route1: TransferRoute, route2: TransferRoute): boolean {
    // Different primary modes
    const mode1 = route1.segments[0]?.mode
    const mode2 = route2.segments[0]?.mode
    
    if (mode1 !== mode2) return true
    
    // Different complexity levels
    if (route1.complexity !== route2.complexity) return true
    
    // Different provider types
    const provider1Type = this.getProviderType(route1.segments[0]?.provider || '')
    const provider2Type = this.getProviderType(route2.segments[0]?.provider || '')
    
    return provider1Type !== provider2Type
  }
  
  private getProviderType(provider: string): string {
    if (provider.toLowerCase().includes('taxi') || provider.toLowerCase().includes('uber')) return 'rideshare'
    if (provider.toLowerCase().includes('metro') || provider.toLowerCase().includes('subway')) return 'metro'
    if (provider.toLowerCase().includes('bus')) return 'bus'
    if (provider.toLowerCase().includes('train')) return 'train'
    return 'other'
  }
  
  // Create fallback route (usually taxi)
  private createFallbackRoute(request: TransferRequest): TransferRoute {
    return {
      id: `fallback_${Date.now()}`,
      type: 'backup',
      confidence: 70,
      segments: [{
        id: 'fallback_taxi',
        mode: 'taxi',
        startPoint: request.from,
        endPoint: request.to,
        duration: 20, // Estimated
        provider: 'Taxi Service',
        fare: 25, // Estimated
        operatingHours: '24/7',
        weatherDependent: false,
        accessibility: true,
        luggageFriendly: true,
        instruction: `Take a taxi from ${request.from.name} to ${request.to.name}`
      }],
      totalDuration: 20,
      totalDistance: 5000,
      totalCost: 25,
      currency: 'USD',
      operatingHours: { start: '00:00', end: '23:59' },
      frequency: 'on-demand',
      weatherSensitive: false,
      seasonalOperation: false,
      capacity: 'unlimited',
      complexity: 'simple',
      walkingRequired: 0,
      luggage: 'easy',
      accessibility: true,
      comfort: 'standard',
      punctuality: 'reliable',
      trackingAvailable: true,
      alternativeOptions: true,
      instructions: [{
        step: 1,
        action: 'Hail taxi',
        detail: 'Use taxi app or street hailing',
        duration: 20,
        alternatives: ['Uber', 'Lyft', 'Local taxi companies']
      }],
      estimatedTime: {
        optimistic: 15,
        realistic: 20,
        pessimistic: 35
      },
      providerInfo: {
        name: 'Taxi Service',
        bookingRequired: false
      },
      lastUpdated: new Date()
    }
  }
  
  // Enhance route with detailed instructions
  private async enhanceRoute(
    route: TransferRoute, 
    request: TransferRequest, 
    type: 'primary' | 'backup'
  ): Promise<TransferRoute> {
    
    // Generate detailed step-by-step instructions
    const detailedInstructions = await this.generateDetailedInstructions(route, request)
    
    // Add contingency planning
    const contingencyPlan = this.generateContingencyPlan(route, request, type)
    
    // Calculate more accurate time estimates
    const refinedTimeEstimates = this.refineTimeEstimates(route, request)
    
    return {
      ...route,
      instructions: detailedInstructions,
      contingencyPlan,
      estimatedTime: refinedTimeEstimates,
      lastUpdated: new Date()
    }
  }
  
  // Generate detailed step-by-step instructions
  private async generateDetailedInstructions(
    route: TransferRoute, 
    request: TransferRequest
  ): Promise<RouteInstruction[]> {
    
    const instructions: RouteInstruction[] = []
    let stepNumber = 1
    
    for (const segment of route.segments) {
      if (segment.mode === 'walking') {
        instructions.push({
          step: stepNumber++,
          action: 'Walk',
          detail: `${segment.instruction}. Look for ${segment.landmarks?.join(', ') || 'directional signs'}.`,
          duration: segment.duration,
          distance: segment.duration * 80, // ~5km/h walking speed
          landmarks: segment.landmarks,
          warnings: segment.warnings,
          alternatives: ['Taxi as backup if walking is difficult']
        })
      } else {
        instructions.push({
          step: stepNumber++,
          action: `Board ${segment.provider}`,
          detail: segment.instruction,
          duration: segment.duration,
          landmarks: segment.startPoint.landmarks,
          warnings: segment.warnings,
          alternatives: this.getAlternativeTransport(segment)
        })
      }
    }
    
    return instructions
  }
  
  private getAlternativeTransport(segment: TransferSegment): string[] {
    const alternatives: string[] = []
    
    switch (segment.mode) {
      case 'metro':
        alternatives.push('Bus route', 'Taxi')
        break
      case 'bus':
        alternatives.push('Metro if available', 'Taxi')
        break
      case 'taxi':
        alternatives.push('Public transport', 'Rideshare app')
        break
      default:
        alternatives.push('Taxi', 'Walking')
    }
    
    return alternatives
  }
  
  // Generate contingency plan
  private generateContingencyPlan(
    route: TransferRoute, 
    request: TransferRequest, 
    type: 'primary' | 'backup'
  ): string {
    
    const plans: string[] = []
    
    // Weather contingency
    if (route.weatherSensitive) {
      plans.push('In bad weather, use taxi instead of walking segments')
    }
    
    // Service disruption contingency  
    if (route.segments.some(s => s.mode === 'metro' || s.mode === 'bus')) {
      plans.push('If public transport is disrupted, use taxi/rideshare')
    }
    
    // Time contingency
    plans.push(`Allow extra ${Math.round(route.totalDuration * 0.3)} minutes for delays`)
    
    // Backup for backup
    if (type === 'backup') {
      plans.push('As ultimate fallback, taxi service is available 24/7')
    }
    
    return plans.join('. ') + '.'
  }
  
  // Refine time estimates based on context
  private refineTimeEstimates(route: TransferRoute, request: TransferRequest): {
    optimistic: number
    realistic: number
    pessimistic: number
  } {
    
    const baseDuration = route.totalDuration
    
    // Adjust for time of day
    let timeAdjustment = 1.0
    switch (request.context.timeOfDay) {
      case 'early-morning': timeAdjustment = 0.9; break // Less traffic
      case 'morning': timeAdjustment = 1.2; break // Rush hour
      case 'afternoon': timeAdjustment = 1.0; break
      case 'evening': timeAdjustment = 1.3; break // Rush hour
      case 'night': timeAdjustment = 0.8; break // Less traffic but less frequent service
    }
    
    // Adjust for weather
    let weatherAdjustment = 1.0
    switch (request.context.weatherForecast) {
      case 'rain': weatherAdjustment = 1.2; break
      case 'snow': weatherAdjustment = 1.4; break
      case 'storm': weatherAdjustment = 1.6; break
    }
    
    const adjustedDuration = Math.round(baseDuration * timeAdjustment * weatherAdjustment)
    
    return {
      optimistic: Math.round(adjustedDuration * 0.85),
      realistic: adjustedDuration,
      pessimistic: Math.round(adjustedDuration * 1.5)
    }
  }
  
  // Route analysis
  private analyzeRoutes(
    primary: TransferRoute, 
    backup: TransferRoute, 
    request: TransferRequest
  ): RouteAnalysis {
    
    return {
      comparison: {
        primaryAdvantages: this.identifyRouteAdvantages(primary, backup),
        backupAdvantages: this.identifyRouteAdvantages(backup, primary),
        riskMitigation: this.assessRiskMitigation(primary, backup)
      },
      recommendations: {
        whenToUsePrimary: this.generateUsageRecommendation(primary, 'primary'),
        whenToUseBackup: this.generateUsageRecommendation(backup, 'backup'),
        criticalFactors: this.identifyCriticalFactors(request)
      },
      confidence: Math.round((primary.confidence + backup.confidence) / 2),
      lastAnalyzed: new Date()
    }
  }
  
  private identifyRouteAdvantages(route1: TransferRoute, route2: TransferRoute): string[] {
    const advantages: string[] = []
    
    if (route1.totalDuration < route2.totalDuration) {
      advantages.push(`${route2.totalDuration - route1.totalDuration} minutes faster`)
    }
    
    if (route1.totalCost < route2.totalCost) {
      advantages.push(`$${(route2.totalCost - route1.totalCost).toFixed(2)} cheaper`)
    }
    
    if (route1.complexity === 'simple' && route2.complexity !== 'simple') {
      advantages.push('Simpler route with fewer transfers')
    }
    
    if (!route1.weatherSensitive && route2.weatherSensitive) {
      advantages.push('Weather-independent')
    }
    
    return advantages
  }
  
  private assessRiskMitigation(primary: TransferRoute, backup: TransferRoute): string[] {
    const mitigation: string[] = []
    
    if (this.routesUseDifferentStrategies(primary, backup)) {
      mitigation.push('Routes use different transport modes for redundancy')
    }
    
    if (primary.weatherSensitive && !backup.weatherSensitive) {
      mitigation.push('Backup route unaffected by weather')
    }
    
    if (primary.punctuality === 'variable' && backup.punctuality === 'reliable') {
      mitigation.push('Backup route more reliable for time-sensitive journeys')
    }
    
    return mitigation
  }
  
  private generateUsageRecommendation(route: TransferRoute, type: 'primary' | 'backup'): string {
    const conditions: string[] = []
    
    if (route.weatherSensitive) {
      conditions.push('good weather')
    }
    
    if (route.complexity === 'complex') {
      conditions.push('when you have extra time')
    }
    
    if (route.punctuality === 'variable') {
      conditions.push('when flexible with timing')
    }
    
    if (type === 'primary') {
      return conditions.length > 0 
        ? `Use when ${conditions.join(' and ')}`
        : 'Recommended for normal conditions'
    } else {
      return conditions.length > 0 
        ? `Use when primary route is affected by ${conditions.join(' or ')}`
        : 'Use when primary route is unavailable'
    }
  }
  
  private identifyCriticalFactors(request: TransferRequest): string[] {
    const factors: string[] = []
    
    if (request.timing.arrivalBy) {
      factors.push('Time-critical journey - allow buffer time')
    }
    
    if (request.constraints.luggageConsiderations === 'heavy') {
      factors.push('Heavy luggage - prefer direct routes')
    }
    
    if (request.constraints.mustBeAccessible) {
      factors.push('Accessibility required - verify all segments')
    }
    
    if (request.context.weatherForecast && request.context.weatherForecast !== 'clear') {
      factors.push(`Weather: ${request.context.weatherForecast} - consider covered routes`)
    }
    
    return factors
  }
  
  // Helper methods
  private generateCacheKey(request: TransferRequest): string {
    const fromKey = `${request.from.coordinates.lat},${request.from.coordinates.lng}`
    const toKey = `${request.to.coordinates.lat},${request.to.coordinates.lng}`
    const contextKey = `${request.context.timeOfDay}-${request.context.dayOfWeek}`
    return `${fromKey}-${toKey}-${contextKey}`
  }
  
  private isCacheValid(routes: TransferRoute[]): boolean {
    const maxAge = 30 * 60 * 1000 // 30 minutes
    return routes.every(route => 
      Date.now() - route.lastUpdated.getTime() < maxAge
    )
  }
  
  private selectBestRoutes(cachedRoutes: TransferRoute[], request: TransferRequest): {
    primary: TransferRoute
    backup: TransferRoute
    analysis: RouteAnalysis
  } {
    const primary = cachedRoutes.find(r => r.type === 'primary') || cachedRoutes[0]
    const backup = cachedRoutes.find(r => r.type === 'backup') || cachedRoutes[1] || this.createFallbackRoute(request)
    
    return {
      primary,
      backup,
      analysis: this.analyzeRoutes(primary, backup, request)
    }
  }
  
  private deduplicateRoutes(candidates: TransferRoute[]): TransferRoute[] {
    // Remove very similar routes
    const unique: TransferRoute[] = []
    
    for (const candidate of candidates) {
      const isDuplicate = unique.some(existing => 
        this.routesAreSimilar(candidate, existing)
      )
      
      if (!isDuplicate) {
        unique.push(candidate)
      }
    }
    
    return unique
  }
  
  private routesAreSimilar(route1: TransferRoute, route2: TransferRoute): boolean {
    // Consider routes similar if they have same modes and similar duration/cost
    const modes1 = route1.segments.map(s => s.mode).sort()
    const modes2 = route2.segments.map(s => s.mode).sort()
    
    const sameModesSequence = JSON.stringify(modes1) === JSON.stringify(modes2)
    const similarDuration = Math.abs(route1.totalDuration - route2.totalDuration) < 5
    const similarCost = Math.abs(route1.totalCost - route2.totalCost) < 5
    
    return sameModesSequence && similarDuration && similarCost
  }
  
  private calculateDistance(coord1: { lat: number; lng: number }, coord2: { lat: number; lng: number }): number {
    // Haversine formula for distance calculation
    const R = 6371e3 // Earth's radius in meters
    const φ1 = coord1.lat * Math.PI/180
    const φ2 = coord2.lat * Math.PI/180
    const Δφ = (coord2.lat - coord1.lat) * Math.PI/180
    const Δλ = (coord2.lng - coord1.lng) * Math.PI/180
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    
    return Math.round(R * c) // Distance in meters
  }
  
  private convertToTransferPoint(stop: any): TransferPoint {
    return {
      name: stop.name || 'Stop',
      type: 'stop',
      coordinates: { lat: stop.lat || 0, lng: stop.lng || 0 },
      address: stop.address
    }
  }
  
  private generateRouteInstructions(segments: TransferSegment[]): RouteInstruction[] {
    return segments.map((segment, index) => ({
      step: index + 1,
      action: `Take ${segment.provider}`,
      detail: segment.instruction,
      duration: segment.duration,
      landmarks: segment.landmarks
    }))
  }
  
  private buildRouteFromSegments(
    segments: TransferSegment[], 
    strategy: string, 
    request: TransferRequest
  ): TransferRoute {
    // Implementation would build complete route from segments
    // This is a simplified version
    return {
      id: `route_${strategy}_${Date.now()}`,
      type: 'primary',
      confidence: 80,
      segments,
      totalDuration: segments.reduce((sum, s) => sum + s.duration, 0),
      totalDistance: 5000,
      totalCost: segments.reduce((sum, s) => sum + s.fare, 0),
      currency: 'USD',
      operatingHours: { start: '05:00', end: '01:00' },
      frequency: 'variable',
      weatherSensitive: segments.some(s => s.weatherDependent),
      seasonalOperation: false,
      capacity: 'medium',
      complexity: segments.length === 1 ? 'simple' : segments.length <= 2 ? 'moderate' : 'complex',
      walkingRequired: segments.filter(s => s.mode === 'walking').reduce((sum, s) => sum + s.duration, 0),
      luggage: 'manageable',
      accessibility: segments.every(s => s.accessibility),
      comfort: 'standard',
      punctuality: 'reliable',
      trackingAvailable: false,
      alternativeOptions: true,
      instructions: this.generateRouteInstructions(segments),
      estimatedTime: {
        optimistic: Math.round(segments.reduce((sum, s) => sum + s.duration, 0) * 0.9),
        realistic: segments.reduce((sum, s) => sum + s.duration, 0),
        pessimistic: Math.round(segments.reduce((sum, s) => sum + s.duration, 0) * 1.3)
      },
      providerInfo: {
        name: segments[0]?.provider || 'Mixed',
        bookingRequired: false
      },
      lastUpdated: new Date()
    }
  }
  
  // Stub methods for route generation strategies (would be implemented with real logic)
  private async findDirectConnection(from: TransferPoint, to: TransferPoint, modes: string[]): Promise<TransferSegment | null> {
    // Implementation would search for direct connections
    return null
  }
  
  private async buildReliableMultiModalRoute(request: TransferRequest): Promise<TransferSegment[]> {
    // Implementation would build multi-modal route prioritizing reliability
    return []
  }
  
  private async findCheapestPublicRoute(request: TransferRequest): Promise<TransferSegment[]> {
    // Implementation would find cheapest combination of public transport
    return []
  }
  
  private async generateTaxiRoute(request: TransferRequest): Promise<TransferRoute | null> {
    // Implementation would generate taxi route
    return null
  }
  
  private async findOneTransferRoute(request: TransferRequest): Promise<TransferRoute | null> {
    // Implementation would find route with exactly one transfer
    return null
  }
  
  private async findBetterPickupPoint(from: TransferPoint): Promise<TransferPoint | null> {
    // Implementation would find better pickup locations
    return null
  }
  
  private async createWalkingSegment(from: TransferPoint, to: TransferPoint): Promise<TransferSegment> {
    const distance = this.calculateDistance(from.coordinates, to.coordinates)
    const duration = Math.round(distance / 80) // ~5km/h walking speed
    
    return {
      id: 'walking_segment',
      mode: 'walking',
      startPoint: from,
      endPoint: to,
      duration,
      provider: 'Walking',
      fare: 0,
      operatingHours: '24/7',
      weatherDependent: true,
      accessibility: true,
      luggageFriendly: true,
      instruction: `Walk ${distance}m (${duration} minutes) from ${from.name} to ${to.name}`
    }
  }
  
  private async createTaxiSegment(from: TransferPoint, to: TransferPoint): Promise<TransferSegment> {
    const distance = this.calculateDistance(from.coordinates, to.coordinates)
    const duration = Math.round(distance / 500) // ~30km/h average city speed
    const fare = Math.round(distance * 0.002 + 3) // Base fare + distance
    
    return {
      id: 'taxi_segment',
      mode: 'taxi',
      startPoint: from,
      endPoint: to,
      duration,
      provider: 'Taxi Service',
      fare,
      operatingHours: '24/7',
      weatherDependent: false,
      accessibility: true,
      luggageFriendly: true,
      instruction: `Take taxi from ${from.name} to ${to.name}`
    }
  }
  
  private async planPublicTransportJourney(request: TransferRequest): Promise<TransferSegment[]> {
    // Implementation would plan complex public transport journey
    return []
  }
}

export interface RouteAnalysis {
  comparison: {
    primaryAdvantages: string[]
    backupAdvantages: string[]
    riskMitigation: string[]
  }
  recommendations: {
    whenToUsePrimary: string
    whenToUseBackup: string
    criticalFactors: string[]
  }
  confidence: number
  lastAnalyzed: Date
}