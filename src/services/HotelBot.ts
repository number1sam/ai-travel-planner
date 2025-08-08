import RedisClient from '@/lib/redis'
import { prisma } from '@/lib/prisma'
import { BookingAPI } from './hotel-apis/BookingAPI'
import { AmadeusAPI } from './hotel-apis/AmadeusAPI'
import { searchHotelsForDestination, SearchProfile, Hotel as RealHotel } from '@/utils/hotelSearch'

export interface HotelSearchParams {
  destination: string
  checkInDate: string
  checkOutDate: string
  guests: number
  budget?: number
  preferences?: {
    starRating?: number
    amenities?: string[]
    accessibility?: boolean
    location?: 'city_center' | 'airport' | 'beach' | 'business_district'
  }
  plannedActivities?: Array<{
    location: string
    coordinates?: { lat: number; lng: number }
  }>
}

export interface HotelResult {
  id: string
  name: string
  starRating: number
  address: string
  coordinates: {
    lat: number
    lng: number
  }
  images: string[]
  amenities: string[]
  rooms: Array<{
    type: string
    description: string
    price: {
      amount: number
      currency: string
      perNight: boolean
    }
    available: number
  }>
  location: {
    type: string
    walkingDistanceToCenter: string
    nearbyAttractions: string[]
  }
  accessibility: {
    wheelchairAccessible: boolean
    features: string[]
  }
  reviews: {
    overall: number
    cleanliness: number
    location: number
    service: number
    value: number
    count: number
  }
  cancellationPolicy: string
  score: number
  averageDistanceToActivities?: number // km
}

export class HotelBot {
  private static readonly CACHE_TTL = 1800 // 30 minutes
  private static readonly MAX_RETRIES = 3
  private static readonly RETRY_DELAY = 1000

  // Main search method with location intelligence
  static async searchHotels(params: HotelSearchParams): Promise<HotelResult[]> {
    const cacheKey = HotelBot.generateCacheKey(params)
    
    // Try cache first
    const cachedResults = await RedisClient.getCachedHotelData(cacheKey)
    if (cachedResults) {
      console.log('HotelBot: Returning cached results')
      return cachedResults
    }

    console.log('HotelBot: Searching hotels with params:', params)

    // Query APIs with retry mechanism
    const apiResults = await HotelBot.queryApisWithRetry(params)
    
    if (apiResults.length === 0) {
      const fallbackResults = await HotelBot.getFallbackHotels(params)
      return fallbackResults
    }

    // Calculate distances to planned activities
    const resultsWithDistances = await HotelBot.calculateActivityDistances(apiResults, params.plannedActivities)
    
    // Rank and sort results with location intelligence
    const rankedResults = HotelBot.rankHotels(resultsWithDistances, params.preferences)
    
    // Cache results
    await RedisClient.cacheHotelData(cacheKey, rankedResults, HotelBot.CACHE_TTL)
    
    // Log for analytics
    await HotelBot.logSearchResults(params, rankedResults)

    return rankedResults
  }

  // Query multiple APIs in parallel
  private static async queryApisWithRetry(params: HotelSearchParams): Promise<HotelResult[]> {
    const apis = [
      () => BookingAPI.searchHotels(params),
      () => AmadeusAPI.searchHotels(params),
      () => HotelBot.queryInternalDatabase(params)
    ]

    const results: HotelResult[] = []

    const apiPromises = apis.map(async (apiCall) => {
      for (let attempt = 1; attempt <= HotelBot.MAX_RETRIES; attempt++) {
        try {
          const apiResults = await apiCall()
          return apiResults
        } catch (error) {
          console.error(`HotelBot API attempt ${attempt} failed:`, error)
          
          if (attempt < HotelBot.MAX_RETRIES) {
            await new Promise(resolve => 
              setTimeout(resolve, HotelBot.RETRY_DELAY * Math.pow(2, attempt - 1))
            )
          }
        }
      }
      return []
    })

    const apiResults = await Promise.allSettled(apiPromises)
    
    apiResults.forEach(result => {
      if (result.status === 'fulfilled' && result.value.length > 0) {
        results.push(...result.value)
      }
    })

    // Remove duplicates based on hotel name and location
    const uniqueResults = HotelBot.removeDuplicates(results)
    
    return uniqueResults
  }


