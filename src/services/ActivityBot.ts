import RedisClient from '@/lib/redis'
import { prisma } from '@/lib/prisma'

export interface ActivitySearchParams {
  destination: string
  startDate: string
  endDate: string
  interests?: string[]
  budget?: number
  travelers: number
  hotelLocation?: {
    lat: number
    lng: number
    address: string
  }
  preferences?: {
    categories?: ('sightseeing' | 'cultural' | 'adventure' | 'wellness' | 'dining' | 'nightlife')[]
    intensity?: 'low' | 'medium' | 'high'
    accessibility?: boolean
    familyFriendly?: boolean
  }
}

export interface ActivityResult {
  id: string
  name: string
  category: string
  type: 'attraction' | 'tour' | 'restaurant' | 'experience' | 'wellness'
  description: string
  images: string[]
  location: {
    address: string
    coordinates: {
      lat: number
      lng: number
    }
    distanceFromHotel?: number // km
    travelTime?: string
  }
  duration: {
    estimated: number // minutes
    flexible: boolean
  }
  pricing: {
    amount: number
    currency: string
    type: 'per_person' | 'per_group' | 'free'
    includes: string[]
  }
  availability: {
    dates: string[]
    times: string[]
    bookingRequired: boolean
    advanceBooking?: number // days
  }
  ratings: {
    overall: number
    count: number
    highlights: string[]
  }
  accessibility: {
    wheelchairAccessible: boolean
    features: string[]
  }
  tags: string[]
  healthBenefits?: string[]
  intensity: 'low' | 'medium' | 'high'
  score: number
  optimalTimeSlot?: 'morning' | 'afternoon' | 'evening' | 'flexible'
}

export class ActivityBot {
  private static readonly CACHE_TTL = 3600 // 1 hour
  private static readonly MAX_RETRIES = 3
  private static readonly RETRY_DELAY = 1000

  // Main search method with intelligent clustering
  static async searchActivities(params: ActivitySearchParams): Promise<ActivityResult[]> {
    const cacheKey = ActivityBot.generateCacheKey(params)
    
    // Try cache first
    const cachedResults = await RedisClient.getCachedActivityData(cacheKey)
    if (cachedResults) {
      console.log('ActivityBot: Returning cached results')
      return cachedResults
    }

    console.log('ActivityBot: Searching activities with params:', params)

    // Query APIs with retry mechanism
    const apiResults = await ActivityBot.queryApisWithRetry(params)
    
    if (apiResults.length === 0) {
      const fallbackResults = await ActivityBot.getFallbackActivities(params)
      return fallbackResults
    }

    // Calculate distances and travel times
    const resultsWithDistances = await ActivityBot.calculateDistances(apiResults, params.hotelLocation)
    
    // Apply clustering logic for optimal day-by-day planning
    const clusteredResults = ActivityBot.clusterActivities(resultsWithDistances)
    
    // Rank based on user preferences and interests
    const rankedResults = ActivityBot.rankActivities(clusteredResults, params)
    
    // Cache results
    await RedisClient.cacheActivityData(cacheKey, rankedResults, ActivityBot.CACHE_TTL)
    
    // Log for analytics and learning
    await ActivityBot.logSearchResults(params, rankedResults)

    return rankedResults
  }

