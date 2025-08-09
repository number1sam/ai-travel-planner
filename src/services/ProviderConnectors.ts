// Provider Connectors with Standardized Adapters
// Following specification: wrap each connector with adapters that take brief and return normalized candidates

import { ProviderQuery, CandidateResult } from './ConstraintEngine'
import { TripBrief } from '../types/TripBrief'

export interface ProviderConnector {
  domain: string
  name: string
  priority: number // Higher = preferred
  connect(query: ProviderQuery): Promise<CandidateResult[]>
  isAvailable(): boolean
  getEstimatedResponseTime(): number // milliseconds
  getCostPerRequest(): number // in cents
}

export interface StandardizedResponse {
  candidates: CandidateResult[]
  totalResults: number
  processingTime: number
  dataFreshness: Date
  providerLimitations: string[]
  confidence: number
}

export interface AccommodationCandidate {
  id: string
  name: string
  type: string // hotel, apartment, hostel, etc.
  location: {
    address: string
    neighborhood: string
    coordinates: { lat: number; lng: number }
    walkingDistances: { cityCenter?: number; transport?: number }
  }
  pricing: {
    basePrice: number
    totalPrice: number // for full stay
    currency: string
    breakdown: { base: number; taxes: number; fees: number }
    cancellation: { free?: boolean; deadline?: string }
  }
  accommodation: {
    rating: number
    reviewCount: number
    amenities: string[]
    roomType: string
    maxGuests: number
    images: string[]
    policies: { checkin: string; checkout: string; smoking: boolean }
  }
  availability: {
    checkin: string
    checkout: string
    available: boolean
    rooms: number
  }
  deepLink: string
  providerData: any // Raw provider response
}

export interface ActivityCandidate {
  id: string
  name: string
  type: string
  description: string
  location: {
    address: string
    coordinates: { lat: number; lng: number }
    venue: string
  }
  timing: {
    duration: number // minutes
    schedules: { day: string; times: string[] }[]
    seasonality: string[]
    weatherDependent: boolean
  }
  pricing: {
    price: number
    currency: string
    priceType: 'per-person' | 'per-group' | 'per-family'
    includes: string[]
    excludes: string[]
  }
  details: {
    rating: number
    reviewCount: number
    difficulty: 'easy' | 'moderate' | 'challenging'
    ageRestrictions: string
    groupSize: { min: number; max: number }
    categories: string[]
    highlights: string[]
  }
  booking: {
    required: boolean
    advanceNotice: string // "24 hours", "1 week", etc.
    cancellationPolicy: string
  }
  deepLink: string
  providerData: any
}

export interface DiningCandidate {
  id: string
  name: string
  type: string // restaurant, cafe, food-truck, etc.
  cuisine: string[]
  location: {
    address: string
    coordinates: { lat: number; lng: number }
    neighborhood: string
  }
  pricing: {
    priceRange: string // $, $$, $$$, $$$$
    averageMeal: { breakfast?: number; lunch?: number; dinner?: number }
    currency: string
  }
  details: {
    rating: number
    reviewCount: number
    atmosphere: string[]
    dressCode: string
    dietaryOptions: string[]
    specialties: string[]
  }
  service: {
    hours: { [day: string]: string }
    reservations: boolean
    takeout: boolean
    delivery: boolean
  }
  deepLink?: string
  providerData: any
}

export interface FlightCandidate {
  id: string
  type: 'outbound' | 'return' | 'roundtrip'
  airline: {
    code: string
    name: string
    rating: number
  }
  route: {
    origin: { airport: string; city: string; terminal?: string }
    destination: { airport: string; city: string; terminal?: string }
    stops: { airport: string; city: string; duration: number }[]
  }
  timing: {
    departure: string // ISO datetime
    arrival: string
    duration: number // minutes
    layoverTime?: number
  }
  pricing: {
    price: number
    currency: string
    cabin: string
    fareType: string
    includes: string[]
    baggage: { carry: string; checked: string }
  }
  availability: {
    seats: number
    lastUpdate: Date
  }
  aircraft: {
    type: string
    amenities: string[]
  }
  deepLink: string
  providerData: any
}

