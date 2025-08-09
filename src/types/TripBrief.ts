// Comprehensive Trip Brief Data Model
// This is the "living document" that captures the entire conversation and user preferences
// Following the specification: structured brief that's a single source of truth

export type ConstraintType = 'hard' | 'soft'
export type ConstraintChange = {
  timestamp: Date
  oldValue: any
  newValue: any
  userMessage: string
  confirmed: boolean
}

export interface Constraint<T> {
  value: T
  type: ConstraintType
  confidence: number // 0-100, how confident we are about this
  source: 'explicit' | 'inferred' | 'normalized' // How we got this value
  changes: ConstraintChange[] // Track all changes for transparency
  lastConfirmed?: Date
}

// Enhanced Destination with geospatial understanding
export interface TripDestination {
  type: 'city' | 'country' | 'region' | 'small-towns' | 'villages' | 'custom'
  primary: Constraint<string> // Main destination (geocoded)
  secondary?: Constraint<string[]> // Additional places
  coordinates?: Constraint<{ lat: number; lng: number; accuracy: 'exact' | 'approximate' }>
  country: Constraint<string> // ISO country code
  timezone: Constraint<string> // IANA timezone
  nearbyMajorCity?: Constraint<string> // For small towns/villages
  preferences?: Constraint<string> // User's exact description
  avoidances?: Constraint<string[]> // Places/areas to avoid
  researched?: ResearchedDestination[]
}

// Enhanced Travel Dates with flexibility
export interface TripDates {
  startDate?: Constraint<string> // ISO date or "flexible"
  endDate?: Constraint<string> // ISO date or computed from duration
  duration: Constraint<number> // Days
  flexibility: Constraint<'exact' | 'plus-minus-1' | 'plus-minus-2' | 'flexible'>
  preferences?: {
    departureTime?: Constraint<'early-morning' | 'morning' | 'afternoon' | 'evening'>
    returnTime?: Constraint<'early-morning' | 'morning' | 'afternoon' | 'evening'>
    avoidDates?: Constraint<string[]> // ISO dates to avoid
    preferDates?: Constraint<string[]> // ISO dates to prefer
  }
}

// Enhanced Budget with detailed constraints
export interface TripBudget {
  total: Constraint<number>
  currency: Constraint<string> // ISO currency code
  perDay?: Constraint<number> // Calculated or specified
  breakdown?: {
    accommodation: Constraint<{ min: number; max: number; preferred: number }>
    transport: Constraint<{ min: number; max: number; preferred: number }>
    activities: Constraint<{ min: number; max: number; preferred: number }>
    food: Constraint<{ min: number; max: number; preferred: number }>
    misc: Constraint<{ min: number; max: number; preferred: number }>
  }
  perMealLimits?: {
    breakfast: Constraint<number>
    lunch: Constraint<number>
    dinner: Constraint<number>
  }
  hardLimits?: {
    noCostAbove?: Constraint<number> // Absolute ceiling
    accommodationCap?: Constraint<number> // Per night
    activityCap?: Constraint<number> // Per activity
  }
}

// Enhanced Travelers with profiles
export interface TripTravelers {
  adults: Constraint<number>
  children?: Constraint<number>
  ages?: Constraint<number[]> // For activities/accommodation suitability
  groupType: Constraint<'solo' | 'couple' | 'family' | 'friends' | 'business' | 'mixed'>
  profiles?: TravelerProfile[]
}

export interface TravelerProfile {
  id: string
  age?: number
  mobility?: 'full' | 'limited' | 'wheelchair' | 'assistance-needed'
  dietary?: string[] // Restrictions and preferences
  interests?: string[]
  travelExperience?: 'first-time' | 'experienced' | 'expert'
}

// Enhanced Preferences with detailed constraints
export interface TripPreferences {
  travelStyle: Constraint<'luxury' | 'mid-range' | 'budget' | 'mixed'>
  pace: Constraint<'slow' | 'moderate' | 'fast'>
  
  accommodation: {
    types?: Constraint<string[]> // hotel, apartment, hostel, etc.
    amenities?: Constraint<string[]> // required amenities
    location?: Constraint<'city-center' | 'near-transport' | 'quiet' | 'near-attractions'>
    rating?: Constraint<{ min: number; preferred?: number }>
    policies?: Constraint<{ freeCancellation?: boolean; breakfastIncluded?: boolean }>
  }
  
  activities: {
    themes?: Constraint<string[]> // History, nature, food, etc.
    intensity?: Constraint<'low' | 'moderate' | 'high'>
    group?: Constraint<'private' | 'small-group' | 'large-group' | 'no-preference'>
    timing?: Constraint<'morning' | 'afternoon' | 'evening' | 'flexible'>
    avoid?: Constraint<string[]> // Activity types to avoid
  }
  
