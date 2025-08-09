// Advanced Conversation Understanding with Normalization
// Following specification: understanding intent and context, normalizing entities, inferring preferences

import { TripBrief, Constraint, createConstraint, updateConstraint, TripDecision, PendingConfirmation } from '../types/TripBrief'

export interface ConversationAnalysis {
  intent: DetectedIntent
  entities: ExtractedEntities
  normalizedData: NormalizedData
  contextUpdates: Partial<TripBrief>
  needsConfirmation: PendingConfirmation[]
  needsResearch: boolean
  researchQuery?: string
  confidence: number
  reasoning: string[]
}

export interface DetectedIntent {
  primary: string // Main intent
  secondary?: string[] // Additional intents
  confidence: number
  context: string
  urgency: 'low' | 'medium' | 'high'
}

export interface ExtractedEntities {
  destinations: string[]
  dates: { start?: string; end?: string; duration?: number; flexibility?: string }
  budget: { amount?: number; currency?: string; breakdown?: any }
  travelers: { adults?: number; children?: number; groupType?: string }
  preferences: {
    style?: string
    pace?: string
    accommodation?: string[]
    activities?: string[]
    dining?: string[]
    transport?: any
  }
  constraints: { hard: string[]; soft: string[] }
  locations: { origin?: string; destination?: string }
}

export interface NormalizedData {
  destinations: NormalizedDestination[]
  dates: NormalizedDates
  budget: NormalizedBudget
  travelers: NormalizedTravelers
  preferences: NormalizedPreferences
  constraints: NormalizedConstraints
}

export interface NormalizedDestination {
  original: string
  normalized: string
  type: 'city' | 'country' | 'region' | 'small-town' | 'village' | 'custom'
  confidence: number
  coordinates?: { lat: number; lng: number }
  country: string
  alternatives: string[]
}

export interface NormalizedDates {
  startDate?: string // ISO format
  endDate?: string
  duration?: number
  flexibility: 'exact' | 'plus-minus-1' | 'plus-minus-2' | 'flexible'
  confidence: number
  inferred: boolean
}

export interface NormalizedBudget {
  total: number
  currency: string // ISO code
  perDay?: number
  confidence: number
  source: 'explicit' | 'inferred'
}

export interface NormalizedTravelers {
  adults: number
  children?: number
  groupType: 'solo' | 'couple' | 'family' | 'friends' | 'business'
  confidence: number
}

export interface NormalizedPreferences {
  travelStyle: 'luxury' | 'mid-range' | 'budget' | 'mixed'
  pace: 'slow' | 'moderate' | 'fast'
  accommodation: string[]
  activities: string[]
  dining: string[]
  transport: any
  confidence: Record<string, number>
}

export interface NormalizedConstraints {
  hard: { constraint: string; field: string; value: any }[]
  soft: { constraint: string; field: string; value: any }[]
}

export class ConversationUnderstanding {
  private synonymMap: Map<string, string[]> = new Map()
  private intentPatterns: Map<string, RegExp[]> = new Map()
  private entityExtractors: Map<string, (text: string) => any> = new Map()
  
  constructor() {
    this.initializeSynonymMaps()
    this.initializeIntentPatterns()
    this.initializeEntityExtractors()
  }
  