export interface TransportCandidate {
  id: string
  mode: 'train' | 'bus' | 'metro' | 'taxi' | 'rideshare' | 'walking'
  route: {
    from: { name: string; type: string; coordinates: { lat: number; lng: number } }
    to: { name: string; type: string; coordinates: { lat: number; lng: number } }
    stops: { name: string; arrivalTime?: string }[]
  }
  timing: {
    departure?: string
    arrival?: string
    duration: number // minutes
    frequency?: string // "every 10 minutes"
    operatingHours: string
  }
  pricing: {
    price: number
    currency: string
    ticketType: string
  }
  details: {
    provider: string
    comfort: string
    accessibility: boolean
    luggage: string
    wifi: boolean
  }
  realtime: {
    delays?: number
    status: string
    trackingAvailable: boolean
  }
  providerData: any
}

// Base Provider Adapter - standardizes all provider responses
abstract class ProviderAdapter {
  protected domain: string
  protected name: string
  protected priority: number
  protected baseUrl: string
  protected apiKey: string
  
  constructor(domain: string, name: string, priority: number, config: any) {
    this.domain = domain
    this.name = name
    this.priority = priority
    this.baseUrl = config.baseUrl
    this.apiKey = config.apiKey
  }
  
  abstract connect(query: ProviderQuery): Promise<CandidateResult[]>
  
  // Standardized error handling
  protected handleError(error: any, context: string): never {
    console.error(`${this.name} ${this.domain} error in ${context}:`, error)
    throw new Error(`Provider ${this.name} failed: ${error.message}`)
  }
  
  // Standardized response validation
  protected validateResponse(response: any): boolean {
    return response && typeof response === 'object'
  }
  
  // Build deep links with exact parameters
  protected buildDeepLink(candidate: any, query: ProviderQuery): string {
    // Override in each adapter for provider-specific deep linking
    return candidate.bookingUrl || candidate.url || '#'
  }
  
  // Common headers for API requests
  protected getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'User-Agent': 'TravelAgent/1.0',
      'Authorization': `Bearer ${this.apiKey}`
    }
  }
}

// Accommodation Provider Adapters
export class BookingComAdapter extends ProviderAdapter {
  constructor(config: any) {
    super('accommodation', 'Booking.com', 90, config)
  }
  
  async connect(query: ProviderQuery): Promise<CandidateResult[]> {
    try {
      // Transform TripBrief query to Booking.com API format
      const bookingQuery = this.transformToBookingQuery(query)
      
      // Make API call (simulated - would be real API call)
      const response = await this.callBookingApi(bookingQuery)
      
      if (!this.validateResponse(response)) {
        throw new Error('Invalid response from Booking.com')
      }
      
      // Transform response to standardized format
      return this.transformBookingResponse(response.hotels || [], query)
      
    } catch (error) {
      this.handleError(error, 'accommodation search')
    }
  }
  
  private transformToBookingQuery(query: ProviderQuery): any {
    return {
      dest_id: this.getDestinationId(query.parameters.city),
      checkin: query.parameters.checkin,
      checkout: query.parameters.checkout,
      adults: query.parameters.guests,
      children: query.parameters.children || 0,
      currency: 'USD', // Would get from query
      language: 'en',
      order_by: 'popularity',
      max_price: query.constraints.hard.maxPricePerNight,
      min_rating: query.constraints.hard.minRating || 0,
      room_number: 1
    }
  }
  
