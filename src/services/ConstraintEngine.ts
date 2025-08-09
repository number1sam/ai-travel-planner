// Constraint Engine - The core system that decides what's allowed and scores options
// Following specification: universal rules, hard constraints never violated, soft constraints scored and traded

import { TripBrief, Constraint, ConstraintType, TripDecision, PendingConfirmation } from '../types/TripBrief'

export interface ProviderQuery {
  domain: 'accommodation' | 'activities' | 'dining' | 'flights' | 'transport'
  parameters: Record<string, any>
  constraints: {
    hard: Record<string, any>
    soft: Record<string, any>
  }
  filters: string[] // Applied filters
  scoring: ScoringRules
}

export interface ScoringRules {
  weights: Record<string, number> // How important each factor is (0-1)
  penalties: Record<string, number> // Penalty for missing soft constraints
  bonuses: Record<string, number> // Bonus for exceeding expectations
}

export interface CandidateResult {
  id: string
  domain: string
  data: any // Raw provider data
  score: number // Overall score (0-100)
  scoringBreakdown: Record<string, number>
  constraintViolations: string[] // Hard constraint violations (should be empty for valid results)
  constraintSatisfaction: Record<string, boolean> // Which constraints are satisfied
  reasoning: string // Why this scored the way it did
  deepLink?: string // Direct booking link with exact parameters
  uncertainty: string[] // What we're not sure about
}

export class ConstraintEngine {
  private tripBrief: TripBrief
  private validationRules: Map<string, ValidationRule> = new Map()
  
  constructor(tripBrief: TripBrief) {
    this.tripBrief = tripBrief
    this.initializeValidationRules()
  }
  
  // Update the trip brief (called when conversation context changes)
  updateTripBrief(tripBrief: TripBrief): void {
    this.tripBrief = tripBrief
  }
  
  // Build a provider query with all constraints
  buildProviderQuery(domain: string): ProviderQuery {
    const hardConstraints: Record<string, any> = {}
    const softConstraints: Record<string, any> = {}
    const parameters: Record<string, any> = {}
    
    // Extract constraints based on domain
    switch (domain) {
      case 'accommodation':
        return this.buildAccommodationQuery(hardConstraints, softConstraints, parameters)
      case 'activities':
        return this.buildActivitiesQuery(hardConstraints, softConstraints, parameters)
      case 'dining':
        return this.buildDiningQuery(hardConstraints, softConstraints, parameters)
      case 'flights':
        return this.buildFlightsQuery(hardConstraints, softConstraints, parameters)
      case 'transport':
        return this.buildTransportQuery(hardConstraints, softConstraints, parameters)
      default:
        throw new Error(`Unknown domain: ${domain}`)
    }
  }
  