  // Main analysis method - processes user input with full context
  async analyzeUserInput(
    userInput: string, 
    conversationHistory: any[], 
    currentTripBrief: TripBrief
  ): Promise<ConversationAnalysis> {
    
    const reasoning: string[] = []
    
    // 1. Clean and normalize input
    const cleanedInput = this.cleanInput(userInput)
    reasoning.push(`Cleaned input: "${cleanedInput}"`)
    
    // 2. Detect intent with context
    const intent = this.detectIntent(cleanedInput, conversationHistory, currentTripBrief)
    reasoning.push(`Detected intent: ${intent.primary} (${intent.confidence}% confidence)`)
    
    // 3. Extract entities
    const entities = this.extractEntities(cleanedInput, intent.primary)
    reasoning.push(`Extracted entities: ${Object.keys(entities).filter(k => entities[k]).join(', ')}`)
    
    // 4. Normalize extracted data
    const normalizedData = await this.normalizeEntities(entities, currentTripBrief)
    reasoning.push(`Normalized data with ${normalizedData.destinations.length} destinations`)
    
    // 5. Generate context updates
    const contextUpdates = this.generateContextUpdates(normalizedData, currentTripBrief, userInput)
    reasoning.push(`Generated ${Object.keys(contextUpdates).length} context updates`)
    
    // 6. Identify confirmation needs
    const needsConfirmation = this.identifyConfirmationNeeds(normalizedData, currentTripBrief)
    
    // 7. Determine research needs
    const { needsResearch, researchQuery } = this.determineResearchNeeds(
      normalizedData, 
      intent, 
      currentTripBrief
    )
    
    // 8. Calculate overall confidence
    const confidence = this.calculateOverallConfidence(intent, normalizedData)
    
    return {
      intent,
      entities,
      normalizedData,
      contextUpdates,
      needsConfirmation,
      needsResearch,
      researchQuery,
      confidence,
      reasoning
    }
  }
  
  // Intent detection with context awareness
  private detectIntent(
    input: string, 
    history: any[], 
    currentBrief: TripBrief
  ): DetectedIntent {
    
    const lowerInput = input.toLowerCase()
    
    // Check for explicit generation requests
    if (this.matchesPattern(lowerInput, [
      /generate.*(itinerary|plan|trip)/,
      /(create|make|build).*(itinerary|plan)/,
      /yes.*generate/,
      /ready.*(plan|itinerary)/,
      /let'?s.*plan/
    ])) {
      return {
        primary: 'generate_itinerary',
        confidence: 95,
        context: 'User explicitly requested itinerary generation',
        urgency: 'high'
      }
    }
    
    // Check for destination-related intents
    if (this.matchesPattern(lowerInput, [
      /(visit|go to|travel to|trip to)/,
      /(want to|planning to|thinking of).*(visit|go)/,
      /destination/,
      /(city|country|place)/
    ])) {
      return {
        primary: 'specify_destination',
        secondary: ['planning'],
        confidence: 85,
        context: 'User specifying travel destination',
        urgency: 'medium'
      }
    }
    
    // Check for date/duration intents
    if (this.matchesPattern(lowerInput, [
      /(\d+).*day/,
      /(week|month)/,
      /(january|february|march|april|may|june|july|august|september|october|november|december)/,
      /\d{1,2}\/\d{1,2}/,
      /(next|this).*week/
    ])) {
      return {
        primary: 'specify_dates',
        confidence: 80,
        context: 'User specifying travel dates or duration',
        urgency: 'medium'
      }
    }
    
    // Check for budget intents
    if (this.matchesPattern(lowerInput, [
      /[$£€¥]\d+/,
      /budget.*(\d+)/,
      /(cost|price|expensive|cheap|affordable)/,
      /spend.*(\d+)/
    ])) {
      return {
        primary: 'specify_budget',
        confidence: 85,
        context: 'User specifying budget constraints',
        urgency: 'medium'
      }
    }
    
    // Check for travel style intents
    if (this.matchesPattern(lowerInput, [
      /(luxury|premium|high.?end|finest|deluxe)/,
      /(budget|cheap|affordable|economical)/,
      /(mid.?range|moderate|comfortable|standard)/,
      /(mixed|flexible|combination|varied)/
    ])) {
      return {
        primary: 'specify_style',
        confidence: 90,
        context: 'User specifying travel style preferences',
        urgency: 'medium'
      }
    }
    
    // Check for accommodation intents
    if (this.matchesPattern(lowerInput, [
      /(hotel|resort|apartment|hostel|bnb|bed.*breakfast)/,
      /(stay|accommodation|lodging)/,
      /(room|suite)/
    ])) {
      return {
        primary: 'specify_accommodation',
        confidence: 75,
        context: 'User specifying accommodation preferences',
        urgency: 'low'
      }
    }
    
    // Check for activity/interest intents
    if (this.matchesPattern(lowerInput, [
      /(interested in|like to|enjoy|love)/,
      /(museum|gallery|park|beach|mountain)/,
      /(history|culture|food|nature|art|shopping)/,
      /(activities|things to do)/
    ])) {
      return {
        primary: 'specify_interests',
        confidence: 70,
        context: 'User specifying activity interests',
        urgency: 'low'
      }
    }
    
    // Default conversational intent
    return {
      primary: 'conversational',
      confidence: 50,
      context: 'General conversation or unclear intent',
      urgency: 'low'
    }
  }
  
