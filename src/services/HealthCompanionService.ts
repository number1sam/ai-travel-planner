import { prisma } from '@/lib/prisma'
import { NotificationService } from './NotificationService'
import { AIOrchestrationService } from './AIOrchestrationService'
import OpenAI from 'openai'

export interface WearableDevice {
  id: string
  type: 'fitbit' | 'apple_watch' | 'garmin' | 'google_fit' | 'whoop' | 'oura'
  userId: string
  deviceId: string
  deviceName: string
  connected: boolean
  lastSync: Date
  accessToken?: string
  refreshToken?: string
  permissions: string[]
}

export interface HealthMetrics {
  userId: string
  date: Date
  steps: number
  distance: number // meters
  activeMinutes: number
  calories: number
  heartRate: {
    resting: number
    average: number
    max: number
    zones: {
      cardio: number // minutes
      fatBurn: number
      peak: number
    }
  }
  sleep: {
    duration: number // minutes
    quality: number // 0-100
    stages: {
      rem: number
      light: number
      deep: number
      awake: number
    }
  }
  stress: number // 0-100
  hydration: number // glasses
  weight?: number
  bloodPressure?: {
    systolic: number
    diastolic: number
  }
  bloodOxygen?: number // SpO2 percentage
  temperature?: number
  menstrualCycle?: {
    phase: string
    dayOfCycle: number
  }
}

export interface HealthInsight {
  id: string
  userId: string
  type: 'achievement' | 'warning' | 'suggestion' | 'trend' | 'milestone'
  title: string
  description: string
  importance: 'low' | 'medium' | 'high' | 'critical'
  category: 'fitness' | 'sleep' | 'nutrition' | 'stress' | 'general'
  data?: any
  actionable: boolean
  actions?: Array<{
    label: string
    action: string
    data?: any
  }>
  createdAt: Date
  expiresAt?: Date
}

export interface TravelHealthRecommendation {
  tripId: string
  userId: string
  recommendations: Array<{
    category: 'pre_travel' | 'during_travel' | 'post_travel'
    type: 'fitness' | 'sleep' | 'nutrition' | 'medical' | 'safety'
    title: string
    description: string
    priority: 'low' | 'medium' | 'high'
    timeline: string // e.g., "2 weeks before", "daily during trip"
    reminders: boolean
  }>
  vaccinations?: Array<{
    name: string
    required: boolean
    recommended: boolean
    timeline: string
  }>
  medications?: Array<{
    name: string
    purpose: string
    instructions: string
  }>
  fitnessGoals: {
    preTrip: {
      targetSteps: number
      targetActiveMinutes: number
      exercises: string[]
    }
    duringTrip: {
      dailySteps: number
      activityLevel: string
    }
  }
  emergencyContacts: Array<{
    location: string
    hospital: string
    phone: string
    address: string
  }>
}

export class HealthCompanionService {
  private static openai: OpenAI
  private static deviceHandlers: Map<string, any> = new Map()
  private static syncIntervals: Map<string, NodeJS.Timeout> = new Map()
  
  // Health thresholds and targets
  private static readonly HEALTH_THRESHOLDS = {
    steps: {
      sedentary: 3000,
      lightlyActive: 6000,
      active: 10000,
      veryActive: 15000
    },
    heartRate: {
      resting: { low: 40, normal: 60, high: 100 },
      active: { low: 50, moderate: 120, vigorous: 150, max: 200 }
    },
    sleep: {
      minimum: 420, // 7 hours
      optimal: 480, // 8 hours
      quality: { poor: 60, fair: 70, good: 80, excellent: 90 }
    },
    hydration: {
      minimum: 6,
      optimal: 8,
      active: 10
    },
    stress: {
      low: 30,
      moderate: 60,
      high: 80
    }
  }

  // AI prompts for health insights
  private static readonly AI_PROMPTS = {
    dailyInsight: `Analyze the following health metrics and provide personalized insights:
    {metrics}
    
    Consider:
    - Overall health trends
    - Areas of improvement
    - Achievements to celebrate
    - Actionable recommendations
    
    Format as JSON with insights array.`,
    
    travelReadiness: `Assess travel readiness based on health metrics:
    {metrics}
    Trip details: {tripDetails}
    
    Evaluate:
    - Physical fitness for planned activities
    - Sleep pattern stability
    - Stress levels
    - Overall health status
    
    Provide readiness score (0-100) and recommendations.`,
    
    activityRecommendation: `Recommend activities based on current health state:
    Current metrics: {metrics}
    Location: {location}
    Preferences: {preferences}
    
    Suggest:
    - Appropriate exercise intensity
    - Best time for activities
    - Recovery recommendations
    - Hydration and nutrition tips`
  }