  // Accommodation Query Builder
  private buildAccommodationQuery(hard: Record<string, any>, soft: Record<string, any>, params: Record<string, any>): ProviderQuery {
    // HARD CONSTRAINTS - must match
    if (this.tripBrief.destination?.primary) {
      const dest = this.tripBrief.destination.primary
      hard.destination = dest.value
      params.city = dest.value
      
      // Add coordinates for better matching
      if (this.tripBrief.destination.coordinates) {
        params.coordinates = this.tripBrief.destination.coordinates.value
      }
    }
    
    if (this.tripBrief.dates?.startDate && this.tripBrief.dates?.endDate) {
      hard.checkinDate = this.tripBrief.dates.startDate.value
      hard.checkoutDate = this.tripBrief.dates.endDate.value
      params.checkin = this.tripBrief.dates.startDate.value
      params.checkout = this.tripBrief.dates.endDate.value
    }
    
    if (this.tripBrief.travelers?.adults) {
      hard.guests = this.tripBrief.travelers.adults.value
      params.guests = this.tripBrief.travelers.adults.value
      
      if (this.tripBrief.travelers.children?.value) {
        params.children = this.tripBrief.travelers.children.value
      }
    }
    
    // Budget constraints
    if (this.tripBrief.budget?.breakdown?.accommodation) {
      const accomBudget = this.tripBrief.budget.breakdown.accommodation.value
      hard.maxPricePerNight = accomBudget.max
      params.maxPrice = accomBudget.max
      soft.preferredPricePerNight = accomBudget.preferred
    }
    
    // SOFT CONSTRAINTS - scored and traded
    if (this.tripBrief.preferences?.accommodation?.types) {
      soft.propertyTypes = this.tripBrief.preferences.accommodation.types.value
    }
    
    if (this.tripBrief.preferences?.accommodation?.amenities) {
      soft.requiredAmenities = this.tripBrief.preferences.accommodation.amenities.value
    }
    
    if (this.tripBrief.preferences?.accommodation?.location) {
      soft.locationPreference = this.tripBrief.preferences.accommodation.location.value
    }
    
    if (this.tripBrief.preferences?.accommodation?.rating) {
      const rating = this.tripBrief.preferences.accommodation.rating.value
      hard.minRating = rating.min
      soft.preferredRating = rating.preferred
    }
    
    return {
      domain: 'accommodation',
      parameters: params,
      constraints: { hard, soft },
      filters: this.buildAccommodationFilters(),
      scoring: this.buildAccommodationScoring()
    }
  }
  
  // Activities Query Builder
  private buildActivitiesQuery(hard: Record<string, any>, soft: Record<string, any>, params: Record<string, any>): ProviderQuery {
    // Hard constraints
    if (this.tripBrief.destination?.primary) {
      hard.destination = this.tripBrief.destination.primary.value
      params.location = this.tripBrief.destination.primary.value
    }
    
    if (this.tripBrief.dates?.startDate && this.tripBrief.dates?.endDate) {
      hard.availableDates = {
        start: this.tripBrief.dates.startDate.value,
        end: this.tripBrief.dates.endDate.value
      }
      params.dateRange = { 
        start: this.tripBrief.dates.startDate.value,
        end: this.tripBrief.dates.endDate.value
      }
    }
    
    if (this.tripBrief.budget?.breakdown?.activities) {
      const activityBudget = this.tripBrief.budget.breakdown.activities.value
      hard.maxPricePerActivity = activityBudget.max
      soft.preferredPricePerActivity = activityBudget.preferred
    }
    
    // Soft constraints
    if (this.tripBrief.preferences?.activities?.themes) {
      soft.preferredThemes = this.tripBrief.preferences.activities.themes.value
    }
    
    if (this.tripBrief.preferences?.activities?.intensity) {
      soft.intensityLevel = this.tripBrief.preferences.activities.intensity.value
    }
    
    if (this.tripBrief.preferences?.activities?.group) {
      soft.groupType = this.tripBrief.preferences.activities.group.value
    }
    
    return {
      domain: 'activities',
      parameters: params,
      constraints: { hard, soft },
      filters: this.buildActivitiesFilters(),
      scoring: this.buildActivitiesScoring()
    }
  }
  
  // Dining Query Builder
  private buildDiningQuery(hard: Record<string, any>, soft: Record<string, any>, params: Record<string, any>): ProviderQuery {
    // Hard constraints
    if (this.tripBrief.destination?.primary) {
      hard.location = this.tripBrief.destination.primary.value
      params.city = this.tripBrief.destination.primary.value
    }
    
    if (this.tripBrief.budget?.perMealLimits) {
      hard.mealBudgets = this.tripBrief.budget.perMealLimits
    }
    
    if (this.tripBrief.preferences?.dining?.dietary) {
      hard.dietaryRestrictions = this.tripBrief.preferences.dining.dietary.value
    }
    
    // Soft constraints  
    if (this.tripBrief.preferences?.dining?.cuisines) {
      soft.cuisinePreferences = this.tripBrief.preferences.dining.cuisines.value
    }
    
    if (this.tripBrief.preferences?.dining?.atmosphere) {
      soft.atmosphere = this.tripBrief.preferences.dining.atmosphere.value
    }
    
    return {
      domain: 'dining',
      parameters: params,
      constraints: { hard, soft },
      filters: this.buildDiningFilters(),
      scoring: this.buildDiningScoring()
    }
  }
  