  private async callBookingApi(bookingQuery: any): Promise<any> {
    // Simulated API call - would use real Booking.com API
    await new Promise(resolve => setTimeout(resolve, 200)) // Simulate network delay
    
    // Mock response structure
    return {
      hotels: [
        {
          hotel_id: 'hotel_1',
          hotel_name: `${bookingQuery.dest_id} Central Hotel`,
          address: `123 Main St, ${bookingQuery.dest_id}`,
          latitude: 40.7128,
          longitude: -74.0060,
          price: Math.min(bookingQuery.max_price || 200, 150),
          currency: bookingQuery.currency,
          rating: 8.2,
          review_count: 1247,
          amenities: ['WiFi', 'Parking', 'Restaurant', 'Gym'],
          images: ['image1.jpg', 'image2.jpg'],
          room_type: 'Standard Double Room',
          max_occupancy: bookingQuery.adults,
          hotel_url: `https://booking.com/hotel/${bookingQuery.hotel_id}?checkin=${bookingQuery.checkin}&checkout=${bookingQuery.checkout}`
        }
      ],
      total_results: 1,
      processing_time: 187
    }
  }
  
  private transformBookingResponse(hotels: any[], query: ProviderQuery): CandidateResult[] {
    return hotels.map(hotel => ({
      id: hotel.hotel_id,
      domain: 'accommodation',
      data: this.normalizeAccommodationData(hotel),
      score: 0, // Will be calculated by ConstraintEngine
      scoringBreakdown: {},
      constraintViolations: [],
      constraintSatisfaction: {},
      reasoning: '',
      deepLink: hotel.hotel_url,
      uncertainty: []
    }))
  }
  
  private normalizeAccommodationData(hotel: any): AccommodationCandidate {
    return {
      id: hotel.hotel_id,
      name: hotel.hotel_name,
      type: 'hotel',
      location: {
        address: hotel.address,
        neighborhood: hotel.district || 'City Center',
        coordinates: { lat: hotel.latitude, lng: hotel.longitude },
        walkingDistances: { cityCenter: 10, transport: 5 }
      },
      pricing: {
        basePrice: hotel.price,
        totalPrice: hotel.price, // Would calculate based on stay length
        currency: hotel.currency,
        breakdown: { base: hotel.price, taxes: hotel.price * 0.1, fees: 0 },
        cancellation: { free: true, deadline: '24 hours before' }
      },
      accommodation: {
        rating: hotel.rating,
        reviewCount: hotel.review_count,
        amenities: hotel.amenities,
        roomType: hotel.room_type,
        maxGuests: hotel.max_occupancy,
        images: hotel.images,
        policies: { checkin: '15:00', checkout: '11:00', smoking: false }
      },
      availability: {
        checkin: query.parameters.checkin,
        checkout: query.parameters.checkout,
        available: true,
        rooms: 1
      },
      deepLink: hotel.hotel_url,
      providerData: hotel
    }
  }
  
  private getDestinationId(city: string): string {
    // This would use a real destination mapping service
    const cityMappings = {
      'london': 'London',
      'paris': 'Paris',
      'new york': 'New York',
      'rome': 'Rome'
    }
    
    return cityMappings[city.toLowerCase()] || city
  }
}

// Activities Provider Adapter
export class GetYourGuideAdapter extends ProviderAdapter {
  constructor(config: any) {
    super('activities', 'GetYourGuide', 85, config)
  }
  
  async connect(query: ProviderQuery): Promise<CandidateResult[]> {
    try {
      const gygQuery = this.transformToGygQuery(query)
      const response = await this.callGygApi(gygQuery)
      
      if (!this.validateResponse(response)) {
        throw new Error('Invalid response from GetYourGuide')
      }
      
      return this.transformGygResponse(response.activities || [], query)
      
    } catch (error) {
      this.handleError(error, 'activities search')
    }
  }
  
  private transformToGygQuery(query: ProviderQuery): any {
    return {
      location: query.parameters.location,
      from_date: query.parameters.dateRange?.start,
      to_date: query.parameters.dateRange?.end,
      currency: 'USD',
      max_price: query.constraints.hard.maxPricePerActivity,
      categories: query.constraints.soft.preferredThemes?.join(',') || '',
      language: 'en'
    }
  }
  
