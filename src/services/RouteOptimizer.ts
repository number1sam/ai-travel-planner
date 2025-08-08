// Multi-City Route Optimization Engine
// Intelligently sequences cities for optimal travel experience

export interface CityInfo {
  name: string
  country: string
  coordinates: {
    lat: number
    lng: number
  }
  major: boolean // Major tourist destination
  gateway: boolean // International gateway (major airport/transport hub)
  connections: string[] // Well-connected to these cities
  optimalDays: {min: number, max: number} // Recommended stay duration
  seasonality?: {
    peak: string[] // Peak season months
    avoid: string[] // Months to avoid
  }
}

export interface RouteOptions {
  routeType: 'linear' | 'circular' | 'hub-and-spoke' | 'optimal'
  totalDays: number
  transportPreference: 'fastest' | 'scenic' | 'budget' | 'mixed'
  pace: 'relaxed' | 'moderate' | 'packed'
  startCity?: string // Preferred starting point
  endCity?: string // Preferred ending point
  mustInclude?: string[] // Cities that must be included
  avoid?: string[] // Cities to avoid
}

export interface OptimizedRoute {
  sequence: string[]
  totalDistance: number
  estimatedTravelTime: number // Total transport time in hours
  routeType: 'linear' | 'circular' | 'hub-and-spoke'
  dayBreakdown: Array<{
    city: string
    nights: number
    arrivalDay: number
    departureDay: number
    rationale: string
  }>
  transport: Array<{
    from: string
    to: string
    method: 'flight' | 'train' | 'bus' | 'car' | 'ferry'
    duration: string
    distance: number
    cost: number
    scenic: boolean
  }>
  efficiency: number // Score 0-100 (higher = less backtracking)
  highlights: string[] // Key selling points of this route
}

class RouteOptimizer {
  private cityDatabase: Map<string, CityInfo> = new Map()

  constructor() {
    this.initializeCityDatabase()
  }

  private initializeCityDatabase() {
    // European cities
    this.addCity({
      name: 'Dublin',
      country: 'Ireland', 
      coordinates: {lat: 53.3498, lng: -6.2603},
      major: true,
      gateway: true,
      connections: ['Cork', 'Galway', 'London', 'Edinburgh'],
      optimalDays: {min: 2, max: 4}
    })

    this.addCity({
      name: 'Cork',
      country: 'Ireland',
      coordinates: {lat: 51.8985, lng: -8.4756}, 
      major: true,
      gateway: false,
      connections: ['Dublin', 'Galway', 'Kerry'],
      optimalDays: {min: 2, max: 3}
    })

    this.addCity({
      name: 'Galway',
      country: 'Ireland',
      coordinates: {lat: 53.2707, lng: -9.0568},
      major: true,
      gateway: false, 
      connections: ['Dublin', 'Cork', 'Limerick'],
      optimalDays: {min: 2, max: 3}
    })

    this.addCity({
      name: 'London',
      country: 'UK',
      coordinates: {lat: 51.5074, lng: -0.1278},
      major: true,
      gateway: true,
      connections: ['Paris', 'Amsterdam', 'Edinburgh', 'Dublin'],
      optimalDays: {min: 3, max: 5}
    })

    this.addCity({
      name: 'Paris',
      country: 'France', 
      coordinates: {lat: 48.8566, lng: 2.3522},
      major: true,
      gateway: true,
      connections: ['London', 'Amsterdam', 'Rome', 'Barcelona'],
      optimalDays: {min: 3, max: 5}
    })

    this.addCity({
      name: 'Rome',
      country: 'Italy',
      coordinates: {lat: 41.9028, lng: 12.4964},
      major: true,
      gateway: true,
      connections: ['Paris', 'Barcelona', 'Athens', 'Florence'],
      optimalDays: {min: 3, max: 4}
    })

    this.addCity({
      name: 'Barcelona',
      country: 'Spain',
      coordinates: {lat: 41.3851, lng: 2.1734},
      major: true,
      gateway: true,
      connections: ['Paris', 'Rome', 'Madrid', 'Lisbon'],
      optimalDays: {min: 3, max: 4}
    })

    // Asian cities
    this.addCity({
      name: 'Tokyo',
      country: 'Japan',
      coordinates: {lat: 35.6762, lng: 139.6503},
      major: true,
      gateway: true,
      connections: ['Kyoto', 'Osaka', 'Seoul', 'Bangkok'],
      optimalDays: {min: 3, max: 5}
    })

    this.addCity({
      name: 'Kyoto',
      country: 'Japan',
      coordinates: {lat: 35.0116, lng: 135.7681},
      major: true,
      gateway: false,
      connections: ['Tokyo', 'Osaka', 'Nara'],
      optimalDays: {min: 2, max: 3}
    })

    this.addCity({
      name: 'Bangkok',
      country: 'Thailand',
      coordinates: {lat: 13.7563, lng: 100.5018},
      major: true,
      gateway: true,
      connections: ['Chiang Mai', 'Phuket', 'Tokyo', 'Singapore'],
      optimalDays: {min: 3, max: 4}
    })

    this.addCity({
      name: 'Chiang Mai',
      country: 'Thailand',
      coordinates: {lat: 18.7883, lng: 98.9853},
      major: true,
      gateway: false,
      connections: ['Bangkok', 'Phuket'],
      optimalDays: {min: 2, max: 4}
    })
  }

