import { prisma } from '@/lib/prisma'
import { AIOrchestrationService } from './AIOrchestrationService'
import { HealthCompanionService } from './HealthCompanionService'
import OpenAI from 'openai'
import { EventEmitter } from 'events'

export interface UserAssessmentQuestion {
  id: string
  category: 'travel_style' | 'preferences' | 'health' | 'budget' | 'personality' | 'experience'
  question: string
  type: 'single_choice' | 'multiple_choice' | 'scale' | 'text' | 'image_selection'
  options?: Array<{
    id: string
    label: string
    value: any
    imageUrl?: string
    description?: string
  }>
  weight: number // Importance in assessment (0-1)
  dependencies?: Array<{
    questionId: string
    answer: any
  }>
  metadata?: any
}

export interface UserAssessmentResponse {
  questionId: string
  answer: any
  timestamp: Date
  confidence?: number // How confident the user was (based on response time, changes)
  metadata?: any
}

export interface UserProfile {
  userId: string
  assessmentVersion: number
  completedAt: Date
  travelPersonality: {
    type: 'adventurer' | 'explorer' | 'relaxer' | 'culture_seeker' | 'luxury_traveler' | 'budget_backpacker'
    confidence: number
    traits: Array<{
      trait: string
      score: number // 0-100
    }>
  }
  preferences: {
    pacePreference: 'slow' | 'moderate' | 'fast'
    planningStyle: 'spontaneous' | 'balanced' | 'structured'
    socialPreference: 'solo' | 'couple' | 'group' | 'family'
    comfortLevel: 'basic' | 'standard' | 'comfort' | 'luxury'
    culturalInterest: number // 0-100
    adventureLevel: number // 0-100
    relaxationNeed: number // 0-100
  }
  behavioralPatterns: {
    bookingBehavior: {
      advanceBooking: number // days in advance
      priceFlexibility: number // 0-1
      loyaltyPreference: boolean
      lastMinuteDeals: boolean
    }
    activityPreferences: {
      morningPerson: boolean
      optimalActivityDuration: number // minutes
      restFrequency: number // breaks per day
      varietySeeking: number // 0-1
    }
    decisionMaking: {
      researchDepth: 'minimal' | 'moderate' | 'extensive'
      reviewImportance: number // 0-1
      brandSensitivity: number // 0-1
      peerInfluence: number // 0-1
    }
  }
  learningData: {
    interactions: number
    lastUpdated: Date
    confidenceScore: number // 0-100
    dataPoints: Array<{
      type: string
      value: any
      timestamp: Date
      source: string
    }>
  }
}

export interface BehavioralEvent {
  userId: string
  eventType: 'search' | 'view' | 'bookmark' | 'book' | 'cancel' | 'review' | 'share' | 'feedback'
  entityType: 'trip' | 'activity' | 'hotel' | 'flight' | 'restaurant'
  entityId: string
  timestamp: Date
  context: {
    device: string
    location?: string
    sessionId: string
    referrer?: string
  }
  metadata: any
}

export interface LearningInsight {
  userId: string
  insightType: 'preference_shift' | 'new_interest' | 'pattern_detected' | 'anomaly' | 'milestone'
  title: string
  description: string
  confidence: number
  impact: 'low' | 'medium' | 'high'
  actionable: boolean
  recommendations?: string[]
  data: any
  createdAt: Date
  expiresAt?: Date
}

export class UserAssessmentService extends EventEmitter {
  private static instance: UserAssessmentService
  private openai: OpenAI
  private assessmentQuestions: Map<string, UserAssessmentQuestion> = new Map()
  private userProfiles: Map<string, UserProfile> = new Map()
  private eventBuffer: Map<string, BehavioralEvent[]> = new Map()
  private learningModels: Map<string, any> = new Map()
  
  // Assessment configuration
  private static readonly ASSESSMENT_CONFIG = {
    minQuestions: 15,
    maxQuestions: 30,
    adaptiveThreshold: 0.8, // Confidence threshold for early completion
    questionTimeout: 60000, // 1 minute per question
    retakeInterval: 90 * 24 * 60 * 60 * 1000 // 90 days
  }