  private async callGygApi(gygQuery: any): Promise<any> {
    // Simulated API call
    await new Promise(resolve => setTimeout(resolve, 150))
    
    return {
      activities: [
        {
          id: 'activity_1',
          title: `${gygQuery.location} Walking Tour`,
          description: `Discover the highlights of ${gygQuery.location} with a professional guide`,
          duration: 180, // minutes
          price: Math.min(gygQuery.max_price || 100, 75),
          currency: gygQuery.currency,
          rating: 4.7,
          review_count: 892,
          categories: ['culture', 'history'],
          location: {
            address: `Tourist Center, ${gygQuery.location}`,
            latitude: 40.7580,
            longitude: -73.9855
          },
          images: ['tour1.jpg'],
          booking_url: `https://getyourguide.com/activity/${gygQuery.id}`
        }
      ],
      total_results: 1
    }
  }
  
  private transformGygResponse(activities: any[], query: ProviderQuery): CandidateResult[] {
    return activities.map(activity => ({
      id: activity.id,
      domain: 'activities',
      data: this.normalizeActivityData(activity),
      score: 0,
      scoringBreakdown: {},
      constraintViolations: [],
      constraintSatisfaction: {},
      reasoning: '',
      deepLink: activity.booking_url,
      uncertainty: []
    }))
  }
  
  private normalizeActivityData(activity: any): ActivityCandidate {
    return {
      id: activity.id,
      name: activity.title,
      type: 'tour',
      description: activity.description,
      location: {
        address: activity.location.address,
        coordinates: { lat: activity.location.latitude, lng: activity.location.longitude },
        venue: 'Meeting Point'
      },
      timing: {
        duration: activity.duration,
        schedules: [{ day: 'daily', times: ['10:00', '14:00', '18:00'] }],
        seasonality: ['all-year'],
        weatherDependent: false
      },
      pricing: {
        price: activity.price,
        currency: activity.currency,
        priceType: 'per-person',
        includes: ['Professional guide', 'Walking tour'],
        excludes: ['Transportation', 'Food and drinks']
      },
      details: {
        rating: activity.rating,
        reviewCount: activity.review_count,
        difficulty: 'easy',
        ageRestrictions: 'All ages welcome',
        groupSize: { min: 1, max: 25 },
        categories: activity.categories,
        highlights: ['Historical sites', 'Local insights', 'Photo opportunities']
      },
      booking: {
        required: true,
        advanceNotice: '24 hours',
        cancellationPolicy: 'Free cancellation 24 hours before'
      },
      deepLink: activity.booking_url,
      providerData: activity
    }
  }
}

// Dining Provider Adapter
export class ZomatoAdapter extends ProviderAdapter {
  constructor(config: any) {
    super('dining', 'Zomato', 75, config)
  }
  
  async connect(query: ProviderQuery): Promise<CandidateResult[]> {
    try {
      const zomatoQuery = this.transformToZomatoQuery(query)
      const response = await this.callZomatoApi(zomatoQuery)
      
      if (!this.validateResponse(response)) {
        throw new Error('Invalid response from Zomato')
      }
      
      return this.transformZomatoResponse(response.restaurants || [], query)
      
    } catch (error) {
      this.handleError(error, 'dining search')
    }
  }
  
  private transformToZomatoQuery(query: ProviderQuery): any {
    return {
      city: query.parameters.city,
      cuisine: query.constraints.soft.cuisinePreferences?.preferred?.join(',') || '',
      sort: 'rating',
      order: 'desc'
    }
  }
  
  private async callZomatoApi(zomatoQuery: any): Promise<any> {
    // Simulated API call
    await new Promise(resolve => setTimeout(resolve, 180))
    
    return {
      restaurants: [
        {
          id: 'restaurant_1',
          name: `Local ${zomatoQuery.city} Bistro`,
          cuisine: zomatoQuery.cuisine || 'International',
          location: {
            address: `456 Food St, ${zomatoQuery.city}`,
            latitude: 40.7505,
            longitude: -73.9934
          },
          rating: 4.3,
          review_count: 567,
          price_range: '$$',
          average_cost_for_two: 60,
          hours: 'Mon-Sun: 12:00-23:00',
          phone: '+1-555-0123',
          url: `https://zomato.com/restaurant/${zomatoQuery.id}`
        }
      ]
    }
  }
  
