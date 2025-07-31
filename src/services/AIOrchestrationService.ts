import { prisma } from '@/lib/prisma'
import { AccessibilityService } from './AccessibilityService'
import { NotificationService } from './NotificationService'
import OpenAI from 'openai'
import { Anthropic } from '@anthropic-ai/sdk'

export interface BotResponse {
  botType: 'flight' | 'hotel' | 'activity'
  botId: string
  confidence: number // 0-1
  suggestions: Array<{
    id: string
    name: string
    description: string
    price: number
    currency: string
    duration?: number // minutes
    location?: {
      lat: number
      lng: number
      address: string
    }
    metadata: any
    score: number // 0-100
    reasoning: string
  }>
  processingTime: number // milliseconds
  cacheHit: boolean
  errors?: string[]
}

export interface ItineraryContext {
  userId: string
  tripId?: string
  destination: string
  startDate: Date
  endDate: Date
  budget: {
    total: number
    currency: string
    breakdown: {
      flights: number
      accommodation: number
      activities: number
      food: number
      transport: number
    }
  }
  preferences: {
    travelStyle: string[] // adventure, relaxation, cultural, etc.
    interests: string[]
    dietaryRestrictions: string[]
    accessibility: any
    pacePreference: 'slow' | 'moderate' | 'fast'
  }
  groupSize: number
  previousTrips?: string[]
  healthProfile?: {
    fitnessLevel: 'low' | 'medium' | 'high'
    medicalConditions: string[]
    medications: string[]
  }
}

export interface MergedItinerary {
  id: string
  version: number
  createdAt: Date
  status: 'draft' | 'confirmed' | 'completed'
  summary: {
    destination: string
    duration: number // days
    totalCost: number
    totalActivities: number
    walkingDistance: number // meters
    carbonFootprint: number // kg CO2
  }
  days: Array<{
    date: Date
    dayNumber: number
    theme: string // e.g., "Cultural Exploration", "Beach Day"
    activities: Array<{
      id: string
      type: 'flight' | 'hotel' | 'activity' | 'meal' | 'transport'
      name: string
      startTime: string
      endTime: string
      duration: number
      location: any
      price: number
      bookingStatus: 'suggested' | 'booked' | 'confirmed'
      provider: string
      notes?: string
      healthTips?: string[]
      accessibilityInfo?: any
      weatherDependent: boolean
    }>
    meals: {
      breakfast?: any
      lunch?: any
      dinner?: any
    }
    transport: Array<{
      from: string
      to: string
      method: string
      duration: number
      cost: number
    }>
    totalWalking: number
    totalCost: number
    healthReminders: string[]
  }>
  flights: Array<{
    outbound: any
    return: any
    totalCost: number
    airline: string
    bookingReference?: string
  }>
  accommodations: Array<{
    hotelName: string
    checkIn: Date
    checkOut: Date
    roomType: string
    totalCost: number
    location: any
    amenities: string[]
    bookingReference?: string
  }>
  warnings: string[]
  suggestions: string[]
  alternativeOptions: any[]
}

export class AIOrchestrationService {
  private static openai: OpenAI
  private static anthropic: Anthropic
  private static botInstances: Map<string, any> = new Map()
  private static orchestrationQueue: Map<string, any> = new Map()
  
  // Bot configuration
  private static readonly BOT_CONFIG = {
    flight: {
      id: 'flight-bot-v2',
      name: 'Flight Finder Bot',
      model: 'gpt-4-turbo-preview',
      temperature: 0.3,
      maxRetries: 3,
      timeout: 30000, // 30 seconds
      cacheTime: 3600000, // 1 hour
      endpoints: [
        'https://api.amadeus.com/v2/shopping/flight-offers',
        'https://api.skyscanner.com/flights'
      ]
    },
    hotel: {
      id: 'hotel-bot-v2',
      name: 'Hotel Finder Bot',
      model: 'claude-3-opus',
      temperature: 0.4,
      maxRetries: 3,
      timeout: 25000,
      cacheTime: 3600000,
      endpoints: [
        'https://api.booking.com/v3/hotels',
        'https://api.hotels.com/search'
      ]
    },
    activity: {
      id: 'activity-bot-v2',
      name: 'Activity Planner Bot',
      model: 'gpt-4-turbo-preview',
      temperature: 0.6,
      maxRetries: 2,
      timeout: 20000,
      cacheTime: 7200000, // 2 hours
      endpoints: [
        'https://api.viator.com/activities',
        'https://api.getyourguide.com/tours'
      ]
    }
  }

  // Ranking weights for different factors
  private static readonly RANKING_WEIGHTS = {
    price: 0.25,
    userPreference: 0.20,
    rating: 0.15,
    location: 0.15,
    accessibility: 0.10,
    sustainability: 0.08,
    uniqueness: 0.07
  }