  // Core assessment questions
  private static readonly CORE_QUESTIONS: UserAssessmentQuestion[] = [
    // Travel Style Questions
    {
      id: 'q1',
      category: 'travel_style',
      question: 'Which image best represents your ideal vacation?',
      type: 'image_selection',
      options: [
        {
          id: 'adventurous',
          label: 'Mountain Adventure',
          value: 'adventure',
          imageUrl: '/images/assessment/mountain-adventure.jpg',
          description: 'Hiking, climbing, and outdoor activities'
        },
        {
          id: 'beach',
          label: 'Beach Paradise',
          value: 'relaxation',
          imageUrl: '/images/assessment/beach-paradise.jpg',
          description: 'Sun, sand, and relaxation'
        },
        {
          id: 'city',
          label: 'City Explorer',
          value: 'urban',
          imageUrl: '/images/assessment/city-explorer.jpg',
          description: 'Museums, restaurants, and city life'
        },
        {
          id: 'culture',
          label: 'Cultural Immersion',
          value: 'cultural',
          imageUrl: '/images/assessment/cultural-immersion.jpg',
          description: 'Local experiences and traditions'
        }
      ],
      weight: 0.9
    },
    {
      id: 'q2',
      category: 'preferences',
      question: 'How do you prefer to plan your trips?',
      type: 'single_choice',
      options: [
        {
          id: 'spontaneous',
          label: 'I like to be spontaneous and figure things out as I go',
          value: 'spontaneous'
        },
        {
          id: 'balanced',
          label: 'I plan the basics but leave room for spontaneity',
          value: 'balanced'
        },
        {
          id: 'structured',
          label: 'I prefer everything planned in advance',
          value: 'structured'
        }
      ],
      weight: 0.8
    },
    {
      id: 'q3',
      category: 'budget',
      question: 'What\'s your typical travel budget approach?',
      type: 'single_choice',
      options: [
        {
          id: 'budget',
          label: 'Budget-conscious - I look for the best deals',
          value: 'budget'
        },
        {
          id: 'moderate',
          label: 'Moderate - I balance cost with comfort',
          value: 'moderate'
        },
        {
          id: 'flexible',
          label: 'Flexible - I splurge on things that matter',
          value: 'flexible'
        },
        {
          id: 'luxury',
          label: 'Luxury - Comfort and experience are priorities',
          value: 'luxury'
        }
      ],
      weight: 0.85
    },
    {
      id: 'q4',
      category: 'personality',
      question: 'Rate how much you agree: "I enjoy trying new foods and cuisines"',
      type: 'scale',
      options: [
        { id: '1', label: 'Strongly Disagree', value: 1 },
        { id: '2', label: 'Disagree', value: 2 },
        { id: '3', label: 'Neutral', value: 3 },
        { id: '4', label: 'Agree', value: 4 },
        { id: '5', label: 'Strongly Agree', value: 5 }
      ],
      weight: 0.7
    },
    {
      id: 'q5',
      category: 'health',
      question: 'How important is maintaining your fitness routine while traveling?',
      type: 'scale',
      options: [
        { id: '1', label: 'Not important', value: 1 },
        { id: '2', label: 'Slightly important', value: 2 },
        { id: '3', label: 'Moderately important', value: 3 },
        { id: '4', label: 'Very important', value: 4 },
        { id: '5', label: 'Extremely important', value: 5 }
      ],
      weight: 0.75
    },
    {
      id: 'q6',
      category: 'experience',
      question: 'How often do you travel internationally?',
      type: 'single_choice',
      options: [
        { id: 'rarely', label: 'Less than once a year', value: 'rarely' },
        { id: 'annual', label: '1-2 times per year', value: 'annual' },
        { id: 'frequent', label: '3-5 times per year', value: 'frequent' },
        { id: 'very_frequent', label: 'More than 5 times per year', value: 'very_frequent' }
      ],
      weight: 0.6
    },
    {
      id: 'q7',
      category: 'preferences',
      question: 'Select all activities that interest you (multiple choice)',
      type: 'multiple_choice',
      options: [
        { id: 'hiking', label: 'Hiking & Trekking', value: 'hiking' },
        { id: 'museums', label: 'Museums & Galleries', value: 'museums' },
        { id: 'food', label: 'Food Tours & Cooking Classes', value: 'food' },
        { id: 'beach', label: 'Beach & Water Sports', value: 'beach' },
        { id: 'nightlife', label: 'Nightlife & Entertainment', value: 'nightlife' },
        { id: 'shopping', label: 'Shopping & Markets', value: 'shopping' },
        { id: 'wellness', label: 'Spa & Wellness', value: 'wellness' },
        { id: 'wildlife', label: 'Wildlife & Nature', value: 'wildlife' }
      ],
      weight: 0.85
    },
    {
      id: 'q8',
      category: 'personality',
      question: 'How do you prefer to travel?',
      type: 'single_choice',
      options: [
        { id: 'solo', label: 'Solo - I enjoy my own company', value: 'solo' },
        { id: 'couple', label: 'With partner - Romantic getaways', value: 'couple' },
        { id: 'friends', label: 'With friends - Group adventures', value: 'group' },
        { id: 'family', label: 'With family - Including children', value: 'family' }
      ],
      weight: 0.9
    },
    {
      id: 'q9',
      category: 'travel_style',
      question: 'What\'s your ideal daily pace while traveling?',
      type: 'single_choice',
      options: [
        { id: 'relaxed', label: 'Relaxed - 1-2 activities with lots of downtime', value: 'slow' },
        { id: 'moderate', label: 'Moderate - 3-4 activities with some rest', value: 'moderate' },
        { id: 'packed', label: 'Packed - See and do as much as possible', value: 'fast' }
      ],
      weight: 0.95
    },
    {
      id: 'q10',
      category: 'preferences',
      question: 'What type of accommodation do you prefer?',
      type: 'single_choice',
      options: [
        { id: 'hostel', label: 'Hostels - Social and budget-friendly', value: 'hostel' },
        { id: 'boutique', label: 'Boutique hotels - Unique and charming', value: 'boutique' },
        { id: 'chain', label: 'Chain hotels - Consistent and reliable', value: 'chain' },
        { id: 'luxury', label: 'Luxury resorts - Premium experience', value: 'luxury' },
        { id: 'local', label: 'Local stays - Airbnb or guesthouses', value: 'local' }
      ],
      weight: 0.8
    }
  ]

