// Unified Conversation Manager - Single source of truth for all conversation state
// This replaces multiple fragmented conversation handlers with one intelligent system
// Maintains full ChatGPT-like context awareness throughout the entire conversation

export interface ConversationMessage {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  metadata?: {
    extractedInfo?: any
    researchTriggered?: boolean
    destinationsResearched?: string[]
  }
}

export interface TripContext {
  // Core trip details
  destination?: {
    type: 'city' | 'region' | 'country' | 'small-towns' | 'villages' | 'custom'
    primary: string // Main destination
    secondary?: string[] // Additional places
    researched?: ResearchedDestination[] // Web-researched places
    preferences?: string // User's exact description
  }
  origin?: string
  dates?: {
    start?: string
    end?: string
    duration?: number
    flexibility?: 'exact' | 'flexible' | 'very-flexible'
  }
  budget?: {
    total: number
    currency: string
    breakdown?: {
      accommodation: number
      transport: number
      activities: number
      food: number
      misc: number
    }
  }
  travelers?: {
    adults: number
    children?: number
    groupType?: 'solo' | 'couple' | 'family' | 'friends' | 'business'
  }
  preferences?: {
    pace?: 'slow' | 'moderate' | 'fast'
    style?: 'luxury' | 'mid-range' | 'budget' | 'mixed'
    styleLocked?: boolean
    interests?: string[]
    accommodation?: string[]
  }
  currentIntent?: string // What user is currently trying to achieve
  nextExpected?: string // What information we need next
}

export interface ResearchedDestination {
  name: string
  type: 'small-town' | 'village' | 'region' | 'area'
  country: string
  region?: string
  description: string
  highlights: string[]
  activities: string[]
  budgetLevel: 'budget' | 'mid-range' | 'luxury' | 'mixed'
  accessibility: string
  bestFor: string[]
  nearbyTo?: string // Major city it's near
  travelTime?: string // From major transport hub
  confidence: number // Research confidence score 0-100
}

class UnifiedConversationManager {
  private conversationHistory: ConversationMessage[] = []
  private tripContext: TripContext = {}
  private conversationId: string
  private researchService: any // Will be injected
  
  constructor(conversationId: string) {
    this.conversationId = conversationId
  }
  
  // Set the research service (dependency injection)
  setResearchService(researchService: any) {
    this.researchService = researchService
  }
  
  // Add message to conversation history - NEVER loses context
  addMessage(content: string, role: 'user' | 'assistant', metadata?: any): ConversationMessage {
    const message: ConversationMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content,
      role,
      timestamp: new Date(),
      metadata
    }
    