  // Query multiple APIs in parallel
  private static async queryApisWithRetry(params: ActivitySearchParams): Promise<ActivityResult[]> {
    const apis = [
      () => ActivityBot.queryGooglePlacesAPI(params),
      () => ActivityBot.queryTripAdvisorAPI(params),
      () => ActivityBot.queryViatorAPI(params)
    ]

    const results: ActivityResult[] = []

    const apiPromises = apis.map(async (apiCall) => {
      for (let attempt = 1; attempt <= ActivityBot.MAX_RETRIES; attempt++) {
        try {
          const apiResults = await apiCall()
          return apiResults
        } catch (error) {
          console.error(`ActivityBot API attempt ${attempt} failed:`, error)
          
          if (attempt < ActivityBot.MAX_RETRIES) {
            await new Promise(resolve => 
              setTimeout(resolve, ActivityBot.RETRY_DELAY * Math.pow(2, attempt - 1))
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

  // Google Places API integration
  private static async queryGooglePlacesAPI(params: ActivitySearchParams): Promise<ActivityResult[]> {
    const apiKey = await ActivityBot.getApiKey('google_places')
    if (!apiKey) throw new Error('Google Places API key not found')

    // Simulate API call (replace with actual Google Places API)
    const mockResults: ActivityResult[] = [
      {
        id: 'google_1',
        name: 'Colosseum Skip-the-Line Tour',
        category: 'sightseeing',
        type: 'attraction',
        description: 'Explore ancient Rome with expert guide, skip the long lines and discover the history of gladiators',
        images: ['/colosseum-1.jpg', '/colosseum-2.jpg'],
        location: {
          address: 'Piazza del Colosseo, 1, Rome, Italy',
          coordinates: { lat: 41.8902, lng: 12.4922 },
        },
        duration: {
          estimated: 180,
          flexible: false
        },
        pricing: {
          amount: 35,
          currency: 'GBP',
          type: 'per_person',
          includes: ['Skip-the-line access', 'Professional guide', 'Audio headsets']
        },
        availability: {
          dates: [params.startDate, params.endDate],
          times: ['09:00', '14:00', '16:30'],
          bookingRequired: true,
          advanceBooking: 1
        },
        ratings: {
          overall: 4.6,
          count: 8924,
          highlights: ['Amazing guide', 'Skip the lines', 'Historical insights']
        },
        accessibility: {
          wheelchairAccessible: false,
          features: ['Stairs required', 'Uneven surfaces']
        },
        tags: ['history', 'architecture', 'must-see', 'cultural'],
        healthBenefits: ['Walking exercise', 'Educational stimulation'],
        intensity: 'medium',
        score: 0,
        optimalTimeSlot: 'morning'
      }
    ]

    return ActivityBot.filterActivities(mockResults, params)
  }

  // TripAdvisor API integration
  private static async queryTripAdvisorAPI(params: ActivitySearchParams): Promise<ActivityResult[]> {
    const apiKey = await ActivityBot.getApiKey('tripadvisor')
    if (!apiKey) throw new Error('TripAdvisor API key not found')

    const mockResults: ActivityResult[] = [
      {
        id: 'tripadvisor_1',
        name: 'Vatican Museums & Sistine Chapel',
        category: 'cultural',
        type: 'attraction',
        description: 'World-class art collection and Michelangelo masterpieces in the heart of Vatican City',
        images: ['/vatican-1.jpg'],
        location: {
          address: 'Vatican City, Rome, Italy',
          coordinates: { lat: 41.9029, lng: 12.4534 }
        },
        duration: {
          estimated: 240,
          flexible: true
        },
        pricing: {
          amount: 45,
          currency: 'GBP',
          type: 'per_person',
          includes: ['Museum entry', 'Sistine Chapel access', 'Audio guide']
        },
        availability: {
          dates: [params.startDate],
          times: ['08:00', '10:00', '13:00'],
          bookingRequired: true,
          advanceBooking: 3
        },
        ratings: {
          overall: 4.8,
          count: 12453,
          highlights: ['Incredible art', 'Sistine Chapel', 'Must visit']
        },
        accessibility: {
          wheelchairAccessible: true,
          features: ['Wheelchair rental available', 'Accessible routes']
        },
        tags: ['art', 'religion', 'history', 'masterpiece'],
        healthBenefits: ['Mental stimulation', 'Cultural enrichment'],
        intensity: 'medium',
        score: 0,
        optimalTimeSlot: 'morning'
      }
    ]

    return ActivityBot.filterActivities(mockResults, params)
  }

  // Viator API integration for tours and experiences
  private static async queryViatorAPI(params: ActivitySearchParams): Promise<ActivityResult[]> {
    const apiKey = await ActivityBot.getApiKey('viator')
    if (!apiKey) throw new Error('Viator API key not found')

    const mockResults: ActivityResult[] = [
      {
        id: 'viator_1',
        name: 'Authentic Roman Food Tour',
        category: 'dining',
        type: 'experience',
        description: 'Taste authentic Roman cuisine in local trattorias with a knowledgeable foodie guide',
        images: ['/food-tour-1.jpg'],
        location: {
          address: 'Trastevere District, Rome, Italy',
          coordinates: { lat: 41.8919, lng: 12.4676 }
        },
        duration: {
          estimated: 210,
          flexible: true
        },
        pricing: {
          amount: 75,
          currency: 'GBP',
          type: 'per_person',
          includes: ['Food tastings', 'Wine pairings', 'Local guide', '4 restaurant stops']
        },
        availability: {
          dates: [params.startDate, params.endDate],
          times: ['18:00', '19:30'],
          bookingRequired: true,
          advanceBooking: 2
        },
        ratings: {
          overall: 4.9,
          count: 1876,
          highlights: ['Authentic food', 'Great guide', 'Hidden gems']
        },
        accessibility: {
          wheelchairAccessible: true,
          features: ['Most venues accessible', 'Can accommodate dietary restrictions']
        },
        tags: ['food', 'local culture', 'evening', 'authentic'],
        healthBenefits: ['Social interaction', 'Cultural experience', 'Fresh ingredients'],
        intensity: 'low',
        score: 0,
        optimalTimeSlot: 'evening'
      }
    ]

    return ActivityBot.filterActivities(mockResults, params)
  }

  // Calculate distances and travel times from hotel
  private static async calculateDistances(
    activities: ActivityResult[],
    hotelLocation?: ActivitySearchParams['hotelLocation']
  ): Promise<ActivityResult[]> {
    if (!hotelLocation) {
      return activities
    }

    return activities.map(activity => {
      const distance = ActivityBot.calculateDistance(
        hotelLocation,
        activity.location.coordinates
      )
      
      // Estimate travel time based on distance
      let travelTime = '10 min walk'
      if (distance > 1) {
        const timeMinutes = Math.round(distance * 12) // Rough estimate: 12 min per km
        travelTime = timeMinutes > 30 ? `${Math.round(timeMinutes / 15) * 15} min transit` : `${timeMinutes} min walk`
      }

      return {
        ...activity,
        location: {
          ...activity.location,
          distanceFromHotel: Math.round(distance * 100) / 100,
          travelTime
        }
      }
    })
  }

  // Intelligent activity clustering for optimal day planning
  private static clusterActivities(activities: ActivityResult[]): ActivityResult[] {
    // Group activities by proximity (within 1km clusters)
    const clusters: ActivityResult[][] = []
    const processed = new Set<string>()

    activities.forEach(activity => {
      if (processed.has(activity.id)) return

      const cluster = [activity]
      processed.add(activity.id)

      // Find nearby activities (within 1km)
      activities.forEach(otherActivity => {
        if (processed.has(otherActivity.id)) return

        const distance = ActivityBot.calculateDistance(
          activity.location.coordinates,
          otherActivity.location.coordinates
        )

        if (distance <= 1.0) { // Within 1km
          cluster.push(otherActivity)
          processed.add(otherActivity.id)
        }
      })

      clusters.push(cluster)
    })

    // Prioritize clusters with more activities (better for day planning)
    return activities.map(activity => {
      const clusterSize = clusters.find(cluster => 
        cluster.some(item => item.id === activity.id)
      )?.length || 1

      return {
        ...activity,
        score: activity.score + (clusterSize > 1 ? clusterSize * 5 : 0)
      }
    })
  }

  // Ranking algorithm based on user interests and preferences
  private static rankActivities(activities: ActivityResult[], params: ActivitySearchParams): ActivityResult[] {
    return activities.map(activity => {
      let score = 100

      // Rating factor
      const ratingScore = (activity.ratings.overall / 5) * 30
      score += ratingScore

      // Interest matching
      if (params.interests && params.interests.length > 0) {
        const matchingInterests = params.interests.filter(interest =>
          activity.tags.includes(interest.toLowerCase()) ||
          activity.category.includes(interest.toLowerCase())
        ).length
        score += matchingInterests * 20
      }

      // Category preference matching
      if (params.preferences?.categories) {
        if (params.preferences.categories.includes(activity.category as any)) {
          score += 25
        }
      }

      // Distance factor (closer to hotel = higher score)
      if (activity.location.distanceFromHotel !== undefined) {
        const distanceScore = Math.max(0, 20 - (activity.location.distanceFromHotel * 2))
        score += distanceScore
      }

      // Intensity matching
      if (params.preferences?.intensity) {
        if (activity.intensity === params.preferences.intensity) {
          score += 15
        } else if (
          (params.preferences.intensity === 'low' && activity.intensity === 'medium') ||
          (params.preferences.intensity === 'high' && activity.intensity === 'medium')
        ) {
          score += 5
        }
      }

      // Accessibility bonus
      if (params.preferences?.accessibility && activity.accessibility.wheelchairAccessible) {
        score += 20
      }

      // Family-friendly bonus
      if (params.preferences?.familyFriendly && activity.tags.includes('family')) {
        score += 15
      }

      // Health benefits bonus
      if (activity.healthBenefits && activity.healthBenefits.length > 0) {
        score += activity.healthBenefits.length * 5
      }

      // Popular/highly rated bonus
      if (activity.ratings.overall >= 4.5 && activity.ratings.count > 1000) {
        score += 10
      }

      // Price factor (adjust based on budget)
      if (params.budget) {
        const pricePerPerson = activity.pricing.amount
        const totalCost = activity.pricing.type === 'per_person' ? 
          pricePerPerson * params.travelers : pricePerPerson
        
        if (totalCost <= params.budget * 0.1) { // Less than 10% of budget
          score += 10
        } else if (totalCost > params.budget * 0.3) { // More than 30% of budget
          score -= 15
        }
      }

      activity.score = Math.round(score)
      return activity
    }).sort((a, b) => b.score - a.score)
  }

  // Filter activities based on constraints
  private static filterActivities(activities: ActivityResult[], params: ActivitySearchParams): ActivityResult[] {
    return activities.filter(activity => {
      // Budget filter
      if (params.budget) {
        const totalCost = activity.pricing.type === 'per_person' ? 
          activity.pricing.amount * params.travelers : activity.pricing.amount
        
        if (totalCost > params.budget) {
          return false
        }
      }

      // Accessibility filter
      if (params.preferences?.accessibility && !activity.accessibility.wheelchairAccessible) {
        return false
      }

      // Date availability filter
      const tripDates = ActivityBot.getDateRange(params.startDate, params.endDate)
      const hasAvailability = tripDates.some(date => 
        activity.availability.dates.includes(date)
      )
      
      if (!hasAvailability && activity.availability.bookingRequired) {
        return false
      }

      return true
    })
  }

  // Fallback activities when APIs fail
  private static async getFallbackActivities(params: ActivitySearchParams): Promise<ActivityResult[]> {
    console.log('ActivityBot: Using fallback activity templates')
    
    const fallbackActivities: ActivityResult[] = [
      {
        id: 'fallback_1',
        name: `${params.destination} City Walking Tour`,
        category: 'sightseeing',
        type: 'tour',
        description: `Explore the highlights of ${params.destination} on foot with a local guide`,
        images: ['/placeholder-tour.jpg'],
        location: {
          address: `City Center, ${params.destination}`,
          coordinates: { lat: 0, lng: 0 }
        },
        duration: {
          estimated: 120,
          flexible: true
        },
        pricing: {
          amount: 25,
          currency: 'GBP',
          type: 'per_person',
          includes: ['Local guide', 'Walking tour']
        },
        availability: {
          dates: [params.startDate, params.endDate],
          times: ['10:00', '15:00'],
          bookingRequired: false
        },
        ratings: {
          overall: 4.0,
          count: 100,
          highlights: ['Local insights', 'Good value']
        },
        accessibility: {
          wheelchairAccessible: true,
          features: ['Flat routes available']
        },
        tags: ['walking', 'sightseeing', 'local'],
        healthBenefits: ['Walking exercise', 'Fresh air'],
        intensity: 'medium',
        score: 75,
        optimalTimeSlot: 'morning'
      }
    ]

    return fallbackActivities
  }

  // Helper methods
  private static generateCacheKey(params: ActivitySearchParams): string {
    const interests = params.interests?.join(',') || ''
    return `activity_search:${params.destination}:${params.startDate}:${interests}`
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

  private static getDateRange(startDate: string, endDate: string): string[] {
    const dates = []
    const current = new Date(startDate)
    const end = new Date(endDate)

    while (current <= end) {
      dates.push(current.toISOString().split('T')[0])
      current.setDate(current.getDate() + 1)
    }

    return dates
  }

  private static async logSearchResults(params: ActivitySearchParams, results: ActivityResult[]): Promise<void> {
    console.log(`ActivityBot: Logged search for ${params.destination}, found ${results.length} results`)
  }

  // User feedback for continuous learning
  static async recordFeedback(activityId: string, userId: string, feedback: {
    rating: number
    accepted: boolean
    comments?: string
  }): Promise<void> {
    await prisma.userFeedback.create({
      data: {
        userId,
        itemType: 'activity',
        itemId: activityId,
        rating: feedback.rating,
        accepted: feedback.accepted,
        feedback: feedback.comments
      }
    })

    console.log(`ActivityBot: Recorded feedback for activity ${activityId}`)
  }
}