  private transformZomatoResponse(restaurants: any[], query: ProviderQuery): CandidateResult[] {
    return restaurants.map(restaurant => ({
      id: restaurant.id,
      domain: 'dining',
      data: this.normalizeDiningData(restaurant),
      score: 0,
      scoringBreakdown: {},
      constraintViolations: [],
      constraintSatisfaction: {},
      reasoning: '',
      deepLink: restaurant.url,
      uncertainty: []
    }))
  }
  
  private normalizeDiningData(restaurant: any): DiningCandidate {
    return {
      id: restaurant.id,
      name: restaurant.name,
      type: 'restaurant',
      cuisine: [restaurant.cuisine],
      location: {
        address: restaurant.location.address,
        coordinates: { lat: restaurant.location.latitude, lng: restaurant.location.longitude },
        neighborhood: 'City Center'
      },
      pricing: {
        priceRange: restaurant.price_range,
        averageMeal: { lunch: 25, dinner: 35 },
        currency: 'USD'
      },
      details: {
        rating: restaurant.rating,
        reviewCount: restaurant.review_count,
        atmosphere: ['casual', 'local'],
        dressCode: 'casual',
        dietaryOptions: ['vegetarian'],
        specialties: ['Local cuisine', 'Fresh ingredients']
      },
      service: {
        hours: { 'Mon-Sun': restaurant.hours },
        reservations: true,
        takeout: true,
        delivery: false
      },
      deepLink: restaurant.url,
      providerData: restaurant
    }
  }
}

// Flights Provider Adapter
export class SkyscannerAdapter extends ProviderAdapter {
  constructor(config: any) {
    super('flights', 'Skyscanner', 95, config)
  }
  
  async connect(query: ProviderQuery): Promise<CandidateResult[]> {
    try {
      const skyscannerQuery = this.transformToSkyscannerQuery(query)
      const response = await this.callSkyscannerApi(skyscannerQuery)
      
      if (!this.validateResponse(response)) {
        throw new Error('Invalid response from Skyscanner')
      }
      
      return this.transformSkyscannerResponse(response.flights || [], query)
      
    } catch (error) {
      this.handleError(error, 'flights search')
    }
  }
  
  private transformToSkyscannerQuery(query: ProviderQuery): any {
    return {
      origin: query.parameters.from,
      destination: query.parameters.to,
      departure_date: query.parameters.departureDate,
      return_date: query.parameters.returnDate,
      adults: query.parameters.passengers,
      cabin_class: 'economy',
      currency: 'USD',
      max_price: query.constraints.hard.maxPrice
    }
  }
  
  private async callSkyscannerApi(skyscannerQuery: any): Promise<any> {
    // Simulated API call
    await new Promise(resolve => setTimeout(resolve, 300))
    
    return {
      flights: [
        {
          id: 'flight_1',
          airline: { code: 'AA', name: 'American Airlines' },
          origin: skyscannerQuery.origin,
          destination: skyscannerQuery.destination,
          departure: skyscannerQuery.departure_date + 'T10:00:00Z',
          arrival: skyscannerQuery.departure_date + 'T16:00:00Z',
          duration: 360, // minutes
          stops: 0,
          price: Math.min(skyscannerQuery.max_price || 800, 650),
          currency: skyscannerQuery.currency,
          cabin: skyscannerQuery.cabin_class,
          booking_url: `https://skyscanner.com/flight/${skyscannerQuery.id}`
        }
      ]
    }
  }
  
  private transformSkyscannerResponse(flights: any[], query: ProviderQuery): CandidateResult[] {
    return flights.map(flight => ({
      id: flight.id,
      domain: 'flights',
      data: this.normalizeFlightData(flight),
      score: 0,
      scoringBreakdown: {},
      constraintViolations: [],
      constraintSatisfaction: {},
      reasoning: '',
      deepLink: flight.booking_url,
      uncertainty: []
    }))
  }
  