  // Location intelligence - calculate distances to planned activities
  private static async calculateActivityDistances(
    hotels: HotelResult[], 
    activities?: HotelSearchParams['plannedActivities']
  ): Promise<HotelResult[]> {
    if (!activities || activities.length === 0) {
      return hotels
    }

    return hotels.map(hotel => {
      const distances = activities.map(activity => {
        // Simple distance calculation (in production, use Google Maps Distance Matrix API)
        if (activity.coordinates) {
          const distance = HotelBot.calculateDistance(
            hotel.coordinates,
            activity.coordinates
          )
          return distance
        }
        return 5 // Default distance if coordinates not available
      })

      const averageDistance = distances.reduce((sum, dist) => sum + dist, 0) / distances.length
      
      return {
        ...hotel,
        averageDistanceToActivities: Math.round(averageDistance * 100) / 100
      }
    })
  }

  // Ranking algorithm with location intelligence
  private static rankHotels(hotels: HotelResult[], preferences?: HotelSearchParams['preferences']): HotelResult[] {
    return hotels.map(hotel => {
      let score = 100

      // Star rating factor
      const starScore = (hotel.starRating / 5) * 20
      score += starScore

      // Reviews factor
      const reviewScore = (hotel.reviews.overall / 10) * 25
      score += reviewScore

      // Price factor (inverse - lower price gets higher score)
      const lowestPrice = Math.min(...hotel.rooms.map(room => room.price.amount))
      const priceScore = Math.max(0, 50 - (lowestPrice / 10))
      score += priceScore * 0.3

      // Location factor - proximity to activities
      if (hotel.averageDistanceToActivities !== undefined) {
        const locationScore = Math.max(0, 30 - (hotel.averageDistanceToActivities * 3))
        score += locationScore
      }

      // Accessibility bonus
      if (preferences?.accessibility && hotel.accessibility.wheelchairAccessible) {
        score += 25
      }

      // Amenity preferences
      if (preferences?.amenities) {
        const matchingAmenities = preferences.amenities.filter(amenity => 
          hotel.amenities.includes(amenity)
        ).length
        score += matchingAmenities * 5
      }

      // Star rating preference
      if (preferences?.starRating) {
        if (hotel.starRating >= preferences.starRating) {
          score += 15
        } else {
          score -= 10
        }
      }

      // Wellness amenities bonus
      const wellnessAmenities = ['Spa', 'Gym', 'Pool', 'Wellness Center']
      const wellnessCount = wellnessAmenities.filter(amenity => 
        hotel.amenities.includes(amenity)
      ).length
      score += wellnessCount * 8

      hotel.score = Math.round(score)
      return hotel
    }).sort((a, b) => b.score - a.score)
  }

  // Filter hotels based on budget and requirements
  private static filterHotels(hotels: HotelResult[], params: HotelSearchParams): HotelResult[] {
    return hotels.filter(hotel => {
      // Budget filter
      if (params.budget) {
        const lowestPrice = Math.min(...hotel.rooms.map(room => room.price.amount))
        const nights = HotelBot.calculateNights(params.checkInDate, params.checkOutDate)
        if (lowestPrice * nights > params.budget) {
          return false
        }
      }

      // Star rating filter
      if (params.preferences?.starRating && hotel.starRating < params.preferences.starRating) {
        return false
      }

      // Accessibility filter
      if (params.preferences?.accessibility && !hotel.accessibility.wheelchairAccessible) {
        return false
      }

      return true
    })
  }

  // Query internal database as fallback
  private static async queryInternalDatabase(params: HotelSearchParams): Promise<HotelResult[]> {
    try {
      // Use the real hotel database from hotelSearch.ts
      const searchProfile: SearchProfile = {
        destinationCity: params.destination,
        country: HotelBot.getCountryFromDestination(params.destination),
        checkIn: params.checkInDate,
        checkOut: params.checkOutDate,
        guests: params.guests,
        nights: HotelBot.calculateNights(params.checkInDate, params.checkOutDate),
        totalBudget: params.budget || 1000,
        accommodationBudget: params.budget || 1000,
        maxNightlyRate: params.budget ? Math.floor(params.budget / HotelBot.calculateNights(params.checkInDate, params.checkOutDate)) : 150,
        stayType: 'hotel',
        preferredAmenities: params.preferences?.amenities || [],
        locationPreference: params.preferences?.location || 'city_center'
      }

      const realHotels = await searchHotelsForDestination(searchProfile)
      return HotelBot.convertRealHotelsToHotelResults(realHotels.selectedHotel, realHotels.alternatives, params)
    } catch (error) {
      console.error('HotelBot: Error querying real hotel database:', error)
      return HotelBot.getDefaultHotelsForDestination(params)
    }
  }

