// Enterprise-level flight search engine as per specifications

export interface SearchSpec {
  // Airport constraints
  departureAirports: string[]  // IATA codes - hard constraints if user specified codes
  arrivalAirports: string[]    // IATA codes - hard constraints if user specified codes
  allowAlternateAirports: boolean
  
  // Date and time constraints
  departureDate: string
  returnDate?: string
  departureTimeWindow?: { earliest: string, latest: string }
  arrivalTimeWindow?: { earliest: string, latest: string }
  dateFlexibility: number // ±days
  
  // Passenger details
  adults: number
  children: number
  infants: number
  
  // Service requirements
  cabinClass: 'economy' | 'premium_economy' | 'business' | 'first'
  checkedBags: number
  carryOnBags: number
  
  // Constraints and preferences
  nonstopOnly: boolean
  maxConnections: number
  noOvernightLayovers: boolean
  maxLayoverHours: number
  
  // Budget
  maxPrice: number
  currency: string
  budgetFlexibility: 'strict' | 'moderate' | 'flexible'
  
  // Deal breakers and preferences
  preferredAirlines: string[]
  avoidedAirlines: string[]
  requireWiFi: boolean
  requirePower: boolean
  seatSelectionRequired: boolean
}

export interface FlightSegment {
  airline: string
  flightNumber: string
  departureAirport: string
  arrivalAirport: string
  departureTime: string
  arrivalTime: string
  duration: number // minutes
  aircraft: string
  terminal?: string
}

export interface FlightItinerary {
  id: string
  outbound: FlightSegment[]
  inbound?: FlightSegment[]
  
  // Pricing
  totalPrice: number
  baseFare: number
  taxes: number
  fees: number
  nativeCurrency: string
  priceUSD: number
  priceGBP: number
  priceTimestamp: string
  
  // Service details
  fareBrand: string
  includedBags: { carry: number, checked: number }
  seatSelection: 'free' | 'paid' | 'none'
  changes: { allowed: boolean, fee?: number }
  refunds: { allowed: boolean, fee?: number }
  
  // Convenience scores
  totalDuration: number // minutes
  connectionCount: number
  minConnectionTime: number
  convenientTimes: boolean
  
  // Quality indicators
  onTimePerformance: number
  safetyRating: string
  wifiAvailable: boolean
  powerAvailable: boolean
}

// Airport data and resolution
const AIRPORT_GROUPS = {
  // Major city airport groups
  'london': ['LHR', 'LGW', 'LCY', 'LTN', 'STN'],
  'paris': ['CDG', 'ORY', 'BVA'],
  'new york': ['JFK', 'EWR', 'LGA'],
  'milan': ['MXP', 'LIN', 'BGY'],
  'rome': ['FCO', 'CIA'],
  'barcelona': ['BCN', 'GRO'],
  'amsterdam': ['AMS'],
  'madrid': ['MAD'],
  'manchester': ['MAN'],
  'edinburgh': ['EDI'],
  'dublin': ['DUB'],
  'berlin': ['BER'],
  'munich': ['MUC'],
  'zurich': ['ZUR']
}

const AIRPORT_DETAILS = {
  // London airports
  'LHR': { name: 'London Heathrow', city: 'London', country: 'GB', timezone: 'Europe/London', mcm: { domestic: 60, international: 75 } },
  'LGW': { name: 'London Gatwick', city: 'London', country: 'GB', timezone: 'Europe/London', mcm: { domestic: 45, international: 60 } },
  'LCY': { name: 'London City', city: 'London', country: 'GB', timezone: 'Europe/London', mcm: { domestic: 30, international: 45 } },
  'LTN': { name: 'London Luton', city: 'London', country: 'GB', timezone: 'Europe/London', mcm: { domestic: 45, international: 60 } },
  'STN': { name: 'London Stansted', city: 'London', country: 'GB', timezone: 'Europe/London', mcm: { domestic: 45, international: 60 } },
  
  // Paris airports
  'CDG': { name: 'Paris Charles de Gaulle', city: 'Paris', country: 'FR', timezone: 'Europe/Paris', mcm: { domestic: 60, international: 90 } },
  'ORY': { name: 'Paris Orly', city: 'Paris', country: 'FR', timezone: 'Europe/Paris', mcm: { domestic: 45, international: 60 } },
  
  // Other major airports
  'JFK': { name: 'New York JFK', city: 'New York', country: 'US', timezone: 'America/New_York', mcm: { domestic: 90, international: 120 } },
  'MAN': { name: 'Manchester', city: 'Manchester', country: 'GB', timezone: 'Europe/London', mcm: { domestic: 45, international: 60 } },
  'BCN': { name: 'Barcelona El Prat', city: 'Barcelona', country: 'ES', timezone: 'Europe/Madrid', mcm: { domestic: 45, international: 60 } }
}

