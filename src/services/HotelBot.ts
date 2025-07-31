import RedisClient from '@/lib/redis'
import { prisma } from '@/lib/prisma'

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
      () => HotelBot.queryBookingAPI(params),
      () => HotelBot.queryExpediaAPI(params),
      () => HotelBot.queryHotelsAPI(params)
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

    return results
  }

  // Booking.com API integration
  private static async queryBookingAPI(params: HotelSearchParams): Promise<HotelResult[]> {
    const apiKey = await HotelBot.getApiKey('booking')
    if (!apiKey) throw new Error('Booking.com API key not found')

    // Simulate API call (replace with actual Booking.com API)
    const mockResults: HotelResult[] = [
      {
        id: 'booking_1',
        name: 'Hotel Artemide',
        starRating: 4,
        address: 'Via Nazionale 22, Rome, Italy',
        coordinates: {
          lat: 41.9028,
          lng: 12.4964
        },
        images: ['/hotel-artemide-1.jpg', '/hotel-artemide-2.jpg'],
        amenities: ['WiFi', 'Gym', 'Spa', 'Restaurant', 'Bar', 'Room Service', 'Concierge'],
        rooms: [
          {
            type: 'Standard Double Room',
            description: 'Comfortable room with city view',
            price: {
              amount: 180,
              currency: 'GBP',
              perNight: true
            },
            available: 5
          },
          {
            type: 'Superior Room',
            description: 'Spacious room with premium amenities',
            price: {
              amount: 220,
              currency: 'GBP',
              perNight: true
            },
            available: 3
          }
        ],
        location: {
          type: 'city_center',
          walkingDistanceToCenter: '5 minutes',
          nearbyAttractions: ['Termini Station', 'Colosseum', 'Roman Forum']
        },
        accessibility: {
          wheelchairAccessible: true,
          features: ['Accessible entrance', 'Elevator', 'Accessible bathroom']
        },
        reviews: {
          overall: 8.7,
          cleanliness: 9.1,
          location: 9.5,
          service: 8.9,
          value: 8.2,
          count: 2847
        },
        cancellationPolicy: 'Free cancellation until 24 hours before check-in',
        score: 0
      }
    ]

    return HotelBot.filterHotels(mockResults, params)
  }

  // Expedia API integration
  private static async queryExpediaAPI(params: HotelSearchParams): Promise<HotelResult[]> {
    const apiKey = await HotelBot.getApiKey('expedia')
    if (!apiKey) throw new Error('Expedia API key not found')

    const mockResults: HotelResult[] = [
      {
        id: 'expedia_1',
        name: 'Luxury City Hotel',
        starRating: 5,
        address: 'Central Square 15, Rome, Italy',
        coordinates: {
          lat: 41.9027,
          lng: 12.4963
        },
        images: ['/luxury-hotel-1.jpg'],
        amenities: ['WiFi', 'Pool', 'Spa', 'Fine Dining', 'Butler Service', 'Valet Parking'],
        rooms: [
          {
            type: 'Deluxe Suite',
            description: 'Luxurious suite with panoramic city views',
            price: {
              amount: 350,
              currency: 'GBP',
              perNight: true
            },
            available: 2
          }
        ],
        location: {
          type: 'city_center',
          walkingDistanceToCenter: '2 minutes',
          nearbyAttractions: ['Spanish Steps', 'Trevi Fountain', 'Pantheon']
        },
        accessibility: {
          wheelchairAccessible: true,
          features: ['Full accessibility', 'Accessible parking', 'Braille signage']
        },
        reviews: {
          overall: 9.2,
          cleanliness: 9.8,
          location: 9.9,
          service: 9.5,
          value: 7.8,
          count: 1203
        },
        cancellationPolicy: 'Free cancellation until 48 hours before check-in',
        score: 0
      }
    ]

    return HotelBot.filterHotels(mockResults, params)
  }

  // Hotels.com API integration
  private static async queryHotelsAPI(params: HotelSearchParams): Promise<HotelResult[]> {
    const apiKey = await HotelBot.getApiKey('hotels')
    if (!apiKey) throw new Error('Hotels.com API key not found')

    const mockResults: HotelResult[] = [
      {
        id: 'hotels_1',
        name: 'Budget Comfort Inn',
        starRating: 3,
        address: 'Via del Corso 101, Rome, Italy',
        coordinates: {
          lat: 41.9010,
          lng: 12.4950
        },
        images: ['/budget-hotel-1.jpg'],
        amenities: ['WiFi', 'Breakfast', 'Tour Desk'],
        rooms: [
          {
            type: 'Economy Room',
            description: 'Clean and comfortable basic room',
            price: {
              amount: 95,
              currency: 'GBP',
              perNight: true
            },
            available: 8
          }
        ],
        location: {
          type: 'city_center',
          walkingDistanceToCenter: '10 minutes',
          nearbyAttractions: ['Shopping District', 'Historic Center']
        },
        accessibility: {
          wheelchairAccessible: false,
          features: []
        },
        reviews: {
          overall: 7.8,
          cleanliness: 8.2,
          location: 8.5,
          service: 7.9,
          value: 9.1,
          count: 892
        },
        cancellationPolicy: 'Free cancellation until 24 hours before check-in',
        score: 0
      }
    ]

    return HotelBot.filterHotels(mockResults, params)
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

  // Fallback hotels when APIs fail
  private static async getFallbackHotels(params: HotelSearchParams): Promise<HotelResult[]> {
    console.log('HotelBot: Using fallback hotel templates')
    
    const fallbackHotels: HotelResult[] = [
      {
        id: 'fallback_1',
        name: 'Standard City Hotel',
        starRating: 3,
        address: `Central Area, ${params.destination}`,
        coordinates: { lat: 0, lng: 0 },
        images: ['/placeholder-hotel.jpg'],
        amenities: ['WiFi', 'Reception', 'Breakfast'],
        rooms: [
          {
            type: 'Standard Room',
            description: 'Comfortable accommodation',
            price: {
              amount: 120,
              currency: 'GBP',
              perNight: true
            },
            available: 10
          }
        ],
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
          overall: 8.0,
          cleanliness: 8.0,
          location: 8.0,
          service: 8.0,
          value: 8.0,
          count: 100
        },
        cancellationPolicy: 'Standard cancellation policy',
        score: 75
      }
    ]

    return fallbackHotels
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