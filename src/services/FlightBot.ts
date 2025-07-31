import RedisClient from '@/lib/redis'
import { prisma } from '@/lib/prisma'

export interface FlightSearchParams {
  origin: string
  destination: string
  departureDate: string
  returnDate?: string
  passengers: number
  budget?: number
  preferences?: {
    preferNonStop?: boolean
    preferredAirlines?: string[]
    maxLayovers?: number
    classOfService?: 'economy' | 'premium_economy' | 'business' | 'first'
  }
}

export interface FlightResult {
  id: string
  airline: string
  flightNumber: string
  aircraft: string
  departure: {
    airport: string
    time: string
    terminal?: string
  }
  arrival: {
    airport: string
    time: string
    terminal?: string
  }
  duration: string
  layovers: Array<{
    airport: string
    duration: string
  }>
  price: {
    amount: number
    currency: string
  }
  seats: {
    available: number
    class: string
  }
  amenities: string[]
  score: number // Ranking score based on user preferences
}

export class FlightBot {
  private static readonly CACHE_TTL = 1800 // 30 minutes
  private static readonly MAX_RETRIES = 3
  private static readonly RETRY_DELAY = 1000 // 1 second

  // Main search method with retry mechanism
  static async searchFlights(params: FlightSearchParams): Promise<FlightResult[]> {
    const cacheKey = FlightBot.generateCacheKey(params)
    
    // Try cache first
    const cachedResults = await RedisClient.getCachedFlightData(cacheKey)
    if (cachedResults) {
      console.log('FlightBot: Returning cached results')
      return cachedResults
    }

    console.log('FlightBot: Searching flights with params:', params)

    // Try multiple APIs with retry mechanism
    const apiResults = await FlightBot.queryApisWithRetry(params)
    
    if (apiResults.length === 0) {
      // Fallback to cached popular routes or templates
      const fallbackResults = await FlightBot.getFallbackFlights(params)
      return fallbackResults
    }

    // Rank and sort results
    const rankedResults = FlightBot.rankFlights(apiResults, params.preferences)
    
    // Cache results
    await RedisClient.cacheFlightData(cacheKey, rankedResults, FlightBot.CACHE_TTL)
    
    // Log feedback for continuous learning
    await FlightBot.logSearchResults(params, rankedResults)

    return rankedResults
  }

  // Query multiple APIs in parallel with retry logic
  private static async queryApisWithRetry(params: FlightSearchParams): Promise<FlightResult[]> {
    const apis = [
      () => FlightBot.queryAmadeusAPI(params),
      () => FlightBot.querySkyscannerAPI(params),
      () => FlightBot.queryKiwiAPI(params)
    ]

    const results: FlightResult[] = []

    // Execute APIs in parallel
    const apiPromises = apis.map(async (apiCall) => {
      for (let attempt = 1; attempt <= FlightBot.MAX_RETRIES; attempt++) {
        try {
          const apiResults = await apiCall()
          return apiResults
        } catch (error) {
          console.error(`FlightBot API attempt ${attempt} failed:`, error)
          
          if (attempt < FlightBot.MAX_RETRIES) {
            // Exponential backoff
            await new Promise(resolve => 
              setTimeout(resolve, FlightBot.RETRY_DELAY * Math.pow(2, attempt - 1))
            )
          }
        }
      }
      return []
    })

    const apiResults = await Promise.allSettled(apiPromises)
    
    // Merge results from all successful APIs
    apiResults.forEach(result => {
      if (result.status === 'fulfilled' && result.value.length > 0) {
        results.push(...result.value)
      }
    })

    return results
  }

  // Amadeus API integration
  private static async queryAmadeusAPI(params: FlightSearchParams): Promise<FlightResult[]> {
    const apiKey = await FlightBot.getApiKey('amadeus')
    if (!apiKey) throw new Error('Amadeus API key not found')

    // Simulate API call (replace with actual Amadeus API integration)
    const mockResults: FlightResult[] = [
      {
        id: 'amadeus_1',
        airline: 'British Airways',
        flightNumber: 'BA 2551',
        aircraft: 'Boeing 737',
        departure: {
          airport: params.origin,
          time: '09:25',
          terminal: 'T5'
        },
        arrival: {
          airport: params.destination,
          time: '13:45',
          terminal: 'T1'
        },
        duration: '2h 50m',
        layovers: [],
        price: {
          amount: 285,
          currency: 'GBP'
        },
        seats: {
          available: 12,
          class: 'economy'
        },
        amenities: ['WiFi', 'Meals', 'Entertainment'],
        score: 0
      }
    ]

    // Apply filters based on budget and preferences
    return FlightBot.filterFlights(mockResults, params)
  }

  // Skyscanner API integration
  private static async querySkyscannerAPI(params: FlightSearchParams): Promise<FlightResult[]> {
    const apiKey = await FlightBot.getApiKey('skyscanner')
    if (!apiKey) throw new Error('Skyscanner API key not found')

    // Simulate API call
    const mockResults: FlightResult[] = [
      {
        id: 'skyscanner_1',
        airline: 'Ryanair',
        flightNumber: 'FR 4632',
        aircraft: 'Boeing 737-800',
        departure: {
          airport: params.origin,
          time: '06:15'
        },
        arrival: {
          airport: params.destination,
          time: '10:30'
        },
        duration: '2h 45m',
        layovers: [],
        price: {
          amount: 89,
          currency: 'GBP'
        },
        seats: {
          available: 45,
          class: 'economy'
        },
        amenities: ['Paid WiFi'],
        score: 0
      }
    ]

    return FlightBot.filterFlights(mockResults, params)
  }