export class FlightSearchEngine {
  
  /**
   * Parse user input into a precise SearchSpec without losing intent
   */
  public parseUserInput(userMessage: string, tripContext: any): SearchSpec {
    const spec: Partial<SearchSpec> = {
      adults: tripContext.travelers || 1,
      children: 0,
      infants: 0,
      cabinClass: 'economy',
      checkedBags: 1,
      carryOnBags: 1,
      nonstopOnly: false,
      maxConnections: 2,
      noOvernightLayovers: true,
      maxLayoverHours: 8,
      maxPrice: tripContext.budget ? parseInt(tripContext.budget.replace(/[£$€,]/g, '')) * 0.25 : 1000,
      currency: 'GBP',
      budgetFlexibility: 'moderate',
      dateFlexibility: 0,
      preferredAirlines: [],
      avoidedAirlines: [],
      requireWiFi: false,
      requirePower: false,
      seatSelectionRequired: false,
      allowAlternateAirports: false
    }
    
    // Parse departure and arrival locations
    const { departure, destination } = this.parseLocations(tripContext.departure, tripContext.destination)
    spec.departureAirports = departure.airports
    spec.arrivalAirports = destination.airports
    spec.allowAlternateAirports = departure.isFlexible || destination.isFlexible
    
    // Parse dates
    spec.departureDate = this.calculateDepartureDate(tripContext.duration)
    spec.returnDate = this.calculateReturnDate(spec.departureDate, tripContext.duration)
    
    // Parse constraints from user message
    const constraints = this.parseConstraints(userMessage)
    Object.assign(spec, constraints)
    
    return spec as SearchSpec
  }
  
  /**
   * Parse location input and resolve to airport codes
   */
  private parseLocations(departure: string, destination: string) {
    const parseLocation = (location: string) => {
      const loc = location.toLowerCase().trim()
      
      // Check if user specified IATA codes directly
      const iataMatch = loc.match(/\b([A-Z]{3})\b/i)
      if (iataMatch && AIRPORT_DETAILS[iataMatch[1].toUpperCase()]) {
        return {
          airports: [iataMatch[1].toUpperCase()],
          isFlexible: false,
          needsConfirmation: false
        }
      }
      
      // Resolve city names to airport groups
      for (const [city, airports] of Object.entries(AIRPORT_GROUPS)) {
        if (loc.includes(city)) {
          return {
            airports: airports,
            isFlexible: true,
            needsConfirmation: airports.length > 1
          }
        }
      }
      
      // Fallback - treat as unknown but searchable
      return {
        airports: [loc.toUpperCase()],
        isFlexible: false,
        needsConfirmation: true
      }
    }
    
    return {
      departure: parseLocation(departure),
      destination: parseLocation(destination)
    }
  }
  
  /**
   * Parse constraints and preferences from natural language
   */
  private parseConstraints(message: string): Partial<SearchSpec> {
    const msg = message.toLowerCase()
    const constraints: Partial<SearchSpec> = {}
    
    // Time preferences
    if (msg.includes('nonstop') || msg.includes('direct')) {
      constraints.nonstopOnly = true
    }
    
    if (msg.includes('arrive before')) {
      const timeMatch = msg.match(/arrive before (\d{1,2}):?(\d{2})?/)
      if (timeMatch) {
        constraints.arrivalTimeWindow = {
          earliest: '00:00',
          latest: `${timeMatch[1].padStart(2, '0')}:${timeMatch[2] || '00'}`
        }
      }
    }
    
    if (msg.includes('no overnight') || msg.includes('no red.eye')) {
      constraints.noOvernightLayovers = true
    }
    
    // Budget flexibility
    if (msg.includes('strict budget') || msg.includes('must not exceed')) {
      constraints.budgetFlexibility = 'strict'
    } else if (msg.includes('flexible') || msg.includes('up to')) {
      constraints.budgetFlexibility = 'flexible'
    }
    
    // Date flexibility
    const flexMatch = msg.match(/(\±|\+\-|\+\/\-)?\s*(\d+)\s*days?/)
    if (flexMatch) {
      constraints.dateFlexibility = parseInt(flexMatch[2])
    }
    
    // Baggage requirements
    if (msg.includes('no checked bag') || msg.includes('carry.on only')) {
      constraints.checkedBags = 0
    } else if (msg.includes('two bags') || msg.includes('2 bags')) {
      constraints.checkedBags = 2
    }
    
    // Service requirements
    if (msg.includes('wifi') || msg.includes('internet')) {
      constraints.requireWiFi = true
    }
    
    if (msg.includes('power') || msg.includes('charging')) {
      constraints.requirePower = true
    }
    
    // Cabin preferences
    if (msg.includes('business') || msg.includes('business class')) {
      constraints.cabinClass = 'business'
    } else if (msg.includes('premium economy')) {
      constraints.cabinClass = 'premium_economy'
    } else if (msg.includes('first class')) {
      constraints.cabinClass = 'first'
    }
    
    return constraints
  }
  
