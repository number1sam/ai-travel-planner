// Service layer for managing persistent conversation state
// This is the single source of truth for trip planning state

// Enhanced multi-city trip state model
export interface TripState {
  destination: {
    value: string
    filled: boolean
    locked: boolean
    normalized: string // Canonical form for searches
    type?: 'city' | 'country' | 'region' | 'multi-city' | 'comprehensive-tour' | 'unknown'
    tripScope?: {
      scope: 'single' | 'multi' | 'regional' | 'comprehensive' | 'cross-border'
      detectedCities?: string[]
      estimatedDuration?: {min: number, max: number}
      routeType?: 'linear' | 'circular' | 'hub-and-spoke'
    }
  }
  multiCityPlan?: {
    cities: Array<{
      name: string
      country: string
      nights: number
      priority: 'primary' | 'secondary' | 'optional'
      position: number // order in route
    }>
    route: {
      sequence: string[]
      totalDays: number
      routeType: 'linear' | 'circular' | 'hub-and-spoke'
    }
    transport: Array<{
      from: string
      to: string
      method: 'flight' | 'train' | 'bus' | 'car' | 'ferry'
      duration: string
      estimatedCost: number
    }>
    confirmed: boolean
  }
  origin: {
    value: string
    filled: boolean
    locked: boolean
    normalized: string
  }
  dates: {
    startDate: string // ISO format
    endDate: string   // ISO format
    originalPhrase: string
    filled: boolean
    locked: boolean
    bookingTimeline?: {
      daysUntilTravel: number
      category: 'last-minute' | 'short-notice' | 'advance' | 'far-advance'
      strategy: string
    }
  }
  travelers: {
    value: number
    filled: boolean
    locked: boolean
  }
  budget: {
    value: number
    currency: string
    filled: boolean
    locked: boolean
    distribution?: Array<{
      category: 'accommodation' | 'transport' | 'activities' | 'food' | 'misc'
      amount: number
      percentage: number
    }>
  }
  expectedSlot: 'destination' | 'destination-scope' | 'route-confirmation' | 'origin' | 'dates' | 'dates-confirm' | 'travelers' | 'budget' | 'preferences-or-create' | 'complete'
  conversationId: string
  lastUpdated: string
}

export interface StateUpdateResult {
  success: boolean
  confirmation?: string
  locked?: boolean
  nextSlot?: string
  state: TripState
  message?: string
  needsClarification?: boolean
}

class ConversationStateService {
  private baseUrl = '/api/conversation-state'
  
  // Get current state - creates if doesn't exist
  async getState(conversationId: string): Promise<TripState> {
    try {
      const response = await fetch(`${this.baseUrl}?conversationId=${conversationId}`)
      if (!response.ok) {
        throw new Error('Failed to get state')
      }
      
      const data = await response.json()
      return data.state
    } catch (error) {
      console.error('Failed to get conversation state:', error)
      throw error
    }
  }
  