  // Entity extraction with context
  private extractEntities(input: string, primaryIntent: string): ExtractedEntities {
    const entities: ExtractedEntities = {
      destinations: [],
      dates: {},
      budget: {},
      travelers: {},
      preferences: {},
      constraints: { hard: [], soft: [] },
      locations: {}
    }
    
    // Extract destinations
    entities.destinations = this.extractDestinations(input)
    
    // Extract dates and duration
    entities.dates = this.extractDates(input)
    
    // Extract budget information
    entities.budget = this.extractBudget(input)
    
    // Extract traveler information
    entities.travelers = this.extractTravelers(input)
    
    // Extract preferences based on context
    entities.preferences = this.extractPreferences(input, primaryIntent)
    
    // Extract constraints
    entities.constraints = this.extractConstraints(input)
    
    return entities
  }
  
  // Destination extraction with smart inference
  private extractDestinations(input: string): string[] {
    const destinations: string[] = []
    const lowerInput = input.toLowerCase()
    
    // Known cities (this would be expanded with a comprehensive database)
    const knownCities = [
      'london', 'paris', 'rome', 'barcelona', 'amsterdam', 'berlin', 'vienna',
      'prague', 'budapest', 'lisbon', 'madrid', 'florence', 'venice', 'milan',
      'stockholm', 'oslo', 'copenhagen', 'dublin', 'edinburgh', 'glasgow',
      'new york', 'los angeles', 'san francisco', 'chicago', 'miami', 'boston',
      'tokyo', 'kyoto', 'osaka', 'bangkok', 'singapore', 'hong kong', 'sydney',
      'melbourne', 'dubai', 'istanbul', 'cairo', 'marrakech', 'cape town'
    ]
    
    // Known countries
    const knownCountries = [
      'italy', 'france', 'spain', 'germany', 'uk', 'united kingdom', 'england',
      'scotland', 'ireland', 'portugal', 'greece', 'turkey', 'egypt', 'japan',
      'thailand', 'singapore', 'australia', 'new zealand', 'usa', 'america',
      'canada', 'mexico', 'morocco', 'south africa'
    ]
    
    // Extract explicit destinations
    for (const city of knownCities) {
      if (lowerInput.includes(city)) {
        destinations.push(city)
      }
    }
    
    for (const country of knownCountries) {
      if (lowerInput.includes(country)) {
        destinations.push(country)
      }
    }
    
    // Extract from patterns like "visit X" or "go to X"
    const destinationPatterns = [
      /(?:visit|go to|travel to|trip to)\s+([A-Za-z\s]+?)(?:\s|$|,|\.|!|\?)/g,
      /(?:in|to)\s+([A-Z][A-Za-z\s]+?)(?:\s|$|,|\.|!|\?)/g
    ]
    
    for (const pattern of destinationPatterns) {
      const matches = input.match(pattern)
      if (matches) {
        for (const match of matches) {
          if (match && typeof match === 'string') {
            const destination = match.replace(/^(visit|go to|travel to|trip to|in|to)\s+/i, '').trim()
            if (destination && destination.length > 2) {
              destinations.push(destination)
            }
          }
        }
      }
    }
    
    return [...new Set(destinations)] // Remove duplicates
  }
  