  // Flights Query Builder
  private buildFlightsQuery(hard: Record<string, any>, soft: Record<string, any>, params: Record<string, any>): ProviderQuery {
    // Hard constraints
    if (this.tripBrief.origin) {
      hard.origin = this.tripBrief.origin.value
      params.from = this.tripBrief.origin.value
    }
    
    if (this.tripBrief.destination?.primary) {
      hard.destination = this.tripBrief.destination.primary.value
      params.to = this.tripBrief.destination.primary.value
    }
    
    if (this.tripBrief.dates?.startDate) {
      hard.departureDate = this.tripBrief.dates.startDate.value
      params.departureDate = this.tripBrief.dates.startDate.value
    }
    
    if (this.tripBrief.dates?.endDate) {
      hard.returnDate = this.tripBrief.dates.endDate.value
      params.returnDate = this.tripBrief.dates.endDate.value
    }
    
    if (this.tripBrief.travelers?.adults) {
      hard.passengers = this.tripBrief.travelers.adults.value
      params.passengers = this.tripBrief.travelers.adults.value
    }
    
    if (this.tripBrief.budget?.breakdown?.transport) {
      const transportBudget = this.tripBrief.budget.breakdown.transport.value
      hard.maxPrice = transportBudget.max
      soft.preferredPrice = transportBudget.preferred
    }
    
    // Flight-specific constraints
    if (this.tripBrief.preferences?.transport?.flightPreferences) {
      const flightPrefs = this.tripBrief.preferences.transport.flightPreferences
      
      if (flightPrefs.airports) {
        soft.preferredAirports = flightPrefs.airports.value
      }
      
      if (flightPrefs.airlines) {
        const airlines = flightPrefs.airlines.value
        soft.preferredAirlines = airlines.preferred
        hard.avoidAirlines = airlines.avoid
      }
      
      if (flightPrefs.stops) {
        if (flightPrefs.stops.value === 'direct-only') {
          hard.maxStops = 0
        } else if (flightPrefs.stops.value === 'one-stop-ok') {
          hard.maxStops = 1
        }
      }
      
      if (flightPrefs.cabinClass) {
        soft.preferredCabin = flightPrefs.cabinClass.value
      }
    }
    
    return {
      domain: 'flights',
      parameters: params,
      constraints: { hard, soft },
      filters: this.buildFlightsFilters(),
      scoring: this.buildFlightsScoring()
    }
  }
  
  // Transport Query Builder (local)
  private buildTransportQuery(hard: Record<string, any>, soft: Record<string, any>, params: Record<string, any>): ProviderQuery {
    // Hard constraints
    if (this.tripBrief.destination?.primary) {
      hard.city = this.tripBrief.destination.primary.value
      params.city = this.tripBrief.destination.primary.value
    }
    
    if (this.tripBrief.preferences?.transport?.localTransport) {
      const localPrefs = this.tripBrief.preferences.transport.localTransport
      
      if (localPrefs.modes) {
        soft.preferredModes = localPrefs.modes.value
      }
      
      if (localPrefs.avoid) {
        hard.avoidModes = localPrefs.avoid.value
      }
      
      if (localPrefs.walkingTolerance) {
        hard.maxWalkingMinutes = localPrefs.walkingTolerance.value
      }
      
      if (localPrefs.comfortLevel) {
        soft.comfortLevel = localPrefs.comfortLevel.value
      }
    }
    
    return {
      domain: 'transport',
      parameters: params,
      constraints: { hard, soft },
      filters: this.buildTransportFilters(),
      scoring: this.buildTransportScoring()
    }
  }
  