  // Get default hotels for popular destinations
  private static getDefaultHotelsForDestination(params: HotelSearchParams): HotelResult[] {
    const destination = params.destination.toLowerCase()
    const nights = HotelBot.calculateNights(params.checkInDate, params.checkOutDate)
    const budgetPerNight = params.budget ? params.budget / nights : 150

    // Default hotels for popular destinations
    const destinationHotels: Record<string, HotelResult[]> = {
      rome: [
        {
          id: 'default_rome_1',
          name: 'Hotel Forum Roma',
          starRating: 4,
          address: 'Via Tor de Conti, 25, 00184 Roma',
          coordinates: { lat: 41.8925, lng: 12.4853 },
          images: ['/api/placeholder/400/300'],
          amenities: ['WiFi', 'Restaurant', 'Bar', 'Rooftop Terrace', 'Concierge'],
          rooms: [{
            type: 'Classic Room',
            description: 'Elegant room with Roman decor',
            price: { amount: Math.min(165, budgetPerNight), currency: 'GBP', perNight: true },
            available: 4
          }],
          location: {
            type: 'city_center',
            walkingDistanceToCenter: '5 minutes',
            nearbyAttractions: ['Colosseum', 'Roman Forum', 'Trevi Fountain']
          },
          accessibility: {
            wheelchairAccessible: true,
            features: ['Accessible entrance', 'Elevator']
          },
          reviews: {
            overall: 8.6, cleanliness: 8.8, location: 9.5, service: 8.7, value: 8.3, count: 1842
          },
          cancellationPolicy: 'Free cancellation up to 24 hours before',
          score: 0
        }
      ],
      paris: [
        {
          id: 'default_paris_1',
          name: 'Hotel Malte Opera',
          starRating: 4,
          address: '63 Rue de Richelieu, 75002 Paris',
          coordinates: { lat: 48.8689, lng: 2.3368 },
          images: ['/api/placeholder/400/300'],
          amenities: ['WiFi', 'Bar', 'Concierge', 'Room Service'],
          rooms: [{
            type: 'Superior Room',
            description: 'Parisian elegance with modern comfort',
            price: { amount: Math.min(195, budgetPerNight), currency: 'GBP', perNight: true },
            available: 3
          }],
          location: {
            type: 'city_center',
            walkingDistanceToCenter: '3 minutes',
            nearbyAttractions: ['Louvre', 'Opera', 'Palais Royal']
          },
          accessibility: {
            wheelchairAccessible: false,
            features: []
          },
          reviews: {
            overall: 8.7, cleanliness: 8.9, location: 9.4, service: 8.8, value: 8.2, count: 1256
          },
          cancellationPolicy: 'Free cancellation up to 48 hours before',
          score: 0
        }
      ],
      florence: [
        {
          id: 'default_florence_1',
          name: 'Hotel Davanzati',
          starRating: 4,
          address: 'Via Porta Rossa, 5, 50123 Firenze',
          coordinates: { lat: 43.7711, lng: 11.2538 },
          images: ['/api/placeholder/400/300'],
          amenities: ['WiFi', 'Breakfast', 'Bar', 'Concierge', 'Room Service'],
          rooms: [{
            type: 'Deluxe Room',
            description: 'Renaissance charm with modern amenities',
            price: { amount: Math.min(175, budgetPerNight), currency: 'GBP', perNight: true },
            available: 5
          }],
          location: {
            type: 'city_center',
            walkingDistanceToCenter: '2 minutes',
            nearbyAttractions: ['Duomo', 'Uffizi Gallery', 'Ponte Vecchio']
          },
          accessibility: {
            wheelchairAccessible: true,
            features: ['Accessible entrance', 'Elevator']
          },
          reviews: {
            overall: 8.8, cleanliness: 9.0, location: 9.6, service: 8.9, value: 8.4, count: 987
          },
          cancellationPolicy: 'Free cancellation up to 24 hours before',
          score: 0
        }
      ]
    }

    // Return hotels for specific destination or generic ones
    const specificHotels = Object.entries(destinationHotels).find(([key]) => 
      destination.includes(key)
    )?.[1]

    if (specificHotels) {
      return HotelBot.filterHotels(specificHotels, params)
    }

    // Generic hotels for any destination
    return [{
      id: 'default_generic_1',
      name: `${params.destination} Central Hotel`,
      starRating: 3,
      address: `City Center, ${params.destination}`,
      coordinates: { lat: 0, lng: 0 },
      images: ['/api/placeholder/400/300'],
      amenities: ['WiFi', 'Breakfast', 'Reception 24h'],
      rooms: [{
        type: 'Standard Room',
        description: 'Comfortable room in central location',
        price: { amount: Math.min(120, budgetPerNight), currency: 'GBP', perNight: true },
        available: 5
      }],
      location: {
        type: 'city_center',
        walkingDistanceToCenter: '10 minutes',
        nearbyAttractions: ['City Center', 'Shopping District']
      },
      accessibility: {
        wheelchairAccessible: true,
        features: ['Accessible entrance']
      },
      reviews: {
        overall: 8.0, cleanliness: 8.2, location: 8.5, service: 8.0, value: 8.3, count: 500
      },
      cancellationPolicy: 'Standard cancellation policy',
      score: 0
    }]
  }

