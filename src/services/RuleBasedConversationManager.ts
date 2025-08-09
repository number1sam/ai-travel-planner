// Rule-Based Conversation Manager
// Implements the strict rule system for travel planning conversations
// Core Rule: Must read current state before asking questions, never re-ask locked fields

interface TripField {
  name: string
  value: any
  locked: boolean
  confirmedAt?: Date
  lastUpdated: Date
}

interface TripState {
  // Essential fields that enable searches
  destination?: TripField
  origin?: TripField
  travelDates?: TripField  // ISO dates with times and timezone
  travelers?: TripField
  travelStyle?: TripField
  budget?: TripField
  
  // Detailed preferences
  accommodation?: TripField
  activities?: TripField
  dietary?: TripField
  flights?: TripField
  transport?: TripField
  schedule?: TripField
  constraints?: TripField
  budgetCaps?: TripField
}

interface ConversationResponse {
  message: string
  needsConfirmation: boolean
  fieldToConfirm?: string
  readbackValue?: string
  nextQuestion?: string
  canStartSearches: boolean
  searchableFields: string[]
}

export class RuleBasedConversationManager {
  private tripState: TripState = {}
  private conversationId: string
  private pendingFields: Record<string, any> = {} // Store fields waiting to be confirmed

  // The 12 required questions - asked only if field is missing or unclear
  private readonly QUESTIONS = {
    destination: "Where would you like to travel to? Please tell me your destination city or country.",
    
    travelDates: "What are your dates?",
    
    origin: "Where will you be departing from? Please tell me your departure city or airport.",
    
    travelers: "How many people will be traveling? Please tell me the number of adults and children.",
    
    budget: "What's your total budget for this trip? Please include currency (e.g., $2000, £1500, €1800).",
    
    travelStyle: "What's your preferred travel style? (luxury, mid-range, or budget)",
    
    accommodation: "Do you have any specific hotel preferences? (star rating, location, amenities)",
    
    activities: "What activities or experiences are you most interested in? (sightseeing, museums, nightlife, outdoor activities, etc.)",
    
    dietary: "Do you have any dietary requirements or food preferences I should know about?",
    
    flights: "Do you have any flight preferences? (direct flights only, preferred airlines, departure times, etc.)",
    
    transport: "How do you prefer to get around at your destination? (walking, public transport, taxis, rental car)",
    
    schedule: "Do you prefer a packed schedule or would you like some free time for rest and spontaneous exploring?",
    
    constraints: "Are there any special requirements or constraints I should know about? (visas, medical needs, accessibility, etc.)",
    
    budgetCaps: "How strict is your budget? Should I stay well within it or can I use the full amount?"
  }

  constructor(conversationId: string) {
    this.conversationId = conversationId
  }

  // CORE RULE: Read current state before any response
  private readCurrentState(): { locked: string[], missing: string[] } {
    const locked: string[] = []
    const missing: string[] = []

    for (const [fieldName, question] of Object.entries(this.QUESTIONS)) {
      const field = this.tripState[fieldName as keyof TripState]
      if (field?.locked) {
        locked.push(fieldName)
      } else {
        missing.push(fieldName)
      }
    }

    return { locked, missing }
  }