  // Date extraction with flexible parsing
  private extractDates(input: string): any {
    const dates: any = {}
    
    // Extract duration in days
    const durationMatch = input.match(/(\d+)\s*(?:days?|nights?)/i)
    if (durationMatch) {
      dates.duration = parseInt(durationMatch[1])
    }
    
    // Extract weeks/months
    const weekMatch = input.match(/(\d+)\s*weeks?/i)
    if (weekMatch) {
      dates.duration = parseInt(weekMatch[1]) * 7
    }
    
    const monthMatch = input.match(/(\d+)\s*months?/i)
    if (monthMatch) {
      dates.duration = parseInt(monthMatch[1]) * 30
    }
    
    // Extract specific dates (basic patterns)
    const datePatterns = [
      /(\d{1,2}\/\d{1,2}\/\d{4})/g,
      /(\d{4}-\d{1,2}-\d{1,2})/g
    ]
    
    for (const pattern of datePatterns) {
      const matches = input.match(pattern)
      if (matches) {
        dates.start = matches[0]
        if (matches[1]) dates.end = matches[1]
      }
    }
    
    // Extract flexibility indicators
    if (input.match(/flexible|open|whenever|anytime/i)) {
      dates.flexibility = 'flexible'
    } else if (input.match(/exact|specific|must be/i)) {
      dates.flexibility = 'exact'
    }
    
    return dates
  }
  
  // Budget extraction with currency detection
  private extractBudget(input: string): any {
    const budget: any = {}
    
    // Extract currency symbols and amounts
    const currencyPatterns = [
      { pattern: /\$(\d+(?:,\d{3})*(?:\.\d{2})?)/g, currency: 'USD' },
      { pattern: /£(\d+(?:,\d{3})*(?:\.\d{2})?)/g, currency: 'GBP' },
      { pattern: /€(\d+(?:,\d{3})*(?:\.\d{2})?)/g, currency: 'EUR' },
      { pattern: /¥(\d+(?:,\d{3})*)/g, currency: 'JPY' }
    ]
    
    for (const { pattern, currency } of currencyPatterns) {
      const match = input.match(pattern)
      if (match && match[1]) {
        const amount = parseFloat(match[1].replace(/,/g, ''))
        budget.amount = amount
        budget.currency = currency
        break
      }
    }
    
    // Extract budget keywords
    if (input.match(/tight budget|on a budget|budget.*trip/i)) {
      budget.level = 'budget'
    } else if (input.match(/luxury|premium|high.*end/i)) {
      budget.level = 'luxury'
    } else if (input.match(/moderate|comfortable|mid.*range/i)) {
      budget.level = 'mid-range'
    }
    
    return budget
  }
  
  // Traveler extraction
  private extractTravelers(input: string): any {
    const travelers: any = {}
    
    // Extract number of people
    const peopleMatch = input.match(/(\d+)\s*(?:people|person|adults?|travellers?|travelers?)/i)
    if (peopleMatch) {
      travelers.adults = parseInt(peopleMatch[1])
    }
    
    // Detect group types
    if (input.match(/solo|alone|by myself/i)) {
      travelers.groupType = 'solo'
      travelers.adults = 1
    } else if (input.match(/couple|partner|girlfriend|boyfriend|wife|husband/i)) {
      travelers.groupType = 'couple'
      travelers.adults = 2
    } else if (input.match(/family|kids|children/i)) {
      travelers.groupType = 'family'
    } else if (input.match(/friends|group/i)) {
      travelers.groupType = 'friends'
    }
    
    return travelers
  }
  
  // Preference extraction with context
  private extractPreferences(input: string, intent: string): any {
    const preferences: any = {}
    
    // Travel style extraction with comprehensive synonyms
    preferences.style = this.extractTravelStyle(input)
    
    // Activity interests
    const interests: string[] = []
    const interestMap = {
      'history': ['history', 'historical', 'ancient', 'museum', 'heritage'],
      'culture': ['culture', 'cultural', 'art', 'gallery', 'theater', 'music'],
      'nature': ['nature', 'outdoor', 'hiking', 'park', 'beach', 'mountain'],
      'food': ['food', 'culinary', 'restaurant', 'cooking', 'wine', 'dining'],
      'shopping': ['shopping', 'market', 'boutique', 'souvenir'],
      'nightlife': ['nightlife', 'bar', 'club', 'entertainment', 'party']
    }
    
    for (const [category, keywords] of Object.entries(interestMap)) {
      if (keywords.some(keyword => input.toLowerCase().includes(keyword))) {
        interests.push(category)
      }
    }
    
    if (interests.length > 0) {
      preferences.activities = interests
    }
    
    return preferences
  }
  