  dining: {
    dietary?: Constraint<string[]> // vegetarian, vegan, gluten-free, etc.
    cuisines?: Constraint<{ preferred: string[]; avoid: string[] }>
    atmosphere?: Constraint<'casual' | 'upscale' | 'local' | 'tourist-friendly' | 'mixed'>
    experience?: Constraint<'street-food' | 'fine-dining' | 'cooking-class' | 'food-tours' | 'mixed'>
  }
  
  transport: {
    flightPreferences?: {
      airports?: Constraint<{ origin: string[]; destination: string[] }> // IATA codes
      airlines?: Constraint<{ preferred: string[]; avoid: string[] }>
      stops?: Constraint<'direct-only' | 'one-stop-ok' | 'any'>
      cabinClass?: Constraint<'economy' | 'premium-economy' | 'business' | 'first'>
      timing?: Constraint<{ avoid: string[]; prefer: string[] }> // time ranges
    }
    
    localTransport?: {
      modes?: Constraint<string[]> // public, taxi, rideshare, rental-car, walking
      avoid?: Constraint<string[]> // modes to avoid
      walkingTolerance?: Constraint<number> // max minutes willing to walk
      comfortLevel?: Constraint<'basic' | 'comfortable' | 'luxury'>
    }
  }
}

// Trip Context - what user is currently trying to achieve
export interface TripIntent {
  current: 'exploring' | 'planning' | 'booking' | 'reviewing' | 'generating_itinerary'
  nextExpected?: string // What information we need next
  confidence: number // How confident we are about the intent
  context?: string // Additional context about the intent
}

// Enhanced Trip Brief - the living document
export interface TripBrief {
  id: string
  version: number // Incremented on each update
  
  // Core trip elements
  destination?: TripDestination
  origin: Constraint<string> // Geocoded departure location
  dates?: TripDates
  budget?: TripBudget
  travelers?: TripTravelers
  preferences?: TripPreferences
  
  // Intent and flow
  intent: TripIntent
  
  // Constraints and rules
  hardConstraints: string[] // Non-negotiable requirements
  softConstraints: string[] // Tradeable preferences
  
  // Conversation tracking
  conversationSummary: string
  decisionsLog: TripDecision[] // All decisions made with reasoning
  pendingConfirmations: PendingConfirmation[] // Things waiting for user confirmation
  
  // Research and validation
  researchNeeded: string[] // What still needs to be researched
  validationErrors: string[] // Current issues that prevent booking
  
  // Metadata
  createdAt: Date
  lastUpdated: Date
  lastUserMessage: string
  totalMessages: number
}

export interface TripDecision {
  id: string
  timestamp: Date
  field: string // Which field was decided
  value: any
  reasoning: string // Why this decision was made
  userMessage: string // The message that led to this decision
  confidence: number
  needsConfirmation: boolean
}

export interface PendingConfirmation {
  id: string
  field: string
  proposedValue: any
  currentValue: any
  question: string // What to ask the user
  priority: 'low' | 'medium' | 'high'
  createdAt: Date
}

// Research results
export interface ResearchedDestination {
  name: string
  type: 'small-town' | 'village' | 'region' | 'area' | 'city' | 'attraction'
  country: string
  region?: string
  coordinates?: { lat: number; lng: number }
  description: string
  highlights: string[]
  activities: string[]
  budgetLevel: 'budget' | 'mid-range' | 'luxury' | 'mixed'
  accessibility: string
  bestFor: string[]
  nearbyTo?: string // Major city it's near
  travelTime?: string // From major transport hub
  confidence: number // Research confidence score 0-100
  sources: string[] // Where this information came from
  lastResearched: Date
}

// Utility types for constraint operations
export type ConstraintUpdate<T> = {
  field: keyof TripBrief
  value: T
  type: ConstraintType
  confidence: number
  source: 'explicit' | 'inferred' | 'normalized'
  userMessage: string
}

// Export helper functions
export const createConstraint = <T>(
  value: T,
  type: ConstraintType = 'soft',
  confidence: number = 80,
  source: 'explicit' | 'inferred' | 'normalized' = 'explicit'
): Constraint<T> => ({
  value,
  type,
  confidence,
  source,
  changes: []
})

export const updateConstraint = <T>(
  constraint: Constraint<T>,
  newValue: T,
  userMessage: string,
  confidence?: number
): Constraint<T> => ({
  ...constraint,
  value: newValue,
  confidence: confidence ?? constraint.confidence,
  changes: [
    ...constraint.changes,
    {
      timestamp: new Date(),
      oldValue: constraint.value,
      newValue,
      userMessage,
      confirmed: false
    }
  ]
})