  /**
   * Calculate departure date based on trip duration
   */
  private calculateDepartureDate(duration: string): string {
    const daysFromNow = 7 // Default to next week
    const date = new Date()
    date.setDate(date.getDate() + daysFromNow)
    return date.toISOString().split('T')[0]
  }
  
  /**
   * Calculate return date based on departure and duration
   */
  private calculateReturnDate(departureDate: string, duration: string): string {
    const dept = new Date(departureDate)
    const days = parseInt(duration) || 7
    dept.setDate(dept.getDate() + days)
    return dept.toISOString().split('T')[0]
  }
  
  /**
   * Query flight providers for live availability
   */
  public async searchFlights(spec: SearchSpec): Promise<FlightItinerary[]> {
    console.log('Searching flights with spec:', spec)
    
    // In a real implementation, this would query:
    // - Airline NDC feeds
    // - GDS systems (Amadeus, Sabre, Travelport)
    // - Aggregator APIs (Skyscanner, Kayak)
    
    // For now, generate realistic mock results based on the SearchSpec
    return this.generateRealisticResults(spec)
  }
  
  /**
   * Generate realistic flight results based on SearchSpec
   */
  private async generateRealisticResults(spec: SearchSpec): Promise<FlightItinerary[]> {
    const results: FlightItinerary[] = []
    
    // Generate multiple options with different trade-offs
    const basePrice = this.calculateBasePrice(spec)
    
    // Option 1: Nonstop premium (if available for route)
    if (this.hasNonstopRoute(spec.departureAirports[0], spec.arrivalAirports[0])) {
      results.push(this.createNonstopOption(spec, basePrice * 1.3))
    }
    
    // Option 2: One-stop value option
    results.push(this.createOneStopOption(spec, basePrice * 0.9))
    
    // Option 3: Budget carrier option
    results.push(this.createBudgetOption(spec, basePrice * 0.7))
    
    // Option 4: Flexible times option (if user has time flexibility)
    if (spec.dateFlexibility > 0) {
      results.push(this.createFlexibleOption(spec, basePrice * 0.85))
    }
    
    // Apply budget filtering and ranking
    return this.rankAndFilterResults(results, spec)
  }
  
  /**
   * Multi-factor ranking algorithm balancing cost, convenience, and preferences
   */
  private rankAndFilterResults(results: FlightItinerary[], spec: SearchSpec): FlightItinerary[] {
    // First pass: Hard budget filter
    const budgetFiltered = results.filter(itinerary => {
      if (spec.budgetFlexibility === 'strict') {
        return itinerary.totalPrice <= spec.maxPrice
      } else if (spec.budgetFlexibility === 'moderate') {
        return itinerary.totalPrice <= spec.maxPrice * 1.1
      } else {
        return itinerary.totalPrice <= spec.maxPrice * 1.25
      }
    })
    
    // Second pass: Score each option
    const scored = budgetFiltered.map(itinerary => ({
      itinerary,
      score: this.calculateScore(itinerary, spec)
    }))
    
    // Sort by score (higher is better)
    scored.sort((a, b) => b.score - a.score)
    
    // Return top options with live repricing
    return scored.slice(0, 5).map(item => {
      const repriced = this.reprice(item.itinerary)
      return repriced
    })
  }
  
  /**
   * Calculate multi-factor score for an itinerary
   */
  private calculateScore(itinerary: FlightItinerary, spec: SearchSpec): number {
    let score = 100 // Base score
    
    // Price component (40% of score)
    const priceRatio = itinerary.totalPrice / spec.maxPrice
    if (priceRatio <= 0.8) score += 20 // Under budget bonus
    else if (priceRatio <= 1.0) score += 10 // Within budget
    else score -= Math.floor((priceRatio - 1) * 30) // Over budget penalty
    
    // Convenience component (35% of score)
    if (itinerary.connectionCount === 0) score += 15 // Nonstop bonus
    else if (itinerary.connectionCount === 1) score += 5 // One stop acceptable
    else score -= itinerary.connectionCount * 5 // Multi-stop penalty
    
    // Duration component (10% of score)
    const durationHours = itinerary.totalDuration / 60
    if (durationHours <= 6) score += 5
    else if (durationHours <= 12) score += 2
    else score -= Math.floor(durationHours - 12)
    
    // Time window compliance (10% of score)
    if (itinerary.convenientTimes) score += 8
    
    // Service quality (5% of score)
    if (spec.requireWiFi && itinerary.wifiAvailable) score += 3
    if (spec.requirePower && itinerary.powerAvailable) score += 2
    if (itinerary.onTimePerformance >= 0.8) score += 5
    
    return Math.max(0, score)
  }
  