  private constructor() {
    super()
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
    this.initialize()
  }

  static getInstance(): UserAssessmentService {
    if (!this.instance) {
      this.instance = new UserAssessmentService()
    }
    return this.instance
  }

  /**
   * Initialize assessment service
   */
  private async initialize(): Promise<void> {
    console.log('UserAssessmentService: Initializing...')

    // Load assessment questions
    for (const question of UserAssessmentService.CORE_QUESTIONS) {
      this.assessmentQuestions.set(question.id, question)
    }

    // Load additional dynamic questions
    await this.loadDynamicQuestions()

    // Start behavioral tracking
    this.startBehavioralTracking()

    // Start learning process
    this.startContinuousLearning()

    console.log(`UserAssessmentService: Initialized with ${this.assessmentQuestions.size} questions`)
  }

  /**
   * Start user assessment
   */
  async startAssessment(userId: string): Promise<{
    assessmentId: string
    firstQuestion: UserAssessmentQuestion
    totalQuestions: number
    estimatedTime: number
  }> {
    console.log(`UserAssessmentService: Starting assessment for user ${userId}`)

    try {
      // Check if user has recent assessment
      const existingProfile = await this.getUserProfile(userId)
      if (existingProfile && this.isAssessmentRecent(existingProfile)) {
        throw new Error('User has a recent assessment. Use refresh assessment instead.')
      }

      // Create assessment session
      const assessmentId = `assessment-${userId}-${Date.now()}`
      const questions = await this.selectAdaptiveQuestions(userId)
      
      // Store assessment session
      await this.storeAssessmentSession(assessmentId, userId, questions)

      // Return first question
      return {
        assessmentId,
        firstQuestion: questions[0],
        totalQuestions: questions.length,
        estimatedTime: questions.length * 30 // 30 seconds per question average
      }
    } catch (error) {
      console.error('UserAssessmentService: Error starting assessment:', error)
      throw error
    }
  }

  /**
   * Submit assessment answer
   */
  async submitAnswer(
    assessmentId: string,
    response: UserAssessmentResponse
  ): Promise<{
    nextQuestion?: UserAssessmentQuestion
    completed: boolean
    progress: number
    profile?: UserProfile
  }> {
    console.log(`UserAssessmentService: Processing answer for ${assessmentId}`)

    try {
      // Store response
      await this.storeAssessmentResponse(assessmentId, response)

      // Get assessment session
      const session = await this.getAssessmentSession(assessmentId)
      if (!session) {
        throw new Error('Assessment session not found')
      }

      // Check if should complete early (adaptive)
      const shouldComplete = await this.checkAdaptiveCompletion(session)
      
      if (shouldComplete || session.currentQuestion >= session.questions.length - 1) {
        // Complete assessment
        const profile = await this.completeAssessment(assessmentId)
        return {
          completed: true,
          progress: 100,
          profile
        }
      }

      // Get next question
      const nextQuestion = await this.getNextAdaptiveQuestion(session, response)
      session.currentQuestion++
      
      await this.updateAssessmentSession(session)

      return {
        nextQuestion,
        completed: false,
        progress: (session.currentQuestion / session.questions.length) * 100
      }
    } catch (error) {
      console.error('UserAssessmentService: Error submitting answer:', error)
      throw error
    }
  }