  private addCity(city: CityInfo) {
    this.cityDatabase.set(city.name.toLowerCase(), city)
  }

  private getCityInfo(cityName: string): CityInfo | null {
    return this.cityDatabase.get(cityName.toLowerCase()) || null
  }

  private calculateDistance(city1: CityInfo, city2: CityInfo): number {
    // Haversine formula for distance calculation
    const R = 6371 // Earth's radius in kilometers
    const dLat = (city2.coordinates.lat - city1.coordinates.lat) * Math.PI / 180
    const dLng = (city2.coordinates.lng - city1.coordinates.lng) * Math.PI / 180
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(city1.coordinates.lat * Math.PI / 180) * 
      Math.cos(city2.coordinates.lat * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  private calculateRouteEfficiency(cities: string[]): number {
    if (cities.length < 2) return 100

    let totalDistance = 0
    let directDistance = 0

    // Calculate actual route distance
    for (let i = 0; i < cities.length - 1; i++) {
      const city1 = this.getCityInfo(cities[i])
      const city2 = this.getCityInfo(cities[i + 1])
      if (city1 && city2) {
        totalDistance += this.calculateDistance(city1, city2)
      }
    }

    // Calculate direct distance (first to last city)
    const firstCity = this.getCityInfo(cities[0])
    const lastCity = this.getCityInfo(cities[cities.length - 1])
    if (firstCity && lastCity) {
      directDistance = this.calculateDistance(firstCity, lastCity)
    }

    // Efficiency: lower ratio means less backtracking
    const efficiency = Math.max(0, 100 - ((totalDistance - directDistance) / directDistance * 100))
    return Math.round(efficiency)
  }

  public optimizeRoute(cities: string[], options: RouteOptions): OptimizedRoute {
    console.log(`🗺️ Optimizing route for ${cities.length} cities:`, cities.join(' → '))

    // Get city information
    const cityInfos = cities.map(city => {
      const info = this.getCityInfo(city)
      if (!info) {
        console.warn(`⚠️ City not found in database: ${city}`)
        // Create fallback city info
        return {
          name: city,
          country: 'Unknown',
          coordinates: {lat: 0, lng: 0},
          major: false,
          gateway: false,
          connections: [],
          optimalDays: {min: 2, max: 3}
        }
      }
      return info
    }).filter(Boolean)

    // Determine optimal route type
    let routeType: 'linear' | 'circular' | 'hub-and-spoke' = options.routeType === 'optimal' 
      ? this.determineOptimalRouteType(cityInfos, options)
      : options.routeType as any

    // Generate optimized sequence
    let sequence: string[]
    
    switch (routeType) {
      case 'linear':
        sequence = this.optimizeLinearRoute(cityInfos, options)
        break
      case 'circular':  
        sequence = this.optimizeCircularRoute(cityInfos, options)
        break
      case 'hub-and-spoke':
        sequence = this.optimizeHubAndSpokeRoute(cityInfos, options)
        break
      default:
        sequence = cities // Fallback to original order
    }

    // Calculate day breakdown
    const dayBreakdown = this.calculateDayBreakdown(sequence, options.totalDays, options.pace)

    // Generate transport plan
    const transport = this.generateTransportPlan(sequence, options.transportPreference)

    // Calculate metrics
    const totalDistance = transport.reduce((sum, leg) => sum + leg.distance, 0)
    const estimatedTravelTime = transport.reduce((sum, leg) => sum + parseFloat(leg.duration), 0)
    const efficiency = this.calculateRouteEfficiency(sequence)

    // Generate highlights
    const highlights = this.generateRouteHighlights(sequence, routeType, options)

    return {
      sequence,
      totalDistance: Math.round(totalDistance),
      estimatedTravelTime: Math.round(estimatedTravelTime * 10) / 10,
      routeType,
      dayBreakdown,
      transport,
      efficiency,
      highlights
    }
  }

  private determineOptimalRouteType(cities: CityInfo[], options: RouteOptions): 'linear' | 'circular' | 'hub-and-spoke' {
    // Logic to determine best route type based on:
    // - Number of cities
    // - Geographic distribution  
    // - Available time
    // - Transport connections

    if (cities.length <= 3) {
      return 'linear'
    }

    if (cities.length >= 5 && options.totalDays >= 10) {
      return 'circular'
    }

    // Check for hub potential (major gateway city)
    const hasGateway = cities.some(city => city.gateway)
    if (hasGateway && cities.length >= 4) {
      return 'hub-and-spoke'
    }

    return 'linear'
  }

  private optimizeLinearRoute(cities: CityInfo[], options: RouteOptions): string[] {
    // For linear routes, minimize total distance
    if (cities.length <= 2) return cities.map(c => c.name)

    // Use nearest neighbor algorithm with optimizations
    let remaining = [...cities]
    const sequence: CityInfo[] = []

    // Start with gateway city if available, or user preference
    let startCity = remaining.find(c => options.startCity && c.name.toLowerCase() === options.startCity.toLowerCase())
    if (!startCity) {
      startCity = remaining.find(c => c.gateway) || remaining[0]
    }

    sequence.push(startCity)
    remaining = remaining.filter(c => c !== startCity)

    // Build sequence by finding nearest unvisited city
    while (remaining.length > 0) {
      const current = sequence[sequence.length - 1]
      let nearest = remaining[0]
      let minDistance = this.calculateDistance(current, nearest)

      for (const city of remaining) {
        const distance = this.calculateDistance(current, city)
        if (distance < minDistance) {
          nearest = city
          minDistance = distance
        }
      }

      sequence.push(nearest)
      remaining = remaining.filter(c => c !== nearest)
    }

    return sequence.map(c => c.name)
  }

  private optimizeCircularRoute(cities: CityInfo[], options: RouteOptions): string[] {
    // For circular routes, create a loop that minimizes total distance
    const linearRoute = this.optimizeLinearRoute(cities, options)
    
    // For circular routes, we return to start, so sequence is already optimal
    // Could add 2-opt optimization here for better results
    return linearRoute
  }

  private optimizeHubAndSpokeRoute(cities: CityInfo[], options: RouteOptions): string[] {
    // Find the best hub (gateway city with most connections)
    const hub = cities.reduce((best, city) => {
      const score = (city.gateway ? 10 : 0) + city.connections.length
      const bestScore = (best.gateway ? 10 : 0) + best.connections.length
      return score > bestScore ? city : best
    })

    // Create hub-and-spoke pattern: Hub → Spoke1 → Hub → Spoke2 → Hub, etc.
    const spokes = cities.filter(c => c !== hub)
    const sequence: string[] = [hub.name]

    spokes.forEach((spoke, index) => {
      if (index > 0) sequence.push(hub.name) // Return to hub
      sequence.push(spoke.name)
    })

    return sequence
  }

  private calculateDayBreakdown(sequence: string[], totalDays: number, pace: string): Array<{
    city: string
    nights: number
    arrivalDay: number
    departureDay: number
    rationale: string
  }> {
    const breakdown: Array<{
      city: string
      nights: number
      arrivalDay: number
      departureDay: number
      rationale: string
    }> = []

    // Account for travel days
    const travelDays = Math.max(0, sequence.length - 1) * (pace === 'packed' ? 0.5 : 1)
    const accommodationDays = totalDays - travelDays

    let currentDay = 1
    
    sequence.forEach((city, index) => {
      const cityInfo = this.getCityInfo(city)
      const isFirst = index === 0
      const isLast = index === sequence.length - 1
      
      // Calculate optimal nights based on city importance and available time
      let nights: number
      
      if (sequence.length === 1) {
        nights = totalDays - 1 // Single city trip
      } else {
        const baseNights = Math.floor(accommodationDays / sequence.length)
        const bonus = (cityInfo?.major || isFirst || isLast) ? 1 : 0
        nights = Math.max(1, baseNights + bonus)
      }

      // Ensure we don't exceed total days
      const remainingDays = totalDays - currentDay + 1
      const remainingCities = sequence.length - index
      const maxNights = Math.floor(remainingDays - (remainingCities - 1))
      nights = Math.min(nights, maxNights)

      const arrivalDay = currentDay
      const departureDay = currentDay + nights

      let rationale = ''
      if (cityInfo?.major) rationale = 'Major destination - extended stay'
      else if (isFirst) rationale = 'Arrival city - extra time for settling in'  
      else if (isLast) rationale = 'Departure city - buffer time'
      else rationale = 'Regional highlight'

      breakdown.push({
        city,
        nights,
        arrivalDay,
        departureDay,
        rationale
      })

      currentDay = departureDay + (pace === 'packed' ? 0 : 1) // Travel day
    })

    return breakdown
  }

  private generateTransportPlan(sequence: string[], preference: string): Array<{
    from: string
    to: string
    method: 'flight' | 'train' | 'bus' | 'car' | 'ferry'
    duration: string
    distance: number
    cost: number
    scenic: boolean
  }> {
    const transport: Array<{
      from: string
      to: string
      method: 'flight' | 'train' | 'bus' | 'car' | 'ferry'
      duration: string
      distance: number
      cost: number
      scenic: boolean
    }> = []

    for (let i = 0; i < sequence.length - 1; i++) {
      const from = sequence[i]
      const to = sequence[i + 1]
      
      const fromCity = this.getCityInfo(from)
      const toCity = this.getCityInfo(to)
      
      if (!fromCity || !toCity) continue

      const distance = this.calculateDistance(fromCity, toCity)
      
      // Determine optimal transport method
      let method: 'flight' | 'train' | 'bus' | 'car' | 'ferry'
      let duration: string
      let cost: number
      let scenic: boolean

      if (distance > 1000) {
        method = 'flight'
        duration = '2-3 hours'
        cost = Math.round(distance * 0.15) // Rough cost per km
        scenic = false
      } else if (distance > 500) {
        method = preference === 'fastest' ? 'flight' : 'train'
        duration = method === 'flight' ? '1-2 hours' : '4-6 hours'
        cost = Math.round(distance * (method === 'flight' ? 0.2 : 0.12))
        scenic = method === 'train'
      } else if (distance > 200) {
        method = preference === 'budget' ? 'bus' : 'train'
        duration = method === 'bus' ? '3-5 hours' : '2-4 hours'
        cost = Math.round(distance * (method === 'bus' ? 0.08 : 0.15))
        scenic = true
      } else {
        method = 'car'
        duration = '1-3 hours'
        cost = Math.round(distance * 0.1)
        scenic = true
      }

      // Special cases for scenic routes
      if (preference === 'scenic' && distance < 500) {
        method = 'car'
        scenic = true
      }

      transport.push({
        from,
        to,
        method,
        duration,
        distance: Math.round(distance),
        cost,
        scenic
      })
    }

    return transport
  }

  private generateRouteHighlights(sequence: string[], routeType: string, options: RouteOptions): string[] {
    const highlights: string[] = []

    // Route type highlights
    switch (routeType) {
      case 'linear':
        highlights.push(`Linear journey through ${sequence.length} destinations`)
        highlights.push('Minimal backtracking for efficient travel')
        break
      case 'circular':
        highlights.push(`Circular tour returning to starting point`)
        highlights.push('Perfect for comprehensive exploration')
        break
      case 'hub-and-spoke':
        highlights.push('Hub-based route with central location')
        highlights.push('Easy day trips from main base')
        break
    }

    // Add specific highlights based on cities
    if (sequence.length >= 4) {
      highlights.push(`Multi-city adventure covering ${sequence.length} unique destinations`)
    }

    const hasGateway = sequence.some(city => {
      const info = this.getCityInfo(city)
      return info?.gateway
    })
    
    if (hasGateway) {
      highlights.push('Includes major international gateway cities')
    }

    // Transport highlights
    const uniqueTransport = Array.from(new Set(this.generateTransportPlan(sequence, options.transportPreference).map(t => t.method)))
    if (uniqueTransport.length > 1) {
      highlights.push(`Multi-modal transport: ${uniqueTransport.join(', ')}`)
    }

    return highlights
  }
}

// Singleton instance
export const routeOptimizer = new RouteOptimizer()
export default RouteOptimizer