  // Helper methods for creating different flight options
  private calculateBasePrice(spec: SearchSpec): number {
    // Base price calculation based on route, dates, demand
    const routeMultiplier = this.getRouteMultiplier(spec.departureAirports[0], spec.arrivalAirports[0])
    const seasonMultiplier = this.getSeasonMultiplier(spec.departureDate)
    const cabinMultiplier = this.getCabinMultiplier(spec.cabinClass)
    
    return 200 * routeMultiplier * seasonMultiplier * cabinMultiplier
  }
  
  private hasNonstopRoute(departure: string, arrival: string): boolean {
    // Major routes that typically have nonstop service
    const nonstopRoutes = ['LHR-CDG', 'LHR-BCN', 'LGW-BCN', 'MAN-CDG', 'EDI-CDG']
    const route = `${departure}-${arrival}`
    const reverseRoute = `${arrival}-${departure}`
    return nonstopRoutes.includes(route) || nonstopRoutes.includes(reverseRoute)
  }
  
  private createNonstopOption(spec: SearchSpec, price: number): FlightItinerary {
    return {
      id: `nonstop-${Date.now()}`,
      outbound: [{
        airline: 'BA',
        flightNumber: 'BA314',
        departureAirport: spec.departureAirports[0],
        arrivalAirport: spec.arrivalAirports[0],
        departureTime: '10:30',
        arrivalTime: '13:45',
        duration: 135,
        aircraft: 'A320'
      }],
      inbound: spec.returnDate ? [{
        airline: 'BA',
        flightNumber: 'BA315',
        departureAirport: spec.arrivalAirports[0],
        arrivalAirport: spec.departureAirports[0],
        departureTime: '16:20',
        arrivalTime: '17:35',
        duration: 135,
        aircraft: 'A320'
      }] : undefined,
      totalPrice: Math.round(price),
      baseFare: Math.round(price * 0.7),
      taxes: Math.round(price * 0.2),
      fees: Math.round(price * 0.1),
      nativeCurrency: spec.currency,
      priceUSD: Math.round(price * 1.27),
      priceGBP: Math.round(price),
      priceTimestamp: new Date().toISOString(),
      fareBrand: 'Economy',
      includedBags: { carry: 1, checked: spec.checkedBags },
      seatSelection: 'paid',
      changes: { allowed: true, fee: 50 },
      refunds: { allowed: true, fee: 100 },
      totalDuration: spec.returnDate ? 270 : 135,
      connectionCount: 0,
      minConnectionTime: 0,
      convenientTimes: true,
      onTimePerformance: 0.85,
      safetyRating: 'A+',
      wifiAvailable: true,
      powerAvailable: true
    }
  }
  
  private createOneStopOption(spec: SearchSpec, price: number): FlightItinerary {
    // Implementation for one-stop option
    return this.createNonstopOption(spec, price) // Simplified for now
  }
  
  private createBudgetOption(spec: SearchSpec, price: number): FlightItinerary {
    // Implementation for budget carrier option
    return this.createNonstopOption(spec, price) // Simplified for now
  }
  
  private createFlexibleOption(spec: SearchSpec, price: number): FlightItinerary {
    // Implementation for flexible dates option
    return this.createNonstopOption(spec, price) // Simplified for now
  }
  
  private reprice(itinerary: FlightItinerary): FlightItinerary {
    // In real implementation, this would call live pricing APIs
    itinerary.priceTimestamp = new Date().toISOString()
    return itinerary
  }
  
  // Utility methods
  private getRouteMultiplier(departure: string, arrival: string): number {
    // Short-haul European routes
    return 1.0
  }
  
  private getSeasonMultiplier(date: string): number {
    // Peak season pricing
    return 1.0
  }
  
  private getCabinMultiplier(cabin: string): number {
    const multipliers = {
      'economy': 1.0,
      'premium_economy': 1.5,
      'business': 3.0,
      'first': 5.0
    }
    return multipliers[cabin] || 1.0
  }
}