  // Enhanced travel style extraction
  private extractTravelStyle(input: string): string | undefined {
    const normalized = this.normalizeStyleInput(input)
    
    // Direct matches
    const directMatches = {
      'luxury': ['luxury', 'premium', 'high-end', 'finest', 'deluxe', 'upscale', 'exclusive', 'lavish'],
      'budget': ['budget', 'cheap', 'affordable', 'economical', 'low-cost', 'budget-friendly', 'inexpensive'],
      'mid-range': ['mid-range', 'moderate', 'comfortable', 'standard', 'reasonable', 'middle'],
      'mixed': ['mixed', 'flexible', 'combination', 'varied', 'balance', 'bit of both']
    }
    
    for (const [style, synonyms] of Object.entries(directMatches)) {
      if (synonyms.some(synonym => normalized.includes(synonym))) {
        return style
      }
    }
    
    // Phrase matching
    const phrases = {
      'luxury': [
        'splurge on', 'money is no object', 'want the best', 'treat myself',
        'five star', '5 star', 'finest hotels', 'luxury hotels'
      ],
      'budget': [
        'tight budget', 'save money', 'as cheap as possible', 'budget constraints',
        'limited budget', 'need to save', 'can\'t afford'
      ],
      'mid-range': [
        'nice but not expensive', 'good value', 'reasonable price',
        'comfortable but affordable', 'decent hotels', 'good quality'
      ],
      'mixed': [
        'save on some things', 'splurge on dining', 'mix of both',
        'budget hotels but nice restaurants', 'flexible with spending'
      ]
    }
    
    for (const [style, phraseList] of Object.entries(phrases)) {
      if (phraseList.some(phrase => normalized.includes(phrase))) {
        return style
      }
    }
    
    return undefined
  }
  