  private normalizeFlightData(flight: any): FlightCandidate {
    return {
      id: flight.id,
      type: 'outbound',
      airline: {
        code: flight.airline.code,
        name: flight.airline.name,
        rating: 4.2
      },
      route: {
        origin: { airport: flight.origin, city: flight.origin },
        destination: { airport: flight.destination, city: flight.destination },
        stops: []
      },
      timing: {
        departure: flight.departure,
        arrival: flight.arrival,
        duration: flight.duration
      },
      pricing: {
        price: flight.price,
        currency: flight.currency,
        cabin: flight.cabin,
        fareType: 'Basic Economy',
        includes: ['Seat selection', 'Personal item'],
        baggage: { carry: '1 carry-on', checked: '1 checked bag (fee applies)' }
      },
      availability: {
        seats: 9,
        lastUpdate: new Date()
      },
      aircraft: {
        type: 'Boeing 737',
        amenities: ['WiFi', 'Power outlets', 'Entertainment']
      },
      deepLink: flight.booking_url,
      providerData: flight
    }
  }
}

// Transport Provider Adapter
export class GoogleMapsAdapter extends ProviderAdapter {
  constructor(config: any) {
    super('transport', 'Google Maps', 90, config)
  }
  
  async connect(query: ProviderQuery): Promise<CandidateResult[]> {
    try {
      const mapsQuery = this.transformToMapsQuery(query)
      const response = await this.callMapsApi(mapsQuery)
      
      if (!this.validateResponse(response)) {
        throw new Error('Invalid response from Google Maps')
      }
      
      return this.transformMapsResponse(response.routes || [], query)
      
    } catch (error) {
      this.handleError(error, 'transport search')
    }
  }
  
  private transformToMapsQuery(query: ProviderQuery): any {
    return {
      origin: query.parameters.origin || 'Current location',
      destination: query.parameters.destination || query.parameters.city,
      mode: 'transit', // transit, driving, walking
      departure_time: 'now',
      alternatives: true
    }
  }
  
  private async callMapsApi(mapsQuery: any): Promise<any> {
    // Simulated API call
    await new Promise(resolve => setTimeout(resolve, 120))
    
    return {
      routes: [
        {
          mode: 'transit',
          duration: 25, // minutes
          distance: '8.2 km',
          steps: [
            { mode: 'walking', duration: 5, instruction: 'Walk to Metro Station' },
            { mode: 'metro', duration: 15, instruction: 'Take Metro Line 1' },
            { mode: 'walking', duration: 5, instruction: 'Walk to destination' }
          ],
          price: 3.50,
          currency: 'USD'
        }
      ]
    }
  }
  
  private transformMapsResponse(routes: any[], query: ProviderQuery): CandidateResult[] {
    return routes.map((route, index) => ({
      id: `route_${index}`,
      domain: 'transport',
      data: this.normalizeTransportData(route),
      score: 0,
      scoringBreakdown: {},
      constraintViolations: [],
      constraintSatisfaction: {},
      reasoning: '',
      uncertainty: []
    }))
  }
  
  private normalizeTransportData(route: any): TransportCandidate {
    return {
      id: `route_${Date.now()}`,
      mode: route.mode,
      route: {
        from: { name: 'Origin', type: 'location', coordinates: { lat: 40.7128, lng: -74.0060 } },
        to: { name: 'Destination', type: 'location', coordinates: { lat: 40.7580, lng: -73.9855 } },
        stops: route.steps.map(step => ({ name: step.instruction }))
      },
      timing: {
        duration: route.duration,
        frequency: '10 minutes',
        operatingHours: '05:00-01:00'
      },
      pricing: {
        price: route.price,
        currency: route.currency,
        ticketType: 'Single Journey'
      },
      details: {
        provider: 'Public Transport',
        comfort: 'standard',
        accessibility: true,
        luggage: 'Allowed',
        wifi: false
      },
      realtime: {
        status: 'On time',
        trackingAvailable: true
      },
      providerData: route
    }
  }
}