  /**
   * Initialize Health Companion Service
   */
  static initialize(): void {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })

    // Initialize device handlers
    this.initializeDeviceHandlers()

    // Start health monitoring
    this.startHealthMonitoring()

    console.log('HealthCompanionService: Initialized with AI health companion')
  }

  /**
   * Initialize device-specific handlers
   */
  private static initializeDeviceHandlers(): void {
    // Fitbit handler
    this.deviceHandlers.set('fitbit', {
      sync: this.syncFitbitData,
      authorize: this.authorizeFitbit,
      refresh: this.refreshFitbitToken
    })

    // Apple Health handler
    this.deviceHandlers.set('apple_watch', {
      sync: this.syncAppleHealthData,
      authorize: this.authorizeAppleHealth,
      refresh: null // Uses device authentication
    })

    // Garmin handler
    this.deviceHandlers.set('garmin', {
      sync: this.syncGarminData,
      authorize: this.authorizeGarmin,
      refresh: this.refreshGarminToken
    })

    // Add other device handlers...
  }

  /**
   * Connect a wearable device
   */
  static async connectDevice(
    userId: string,
    deviceType: string,
    authCode?: string
  ): Promise<WearableDevice> {
    console.log(`HealthCompanionService: Connecting ${deviceType} for user ${userId}`)

    try {
      const handler = this.deviceHandlers.get(deviceType)
      if (!handler) {
        throw new Error(`Unsupported device type: ${deviceType}`)
      }

      // Authorize device
      const authResult = await handler.authorize(authCode)

      // Store device connection
      const device: WearableDevice = {
        id: `device-${Date.now()}`,
        type: deviceType as any,
        userId,
        deviceId: authResult.deviceId,
        deviceName: authResult.deviceName,
        connected: true,
        lastSync: new Date(),
        accessToken: authResult.accessToken,
        refreshToken: authResult.refreshToken,
        permissions: authResult.permissions || ['activity', 'sleep', 'heart_rate']
      }

      // Save to database
      await this.saveDeviceConnection(device)

      // Start syncing
      await this.startDeviceSync(device)

      // Send notification
      await NotificationService.sendNotification({
        userId,
        type: 'system_alert',
        title: `${deviceType} Connected Successfully`,
        message: `Your ${deviceType} is now syncing health data. You'll receive personalized insights based on your activity.`,
        channels: ['in_app', 'push'],
        priority: 'medium'
      })

      return device
    } catch (error) {
      console.error(`HealthCompanionService: Error connecting ${deviceType}:`, error)
      throw error
    }
  }

  /**
   * Sync data from all connected devices
   */
  static async syncUserDevices(userId: string): Promise<HealthMetrics> {
    console.log(`HealthCompanionService: Syncing devices for user ${userId}`)

    try {
      // Get connected devices
      const devices = await this.getUserDevices(userId)
      
      if (devices.length === 0) {
        throw new Error('No connected devices')
      }

      // Sync each device
      const syncPromises = devices.map(device => this.syncDevice(device))
      const results = await Promise.allSettled(syncPromises)

      // Merge data from all devices
      const mergedMetrics = this.mergeHealthData(results, userId)

      // Store merged metrics
      await this.storeHealthMetrics(mergedMetrics)

      // Generate AI insights
      await this.generateHealthInsights(userId, mergedMetrics)

      return mergedMetrics
    } catch (error) {
      console.error('HealthCompanionService: Error syncing devices:', error)
      throw error
    }
  }

  /**
   * Sync individual device
   */
  private static async syncDevice(device: WearableDevice): Promise<Partial<HealthMetrics>> {
    const handler = this.deviceHandlers.get(device.type)
    if (!handler) {
      throw new Error(`No handler for device type: ${device.type}`)
    }

    try {
      // Refresh token if needed
      if (handler.refresh && this.isTokenExpired(device)) {
        const newTokens = await handler.refresh(device.refreshToken)
        device.accessToken = newTokens.accessToken
        device.refreshToken = newTokens.refreshToken
        await this.updateDeviceTokens(device)
      }

      // Sync data
      const data = await handler.sync(device)
      
      // Update last sync time
      device.lastSync = new Date()
      await this.updateDeviceSync(device)

      return data
    } catch (error) {
      console.error(`HealthCompanionService: Error syncing ${device.type}:`, error)
      
      // Mark device as disconnected if auth failed
      if (error.message.includes('401') || error.message.includes('auth')) {
        device.connected = false
        await this.updateDeviceStatus(device)
      }
      
      throw error
    }
  }

  /**
   * Generate AI-powered health insights
   */
  static async generateHealthInsights(
    userId: string,
    metrics: HealthMetrics
  ): Promise<HealthInsight[]> {
    console.log(`HealthCompanionService: Generating insights for user ${userId}`)

    try {
      const insights: HealthInsight[] = []

      // Get user's health history
      const history = await this.getHealthHistory(userId, 30) // Last 30 days

      // Analyze with AI
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a personal health AI companion. Provide actionable, encouraging health insights based on wearable data.'
          },
          {
            role: 'user',
            content: this.AI_PROMPTS.dailyInsight.replace(
              '{metrics}',
              JSON.stringify({ current: metrics, history })
            )
          }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      })

      const aiInsights = JSON.parse(completion.choices[0].message.content || '{"insights": []}')

      // Process AI insights
      for (const insight of aiInsights.insights) {
        insights.push({
          id: `insight-${Date.now()}-${Math.random()}`,
          userId,
          type: this.categorizeInsight(insight),
          title: insight.title,
          description: insight.description,
          importance: insight.importance || 'medium',
          category: insight.category || 'general',
          data: insight.data,
          actionable: insight.actions?.length > 0,
          actions: insight.actions,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        })
      }

      // Add rule-based insights
      insights.push(...this.generateRuleBasedInsights(metrics, history))

      // Store insights
      await this.storeInsights(insights)

      // Send important notifications
      const importantInsights = insights.filter(i => i.importance === 'high' || i.importance === 'critical')
      for (const insight of importantInsights) {
        await NotificationService.sendNotification({
          userId,
          type: 'health_reminder',
          title: insight.title,
          message: insight.description,
          channels: ['in_app', 'push'],
          priority: insight.importance === 'critical' ? 'urgent' : 'high',
          data: { insightId: insight.id }
        })
      }

      return insights
    } catch (error) {
      console.error('HealthCompanionService: Error generating insights:', error)
      return []
    }
  }

  /**
   * Generate travel health recommendations
   */
  static async generateTravelHealthRecommendations(
    userId: string,
    tripId: string
  ): Promise<TravelHealthRecommendation> {
    console.log(`HealthCompanionService: Generating travel health recommendations for trip ${tripId}`)

    try {
      // Get trip details
      const trip = await prisma.trip.findUnique({
        where: { id: tripId },
        include: { activities: true }
      })

      if (!trip) throw new Error('Trip not found')

      // Get user's health profile
      const healthProfile = await this.getUserHealthProfile(userId)

      // Get destination health requirements
      const destinationHealth = await this.getDestinationHealthInfo(trip.destination)

      // Generate AI recommendations
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a travel health expert. Provide comprehensive health recommendations for travelers.'
          },
          {
            role: 'user',
            content: this.AI_PROMPTS.travelReadiness.replace(
              '{metrics}',
              JSON.stringify(healthProfile)
            ).replace(
              '{tripDetails}',
              JSON.stringify({
                destination: trip.destination,
                duration: Math.ceil((trip.endDate.getTime() - trip.startDate.getTime()) / (1000 * 60 * 60 * 24)),
                activities: trip.activities.map(a => ({ name: a.name, type: a.type }))
              })
            )
          }
        ],
        temperature: 0.6
      })

      const aiRecommendations = JSON.parse(completion.choices[0].message.content || '{}')

      // Build comprehensive recommendations
      const recommendations: TravelHealthRecommendation = {
        tripId,
        userId,
        recommendations: [
          // Pre-travel fitness preparation
          {
            category: 'pre_travel',
            type: 'fitness',
            title: 'Build Your Travel Fitness',
            description: `Based on your planned activities, aim for ${aiRecommendations.targetSteps || 8000} daily steps and ${aiRecommendations.targetActiveMinutes || 30} active minutes before your trip.`,
            priority: 'medium',
            timeline: '2 weeks before departure',
            reminders: true
          },
          // Sleep optimization
          {
            category: 'pre_travel',
            type: 'sleep',
            title: 'Optimize Sleep Schedule',
            description: trip.destination.includes('timezone') ? 
              'Start adjusting your sleep schedule 1 hour per day towards destination timezone' :
              'Maintain consistent sleep schedule of 7-8 hours',
            priority: 'medium',
            timeline: '1 week before departure',
            reminders: true
          },
          // During travel hydration
          {
            category: 'during_travel',
            type: 'nutrition',
            title: 'Stay Hydrated',
            description: 'Drink at least 8 glasses of water daily, increase to 10-12 on active days',
            priority: 'high',
            timeline: 'Daily during trip',
            reminders: true
          },
          // Activity pacing
          {
            category: 'during_travel',
            type: 'fitness',
            title: 'Pace Your Activities',
            description: `Your fitness level suggests ${healthProfile.fitnessLevel} activity tolerance. Take breaks every ${healthProfile.fitnessLevel === 'high' ? '2-3 hours' : '1-2 hours'}`,
            priority: 'medium',
            timeline: 'Daily during trip',
            reminders: false
          },
          // Post-travel recovery
          {
            category: 'post_travel',
            type: 'general',
            title: 'Recovery Period',
            description: 'Allow 2-3 days of lighter activity after returning to recover from travel fatigue',
            priority: 'low',
            timeline: 'First week after return',
            reminders: false
          }
        ],
        vaccinations: destinationHealth.vaccinations || [],
        medications: this.generateMedicationList(healthProfile, destinationHealth),
        fitnessGoals: {
          preTrip: {
            targetSteps: aiRecommendations.targetSteps || 8000,
            targetActiveMinutes: aiRecommendations.targetActiveMinutes || 30,
            exercises: this.recommendExercises(trip.activities, healthProfile)
          },
          duringTrip: {
            dailySteps: aiRecommendations.tripDailySteps || 10000,
            activityLevel: aiRecommendations.activityLevel || 'moderate'
          }
        },
        emergencyContacts: destinationHealth.emergencyContacts || []
      }

      // Store recommendations
      await this.storeTravelHealthRecommendations(recommendations)

      // Schedule reminders
      await this.scheduleTravelHealthReminders(recommendations)

      return recommendations
    } catch (error) {
      console.error('HealthCompanionService: Error generating travel recommendations:', error)
      throw error
    }
  }

  /**
   * Real-time activity tracking during trip
   */
  static async trackTripActivity(
    userId: string,
    tripId: string,
    activityId: string
  ): Promise<any> {
    console.log(`HealthCompanionService: Tracking activity ${activityId} for trip ${tripId}`)

    try {
      // Get current metrics
      const currentMetrics = await this.getCurrentMetrics(userId)

      // Get activity details
      const activity = await prisma.activity.findUnique({
        where: { id: activityId }
      })

      if (!activity) throw new Error('Activity not found')

      // Monitor health during activity
      const monitoring = {
        activityId,
        startTime: new Date(),
        startMetrics: {
          heartRate: currentMetrics.heartRate.average,
          steps: currentMetrics.steps,
          stress: currentMetrics.stress
        },
        recommendations: []
      }

      // Generate real-time recommendations
      if (currentMetrics.heartRate.average > 160) {
        monitoring.recommendations.push({
          type: 'warning',
          message: 'Heart rate is elevated. Consider taking a break.',
          priority: 'high'
        })
      }

      if (currentMetrics.stress > 70) {
        monitoring.recommendations.push({
          type: 'suggestion',
          message: 'Stress levels are high. Try some deep breathing exercises.',
          priority: 'medium'
        })
      }

      // Calculate activity intensity
      const intensity = this.calculateActivityIntensity(
        activity.type,
        currentMetrics,
        activity.duration
      )

      monitoring.recommendations.push({
        type: 'info',
        message: `This ${intensity} intensity activity will burn approximately ${Math.round(intensity === 'high' ? activity.duration * 8 : intensity === 'moderate' ? activity.duration * 5 : activity.duration * 3)} calories`,
        priority: 'low'
      })

      // Send real-time updates if needed
      if (monitoring.recommendations.some(r => r.priority === 'high')) {
        await NotificationService.sendNotification({
          userId,
          type: 'health_reminder',
          title: 'Health Alert During Activity',
          message: monitoring.recommendations[0].message,
          channels: ['push'],
          priority: 'high'
        })
      }

      return monitoring
    } catch (error) {
      console.error('HealthCompanionService: Error tracking activity:', error)
      throw error
    }
  }

  /**
   * Post-trip health analysis
   */
  static async analyzePostTripHealth(
    userId: string,
    tripId: string
  ): Promise<any> {
    console.log(`HealthCompanionService: Analyzing post-trip health for trip ${tripId}`)

    try {
      // Get trip dates
      const trip = await prisma.trip.findUnique({
        where: { id: tripId }
      })

      if (!trip) throw new Error('Trip not found')

      // Get health metrics during trip
      const tripMetrics = await this.getHealthMetricsBetweenDates(
        userId,
        trip.startDate,
        trip.endDate
      )

      // Get baseline metrics (30 days before trip)
      const baselineStart = new Date(trip.startDate)
      baselineStart.setDate(baselineStart.getDate() - 30)
      const baselineMetrics = await this.getHealthMetricsBetweenDates(
        userId,
        baselineStart,
        trip.startDate
      )

      // Analyze changes
      const analysis = {
        tripId,
        userId,
        summary: {
          totalSteps: tripMetrics.reduce((sum, m) => sum + m.steps, 0),
          averageStepsPerDay: Math.round(tripMetrics.reduce((sum, m) => sum + m.steps, 0) / tripMetrics.length),
          totalActiveMinutes: tripMetrics.reduce((sum, m) => sum + m.activeMinutes, 0),
          averageSleepQuality: Math.round(tripMetrics.reduce((sum, m) => sum + m.sleep.quality, 0) / tripMetrics.length),
          stressLevel: Math.round(tripMetrics.reduce((sum, m) => sum + m.stress, 0) / tripMetrics.length)
        },
        comparison: {
          stepsChange: this.calculatePercentageChange(
            baselineMetrics.reduce((sum, m) => sum + m.steps, 0) / baselineMetrics.length,
            tripMetrics.reduce((sum, m) => sum + m.steps, 0) / tripMetrics.length
          ),
          sleepChange: this.calculatePercentageChange(
            baselineMetrics.reduce((sum, m) => sum + m.sleep.duration, 0) / baselineMetrics.length,
            tripMetrics.reduce((sum, m) => sum + m.sleep.duration, 0) / tripMetrics.length
          ),
          stressChange: this.calculatePercentageChange(
            baselineMetrics.reduce((sum, m) => sum + m.stress, 0) / baselineMetrics.length,
            tripMetrics.reduce((sum, m) => sum + m.stress, 0) / tripMetrics.length
          )
        },
        insights: [],
        recommendations: []
      }

      // Generate AI insights about the trip's health impact
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a health analyst specializing in travel wellness. Analyze the health impact of travel and provide insights.'
          },
          {
            role: 'user',
            content: `Analyze this trip's health impact:
            Trip to: ${trip.destination}
            Duration: ${tripMetrics.length} days
            
            Health Summary:
            ${JSON.stringify(analysis.summary)}
            
            Changes from baseline:
            ${JSON.stringify(analysis.comparison)}
            
            Provide:
            1. Key health insights from the trip
            2. Positive impacts
            3. Areas of concern
            4. Recovery recommendations`
          }
        ],
        temperature: 0.7
      })

      const aiAnalysis = JSON.parse(completion.choices[0].message.content || '{}')
      analysis.insights = aiAnalysis.insights || []
      analysis.recommendations = aiAnalysis.recommendations || []

      // Add specific insights based on data
      if (analysis.comparison.stepsChange > 50) {
        analysis.insights.push({
          type: 'achievement',
          title: 'Activity Superstar!',
          description: `You increased your daily steps by ${analysis.comparison.stepsChange}% during your trip!`
        })
      }

      if (analysis.comparison.sleepChange < -20) {
        analysis.recommendations.push({
          type: 'recovery',
          title: 'Focus on Sleep Recovery',
          description: 'Your sleep was disrupted during travel. Aim for 8-9 hours for the next week.'
        })
      }

      // Store analysis
      await this.storePostTripAnalysis(analysis)

      // Send summary notification
      await NotificationService.sendNotification({
        userId,
        type: 'health_reminder',
        title: 'Your Trip Health Summary is Ready!',
        message: `See how your ${trip.destination} trip impacted your health and get personalized recovery tips.`,
        channels: ['in_app', 'email'],
        priority: 'medium',
        data: { tripId, analysisId: analysis.id }
      })

      return analysis
    } catch (error) {
      console.error('HealthCompanionService: Error analyzing post-trip health:', error)
      throw error
    }
  }

  /**
   * Device-specific sync methods
   */
  private static async syncFitbitData(device: WearableDevice): Promise<Partial<HealthMetrics>> {
    // This would make actual API calls to Fitbit
    // For now, returning mock data
    return {
      date: new Date(),
      steps: Math.floor(Math.random() * 5000) + 5000,
      distance: Math.floor(Math.random() * 3000) + 3000,
      activeMinutes: Math.floor(Math.random() * 30) + 15,
      calories: Math.floor(Math.random() * 500) + 1500,
      heartRate: {
        resting: Math.floor(Math.random() * 20) + 60,
        average: Math.floor(Math.random() * 30) + 70,
        max: Math.floor(Math.random() * 50) + 120,
        zones: {
          cardio: Math.floor(Math.random() * 20),
          fatBurn: Math.floor(Math.random() * 40),
          peak: Math.floor(Math.random() * 10)
        }
      },
      sleep: {
        duration: Math.floor(Math.random() * 120) + 360, // 6-8 hours
        quality: Math.floor(Math.random() * 30) + 70,
        stages: {
          rem: Math.floor(Math.random() * 60) + 60,
          light: Math.floor(Math.random() * 120) + 180,
          deep: Math.floor(Math.random() * 60) + 60,
          awake: Math.floor(Math.random() * 30) + 30
        }
      },
      stress: Math.floor(Math.random() * 40) + 30,
      hydration: Math.floor(Math.random() * 4) + 6
    }
  }

  private static async syncAppleHealthData(device: WearableDevice): Promise<Partial<HealthMetrics>> {
    // Apple Health sync implementation
    return this.syncFitbitData(device) // Mock for now
  }

  private static async syncGarminData(device: WearableDevice): Promise<Partial<HealthMetrics>> {
    // Garmin sync implementation
    return this.syncFitbitData(device) // Mock for now
  }

  /**
   * Authorization methods
   */
  private static async authorizeFitbit(authCode: string): Promise<any> {
    // This would exchange auth code for tokens with Fitbit API
    return {
      deviceId: 'fitbit-' + Date.now(),
      deviceName: 'Fitbit Charge 5',
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      permissions: ['activity', 'sleep', 'heart_rate', 'weight', 'nutrition']
    }
  }

  private static async authorizeAppleHealth(authCode: string): Promise<any> {
    return {
      deviceId: 'apple-' + Date.now(),
      deviceName: 'Apple Watch Series 8',
      accessToken: 'device-based-auth',
      refreshToken: null,
      permissions: ['activity', 'sleep', 'heart_rate', 'workouts']
    }
  }

  private static async authorizeGarmin(authCode: string): Promise<any> {
    return {
      deviceId: 'garmin-' + Date.now(),
      deviceName: 'Garmin Forerunner 955',
      accessToken: 'mock-garmin-token',
      refreshToken: 'mock-garmin-refresh',
      permissions: ['activity', 'sleep', 'heart_rate', 'stress', 'body_battery']
    }
  }

  /**
   * Token refresh methods
   */
  private static async refreshFitbitToken(refreshToken: string): Promise<any> {
    // This would refresh tokens with Fitbit API
    return {
      accessToken: 'new-mock-access-token',
      refreshToken: 'new-mock-refresh-token'
    }
  }

  private static async refreshGarminToken(refreshToken: string): Promise<any> {
    return {
      accessToken: 'new-mock-garmin-token',
      refreshToken: 'new-mock-garmin-refresh'
    }
  }

  /**
   * Helper methods
   */
  private static isTokenExpired(device: WearableDevice): boolean {
    // Check if token needs refresh (simplified)
    const hoursSinceSync = (Date.now() - device.lastSync.getTime()) / (1000 * 60 * 60)
    return hoursSinceSync > 1
  }

  private static async getUserDevices(userId: string): Promise<WearableDevice[]> {
    // This would fetch from database
    // For now, returning mock data
    return []
  }

  private static mergeHealthData(
    results: PromiseSettledResult<Partial<HealthMetrics>>[],
    userId: string
  ): HealthMetrics {
    const merged: HealthMetrics = {
      userId,
      date: new Date(),
      steps: 0,
      distance: 0,
      activeMinutes: 0,
      calories: 0,
      heartRate: {
        resting: 0,
        average: 0,
        max: 0,
        zones: { cardio: 0, fatBurn: 0, peak: 0 }
      },
      sleep: {
        duration: 0,
        quality: 0,
        stages: { rem: 0, light: 0, deep: 0, awake: 0 }
      },
      stress: 0,
      hydration: 0
    }

    let successfulSyncs = 0

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        const data = result.value
        successfulSyncs++

        // Merge numeric values (take max for activity, average for vitals)
        merged.steps = Math.max(merged.steps, data.steps || 0)
        merged.distance = Math.max(merged.distance, data.distance || 0)
        merged.activeMinutes = Math.max(merged.activeMinutes, data.activeMinutes || 0)
        merged.calories = Math.max(merged.calories, data.calories || 0)

        if (data.heartRate) {
          merged.heartRate.resting = data.heartRate.resting || merged.heartRate.resting
          merged.heartRate.average = data.heartRate.average || merged.heartRate.average
          merged.heartRate.max = Math.max(merged.heartRate.max, data.heartRate.max || 0)
        }

        if (data.sleep && data.sleep.duration > merged.sleep.duration) {
          merged.sleep = data.sleep
        }

        if (data.stress) {
          merged.stress = data.stress
        }

        merged.hydration = Math.max(merged.hydration, data.hydration || 0)
      }
    }

    return merged
  }

  private static async storeHealthMetrics(metrics: HealthMetrics): Promise<void> {
    await prisma.healthMetric.create({
      data: {
        userId: metrics.userId,
        date: metrics.date,
        steps: metrics.steps,
        heartRate: metrics.heartRate.average,
        sleepHours: new prisma.Prisma.Decimal(metrics.sleep.duration / 60),
        hydration: metrics.hydration,
        syncedDevices: { sources: ['fitbit', 'apple_watch'] } // Track which devices contributed
      }
    })
  }

  private static async getHealthHistory(userId: string, days: number): Promise<HealthMetrics[]> {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const history = await prisma.healthMetric.findMany({
      where: {
        userId,
        date: { gte: startDate }
      },
      orderBy: { date: 'desc' }
    })

    // Convert to HealthMetrics format
    return history.map(h => ({
      userId: h.userId,
      date: h.date,
      steps: h.steps || 0,
      distance: 0,
      activeMinutes: 0,
      calories: 0,
      heartRate: {
        resting: 60,
        average: h.heartRate || 70,
        max: 120,
        zones: { cardio: 0, fatBurn: 0, peak: 0 }
      },
      sleep: {
        duration: h.sleepHours ? Number(h.sleepHours) * 60 : 420,
        quality: 75,
        stages: { rem: 90, light: 240, deep: 90, awake: 30 }
      },
      stress: 50,
      hydration: h.hydration || 6
    }))
  }

  private static categorizeInsight(insight: any): HealthInsight['type'] {
    if (insight.type) return insight.type

    const text = (insight.title + insight.description).toLowerCase()
    if (text.includes('achieve') || text.includes('goal') || text.includes('record')) {
      return 'achievement'
    } else if (text.includes('warning') || text.includes('concern') || text.includes('low')) {
      return 'warning'
    } else if (text.includes('trend') || text.includes('pattern')) {
      return 'trend'
    } else if (text.includes('milestone') || text.includes('reached')) {
      return 'milestone'
    }
    return 'suggestion'
  }

  private static generateRuleBasedInsights(
    metrics: HealthMetrics,
    history: HealthMetrics[]
  ): HealthInsight[] {
    const insights: HealthInsight[] = []

    // Step goal achievement
    if (metrics.steps >= this.HEALTH_THRESHOLDS.steps.active) {
      insights.push({
        id: `insight-steps-${Date.now()}`,
        userId: metrics.userId,
        type: 'achievement',
        title: 'Step Goal Achieved! 🎯',
        description: `You hit ${metrics.steps.toLocaleString()} steps today! Keep up the great work.`,
        importance: 'medium',
        category: 'fitness',
        actionable: false,
        createdAt: new Date()
      })
    }

    // Sleep quality check
    if (metrics.sleep.quality < this.HEALTH_THRESHOLDS.sleep.quality.fair) {
      insights.push({
        id: `insight-sleep-${Date.now()}`,
        userId: metrics.userId,
        type: 'warning',
        title: 'Sleep Quality Alert',
        description: 'Your sleep quality was below optimal. Try winding down earlier tonight.',
        importance: 'medium',
        category: 'sleep',
        actionable: true,
        actions: [
          { label: 'Sleep Tips', action: 'view_sleep_tips' },
          { label: 'Set Bedtime Reminder', action: 'set_reminder', data: { type: 'bedtime' } }
        ],
        createdAt: new Date()
      })
    }

    // Hydration reminder
    if (metrics.hydration < this.HEALTH_THRESHOLDS.hydration.minimum) {
      insights.push({
        id: `insight-hydration-${Date.now()}`,
        userId: metrics.userId,
        type: 'suggestion',
        title: 'Hydration Reminder 💧',
        description: `You've had ${metrics.hydration} glasses of water today. Aim for at least ${this.HEALTH_THRESHOLDS.hydration.optimal}.`,
        importance: 'low',
        category: 'nutrition',
        actionable: true,
        actions: [
          { label: 'Log Water', action: 'log_water' }
        ],
        createdAt: new Date()
      })
    }

    // Stress management
    if (metrics.stress > this.HEALTH_THRESHOLDS.stress.high) {
      insights.push({
        id: `insight-stress-${Date.now()}`,
        userId: metrics.userId,
        type: 'warning',
        title: 'High Stress Detected',
        description: 'Your stress levels are elevated. Consider taking a short break or trying a breathing exercise.',
        importance: 'high',
        category: 'stress',
        actionable: true,
        actions: [
          { label: 'Breathing Exercise', action: 'start_breathing' },
          { label: 'Quick Meditation', action: 'start_meditation' }
        ],
        createdAt: new Date()
      })
    }

    // Trend analysis
    if (history.length >= 7) {
      const weekAvgSteps = history.slice(0, 7).reduce((sum, m) => sum + m.steps, 0) / 7
      const previousWeekAvg = history.slice(7, 14).reduce((sum, m) => sum + m.steps, 0) / Math.min(7, history.length - 7)
      
      if (previousWeekAvg > 0) {
        const change = ((weekAvgSteps - previousWeekAvg) / previousWeekAvg) * 100
        if (Math.abs(change) > 20) {
          insights.push({
            id: `insight-trend-${Date.now()}`,
            userId: metrics.userId,
            type: 'trend',
            title: change > 0 ? 'Activity Trending Up! 📈' : 'Activity Decrease Detected 📉',
            description: `Your average daily steps ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change).toFixed(0)}% this week.`,
            importance: 'medium',
            category: 'fitness',
            data: { weekAvgSteps, previousWeekAvg, change },
            actionable: false,
            createdAt: new Date()
          })
        }
      }
    }

    return insights
  }

  private static async storeInsights(insights: HealthInsight[]): Promise<void> {
    // Store in database
    for (const insight of insights) {
      // This would save to a health_insights table
      console.log(`HealthCompanionService: Stored insight - ${insight.title}`)
    }
  }

  private static async getUserHealthProfile(userId: string): Promise<any> {
    const recentMetrics = await this.getHealthHistory(userId, 30)
    
    if (recentMetrics.length === 0) {
      return {
        fitnessLevel: 'medium',
        averageSteps: 7500,
        averageActiveMinutes: 30,
        sleepQuality: 75,
        stressLevel: 'moderate'
      }
    }

    const avgSteps = recentMetrics.reduce((sum, m) => sum + m.steps, 0) / recentMetrics.length
    const avgActive = recentMetrics.reduce((sum, m) => sum + m.activeMinutes, 0) / recentMetrics.length
    const avgSleep = recentMetrics.reduce((sum, m) => sum + m.sleep.quality, 0) / recentMetrics.length
    const avgStress = recentMetrics.reduce((sum, m) => sum + m.stress, 0) / recentMetrics.length

    return {
      fitnessLevel: avgSteps > 10000 ? 'high' : avgSteps > 6000 ? 'medium' : 'low',
      averageSteps: Math.round(avgSteps),
      averageActiveMinutes: Math.round(avgActive),
      sleepQuality: Math.round(avgSleep),
      stressLevel: avgStress > 70 ? 'high' : avgStress > 40 ? 'moderate' : 'low',
      history: recentMetrics
    }
  }

  private static async getDestinationHealthInfo(destination: string): Promise<any> {
    // This would fetch real destination health data from APIs
    // For now, returning mock data based on destination
    
    const tropical = destination.toLowerCase().includes('tropical') || 
                    destination.toLowerCase().includes('asia') ||
                    destination.toLowerCase().includes('africa')

    return {
      vaccinations: tropical ? [
        {
          name: 'Hepatitis A',
          required: false,
          recommended: true,
          timeline: '2 weeks before travel'
        },
        {
          name: 'Typhoid',
          required: false,
          recommended: true,
          timeline: '1 week before travel'
        }
      ] : [],
      healthRisks: tropical ? ['Malaria', 'Dengue'] : [],
      emergencyContacts: [
        {
          location: destination,
          hospital: 'International Hospital',
          phone: '+1-xxx-xxx-xxxx',
          address: 'Main Medical District'
        }
      ]
    }
  }

  private static generateMedicationList(profile: any, destinationInfo: any): any[] {
    const medications = []

    // Basic travel medications
    medications.push({
      name: 'Pain reliever (Ibuprofen/Acetaminophen)',
      purpose: 'General pain and fever',
      instructions: 'As directed on package'
    })

    medications.push({
      name: 'Anti-diarrheal medication',
      purpose: 'Traveler\'s diarrhea',
      instructions: 'As needed'
    })

    if (destinationInfo.healthRisks?.includes('Malaria')) {
      medications.push({
        name: 'Malaria prophylaxis',
        purpose: 'Malaria prevention',
        instructions: 'Start 1-2 days before travel, continue during and 7 days after'
      })
    }

    return medications
  }

  private static recommendExercises(activities: any[], profile: any): string[] {
    const exercises = ['Walking (30 minutes daily)']

    if (activities.some(a => a.type === 'hiking')) {
      exercises.push('Stair climbing', 'Leg strengthening exercises')
    }

    if (activities.some(a => a.type === 'swimming')) {
      exercises.push('Swimming or water aerobics')
    }

    if (profile.fitnessLevel === 'low') {
      exercises.push('Gentle stretching', 'Chair exercises')
    } else if (profile.fitnessLevel === 'high') {
      exercises.push('Interval training', 'Strength training')
    }

    return exercises
  }

  private static async storeTravelHealthRecommendations(recommendations: TravelHealthRecommendation): Promise<void> {
    // Store in database
    console.log(`HealthCompanionService: Stored travel health recommendations for trip ${recommendations.tripId}`)
  }

  private static async scheduleTravelHealthReminders(recommendations: TravelHealthRecommendation): Promise<void> {
    for (const rec of recommendations.recommendations) {
      if (rec.reminders) {
        // Schedule notification based on timeline
        console.log(`HealthCompanionService: Scheduled reminder for ${rec.title}`)
      }
    }
  }

  private static async getCurrentMetrics(userId: string): Promise<HealthMetrics> {
    // Get latest synced metrics
    const latest = await prisma.healthMetric.findFirst({
      where: { userId },
      orderBy: { date: 'desc' }
    })

    if (!latest) {
      // Return default metrics
      return {
        userId,
        date: new Date(),
        steps: 0,
        distance: 0,
        activeMinutes: 0,
        calories: 0,
        heartRate: { resting: 70, average: 75, max: 100, zones: { cardio: 0, fatBurn: 0, peak: 0 } },
        sleep: { duration: 420, quality: 70, stages: { rem: 90, light: 240, deep: 90, awake: 30 } },
        stress: 50,
        hydration: 6
      }
    }

    // Convert to full metrics
    return {
      userId,
      date: latest.date,
      steps: latest.steps || 0,
      distance: 0,
      activeMinutes: 0,
      calories: 0,
      heartRate: {
        resting: 70,
        average: latest.heartRate || 75,
        max: 100,
        zones: { cardio: 0, fatBurn: 0, peak: 0 }
      },
      sleep: {
        duration: latest.sleepHours ? Number(latest.sleepHours) * 60 : 420,
        quality: 70,
        stages: { rem: 90, light: 240, deep: 90, awake: 30 }
      },
      stress: 50,
      hydration: latest.hydration || 6
    }
  }

  private static calculateActivityIntensity(
    activityType: string,
    metrics: HealthMetrics,
    duration: number
  ): 'low' | 'moderate' | 'high' {
    // Calculate based on activity type and current heart rate
    const hrPercentage = (metrics.heartRate.average - metrics.heartRate.resting) / 
                        (180 - metrics.heartRate.resting) * 100

    if (activityType === 'sightseeing' || activityType === 'restaurant') {
      return 'low'
    } else if (activityType === 'wellness' || hrPercentage < 50) {
      return 'low'
    } else if (hrPercentage > 70 || duration > 180) {
      return 'high'
    }
    
    return 'moderate'
  }

  private static async getHealthMetricsBetweenDates(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<HealthMetrics[]> {
    const metrics = await prisma.healthMetric.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { date: 'asc' }
    })

    return metrics.map(m => ({
      userId: m.userId,
      date: m.date,
      steps: m.steps || 0,
      distance: 0,
      activeMinutes: 0,
      calories: 0,
      heartRate: {
        resting: 70,
        average: m.heartRate || 75,
        max: 100,
        zones: { cardio: 0, fatBurn: 0, peak: 0 }
      },
      sleep: {
        duration: m.sleepHours ? Number(m.sleepHours) * 60 : 420,
        quality: 70,
        stages: { rem: 90, light: 240, deep: 90, awake: 30 }
      },
      stress: 50,
      hydration: m.hydration || 6
    }))
  }

  private static calculatePercentageChange(baseline: number, current: number): number {
    if (baseline === 0) return 0
    return Math.round(((current - baseline) / baseline) * 100)
  }

  private static async storePostTripAnalysis(analysis: any): Promise<void> {
    // Store analysis in database
    console.log(`HealthCompanionService: Stored post-trip analysis for trip ${analysis.tripId}`)
  }

  private static async saveDeviceConnection(device: WearableDevice): Promise<void> {
    // Save to database
    console.log(`HealthCompanionService: Saved device connection for ${device.type}`)
  }

  private static async startDeviceSync(device: WearableDevice): Promise<void> {
    // Start periodic sync
    const interval = setInterval(async () => {
      try {
        await this.syncDevice(device)
      } catch (error) {
        console.error(`HealthCompanionService: Auto-sync failed for ${device.type}:`, error)
      }
    }, 60 * 60 * 1000) // Sync every hour

    this.syncIntervals.set(device.id, interval)
  }

  private static async updateDeviceTokens(device: WearableDevice): Promise<void> {
    // Update tokens in database
    console.log(`HealthCompanionService: Updated tokens for ${device.type}`)
  }

  private static async updateDeviceSync(device: WearableDevice): Promise<void> {
    // Update last sync time
    console.log(`HealthCompanionService: Updated sync time for ${device.type}`)
  }

  private static async updateDeviceStatus(device: WearableDevice): Promise<void> {
    // Update device status
    console.log(`HealthCompanionService: Updated status for ${device.type}`)
  }

  /**
   * Start health monitoring background tasks
   */
  private static startHealthMonitoring(): void {
    // Daily insight generation
    setInterval(async () => {
      try {
        const users = await prisma.user.findMany({
          where: { status: 'Active' }
        })

        for (const user of users) {
          await this.syncUserDevices(user.id).catch(console.error)
        }
      } catch (error) {
        console.error('HealthCompanionService: Daily sync error:', error)
      }
    }, 24 * 60 * 60 * 1000) // Daily

    console.log('HealthCompanionService: Started health monitoring tasks')
  }

  /**
   * Get health companion status
   */
  static getStatus(): any {
    return {
      connectedDevices: this.deviceHandlers.size,
      activeSyncs: this.syncIntervals.size,
      supportedDevices: Array.from(this.deviceHandlers.keys()),
      healthThresholds: this.HEALTH_THRESHOLDS
    }
  }
}

// Initialize on module load
HealthCompanionService.initialize()