  // Remove duplicate hotels
  private static removeDuplicates(hotels: HotelResult[]): HotelResult[] {
    const seen = new Map<string, HotelResult>()
    
    for (const hotel of hotels) {
      const key = `${hotel.name.toLowerCase()}-${hotel.address.toLowerCase()}`
      if (!seen.has(key) || (seen.get(key)!.score < hotel.score)) {
        seen.set(key, hotel)
      }
    }
    
    return Array.from(seen.values())
  }

  // Fallback hotels when APIs fail - use real hotel database
  private static async getFallbackHotels(params: HotelSearchParams): Promise<HotelResult[]> {
    console.log('HotelBot: Using real hotel database as fallback')
    
    try {
      // Use the same logic as queryInternalDatabase to get real hotels
      const searchProfile: SearchProfile = {
        destinationCity: params.destination,
        country: HotelBot.getCountryFromDestination(params.destination),
        checkIn: params.checkInDate,
        checkOut: params.checkOutDate,
        guests: params.guests,
        nights: HotelBot.calculateNights(params.checkInDate, params.checkOutDate),
        totalBudget: params.budget || 1000,
        accommodationBudget: params.budget || 1000,
        maxNightlyRate: params.budget ? Math.floor(params.budget / HotelBot.calculateNights(params.checkInDate, params.checkOutDate)) : 150,
        stayType: 'hotel',
        preferredAmenities: params.preferences?.amenities || [],
        locationPreference: params.preferences?.location || 'city_center'
      }

      const realHotels = await searchHotelsForDestination(searchProfile)
      const convertedHotels = HotelBot.convertRealHotelsToHotelResults(realHotels.selectedHotel, realHotels.alternatives, params)
      
      if (convertedHotels.length > 0) {
        return convertedHotels
      }
    } catch (error) {
      console.error('HotelBot: Error getting real hotels for fallback:', error)
    }

    // Final fallback - simple generic hotel
    return [{
      id: 'generic_fallback_1',
      name: `${params.destination} Central Hotel`,
      starRating: 3,
      address: `Central Area, ${params.destination}`,
      coordinates: { lat: 0, lng: 0 },
      images: ['/placeholder-hotel.jpg'],
      amenities: ['WiFi', 'Reception', 'Breakfast'],
      rooms: [{
        type: 'Standard Room',
        description: 'Comfortable accommodation',
        price: { amount: 120, currency: 'GBP', perNight: true },
        available: 10
      }],
      location: {
        type: 'city_center',
        walkingDistanceToCenter: '15 minutes',
        nearbyAttractions: ['City Center']
      },
      accessibility: {
        wheelchairAccessible: true,
        features: ['Basic accessibility']
      },
      reviews: {
        overall: 8.0, cleanliness: 8.0, location: 8.0, service: 8.0, value: 8.0, count: 100
      },
      cancellationPolicy: 'Standard cancellation policy',
      score: 75
    }]
  }

  // Helper methods
  private static generateCacheKey(params: HotelSearchParams): string {
    return `hotel_search:${params.destination}:${params.checkInDate}:${params.checkOutDate}:${params.guests}`
  }

  private static async getApiKey(service: string): Promise<string | null> {
    try {
      const apiKey = await prisma.apiKey.findFirst({
        where: { service, status: 'active' }
      })
      return apiKey?.key || null
    } catch (error) {
      console.error(`Error fetching API key for ${service}:`, error)
      return null
    }
  }