  // Score candidate results against constraints
  scoreCandidates(candidates: any[], query: ProviderQuery): CandidateResult[] {
    const results: CandidateResult[] = []
    
    for (const candidate of candidates) {
      const result = this.scoreCandidate(candidate, query)
      
      // Only include candidates that don't violate hard constraints
      if (result.constraintViolations.length === 0) {
        results.push(result)
      }
    }
    
    // Sort by score (highest first)
    return results.sort((a, b) => b.score - a.score)
  }
  
  // Score individual candidate
  private scoreCandidate(candidate: any, query: ProviderQuery): CandidateResult {
    const violations: string[] = []
    const satisfaction: Record<string, boolean> = {}
    const scoringBreakdown: Record<string, number> = {}
    let totalScore = 0
    const uncertainty: string[] = []
    
    // Check hard constraints (must pass)
    for (const [key, value] of Object.entries(query.constraints.hard)) {
      const passed = this.checkHardConstraint(candidate, key, value)
      satisfaction[`hard_${key}`] = passed
      
      if (!passed) {
        violations.push(`Hard constraint violated: ${key}`)
      }
    }
    
    // Score soft constraints (if no hard violations)
    if (violations.length === 0) {
      for (const [key, value] of Object.entries(query.constraints.soft)) {
        const score = this.scoreSoftConstraint(candidate, key, value, query.scoring)
        satisfaction[`soft_${key}`] = score > 0.5
        scoringBreakdown[key] = score
        totalScore += score * (query.scoring.weights[key] || 0.1)
      }
      
      // Normalize score to 0-100
      totalScore = Math.min(100, Math.max(0, totalScore * 100))
    }
    
    return {
      id: candidate.id || `${Date.now()}-${Math.random()}`,
      domain: query.domain,
      data: candidate,
      score: totalScore,
      scoringBreakdown,
      constraintViolations: violations,
      constraintSatisfaction: satisfaction,
      reasoning: this.generateScoringReasoning(query.domain, scoringBreakdown, violations),
      deepLink: this.generateDeepLink(candidate, query),
      uncertainty: uncertainty
    }
  }
  
  // Check if hard constraint is satisfied
  private checkHardConstraint(candidate: any, key: string, value: any): boolean {
    // Implementation depends on the specific constraint
    switch (key) {
      case 'destination':
      case 'location':
      case 'city':
        return this.normalizeLocation(candidate.location || candidate.city) === 
               this.normalizeLocation(value)
      
      case 'checkinDate':
        return candidate.availability?.checkin <= value
        
      case 'checkoutDate':
        return candidate.availability?.checkout >= value
        
      case 'guests':
        return (candidate.maxGuests || candidate.capacity) >= value
        
      case 'maxPricePerNight':
      case 'maxPrice':
        return (candidate.price || candidate.cost) <= value
        
      case 'minRating':
        return (candidate.rating || 0) >= value
        
      case 'maxStops':
        return (candidate.stops || 0) <= value
        
      case 'avoidAirlines':
        return !value.includes(candidate.airline)
        
      case 'avoidModes':
        return !value.includes(candidate.mode || candidate.type)
        
      case 'dietaryRestrictions':
        return this.checkDietaryCompatibility(candidate, value)
        
      default:
        console.warn(`Unknown hard constraint: ${key}`)
        return true // Don't block on unknown constraints
    }
  }
  
  // Score soft constraint (0-1)
  private scoreSoftConstraint(candidate: any, key: string, value: any, scoring: ScoringRules): number {
    switch (key) {
      case 'preferredPricePerNight':
      case 'preferredPrice':
        return this.scorePrice(candidate.price || candidate.cost, value)
        
      case 'preferredRating':
        return this.scoreRating(candidate.rating || 0, value)
        
      case 'propertyTypes':
        return value.includes(candidate.type || candidate.propertyType) ? 1 : 0.3
        
      case 'locationPreference':
        return this.scoreLocation(candidate, value)
        
      case 'preferredThemes':
        return this.scoreThemes(candidate.tags || candidate.categories || [], value)
        
      case 'cuisinePreferences':
        return this.scoreCuisine(candidate.cuisine || candidate.type, value)
        
      default:
        return 0.5 // Neutral score for unknown constraints
    }
  }
  