  /**
   * Initialize AI Orchestration Service
   */
  static initialize(): void {
    // Initialize OpenAI
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })

    // Initialize Anthropic
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    })

    // Initialize bot instances
    this.initializeBots()

    // Start queue processor
    this.startQueueProcessor()

    console.log('AIOrchestrationService: Initialized with multiple AI providers')
  }

  /**
   * Initialize individual bots
   */
  private static initializeBots(): void {
    // Initialize Flight Bot
    this.botInstances.set('flight', {
      id: this.BOT_CONFIG.flight.id,
      status: 'ready',
      requestCount: 0,
      successRate: 100,
      averageResponseTime: 0,
      cache: new Map()
    })

    // Initialize Hotel Bot
    this.botInstances.set('hotel', {
      id: this.BOT_CONFIG.hotel.id,
      status: 'ready',
      requestCount: 0,
      successRate: 100,
      averageResponseTime: 0,
      cache: new Map()
    })

    // Initialize Activity Bot
    this.botInstances.set('activity', {
      id: this.BOT_CONFIG.activity.id,
      status: 'ready',
      requestCount: 0,
      successRate: 100,
      averageResponseTime: 0,
      cache: new Map()
    })
  }

  /**
   * Generate complete itinerary using AI orchestration
   */
  static async generateItinerary(context: ItineraryContext): Promise<MergedItinerary> {
    console.log(`AIOrchestrationService: Generating itinerary for ${context.destination}`)
    
    try {
      // Step 1: Validate and enrich context
      const enrichedContext = await this.enrichContext(context)

      // Step 2: Generate initial itinerary structure
      const itineraryStructure = await this.generateItineraryStructure(enrichedContext)

      // Step 3: Dispatch to bots in parallel
      const botResponses = await this.dispatchToBots(enrichedContext, itineraryStructure)

      // Step 4: Merge and optimize bot responses
      const mergedItinerary = await this.mergeAndOptimize(botResponses, enrichedContext, itineraryStructure)

      // Step 5: Apply user behavioral learning
      const personalizedItinerary = await this.applyBehavioralLearning(mergedItinerary, context.userId)

      // Step 6: Validate and finalize
      const finalItinerary = await this.validateAndFinalize(personalizedItinerary, enrichedContext)

      // Step 7: Store itinerary
      await this.storeItinerary(finalItinerary, context)

      // Step 8: Send notification
      await this.notifyUser(context.userId, finalItinerary)

      return finalItinerary
    } catch (error) {
      console.error('AIOrchestrationService: Error generating itinerary:', error)
      throw error
    }
  }

  /**
   * Enrich context with additional data
   */
  private static async enrichContext(context: ItineraryContext): Promise<ItineraryContext> {
    // Get user's full profile
    const user = await prisma.user.findUnique({
      where: { id: context.userId },
      include: {
        preferences: true,
        healthMetrics: {
          orderBy: { date: 'desc' },
          take: 30
        },
        trips: {
          where: { status: 'completed' },
          orderBy: { endDate: 'desc' },
          take: 5
        }
      }
    })

    if (!user) throw new Error('User not found')

    // Enrich with historical data
    const enriched = { ...context }

    // Add health profile if not provided
    if (!enriched.healthProfile && user.healthMetrics.length > 0) {
      const avgSteps = user.healthMetrics.reduce((sum, m) => sum + (m.steps || 0), 0) / user.healthMetrics.length
      enriched.healthProfile = {
        fitnessLevel: avgSteps > 10000 ? 'high' : avgSteps > 5000 ? 'medium' : 'low',
        medicalConditions: [],
        medications: []
      }
    }

    // Add previous trips
    enriched.previousTrips = user.trips.map(t => t.id)

    // Get accessibility requirements
    if (user.preferences.length > 0) {
      const accessibilityProfile = await AccessibilityService.getUserAccessibilityProfile(context.userId)
      if (accessibilityProfile) {
        enriched.preferences.accessibility = accessibilityProfile
      }
    }

    return enriched
  }

  /**
   * Generate initial itinerary structure using AI
   */
  private static async generateItineraryStructure(context: ItineraryContext): Promise<any> {
    const prompt = `
    Create a detailed daily itinerary structure for a ${context.groupSize} person trip to ${context.destination} 
    from ${context.startDate.toISOString()} to ${context.endDate.toISOString()}.
    
    Budget: ${context.budget.currency} ${context.budget.total}
    Travel Style: ${context.preferences.travelStyle.join(', ')}
    Interests: ${context.preferences.interests.join(', ')}
    Pace: ${context.preferences.pacePreference}
    
    Create a day-by-day structure with:
    - Daily themes
    - Suggested activity types and timing
    - Meal recommendations
    - Rest periods based on pace preference
    - Budget allocation per day
    
    Return as JSON with daily structure.
    `

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert travel planner specializing in creating personalized itineraries.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })

    return JSON.parse(completion.choices[0].message.content || '{}')
  }

  /**
   * Dispatch requests to specialized bots
   */
  private static async dispatchToBots(
    context: ItineraryContext, 
    structure: any
  ): Promise<Map<string, BotResponse>> {
    const responses = new Map<string, BotResponse>()
    
    // Create bot tasks
    const botTasks = [
      this.callFlightBot(context, structure),
      this.callHotelBot(context, structure),
      this.callActivityBot(context, structure)
    ]

    // Execute in parallel with timeout
    const results = await Promise.allSettled(botTasks)

    // Process results
    results.forEach((result, index) => {
      const botType = ['flight', 'hotel', 'activity'][index] as 'flight' | 'hotel' | 'activity'
      
      if (result.status === 'fulfilled') {
        responses.set(botType, result.value)
      } else {
        console.error(`AIOrchestrationService: ${botType} bot failed:`, result.reason)
        responses.set(botType, {
          botType,
          botId: this.BOT_CONFIG[botType].id,
          confidence: 0,
          suggestions: [],
          processingTime: 0,
          cacheHit: false,
          errors: [result.reason.message]
        })
      }
    })

    return responses
  }

  /**
   * Call Flight Bot
   */
  private static async callFlightBot(context: ItineraryContext, structure: any): Promise<BotResponse> {
    const startTime = Date.now()
    const bot = this.botInstances.get('flight')
    const config = this.BOT_CONFIG.flight

    try {
      // Check cache first
      const cacheKey = `${context.destination}-${context.startDate}-${context.endDate}-${context.budget.breakdown.flights}`
      const cached = bot.cache.get(cacheKey)
      
      if (cached && Date.now() - cached.timestamp < config.cacheTime) {
        return {
          ...cached.data,
          cacheHit: true,
          processingTime: Date.now() - startTime
        }
      }

      // Call AI for flight recommendations
      const prompt = `
      Find the best flight options for:
      - From: User's location
      - To: ${context.destination}
      - Departure: ${context.startDate}
      - Return: ${context.endDate}
      - Budget: ${context.budget.currency} ${context.budget.breakdown.flights}
      - Passengers: ${context.groupSize}
      
      Preferences:
      - Direct flights preferred: ${context.preferences.pacePreference === 'slow'}
      - Flexibility: ±2 days
      
      Return top 5 flight options with scoring based on:
      - Price (within budget)
      - Duration
      - Airline rating
      - Convenience (departure times, layovers)
      `

      const completion = await this.openai.chat.completions.create({
        model: config.model,
        messages: [
          {
            role: 'system',
            content: 'You are a flight booking specialist bot. Provide realistic flight options with actual airline names and reasonable prices.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: config.temperature
      })

      // Parse and rank suggestions
      const suggestions = this.parseFlightSuggestions(completion.choices[0].message.content || '')
      const rankedSuggestions = this.rankSuggestions(suggestions, context, 'flight')

      const response: BotResponse = {
        botType: 'flight',
        botId: config.id,
        confidence: 0.85,
        suggestions: rankedSuggestions,
        processingTime: Date.now() - startTime,
        cacheHit: false
      }

      // Cache the response
      bot.cache.set(cacheKey, {
        data: response,
        timestamp: Date.now()
      })

      // Update bot metrics
      bot.requestCount++
      bot.averageResponseTime = (bot.averageResponseTime * (bot.requestCount - 1) + response.processingTime) / bot.requestCount

      return response
    } catch (error) {
      bot.successRate = (bot.successRate * bot.requestCount + 0) / (bot.requestCount + 1)
      throw error
    }
  }

  /**
   * Call Hotel Bot
   */
  private static async callHotelBot(context: ItineraryContext, structure: any): Promise<BotResponse> {
    const startTime = Date.now()
    const bot = this.botInstances.get('hotel')
    const config = this.BOT_CONFIG.hotel

    try {
      // Calculate nights
      const nights = Math.ceil((context.endDate.getTime() - context.startDate.getTime()) / (1000 * 60 * 60 * 24))
      const budgetPerNight = context.budget.breakdown.accommodation / nights

      // Use Claude for hotel recommendations
      const message = await this.anthropic.messages.create({
        model: config.model,
        max_tokens: 1000,
        temperature: config.temperature,
        messages: [{
          role: 'user',
          content: `Find hotels in ${context.destination} for:
          - Check-in: ${context.startDate}
          - Check-out: ${context.endDate}
          - Guests: ${context.groupSize}
          - Budget per night: ${context.budget.currency} ${budgetPerNight}
          
          Requirements:
          ${context.preferences.accessibility ? '- Wheelchair accessible' : ''}
          - Travel style: ${context.preferences.travelStyle.join(', ')}
          
          Provide 5 hotel options with details on location, amenities, and why each matches the requirements.`
        }]
      })

      // Parse suggestions
      const suggestions = this.parseHotelSuggestions(message.content[0].text)
      const rankedSuggestions = this.rankSuggestions(suggestions, context, 'hotel')

      return {
        botType: 'hotel',
        botId: config.id,
        confidence: 0.90,
        suggestions: rankedSuggestions,
        processingTime: Date.now() - startTime,
        cacheHit: false
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * Call Activity Bot
   */
  private static async callActivityBot(context: ItineraryContext, structure: any): Promise<BotResponse> {
    const startTime = Date.now()
    const bot = this.botInstances.get('activity')
    const config = this.BOT_CONFIG.activity

    try {
      const days = Math.ceil((context.endDate.getTime() - context.startDate.getTime()) / (1000 * 60 * 60 * 24))
      const activitiesPerDay = context.preferences.pacePreference === 'fast' ? 4 : context.preferences.pacePreference === 'moderate' ? 3 : 2

      const prompt = `
      Suggest activities for a ${days}-day trip to ${context.destination}:
      
      Interests: ${context.preferences.interests.join(', ')}
      Pace: ${context.preferences.pacePreference} (${activitiesPerDay} activities per day)
      Budget for activities: ${context.budget.currency} ${context.budget.breakdown.activities}
      Group size: ${context.groupSize}
      
      Daily themes from itinerary structure:
      ${JSON.stringify(structure.dailyThemes || [])}
      
      Provide diverse activities including:
      - Must-see attractions
      - Local experiences
      - Hidden gems
      - Restaurants matching dietary needs: ${context.preferences.dietaryRestrictions.join(', ')}
      
      Include timing, duration, location, and health tips for each activity.
      `

      const completion = await this.openai.chat.completions.create({
        model: config.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert local guide and activity planner. Suggest realistic, bookable activities with accurate pricing and timing.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: config.temperature
      })

      const suggestions = this.parseActivitySuggestions(completion.choices[0].message.content || '')
      const rankedSuggestions = this.rankSuggestions(suggestions, context, 'activity')

      // Check accessibility for each activity if needed
      if (context.preferences.accessibility) {
        for (const suggestion of rankedSuggestions) {
          if (suggestion.location) {
            const accessibility = await AccessibilityService.getPlaceAccessibility(
              `${suggestion.name}-${suggestion.location.address}`
            )
            suggestion.metadata.accessibility = accessibility
          }
        }
      }

      return {
        botType: 'activity',
        botId: config.id,
        confidence: 0.88,
        suggestions: rankedSuggestions,
        processingTime: Date.now() - startTime,
        cacheHit: false
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * Merge and optimize bot responses into coherent itinerary
   */
  private static async mergeAndOptimize(
    botResponses: Map<string, BotResponse>,
    context: ItineraryContext,
    structure: any
  ): Promise<MergedItinerary> {
    const flightBot = botResponses.get('flight')!
    const hotelBot = botResponses.get('hotel')!
    const activityBot = botResponses.get('activity')!

    // Select best options from each bot
    const selectedFlight = flightBot.suggestions[0] // Top ranked flight
    const selectedHotel = hotelBot.suggestions[0] // Top ranked hotel
    const activities = activityBot.suggestions.slice(0, 15) // Top 15 activities to distribute

    // Create day-by-day itinerary
    const days = []
    const startDate = new Date(context.startDate)
    const endDate = new Date(context.endDate)
    let currentDate = new Date(startDate)
    let dayNumber = 1
    let activityIndex = 0

    while (currentDate <= endDate) {
      const isFirstDay = dayNumber === 1
      const isLastDay = currentDate.toDateString() === endDate.toDateString()
      
      // Determine activities for the day
      const dayActivities = []
      const activitiesPerDay = isFirstDay || isLastDay ? 2 : 
        context.preferences.pacePreference === 'fast' ? 4 : 
        context.preferences.pacePreference === 'moderate' ? 3 : 2

      // Add flight on first/last day
      if (isFirstDay) {
        dayActivities.push({
          id: `flight-outbound-${dayNumber}`,
          type: 'flight' as const,
          name: `Flight to ${context.destination}`,
          startTime: '10:00',
          endTime: '14:00',
          duration: 240,
          location: { address: 'Airport' },
          price: selectedFlight?.price || 0,
          bookingStatus: 'suggested' as const,
          provider: selectedFlight?.metadata?.airline || 'TBD',
          weatherDependent: false
        })
      }

      // Add regular activities
      for (let i = 0; i < activitiesPerDay && activityIndex < activities.length; i++) {
        const activity = activities[activityIndex++]
        const startTime = isFirstDay ? '16:00' : `${9 + i * 3}:00`
        
        dayActivities.push({
          id: activity.id,
          type: 'activity' as const,
          name: activity.name,
          startTime,
          endTime: `${parseInt(startTime) + Math.floor(activity.duration || 120 / 60)}:00`,
          duration: activity.duration || 120,
          location: activity.location,
          price: activity.price,
          bookingStatus: 'suggested' as const,
          provider: activity.metadata?.provider || 'Local',
          notes: activity.description,
          healthTips: activity.metadata?.healthTips,
          accessibilityInfo: activity.metadata?.accessibility,
          weatherDependent: activity.metadata?.outdoor || false
        })
      }

      // Add return flight on last day
      if (isLastDay) {
        dayActivities.push({
          id: `flight-return-${dayNumber}`,
          type: 'flight' as const,
          name: `Return flight from ${context.destination}`,
          startTime: '18:00',
          endTime: '22:00',
          duration: 240,
          location: { address: 'Airport' },
          price: 0, // Included in outbound price
          bookingStatus: 'suggested' as const,
          provider: selectedFlight?.metadata?.airline || 'TBD',
          weatherDependent: false
        })
      }

      // Calculate walking distance
      let totalWalking = 0
      for (let i = 1; i < dayActivities.length; i++) {
        const prev = dayActivities[i - 1]
        const curr = dayActivities[i]
        if (prev.location && curr.location) {
          const distance = await this.estimateWalkingDistance(prev.location, curr.location)
          totalWalking += distance
        }
      }

      days.push({
        date: new Date(currentDate),
        dayNumber,
        theme: structure.dailyThemes?.[dayNumber - 1] || `Day ${dayNumber} in ${context.destination}`,
        activities: dayActivities,
        meals: {
          breakfast: { location: selectedHotel?.name || 'Hotel', included: true },
          lunch: { location: 'Local restaurant', budget: 20 },
          dinner: { location: 'Recommended restaurant', budget: 40 }
        },
        transport: this.generateDailyTransport(dayActivities, totalWalking),
        totalWalking,
        totalCost: dayActivities.reduce((sum, a) => sum + a.price, 0) + 60, // Activities + meals
        healthReminders: this.generateHealthReminders(context, totalWalking, dayActivities.length)
      })

      currentDate.setDate(currentDate.getDate() + 1)
      dayNumber++
    }

    // Create merged itinerary
    const mergedItinerary: MergedItinerary = {
      id: `itinerary-${Date.now()}`,
      version: 1,
      createdAt: new Date(),
      status: 'draft',
      summary: {
        destination: context.destination,
        duration: days.length,
        totalCost: this.calculateTotalCost(days, selectedFlight, selectedHotel),
        totalActivities: activities.length,
        walkingDistance: days.reduce((sum, d) => sum + d.totalWalking, 0),
        carbonFootprint: this.estimateCarbonFootprint(selectedFlight, days)
      },
      days,
      flights: [{
        outbound: selectedFlight,
        return: selectedFlight,
        totalCost: selectedFlight?.price || 0,
        airline: selectedFlight?.metadata?.airline || 'TBD'
      }],
      accommodations: [{
        hotelName: selectedHotel?.name || 'TBD',
        checkIn: context.startDate,
        checkOut: context.endDate,
        roomType: selectedHotel?.metadata?.roomType || 'Standard',
        totalCost: selectedHotel?.price || 0,
        location: selectedHotel?.location,
        amenities: selectedHotel?.metadata?.amenities || []
      }],
      warnings: this.generateWarnings(context, days, botResponses),
      suggestions: this.generateSuggestions(context, days, activities),
      alternativeOptions: this.generateAlternatives(botResponses)
    }

    return mergedItinerary
  }

  /**
   * Apply behavioral learning from user's past trips
   */
  private static async applyBehavioralLearning(
    itinerary: MergedItinerary,
    userId: string
  ): Promise<MergedItinerary> {
    try {
      // Get user's feedback history
      const userFeedback = await prisma.userFeedback.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50
      })

      if (userFeedback.length === 0) return itinerary

      // Analyze patterns
      const patterns = this.analyzeUserPatterns(userFeedback)

      // Apply adjustments based on patterns
      const adjusted = { ...itinerary }

      // Adjust activity timing based on user preferences
      if (patterns.preferredStartTime) {
        adjusted.days.forEach(day => {
          if (day.activities.length > 0 && !day.activities[0].type.includes('flight')) {
            const preferredHour = parseInt(patterns.preferredStartTime)
            day.activities[0].startTime = `${preferredHour}:00`
            // Cascade timing changes
            for (let i = 1; i < day.activities.length; i++) {
              const prevEnd = this.addMinutesToTime(
                day.activities[i - 1].startTime,
                day.activities[i - 1].duration
              )
              day.activities[i].startTime = prevEnd
            }
          }
        })
      }

      // Adjust activity types based on preferences
      if (patterns.avoidedActivityTypes.length > 0) {
        adjusted.days.forEach(day => {
          day.activities = day.activities.filter(activity => 
            !patterns.avoidedActivityTypes.includes(activity.metadata?.category)
          )
        })
      }

      // Add personalized suggestions
      adjusted.suggestions.push(
        `Based on your history, we've adjusted activity start times to ${patterns.preferredStartTime || '9:00'}`,
        `We've prioritized ${patterns.preferredActivityTypes.join(', ')} activities based on your past preferences`
      )

      return adjusted
    } catch (error) {
      console.error('AIOrchestrationService: Error applying behavioral learning:', error)
      return itinerary
    }
  }

  /**
   * Validate and finalize itinerary
   */
  private static async validateAndFinalize(
    itinerary: MergedItinerary,
    context: ItineraryContext
  ): Promise<MergedItinerary> {
    const validationErrors = []

    // Check budget
    if (itinerary.summary.totalCost > context.budget.total) {
      validationErrors.push(`Total cost exceeds budget by ${context.budget.currency} ${itinerary.summary.totalCost - context.budget.total}`)
    }

    // Check accessibility if required
    if (context.preferences.accessibility) {
      for (const day of itinerary.days) {
        for (const activity of day.activities) {
          if (activity.accessibilityInfo && !activity.accessibilityInfo.wheelchairAccessible) {
            validationErrors.push(`${activity.name} may not be wheelchair accessible`)
          }
        }
      }
    }

    // Check walking distances
    if (context.healthProfile?.fitnessLevel === 'low') {
      for (const day of itinerary.days) {
        if (day.totalWalking > 3000) { // 3km
          validationErrors.push(`Day ${day.dayNumber} involves ${day.totalWalking}m of walking, which may be challenging`)
        }
      }
    }

    // Add validation results
    if (validationErrors.length > 0) {
      itinerary.warnings.push(...validationErrors)
    }

    // Optimize if needed
    if (validationErrors.length > 0) {
      return this.optimizeItinerary(itinerary, context, validationErrors)
    }

    return itinerary
  }

  /**
   * Helper method to rank suggestions
   */
  private static rankSuggestions(
    suggestions: any[],
    context: ItineraryContext,
    type: 'flight' | 'hotel' | 'activity'
  ): any[] {
    return suggestions.map(suggestion => {
      let score = 0

      // Price score (inverse - lower is better)
      const priceRatio = suggestion.price / (
        type === 'flight' ? context.budget.breakdown.flights :
        type === 'hotel' ? context.budget.breakdown.accommodation :
        context.budget.breakdown.activities
      )
      score += (1 - Math.min(priceRatio, 1)) * this.RANKING_WEIGHTS.price * 100

      // User preference matching
      const preferenceMatch = this.calculatePreferenceMatch(suggestion, context.preferences)
      score += preferenceMatch * this.RANKING_WEIGHTS.userPreference * 100

      // Rating score
      const rating = suggestion.metadata?.rating || 4
      score += (rating / 5) * this.RANKING_WEIGHTS.rating * 100

      // Location score (for activities)
      if (type === 'activity' && suggestion.location) {
        const locationScore = suggestion.metadata?.centralLocation ? 1 : 0.7
        score += locationScore * this.RANKING_WEIGHTS.location * 100
      }

      // Accessibility score
      if (context.preferences.accessibility) {
        const accessibilityScore = suggestion.metadata?.accessible ? 1 : 0.3
        score += accessibilityScore * this.RANKING_WEIGHTS.accessibility * 100
      }

      // Sustainability score
      const sustainabilityScore = suggestion.metadata?.sustainable ? 1 : 0.5
      score += sustainabilityScore * this.RANKING_WEIGHTS.sustainability * 100

      // Uniqueness score
      const uniquenessScore = suggestion.metadata?.unique ? 1 : 0.6
      score += uniquenessScore * this.RANKING_WEIGHTS.uniqueness * 100

      suggestion.score = Math.round(score)
      suggestion.reasoning = this.generateRankingReason(suggestion, score, type)

      return suggestion
    }).sort((a, b) => b.score - a.score)
  }

  /**
   * Parse flight suggestions from AI response
   */
  private static parseFlightSuggestions(content: string): any[] {
    // This would parse the AI response and extract flight details
    // For now, returning mock data
    return [
      {
        id: 'flight-1',
        name: 'British Airways BA123',
        description: 'Direct flight with excellent service',
        price: 450,
        currency: 'GBP',
        duration: 240,
        metadata: {
          airline: 'British Airways',
          departure: '10:00',
          arrival: '14:00',
          direct: true,
          rating: 4.5
        }
      },
      {
        id: 'flight-2',
        name: 'Emirates EK456',
        description: '1 stop via Dubai, premium experience',
        price: 580,
        currency: 'GBP',
        duration: 420,
        metadata: {
          airline: 'Emirates',
          departure: '22:00',
          arrival: '11:00+1',
          direct: false,
          rating: 4.8
        }
      }
    ]
  }

  /**
   * Parse hotel suggestions from AI response
   */
  private static parseHotelSuggestions(content: string): any[] {
    // Parse Claude's response
    return [
      {
        id: 'hotel-1',
        name: 'Grand Plaza Hotel',
        description: 'Luxury hotel in city center with spa',
        price: 150,
        currency: 'GBP',
        location: {
          lat: 0,
          lng: 0,
          address: 'City Center, Main Square'
        },
        metadata: {
          rating: 4.6,
          amenities: ['Spa', 'Pool', 'Gym', 'Restaurant'],
          roomType: 'Deluxe Room',
          accessible: true
        }
      }
    ]
  }

  /**
   * Parse activity suggestions from AI response
   */
  private static parseActivitySuggestions(content: string): any[] {
    // Parse OpenAI's response
    return [
      {
        id: 'activity-1',
        name: 'City Walking Tour',
        description: 'Explore historic downtown with local guide',
        price: 25,
        currency: 'GBP',
        duration: 180,
        location: {
          lat: 0,
          lng: 0,
          address: 'Old Town Square'
        },
        metadata: {
          category: 'sightseeing',
          rating: 4.8,
          outdoor: true,
          centralLocation: true,
          healthTips: ['Wear comfortable shoes', 'Bring water']
        }
      }
    ]
  }

  /**
   * Calculate preference match score
   */
  private static calculatePreferenceMatch(suggestion: any, preferences: any): number {
    let matchScore = 0
    let totalFactors = 0

    // Check interest matching
    if (suggestion.metadata?.categories && preferences.interests) {
      const matches = suggestion.metadata.categories.filter((cat: string) => 
        preferences.interests.includes(cat)
      ).length
      matchScore += matches / Math.max(suggestion.metadata.categories.length, 1)
      totalFactors++
    }

    // Check travel style matching
    if (suggestion.metadata?.style && preferences.travelStyle) {
      const styleMatch = preferences.travelStyle.includes(suggestion.metadata.style)
      matchScore += styleMatch ? 1 : 0
      totalFactors++
    }

    return totalFactors > 0 ? matchScore / totalFactors : 0.5
  }

  /**
   * Generate ranking reason
   */
  private static generateRankingReason(suggestion: any, score: number, type: string): string {
    const reasons = []

    if (suggestion.metadata?.rating >= 4.5) {
      reasons.push('Highly rated')
    }

    if (suggestion.price < suggestion.metadata?.averagePrice * 0.8) {
      reasons.push('Great value')
    }

    if (suggestion.metadata?.accessible) {
      reasons.push('Fully accessible')
    }

    if (suggestion.metadata?.sustainable) {
      reasons.push('Eco-friendly option')
    }

    return reasons.join(', ') || 'Good overall match'
  }

  /**
   * Estimate walking distance between locations
   */
  private static async estimateWalkingDistance(from: any, to: any): Promise<number> {
    // Simple estimation based on coordinates
    // In production, would use Google Maps Distance Matrix API
    return Math.random() * 1000 + 500 // 500-1500m
  }

  /**
   * Generate daily transport recommendations
   */
  private static generateDailyTransport(activities: any[], walkingDistance: number): any[] {
    const transport = []

    if (walkingDistance > 5000) {
      transport.push({
        from: 'Hotel',
        to: 'Activity Zone',
        method: 'Taxi/Uber',
        duration: 20,
        cost: 15
      })
    }

    return transport
  }

  /**
   * Generate health reminders
   */
  private static generateHealthReminders(
    context: ItineraryContext,
    walkingDistance: number,
    activityCount: number
  ): string[] {
    const reminders = []

    if (walkingDistance > 5000) {
      reminders.push('Today involves significant walking - stay hydrated and take breaks')
    }

    if (activityCount > 3) {
      reminders.push('Busy day ahead - remember to pace yourself')
    }

    if (context.healthProfile?.medicalConditions.includes('diabetes')) {
      reminders.push('Pack snacks and monitor blood sugar levels regularly')
    }

    return reminders
  }

  /**
   * Calculate total cost
   */
  private static calculateTotalCost(days: any[], flight: any, hotel: any): number {
    const dailyCosts = days.reduce((sum, day) => sum + day.totalCost, 0)
    const flightCost = flight?.price || 0
    const hotelCost = hotel?.price || 0
    return dailyCosts + flightCost + hotelCost
  }

  /**
   * Estimate carbon footprint
   */
  private static estimateCarbonFootprint(flight: any, days: any[]): number {
    // Simplified calculation
    const flightCarbon = flight?.metadata?.distance ? flight.metadata.distance * 0.09 : 500
    const dailyCarbon = days.length * 10 // 10kg per day average
    return flightCarbon + dailyCarbon
  }

  /**
   * Generate warnings
   */
  private static generateWarnings(
    context: ItineraryContext,
    days: any[],
    botResponses: Map<string, BotResponse>
  ): string[] {
    const warnings = []

    // Check bot confidence
    botResponses.forEach((response, type) => {
      if (response.confidence < 0.7) {
        warnings.push(`Limited ${type} options available - consider flexibility`)
      }
    })

    // Weather warnings
    if (context.destination.includes('tropical')) {
      warnings.push('Rainy season possible - pack appropriate clothing')
    }

    return warnings
  }

  /**
   * Generate suggestions
   */
  private static generateSuggestions(
    context: ItineraryContext,
    days: any[],
    activities: any[]
  ): string[] {
    const suggestions = []

    if (context.preferences.pacePreference === 'slow') {
      suggestions.push('Consider booking spa treatments for relaxation')
    }

    if (activities.some(a => a.metadata?.outdoor)) {
      suggestions.push('Check weather forecast and pack accordingly')
    }

    return suggestions
  }

  /**
   * Generate alternative options
   */
  private static generateAlternatives(botResponses: Map<string, BotResponse>): any[] {
    const alternatives = []

    botResponses.forEach((response, type) => {
      if (response.suggestions.length > 1) {
        alternatives.push({
          type,
          options: response.suggestions.slice(1, 4) // Next 3 best options
        })
      }
    })

    return alternatives
  }

  /**
   * Analyze user patterns from feedback
   */
  private static analyzeUserPatterns(feedback: any[]): any {
    const patterns = {
      preferredStartTime: null,
      avoidedActivityTypes: [],
      preferredActivityTypes: [],
      averageRating: 0
    }

    // Analyze feedback patterns
    const acceptedActivities = feedback.filter(f => f.accepted && f.itemType === 'activity')
    const rejectedActivities = feedback.filter(f => !f.accepted && f.itemType === 'activity')

    // Find preferred start times
    // This would analyze actual data from feedback

    return patterns
  }

  /**
   * Add minutes to time string
   */
  private static addMinutesToTime(time: string, minutes: number): string {
    const [hours, mins] = time.split(':').map(Number)
    const totalMinutes = hours * 60 + mins + minutes
    const newHours = Math.floor(totalMinutes / 60) % 24
    const newMins = totalMinutes % 60
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`
  }

  /**
   * Optimize itinerary based on validation errors
   */
  private static async optimizeItinerary(
    itinerary: MergedItinerary,
    context: ItineraryContext,
    errors: string[]
  ): Promise<MergedItinerary> {
    const optimized = { ...itinerary }

    // If over budget, remove lowest-scored activities
    if (errors.some(e => e.includes('exceeds budget'))) {
      const allActivities = optimized.days.flatMap(d => d.activities)
        .filter(a => a.type === 'activity')
        .sort((a, b) => (a.metadata?.score || 0) - (b.metadata?.score || 0))

      let removed = 0
      while (optimized.summary.totalCost > context.budget.total && removed < allActivities.length) {
        const toRemove = allActivities[removed]
        optimized.days.forEach(day => {
          day.activities = day.activities.filter(a => a.id !== toRemove.id)
        })
        optimized.summary.totalCost -= toRemove.price
        removed++
      }
    }

    return optimized
  }

  /**
   * Store itinerary in database
   */
  private static async storeItinerary(itinerary: MergedItinerary, context: ItineraryContext): Promise<void> {
    try {
      // Create or update trip
      const trip = await prisma.trip.upsert({
        where: {
          id: context.tripId || 'new'
        },
        update: {
          destination: context.destination,
          startDate: context.startDate,
          endDate: context.endDate,
          totalCost: new prisma.Prisma.Decimal(itinerary.summary.totalCost),
          status: 'planned',
          metadata: itinerary as any
        },
        create: {
          userId: context.userId,
          destination: context.destination,
          startDate: context.startDate,
          endDate: context.endDate,
          totalCost: new prisma.Prisma.Decimal(itinerary.summary.totalCost),
          status: 'planned',
          metadata: itinerary as any
        }
      })

      // Store activities
      for (const day of itinerary.days) {
        for (const activity of day.activities) {
          await prisma.activity.create({
            data: {
              tripId: trip.id,
              name: activity.name,
              type: activity.type,
              date: day.date,
              time: activity.startTime,
              duration: activity.duration,
              location: activity.location?.address || '',
              description: activity.notes,
              price: new prisma.Prisma.Decimal(activity.price),
              coordinates: activity.location,
              healthTip: activity.healthTips?.join(', '),
              accessibility: activity.accessibilityInfo
            }
          })
        }
      }
    } catch (error) {
      console.error('AIOrchestrationService: Error storing itinerary:', error)
    }
  }

  /**
   * Notify user about itinerary completion
   */
  private static async notifyUser(userId: string, itinerary: MergedItinerary): Promise<void> {
    await NotificationService.sendNotification({
      userId,
      type: 'trip_update',
      title: `Your trip to ${itinerary.summary.destination} is ready!`,
      message: `We've created an amazing ${itinerary.summary.duration}-day itinerary with ${itinerary.summary.totalActivities} activities. Total cost: £${itinerary.summary.totalCost}`,
      channels: ['in_app', 'email', 'push'],
      priority: 'high',
      data: {
        tripId: itinerary.id,
        destination: itinerary.summary.destination,
        startDate: itinerary.days[0].date,
        totalCost: itinerary.summary.totalCost
      }
    })
  }

  /**
   * Start queue processor for handling multiple requests
   */
  private static startQueueProcessor(): void {
    setInterval(() => {
      this.processQueue()
    }, 1000) // Process queue every second
  }

  /**
   * Process orchestration queue
   */
  private static async processQueue(): Promise<void> {
    if (this.orchestrationQueue.size === 0) return

    const batch = []
    const maxBatchSize = 5

    // Get items from queue
    for (const [key, value] of this.orchestrationQueue.entries()) {
      if (batch.length >= maxBatchSize) break
      batch.push({ key, ...value })
      this.orchestrationQueue.delete(key)
    }

    // Process batch in parallel
    await Promise.all(batch.map(item => 
      this.generateItinerary(item.context)
        .then(result => item.resolve(result))
        .catch(error => item.reject(error))
    ))
  }

  /**
   * Queue itinerary generation request
   */
  static async queueItineraryGeneration(context: ItineraryContext): Promise<MergedItinerary> {
    return new Promise((resolve, reject) => {
      const queueId = `queue-${Date.now()}-${Math.random()}`
      this.orchestrationQueue.set(queueId, {
        context,
        resolve,
        reject,
        timestamp: Date.now()
      })
    })
  }

  /**
   * Get bot status and metrics
   */
  static getBotStatus(): any {
    const status = {}
    
    this.botInstances.forEach((bot, type) => {
      status[type] = {
        id: bot.id,
        status: bot.status,
        requestCount: bot.requestCount,
        successRate: `${bot.successRate.toFixed(1)}%`,
        averageResponseTime: `${bot.averageResponseTime.toFixed(0)}ms`,
        cacheSize: bot.cache.size
      }
    })

    return {
      bots: status,
      queueSize: this.orchestrationQueue.size,
      totalRequests: Array.from(this.botInstances.values()).reduce((sum, bot) => sum + bot.requestCount, 0)
    }
  }

  /**
   * Clear bot caches
   */
  static clearCaches(): void {
    this.botInstances.forEach(bot => {
      bot.cache.clear()
    })
    console.log('AIOrchestrationService: All bot caches cleared')
  }
}

// Initialize on module load
AIOrchestrationService.initialize()