  /**
   * Complete assessment and generate profile
   */
  private async completeAssessment(assessmentId: string): Promise<UserProfile> {
    console.log(`UserAssessmentService: Completing assessment ${assessmentId}`)

    try {
      const session = await this.getAssessmentSession(assessmentId)
      if (!session) {
        throw new Error('Assessment session not found')
      }

      // Analyze responses with AI
      const analysis = await this.analyzeAssessmentWithAI(session.responses)

      // Generate user profile
      const profile: UserProfile = {
        userId: session.userId,
        assessmentVersion: 1,
        completedAt: new Date(),
        travelPersonality: analysis.personality,
        preferences: analysis.preferences,
        behavioralPatterns: await this.analyzeBehavioralPatterns(session.userId),
        learningData: {
          interactions: 0,
          lastUpdated: new Date(),
          confidenceScore: analysis.confidence,
          dataPoints: []
        }
      }

      // Store profile
      await this.storeUserProfile(profile)
      this.userProfiles.set(session.userId, profile)

      // Generate initial insights
      await this.generateInitialInsights(profile)

      // Emit completion event
      this.emit('assessment_completed', { userId: session.userId, profile })

      return profile
    } catch (error) {
      console.error('UserAssessmentService: Error completing assessment:', error)
      throw error
    }
  }

  /**
   * Track behavioral event
   */
  async trackBehavior(event: BehavioralEvent): Promise<void> {
    try {
      // Add to buffer
      const userEvents = this.eventBuffer.get(event.userId) || []
      userEvents.push(event)
      this.eventBuffer.set(event.userId, userEvents)

      // Store in database
      await this.storeBehavioralEvent(event)

      // Process if buffer is large enough
      if (userEvents.length >= 10) {
        await this.processBehavioralEvents(event.userId)
      }
    } catch (error) {
      console.error('UserAssessmentService: Error tracking behavior:', error)
    }
  }

  /**
   * Get user profile with learning updates
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      // Check cache
      let profile = this.userProfiles.get(userId)
      
      if (!profile) {
        // Load from database
        profile = await this.loadUserProfile(userId)
        if (profile) {
          this.userProfiles.set(userId, profile)
        }
      }

      // Apply recent learning if profile exists
      if (profile) {
        profile = await this.applyRecentLearning(profile)
      }

      return profile
    } catch (error) {
      console.error('UserAssessmentService: Error getting user profile:', error)
      return null
    }
  }

  /**
   * Generate personalized recommendations
   */
  async generateRecommendations(
    userId: string,
    context: {
      destination?: string
      dates?: { start: Date; end: Date }
      budget?: number
      companions?: number
    }
  ): Promise<{
    activities: any[]
    accommodations: any[]
    restaurants: any[]
    tips: string[]
    confidence: number
  }> {
    console.log(`UserAssessmentService: Generating recommendations for user ${userId}`)

    try {
      const profile = await this.getUserProfile(userId)
      if (!profile) {
        throw new Error('User profile not found')
      }

      // Use AI to generate personalized recommendations
      const prompt = `
      Generate personalized travel recommendations based on user profile:
      
      Travel Personality: ${profile.travelPersonality.type} (${profile.travelPersonality.confidence}% confidence)
      Key Traits: ${profile.travelPersonality.traits.map(t => `${t.trait}: ${t.score}`).join(', ')}
      
      Preferences:
      - Pace: ${profile.preferences.pacePreference}
      - Planning Style: ${profile.preferences.planningStyle}
      - Social: ${profile.preferences.socialPreference}
      - Comfort Level: ${profile.preferences.comfortLevel}
      - Cultural Interest: ${profile.preferences.culturalInterest}/100
      - Adventure Level: ${profile.preferences.adventureLevel}/100
      
      Context:
      - Destination: ${context.destination || 'Not specified'}
      - Budget: ${context.budget || 'Flexible'}
      - Travel Companions: ${context.companions || 1}
      
      Provide specific, personalized recommendations for activities, accommodations, and restaurants.
      Include practical tips based on their personality type.
      `

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a personalized travel recommendation engine. Provide specific, actionable recommendations based on user personality and preferences.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        response_format: { type: 'json_object' }
      })

      const recommendations = JSON.parse(completion.choices[0].message.content || '{}')

      // Add confidence based on profile data
      recommendations.confidence = this.calculateRecommendationConfidence(profile)

      // Track recommendation generation
      await this.trackBehavior({
        userId,
        eventType: 'view',
        entityType: 'trip',
        entityId: 'recommendations',
        timestamp: new Date(),
        context: {
          device: 'web',
          sessionId: `session-${Date.now()}`
        },
        metadata: { context, recommendationCount: recommendations.activities?.length || 0 }
      })