  // Update a slot with validation and normalization
  async updateSlot(
    conversationId: string, 
    slot: string, 
    value: string, 
    explicitChange = false
  ): Promise<StateUpdateResult> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId,
          slot,
          value,
          explicitChange
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to update state')
      }
      
      return await response.json()
    } catch (error) {
      console.error('Failed to update conversation state:', error)
      throw error
    }
  }
  
  // Check if all required slots are filled for hotel search
  canSearchHotels(state: TripState): { canSearch: boolean, missing: string[] } {
    const required = ['destination', 'dates']
    const missing: string[] = []
    
    if (!state.destination.filled || !state.destination.locked) {
      missing.push('destination')
    }
    
    if (!state.dates.filled || !state.dates.locked) {
      missing.push('travel dates')
    }
    
    return {
      canSearch: missing.length === 0,
      missing
    }
  }
  
  // Check if all required slots are filled for activity search
  canSearchActivities(state: TripState): { canSearch: boolean, missing: string[] } {
    const missing: string[] = []
    
    if (!state.destination.filled || !state.destination.locked) {
      missing.push('destination')
    }
    
    if (!state.dates.filled || !state.dates.locked) {
      missing.push('travel dates')
    }
    
    return {
      canSearch: missing.length === 0,
      missing
    }
  }
  
  // Detect explicit change requests - ONLY these exact phrases can unlock slots
  detectChangeIntent(message: string): { hasIntent: boolean, slot?: string, value?: string } {
    // These are the ONLY patterns that can change locked slots
    const exactChangePatterns = [
      { pattern: /^change destination to (.+)$/i, slot: 'destination' },
      { pattern: /^switch destination to (.+)$/i, slot: 'destination' },
      { pattern: /^update destination to (.+)$/i, slot: 'destination' },
      { pattern: /^i want to change destination to (.+)$/i, slot: 'destination' },
      { pattern: /^change origin to (.+)$/i, slot: 'origin' },
      { pattern: /^change departure to (.+)$/i, slot: 'origin' },
      { pattern: /^change dates to (.+)$/i, slot: 'dates' },
      { pattern: /^update dates to (.+)$/i, slot: 'dates' },
      { pattern: /^change budget to (.+)$/i, slot: 'budget' },
      { pattern: /^update budget to (.+)$/i, slot: 'budget' },
      { pattern: /^change travelers to (.+)$/i, slot: 'travelers' },
      { pattern: /^change number of travelers to (.+)$/i, slot: 'travelers' },
    ]
    
    const trimmedMessage = message.trim()
    
    for (const { pattern, slot } of exactChangePatterns) {
      const match = trimmedMessage.match(pattern)
      if (match) {
        return {
          hasIntent: true,
          slot,
          value: match[1].trim()
        }
      }
    }
    
    return { hasIntent: false }
  }
  
  // Process user message and determine what to extract based on expected slot
  async processMessage(
    conversationId: string, 
    message: string, 
    currentState: TripState
  ): Promise<StateUpdateResult> {
    
    // First check for explicit change intent
    const changeIntent = this.detectChangeIntent(message)
    if (changeIntent.hasIntent && changeIntent.slot && changeIntent.value) {
      return this.updateSlot(conversationId, changeIntent.slot, changeIntent.value, true)
    }
    
    // Process based on expected slot
    const slot = currentState.expectedSlot
    
    if (slot === 'complete') {
      return {
        success: true,
        confirmation: "I have all the information I need. Let me create your itinerary!",
        state: currentState
      }
    }
    
    if (slot === 'preferences-or-create') {
      // For this slot, we always pass the message through to be processed
      return this.updateSlot(conversationId, slot, message, false)
    }
    
    if (slot === 'dates-confirm') {
      // Handle date confirmation
      return this.updateSlot(conversationId, slot, message, false)
    }
    
    // Extract value based on what we're expecting
    let extractedValue = ''
    
    switch (slot) {
      case 'destination':
        extractedValue = this.extractDestination(message)
        break
      case 'origin':
        extractedValue = this.extractOrigin(message, currentState)
        break
      case 'dates':
        extractedValue = this.extractDates(message)
        break
      case 'travelers':
        extractedValue = this.extractTravelers(message)
        break
      case 'budget':
        extractedValue = this.extractBudget(message)
        break
    }
    
    if (extractedValue) {
      return this.updateSlot(conversationId, slot, extractedValue, false)
    } else {
      return {
        success: false,
        message: this.getPromptForSlot(slot, currentState),
        state: currentState
      }
    }
  }
  
  // Extract destination from message
  private extractDestination(message: string): string {
    // Common cities and destinations
    const destinations = [
      'paris', 'london', 'tokyo', 'new york', 'rome', 'barcelona', 
      'amsterdam', 'berlin', 'prague', 'vienna', 'madrid', 'lisbon',
      'athens', 'dublin', 'stockholm', 'copenhagen', 'brussels',
      'florence', 'venice', 'milan', 'naples', 'seville', 'valencia',
      'sydney', 'melbourne', 'toronto', 'vancouver', 'miami', 'chicago',
      'boston', 'seattle', 'san francisco', 'los angeles', 'las vegas',
      // Also include countries that will trigger clarification
      'usa', 'america', 'united states', 'australia', 'canada', 'china',
      'india', 'brazil', 'russia', 'germany', 'france', 'italy', 'spain',
      'uk', 'united kingdom', 'japan', 'mexico'
    ]
    
    const lowerMessage = message.toLowerCase()
    
    // Check for exact destination matches (cities or countries)
    for (const dest of destinations) {
      if (lowerMessage.includes(dest)) {
        return dest
      }
    }
    
    // Look for capitalized words that might be places
    const words = message.split(' ')
    for (const word of words) {
      if (word.length > 3 && /^[A-Z][a-z]+$/.test(word)) {
        return word
      }
    }
    
    return ''
  }
  
  // Extract origin - ONLY when we're expecting origin slot
  private extractOrigin(message: string, state: TripState): string {
    // Critical: Only extract origin if we're expecting origin AND destination is locked
    if (state.expectedSlot !== 'origin' || !state.destination.locked) {
      return ''
    }
    
    const cities = [
      'paris', 'london', 'tokyo', 'new york', 'rome', 'barcelona', 
      'amsterdam', 'berlin', 'prague', 'vienna', 'madrid', 'lisbon',
      'athens', 'dublin', 'stockholm', 'copenhagen', 'brussels',
      'florence', 'venice', 'milan', 'naples', 'seville', 'valencia'
    ]
    
    const lowerMessage = message.toLowerCase()
    
    // Check for exact city matches
    for (const city of cities) {
      if (lowerMessage.includes(city)) {
        // Ensure it's different from the locked destination
        if (city.toLowerCase() !== state.destination.normalized.toLowerCase()) {
          return city
        }
      }
    }
    
    // Look for capitalized words that might be places
    const words = message.split(' ')
    for (const word of words) {
      if (word.length > 3 && /^[A-Z][a-z]+$/.test(word)) {
        // Ensure it's different from the locked destination
        if (word.toLowerCase() !== state.destination.normalized.toLowerCase()) {
          return word
        }
      }
    }
    
    return ''
  }
  
  // Extract date phrases - keep original phrasing
  private extractDates(message: string): string {
    // Look for date-like patterns and return the phrase
    const datePatterns = [
      /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/,
      /\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*/i,
      /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2}/i,
      /\d+\s+(day|week|month)s?/i,
      /(first|last)\s+week\s+of\s+\w+/i,
      /\w+\s+\d{1,2}-\d{1,2}/i,
      /\d{1,2}-\d{1,2}\s+\w+/i
    ]
    
    for (const pattern of datePatterns) {
      const match = message.match(pattern)
      if (match) {
        return match[0]
      }
    }
    
    return ''
  }
  
  // Extract number of travelers
  private extractTravelers(message: string): string {
    const numberMatch = message.match(/(\d+)/)
    if (numberMatch) {
      const num = parseInt(numberMatch[1])
      if (num > 0 && num <= 20) {
        return num.toString()
      }
    }
    
    // Handle text numbers
    const textNumbers: Record<string, string> = {
      'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
      'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10'
    }
    
    const lowerMessage = message.toLowerCase()
    for (const [text, num] of Object.entries(textNumbers)) {
      if (lowerMessage.includes(text)) {
        return num
      }
    }
    
    return ''
  }
  
  // Extract budget amount
  private extractBudget(message: string): string {
    const budgetMatch = message.match(/[\$£€]?(\d+(?:,\d{3})*(?:\.\d{2})?)/)
    if (budgetMatch) {
      return budgetMatch[0]
    }
    
    return ''
  }
  
  // Get appropriate prompt for current slot
  private getPromptForSlot(slot: string, state: TripState): string {
    switch (slot) {
      case 'destination':
        return "Where would you like to go? Please tell me your destination."
      case 'origin':
        return `What city will you be departing from to get to ${state.destination.normalized || 'your destination'}?`
      case 'dates':
        return "When would you like to travel? You can say things like 'March 15-22' or '10 days starting March 15'."
      case 'dates-confirm':
        return "Please confirm if the dates I understood are correct, or let me know the right dates."
      case 'travelers':
        return "How many people will be traveling?"
      case 'budget':
        return "What's your approximate budget for this trip? (e.g., '$3000')"
      case 'preferences-or-create':
        return "Would you like to add any preferences, or shall I create your itinerary? Say 'create my plan' when ready!"
      default:
        return "Let me know what you'd like to plan for your trip!"
    }
  }
}

// Singleton instance
export const conversationStateService = new ConversationStateService()