    this.conversationHistory.push(message)
    return message
  }
  
  // Get full conversation context - like ChatGPT memory
  getFullContext(): {
    messages: ConversationMessage[]
    tripContext: TripContext
    conversationSummary: string
  } {
    return {
      messages: this.conversationHistory,
      tripContext: this.tripContext,
      conversationSummary: this.generateContextSummary()
    }
  }

  // Update trip context with new information (used for persistence recovery)
  updateTripContext(updates: Partial<TripContext>): void {
    this.tripContext = {
      ...this.tripContext,
      ...updates,
      // Deep merge nested objects
      destination: { ...this.tripContext.destination, ...updates.destination },
      dates: { ...this.tripContext.dates, ...updates.dates },
      budget: { ...this.tripContext.budget, ...updates.budget },
      travelers: { ...this.tripContext.travelers, ...updates.travelers },
      preferences: { 
        ...this.tripContext.preferences, 
        ...updates.preferences,
        accommodation: updates.preferences?.accommodation || this.tripContext.preferences?.accommodation,
        interests: updates.preferences?.interests || this.tripContext.preferences?.interests,
        accessibility: updates.preferences?.accessibility || this.tripContext.preferences?.accessibility,
        dietary: updates.preferences?.dietary || this.tripContext.preferences?.dietary
      }
    }
  }
  
  // Generate conversation summary for AI context
  private generateContextSummary(): string {
    if (this.conversationHistory.length === 0) return "New conversation started."
    
    const userMessages = this.conversationHistory.filter(m => m.role === 'user').map(m => m.content)
    const context = this.tripContext
    
    let summary = "Conversation context:\n"
    
    if (context.destination) {
      summary += `- Destination interest: ${context.destination.preferences || context.destination.primary}\n`
      if (context.destination.researched?.length) {
        summary += `- Researched places: ${context.destination.researched.map(d => d.name).join(', ')}\n`
      }
    }
    
    if (context.budget) {
      summary += `- Budget: ${context.budget.currency}${context.budget.total}\n`
    }
    
    if (context.dates) {
      summary += `- Travel timeframe: ${context.dates.duration} days\n`
    }
    
    if (context.travelers) {
      summary += `- Travelers: ${context.travelers.adults} adults\n`
    }
    
    if (userMessages.length > 0) {
      summary += `- Recent user requests: ${userMessages.slice(-3).join('; ')}\n`
    }
    
    return summary
  }
  
  // Process user input with full context awareness
  async processUserInput(userInput: string): Promise<{
    response: string
    needsResearch: boolean
    researchQuery?: string
    contextUpdates: Partial<TripContext>
  }> {
    // Handle system messages
    if (userInput.startsWith('SYSTEM_')) {
      return this.handleSystemMessage(userInput)
    }
    
    // Add user message to history
    this.addMessage(userInput, 'user')
    
    // Analyze input with full conversation context
    const analysis = await this.analyzeUserIntent(userInput)
    
    // Update trip context
    this.updateTripContext(analysis.contextUpdates)
    
    // Determine if research is needed
    if (analysis.needsResearch) {
      console.log(`🔍 Research triggered for: ${analysis.researchQuery}`)
      
      // Perform research
      const researchResults = await this.researchService?.researchDestinations(
        analysis.researchQuery,
        this.tripContext
      )
      
      if (researchResults) {
        // Store research results in context
        this.tripContext.destination = {
          ...this.tripContext.destination,
          researched: researchResults,
          type: 'custom'
        }
        
        // Generate response incorporating research
        analysis.response = await this.generateResponseWithResearch(userInput, researchResults)
        analysis.needsResearch = false // Mark as completed
      }
    }
    
    // Add assistant response to history
    this.addMessage(analysis.response, 'assistant', {
      extractedInfo: analysis.contextUpdates,
      researchTriggered: analysis.needsResearch,
      destinationsResearched: this.tripContext.destination?.researched?.map(d => d.name)
    })
    
    return analysis
  }
  
  // Analyze user intent with structured question flow + research capability
  private async analyzeUserIntent(input: string): Promise<{
    response: string
    needsResearch: boolean
    researchQuery?: string
    contextUpdates: Partial<TripContext>
  }> {
    const lowerInput = input.toLowerCase()
    const contextUpdates: Partial<TripContext> = {}
    
    // Handle currency clarification responses FIRST (before other extractions)
    if (this.tripContext.budget?.currency === 'PENDING') {
      const currencyResponse = this.extractCurrencyFromResponse(input)
      if (currencyResponse) {
        contextUpdates.budget = {
          total: this.tripContext.budget.total,
          currency: currencyResponse,
          pendingClarification: false
        }
        
        // Return immediately with currency update and continue with flow
        const response = this.generateStructuredResponse(input, contextUpdates)
        return {
          response,
          needsResearch: false,
          contextUpdates
        }
      }
    }
    
    // Extract trip details (like original system)
    this.extractTripDetails(input, contextUpdates)
    
    // Check if user provided information we already have (redundant input)
    const redundantInfo = this.checkForRedundantInformation(input, contextUpdates)
    if (redundantInfo) {
      return {
        response: redundantInfo,
        needsResearch: false,
        contextUpdates: {} // Don't update context for redundant info
      }
    }
    
    // Check if user is asking for small places that need research
    const needsSmallPlaceResearch = this.checkIfNeedsDestinationResearch(input)
    const locationKeywords = this.extractLocationKeywords(input)
    
    if (needsSmallPlaceResearch && locationKeywords.length > 0) {
      // User wants small places - trigger research BUT maintain flow
      const researchQuery = this.buildResearchQuery(input, locationKeywords[0])
      
      contextUpdates.destination = {
        type: 'small-towns',
        preferences: input,
        primary: locationKeywords[0]
      }
      
      return {
        response: `Researching charming small towns in ${locationKeywords[0]}...`,
        needsResearch: true,
        researchQuery,
        contextUpdates
      }
    }
    
    // Otherwise, use structured question flow (like original)
    // Note: context will be updated in processUserInput after this returns
    const response = this.generateStructuredResponse(input, contextUpdates)
    
    return {
      response,
      needsResearch: false,
      contextUpdates
    }
  }
  
  // Check if destination research is needed
  private checkIfNeedsDestinationResearch(input: string): boolean {
    const smallPlacePatterns = [
      /small (?:charming )?towns?/i,
      /villages?/i,
      /countryside/i,
      /rural areas?/i,
      /hidden gems/i,
      /off the beaten path/i,
      /traditional places/i,
      /authentic (?:towns?|villages?)/i,
      /group of.*(?:towns?|villages?)/i
    ]
    
    return smallPlacePatterns.some(pattern => pattern.test(input))
  }
  
  // Extract location keywords from input
  private extractLocationKeywords(input: string): string[] {
    const locations = []
    
    // Major countries
    const countries = [
      'england', 'scotland', 'wales', 'ireland', 'france', 'italy', 'spain', 'germany',
      'portugal', 'greece', 'turkey', 'croatia', 'austria', 'switzerland', 'netherlands',
      'belgium', 'czech republic', 'poland', 'hungary', 'norway', 'sweden', 'denmark'
    ]
    
    const lowerInput = input.toLowerCase()
    
    for (const country of countries) {
      if (lowerInput.includes(country)) {
        locations.push(country.charAt(0).toUpperCase() + country.slice(1))
      }
    }
    
    return locations
  }
  
  // Build research query for web search
  private buildResearchQuery(userInput: string, location: string): string {
    const budget = this.tripContext.budget?.total
    const duration = this.tripContext.dates?.duration
    
    let query = `best small charming towns villages in ${location}`
    
    if (budget) {
      if (budget < 1000) query += ' budget travel'
      else if (budget > 5000) query += ' luxury travel'
      else query += ' mid-range travel'
    }
    
    if (duration) {
      if (duration <= 3) query += ' weekend trip'
      else if (duration >= 7) query += ' week-long trip'
    }
    
    query += ' tourist attractions activities accommodation'
    
    return query
  }
  
  // Extract trip details from input
  private extractTripDetails(input: string, updates: Partial<TripContext>) {
    const lowerInput = input.toLowerCase()
    
    // Budget extraction with currency validation - improved patterns
    const budgetWithCurrencyMatch = input.match(/([\$£€])\s*(\d{1,6}(?:,\d{3})*(?:\.\d{2})?)/g)
    const budgetNumberOnlyMatch = input.match(/\b(\d{1,6}(?:,\d{3})*(?:\.\d{2})?)\b/g)
    
    if (budgetWithCurrencyMatch) {
      // Has currency symbol - process normally
      const amount = parseFloat(budgetWithCurrencyMatch[0].replace(/[^\d.]/g, ''))
      if (amount > 100) {
        updates.budget = {
          total: amount,
          currency: budgetWithCurrencyMatch[0].includes('£') ? 'GBP' : 
                   budgetWithCurrencyMatch[0].includes('€') ? 'EUR' : 
                   budgetWithCurrencyMatch[0].includes('$') ? 'USD' : 'USD'
        }
      }
    } else if (budgetNumberOnlyMatch && this.looksLikeBudgetContext(input)) {
      // Number without currency in budget context - check for currency keywords
      const amount = parseFloat(budgetNumberOnlyMatch[0].replace(/[^\d.]/g, ''))
      if (amount > 100) {
        // Check for currency keywords in the text
        let currency = 'PENDING'
        if (lowerInput.includes('dollars') || lowerInput.includes('usd')) {
          currency = 'USD'
        } else if (lowerInput.includes('pounds') || lowerInput.includes('gbp')) {
          currency = 'GBP' 
        } else if (lowerInput.includes('euros') || lowerInput.includes('eur')) {
          currency = 'EUR'
        }
        
        updates.budget = {
          total: amount,
          currency: currency,
          pendingClarification: currency === 'PENDING'
        }
      }
    }
    
    // Duration extraction - improved to handle written numbers
    // Extract duration information to check for redundancy
    let durationDays = 0
    
    // Handle numeric patterns (e.g., "7 days", "2 weeks")
    const durationMatch = lowerInput.match(/(\d+)\s*(days?|weeks?|months?)/g)
    if (durationMatch) {
      const num = parseInt(durationMatch[0])
      let days = num
      if (durationMatch[0].includes('week')) days *= 7
      if (durationMatch[0].includes('month')) days *= 30
      durationDays = days
    }
    
    // Handle written numbers (e.g., "two weeks", "one month", "a week")
    const writtenDurationPatterns = [
      { pattern: /(?:a|one)\s+week/i, days: 7 },
      { pattern: /two\s+weeks?/i, days: 14 },
      { pattern: /three\s+weeks?/i, days: 21 },
      { pattern: /(?:a|one)\s+month/i, days: 30 },
      { pattern: /two\s+months?/i, days: 60 },
      { pattern: /(?:a|one)\s+day/i, days: 1 },
      { pattern: /two\s+days?/i, days: 2 },
      { pattern: /three\s+days?/i, days: 3 },
      { pattern: /four\s+days?/i, days: 4 },
      { pattern: /five\s+days?/i, days: 5 },
      { pattern: /six\s+days?/i, days: 6 },
      { pattern: /seven\s+days?/i, days: 7 },
      { pattern: /(?:a|one)\s+fortnight/i, days: 14 }
    ]
    
    for (const { pattern, days } of writtenDurationPatterns) {
      if (pattern.test(lowerInput)) {
        durationDays = days
        break
      }
    }
    
    if (durationDays > 0) {
      updates.dates = { ...updates.dates, duration: durationDays }
    }
    
    // Traveler count - improved to catch simple numbers
    let travelersMatch = lowerInput.match(/(\d+)\s*(?:people|person|travelers?|adults?)/g)
    
    // If no match but we're expecting travelers (simple number answer)
    if (!travelersMatch && this.isExpectingTravelers()) {
      const simpleNumberMatch = input.match(/^\s*(\d+)\s*$/)
      if (simpleNumberMatch) {
        const count = parseInt(simpleNumberMatch[1])
        if (count >= 1 && count <= 20) {
          updates.travelers = { adults: count }
        }
      }
    } else if (travelersMatch) {
      const count = parseInt(travelersMatch[0])
      updates.travelers = { adults: count }
    }
    
    // Handle simple "yes" responses for itinerary generation
    if (this.isExpectingItineraryConfirmation() && this.looksLikeYesResponse(input)) {
      updates.currentIntent = 'generate_itinerary'
      updates.nextExpected = 'none'
    }
    
    // Handle simple duration answers like "7" when expecting duration
    // But only if we don't already have duration information
    if (!this.tripContext.dates?.duration && !updates.dates?.duration && this.isExpectingDuration()) {
      const simpleDurationMatch = input.match(/^\s*(\d+)\s*$/)
      if (simpleDurationMatch) {
        const days = parseInt(simpleDurationMatch[1])
        if (days >= 1 && days <= 365) {
          updates.dates = { ...updates.dates, duration: days }
        }
      }
    }
    
    // Origin/departure location extraction
    // Extract origin information to check for redundancy
    if (this.isExpectingOrigin()) {
      // Look for city names, airport codes, or "from X" patterns
      const fromMatch = lowerInput.match(/(?:from|departing from|leaving from|starting from)\s+([a-zA-Z\s]+)/i)
      
      // Enhanced patterns including major airports and airport codes
      const locationPatterns = [
        // UK cities and airports
        /london|manchester|birmingham|glasgow|edinburgh|leeds|liverpool|bristol|sheffield|leicester/i,
        /heathrow|gatwick|stansted|luton|manchester airport|birmingham airport|glasgow airport/i,
        /lhr|lgw|stn|ltn|man|bhx|gla/i, // Airport codes
        
        // US cities and airports
        /new york|los angeles|chicago|houston|phoenix|philadelphia|san antonio|san diego|dallas|san jose/i,
        /jfk|lax|ord|iah|phx|phl|sat|san|dfw|sjc/i, // Airport codes
        
        // European cities and airports
        /paris|marseille|lyon|toulouse|nice|nantes|strasbourg|montpellier|bordeaux|lille/i,
        /berlin|hamburg|munich|cologne|frankfurt|stuttgart|düsseldorf|dortmund|essen|leipzig/i,
        /milan|rome|naples|turin|palermo|genoa|bologna|florence|bari|catania/i,
        /madrid|barcelona|valencia|seville|zaragoza|malaga|murcia|palma|bilbao|alicante/i,
        /amsterdam|rotterdam|the hague|utrecht|eindhoven|tilburg|groningen|almere|breda|nijmegen/i,
        /cdg|orly|fra|muc|ams|fcn|mad|bcn|lax|dxb|sin|nrt|hnd|icn/i // Airport codes
      ]
      
      // Specific airport to city mapping for user-friendly responses
      const airportToCity = {
        'heathrow': 'London (Heathrow)',
        'gatwick': 'London (Gatwick)', 
        'stansted': 'London (Stansted)',
        'luton': 'London (Luton)',
        'lhr': 'London (Heathrow)',
        'lgw': 'London (Gatwick)',
        'stn': 'London (Stansted)',
        'ltn': 'London (Luton)',
        'manchester airport': 'Manchester',
        'birmingham airport': 'Birmingham',
        'glasgow airport': 'Glasgow'
      }
      
      if (fromMatch) {
        const location = fromMatch[1].trim()
        updates.origin = airportToCity[location.toLowerCase()] || location
      } else {
        // Check if the entire input looks like a location (simple answer)
        const simpleLocationMatch = input.match(/^[a-zA-Z\s]{2,30}$/i)
        if (simpleLocationMatch) {
          const location = input.trim().toLowerCase()
          
          // Check if it's a recognized airport/city
          if (locationPatterns.some(pattern => pattern.test(location))) {
            updates.origin = airportToCity[location] || input.trim()
          }
        }
      }
    }
    
    // Accommodation preference extraction
    if (!this.tripContext.preferences?.accommodation?.length && this.isExpectingAccommodation()) {
      const accommodationTypes = ['hotel', 'boutique', 'b&b', 'bed and breakfast', 'hostel', 'apartment', 'any', 'flexible']
      const foundType = accommodationTypes.find(type => lowerInput.includes(type))
      if (foundType) {
        updates.preferences = {
          ...updates.preferences,
          accommodation: [foundType === 'b&b' || foundType === 'bed and breakfast' ? 'B&B' : foundType.charAt(0).toUpperCase() + foundType.slice(1)]
        }
      }
    }
    
    // Travel style extraction with comprehensive normalization and locking
    if (this.isExpectingTravelStyle()) {
      const resolvedStyle = this.resolveTravelStyle(input)
      if (resolvedStyle) {
        updates.preferences = {
          ...this.tripContext.preferences,
          ...updates.preferences,
          style: resolvedStyle,
          styleLocked: true
        }
        // Set next expected to interests
        updates.nextExpected = 'interests'
      }
    }
    
    // Interests extraction
    if (this.isExpectingInterests()) {
      const interestKeywords = {
        'History & Culture': ['history', 'culture', 'museums', 'historic', 'heritage', 'tradition', 'art', 'architecture'],
        'Food & Dining': ['food', 'dining', 'restaurants', 'cuisine', 'eating', 'culinary', 'local food', 'gastronomy'],
        'Nature & Outdoors': ['nature', 'outdoors', 'hiking', 'parks', 'scenic', 'landscape', 'wildlife', 'countryside'],
        'Nightlife & Entertainment': ['nightlife', 'bars', 'clubs', 'entertainment', 'shows', 'theater', 'music', 'party'],
        'Shopping': ['shopping', 'markets', 'boutiques', 'souvenirs', 'retail', 'stores', 'buying'],
        'Relaxation': ['relaxation', 'spa', 'beaches', 'peaceful', 'calm', 'leisure', 'rest', 'unwind'],
        'Adventure': ['adventure', 'activities', 'experiences', 'active', 'thrilling', 'exciting', 'sports']
      }
      
      const foundInterests = []
      for (const [interest, keywords] of Object.entries(interestKeywords)) {
        if (keywords.some(keyword => lowerInput.includes(keyword))) {
          foundInterests.push(interest)
        }
      }
      
      if (foundInterests.length > 0) {
        updates.preferences = {
          ...updates.preferences,
          interests: foundInterests
        }
      }
    }
  }
  
  // Check if input looks like budget context (contains budget-related keywords)
  private looksLikeBudgetContext(input: string): boolean {
    const budgetKeywords = [
      'budget', 'cost', 'spend', 'money', 'afford', 'price', 'total',
      'have', 'got', 'willing to pay', 'can spend', 'max'
    ]
    
    const lowerInput = input.toLowerCase()
    return budgetKeywords.some(keyword => lowerInput.includes(keyword))
  }
  
  // Extract currency from user response when clarifying
  private extractCurrencyFromResponse(input: string): string | null {
    const lowerInput = input.toLowerCase()
    
    // Direct currency symbols
    if (input.includes('£') || lowerInput.includes('pounds') || lowerInput.includes('gbp') || lowerInput.includes('british')) {
      return 'GBP'
    }
    if (input.includes('$') || lowerInput.includes('dollars') || lowerInput.includes('usd') || lowerInput.includes('american')) {
      return 'USD'  
    }
    if (input.includes('€') || lowerInput.includes('euros') || lowerInput.includes('eur') || lowerInput.includes('european')) {
      return 'EUR'
    }
    
    // Other common currencies
    if (lowerInput.includes('yen') || lowerInput.includes('jpy')) return 'JPY'
    if (lowerInput.includes('canadian') || lowerInput.includes('cad')) return 'CAD'
    if (lowerInput.includes('australian') || lowerInput.includes('aud')) return 'AUD'
    
    return null
  }
  
  // Generate structured response like the original system
  private generateStructuredResponse(input: string, updates: Partial<TripContext>): string {
    // Create a temporary context with updates for this response generation
    const context = {
      ...this.tripContext,
      ...updates,
      // Deep merge nested objects
      destination: { ...this.tripContext.destination, ...updates.destination },
      dates: { ...this.tripContext.dates, ...updates.dates },
      budget: { ...this.tripContext.budget, ...updates.budget },
      travelers: { ...this.tripContext.travelers, ...updates.travelers },
      preferences: { 
        ...this.tripContext.preferences, 
        ...updates.preferences,
        accommodation: updates.preferences?.accommodation || this.tripContext.preferences?.accommodation,
        interests: updates.preferences?.interests || this.tripContext.preferences?.interests,
        style: updates.preferences?.style || this.tripContext.preferences?.style,
        styleLocked: updates.preferences?.styleLocked || this.tripContext.preferences?.styleLocked,
        accessibility: updates.preferences?.accessibility || this.tripContext.preferences?.accessibility,
        dietary: updates.preferences?.dietary || this.tripContext.preferences?.dietary
      }
    }
    
    // Handle style confirmation and progression (read-back and advance pattern)
    if (updates.preferences?.style && updates.preferences?.styleLocked) {
      const styleDisplayNames = {
        'luxury': 'Luxury',
        'mid-range': 'Mid-range', 
        'budget': 'Budget',
        'mixed': 'Mixed'
      }
      const displayName = styleDisplayNames[updates.preferences.style]
      return `Perfect! Travel style set to **${displayName}**. I'll tailor all recommendations to match this style.

What are you most interested in during your trip?

🎯 **Select your interests:**
• **History & Culture** - Museums, historic sites, local traditions
• **Food & Dining** - Local cuisine, restaurants, food tours  
• **Nature & Outdoors** - Parks, hiking, scenic views
• **Nightlife & Entertainment** - Bars, clubs, shows, events
• **Shopping** - Markets, boutiques, souvenirs
• **Relaxation** - Spas, beaches, leisurely pace
• **Adventure** - Unique experiences, active pursuits

Just mention what appeals to you most!`
    }
    
    // Check for impossible destinations first - use word boundaries to avoid false matches
    const impossibleDestinations = ['mars', 'moon', 'atlantis', 'narnia', 'hogwarts', 'space', 'heaven', 'hell', 'pluto', 'jupiter']
    const lowerInput = input.toLowerCase()
    const impossibleDestination = impossibleDestinations.find(dest => {
      const regex = new RegExp(`\\b${dest}\\b`, 'i')
      return regex.test(lowerInput)
    })
    
    if (impossibleDestination) {
      return `I'd love to help you plan an amazing trip! While I can't arrange travel to ${impossibleDestination.charAt(0).toUpperCase() + impossibleDestination.slice(1)} (yet! 🚀), I can help you plan incredible journeys to real destinations worldwide:

🌍 **Popular Destinations:**
• **Europe** - France, Italy, Spain, England, Greece, Germany
• **Asia** - Japan, Thailand, Singapore, South Korea  
• **Americas** - USA, Canada, Mexico, Costa Rica
• **Africa** - Morocco, Egypt, South Africa
• **Oceania** - Australia, New Zealand

Which of these destinations sounds exciting to you, or do you have another real-world destination in mind?`
    }

    // Handle destinations with improved recognition
    const knownDestinations = [
      'italy', 'france', 'spain', 'greece', 'japan', 'england', 'uk', 'thailand', 'turkey',
      'portugal', 'croatia', 'iceland', 'morocco', 'peru', 'brazil', 'argentina', 'chile',
      'norway', 'sweden', 'denmark', 'finland', 'austria', 'switzerland', 'netherlands',
      'germany', 'belgium', 'czech republic', 'hungary', 'poland', 'romania', 'bulgaria',
      'egypt', 'india', 'china', 'iran', 'jordan', 'israel', 'tunisia', 'syria', 'iraq', 'lebanon', 'australia'
    ]
    const majorCities = [
      'paris', 'rome', 'barcelona', 'madrid', 'london', 'tokyo', 'kyoto', 'bangkok', 'athens',
      'prague', 'dublin', 'amsterdam', 'vienna', 'berlin', 'munich', 'zurich', 'stockholm',
      'oslo', 'copenhagen', 'helsinki', 'lisbon', 'porto', 'budapest', 'warsaw', 'krakow'
    ]
    
    const hasKnownDestination = knownDestinations.some(dest => 
      input.toLowerCase().includes(dest)
    ) || majorCities.some(city => 
      input.toLowerCase().includes(city)
    )
    
    if (hasKnownDestination && !context.destination?.primary) {
      const destination = this.extractKnownDestination(input)
      if (destination) {
        updates.destination = { primary: destination, type: 'country' }
        
        // Provide destination-specific options (like original)
        if (destination.toLowerCase() === 'england') {
          return `Fantastic choice! England is incredible for travelers. I need to know which part of England interests you most:

🏙️ **Focus on One City** (Perfect for a deeper experience):
• **London** - The main hub with world-class attractions
• **Bath** - Georgian architecture and Roman baths  
• **York** - Medieval city with historic walls

🗺️ **Multi-City Adventure** (See more of the country):
• **Regional Tour**: 2-3 cities (perfect for 5-10 days)
• **Grand Tour**: Experience England comprehensively (10+ days)

🏘️ **Charming Small Towns & Villages**:
• **Cotswolds** - Honey-stone villages and countryside
• **Lake District** - Traditional villages with stunning lakes
• **Yorkshire Dales** - Historic market towns

Which approach sounds more appealing to you?`
        }
        
        // Check if destination has rich history/culture worth asking about experience type
        const historicalDestinations = [
          'Italy', 'Greece', 'Egypt', 'Turkey', 'Peru', 'India', 'China', 'Japan', 
          'Iran', 'Jordan', 'Israel', 'Morocco', 'Tunisia', 'Syria', 'Iraq', 'Lebanon'
        ]
        
        if (historicalDestinations.includes(destination)) {
          return `${destination} is a fantastic choice! What type of experience interests you most - major cities, cultural sites, or smaller authentic places?`
        }
        
        return `Great choice for ${destination}! How many days are you planning to travel?`
      }
    }
    
    // Handle potential destinations that look like real places but aren't in our known list
    const possibleDestination = this.extractPossibleDestination(input)
    if (possibleDestination && !context.destination?.primary) {
      updates.destination = { primary: possibleDestination, type: 'unknown' }
      return `Great choice! I'd love to help you plan a trip to ${possibleDestination}. 

To create the best itinerary for you, how many days are you planning to travel?`
    }
    
    // Follow structured question flow (like original system)
    if (!context.destination?.primary) {
      return "I'd love to help you plan your trip! Where would you like to go? 🌍"
    }
    
    if (!context.dates?.duration) {
      return `Great choice for ${context.destination.primary}! How many days are you planning to travel?`
    }
    
    if (!context.budget?.total) {
      return `Perfect! A ${context.dates.duration}-day trip to ${context.destination.primary}. What's your total budget?`
    }
    
    // Check if budget needs currency clarification
    if (context.budget?.total && context.budget.currency === 'PENDING') {
      return `I see you have a budget of ${context.budget.total}. Which currency is this in?
      
💰 **Common Options:**
• **£** - British Pounds (GBP)
• **$** - US Dollars (USD) 
• **€** - Euros (EUR)
• **Other** - Please specify

Just let me know which currency you meant!`
    }
    
    if (!context.travelers?.adults) {
      return "Excellent! How many people will be traveling?"
    }
    
    // Additional essential questions for complete trip planning
    if (!context.origin) {
      return `Great! ${context.travelers.adults} traveler${context.travelers.adults > 1 ? 's' : ''} for ${context.dates.duration} days. Where will you be departing from? (City or airport)`
    }
    
    if (!context.preferences?.accommodation?.length) {
      return `Perfect! Departing from ${context.origin}. What type of accommodation do you prefer?\n\n🏨 **Options:**\n• **Hotel** - Full service with amenities\n• **Boutique** - Unique, smaller properties\n• **B&B** - Bed and breakfast, local charm\n• **Hostel** - Budget-friendly, social atmosphere\n• **Apartment** - Self-catering, like home\n• **Any** - I'm flexible, show me options`
    }
    
    if (!context.preferences?.style && !context.preferences?.styleLocked) {
      return `Excellent choice! What's your preferred travel style?\n\n✨ **Travel Styles:**\n• **Luxury** - Premium experiences, finest accommodations\n• **Mid-range** - Comfortable balance of quality and value\n• **Budget** - Affordable options, maximize experiences\n• **Mixed** - Splurge on some things, save on others`
    }
    
    if (!context.preferences?.interests?.length) {
      return `Perfect! What are you most interested in during your trip?\n\n🎯 **Select your interests:**\n• **History & Culture** - Museums, historic sites, local traditions\n• **Food & Dining** - Local cuisine, restaurants, food tours\n• **Nature & Outdoors** - Parks, hiking, scenic views\n• **Nightlife & Entertainment** - Bars, clubs, shows, events\n• **Shopping** - Markets, boutiques, souvenirs\n• **Relaxation** - Spas, beaches, leisurely pace\n• **Adventure** - Unique experiences, active pursuits\n\nJust mention what appeals to you most!`
    }
    
    // Check if user wants itinerary generated
    if (context.currentIntent === 'generate_itinerary') {
      updates.currentIntent = 'generating_itinerary'
      return `🚀 Excellent! I'm now generating your complete ${context.dates.duration}-day itinerary for ${context.destination.primary}...

🏨 Finding perfect accommodation within your budget
🎯 Planning ${context.dates.duration} full days with activities  
💰 Optimizing your ${context.budget.currency}${context.budget.total} budget
📍 Including detailed locations and timing

This will take just a moment!`
    }

    // Check if itinerary has been completed
    if (context.currentIntent === 'itinerary_completed') {
      // Check if user is asking specific questions about the trip context
      const lowerInput = input.toLowerCase()
      
      // Budget-related questions
      if (lowerInput.includes('budget') || lowerInput.includes('cost') || lowerInput.includes('money') || lowerInput.includes('price')) {
        return `Your total budget for this ${context.dates.duration}-day trip to ${context.destination.primary} is **${context.budget.currency}${context.budget.total}** for ${context.travelers.adults} traveler${context.travelers.adults > 1 ? 's' : ''}. This covers accommodation, meals, activities, and transportation within ${context.destination.primary}.`
      }
      
      // Traveler-related questions  
      if (lowerInput.includes('people') || lowerInput.includes('traveler') || lowerInput.includes('how many')) {
        return `You're traveling with ${context.travelers.adults} people total. This itinerary is designed for ${context.travelers.adults === 1 ? 'solo travel' : context.travelers.adults === 2 ? 'a couple' : `a group of ${context.travelers.adults}`}.`
      }
      
      // Hotel/accommodation questions
      if (lowerInput.includes('hotel') || lowerInput.includes('accommodation') || lowerInput.includes('staying')) {
        const hotelName = `${context.destination.primary} Central Hotel`
        const pricePerNight = Math.round(context.budget.total * 0.55 / context.dates.duration)
        return `You're staying at **${hotelName}**, located in ${context.destination.primary} City Center. The cost is ${context.budget.currency}${pricePerNight} per night for ${context.dates.duration} nights. It's perfectly positioned for easy access to all major attractions and includes amenities like free WiFi, breakfast, and concierge services.`
      }
      
      // Day-specific questions  
      if (lowerInput.includes('day ') || lowerInput.match(/day \d+/)) {
        const dayMatch = lowerInput.match(/day (\d+)/)
        const dayNum = dayMatch ? parseInt(dayMatch[1]) : null
        if (dayNum && dayNum <= context.dates.duration) {
          return `Day ${dayNum} of your ${context.destination.primary} itinerary includes activities tailored to your interests in ${context.preferences?.interests?.join(' and ') || 'culture and exploration'}. Check the detailed itinerary in the preview panel to see the full schedule, timings, and locations for that day.`
        } else if (dayNum && dayNum > context.dates.duration) {
          return `Your trip is ${context.dates.duration} days long, so there's no Day ${dayNum}. Would you like to know about a different day?`
        }
      }
      
      // Generic questions - show completion message
      return `Your ${context.dates.duration}-day ${context.destination.primary} itinerary is complete! 🎉

You can now:
• 📋 **Review your complete itinerary** in the preview panel
• 💾 **Save this trip** to your account  
• ✏️ **Make adjustments** if needed
• 🗨️ **Ask questions** about specific activities or locations

Is there anything you'd like to modify or do you have questions about your itinerary?`
    }

    // Handle generating state (shouldn't normally be reached, but just in case)
    if (context.currentIntent === 'generating_itinerary') {
      return `🔄 Your itinerary is being generated... This should complete shortly. You can review it in the preview panel once ready!`
    }

    // Have all basic info - offer to generate plan
    return `Perfect! I have all the essential details:

🌍 **Destination:** ${context.destination.primary}
📅 **Duration:** ${context.dates.duration} days
💰 **Budget:** ${context.budget.currency}${context.budget.total}
👥 **Travelers:** ${context.travelers.adults}

I'm ready to create your personalized itinerary! Should I start generating your trip plan?`
  }
  
  // Extract known destination from input
  private extractKnownDestination(input: string): string | null {
    const lowerInput = input.toLowerCase()
    
    // Check for multi-city patterns first
    const multiCityDestination = this.extractMultiCityDestination(input)
    if (multiCityDestination) {
      return multiCityDestination
    }
    
    const destinationMap = {
      'italy': 'Italy',
      'france': 'France', 
      'spain': 'Spain',
      'greece': 'Greece',
      'japan': 'Japan',
      'england': 'England',
      'uk': 'England',
      'thailand': 'Thailand',
      'turkey': 'Turkey',
      'portugal': 'Portugal',
      'croatia': 'Croatia',
      'iceland': 'Iceland',
      'morocco': 'Morocco',
      'peru': 'Peru',
      'brazil': 'Brazil',
      'argentina': 'Argentina',
      'chile': 'Chile',
      'norway': 'Norway',
      'sweden': 'Sweden',
      'denmark': 'Denmark',
      'finland': 'Finland',
      'austria': 'Austria',
      'switzerland': 'Switzerland',
      'netherlands': 'Netherlands',
      'germany': 'Germany',
      'belgium': 'Belgium',
      'czech republic': 'Czech Republic',
      'hungary': 'Hungary',
      'poland': 'Poland',
      'romania': 'Romania',
      'bulgaria': 'Bulgaria',
      'egypt': 'Egypt',
      'india': 'India',
      'china': 'China',
      'iran': 'Iran',
      'jordan': 'Jordan',
      'israel': 'Israel',
      'tunisia': 'Tunisia',
      'syria': 'Syria',
      'iraq': 'Iraq',
      'lebanon': 'Lebanon',
      'australia': 'Australia',
      // Major cities
      'prague': 'Prague',
      'dublin': 'Dublin',
      'amsterdam': 'Amsterdam',
      'vienna': 'Vienna',
      'berlin': 'Berlin',
      'munich': 'Munich',
      'zurich': 'Zurich',
      'stockholm': 'Stockholm',
      'oslo': 'Oslo',
      'copenhagen': 'Copenhagen',
      'helsinki': 'Helsinki',
      'lisbon': 'Lisbon',
      'porto': 'Porto',
      'budapest': 'Budapest',
      'warsaw': 'Warsaw',
      'krakow': 'Krakow'
    }
    
    for (const [key, value] of Object.entries(destinationMap)) {
      if (lowerInput.includes(key)) {
        return value
      }
    }
    
    return null
  }

  // Extract possible destinations from user input (even if not in known list)
  private extractPossibleDestination(input: string): string | null {
    const lowerInput = input.toLowerCase()
    
    // Patterns that suggest a destination is being mentioned
    const destinationPatterns = [
      /(?:want to (?:visit|go to)|going to|travel to|trip to|visiting)\s+([A-Z][a-zA-Z\s]{2,20})/i,
      /(?:let's go to|how about|thinking about)\s+([A-Z][a-zA-Z\s]{2,20})/i,
      /(?:I'm going to|planning to visit)\s+([A-Z][a-zA-Z\s]{2,20})/i
    ]
    
    for (const pattern of destinationPatterns) {
      const match = input.match(pattern)
      if (match) {
        const potentialDest = match[1].trim()
        
        // Filter out common words that aren't destinations
        const excludeWords = ['the', 'a', 'an', 'some', 'somewhere', 'anywhere', 'place', 'somewhere with', 'a place with', 'european', 'asian', 'tropical', 'mountain', 'beach', 'capital', 'city', 'town']
        if (!excludeWords.some(word => potentialDest.toLowerCase().includes(word))) {
          // Capitalize properly
          return potentialDest.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ')
        }
      }
    }
    
    // Check for capitalized words that might be places (simple heuristic)
    const capitalizedWords = input.match(/\b[A-Z][a-z]{3,}\b/g)
    if (capitalizedWords && capitalizedWords.length === 1) {
      const word = capitalizedWords[0]
      // Exclude common non-destination capitalized words
      const commonWords = [
        'Where', 'When', 'What', 'How', 'Why', 'The', 'This', 'That', 'Some', 'Many', 
        'Great', 'Good', 'Best', 'Somewhere', 'European', 'Asian', 'Tropical', 'Mountain', 
        'Beach', 'Capital', 'City', 'Town', 'Place'
      ]
      if (!commonWords.includes(word) && !lowerInput.includes('with ' + word.toLowerCase())) {
        return word
      }
    }
    
    return null
  }

  // Extract multi-city destination patterns (e.g., "Paris, Rome, and Barcelona")
  private extractMultiCityDestination(input: string): string | null {
    const lowerInput = input.toLowerCase()
    
    // European cities
    const europeanCities = [
      'paris', 'rome', 'barcelona', 'madrid', 'london', 'amsterdam', 'berlin',
      'vienna', 'prague', 'budapest', 'florence', 'venice', 'milan', 'naples',
      'lisbon', 'porto', 'athens', 'santorini', 'mykonos', 'dublin', 'edinburgh'
    ]
    
    // Asian cities  
    const asianCities = [
      'tokyo', 'kyoto', 'osaka', 'bangkok', 'singapore', 'hong kong', 'seoul',
      'beijing', 'shanghai', 'mumbai', 'delhi', 'dubai', 'istanbul'
    ]
    
    // Count European cities mentioned
    const europeanMatches = europeanCities.filter(city => lowerInput.includes(city))
    const asianMatches = asianCities.filter(city => lowerInput.includes(city))
    
    // If multiple European cities mentioned, suggest Europe tour
    if (europeanMatches.length >= 2) {
      // Determine primary region
      const franceCities = ['paris']
      const italyCities = ['rome', 'florence', 'venice', 'milan', 'naples']
      const spainCities = ['barcelona', 'madrid']
      
      const franceCount = franceCities.filter(city => europeanMatches.includes(city)).length
      const italyCount = italyCities.filter(city => europeanMatches.includes(city)).length  
      const spainCount = spainCities.filter(city => europeanMatches.includes(city)).length
      
      if (italyCount > 0 && franceCount > 0) {
        return 'France & Italy'
      } else if (italyCount > 0 && spainCount > 0) {
        return 'Italy & Spain'  
      } else if (franceCount > 0 && spainCount > 0) {
        return 'France & Spain'
      } else if (italyCount >= 2) {
        return 'Italy'
      } else if (franceCount >= 1) {
        return 'France'
      } else if (spainCount >= 1) {
        return 'Spain'
      } else {
        return 'Europe' // Generic Europe for other combinations
      }
    }
    
    // If multiple Asian cities mentioned
    if (asianMatches.length >= 2) {
      const japanCities = ['tokyo', 'kyoto', 'osaka']
      const japanCount = japanCities.filter(city => asianMatches.includes(city)).length
      
      if (japanCount >= 2) {
        return 'Japan'
      } else {
        return 'Asia'
      }
    }
    
    // Single city - extract country
    if (europeanMatches.length === 1) {
      const city = europeanMatches[0]
      if (['paris'].includes(city)) return 'France'
      if (['rome', 'florence', 'venice', 'milan', 'naples'].includes(city)) return 'Italy'
      if (['barcelona', 'madrid'].includes(city)) return 'Spain'  
      if (['london', 'edinburgh'].includes(city)) return 'England'
      if (['amsterdam'].includes(city)) return 'Netherlands'
      if (['berlin'].includes(city)) return 'Germany'
      if (['athens', 'santorini', 'mykonos'].includes(city)) return 'Greece'
    }
    
    if (asianMatches.length === 1) {
      const city = asianMatches[0]
      if (['tokyo', 'kyoto', 'osaka'].includes(city)) return 'Japan'
      if (['bangkok'].includes(city)) return 'Thailand'
      if (['singapore'].includes(city)) return 'Singapore'
    }
    
    return null
  }
  
  // Generate response incorporating research results
  private async generateResponseWithResearch(
    userInput: string, 
    researchResults: ResearchedDestination[]
  ): Promise<string> {
    if (!researchResults || researchResults.length === 0) {
      return "I'm sorry, I couldn't find specific information about those places right now. Could you be more specific about the area you're interested in?"
    }
    
    // Sort by confidence and relevance
    const topDestinations = researchResults
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5)
    
    const location = this.tripContext.destination?.primary || 'that area'
    const budget = this.tripContext.budget?.total
    
    let response = `I found some wonderful ${userInput.includes('town') ? 'small towns' : 'places'} in ${location}! Here are the best options:\n\n`
    
    topDestinations.forEach((dest, index) => {
      response += `🏘️ **${dest.name}**\n`
      response += `${dest.description}\n`
      response += `✨ Highlights: ${dest.highlights.slice(0, 2).join(', ')}\n`
      response += `🎯 Perfect for: ${dest.bestFor.slice(0, 2).join(', ')}\n`
      
      if (dest.nearbyTo) {
        response += `📍 Location: Near ${dest.nearbyTo}\n`
      }
      
      if (budget) {
        const budgetFit = this.assessBudgetFit(dest, budget)
        response += `💰 Budget fit: ${budgetFit}\n`
      }
      
      response += '\n'
    })
    
    response += `Which of these ${topDestinations.length > 1 ? 'destinations' : 'places'} interests you most? I can create a detailed itinerary once you choose!`
    
    return response
  }
  
  // Assess how well destination fits budget
  private assessBudgetFit(destination: ResearchedDestination, budget: number): string {
    if (budget < 1000) {
      return destination.budgetLevel === 'budget' ? 'Excellent fit' : 
             destination.budgetLevel === 'mixed' ? 'Good fit with budget options' : 'May be challenging'
    } else if (budget > 3000) {
      return destination.budgetLevel === 'luxury' ? 'Perfect for luxury experience' :
             destination.budgetLevel === 'mixed' ? 'Great variety of options' : 'Excellent value'
    } else {
      return destination.budgetLevel === 'mid-range' || destination.budgetLevel === 'mixed' ? 
             'Perfect fit' : 'Good fit'
    }
  }
  
  // Update trip context (merge with existing)
  private updateTripContext(updates: Partial<TripContext>) {
    this.tripContext = {
      ...this.tripContext,
      ...updates,
      // Deep merge nested objects
      destination: { ...this.tripContext.destination, ...updates.destination },
      dates: { ...this.tripContext.dates, ...updates.dates },
      budget: { ...this.tripContext.budget, ...updates.budget },
      travelers: { ...this.tripContext.travelers, ...updates.travelers },
      preferences: { 
        ...this.tripContext.preferences, 
        ...updates.preferences,
        // Deep merge preference arrays
        accommodation: updates.preferences?.accommodation || this.tripContext.preferences?.accommodation,
        interests: updates.preferences?.interests || this.tripContext.preferences?.interests,
        accessibility: updates.preferences?.accessibility || this.tripContext.preferences?.accessibility,
        dietary: updates.preferences?.dietary || this.tripContext.preferences?.dietary
      }
    }
    
    // Log context updates for debugging
    console.log('🔄 Context updated:', {
      destination: this.tripContext.destination?.primary,
      duration: this.tripContext.dates?.duration,
      budget: this.tripContext.budget?.total ? `${this.tripContext.budget.currency}${this.tripContext.budget.total}` : undefined,
      travelers: this.tripContext.travelers?.adults,
      origin: this.tripContext.origin,
      accommodation: this.tripContext.preferences?.accommodation?.[0],
      style: this.tripContext.preferences?.style,
      interests: this.tripContext.preferences?.interests?.join(', ')
    })
  }
  
  // Context-aware helper methods for simple answer parsing
  
  // Check if we're expecting a traveler count response
  private isExpectingTravelers(): boolean {
    const context = this.tripContext
    
    // We expect travelers if we have destination and duration/budget but no travelers
    return !!(
      context.destination?.primary && 
      (context.dates?.duration || context.budget?.total) && 
      !context.travelers?.adults
    )
  }
  
  // Check if we're expecting duration response
  private isExpectingDuration(): boolean {
    const context = this.tripContext
    
    // We expect duration if we have destination but no duration
    return !!(context.destination?.primary && !context.dates?.duration)
  }
  
  // Check if we're expecting itinerary confirmation
  private isExpectingItineraryConfirmation(): boolean {
    const context = this.tripContext
    
    // We expect itinerary confirmation if we have all required info
    return this.hasAllRequiredInfo(context) && !context.currentIntent
  }
  
  // Validate if we have all required information for itinerary generation
  private hasAllRequiredInfo(context: TripContext = this.tripContext): boolean {
    return !!(
      context.destination?.primary &&
      context.dates?.duration &&
      context.budget?.total &&
      context.budget?.currency &&
      context.budget?.currency !== 'PENDING' &&
      context.travelers?.adults &&
      context.origin &&
      context.preferences?.accommodation?.length &&
      context.preferences?.style &&
      context.preferences?.interests?.length
    )
  }
  
  // Get list of missing required information
  private getMissingRequiredInfo(context: TripContext = this.tripContext): string[] {
    const missing = []
    
    if (!context.destination?.primary) missing.push('destination')
    if (!context.dates?.duration) missing.push('duration')
    if (!context.budget?.total) missing.push('budget amount')
    if (!context.budget?.currency || context.budget?.currency === 'PENDING') missing.push('budget currency')
    if (!context.travelers?.adults) missing.push('number of travelers')
    if (!context.origin) missing.push('departure location')
    if (!context.preferences?.accommodation?.length) missing.push('accommodation preference')
    if (!context.preferences?.style) missing.push('travel style')
    if (!context.preferences?.interests?.length) missing.push('interests')
    
    return missing
  }
  
  // Check if input looks like a "yes" response (improved to handle longer confirmations)
  private looksLikeYesResponse(input: string): boolean {
    const yesPatterns = [
      // Simple yes responses
      /^\s*(yes|yeah|yep|sure|ok|okay|alright|definitely|absolutely|sounds good|let's do it)\s*!*$/i,
      // Yes with additional text (like "yes, please generate...")
      /^\s*(yes|yeah|yep|sure|ok|okay|alright)\b.*generate.*itinerary/i,
      /^\s*(yes|yeah|yep|sure|ok|okay|alright)\b.*(please|go ahead|do it)/i,
      // Direct generation requests
      /^(generate|create|make|build).*itinerary/i,
      /^(let's|lets)\s+(generate|create|make|build|do this|go)/i
    ]
    
    return yesPatterns.some(pattern => pattern.test(input.trim()))
  }
  
  // Check if we're expecting origin/departure location
  private isExpectingOrigin(): boolean {
    const context = this.tripContext
    return !!(context.travelers?.adults && !context.origin)
  }
  
  // Check if we're expecting accommodation preference
  private isExpectingAccommodation(): boolean {
    const context = this.tripContext
    return !!(context.origin && !context.preferences?.accommodation?.length)
  }
  
  // Check if we're expecting travel style
  private isExpectingTravelStyle(): boolean {
    const context = this.tripContext
    return !!(context.preferences?.accommodation?.length && !context.preferences?.style && !context.preferences?.styleLocked)
  }
  
  // Robust travel style resolver with normalization and comprehensive synonyms
  private resolveTravelStyle(input: string): 'luxury' | 'mid-range' | 'budget' | 'mixed' | null {
    // Step 1: Normalize input
    const normalized = this.normalizeStyleInput(input)
    
    // Step 2: Try exact matches first (highest confidence)
    const exactMatches = {
      'luxury': normalized,
      'midrange': normalized, 
      'mid-range': normalized,
      'budget': normalized,
      'mixed': normalized
    }
    
    for (const [style, text] of Object.entries(exactMatches)) {
      if (text === style) {
        return style as 'luxury' | 'mid-range' | 'budget' | 'mixed'
      }
    }
    
    // Step 3: Comprehensive synonym mapping  
    const synonymMap = {
      'luxury': [
        'luxury', 'premium', 'high-end', 'finest', 'deluxe', 'upscale', 'top-tier', 
        'first-class', 'five-star', 'exclusive', 'high-quality', 'luxurious', 'lavish',
        'expensive', 'posh', 'elite', 'sophisticated', 'refined'
      ],
      'budget': [
        'budget', 'cheap', 'affordable', 'economical', 'low-cost', 'backpack', 'backpacker',
        'frugal', 'inexpensive', 'cost-effective', 'money-saving', 'bargain', 'value',
        'tight-budget', 'shoestring', 'minimal', 'basic', 'simple'
      ],
      'mid-range': [
        'mid-range', 'midrange', 'moderate', 'comfortable', 'standard', 'medium', 'middle',
        'balanced', 'reasonable', 'decent', 'good-value', 'mid-level', 'average',
        'comfortable-but-not-fancy', 'nice-but-affordable', 'quality-for-money'
      ],
      'mixed': [
        'mixed', 'flexible', 'combination', 'varied', 'balance', 'some-luxury-some-budget',
        'splurge-and-save', 'hybrid', 'combined', 'both', 'little-of-everything'
      ]
    }
    
    // Step 4: Check for phrase matches (handles "affordable but nice" etc.)
    const phraseMap = {
      'budget': ['tight budget', 'save money', 'as cheap as possible', 'minimal cost'],
      'mid-range': ['affordable but nice', 'comfortable but reasonable', 'good value', 'decent quality'],
      'luxury': ['spare no expense', 'money no object', 'best of everything', 'top quality'],
      'mixed': ['splurge on some', 'save on others', 'mix it up', 'variety of options']
    }
    
    // Check phrase matches first
    for (const [style, phrases] of Object.entries(phraseMap)) {
      if (phrases.some(phrase => normalized.includes(phrase))) {
        return style as 'luxury' | 'mid-range' | 'budget' | 'mixed'
      }
    }
    
    // Check individual synonyms
    for (const [style, synonyms] of Object.entries(synonymMap)) {
      if (synonyms.some(synonym => normalized.includes(synonym))) {
        return style as 'luxury' | 'mid-range' | 'budget' | 'mixed'
      }
    }
    
    return null
  }
  
  // Normalize style input for better matching
  private normalizeStyleInput(input: string): string {
    return input
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove punctuation except hyphens
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      .replace(/\bmid\s*range\b/g, 'mid-range') // Normalize "mid range" to "mid-range"
      .replace(/\bmidrange\b/g, 'mid-range') // Normalize "midrange" to "mid-range"
  }
  
  // Check if we're expecting interests
  private isExpectingInterests(): boolean {
    const context = this.tripContext
    return !!(context.preferences?.style && !context.preferences?.interests?.length)
  }
  
  // Check for redundant information (user providing info we already have)
  private checkForRedundantInformation(input: string, updates: Partial<TripContext>): string | null {
    const lowerInput = input.toLowerCase()
    
    // Check for duration redundancy
    if (this.tripContext.dates?.duration && updates.dates?.duration) {
      if (this.tripContext.dates.duration === updates.dates.duration) {
        return `I already have your trip duration as ${this.tripContext.dates.duration} days. What's your total budget?`
      }
    }
    
    // Check for origin redundancy
    if (this.tripContext.origin && updates.origin) {
      // Consider similar locations as redundant (e.g., "London" when we have "London (Heathrow)")
      const existingOrigin = this.tripContext.origin.toLowerCase()
      const newOrigin = updates.origin.toLowerCase()
      
      if (existingOrigin.includes(newOrigin) || newOrigin.includes(existingOrigin.split(' ')[0])) {
        return `Perfect! I already have your departure location as ${this.tripContext.origin}. What type of accommodation do you prefer?

🏨 **Options:**
• **Hotel** - Full service with amenities
• **Boutique** - Unique, smaller properties
• **B&B** - Bed and breakfast, local charm
• **Hostel** - Budget-friendly, social atmosphere
• **Apartment** - Self-catering, like home
• **Any** - I'm flexible, show me options`
      }
    }
    
    // Check for budget redundancy
    if (this.tripContext.budget?.total && updates.budget?.total) {
      if (this.tripContext.budget.total === updates.budget.total) {
        return `I already have your budget as ${this.tripContext.budget.currency}${this.tripContext.budget.total}. How many people will be traveling?`
      }
    }
    
    // Check for traveler count redundancy
    if (this.tripContext.travelers?.adults && updates.travelers?.adults) {
      if (this.tripContext.travelers.adults === updates.travelers.adults) {
        return `I already have the traveler count as ${this.tripContext.travelers.adults} people. Where will you be departing from? (City or airport)`
      }
    }
    
    return null // No redundant information detected
  }
  
  // Handle system messages (internal communication)
  private handleSystemMessage(systemMessage: string): Promise<{
    response: string
    needsResearch: boolean
    researchQuery?: string
    contextUpdates: Partial<TripContext>
  }> {
    if (systemMessage === 'SYSTEM_ITINERARY_GENERATED') {
      const context = this.tripContext
      
      // Simple success response - actual hotel data will be filled in by API
      const response = `System: Itinerary generation completed successfully.`
      
      this.addMessage(response, 'assistant')
      
      return Promise.resolve({
        response,
        needsResearch: false,
        contextUpdates: {
          currentIntent: 'itinerary_completed',
          nextExpected: 'none'
        }
      })
    }
    
    if (systemMessage === 'SYSTEM_ITINERARY_FAILED') {
      const response = `I apologize, but I encountered an issue generating your itinerary. This is likely a temporary problem. 

Could you please try saying "yes" again to generate your itinerary? I have all your trip details ready:
- ${this.tripContext.destination?.primary}
- ${this.tripContext.dates?.duration} days  
- ${this.tripContext.budget?.currency}${this.tripContext.budget?.total}
- ${this.tripContext.travelers?.adults} travelers`
      
      this.addMessage(response, 'assistant')
      
      return Promise.resolve({
        response,
        needsResearch: false,
        contextUpdates: {
          currentIntent: undefined
        }
      })
    }
    
    // Unknown system message
    return Promise.resolve({
      response: '',
      needsResearch: false,
      contextUpdates: {}
    })
  }
  
  // Save conversation state to persistent storage
  async saveConversationState() {
    // Implementation would save to your existing .conversation-state directory
    const state = {
      conversationId: this.conversationId,
      messages: this.conversationHistory,
      tripContext: this.tripContext,
      lastUpdated: new Date().toISOString()
    }
    
    // Save to file system (integrate with your existing storage)
    return state
  }
  
  // Load conversation state from persistent storage
  async loadConversationState(conversationId: string) {
    // Implementation would load from your existing .conversation-state directory
    // and restore conversation history and context
  }
}

export default UnifiedConversationManager