  // Scoring helper methods
  private scorePrice(actual: number, preferred: number): number {
    if (!actual || !preferred) return 0.5
    
    const ratio = actual / preferred
    if (ratio <= 1) return 1 // At or under preferred price
    if (ratio <= 1.2) return 0.8 // Within 20%
    if (ratio <= 1.5) return 0.5 // Within 50%
    return 0.2 // Over 50% more expensive
  }
  
  private scoreRating(actual: number, preferred: number): number {
    if (!actual) return 0.3
    if (actual >= preferred) return 1
    
    const diff = preferred - actual
    return Math.max(0, 1 - (diff * 0.3)) // Penalty for each star below
  }
  
  private scoreLocation(candidate: any, preference: string): number {
    const location = candidate.location || candidate.neighborhood || ''
    
    switch (preference) {
      case 'city-center':
        return location.toLowerCase().includes('center') || 
               location.toLowerCase().includes('downtown') ? 1 : 0.3
               
      case 'near-transport':
        return candidate.nearTransport || 
               location.toLowerCase().includes('station') ? 1 : 0.4
               
      case 'quiet':
        return candidate.quiet || 
               location.toLowerCase().includes('quiet') ? 1 : 0.5
               
      default:
        return 0.5
    }
  }
  
  private scoreThemes(candidateThemes: string[], preferredThemes: string[]): number {
    const matches = candidateThemes.filter(theme => 
      preferredThemes.some(pref => 
        theme.toLowerCase().includes(pref.toLowerCase()) ||
        pref.toLowerCase().includes(theme.toLowerCase())
      )
    )
    
    return matches.length / Math.max(preferredThemes.length, 1)
  }
  
  private scoreCuisine(candidateCuisine: string, preferences: { preferred: string[], avoid: string[] }): number {
    if (preferences.avoid?.some(avoid => 
      candidateCuisine.toLowerCase().includes(avoid.toLowerCase())
    )) {
      return 0 // Avoid this cuisine
    }
    
    if (preferences.preferred?.some(pref => 
      candidateCuisine.toLowerCase().includes(pref.toLowerCase())
    )) {
      return 1 // Perfect match
    }
    
    return 0.6 // Neutral
  }
  
  // Helper methods
  private normalizeLocation(location: string): string {
    return location?.toLowerCase().trim().replace(/[^a-z0-9]/g, '') || ''
  }
  
  private checkDietaryCompatibility(candidate: any, restrictions: string[]): boolean {
    const candidateOptions = candidate.dietaryOptions || candidate.dietary || []
    return restrictions.every(restriction => 
      candidateOptions.includes(restriction)
    )
  }
  
  private generateScoringReasoning(domain: string, breakdown: Record<string, number>, violations: string[]): string {
    if (violations.length > 0) {
      return `Rejected: ${violations.join(', ')}`
    }
    
    const topScores = Object.entries(breakdown)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([key, score]) => `${key}: ${(score * 100).toFixed(0)}%`)
      .join(', ')
      