  private static calculateDistance(
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number }
  ): number {
    // Haversine formula for distance calculation
    const R = 6371 // Earth's radius in km
    const dLat = (point2.lat - point1.lat) * Math.PI / 180
    const dLng = (point2.lng - point1.lng) * Math.PI / 180
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  private static calculateNights(checkIn: string, checkOut: string): number {
    const start = new Date(checkIn)
    const end = new Date(checkOut)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  private static async logSearchResults(params: HotelSearchParams, results: HotelResult[]): Promise<void> {
    console.log(`HotelBot: Logged search for ${params.destination}, found ${results.length} results`)
  }

  // Convert real hotel data to HotelResult format
  private static convertRealHotelsToHotelResults(selectedHotel: RealHotel | null, alternatives: RealHotel[], params: HotelSearchParams): HotelResult[] {
    const allHotels = [selectedHotel, ...alternatives].filter(Boolean) as RealHotel[]
    
    return allHotels.map(hotel => ({
      id: `real_${hotel.name.toLowerCase().replace(/\s+/g, '_')}`,
      name: hotel.name,
      starRating: hotel.stars || 4,
      address: hotel.location,
      coordinates: hotel.coordinates || { lat: 0, lng: 0 },
      images: hotel.images || ['/api/placeholder/400/300'],
      amenities: hotel.amenities,
      rooms: hotel.rooms || [{
        type: 'Standard Room',
        description: hotel.description || 'Comfortable room',
        price: { amount: hotel.pricePerNight, currency: 'GBP', perNight: true },
        available: 5
      }],
      location: {
        type: 'city_center',
        walkingDistanceToCenter: '10 minutes',
        nearbyAttractions: [hotel.location]
      },
      accessibility: {
        wheelchairAccessible: hotel.amenities.includes('Accessible'),
        features: hotel.amenities.includes('Accessible') ? ['Accessible entrance'] : []
      },
      reviews: {
        overall: hotel.rating * 2, // Convert from 5-point to 10-point scale
        cleanliness: hotel.rating * 2,
        location: hotel.rating * 2,
        service: hotel.rating * 2,
        value: hotel.rating * 2,
        count: hotel.reviews || 100
      },
      cancellationPolicy: hotel.cancellationPolicy || 'Standard cancellation policy',
      score: Math.round(hotel.rating * 30) // Base score from rating
    }))
  }

  // Map destination to country
  private static getCountryFromDestination(destination: string): string {
    const destinationToCountry: Record<string, string> = {
      'rome': 'Italy',
      'florence': 'Italy',
      'venice': 'Italy',
      'milan': 'Italy',
      'paris': 'France',
      'nice': 'France',
      'lyon': 'France',
      'london': 'United Kingdom',
      'manchester': 'United Kingdom',
      'edinburgh': 'United Kingdom',
      'tokyo': 'Japan',
      'osaka': 'Japan',
      'kyoto': 'Japan',
      'bangkok': 'Thailand',
      'phuket': 'Thailand',
      'chiang mai': 'Thailand',
      'barcelona': 'Spain',
      'madrid': 'Spain',
      'seville': 'Spain',
      'tenerife': 'Spain',
      'new york': 'United States',
      'los angeles': 'United States',
      'chicago': 'United States',
      'dubai': 'United Arab Emirates',
      'abu dhabi': 'United Arab Emirates',
      'sydney': 'Australia',
      'melbourne': 'Australia',
      'cancun': 'Mexico',
      'mexico city': 'Mexico',
      'amsterdam': 'Netherlands',
      'rotterdam': 'Netherlands',
      'singapore': 'Singapore',
      'cape town': 'South Africa',
      'johannesburg': 'South Africa',
      'istanbul': 'Turkey',
      'ankara': 'Turkey'
    }

    const lowerDestination = destination.toLowerCase()
    
    // Check for exact matches
    if (destinationToCountry[lowerDestination]) {
      return destinationToCountry[lowerDestination]
    }
    
    // Check for partial matches
    for (const [city, country] of Object.entries(destinationToCountry)) {
      if (lowerDestination.includes(city) || city.includes(lowerDestination)) {
        return country
      }
    }
    
    // Default fallback
    return 'Unknown'
  }

  // User feedback for continuous learning
  static async recordFeedback(hotelId: string, userId: string, feedback: {
    rating: number
    accepted: boolean
    comments?: string
  }): Promise<void> {
    await prisma.userFeedback.create({
      data: {
        userId,
        itemType: 'hotel',
        itemId: hotelId,
        rating: feedback.rating,
        accepted: feedback.accepted,
        feedback: feedback.comments
      }
    })

    console.log(`HotelBot: Recorded feedback for hotel ${hotelId}`)
  }
}