      return recommendations
    } catch (error) {
      console.error('UserAssessmentService: Error generating recommendations:', error)
      throw error
    }
  }

  /**
   * Refresh user profile with new data
   */
  async refreshProfile(userId: string): Promise<UserProfile> {
    console.log(`UserAssessmentService: Refreshing profile for user ${userId}`)

    try {
      const profile = await this.getUserProfile(userId)
      if (!profile) {
        throw new Error('User profile not found')
      }

      // Analyze recent behavior
      const recentEvents = await this.getRecentBehavioralEvents(userId, 30) // Last 30 days
      const behaviorAnalysis = await this.analyzeBehaviorWithAI(recentEvents)

      // Update profile
      profile.behavioralPatterns = {
        ...profile.behavioralPatterns,
        ...behaviorAnalysis.patterns
      }

      // Update personality traits based on behavior
      if (behaviorAnalysis.personalityShift) {
        profile.travelPersonality.traits = this.mergeTraits(
          profile.travelPersonality.traits,
          behaviorAnalysis.newTraits
        )
      }

      // Update learning data
      profile.learningData.interactions += recentEvents.length
      profile.learningData.lastUpdated = new Date()
      profile.learningData.confidenceScore = Math.min(
        100,
        profile.learningData.confidenceScore + behaviorAnalysis.confidenceIncrease
      )

      // Store updated profile
      await this.storeUserProfile(profile)
      this.userProfiles.set(userId, profile)

      // Generate insights about changes
      await this.generateProfileUpdateInsights(userId, behaviorAnalysis)

      return profile
    } catch (error) {
      console.error('UserAssessmentService: Error refreshing profile:', error)
      throw error
    }
  }

  /**
   * Analyze assessment responses with AI
   */
  private async analyzeAssessmentWithAI(responses: UserAssessmentResponse[]): Promise<any> {
    const prompt = `
    Analyze these user assessment responses to determine travel personality and preferences:
    
    ${responses.map(r => {
      const question = this.assessmentQuestions.get(r.questionId)
      return `Q: ${question?.question}\nA: ${JSON.stringify(r.answer)}\nResponse time: ${r.confidence || 'N/A'}`
    }).join('\n\n')}
    
    Determine:
    1. Primary travel personality type (adventurer, explorer, relaxer, culture_seeker, luxury_traveler, budget_backpacker)
    2. Confidence in personality assessment (0-100)
    3. Key personality traits with scores (0-100)
    4. Detailed preferences
    5. Any contradictions or interesting patterns
    
    Return as structured JSON.
    `

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert psychologist specializing in travel behavior analysis. Analyze assessment responses to create detailed user profiles.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })

    const analysis = JSON.parse(completion.choices[0].message.content || '{}')

    return {
      personality: {
        type: analysis.personality_type || 'explorer',
        confidence: analysis.confidence || 75,
        traits: analysis.traits || []
      },
      preferences: {
        pacePreference: analysis.pace || 'moderate',
        planningStyle: analysis.planning || 'balanced',
        socialPreference: analysis.social || 'couple',
        comfortLevel: analysis.comfort || 'standard',
        culturalInterest: analysis.cultural_interest || 70,
        adventureLevel: analysis.adventure_level || 60,
        relaxationNeed: analysis.relaxation_need || 50
      },
      confidence: analysis.overall_confidence || 80
    }
  }

  /**
   * Analyze behavioral patterns
   */
  private async analyzeBehavioralPatterns(userId: string): Promise<any> {
    const events = await this.getRecentBehavioralEvents(userId, 90) // Last 90 days
    
    if (events.length < 10) {
      // Not enough data, return defaults
      return {
        bookingBehavior: {
          advanceBooking: 30,
          priceFlexibility: 0.5,
          loyaltyPreference: false,
          lastMinuteDeals: false
        },
        activityPreferences: {
          morningPerson: true,
          optimalActivityDuration: 120,
          restFrequency: 2,
          varietySeeking: 0.5
        },
        decisionMaking: {
          researchDepth: 'moderate',
          reviewImportance: 0.7,
          brandSensitivity: 0.5,
          peerInfluence: 0.5
        }
      }
    }

    // Analyze patterns
    const bookings = events.filter(e => e.eventType === 'book')
    const searches = events.filter(e => e.eventType === 'search')
    const views = events.filter(e => e.eventType === 'view')

    return {
      bookingBehavior: {
        advanceBooking: this.calculateAverageBookingAdvance(bookings),
        priceFlexibility: this.calculatePriceFlexibility(searches, bookings),
        loyaltyPreference: this.detectLoyaltyPreference(bookings),
        lastMinuteDeals: this.detectLastMinutePreference(bookings)
      },
      activityPreferences: {
        morningPerson: this.detectTimePreference(events),
        optimalActivityDuration: this.calculateOptimalDuration(views),
        restFrequency: this.calculateRestFrequency(events),
        varietySeeking: this.calculateVarietySeeking(events)
      },
      decisionMaking: {
        researchDepth: this.analyzeResearchDepth(searches, views, bookings),
        reviewImportance: this.calculateReviewImportance(views),
        brandSensitivity: this.calculateBrandSensitivity(bookings),
        peerInfluence: this.calculatePeerInfluence(events)
      }
    }
  }

  /**
   * Select adaptive questions based on user
   */
  private async selectAdaptiveQuestions(userId: string): Promise<UserAssessmentQuestion[]> {
    const questions: UserAssessmentQuestion[] = []
    
    // Start with core high-weight questions
    const coreQuestions = Array.from(this.assessmentQuestions.values())
      .filter(q => q.weight >= 0.8)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 10)
    
    questions.push(...coreQuestions)

    // Add adaptive questions based on any existing data
    const existingData = await this.getExistingUserData(userId)
    if (existingData) {
      // Add questions to clarify weak areas
      const adaptiveQuestions = await this.generateAdaptiveQuestions(existingData)
      questions.push(...adaptiveQuestions)
    } else {
      // Add diverse category questions for new users
      const categories = ['travel_style', 'preferences', 'health', 'budget', 'personality', 'experience']
      for (const category of categories) {
        const categoryQuestions = Array.from(this.assessmentQuestions.values())
          .filter(q => q.category === category && !questions.includes(q))
          .slice(0, 2)
        questions.push(...categoryQuestions)
      }
    }

    // Limit to max questions
    return questions.slice(0, UserAssessmentService.ASSESSMENT_CONFIG.maxQuestions)
  }

  /**
   * Check if assessment should complete early
   */
  private async checkAdaptiveCompletion(session: any): Promise<boolean> {
    if (session.responses.length < UserAssessmentService.ASSESSMENT_CONFIG.minQuestions) {
      return false
    }

    // Calculate confidence in current profile
    const tempAnalysis = await this.analyzeAssessmentWithAI(session.responses)
    const confidence = tempAnalysis.confidence / 100

    return confidence >= UserAssessmentService.ASSESSMENT_CONFIG.adaptiveThreshold
  }

  /**
   * Get next adaptive question
   */
  private async getNextAdaptiveQuestion(
    session: any,
    lastResponse: UserAssessmentResponse
  ): Promise<UserAssessmentQuestion> {
    // Check for dependent questions
    const dependentQuestions = Array.from(this.assessmentQuestions.values())
      .filter(q => {
        if (!q.dependencies) return false
        return q.dependencies.some(d => 
          d.questionId === lastResponse.questionId && 
          d.answer === lastResponse.answer
        )
      })

    if (dependentQuestions.length > 0) {
      return dependentQuestions[0]
    }

    // Return next in sequence
    return session.questions[session.currentQuestion + 1]
  }

  /**
   * Process behavioral events
   */
  private async processBehavioralEvents(userId: string): Promise<void> {
    const events = this.eventBuffer.get(userId) || []
    if (events.length === 0) return

    try {
      // Analyze events for patterns
      const patterns = await this.detectBehavioralPatterns(events)
      
      if (patterns.length > 0) {
        // Update profile
        const profile = await this.getUserProfile(userId)
        if (profile) {
          await this.updateProfileFromPatterns(profile, patterns)
        }

        // Generate insights
        for (const pattern of patterns) {
          await this.generateBehavioralInsight(userId, pattern)
        }
      }

      // Clear buffer
      this.eventBuffer.set(userId, [])
    } catch (error) {
      console.error('UserAssessmentService: Error processing behavioral events:', error)
    }
  }

  /**
   * Continuous learning process
   */
  private startContinuousLearning(): void {
    // Process behavioral events every 5 minutes
    setInterval(async () => {
      for (const [userId, events] of this.eventBuffer.entries()) {
        if (events.length > 0) {
          await this.processBehavioralEvents(userId)
        }
      }
    }, 5 * 60 * 1000)

    // Update learning models daily
    setInterval(async () => {
      await this.updateLearningModels()
    }, 24 * 60 * 60 * 1000)
  }

  /**
   * Update learning models
   */
  private async updateLearningModels(): Promise<void> {
    console.log('UserAssessmentService: Updating learning models...')

    try {
      // Get all users with recent activity
      const activeUsers = await this.getActiveUsers(30) // Last 30 days

      for (const userId of activeUsers) {
        const profile = await this.getUserProfile(userId)
        if (!profile) continue

        // Update profile with latest learnings
        await this.refreshProfile(userId)
      }

      // Update global patterns
      await this.updateGlobalPatterns()

      console.log('UserAssessmentService: Learning models updated')
    } catch (error) {
      console.error('UserAssessmentService: Error updating learning models:', error)
    }
  }

  /**
   * Helper methods for behavioral analysis
   */
  private calculateAverageBookingAdvance(bookings: BehavioralEvent[]): number {
    if (bookings.length === 0) return 30

    const advances = bookings.map(b => {
      const bookingDate = new Date(b.timestamp)
      const travelDate = new Date(b.metadata?.travelDate || bookingDate)
      return Math.floor((travelDate.getTime() - bookingDate.getTime()) / (1000 * 60 * 60 * 24))
    })

    return Math.round(advances.reduce((sum, a) => sum + a, 0) / advances.length)
  }

  private calculatePriceFlexibility(searches: BehavioralEvent[], bookings: BehavioralEvent[]): number {
    if (searches.length === 0) return 0.5

    const priceRanges = searches.map(s => s.metadata?.priceRange || 0)
    const avgRange = priceRanges.reduce((sum, r) => sum + r, 0) / priceRanges.length
    
    return Math.min(1, avgRange / 1000) // Normalize to 0-1
  }

  private detectLoyaltyPreference(bookings: BehavioralEvent[]): boolean {
    if (bookings.length < 3) return false

    const brands = bookings.map(b => b.metadata?.brand).filter(Boolean)
    const brandCounts = brands.reduce((acc, brand) => {
      acc[brand] = (acc[brand] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const maxCount = Math.max(...Object.values(brandCounts))
    return maxCount / bookings.length > 0.5
  }

  private detectLastMinutePreference(bookings: BehavioralEvent[]): boolean {
    const lastMinuteBookings = bookings.filter(b => {
      const advance = this.calculateAverageBookingAdvance([b])
      return advance < 7
    })

    return lastMinuteBookings.length / bookings.length > 0.3
  }

  private detectTimePreference(events: BehavioralEvent[]): boolean {
    const morningEvents = events.filter(e => {
      const hour = new Date(e.timestamp).getHours()
      return hour >= 6 && hour < 12
    })

    return morningEvents.length / events.length > 0.5
  }

  private calculateOptimalDuration(views: BehavioralEvent[]): number {
    const durations = views
      .map(v => v.metadata?.viewDuration)
      .filter(d => d && d > 30 && d < 300) // 30s to 5min

    if (durations.length === 0) return 120

    return Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length)
  }

  private calculateRestFrequency(events: BehavioralEvent[]): number {
    // Analyze activity patterns to determine rest needs
    return 2 // Default 2 breaks per day
  }

  private calculateVarietySeeking(events: BehavioralEvent[]): number {
    const uniqueTypes = new Set(events.map(e => e.entityType))
    return Math.min(1, uniqueTypes.size / 5) // Normalize to 0-1
  }

  private analyzeResearchDepth(
    searches: BehavioralEvent[],
    views: BehavioralEvent[],
    bookings: BehavioralEvent[]
  ): 'minimal' | 'moderate' | 'extensive' {
    if (bookings.length === 0) return 'moderate'

    const searchToBookingRatio = searches.length / bookings.length
    const viewToBookingRatio = views.length / bookings.length

    if (searchToBookingRatio < 5 && viewToBookingRatio < 10) return 'minimal'
    if (searchToBookingRatio > 20 || viewToBookingRatio > 40) return 'extensive'
    return 'moderate'
  }

  private calculateReviewImportance(views: BehavioralEvent[]): number {
    const reviewViews = views.filter(v => v.metadata?.section === 'reviews')
    return Math.min(1, reviewViews.length / views.length * 2) // Amplify importance
  }

  private calculateBrandSensitivity(bookings: BehavioralEvent[]): number {
    const brandedBookings = bookings.filter(b => b.metadata?.brand)
    return brandedBookings.length / bookings.length
  }

  private calculatePeerInfluence(events: BehavioralEvent[]): number {
    const socialEvents = events.filter(e => e.eventType === 'share' || e.metadata?.source === 'social')
    return Math.min(1, socialEvents.length / events.length * 3) // Amplify social signals
  }

  private calculateRecommendationConfidence(profile: UserProfile): number {
    const factors = [
      profile.learningData.confidenceScore / 100,
      Math.min(1, profile.learningData.interactions / 100),
      profile.travelPersonality.confidence / 100
    ]

    return Math.round(factors.reduce((sum, f) => sum + f, 0) / factors.length * 100)
  }

  private isAssessmentRecent(profile: UserProfile): boolean {
    const age = Date.now() - profile.completedAt.getTime()
    return age < UserAssessmentService.ASSESSMENT_CONFIG.retakeInterval
  }

  private mergeTraits(
    existing: Array<{ trait: string; score: number }>,
    updates: Array<{ trait: string; score: number }>
  ): Array<{ trait: string; score: number }> {
    const merged = [...existing]

    for (const update of updates) {
      const existingIndex = merged.findIndex(t => t.trait === update.trait)
      if (existingIndex >= 0) {
        // Weighted average favoring recent data
        merged[existingIndex].score = Math.round(
          merged[existingIndex].score * 0.7 + update.score * 0.3
        )
      } else {
        merged.push(update)
      }
    }

    return merged.sort((a, b) => b.score - a.score)
  }

  /**
   * Storage methods (would connect to database)
   */
  private async storeAssessmentSession(assessmentId: string, userId: string, questions: UserAssessmentQuestion[]): Promise<void> {
    // Store in database
    console.log(`UserAssessmentService: Stored assessment session ${assessmentId}`)
  }

  private async getAssessmentSession(assessmentId: string): Promise<any> {
    // Mock implementation
    return {
      assessmentId,
      userId: 'user-123',
      questions: Array.from(this.assessmentQuestions.values()),
      currentQuestion: 0,
      responses: []
    }
  }

  private async storeAssessmentResponse(assessmentId: string, response: UserAssessmentResponse): Promise<void> {
    console.log(`UserAssessmentService: Stored response for ${assessmentId}`)
  }

  private async updateAssessmentSession(session: any): Promise<void> {
    console.log(`UserAssessmentService: Updated session ${session.assessmentId}`)
  }

  private async storeUserProfile(profile: UserProfile): Promise<void> {
    console.log(`UserAssessmentService: Stored profile for user ${profile.userId}`)
  }

  private async loadUserProfile(userId: string): Promise<UserProfile | null> {
    // Load from database
    return null
  }

  private async storeBehavioralEvent(event: BehavioralEvent): Promise<void> {
    // Store in database
  }

  private async getRecentBehavioralEvents(userId: string, days: number): Promise<BehavioralEvent[]> {
    // Fetch from database
    return []
  }

  private async getExistingUserData(userId: string): Promise<any> {
    // Fetch any existing data about user
    return null
  }

  private async generateAdaptiveQuestions(existingData: any): Promise<UserAssessmentQuestion[]> {
    // Generate questions based on gaps in existing data
    return []
  }

  private async detectBehavioralPatterns(events: BehavioralEvent[]): Promise<any[]> {
    // Detect patterns in events
    return []
  }

  private async updateProfileFromPatterns(profile: UserProfile, patterns: any[]): Promise<void> {
    // Update profile based on detected patterns
  }

  private async generateBehavioralInsight(userId: string, pattern: any): Promise<void> {
    // Generate and store insight
  }

  private async getActiveUsers(days: number): Promise<string[]> {
    // Get users with recent activity
    return []
  }

  private async updateGlobalPatterns(): Promise<void> {
    // Update global behavioral patterns
  }

  private async generateInitialInsights(profile: UserProfile): Promise<void> {
    // Generate initial insights for new profile
  }

  private async generateProfileUpdateInsights(userId: string, analysis: any): Promise<void> {
    // Generate insights about profile changes
  }

  private async analyzeBehaviorWithAI(events: BehavioralEvent[]): Promise<any> {
    // Analyze behavior patterns with AI
    return {
      patterns: {},
      personalityShift: false,
      newTraits: [],
      confidenceIncrease: 5
    }
  }

  private async applyRecentLearning(profile: UserProfile): Promise<UserProfile> {
    // Apply any recent learning to profile
    return profile
  }

  private async loadDynamicQuestions(): Promise<void> {
    // Load additional questions based on trends, seasons, etc.
  }

  private startBehavioralTracking(): void {
    console.log('UserAssessmentService: Started behavioral tracking')
  }

  /**
   * Get service status
   */
  getStatus(): any {
    return {
      totalQuestions: this.assessmentQuestions.size,
      activeProfiles: this.userProfiles.size,
      bufferedEvents: Array.from(this.eventBuffer.values()).reduce((sum, events) => sum + events.length, 0),
      learningModels: this.learningModels.size
    }
  }
}

// Export singleton instance
export const userAssessmentService = UserAssessmentService.getInstance()