// Provider Manager - coordinates all adapters
export class ProviderManager {
  private adapters: Map<string, ProviderAdapter[]> = new Map()
  
  constructor() {
    this.initializeAdapters()
  }
  
  private initializeAdapters(): void {
    // Initialize accommodation adapters
    const accommodationAdapters = [
      new BookingComAdapter({ baseUrl: 'https://booking.com/api', apiKey: process.env.BOOKING_API_KEY })
    ]
    this.adapters.set('accommodation', accommodationAdapters)
    
    // Initialize activity adapters
    const activityAdapters = [
      new GetYourGuideAdapter({ baseUrl: 'https://getyourguide.com/api', apiKey: process.env.GYG_API_KEY })
    ]
    this.adapters.set('activities', activityAdapters)
    
    // Initialize dining adapters
    const diningAdapters = [
      new ZomatoAdapter({ baseUrl: 'https://zomato.com/api', apiKey: process.env.ZOMATO_API_KEY })
    ]
    this.adapters.set('dining', diningAdapters)
    
    // Initialize flight adapters
    const flightAdapters = [
      new SkyscannerAdapter({ baseUrl: 'https://skyscanner.com/api', apiKey: process.env.SKYSCANNER_API_KEY })
    ]
    this.adapters.set('flights', flightAdapters)
    
    // Initialize transport adapters
    const transportAdapters = [
      new GoogleMapsAdapter({ baseUrl: 'https://maps.googleapis.com/api', apiKey: process.env.GOOGLE_MAPS_API_KEY })
    ]
    this.adapters.set('transport', transportAdapters)
  }
  
  // Query providers for a domain
  async queryProviders(domain: string, query: ProviderQuery): Promise<StandardizedResponse> {
    const adapters = this.adapters.get(domain)
    if (!adapters || adapters.length === 0) {
      throw new Error(`No providers available for domain: ${domain}`)
    }
    
    const startTime = Date.now()
    const allCandidates: CandidateResult[] = []
    const limitations: string[] = []
    
    // Query all available adapters in parallel
    const queries = adapters.map(async adapter => {
      try {
        const candidates = await adapter.connect(query)
        return { adapter: adapter.name, candidates, error: null }
      } catch (error) {
        limitations.push(`${adapter.name}: ${error.message}`)
        return { adapter: adapter.name, candidates: [], error: error.message }
      }
    })
    
    const results = await Promise.all(queries)
    
    // Combine results
    for (const result of results) {
      if (result.candidates.length > 0) {
        allCandidates.push(...result.candidates)
      }
    }
    
    const processingTime = Date.now() - startTime
    
    return {
      candidates: allCandidates,
      totalResults: allCandidates.length,
      processingTime,
      dataFreshness: new Date(),
      providerLimitations: limitations,
      confidence: this.calculateProviderConfidence(results, limitations)
    }
  }
  
  private calculateProviderConfidence(results: any[], limitations: string[]): number {
    const totalAdapters = results.length
    const successfulAdapters = results.filter(r => r.candidates.length > 0).length
    
    if (totalAdapters === 0) return 0
    if (limitations.length >= totalAdapters) return 20 // All failed
    
    return Math.round((successfulAdapters / totalAdapters) * 100)
  }
  
  // Get available providers for a domain
  getAvailableProviders(domain: string): string[] {
    const adapters = this.adapters.get(domain)
    return adapters ? adapters.map(a => a.name) : []
  }
  
  // Health check for all providers
  async checkProviderHealth(): Promise<Record<string, boolean>> {
    const health: Record<string, boolean> = {}
    
    for (const [domain, adapters] of this.adapters) {
      for (const adapter of adapters) {
        try {
          health[`${domain}_${adapter.name}`] = adapter.isAvailable()
        } catch {
          health[`${domain}_${adapter.name}`] = false
        }
      }
    }
    
    return health
  }
}