  // Process user input following the rules
  async processInput(userInput: string): Promise<ConversationResponse> {
    // STEP 1: Read current state (MANDATORY)
    const { locked, missing } = this.readCurrentState()
    
    // STEP 2: Check if this is a confirmation response
    if (this.isConfirmation(userInput)) {
      return this.handleConfirmation(userInput)
    }

    // STEP 2b: Check if user is trying to change a locked field
    const changeAttempt = this.checkForLockedFieldChanges(userInput, locked)
    if (changeAttempt) {
      return changeAttempt
    }

    // STEP 3: Extract information from user input
    const extractedInfo = this.extractInformation(userInput)
    
    // STEP 4: Update unlocked fields with extracted info
    let updatedFields: string[] = []
    let extractedValues: Record<string, any> = {}
    
    for (const [fieldName, value] of Object.entries(extractedInfo)) {
      if (!this.tripState[fieldName as keyof TripState]?.locked && value !== null) {
        this.updateField(fieldName, value)
        updatedFields.push(fieldName)
        extractedValues[fieldName] = value
      }
    }

    // STEP 5: If we updated a field, confirm the FIRST one (per rules)
    if (updatedFields.length > 0) {
      const fieldToConfirm = updatedFields[0] // Confirm first updated field
      const readbackValue = this.generateReadback(fieldToConfirm)
      
      // Store other extracted fields for later processing
      if (updatedFields.length > 1) {
        this.storePendingFields(updatedFields.slice(1), extractedValues)
      }
      
      return {
        message: `${readbackValue} Is this correct?`,
        needsConfirmation: true,
        fieldToConfirm,
        readbackValue,
        canStartSearches: false,
        searchableFields: []
      }
    }

    // STEP 6: Ask next missing question (never ask about locked fields)
    const nextMissing = missing[0]
    if (nextMissing) {
      const acknowledgeMessage = this.generateAcknowledgment(locked)
      const question = this.QUESTIONS[nextMissing as keyof typeof this.QUESTIONS]
      
      return {
        message: `${acknowledgeMessage}${question}`,
        needsConfirmation: false,
        nextQuestion: nextMissing,
        canStartSearches: this.canStartSearches(),
        searchableFields: this.getSearchableFields()
      }
    }

    // STEP 7: All fields complete - ready for search
    return {
      message: "Perfect! I have all the information needed to create your personalized travel plan. Let me search for the best options that match your requirements.",
      needsConfirmation: false,
      canStartSearches: true,
      searchableFields: this.getSearchableFields()
    }
  }

  // Generate acknowledgment of locked fields (following the rule)
  private generateAcknowledgment(locked: string[]): string {
    if (locked.length === 0) return ""

    const lockedDescriptions = locked.map(fieldName => {
      const field = this.tripState[fieldName as keyof TripState]
      return this.getFieldDescription(fieldName, field?.value)
    }).filter(desc => desc)

    if (lockedDescriptions.length === 0) return ""

    return `I already have your ${lockedDescriptions.join(', ')} locked. I won't re-ask those. Next, I need `
  }

  // Generate read-back with full details including dates/times/timezones
  private generateReadback(fieldName: string): string {
    const field = this.tripState[fieldName as keyof TripState]
    if (!field) return "I've noted your response."

    switch (fieldName) {
      case 'travelDates':
        return this.formatDateReadback(field.value)
      case 'budget':
        return `I understand your budget is ${field.value.currency} ${field.value.amount}`
      case 'travelers':
        return `I have ${field.value.adults} adult${field.value.adults > 1 ? 's' : ''}${field.value.children ? ` and ${field.value.children} children` : ''}`
      case 'destination':
        return `I understand you want to visit ${field.value.name}`
      case 'origin':
        return `I have your departure from ${field.value.airport || field.value.city}`
      default:
        return `I've noted your ${fieldName} preferences`
    }
  }

  // Format dates with full details as required
  private formatDateReadback(dateValue: any): string {
    if (!dateValue) return "I've noted your travel dates"
    
    const start = new Date(dateValue.startDate)
    const end = new Date(dateValue.endDate)
    
    const startStr = start.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
    const endStr = end.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
    
    return `I understand your dates are ${startStr} to ${endStr} (${dateValue.duration} days). So your departure is ${startStr} and return is ${endStr}. I'll search for flights accordingly`
  }