    return `Top scoring factors: ${topScores}`
  }
  
  private generateDeepLink(candidate: any, query: ProviderQuery): string | undefined {
    // Generate provider-specific deep links
    if (candidate.bookingUrl) {
      return candidate.bookingUrl
    }
    
    // Build deep link with exact parameters
    // This would be provider-specific implementation
    return undefined
  }
  
  // Scoring rule builders
  private buildAccommodationScoring(): ScoringRules {
    return {
      weights: {
        price: 0.3,
        rating: 0.25,
        location: 0.25,
        amenities: 0.15,
        policies: 0.05
      },
      penalties: {
        noFreeCancellation: 0.1,
        noBreakfast: 0.05
      },
      bonuses: {
        freeUpgrade: 0.1,
        exceptionalRating: 0.05
      }
    }
  }
  
  private buildActivitiesScoring(): ScoringRules {
    return {
      weights: {
        themeMatch: 0.4,
        price: 0.25,
        rating: 0.2,
        availability: 0.1,
        groupSize: 0.05
      },
      penalties: {
        weatherDependent: 0.05,
        bookingRequired: 0.03
      },
      bonuses: {
        uniqueExperience: 0.1,
        localRecommended: 0.05
      }
    }
  }
  
  private buildDiningScoring(): ScoringRules {
    return {
      weights: {
        cuisine: 0.3,
        price: 0.25,
        rating: 0.2,
        location: 0.15,
        atmosphere: 0.1
      },
      penalties: {
        noReservations: 0.05,
        limitedDietary: 0.1
      },
      bonuses: {
        localSpecialty: 0.1,
        chefRecommended: 0.05
      }
    }
  }
  
  private buildFlightsScoring(): ScoringRules {
    return {
      weights: {
        price: 0.35,
        duration: 0.25,
        stops: 0.2,
        timing: 0.15,
        airline: 0.05
      },
      penalties: {
        earlyDeparture: 0.05,
        lateArrival: 0.05,
        shortLayover: 0.1
      },
      bonuses: {
        directFlight: 0.15,
        preferredAirline: 0.05
      }
    }
  }
  
  private buildTransportScoring(): ScoringRules {
    return {
      weights: {
        duration: 0.3,
        cost: 0.25,
        convenience: 0.2,
        comfort: 0.15,
        reliability: 0.1
      },
      penalties: {
        walkingRequired: 0.05,
        weatherDependent: 0.03
      },
      bonuses: {
        doorToDoor: 0.1,
        realTimeTracking: 0.02
      }
    }
  }
  
  // Filter builders
  private buildAccommodationFilters(): string[] {
    const filters = ['available', 'within-budget']
    
    if (this.tripBrief.preferences?.accommodation?.rating?.value?.min) {
      filters.push('min-rating')
    }
    
    return filters
  }
  
  private buildActivitiesFilters(): string[] {
    return ['available-dates', 'capacity', 'weather-appropriate']
  }
  
  private buildDiningFilters(): string[] {
    const filters = ['dietary-compatible']
    
    if (this.tripBrief.budget?.perMealLimits) {
      filters.push('within-meal-budget')
    }
    
    return filters
  }
  
  private buildFlightsFilters(): string[] {
    return ['available-dates', 'correct-airports', 'within-budget']
  }
  
  private buildTransportFilters(): string[] {
    return ['operating-hours', 'accessible-routes']
  }
  
  // Validation rules
  private initializeValidationRules(): void {
    this.validationRules.set('destination_required', {
      field: 'destination.primary',
      validate: (brief: TripBrief) => !!brief.destination?.primary?.value,
      message: 'Destination is required'
    })
    
    this.validationRules.set('dates_required', {
      field: 'dates',
      validate: (brief: TripBrief) => !!brief.dates?.startDate?.value && !!brief.dates?.endDate?.value,
      message: 'Travel dates are required'
    })
    
    this.validationRules.set('budget_required', {
      field: 'budget.total',
      validate: (brief: TripBrief) => !!brief.budget?.total?.value && brief.budget.total.value > 0,
      message: 'Budget is required'
    })
  }
  
  // Validate trip brief for completeness
  validateTripBrief(): string[] {
    const errors: string[] = []
    
    for (const [ruleId, rule] of this.validationRules) {
      if (!rule.validate(this.tripBrief)) {
        errors.push(rule.message)
      }
    }
    
    return errors
  }
}

interface ValidationRule {
  field: string
  validate: (brief: TripBrief) => boolean
  message: string
}