  // Normalize input for style processing
  private normalizeStyleInput(input: string): string {
    return input.toLowerCase()
      .replace(/[-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }
  
  // Extract constraints (hard vs soft)
  private extractConstraints(input: string): { hard: string[]; soft: string[] } {
    const hard: string[] = []
    const soft: string[] = []
    
    // Hard constraint indicators
    const hardPatterns = [
      /must (be|have|include)/i,
      /need to/i,
      /required/i,
      /can't.*without/i,
      /essential/i
    ]
    
    // Soft constraint indicators  
    const softPatterns = [
      /would like/i,
      /prefer/i,
      /ideally/i,
      /hopefully/i,
      /if possible/i
    ]
    
    const sentences = input.split(/[.!?]/)
    
    for (const sentence of sentences) {
      const isHard = hardPatterns.some(pattern => pattern.test(sentence))
      const isSoft = softPatterns.some(pattern => pattern.test(sentence))
      
      if (isHard) {
        hard.push(sentence.trim())
      } else if (isSoft) {
        soft.push(sentence.trim())
      }
    }
    
    return { hard, soft }
  }
  
  // Normalize extracted entities
  private async normalizeEntities(
    entities: ExtractedEntities, 
    currentBrief: TripBrief
  ): Promise<NormalizedData> {
    
    // Normalize destinations
    const destinations = await Promise.all(
      entities.destinations.map(dest => this.normalizeDestination(dest))
    )
    
    // Normalize dates
    const dates = this.normalizeDates(entities.dates)
    
    // Normalize budget
    const budget = this.normalizeBudget(entities.budget, currentBrief)
    
    // Normalize travelers
    const travelers = this.normalizeTravelers(entities.travelers)
    
    // Normalize preferences
    const preferences = this.normalizePreferences(entities.preferences)
    
    // Normalize constraints
    const constraints = this.normalizeConstraints(entities.constraints)
    
    return {
      destinations,
      dates,
      budget,
      travelers,
      preferences,
      constraints
    }
  }
  
  // Destination normalization with geocoding intent
  private async normalizeDestination(destination: string): Promise<NormalizedDestination> {
    const cleaned = destination.trim().toLowerCase()
    
    // This would integrate with a real geocoding service
    // For now, we'll do basic normalization
    
    const cityMap = {
      'nyc': 'New York',
      'la': 'Los Angeles',
      'sf': 'San Francisco',
      'uk': 'United Kingdom',
      'usa': 'United States'
    }
    
    const normalized = cityMap[cleaned] || destination
    
    return {
      original: destination,
      normalized,
      type: this.inferDestinationType(normalized),
      confidence: 80,
      country: this.inferCountry(normalized),
      alternatives: []
    }
  }
  
  private inferDestinationType(destination: string): 'city' | 'country' | 'region' | 'small-town' | 'village' | 'custom' {
    const countries = ['italy', 'france', 'spain', 'germany', 'united kingdom', 'japan']
    const cities = ['london', 'paris', 'rome', 'new york', 'tokyo']
    
    const lower = destination.toLowerCase()
    
    if (countries.includes(lower)) return 'country'
    if (cities.includes(lower)) return 'city'
    
    return 'custom' // Would need more sophisticated detection
  }
  
  private inferCountry(destination: string): string {
    const cityCountryMap = {
      'london': 'GB',
      'paris': 'FR', 
      'rome': 'IT',
      'new york': 'US',
      'tokyo': 'JP'
    }
    
    return cityCountryMap[destination.toLowerCase()] || 'UNKNOWN'
  }
  
  // Date normalization
  private normalizeDates(dates: any): NormalizedDates {
    const normalized: NormalizedDates = {
      flexibility: 'flexible',
      confidence: 50,
      inferred: false
    }
    
    if (dates.duration) {
      normalized.duration = dates.duration
      normalized.confidence = 90
    }
    
    if (dates.start) {
      normalized.startDate = this.normalizeDate(dates.start)
      normalized.confidence = Math.max(normalized.confidence, 80)
    }
    
    if (dates.end) {
      normalized.endDate = this.normalizeDate(dates.end)
    } else if (normalized.startDate && normalized.duration) {
      // Calculate end date
      const startDate = new Date(normalized.startDate)
      const endDate = new Date(startDate.getTime() + (normalized.duration * 24 * 60 * 60 * 1000))
      normalized.endDate = endDate.toISOString().split('T')[0]
      normalized.inferred = true
    }
    
    return normalized
  }
  
  private normalizeDate(dateStr: string): string {
    // Simple date normalization - would need more robust parsing
    if (dateStr.match(/\d{4}-\d{2}-\d{2}/)) {
      return dateStr // Already ISO format
    }
    
    // Convert MM/DD/YYYY to ISO
    const match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
    if (match) {
      const [, month, day, year] = match
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }
    
    return dateStr // Return as-is if can't parse
  }
  
  // Budget normalization with currency conversion intent
  private normalizeBudget(budget: any, currentBrief: TripBrief): NormalizedBudget {
    const normalized: NormalizedBudget = {
      total: 0,
      currency: 'USD',
      confidence: 50,
      source: 'inferred'
    }
    
    if (budget.amount) {
      normalized.total = budget.amount
      normalized.confidence = 95
      normalized.source = 'explicit'
    }
    
    if (budget.currency) {
      normalized.currency = budget.currency
    }
    
    // Infer budget from level if no explicit amount
    if (!budget.amount && budget.level) {
      const budgetRanges = {
        'budget': { min: 500, max: 1500, default: 1000 },
        'mid-range': { min: 1500, max: 3500, default: 2500 },
        'luxury': { min: 3500, max: 10000, default: 5000 }
      }
      
      const range = budgetRanges[budget.level]
      if (range) {
        normalized.total = range.default
        normalized.confidence = 60
        normalized.source = 'inferred'
      }
    }
    
    return normalized
  }
  
  // Traveler normalization
  private normalizeTravelers(travelers: any): NormalizedTravelers {
    const normalized: NormalizedTravelers = {
      adults: 1,
      groupType: 'solo',
      confidence: 80
    }
    
    if (travelers.adults) {
      normalized.adults = travelers.adults
      normalized.confidence = 95
    }
    
    if (travelers.children) {
      normalized.children = travelers.children
    }
    
    if (travelers.groupType) {
      normalized.groupType = travelers.groupType
    } else {
      // Infer group type from number of adults
      if (normalized.adults === 1) normalized.groupType = 'solo'
      else if (normalized.adults === 2) normalized.groupType = 'couple'
      else normalized.groupType = 'friends'
    }
    
    return normalized
  }
  
  // Preference normalization
  private normalizePreferences(preferences: any): NormalizedPreferences {
    const normalized: NormalizedPreferences = {
      travelStyle: 'mid-range',
      pace: 'moderate',
      accommodation: [],
      activities: [],
      dining: [],
      transport: {},
      confidence: {}
    }
    
    if (preferences.style) {
      normalized.travelStyle = preferences.style
      normalized.confidence.travelStyle = 90
    }
    
    if (preferences.activities) {
      normalized.activities = preferences.activities
      normalized.confidence.activities = 80
    }
    
    return normalized
  }
  
  // Constraint normalization
  private normalizeConstraints(constraints: any): NormalizedConstraints {
    return {
      hard: constraints.hard.map(c => ({ constraint: c, field: 'unknown', value: null })),
      soft: constraints.soft.map(c => ({ constraint: c, field: 'unknown', value: null }))
    }
  }
  
  // Generate context updates for TripBrief
  private generateContextUpdates(
    normalized: NormalizedData,
    currentBrief: TripBrief,
    userMessage: string
  ): Partial<TripBrief> {
    
    const updates: Partial<TripBrief> = {}
    
    // Update destinations
    if (normalized.destinations.length > 0) {
      const primaryDest = normalized.destinations[0]
      updates.destination = {
        ...currentBrief.destination,
        type: primaryDest.type,
        primary: this.updateOrCreateConstraint(
          currentBrief.destination?.primary,
          primaryDest.normalized,
          userMessage,
          primaryDest.confidence
        ),
        country: this.updateOrCreateConstraint(
          currentBrief.destination?.country,
          primaryDest.country,
          userMessage,
          primaryDest.confidence
        )
      }
    }
    
    // Update dates
    if (normalized.dates.duration || normalized.dates.startDate) {
      updates.dates = {
        ...currentBrief.dates,
        duration: normalized.dates.duration ? 
          this.updateOrCreateConstraint(
            currentBrief.dates?.duration,
            normalized.dates.duration,
            userMessage,
            normalized.dates.confidence
          ) : currentBrief.dates?.duration,
        startDate: normalized.dates.startDate ?
          this.updateOrCreateConstraint(
            currentBrief.dates?.startDate,
            normalized.dates.startDate,
            userMessage,
            normalized.dates.confidence
          ) : currentBrief.dates?.startDate,
        flexibility: this.updateOrCreateConstraint(
          currentBrief.dates?.flexibility,
          normalized.dates.flexibility,
          userMessage,
          normalized.dates.confidence
        )
      }
    }
    
    // Update budget
    if (normalized.budget.total > 0) {
      updates.budget = {
        ...currentBrief.budget,
        total: this.updateOrCreateConstraint(
          currentBrief.budget?.total,
          normalized.budget.total,
          userMessage,
          normalized.budget.confidence
        ),
        currency: this.updateOrCreateConstraint(
          currentBrief.budget?.currency,
          normalized.budget.currency,
          userMessage,
          normalized.budget.confidence
        )
      }
    }
    
    // Update travelers
    if (normalized.travelers.adults) {
      updates.travelers = {
        ...currentBrief.travelers,
        adults: this.updateOrCreateConstraint(
          currentBrief.travelers?.adults,
          normalized.travelers.adults,
          userMessage,
          normalized.travelers.confidence
        ),
        groupType: this.updateOrCreateConstraint(
          currentBrief.travelers?.groupType,
          normalized.travelers.groupType,
          userMessage,
          normalized.travelers.confidence
        )
      }
    }
    
    // Update preferences
    if (normalized.preferences.travelStyle) {
      updates.preferences = {
        ...currentBrief.preferences,
        travelStyle: this.updateOrCreateConstraint(
          currentBrief.preferences?.travelStyle,
          normalized.preferences.travelStyle,
          userMessage,
          normalized.preferences.confidence.travelStyle || 80
        )
      }
    }
    
    return updates
  }
  
  // Helper to update or create constraints
  private updateOrCreateConstraint<T>(
    existing: Constraint<T> | undefined,
    newValue: T,
    userMessage: string,
    confidence: number
  ): Constraint<T> {
    
    if (existing) {
      return updateConstraint(existing, newValue, userMessage, confidence)
    } else {
      return createConstraint(newValue, 'soft', confidence, 'explicit')
    }
  }
  
  // Identify what needs confirmation
  private identifyConfirmationNeeds(
    normalized: NormalizedData,
    currentBrief: TripBrief
  ): PendingConfirmation[] {
    
    const confirmations: PendingConfirmation[] = []
    
    // Check for ambiguous destinations
    for (const dest of normalized.destinations) {
      if (dest.confidence < 70) {
        confirmations.push({
          id: `dest-confirm-${Date.now()}`,
          field: 'destination.primary',
          proposedValue: dest.normalized,
          currentValue: currentBrief.destination?.primary?.value,
          question: `Did you mean "${dest.normalized}"? I found a few possibilities.`,
          priority: 'high',
          createdAt: new Date()
        })
      }
    }
    
    // Check for inferred vs explicit data
    if (normalized.dates.inferred) {
      confirmations.push({
        id: `dates-confirm-${Date.now()}`,
        field: 'dates.endDate',
        proposedValue: normalized.dates.endDate,
        currentValue: currentBrief.dates?.endDate?.value,
        question: `I calculated your end date as ${normalized.dates.endDate} based on ${normalized.dates.duration} days. Is this correct?`,
        priority: 'medium',
        createdAt: new Date()
      })
    }
    
    return confirmations
  }
  
  // Determine if research is needed
  private determineResearchNeeds(
    normalized: NormalizedData,
    intent: DetectedIntent,
    currentBrief: TripBrief
  ): { needsResearch: boolean; researchQuery?: string } {
    
    // Research needed for unknown destinations
    for (const dest of normalized.destinations) {
      if (dest.type === 'custom' || dest.confidence < 80) {
        return {
          needsResearch: true,
          researchQuery: `Research destination: ${dest.original}`
        }
      }
    }
    
    // Research needed for small towns/villages
    for (const dest of normalized.destinations) {
      if (dest.type === 'small-town' || dest.type === 'village') {
        return {
          needsResearch: true,
          researchQuery: `Research ${dest.type}: ${dest.normalized}`
        }
      }
    }
    
    return { needsResearch: false }
  }
  
  // Calculate overall confidence
  private calculateOverallConfidence(intent: DetectedIntent, normalized: NormalizedData): number {
    const scores = [intent.confidence]
    
    for (const dest of normalized.destinations) {
      scores.push(dest.confidence)
    }
    
    scores.push(normalized.dates.confidence)
    scores.push(normalized.budget.confidence)
    scores.push(normalized.travelers.confidence)
    
    return scores.reduce((sum, score) => sum + score, 0) / scores.length
  }
  
  // Helper methods
  private cleanInput(input: string): string {
    return input.trim().replace(/\s+/g, ' ')
  }
  
  private matchesPattern(text: string, patterns: RegExp[]): boolean {
    return patterns.some(pattern => pattern.test(text))
  }
  
  // Initialize synonym maps
  private initializeSynonymMaps(): void {
    this.synonymMap.set('budget', ['cheap', 'affordable', 'economical', 'budget-friendly'])
    this.synonymMap.set('luxury', ['premium', 'high-end', 'deluxe', 'upscale'])
    this.synonymMap.set('mid-range', ['moderate', 'comfortable', 'standard'])
    // Add more synonym mappings...
  }
  
  // Initialize intent patterns
  private initializeIntentPatterns(): void {
    this.intentPatterns.set('destination', [
      /visit|go to|travel to|trip to/i,
      /want to see|planning to visit/i
    ])
    // Add more patterns...
  }
  
  // Initialize entity extractors
  private initializeEntityExtractors(): void {
    // This would be expanded with more sophisticated extractors
    this.entityExtractors.set('currency', (text: string) => {
      const match = text.match(/[$£€¥](\d+)/)
      return match ? { amount: parseInt(match[1]), symbol: match[0][0] } : null
    })
  }
}