  // Handle confirmation responses
  private handleConfirmation(userInput: string): ConversationResponse {
    const isPositive = /^(yes|yeah|yep|yees|yess|ye|correct|right|exactly|that's right|absolutely|ok|okay)/i.test(userInput.trim())
    
    // Find the field waiting for confirmation (most recently updated unlocked field)
    const waitingField = this.findFieldWaitingForConfirmation()
    
    if (!waitingField) {
      return {
        message: "I don't have anything waiting for confirmation. How can I help you plan your trip?",
        needsConfirmation: false,
        canStartSearches: false,
        searchableFields: []
      }
    }

    if (isPositive) {
      // Lock the field
      this.lockField(waitingField)
      
      // Check for pending fields first
      const pending = this.processPendingFields()
      if (pending.fieldToConfirm) {
        return {
          message: `Great! ${pending.readbackValue} Is this correct?`,
          needsConfirmation: true,
          fieldToConfirm: pending.fieldToConfirm,
          readbackValue: pending.readbackValue,
          canStartSearches: false,
          searchableFields: []
        }
      }
      
      // Continue to next missing field
      const { locked, missing } = this.readCurrentState()
      const nextMissing = missing[0]
      
      if (nextMissing) {
        const acknowledgeMessage = this.generateAcknowledgment(locked)
        const question = this.QUESTIONS[nextMissing as keyof typeof this.QUESTIONS]
        return {
          message: `Great! ${acknowledgeMessage}${question}`,
          needsConfirmation: false,
          nextQuestion: nextMissing,
          canStartSearches: this.canStartSearches(),
          searchableFields: this.getSearchableFields()
        }
      } else {
        return {
          message: "Perfect! I have all the information needed to create your personalized travel plan. Let me search for the best options.",
          needsConfirmation: false,
          canStartSearches: true,
          searchableFields: this.getSearchableFields()
        }
      }
    } else {
      // Negative confirmation - ask for correction
      return {
        message: `I understand. Please provide the correct information for ${waitingField}.`,
        needsConfirmation: false,
        canStartSearches: false,
        searchableFields: []
      }
    }
  }

  // Extract information from user input
  private extractInformation(input: string): Record<string, any> {
    const extracted: Record<string, any> = {}

    // Extract destination
    if (this.mentionsDestination(input)) {
      extracted.destination = this.extractDestination(input)
    }

    // Extract origin 
    if (this.mentionsOrigin(input)) {
      extracted.origin = this.extractOrigin(input)
    }

    // Extract dates
    if (this.mentionsDates(input)) {
      extracted.travelDates = this.extractDates(input)
    }

    // Extract budget
    if (this.mentionsBudget(input)) {
      extracted.budget = this.extractBudget(input)
    }

    // Extract travelers
    if (this.mentionsTravelers(input)) {
      extracted.travelers = this.extractTravelers(input)
    }

    // Extract travel style
    if (this.mentionsTravelStyle(input)) {
      extracted.travelStyle = this.extractTravelStyle(input)
    }

    return extracted
  }

  // Helper methods for information extraction
  private mentionsDestination(input: string): boolean {
    // Check for travel-related keywords or common destinations/countries
    return /\b(go to|visit|travel to|trip to|destination|want to go)\b/i.test(input) ||
           // Countries
           /\b(canada|usa|america|france|italy|spain|germany|uk|britain|japan|australia|china|india|brazil|mexico|thailand|turkey|greece|egypt|russia|netherlands|belgium|switzerland|austria|sweden|norway|denmark|finland|portugal|ireland|scotland|wales|poland|czech|hungary|croatia|romania|bulgaria|slovenia|estonia|latvia|lithuania|south korea|taiwan|vietnam|cambodia|laos|myanmar|philippines|malaysia|indonesia|singapore|new zealand|south africa|morocco|tunisia|kenya|ghana|nigeria|argentina|chile|peru|colombia|ecuador|venezuela|bolivia|uruguay|paraguay)\b/i.test(input) ||
           // Major cities
           /\b(paris|london|tokyo|rome|barcelona|amsterdam|berlin|madrid|vienna|prague|budapest|lisbon|florence|venice|milan|stockholm|oslo|copenhagen|dublin|edinburgh|new york|los angeles|san francisco|chicago|miami|boston|sydney|melbourne|dubai|istanbul|cairo|bangkok|singapore|hong kong|toronto|vancouver|montreal|ottawa|mumbai|delhi|beijing|shanghai|seoul|manila|jakarta|kuala lumpur|buenos aires|rio de janeiro|sao paulo|lima|bogota|caracas|santiago|montevideo|mexico city|guadalajara|havana|san juan|nassau|kingston|port au prince|guatemala city|san salvador|tegucigalpa|managua|san jose|panama city)\b/i.test(input)
  }

  private mentionsDates(input: string): boolean {
    // Only trigger on specific date patterns, not casual month mentions
    return /\b(\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}-\d{1,2}-\d{4}|\d+ days?|\d{1,2}(?:th|st|nd|rd)?-\d{1,2}(?:th|st|nd|rd)?|my dates are|dates are|travel dates|go in (january|february|march|april|may|june|july|august|september|october|november|december)|travel in (january|february|march|april|may|june|july|august|september|october|november|december)|\d{1,2}(?:st|nd|rd|th)? of (january|february|march|april|may|june|july|august|september|october|november|december)|(january|february|march|april|may|june|july|august|september|october|november|december) \d{1,2}(?:st|nd|rd|th)?|\d{1,2}\s+(january|february|march|april|may|june|july|august|september|october|november|december)-?\s*\d{1,2}\s+(january|february|march|april|may|june|july|august|september|october|november|december)|\d{1,2}(?:st|nd|rd|th)?\s+of\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+until\s+\d{1,2}(?:st|nd|rd|th)?\s+of\s+(january|february|march|april|may|june|july|august|september|october|november|december))\b/i.test(input) && 
           // Exclude casual mentions like "May trip", "January vacation", etc.
           !/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(trip|vacation|holiday|journey|visit)\b/i.test(input)
  }