  // Kiwi.com API integration
  private static async queryKiwiAPI(params: FlightSearchParams): Promise<FlightResult[]> {
    const apiKey = await FlightBot.getApiKey('kiwi')
    if (!apiKey) throw new Error('Kiwi API key not found')

    // Simulate API call
    const mockResults: FlightResult[] = [
      {
        id: 'kiwi_1',
        airline: 'Lufthansa',
        flightNumber: 'LH 901',
        aircraft: 'Airbus A320',
        departure: {
          airport: params.origin,
          time: '14:20'
        },
        arrival: {
          airport: params.destination,
          time: '19:15'
        },
        duration: '3h 25m',
        layovers: [
          {
            airport: 'FRA',
            duration: '1h 30m'
          }
        ],
        price: {
          amount: 195,
          currency: 'GBP'
        },
        seats: {
          available: 23,
          class: 'economy'
        },
        amenities: ['WiFi', 'Meals', 'Entertainment', 'Extra Legroom Available'],
        score: 0
      }
    ]

    return FlightBot.filterFlights(mockResults, params)
  }

  // Ranking algorithm based on user preferences
  private static rankFlights(flights: FlightResult[], preferences?: FlightSearchParams['preferences']): FlightResult[] {
    return flights.map(flight => {
      let score = 100 // Base score

      // Price factor (lower price = higher score)
      const priceScore = Math.max(0, 100 - (flight.price.amount / 10))
      score += priceScore * 0.4

      // Duration factor (shorter = higher score)
      const durationMinutes = FlightBot.parseDuration(flight.duration)
      const durationScore = Math.max(0, 100 - (durationMinutes / 10))
      score += durationScore * 0.3

      // Layover factor
      if (preferences?.preferNonStop && flight.layovers.length === 0) {
        score += 30
      } else if (flight.layovers.length > (preferences?.maxLayovers || 2)) {
        score -= 20
      }

      // Airline preference
      if (preferences?.preferredAirlines?.includes(flight.airline)) {
        score += 25
      }

      // Amenities bonus
      if (flight.amenities.includes('WiFi')) score += 5
      if (flight.amenities.includes('Meals')) score += 5
      if (flight.amenities.includes('Entertainment')) score += 5

      flight.score = Math.round(score)
      return flight
    }).sort((a, b) => b.score - a.score)
  }

  // Filter flights based on budget and constraints
  private static filterFlights(flights: FlightResult[], params: FlightSearchParams): FlightResult[] {
    return flights.filter(flight => {
      // Budget filter
      if (params.budget && flight.price.amount > params.budget) {
        return false
      }

      // Layover filter
      if (params.preferences?.maxLayovers !== undefined && 
          flight.layovers.length > params.preferences.maxLayovers) {
        return false
      }

      return true
    })
  }

  // Fallback flights for when APIs fail
  private static async getFallbackFlights(params: FlightSearchParams): Promise<FlightResult[]> {
    console.log('FlightBot: Using fallback flight templates')
    
    // Return cached popular routes or pre-defined templates
    const fallbackFlights: FlightResult[] = [
      {
        id: 'fallback_1',
        airline: 'Template Airlines',
        flightNumber: 'TMP 001',
        aircraft: 'Boeing 737',
        departure: {
          airport: params.origin,
          time: '10:00'
        },
        arrival: {
          airport: params.destination,
          time: '14:00'
        },
        duration: '4h 00m',
        layovers: [],
        price: {
          amount: 250,
          currency: 'GBP'
        },
        seats: {
          available: 50,
          class: 'economy'
        },
        amenities: ['Basic Service'],
        score: 50
      }
    ]

    return fallbackFlights
  }

  // Helper methods
  private static generateCacheKey(params: FlightSearchParams): string {
    return `flight_search:${params.origin}:${params.destination}:${params.departureDate}:${params.passengers}`
  }

  private static async getApiKey(service: string): Promise<string | null> {
    try {
      const apiKey = await prisma.apiKey.findFirst({
        where: {
          service,
          status: 'active'
        }
      })
      return apiKey?.key || null
    } catch (error) {
      console.error(`Error fetching API key for ${service}:`, error)
      return null
    }
  }

  private static parseDuration(duration: string): number {
    // Parse duration like "2h 50m" to minutes
    const match = duration.match(/(\d+)h\s*(\d+)m/)
    if (match) {
      return parseInt(match[1]) * 60 + parseInt(match[2])
    }
    return 0
  }

  private static async logSearchResults(params: FlightSearchParams, results: FlightResult[]): Promise<void> {
    // Log search for analytics and continuous learning
    console.log(`FlightBot: Logged search for ${params.origin} to ${params.destination}, found ${results.length} results`)
    
    // In production, this would log to analytics service
    // await analyticsService.logFlightSearch(params, results)
  }

  // User feedback integration for continuous learning
  static async recordFeedback(flightId: string, userId: string, feedback: {
    rating: number
    accepted: boolean
    comments?: string
  }): Promise<void> {
    await prisma.userFeedback.create({
      data: {
        userId,
        itemType: 'flight',
        itemId: flightId,
        rating: feedback.rating,
        accepted: feedback.accepted,
        feedback: feedback.comments
      }
    })

    console.log(`FlightBot: Recorded feedback for flight ${flightId}`)
  }
}