  private mentionsBudget(input: string): boolean {
    return /[$£€¥]\d+|budget.*\d+|spend.*\d+|\d+.*budget/i.test(input)
  }

  private mentionsTravelers(input: string): boolean {
    return /\b(\d+) (people|person|adults?|travelers?|guests?)\b/i.test(input)
  }

  private mentionsTravelStyle(input: string): boolean {
    return /\b(luxury|budget|mid-range|backpack|premium|economy|standard|comfortable)\b/i.test(input)
  }

  private mentionsOrigin(input: string): boolean {
    return /\b(from|depart|departure|airport|leaving|departing)\b/i.test(input) ||
           /\b(heathrow|gatwick|stansted|luton|jfk|lax|ord|lhr|lgw|stn|ltn)\b/i.test(input) ||
           // Also check for city names when asked about origin
           /\b(london|new york|los angeles|chicago|paris|rome|madrid|berlin)\b/i.test(input)
  }

  // Extraction methods (simplified - would be more sophisticated in production)
  private extractDestination(input: string): any {
    const inputLower = input.toLowerCase()
    
    // Countries
    const countries = {
      'canada': 'Canada', 'usa': 'USA', 'america': 'USA', 'france': 'France', 
      'italy': 'Italy', 'spain': 'Spain', 'germany': 'Germany', 'uk': 'United Kingdom', 
      'britain': 'United Kingdom', 'japan': 'Japan', 'australia': 'Australia', 
      'china': 'China', 'india': 'India', 'brazil': 'Brazil', 'mexico': 'Mexico',
      'thailand': 'Thailand', 'turkey': 'Turkey', 'greece': 'Greece', 'egypt': 'Egypt',
      'russia': 'Russia', 'netherlands': 'Netherlands', 'belgium': 'Belgium',
      'switzerland': 'Switzerland', 'austria': 'Austria', 'sweden': 'Sweden',
      'norway': 'Norway', 'denmark': 'Denmark', 'finland': 'Finland',
      'portugal': 'Portugal', 'ireland': 'Ireland', 'scotland': 'Scotland'
    }
    
    // Cities
    const cities = {
      'paris': 'Paris', 'london': 'London', 'tokyo': 'Tokyo', 'rome': 'Rome',
      'barcelona': 'Barcelona', 'amsterdam': 'Amsterdam', 'berlin': 'Berlin',
      'madrid': 'Madrid', 'vienna': 'Vienna', 'prague': 'Prague',
      'toronto': 'Toronto', 'vancouver': 'Vancouver', 'montreal': 'Montreal',
      'new york': 'New York', 'los angeles': 'Los Angeles', 'chicago': 'Chicago'
    }
    
    // Check countries first
    for (const [key, value] of Object.entries(countries)) {
      if (inputLower.includes(key)) {
        return { name: value, type: 'country' }
      }
    }
    
    // Then check cities
    for (const [key, value] of Object.entries(cities)) {
      if (inputLower.includes(key)) {
        return { name: value, type: 'city' }
      }
    }
    
    // Fallback: extract any word that looks like a place name (capitalized)
    const placeMatch = input.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/)
    if (placeMatch) {
      return { name: placeMatch[0], type: 'place' }
    }
    
    return null
  }

  private extractOrigin(input: string): any {
    const airports = {
      'heathrow': { name: 'London Heathrow', code: 'LHR', city: 'London' },
      'gatwick': { name: 'London Gatwick', code: 'LGW', city: 'London' },
      'stansted': { name: 'London Stansted', code: 'STN', city: 'London' },
      'luton': { name: 'London Luton', code: 'LTN', city: 'London' },
      'jfk': { name: 'JFK International', code: 'JFK', city: 'New York' },
      'lax': { name: 'Los Angeles International', code: 'LAX', city: 'Los Angeles' },
      'ord': { name: 'O\'Hare International', code: 'ORD', city: 'Chicago' }
    }
    
    const cities = ['london', 'new york', 'los angeles', 'chicago', 'paris', 'rome', 'madrid', 'berlin']
    
    // Check for airports first
    for (const [key, airport] of Object.entries(airports)) {
      if (input.toLowerCase().includes(key)) {
        return { airport: airport.name, code: airport.code, city: airport.city, type: 'airport' }
      }
    }
    
    // Check for cities
    const found = cities.find(city => input.toLowerCase().includes(city))
    return found ? { city: found, type: 'city' } : null
  }

  private extractDates(input: string): any {
    // Check for date ranges in different formats
    const rangePatterns = [
      // "December 10-22, 2024" or "December 10-22 2024"
      /(\w+)\s+(\d{1,2})-(\d{1,2})(?:th|st|nd|rd)?,?\s+(\d{4})/i,
      // "8-20th January 2025" or "8-20 January 2025"
      /(\d{1,2})-(\d{1,2})(?:th|st|nd|rd)?\s+(\w+)\s+(\d{4})/i,
      // "January 4-14th 2026" (new format)
      /(\w+)\s+(\d{1,2})-(\d{1,2})(?:th|st|nd|rd)?\s+(\d{4})/i,
      // "2-15 of January, 2025" or "2-15 of January 2025" or "3rd-18 of May 2026"
      /(\d{1,2})(?:st|nd|rd|th)?-(\d{1,2})(?:th|st|nd|rd)?\s+of\s+(\w+),?\s+(\d{4})/i,
      // "26 may- 10 june 2026" (cross-month ranges)
      /(\d{1,2})\s+(\w+)-?\s*(\d{1,2})\s+(\w+)\s+(\d{4})/i,
      // "26 may- 10 june, 2026" (with comma)
      /(\d{1,2})\s+(\w+)-?\s*(\d{1,2})\s+(\w+),\s+(\d{4})/i,
      // "26 of may until 10th of june , 2026" (until format)
      /(\d{1,2})(?:st|nd|rd|th)?\s+of\s+(\w+)\s+until\s+(\d{1,2})(?:st|nd|rd|th)?\s+of\s+(\w+)\s*,?\s+(\d{4})/i
    ]

    for (const pattern of rangePatterns) {
      const rangeMatch = input.match(pattern)
      if (rangeMatch) {
        const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                           'july', 'august', 'september', 'october', 'november', 'december']
        
        let monthIndex, startDay, endDay, year
        
        if (pattern === rangePatterns[1]) {
          // Format: "8-20th January 2025"
          startDay = parseInt(rangeMatch[1])
          endDay = parseInt(rangeMatch[2])
          monthIndex = monthNames.findIndex(m => m.toLowerCase() === rangeMatch[3].toLowerCase())
          year = parseInt(rangeMatch[4])
        } else if (pattern === rangePatterns[3]) {
          // Format: "2-15 of January, 2025"
          startDay = parseInt(rangeMatch[1])
          endDay = parseInt(rangeMatch[2])
          monthIndex = monthNames.findIndex(m => m.toLowerCase() === rangeMatch[3].toLowerCase())
          year = parseInt(rangeMatch[4])
        } else if (pattern === rangePatterns[4] || pattern === rangePatterns[5]) {
          // Format: "26 may- 10 june 2026" or "26 may- 10 june, 2026" (cross-month)
          startDay = parseInt(rangeMatch[1])
          const startMonth = monthNames.findIndex(m => m.toLowerCase() === rangeMatch[2].toLowerCase())
          endDay = parseInt(rangeMatch[3])
          const endMonth = monthNames.findIndex(m => m.toLowerCase() === rangeMatch[4].toLowerCase())
          year = parseInt(rangeMatch[5])
          
          if (startMonth !== -1 && endMonth !== -1) {
            const departureDate = new Date(year, startMonth, startDay)
            const returnDate = new Date(year, endMonth, endDay)
            const days = Math.ceil((returnDate.getTime() - departureDate.getTime()) / (24 * 60 * 60 * 1000))
            
            return {
              startDate: departureDate.toISOString(),
              endDate: returnDate.toISOString(),
              departureDate: departureDate.toISOString().split('T')[0],
              returnDate: returnDate.toISOString().split('T')[0],
              duration: days,
              timezone: 'GMT',
              outboundFlightDate: departureDate.toISOString().split('T')[0],
              returnFlightDate: returnDate.toISOString().split('T')[0],
              preferredOutboundTime: 'morning',
              preferredReturnTime: 'afternoon'
            }
          }
        } else if (pattern === rangePatterns[6]) {
          // Format: "26 of may until 10th of june , 2026" (until format)
          startDay = parseInt(rangeMatch[1])
          const startMonth = monthNames.findIndex(m => m.toLowerCase() === rangeMatch[2].toLowerCase())
          endDay = parseInt(rangeMatch[3])
          const endMonth = monthNames.findIndex(m => m.toLowerCase() === rangeMatch[4].toLowerCase())
          year = parseInt(rangeMatch[5])
          
          if (startMonth !== -1 && endMonth !== -1) {
            const departureDate = new Date(year, startMonth, startDay)
            const returnDate = new Date(year, endMonth, endDay)
            const days = Math.ceil((returnDate.getTime() - departureDate.getTime()) / (24 * 60 * 60 * 1000))
            
            return {
              startDate: departureDate.toISOString(),
              endDate: returnDate.toISOString(),
              departureDate: departureDate.toISOString().split('T')[0],
              returnDate: returnDate.toISOString().split('T')[0],
              duration: days,
              timezone: 'GMT',
              outboundFlightDate: departureDate.toISOString().split('T')[0],
              returnFlightDate: returnDate.toISOString().split('T')[0],
              preferredOutboundTime: 'morning',
              preferredReturnTime: 'afternoon'
            }
          }
        } else {
          // Format: "December 10-22, 2024" or "January 8-20, 2025"
          monthIndex = monthNames.findIndex(m => m.toLowerCase() === rangeMatch[1].toLowerCase())
          startDay = parseInt(rangeMatch[2])
          endDay = parseInt(rangeMatch[3])
          year = parseInt(rangeMatch[4])
        }
        
        if (monthIndex !== -1) {
          const departureDate = new Date(year, monthIndex, startDay)  // First date = departure
          const returnDate = new Date(year, monthIndex, endDay)       // Second date = return
          const days = Math.ceil((returnDate.getTime() - departureDate.getTime()) / (24 * 60 * 60 * 1000))
          
          return {
            startDate: departureDate.toISOString(),
            endDate: returnDate.toISOString(),
            departureDate: departureDate.toISOString().split('T')[0],  // YYYY-MM-DD
            returnDate: returnDate.toISOString().split('T')[0],        // YYYY-MM-DD
            duration: days,
            timezone: 'GMT',
            outboundFlightDate: departureDate.toISOString().split('T')[0],
            returnFlightDate: returnDate.toISOString().split('T')[0],
            preferredOutboundTime: 'morning',
            preferredReturnTime: 'afternoon'
          }
        }
      }
    }

    // Extract specific dates like "March 15, 2024" or "15/03/2024"
    const specificDatePatterns = [
      /(\w+)\s+(\d{1,2}),?\s+(\d{4})/i, // "March 15, 2024"
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/,   // "15/03/2024"
      /(\d{1,2})-(\d{1,2})-(\d{4})/     // "15-03-2024"
    ]
    
    for (const pattern of specificDatePatterns) {
      const match = input.match(pattern)
      if (match) {
        let startDate: Date
        if (isNaN(Number(match[1]))) {
          // Month name format: "March 15, 2024"
          const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                             'july', 'august', 'september', 'october', 'november', 'december']
          const monthIndex = monthNames.findIndex(m => m.toLowerCase() === match[1].toLowerCase())
          if (monthIndex !== -1) {
            startDate = new Date(parseInt(match[3]), monthIndex, parseInt(match[2]))
          } else {
            continue
          }
        } else {
          // Numeric format: "15/03/2024"
          startDate = new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]))
        }
        
        // Get duration from same message if present
        const durationMatch = input.match(/(\d+)\s*days?/i)
        const days = durationMatch ? parseInt(durationMatch[1]) : 7 // default to 7 days
        const endDate = new Date(startDate.getTime() + (days * 24 * 60 * 60 * 1000))
        
        return {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          duration: days,
          timezone: 'GMT',
          outboundFlightDate: startDate.toISOString().split('T')[0], // YYYY-MM-DD format
          returnFlightDate: endDate.toISOString().split('T')[0],
          preferredOutboundTime: 'morning', // Default preference
          preferredReturnTime: 'afternoon'
        }
      }
    }
    
    // Fallback to duration only
    const durationMatch = input.match(/(\d+)\s*days?/i)
    if (durationMatch) {
      const days = parseInt(durationMatch[1])
      const startDate = new Date()
      startDate.setDate(startDate.getDate() + 7) // Start in a week
      const endDate = new Date(startDate.getTime() + (days * 24 * 60 * 60 * 1000))
      return {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        duration: days,
        timezone: 'GMT',
        outboundFlightDate: startDate.toISOString().split('T')[0],
        returnFlightDate: endDate.toISOString().split('T')[0],
        preferredOutboundTime: 'morning',
        preferredReturnTime: 'afternoon'
      }
    }
    return null
  }

  private extractBudget(input: string): any {
    const budgetMatch = input.match(/[$£€¥](\d+(?:,\d{3})*)/i)
    if (budgetMatch) {
      const amount = parseInt(budgetMatch[1].replace(/,/g, ''))
      const currency = budgetMatch[0].charAt(0) === '$' ? 'USD' : 
                      budgetMatch[0].charAt(0) === '£' ? 'GBP' :
                      budgetMatch[0].charAt(0) === '€' ? 'EUR' : 'JPY'
      return { amount, currency }
    }
    return null
  }

  private extractTravelers(input: string): any {
    const travelersMatch = input.match(/(\d+)\s+(people|person|adults?|travelers?)/i)
    if (travelersMatch) {
      return { adults: parseInt(travelersMatch[1]), children: 0 }
    }
    return null
  }

  private extractTravelStyle(input: string): any {
    if (/luxury|premium/i.test(input)) return 'luxury'
    if (/budget|cheap|economy/i.test(input)) return 'budget'
    if (/mid-range|standard|comfortable/i.test(input)) return 'mid-range'
    return null
  }

  // Field management
  private updateField(fieldName: string, value: any): void {
    this.tripState[fieldName as keyof TripState] = {
      name: fieldName,
      value,
      locked: false,
      lastUpdated: new Date()
    }
  }

  private lockField(fieldName: string): void {
    const field = this.tripState[fieldName as keyof TripState]
    if (field) {
      field.locked = true
      field.confirmedAt = new Date()
    }
  }

  private findFieldWaitingForConfirmation(): string | null {
    // Find the most recently updated unlocked field
    let mostRecent: { field: string, time: Date } | null = null
    
    for (const [fieldName, field] of Object.entries(this.tripState)) {
      if (field && !field.locked && field.lastUpdated) {
        if (!mostRecent || field.lastUpdated > mostRecent.time) {
          mostRecent = { field: fieldName, time: field.lastUpdated }
        }
      }
    }
    
    return mostRecent?.field || null
  }

  // Check if we can start searches (have essential fields)
  private canStartSearches(): boolean {
    const essential = ['destination', 'travelDates', 'budget', 'travelers']
    return essential.every(field => this.tripState[field as keyof TripState]?.locked)
  }

  // Get fields that are ready for searches
  private getSearchableFields(): string[] {
    const searchable = []
    if (this.tripState.destination?.locked) searchable.push('hotels', 'activities')
    if (this.tripState.origin?.locked && this.tripState.destination?.locked && this.tripState.travelDates?.locked) {
      searchable.push('flights')
    }
    return searchable
  }

  // Helper methods
  private isConfirmation(input: string): boolean {
    const trimmed = input.trim().toLowerCase()
    // Only treat as confirmation if it's a simple yes/no response
    return /^(yes|yeah|yep|yees|yess|ye|ok|okay|correct|right|exactly|that's right|absolutely|no|nope|wrong|not quite)$/i.test(trimmed) ||
           (trimmed === 'actually' && input.length < 20) // Short "actually" responses
  }

  private getFieldDescription(fieldName: string, value: any): string {
    if (!value) return ""
    
    switch (fieldName) {
      case 'destination': return `destination (${value.name})`
      case 'budget': return `total budget (${value.currency} ${value.amount})`
      case 'travelDates': return `trip length (${value.duration} days)`
      case 'travelers': return `travellers (${value.adults} adults)`
      default: return fieldName
    }
  }

  // Store pending fields for later processing
  private storePendingFields(fieldNames: string[], extractedValues: Record<string, any>): void {
    for (const fieldName of fieldNames) {
      this.pendingFields[fieldName] = extractedValues[fieldName]
    }
  }

  // Check if user is trying to change locked fields  
  private checkForLockedFieldChanges(input: string, lockedFields: string[]): ConversationResponse | null {
    // Check if explicit change command
    if (/^change\s+\w+\s+to\s+/i.test(input)) {
      // Allow explicit changes (would need admin/confirmation flow)
      return null
    }
    
    // Check if user is mentioning locked field content
    for (const fieldName of lockedFields) {
      const field = this.tripState[fieldName as keyof TripState]
      if (!field) continue
      
      // Check if user is trying to provide info for locked fields
      if (fieldName === 'destination' && this.mentionsDestination(input)) {
        // Only trigger locked field response if user is explicitly trying to provide new destination
        // Don't trigger for casual mentions or when answering other questions  
        const isExplicitDestinationChange = /^(i want to go to|going to|destination|travel to|visit)/i.test(input.trim())
        if (isExplicitDestinationChange) {
          const fieldDesc = this.getFieldDescription(fieldName, field.value)
          return {
            message: `I already have your ${fieldDesc} locked. I won't re-ask that. Is there something else I can help you with for your trip planning?`,
            needsConfirmation: false,
            canStartSearches: this.canStartSearches(),
            searchableFields: this.getSearchableFields()
          }
        }
      }
      
      if (fieldName === 'travelDates' && this.mentionsDates(input)) {
        // Only trigger locked field response if user is explicitly trying to provide new dates
        // Don't trigger for casual mentions or when answering other questions
        const isExplicitDateChange = /^(my dates are|dates are|i want to go|travel dates|change.*dates)/i.test(input.trim())
        if (isExplicitDateChange) {
          const fieldDesc = this.getFieldDescription(fieldName, field.value)
          return {
            message: `I already have your ${fieldDesc} locked. I won't re-ask that. What else would you like to tell me about your trip?`,
            needsConfirmation: false,
            canStartSearches: this.canStartSearches(),
            searchableFields: this.getSearchableFields()
          }
        }
      }
      
      if (fieldName === 'origin' && this.mentionsOrigin(input)) {
        // Only trigger locked field response if user is explicitly trying to provide new departure info
        // Don't trigger for casual mentions or when answering other questions
        const isExplicitOriginChange = /^(from|depart|departure|departing from|leaving from|flying from)/i.test(input.trim())
        if (isExplicitOriginChange) {
          const fieldDesc = this.getFieldDescription(fieldName, field.value)
          return {
            message: `I already have your departure location locked. I won't re-ask that. What other details can I get for your trip?`,
            needsConfirmation: false,
            canStartSearches: this.canStartSearches(),
            searchableFields: this.getSearchableFields()
          }
        }
      }
    }
    
    return null
  }

  // Process pending fields after confirmation
  private processPendingFields(): { fieldToConfirm?: string; readbackValue?: string } {
    const pendingFieldNames = Object.keys(this.pendingFields)
    if (pendingFieldNames.length > 0) {
      const nextField = pendingFieldNames[0]
      const value = this.pendingFields[nextField]
      
      // Update the field in trip state
      this.updateField(nextField, value)
      
      // Remove from pending
      delete this.pendingFields[nextField]
      
      return {
        fieldToConfirm: nextField,
        readbackValue: this.generateReadback(nextField)
      }
    }
    return {}
  }

  // Get current trip state for debugging
  getTripState(): TripState {
    return { ...this.tripState }
  }
}