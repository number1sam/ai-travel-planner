import { NextRequest, NextResponse } from 'next/server'
import { multiCityItineraryGenerator, type MultiCityTripRequest, type ComprehensiveItinerary } from '../../../services/MultiCityItineraryGenerator'

// Enhanced multi-city trip state model
interface TripState {
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
    comprehensiveItinerary?: ComprehensiveItinerary
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
    originalPhrase: string // What user actually said
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

import { promises as fs } from 'fs'
import { join } from 'path'

// Persistent storage that survives restarts
const STORAGE_DIR = join(process.cwd(), '.conversation-state')
const ensureStorageDir = async () => {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true })
  } catch (error) {
    // Directory already exists
  }
}

const getStateFilePath = (conversationId: string) => join(STORAGE_DIR, `${conversationId}.json`)

const saveState = async (state: TripState) => {
  await ensureStorageDir()
  const filePath = getStateFilePath(state.conversationId)
  await fs.writeFile(filePath, JSON.stringify(state, null, 2))
}

const loadState = async (conversationId: string): Promise<TripState | null> => {
  try {
    await ensureStorageDir()
    const filePath = getStateFilePath(conversationId)
    const data = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    return null // File doesn't exist
  }
}

// Enhanced destination analysis with multi-city intelligence
interface DestinationAnalysis {
  type: 'city' | 'country' | 'region' | 'multi-city' | 'comprehensive-tour' | 'unknown'
  normalized: string
  needsSpecification?: boolean
  suggestions?: string[]
  clarificationQuestion?: string
  tripScope?: {
    scope: 'single' | 'multi' | 'regional' | 'comprehensive' | 'cross-border'
    detectedCities?: string[]
    estimatedDuration?: {min: number, max: number}
    routeType?: 'linear' | 'circular' | 'hub-and-spoke'
  }
}

const detectTripScope = (input: string): {
  scope: 'single' | 'multi' | 'regional' | 'comprehensive' | 'cross-border'
  signals: string[]
  detectedCities: string[]
} => {
  const lowerInput = input.toLowerCase().trim()
  
  // Comprehensive tour signals
  const comprehensiveSignals = [
    'whole of', 'entire', 'all of', 'complete', 'comprehensive',
    'grand tour', 'full tour', 'explore all', 'see everything',
    'tour of', 'around', 'circuit', 'full experience'
  ]
  
  // Multi-city signals
  const multiCitySignals = [
    ' and ', ' & ', ' + ', 'plus', 'along with', 'combined with',
    'both', 'as well as', 'including', 'with', ', '
  ]
  
  // Regional tour signals
  const regionalSignals = [
    'region', 'area', 'coast', 'north', 'south', 'east', 'west',
    'highlands', 'lowlands', 'countryside', 'islands'
  ]
  
  // Cross-border signals
  const crossBorderSignals = [
    'and then', 'followed by', 'before going to', 'after visiting'
  ]
  
  // Check for comprehensive tour
  for (const signal of comprehensiveSignals) {
    if (lowerInput.includes(signal)) {
      return {
        scope: 'comprehensive',
        signals: [signal],
        detectedCities: []
      }
    }
  }
  
  // Check for multi-city patterns with improved parsing
  const cities: string[] = []
  
  // Handle comma-separated cities with 'and' (e.g., "London, Paris, and Rome")
  if (lowerInput.includes(',') && (lowerInput.includes(' and ') || lowerInput.includes(' & '))) {
    // Split by comma first, then handle the last part with 'and'
    let parts = input.split(',').map(s => s.trim())
    
    // Handle the last part that might contain 'and'
    const lastPart = parts[parts.length - 1]
    if (lastPart.includes(' and ') || lastPart.includes(' & ')) {
      parts = parts.slice(0, -1) // Remove last part
      const andParts = lastPart.split(/ and | & /).map(s => s.trim())
      parts.push(...andParts)
    }
    
    // Clean up city names
    const cleanedCities = parts
      .filter(city => city.length > 2)
      .map(city => city.replace(/^(and|&)\s+/i, '').trim())
    
    if (cleanedCities.length >= 2) {
      return {
        scope: 'multi',
        signals: [',', 'and'],
        detectedCities: cleanedCities
      }
    }
  }
  
  // Handle simple 'and' connections (e.g., "Dublin and Cork")
  for (const signal of multiCitySignals) {
    if (lowerInput.includes(signal) && signal !== ',') {
      // Try to extract city names around the signal
      const parts = input.split(new RegExp(signal, 'gi'))
      if (parts.length >= 2) {
        parts.forEach(part => {
          const potentialCity = part.trim()
          if (potentialCity.length > 2) {
            cities.push(potentialCity)
          }
        })
      }
      
      if (cities.length >= 2) {
        return {
          scope: 'multi',
          signals: [signal],
          detectedCities: cities
        }
      }
    }
  }
  
  // Check for regional tour
  for (const signal of regionalSignals) {
    if (lowerInput.includes(signal)) {
      return {
        scope: 'regional',
        signals: [signal],
        detectedCities: []
      }
    }
  }
  
  // Default to single destination
  return {
    scope: 'single',
    signals: [],
    detectedCities: []
  }
}

// Extract actual destination from natural language input
const extractDestinationFromInput = (input: string): string => {
  let cleaned = input.toLowerCase().trim()
  
  // Remove common travel phrases
  const travelPhrases = [
    'i would like to go to',
    'i want to go to',
    'i want to visit',
    'i would like to visit',
    'i am planning to go to',
    'i am going to',
    'i plan to visit',
    'i am traveling to',
    'take me to',
    'let me go to',
    'going to',
    'visiting',
    'traveling to'
  ]
  
  for (const phrase of travelPhrases) {
    if (cleaned.includes(phrase)) {
      cleaned = cleaned.replace(phrase, '').trim()
      break
    }
  }
  
  // Remove leading articles and prepositions
  cleaned = cleaned.replace(/^(the|a|an)\s+/i, '').trim()
  
  return cleaned || input // Return original if cleaning resulted in empty string
}

const analyzeDestination = (input: string): DestinationAnalysis => {
  const cleanedInput = extractDestinationFromInput(input)
  const lowerInput = cleanedInput.toLowerCase().trim()

  // Countries that need city specification - includes both large and smaller countries with multiple destinations
  const bigCountries: Record<string, { suggestions: string[], regions?: string[] }> = {
    // Large countries with regions
    'usa': { 
      suggestions: ['New York', 'Los Angeles', 'Chicago', 'Miami', 'San Francisco', 'Las Vegas'],
      regions: ['East Coast', 'West Coast', 'South', 'Midwest']
    },
    'united states': { 
      suggestions: ['New York', 'Los Angeles', 'Chicago', 'Miami', 'San Francisco', 'Las Vegas'],
      regions: ['East Coast', 'West Coast', 'South', 'Midwest']
    },
    'america': { 
      suggestions: ['New York', 'Los Angeles', 'Chicago', 'Miami', 'San Francisco', 'Las Vegas'],
      regions: ['East Coast', 'West Coast', 'South', 'Midwest']
    },
    'canada': { 
      suggestions: ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa'],
      regions: ['Eastern Canada', 'Western Canada']
    },
    'australia': { 
      suggestions: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Gold Coast']
    },
    'china': { 
      suggestions: ['Beijing', 'Shanghai', 'Hong Kong', 'Guangzhou', 'Shenzhen', 'Chengdu']
    },
    'india': { 
      suggestions: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Goa']
    },
    'brazil': { 
      suggestions: ['Rio de Janeiro', 'São Paulo', 'Salvador', 'Brasília', 'Fortaleza']
    },
    'russia': { 
      suggestions: ['Moscow', 'St Petersburg', 'Sochi', 'Kazan', 'Vladivostok']
    },
    'indonesia': {
      suggestions: ['Jakarta', 'Bali', 'Yogyakarta', 'Bandung', 'Surabaya']
    },
    'turkey': {
      suggestions: ['Istanbul', 'Ankara', 'Antalya', 'Cappadocia', 'Izmir']
    },
    'argentina': {
      suggestions: ['Buenos Aires', 'Mendoza', 'Bariloche', 'Salta', 'Ushuaia']
    },
    'south africa': {
      suggestions: ['Cape Town', 'Johannesburg', 'Durban', 'Stellenbosch', 'Port Elizabeth']
    },
    'egypt': {
      suggestions: ['Cairo', 'Alexandria', 'Luxor', 'Aswan', 'Hurghada']
    },
    'iran': {
      suggestions: ['Tehran', 'Isfahan', 'Shiraz', 'Yazd', 'Mashhad']
    },
    'pakistan': {
      suggestions: ['Karachi', 'Lahore', 'Islamabad', 'Peshawar', 'Multan']
    },
    'saudi arabia': {
      suggestions: ['Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam']
    },
    'thailand': {
      suggestions: ['Bangkok', 'Chiang Mai', 'Phuket', 'Pattaya', 'Krabi']
    },
    'vietnam': {
      suggestions: ['Ho Chi Minh City', 'Hanoi', 'Da Nang', 'Hoi An', 'Nha Trang']
    },
    'philippines': {
      suggestions: ['Manila', 'Cebu', 'Davao', 'Boracay', 'Palawan']
    },
    'malaysia': {
      suggestions: ['Kuala Lumpur', 'Penang', 'Langkawi', 'Johor Bahru', 'Kota Kinabalu']
    },
    'peru': {
      suggestions: ['Lima', 'Cusco', 'Arequipa', 'Trujillo', 'Iquitos']
    },
    'chile': {
      suggestions: ['Santiago', 'Valparaíso', 'Antofagasta', 'Concepción', 'Atacama Desert']
    },
    'colombia': {
      suggestions: ['Bogotá', 'Medellín', 'Cartagena', 'Cali', 'Santa Marta']
    },
    'morocco': {
      suggestions: ['Marrakech', 'Casablanca', 'Fez', 'Rabat', 'Essaouira']
    },
    // European countries (medium size but multiple key destinations)
    'germany': { 
      suggestions: ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne']
    },
    'france': { 
      suggestions: ['Paris', 'Nice', 'Lyon', 'Marseille', 'Bordeaux']
    },
    'italy': { 
      suggestions: ['Rome', 'Milan', 'Venice', 'Florence', 'Naples']
    },
    'spain': { 
      suggestions: ['Madrid', 'Barcelona', 'Seville', 'Valencia', 'Bilbao']
    },
    'uk': { 
      suggestions: ['London', 'Edinburgh', 'Manchester', 'Liverpool', 'Bath'],
      regions: ['England', 'Scotland', 'Wales', 'Northern Ireland']
    },
    'united kingdom': { 
      suggestions: ['London', 'Edinburgh', 'Manchester', 'Liverpool', 'Bath'],
      regions: ['England', 'Scotland', 'Wales', 'Northern Ireland']
    },
    'england': { 
      suggestions: ['London', 'Manchester', 'Liverpool', 'Bath', 'York', 'Cambridge'],
      regions: ['London & South East', 'North England', 'South West', 'Midlands']
    },
    'britain': { 
      suggestions: ['London', 'Edinburgh', 'Manchester', 'Liverpool', 'Bath'],
      regions: ['England', 'Scotland', 'Wales']
    },
    'poland': {
      suggestions: ['Warsaw', 'Krakow', 'Gdansk', 'Wroclaw', 'Poznan']
    },
    'netherlands': {
      suggestions: ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht', 'Eindhoven']
    },
    'belgium': {
      suggestions: ['Brussels', 'Bruges', 'Antwerp', 'Ghent', 'Leuven']
    },
    'switzerland': {
      suggestions: ['Zurich', 'Geneva', 'Bern', 'Basel', 'Lucerne']
    },
    'austria': {
      suggestions: ['Vienna', 'Salzburg', 'Innsbruck', 'Graz', 'Linz']
    },
    'greece': {
      suggestions: ['Athens', 'Thessaloniki', 'Santorini', 'Mykonos', 'Crete']
    },
    'portugal': {
      suggestions: ['Lisbon', 'Porto', 'Faro', 'Braga', 'Coimbra']
    },
    'czech republic': {
      suggestions: ['Prague', 'Brno', 'Cesky Krumlov', 'Ostrava', 'Plzen']
    },
    'hungary': {
      suggestions: ['Budapest', 'Debrecen', 'Szeged', 'Miskolc', 'Pecs']
    },
    'norway': {
      suggestions: ['Oslo', 'Bergen', 'Trondheim', 'Stavanger', 'Tromsø']
    },
    'sweden': {
      suggestions: ['Stockholm', 'Gothenburg', 'Malmö', 'Uppsala', 'Västerås']
    },
    'denmark': {
      suggestions: ['Copenhagen', 'Aarhus', 'Odense', 'Aalborg', 'Esbjerg']
    },
    'finland': {
      suggestions: ['Helsinki', 'Tampere', 'Turku', 'Oulu', 'Lahti']
    },
    'ireland': {
      suggestions: ['Dublin', 'Cork', 'Galway', 'Limerick', 'Waterford']
    },
    'scotland': {
      suggestions: ['Edinburgh', 'Glasgow', 'Aberdeen', 'Dundee', 'Stirling']
    },
    // Asian countries
    'japan': { 
      suggestions: ['Tokyo', 'Kyoto', 'Osaka', 'Hiroshima', 'Nara']
    },
    'south korea': {
      suggestions: ['Seoul', 'Busan', 'Incheon', 'Daegu', 'Jeju']
    },
    'taiwan': {
      suggestions: ['Taipei', 'Kaohsiung', 'Taichung', 'Tainan', 'Hualien']
    },
    'myanmar': {
      suggestions: ['Yangon', 'Mandalay', 'Bagan', 'Inle Lake', 'Naypyidaw']
    },
    'cambodia': {
      suggestions: ['Phnom Penh', 'Siem Reap', 'Sihanoukville', 'Battambang', 'Kampot']
    },
    'laos': {
      suggestions: ['Vientiane', 'Luang Prabang', 'Pakse', 'Savannakhet', 'Phongsali']
    },
    'sri lanka': {
      suggestions: ['Colombo', 'Kandy', 'Galle', 'Anuradhapura', 'Ella']
    },
    'bangladesh': {
      suggestions: ['Dhaka', 'Chittagong', 'Sylhet', 'Rajshahi', 'Khulna']
    },
    'nepal': {
      suggestions: ['Kathmandu', 'Pokhara', 'Chitwan', 'Lumbini', 'Bhaktaport']
    },
    // North American countries
    'mexico': { 
      suggestions: ['Mexico City', 'Cancun', 'Puerto Vallarta', 'Guadalajara', 'Playa del Carmen']
    },
    'guatemala': {
      suggestions: ['Guatemala City', 'Antigua', 'Tikal', 'Lake Atitlan', 'Quetzaltenango']
    },
    // African countries
    'kenya': {
      suggestions: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret']
    },
    'tanzania': {
      suggestions: ['Dar es Salaam', 'Arusha', 'Zanzibar', 'Mwanza', 'Dodoma']
    },
    'ethiopia': {
      suggestions: ['Addis Ababa', 'Bahir Dar', 'Gondar', 'Axum', 'Harar']
    },
    'ghana': {
      suggestions: ['Accra', 'Kumasi', 'Tamale', 'Cape Coast', 'Takoradi']
    },
    'nigeria': {
      suggestions: ['Lagos', 'Abuja', 'Kano', 'Ibadan', 'Port Harcourt']
    },
    'zimbabwe': {
      suggestions: ['Harare', 'Bulawayo', 'Victoria Falls', 'Mutare', 'Gweru']
    }
  }

  // Specific cities - these are fine as destinations (includes common abbreviations)
  const knownCities: Record<string, string> = {
    // US cities and abbreviations
    'nyc': 'New York',
    'new york city': 'New York',
    'la': 'Los Angeles', 
    'los angeles': 'Los Angeles',
    'san fran': 'San Francisco',
    'sf': 'San Francisco',
    'san francisco': 'San Francisco',
    'vegas': 'Las Vegas',
    'las vegas': 'Las Vegas',
    'miami': 'Miami',
    'chicago': 'Chicago',
    'boston': 'Boston',
    'seattle': 'Seattle',
    'denver': 'Denver',
    'philadelphia': 'Philadelphia',
    'phoenix': 'Phoenix',
    'houston': 'Houston',
    'dallas': 'Dallas',
    'san antonio': 'San Antonio',
    'san diego': 'San Diego',
    'detroit': 'Detroit',
    'memphis': 'Memphis',
    'baltimore': 'Baltimore',
    'milwaukee': 'Milwaukee',
    'albuquerque': 'Albuquerque',
    'kansas city': 'Kansas City',
    'mesa': 'Mesa',
    'virginia beach': 'Virginia Beach',
    'atlanta': 'Atlanta',
    'colorado springs': 'Colorado Springs',
    'raleigh': 'Raleigh',
    'omaha': 'Omaha',
    'long beach': 'Long Beach',
    'nashville': 'Nashville',
    'minneapolis': 'Minneapolis',
    'tulsa': 'Tulsa',
    'cleveland': 'Cleveland',
    'wichita': 'Wichita',
    'new orleans': 'New Orleans',
    // Major world cities
    'london': 'London',
    'paris': 'Paris',
    'tokyo': 'Tokyo',
    'rome': 'Rome',
    'barcelona': 'Barcelona',
    'amsterdam': 'Amsterdam',
    'berlin': 'Berlin',
    'prague': 'Prague',
    'vienna': 'Vienna',
    'madrid': 'Madrid',
    'lisbon': 'Lisbon',
    'dublin': 'Dublin',
    'edinburgh': 'Edinburgh',
    'glasgow': 'Glasgow',
    'manchester': 'Manchester',
    'liverpool': 'Liverpool',
    'birmingham': 'Birmingham',
    'bristol': 'Bristol',
    'leeds': 'Leeds',
    'sheffield': 'Sheffield',
    'newcastle': 'Newcastle',
    // Australian cities
    'sydney': 'Sydney',
    'melbourne': 'Melbourne',
    'brisbane': 'Brisbane',
    'perth': 'Perth',
    'adelaide': 'Adelaide',
    'gold coast': 'Gold Coast',
    'canberra': 'Canberra',
    'hobart': 'Hobart',
    'darwin': 'Darwin',
    // Canadian cities
    'vancouver': 'Vancouver',
    'toronto': 'Toronto',
    'montreal': 'Montreal',
    'calgary': 'Calgary',
    'ottawa': 'Ottawa',
    'edmonton': 'Edmonton',
    'quebec city': 'Quebec City',
    'winnipeg': 'Winnipeg',
    'hamilton': 'Hamilton',
    'halifax': 'Halifax',
    // European cities
    'zurich': 'Zurich',
    'geneva': 'Geneva',
    'bern': 'Bern',
    'brussels': 'Brussels',
    'bruges': 'Bruges',
    'antwerp': 'Antwerp',
    'copenhagen': 'Copenhagen',
    'stockholm': 'Stockholm',
    'oslo': 'Oslo',
    'helsinki': 'Helsinki',
    'reykjavik': 'Reykjavik',
    'warsaw': 'Warsaw',
    'krakow': 'Krakow',
    'gdansk': 'Gdansk',
    'budapest': 'Budapest',
    'athens': 'Athens',
    'thessaloniki': 'Thessaloniki',
    'santorini': 'Santorini',
    'mykonos': 'Mykonos',
    'crete': 'Crete',
    'porto': 'Porto',
    'faro': 'Faro',
    'florence': 'Florence',
    'venice': 'Venice',
    'milan': 'Milan',
    'naples': 'Naples',
    'turin': 'Turin',
    'nice': 'Nice',
    'lyon': 'Lyon',
    'marseille': 'Marseille',
    'bordeaux': 'Bordeaux',
    'toulouse': 'Toulouse',
    'munich': 'Munich',
    'hamburg': 'Hamburg',
    'frankfurt': 'Frankfurt',
    'cologne': 'Cologne',
    'dresden': 'Dresden',
    'salzburg': 'Salzburg',
    'innsbruck': 'Innsbruck',
    'graz': 'Graz',
    // Asian cities
    'beijing': 'Beijing',
    'shanghai': 'Shanghai',
    'hong kong': 'Hong Kong',
    'guangzhou': 'Guangzhou',
    'shenzhen': 'Shenzhen',
    'chengdu': 'Chengdu',
    'seoul': 'Seoul',
    'busan': 'Busan',
    'jeju': 'Jeju',
    'kyoto': 'Kyoto',
    'osaka': 'Osaka',
    'hiroshima': 'Hiroshima',
    'nara': 'Nara',
    'yokohama': 'Yokohama',
    'kobe': 'Kobe',
    'taipei': 'Taipei',
    'kaohsiung': 'Kaohsiung',
    'bangkok': 'Bangkok',
    'chiang mai': 'Chiang Mai',
    'phuket': 'Phuket',
    'pattaya': 'Pattaya',
    'krabi': 'Krabi',
    'ho chi minh city': 'Ho Chi Minh City',
    'hanoi': 'Hanoi',
    'da nang': 'Da Nang',
    'hoi an': 'Hoi An',
    'kuala lumpur': 'Kuala Lumpur',
    'penang': 'Penang',
    'langkawi': 'Langkawi',
    'singapore': 'Singapore',
    'jakarta': 'Jakarta',
    'bali': 'Bali',
    'yogyakarta': 'Yogyakarta',
    'mumbai': 'Mumbai',
    'delhi': 'Delhi',
    'bangalore': 'Bangalore',
    'chennai': 'Chennai',
    'kolkata': 'Kolkata',
    'goa': 'Goa',
    'jaipur': 'Jaipur',
    'agra': 'Agra',
    'varanasi': 'Varanasi',
    'kathmandu': 'Kathmandu',
    'pokhara': 'Pokhara',
    'colombo': 'Colombo',
    'kandy': 'Kandy',
    'galle': 'Galle',
    // Middle Eastern cities
    'istanbul': 'Istanbul',
    'ankara': 'Ankara',
    'antalya': 'Antalya',
    'cappadocia': 'Cappadocia',
    'izmir': 'Izmir',
    'dubai': 'Dubai',
    'abu dhabi': 'Abu Dhabi',
    'doha': 'Doha',
    'riyadh': 'Riyadh',
    'jeddah': 'Jeddah',
    'cairo': 'Cairo',
    'alexandria': 'Alexandria',
    'luxor': 'Luxor',
    'aswan': 'Aswan',
    'tehran': 'Tehran',
    'isfahan': 'Isfahan',
    'shiraz': 'Shiraz',
    'tel aviv': 'Tel Aviv',
    'jerusalem': 'Jerusalem',
    'beirut': 'Beirut',
    'amman': 'Amman',
    // African cities
    'cairo': 'Cairo',
    'cape town': 'Cape Town',
    'johannesburg': 'Johannesburg',
    'durban': 'Durban',
    'marrakech': 'Marrakech',
    'casablanca': 'Casablanca',
    'fez': 'Fez',
    'rabat': 'Rabat',
    'nairobi': 'Nairobi',
    'mombasa': 'Mombasa',
    'dar es salaam': 'Dar es Salaam',
    'zanzibar': 'Zanzibar',
    'addis ababa': 'Addis Ababa',
    'lagos': 'Lagos',
    'abuja': 'Abuja',
    'accra': 'Accra',
    'kumasi': 'Kumasi',
    // South American cities
    'rio de janeiro': 'Rio de Janeiro',
    'sao paulo': 'São Paulo',
    'salvador': 'Salvador',
    'brasilia': 'Brasília',
    'fortaleza': 'Fortaleza',
    'buenos aires': 'Buenos Aires',
    'mendoza': 'Mendoza',
    'bariloche': 'Bariloche',
    'lima': 'Lima',
    'cusco': 'Cusco',
    'arequipa': 'Arequipa',
    'bogota': 'Bogotá',
    'medellin': 'Medellín',
    'cartagena': 'Cartagena',
    'cali': 'Cali',
    'santiago': 'Santiago',
    'valparaiso': 'Valparaíso',
    // Other notable destinations
    'reykjavik': 'Reykjavik',
    'mexico city': 'Mexico City',
    'cancun': 'Cancun',
    'puerto vallarta': 'Puerto Vallarta',
    'playa del carmen': 'Playa del Carmen',
    'tulum': 'Tulum'
  }

  // First, detect trip scope to understand user intent
  const tripScope = detectTripScope(input)
  
  // Handle multi-city requests
  if (tripScope.scope === 'multi' && tripScope.detectedCities.length >= 2) {
    return {
      type: 'multi-city',
      normalized: tripScope.detectedCities.join(' + '),
      tripScope: {
        scope: tripScope.scope,
        detectedCities: tripScope.detectedCities,
        estimatedDuration: {min: tripScope.detectedCities.length * 2, max: tripScope.detectedCities.length * 4},
        routeType: 'linear'
      },
      clarificationQuestion: `I noticed you mentioned: ${tripScope.detectedCities.join(', ')}. 

I can help you plan this in two different ways:

🏙️ **Single-City Focus**: Choose one main city as your base with day trips to nearby places
• Stay in one hotel throughout your trip
• Deep exploration of one area
• Day trips to surrounding attractions
• More relaxed pace

🗺️ **Multi-City Adventure**: Visit each city with separate accommodations
• ${tripScope.detectedCities.length}-city tour: ${tripScope.detectedCities.join(' → ')}
• ${tripScope.detectedCities.length * 2}-${tripScope.detectedCities.length * 4} days recommended
• Different hotels in each city
• More ground to cover

Which approach interests you more? Say "single city" or "multi-city tour".`
    }
  }
  
  // Handle comprehensive tour requests
  if (tripScope.scope === 'comprehensive') {
    // Extract country name from comprehensive tour phrases
    let countryName = input
    for (const signal of ['whole of', 'entire', 'all of', 'complete', 'tour of']) {
      if (lowerInput.includes(signal)) {
        countryName = input.replace(new RegExp(signal, 'gi'), '').trim()
        break
      }
    }
    
    const normalizedCountryName = countryName.charAt(0).toUpperCase() + countryName.slice(1).toLowerCase()
    
    // Check if it's a country we know
    if (bigCountries[countryName.toLowerCase()]) {
      const countryInfo = bigCountries[countryName.toLowerCase()]
      
      return {
        type: 'comprehensive-tour',
        normalized: `Complete ${normalizedCountryName} Tour`,
        tripScope: {
          scope: 'comprehensive',
          detectedCities: countryInfo.suggestions,
          estimatedDuration: {min: 10, max: 21},
          routeType: 'circular'
        },
        suggestions: countryInfo.suggestions,
        clarificationQuestion: `🌍 **A Grand ${normalizedCountryName} Adventure!**

For a comprehensive ${normalizedCountryName} tour, I can create an amazing multi-city route covering:

🏙️ **Major Cities**: ${countryInfo.suggestions.slice(0, 4).join(', ')}${countryInfo.suggestions.length > 4 ? ` and ${countryInfo.suggestions.length - 4} more` : ''}
${countryInfo.regions ? `🗺️ **Regions**: ${countryInfo.regions.join(', ')}` : ''}
📅 **Duration**: 10-21 days recommended for the full experience

What type of comprehensive tour interests you?
• **Classic Route** (10-14 days): Main highlights
• **Grand Tour** (15-21 days): Deep exploration with hidden gems
• **Express Tour** (7-10 days): Greatest hits only

Which sounds perfect for your ${normalizedCountryName} adventure?`
      }
    }
  }
  
  // Check if it's a known city first (single city request)
  if (knownCities[lowerInput]) {
    return {
      type: 'city',
      normalized: knownCities[lowerInput],
      tripScope: {
        scope: 'single',
        estimatedDuration: {min: 3, max: 7},
        routeType: 'hub-and-spoke'
      }
    }
  }

  // Check if it's a big country that needs specification (single country request)
  if (bigCountries[lowerInput]) {
    const countryInfo = bigCountries[lowerInput]
    const countryName = cleanedInput.charAt(0).toUpperCase() + cleanedInput.slice(1).toLowerCase()
    
    let questionText = `Fantastic choice! ${countryName} is incredible for travelers. I need to know which part of ${countryName} interests you most:

🏙️ **Focus on One City** (Perfect for a deeper experience):
• **${countryInfo.suggestions[0]}** - The main hub with world-class attractions
• **${countryInfo.suggestions[1]}** - ${countryInfo.suggestions[1] === 'Manchester' ? 'Northern charm and culture' : 'Historic charm and local culture'}
• **${countryInfo.suggestions[2]}** - ${countryInfo.suggestions[2] === 'Liverpool' ? 'Music history and waterfront' : 'Beautiful architecture and local life'}

🗺️ **Multi-City Adventure** (See more of the country):
• **Regional Tour**: 2-3 cities (perfect for 5-10 days)
• **Grand Tour**: Experience ${countryName.toLowerCase()} comprehensively (10+ days)
${countryInfo.regions ? `\n🎯 **By Region**: ${countryInfo.regions.join(' • ')}` : ''}

Which approach sounds more appealing to you? Or if you have specific cities in mind, just tell me which ones!`

    return {
      type: 'country',
      normalized: countryName,
      needsSpecification: true,
      suggestions: countryInfo.suggestions,
      clarificationQuestion: questionText,
      tripScope: {
        scope: 'single',
        estimatedDuration: {min: 3, max: 21}
      }
    }
  }

  // If not recognized, treat as potential city and normalize capitalization
  const normalized = cleanedInput.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ')

  return {
    type: 'city', // Assume it's a city if we don't recognize it
    normalized,
    tripScope: {
      scope: 'single',
      estimatedDuration: {min: 3, max: 7},
      routeType: 'hub-and-spoke'
    }
  }
}

const normalizeCity = (city: string): string => {
  const result = analyzeDestination(city)
  return result.normalized
}

// Enhanced date normalization with common sense
const normalizeDates = (phrase: string): { 
  startDate: string | null, 
  endDate: string | null, 
  success: boolean,
  interpretation: string,
  needsClarification?: boolean,
  clarificationQuestion?: string
} => {
  const cleanPhrase = phrase.toLowerCase().trim()
  
  // Month name mapping
  const months: Record<string, number> = {
    'january': 0, 'jan': 0, 'february': 1, 'feb': 1,
    'march': 2, 'mar': 2, 'april': 3, 'apr': 3,
    'may': 4, 'june': 5, 'jun': 5, 'july': 6, 'jul': 6,
    'august': 7, 'aug': 7, 'september': 8, 'sep': 8,
    'october': 9, 'oct': 9, 'november': 10, 'nov': 10,
    'december': 11, 'dec': 11
  }

  const getMonthNumber = (monthName: string): number | null => {
    return months[monthName.toLowerCase()] ?? null
  }

  const today = new Date()
  const currentYear = today.getFullYear()

  // Pattern 1: "november 2025" or "nov 2025" - month and year only
  const monthYearMatch = cleanPhrase.match(/(\w+)\s*,?\s*(\d{4})/)
  if (monthYearMatch) {
    const monthName = monthYearMatch[1]
    const year = parseInt(monthYearMatch[2])
    const monthNum = getMonthNumber(monthName)
    
    if (monthNum !== null) {
      // User only specified month/year - need to ask for specific dates
      return {
        startDate: null,
        endDate: null,
        success: false,
        interpretation: '',
        needsClarification: true,
        clarificationQuestion: `Great! You want to travel in ${monthName} ${year}. What specific dates in ${monthName}? For example, "November 10-20" or "mid-November for 10 days"?`
      }
    }
  }

  // Pattern 2: "november 11-22 2025" - date range with year
  const rangeWithYearMatch = cleanPhrase.match(/(\w+)\s*(\d{1,2})-(\d{1,2})\s*,?\s*(\d{4})/)
  if (rangeWithYearMatch) {
    const monthName = rangeWithYearMatch[1]
    const startDay = parseInt(rangeWithYearMatch[2])
    const endDay = parseInt(rangeWithYearMatch[3])
    const year = parseInt(rangeWithYearMatch[4])
    const monthNum = getMonthNumber(monthName)
    
    if (monthNum !== null && startDay <= 31 && endDay <= 31 && startDay <= endDay) {
      const startDate = new Date(year, monthNum, startDay)
      const endDate = new Date(year, monthNum, endDay)
      
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
      
      return {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        success: true,
        interpretation: `${monthName} ${startDay}-${endDay}, ${year} (${days} days)`
      }
    }
  }

  // Pattern 3: "march 15-22" - current or next year
  const rangeMatch = cleanPhrase.match(/(\w+)\s*(\d{1,2})-(\d{1,2})/) ||
                    cleanPhrase.match(/(\d{1,2})-(\d{1,2})\s*(\w+)/)
  
  if (rangeMatch) {
    const monthName = rangeMatch[1].match(/[a-z]+/i)?.[0] || rangeMatch[3]
    const startDay = parseInt(rangeMatch[2])
    const endDay = parseInt(rangeMatch[3]) || parseInt(rangeMatch[2])
    const monthNum = getMonthNumber(monthName)
    
    if (monthNum !== null && startDay <= 31 && endDay <= 31 && startDay <= endDay) {
      // Determine year - if month has passed this year, use next year
      let year = currentYear
      if (monthNum < today.getMonth() || 
          (monthNum === today.getMonth() && startDay < today.getDate())) {
        year = currentYear + 1
      }
      
      const startDate = new Date(year, monthNum, startDay)
      const endDate = new Date(year, monthNum, endDay)
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
      
      return {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        success: true,
        interpretation: `${monthName} ${startDay}-${endDay}, ${year} (${days} days)`
      }
    }
  }

  // Pattern 4: Duration patterns: "10 days in march", "2 weeks in november"
  const durationInMonthMatch = cleanPhrase.match(/(\d+)\s*(day|week)s?\s+in\s+(\w+)/)
  if (durationInMonthMatch) {
    const num = parseInt(durationInMonthMatch[1])
    const unit = durationInMonthMatch[2]
    const monthName = durationInMonthMatch[3]
    const monthNum = getMonthNumber(monthName)
    
    if (monthNum !== null) {
      return {
        startDate: null,
        endDate: null,
        success: false,
        interpretation: '',
        needsClarification: true,
        clarificationQuestion: `Perfect! ${num} ${unit}s in ${monthName}. What specific dates would work best? For example, "early ${monthName}" or "${monthName} 10th onwards"?`
      }
    }
  }

  // Pattern 5: Simple duration: "10 days", "2 weeks"
  const durationMatch = cleanPhrase.match(/(\d+)\s*(day|week|month)s?/)
  if (durationMatch) {
    const num = parseInt(durationMatch[1])
    const unit = durationMatch[2]
    
    const start = new Date()
    start.setDate(start.getDate() + 7) // Start a week from now by default
    const end = new Date(start)
    
    if (unit === 'day') end.setDate(end.getDate() + num - 1)
    else if (unit === 'week') end.setDate(end.getDate() + (num * 7) - 1)
    else if (unit === 'month') end.setMonth(end.getMonth() + num)
    
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      success: true,
      interpretation: `${num} ${unit}${num > 1 ? 's' : ''} starting ${start.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`
    }
  }

  // Pattern 6: "First/last week of month"
  const weekMatch = cleanPhrase.match(/(first|last|mid|middle)\s+(\w+)/) ||
                   cleanPhrase.match(/(early|late)\s+(\w+)/)
  if (weekMatch) {
    const position = weekMatch[1]
    const monthName = weekMatch[2]
    const monthNum = getMonthNumber(monthName)
    
    if (monthNum !== null) {
      return {
        startDate: null,
        endDate: null,
        success: false,
        interpretation: '',
        needsClarification: true,
        clarificationQuestion: `Great! ${position} ${monthName}. How many days would you like to travel? For example, "7 days" or "2 weeks"?`
      }
    }
  }

  // If no patterns match, provide helpful clarification
  return { 
    startDate: null, 
    endDate: null, 
    success: false, 
    interpretation: '',
    needsClarification: true,
    clarificationQuestion: `I'd like to understand your travel dates better. Could you try something like:
• "March 15-22" (specific date range)
• "10 days in April" (duration and month)  
• "Early December for a week" (timeframe and duration)
What works best for you?`
  }
}

// Booking timeline intelligence
const analyzeBookingTimeline = (startDate: string, endDate: string): {
  daysUntilTravel: number
  bookingCategory: 'last-minute' | 'short-notice' | 'advance' | 'far-advance'
  strategy: string
  urgencyNote?: string
} => {
  const today = new Date()
  const travelStart = new Date(startDate)
  const travelEnd = new Date(endDate)
  
  // Calculate days until travel
  const msUntilTravel = travelStart.getTime() - today.getTime()
  const daysUntilTravel = Math.ceil(msUntilTravel / (1000 * 60 * 60 * 24))
  
  // Calculate trip duration
  const tripDuration = Math.ceil((travelEnd.getTime() - travelStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
  
  if (daysUntilTravel < 0) {
    return {
      daysUntilTravel,
      bookingCategory: 'last-minute',
      strategy: 'Travel date has passed',
      urgencyNote: '⚠️ The travel dates you mentioned are in the past. Did you mean a different year?'
    }
  } else if (daysUntilTravel <= 14) {
    return {
      daysUntilTravel,
      bookingCategory: 'last-minute',
      strategy: 'Last-minute deals and flexible options',
      urgencyNote: `🚨 Traveling in ${daysUntilTravel} days! I'll focus on available hotels and flexible bookings.`
    }
  } else if (daysUntilTravel <= 60) {
    return {
      daysUntilTravel,
      bookingCategory: 'short-notice',
      strategy: 'Mix of advance deals and remaining availability',
      urgencyNote: `⏰ ${daysUntilTravel} days until travel. Good time for deals with decent availability.`
    }
  } else if (daysUntilTravel <= 180) {
    return {
      daysUntilTravel,
      bookingCategory: 'advance',
      strategy: 'Early bird discounts and better selection',
      urgencyNote: `📅 ${Math.floor(daysUntilTravel/30)} months ahead - great for early bird rates and prime locations.`
    }
  } else {
    return {
      daysUntilTravel,
      bookingCategory: 'far-advance',
      strategy: 'Maximum choice and long-term deals',
      urgencyNote: `🎯 ${Math.floor(daysUntilTravel/30)} months ahead - plenty of time for the best deals and locations.`
    }
  }
}

const createInitialState = (conversationId: string): TripState => ({
  destination: { value: '', filled: false, locked: false, normalized: '' },
  origin: { value: '', filled: false, locked: false, normalized: '' },
  dates: { startDate: '', endDate: '', originalPhrase: '', filled: false, locked: false },
  travelers: { value: 1, filled: false, locked: false },
  budget: { value: 0, currency: 'USD', filled: false, locked: false },
  expectedSlot: 'destination',
  conversationId,
  lastUpdated: new Date().toISOString()
})

// GET: Retrieve state
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const conversationId = searchParams.get('conversationId')
  
  if (!conversationId) {
    return NextResponse.json({ error: 'conversationId required' }, { status: 400 })
  }
  
  let state = await loadState(conversationId)
  if (!state) {
    state = createInitialState(conversationId)
    await saveState(state)
  }
  
  return NextResponse.json({ state })
}

// POST: Update state
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { conversationId, slot, value, explicitChange = false } = body
    
    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId required' }, { status: 400 })
    }
    
    let state = await loadState(conversationId) || createInitialState(conversationId)
    
    // Validation layer - the doorman
    const canUpdate = (slot: string, currentState: TripState): boolean => {
      const slotData = currentState[slot as keyof TripState]
      
      // Allow update if not locked, or if explicit change request
      if (typeof slotData === 'object' && 'locked' in slotData) {
        return !slotData.locked || explicitChange
      }
      
      return true
    }
    
    if (!canUpdate(slot, state)) {
      return NextResponse.json({
        success: false,
        message: `${slot} is locked. Use 'change ${slot} to...' to modify it.`,
        state
      })
    }
    
    // Process the update based on slot type
    let confirmation = ''
    let shouldLock = false
    let nextSlot = state.expectedSlot
    
    switch (slot) {
      case 'destination': {
        const destinationAnalysis = analyzeDestination(value)
        
        if (destinationAnalysis.needsSpecification && destinationAnalysis.clarificationQuestion) {
          // Need clarification - could be country, multi-city, or comprehensive tour
          return NextResponse.json({
            success: false,
            needsClarification: true,
            message: destinationAnalysis.clarificationQuestion,
            state
          })
        }
        
        // Handle different destination types
        if (destinationAnalysis.type === 'multi-city') {
          // Multi-city trip detected
          state.destination = {
            value,
            normalized: destinationAnalysis.normalized,
            filled: true,
            locked: false, // Don't lock yet - need confirmation
            type: destinationAnalysis.type,
            tripScope: destinationAnalysis.tripScope
          }
          
          // Create preliminary multi-city plan
          if (destinationAnalysis.tripScope?.detectedCities) {
            state.multiCityPlan = {
              cities: destinationAnalysis.tripScope.detectedCities.map((city, index) => ({
                name: city,
                country: 'Unknown', // Will be determined later
                nights: Math.ceil((destinationAnalysis.tripScope?.estimatedDuration?.max || 7) / destinationAnalysis.tripScope.detectedCities.length),
                priority: index === 0 ? 'primary' : 'secondary',
                position: index + 1
              })),
              route: {
                sequence: destinationAnalysis.tripScope.detectedCities,
                totalDays: destinationAnalysis.tripScope.estimatedDuration?.max || 7,
                routeType: destinationAnalysis.tripScope.routeType || 'linear'
              },
              transport: [], // Will be filled later
              confirmed: false
            }
          }
          
          confirmation = destinationAnalysis.clarificationQuestion || 'Multi-city trip detected!'
          // First collect essential information before route confirmation
          if (!state.dates.filled) {
            nextSlot = 'dates'
          } else if (!state.budget.filled) {
            nextSlot = 'budget' 
          } else if (!state.travelers.filled) {
            nextSlot = 'travelers'
          } else {
            nextSlot = 'route-confirmation'
          }
          shouldLock = false
          
        } else if (destinationAnalysis.type === 'comprehensive-tour') {
          // Comprehensive country tour
          state.destination = {
            value,
            normalized: destinationAnalysis.normalized,
            filled: true,
            locked: false, // Don't lock yet - need tour type confirmation
            type: destinationAnalysis.type,
            tripScope: destinationAnalysis.tripScope
          }
          
          confirmation = destinationAnalysis.clarificationQuestion || 'Comprehensive tour detected!'
          nextSlot = 'destination-scope'
          shouldLock = false
          
        } else {
          // Single city or standard destination
          state.destination = {
            value,
            normalized: destinationAnalysis.normalized,
            filled: true,
            locked: true,  // Lock immediately for single destinations
            type: destinationAnalysis.type,
            tripScope: destinationAnalysis.tripScope
          }
          
          confirmation = `Your destination is ${destinationAnalysis.normalized}; I've locked that in. What city will you depart from?`
          nextSlot = 'origin'
          shouldLock = true
        }
        break
      }
      
      case 'origin': {
        if (state.destination.locked) {
          const normalized = normalizeCity(value)
          state.origin = {
            value,
            normalized,
            filled: true,
            locked: true
          }
          confirmation = `Got it! Flying from ${normalized} to ${state.destination.normalized}. When would you like to travel? You can say things like "March 15-22" or "10 days starting March 15".`
          nextSlot = 'dates'
          shouldLock = true
        } else {
          return NextResponse.json({
            success: false,
            message: 'Please confirm your destination first.',
            state
          })
        }
        break
      }
      
      case 'dates': {
        const dateResult = normalizeDates(value)
        if (dateResult.success && dateResult.startDate && dateResult.endDate) {
          // Analyze booking timeline for strategy
          const timeline = analyzeBookingTimeline(dateResult.startDate, dateResult.endDate)
          
          state.dates = {
            startDate: dateResult.startDate,
            endDate: dateResult.endDate,
            originalPhrase: value,
            filled: true,
            locked: false // Don't lock yet - wait for confirmation
          }
          
          let confirmationText = `I understand you want to travel ${dateResult.interpretation}.`
          
          // Add booking timeline intelligence
          if (timeline.urgencyNote) {
            confirmationText += `\n\n${timeline.urgencyNote}`
          }
          
          confirmationText += `\n\nIs that correct? (Yes to confirm, or clarify if I misunderstood)`
          
          confirmation = confirmationText
          nextSlot = 'dates-confirm'
          shouldLock = false
        } else if (dateResult.needsClarification && dateResult.clarificationQuestion) {
          // Use the smart clarification question from the date parser
          return NextResponse.json({
            success: false,
            needsClarification: true,
            message: dateResult.clarificationQuestion,
            state
          })
        } else {
          // Generic fallback (shouldn't happen with new parser)
          return NextResponse.json({
            success: false,
            needsClarification: true,
            message: `I want to make sure I understand your dates correctly. Could you try something like "March 15-22" or "10 days starting March 15"?`,
            state
          })
        }
        break
      }
      
      case 'dates-confirm': {
        const lowerValue = value.toLowerCase()
        if (lowerValue.includes('yes') || lowerValue.includes('correct') || lowerValue.includes('right')) {
          // Lock the dates now and store booking timeline
          const timeline = analyzeBookingTimeline(state.dates.startDate, state.dates.endDate)
          
          state.dates.locked = true
          state.dates.bookingTimeline = {
            daysUntilTravel: timeline.daysUntilTravel,
            category: timeline.bookingCategory,
            strategy: timeline.strategy
          }
          
          confirmation = `Perfect! Travel dates locked in: ${state.dates.originalPhrase}. How many people will be traveling?`
          nextSlot = 'travelers'
          shouldLock = true
        } else {
          // User wants to clarify - keep dates slot open
          state.dates = { startDate: '', endDate: '', originalPhrase: '', filled: false, locked: false }
          confirmation = `No problem! Please tell me your travel dates again. You can say things like "March 15-22" or "10 days starting March 15".`
          nextSlot = 'dates'
          shouldLock = false
        }
        break
      }
      
      case 'travelers': {
        const num = parseInt(value)
        if (num > 0 && num <= 20) {
          state.travelers = {
            value: num,
            filled: true,
            locked: true
          }
          const travelerText = num === 1 ? 'traveler' : 'travelers'
          confirmation = `Perfect! ${num} ${travelerText} - locked in. What's your approximate budget for this trip? (e.g., "$3000" or "£2500")`
          nextSlot = 'budget'
          shouldLock = true
        } else {
          return NextResponse.json({
            success: false,
            message: 'Please provide a number between 1 and 20 for travelers.',
            state
          })
        }
        break
      }
      
      case 'budget': {
        const amount = parseFloat(value.replace(/[^0-9.]/g, ''))
        if (amount > 0) {
          state.budget = {
            value: amount,
            currency: 'USD', // Could be extracted from value
            filled: true,
            locked: true
          }
          
          // Create complete summary now that we have all essential info
          // Add booking timeline intelligence
          const timeline = state.dates.startDate ? 
            analyzeBookingTimeline(state.dates.startDate, state.dates.endDate) : null
          
          let bookingStrategy = ''
          if (timeline) {
            switch (timeline.bookingCategory) {
              case 'last-minute':
                bookingStrategy = '\n\n🚨 **Booking Strategy**: Last-minute travel! I\'ll prioritize available options and flexible bookings.'
                break
              case 'short-notice':
                bookingStrategy = '\n\n⏰ **Booking Strategy**: Good timing for deals with decent selection still available.'
                break
              case 'advance':
                bookingStrategy = '\n\n📅 **Booking Strategy**: Perfect timing for early bird discounts and premium locations.'
                break
              case 'far-advance':
                bookingStrategy = '\n\n🎯 **Booking Strategy**: Excellent timing! Maximum choice and best long-term deals available.'
                break
            }
          }
          
          let summary = `Excellent! I have all the essential information:

📍 **Destination**: ${state.destination.normalized}
✈️ **Departing from**: ${state.origin.normalized}
📅 **Travel dates**: ${state.dates.originalPhrase || 'To be confirmed'}
👥 **Travelers**: ${state.travelers.value} ${state.travelers.value === 1 ? 'person' : 'people'}
💰 **Budget**: $${amount.toLocaleString()}${bookingStrategy}

Would you like to add any specific preferences (hotel type, activities, dietary needs) or shall I start creating your personalized itinerary now?

You can say "create my plan" to proceed, or tell me about any preferences you have!`
          
          // Update confirmation for multi-city plans
          if (state.multiCityPlan && !state.multiCityPlan.confirmed) {
            summary += `

🗺️ **Multi-City Route Ready for Confirmation**
I've prepared your ${state.multiCityPlan.cities.length}-city itinerary:
📍 **Route**: ${state.multiCityPlan.route.sequence.join(' → ')}
📅 **Duration**: ${state.multiCityPlan.route.totalDays} days

Should I create this comprehensive multi-city plan? Say "yes" to proceed with detailed itinerary generation!`
          }

          confirmation = summary
          // For multi-city plans, go to route confirmation after budget is set
          if (state.multiCityPlan && !state.multiCityPlan.confirmed) {
            nextSlot = 'route-confirmation'
          } else {
            nextSlot = 'preferences-or-create'
          }
          shouldLock = true
        } else {
          return NextResponse.json({
            success: false,
            message: 'Please provide a valid budget amount (e.g., "$2000").',
            state
          })
        }
        break
      }
      
      case 'destination-scope': {
        const lowerValue = value.toLowerCase()
        
        // Handle single city selection from multi-city options
        if (state.multiCityPlan && !state.multiCityPlan.confirmed) {
          const cities = state.multiCityPlan.cities.map(c => c.name)
          let chosenCity = null
          
          // Check if user mentioned a specific city
          for (const city of cities) {
            if (lowerValue.includes(city.toLowerCase())) {
              chosenCity = city
              break
            }
          }
          
          if (chosenCity) {
            // User selected a specific city for single-city focus
            state.destination = {
              value: chosenCity,
              normalized: chosenCity,
              filled: true,
              locked: true,
              type: 'city'
            }
            
            // Clear multi-city plan
            state.multiCityPlan = undefined
            
            confirmation = `Perfect! Let's focus on ${chosenCity} for your trip.

🏨 **Single Hotel Strategy**: I'll find you one excellent accommodation in ${chosenCity}
🎯 **Deep Exploration**: We'll plan the best attractions, restaurants, and experiences in ${chosenCity}
🚶 **Day Trips**: Any nearby attractions can be explored as day trips from your base
🎪 **Local Activities**: Focus on authentic local experiences and hidden gems

This approach gives you more time to truly experience ${chosenCity} rather than rushing between cities.

What city will you be departing from to start your ${chosenCity} adventure?`
            nextSlot = 'origin'
            shouldLock = true
          } else {
            // User didn't select a valid city
            confirmation = `I didn't catch which city you'd prefer. Please choose one of these:

${cities.map((city, index) => `• **${city}**`).join('\n')}

Just say the name of the city you'd like to focus on (e.g., "${cities[0]}").`
            nextSlot = 'destination-scope'
            shouldLock = false
          }
        }
        // Handle comprehensive tour type selection
        else if (lowerValue.includes('classic') || lowerValue.includes('10') || lowerValue.includes('14')) {
          // Classic Route selected
          const countryInfo = state.destination.tripScope?.detectedCities || []
          const selectedCities = countryInfo.slice(0, 4) // Top 4 cities for classic route
          
          state.multiCityPlan = {
            cities: selectedCities.map((city, index) => ({
              name: city,
              country: state.destination.normalized?.replace('Complete ', '').replace(' Tour', '') || 'Unknown',
              nights: index === 0 ? 3 : 2, // Primary city gets more nights
              priority: index === 0 ? 'primary' : 'secondary',
              position: index + 1
            })),
            route: {
              sequence: selectedCities,
              totalDays: 12,
              routeType: 'circular'
            },
            transport: [], // Will be filled later
            confirmed: false
          }
          
          confirmation = `🌟 **Classic ${state.destination.normalized?.replace('Complete ', '').replace(' Tour', '')} Route** selected!

📍 **Your 12-day journey**: ${selectedCities.join(' → ')}
🏨 **Accommodation**: 3 nights in ${selectedCities[0]}, 2-3 nights in each other city
🚗 **Transport**: Mix of trains, flights, and scenic drives

This gives you the perfect overview while allowing time to really experience each destination.

What city will you be departing from for this amazing adventure?`
          
          state.destination.locked = true
          nextSlot = 'origin'
          shouldLock = true
          
        } else if (lowerValue.includes('grand') || lowerValue.includes('15') || lowerValue.includes('21')) {
          // Grand Tour selected
          const countryInfo = state.destination.tripScope?.detectedCities || []
          
          state.multiCityPlan = {
            cities: countryInfo.map((city, index) => ({
              name: city,
              country: state.destination.normalized?.replace('Complete ', '').replace(' Tour', '') || 'Unknown',
              nights: index < 2 ? 3 : 2, // First 2 cities get more nights
              priority: index < 3 ? 'primary' : 'secondary',
              position: index + 1
            })),
            route: {
              sequence: countryInfo,
              totalDays: 18,
              routeType: 'circular'
            },
            transport: [], // Will be filled later
            confirmed: false
          }
          
          confirmation = `🎯 **Grand ${state.destination.normalized?.replace('Complete ', '').replace(' Tour', '')} Tour** selected!

📍 **Your epic 18-day adventure**: ${countryInfo.slice(0, 6).join(' → ')}${countryInfo.length > 6 ? ` + ${countryInfo.length - 6} more` : ''}
🏨 **Deep Exploration**: 3 nights in major cities, 2 nights in each region
🌟 **Hidden Gems**: Includes off-the-beaten-path destinations and local experiences

This comprehensive journey covers everything from iconic landmarks to authentic local culture.

What city will you be departing from for this grand adventure?`
          
          state.destination.locked = true
          nextSlot = 'origin'
          shouldLock = true
          
        } else if (lowerValue.includes('express') || lowerValue.includes('7') || lowerValue.includes('10')) {
          // Express Tour selected
          const countryInfo = state.destination.tripScope?.detectedCities || []
          const selectedCities = countryInfo.slice(0, 3) // Top 3 cities for express
          
          state.multiCityPlan = {
            cities: selectedCities.map((city, index) => ({
              name: city,
              country: state.destination.normalized?.replace('Complete ', '').replace(' Tour', '') || 'Unknown',
              nights: index === 0 ? 3 : 2,
              priority: 'primary',
              position: index + 1
            })),
            route: {
              sequence: selectedCities,
              totalDays: 8,
              routeType: 'linear'
            },
            transport: [], // Will be filled later
            confirmed: false
          }
          
          confirmation = `⚡ **Express ${state.destination.normalized?.replace('Complete ', '').replace(' Tour', '')} Tour** selected!

📍 **Your focused 8-day trip**: ${selectedCities.join(' → ')}
🎯 **Greatest Hits**: Only the absolute must-see destinations
🏨 **Efficient**: 2-3 nights per city for maximum impact

Perfect for experiencing the highlights without rushing.

What city will you be departing from?`
          
          state.destination.locked = true
          nextSlot = 'origin'
          shouldLock = true
          
        } else {
          confirmation = `I'd love to help plan your comprehensive tour! Please choose one of these options:

• **Classic Route** (10-14 days): Main highlights
• **Grand Tour** (15-21 days): Deep exploration with hidden gems  
• **Express Tour** (7-10 days): Greatest hits only

Which type of tour interests you most?`
          nextSlot = 'destination-scope'
          shouldLock = false
        }
        break
      }
      
      case 'route-confirmation': {
        const lowerValue = value.toLowerCase()
        
        if (lowerValue.includes('yes') || lowerValue.includes('create') || lowerValue.includes('plan') || lowerValue.includes('sounds good') || lowerValue.includes('multi-city') || lowerValue.includes('multi city')) {
          // User confirmed the multi-city route
          if (state.multiCityPlan) {
            state.multiCityPlan.confirmed = true
          }
          state.destination.locked = true
          
          const cities = state.multiCityPlan?.cities.map(c => c.name).join(', ') || 'your cities'
          
          // Generate comprehensive multi-city itinerary
          let comprehensiveItinerary: ComprehensiveItinerary | null = null
          try {
            if (state.multiCityPlan && state.dates.filled && state.budget.filled && state.travelers.filled) {
              console.log('🌍 Generating comprehensive multi-city itinerary...')
              
              const request: MultiCityTripRequest = {
                destinations: state.multiCityPlan.cities.map(c => c.name),
                totalDays: state.multiCityPlan.route.totalDays,
                budget: state.budget.value || 3000,
                currency: 'USD',
                travelDates: {
                  start: state.dates.startDate,
                  end: state.dates.endDate,
                  flexible: false
                },
                travelers: {
                  adults: state.travelers.value || 1,
                  children: 0,
                  groupType: state.travelers.value > 2 ? 'friends' : (state.travelers.value === 2 ? 'couple' : 'solo')
                },
                preferences: {
                  pace: 'moderate',
                  transportPreference: 'mixed',
                  accommodationStyle: 'mid-range',
                  interests: ['cultural', 'food', 'nature'],
                  physicalAbility: 'moderate',
                  uniqueExperiences: true,
                  flexibility: 'moderate'
                },
                constraints: {
                  routeType: state.multiCityPlan.route.routeType as any
                }
              }
              
              comprehensiveItinerary = await multiCityItineraryGenerator.generateItinerary(request)
              console.log('✅ Comprehensive itinerary generated successfully!')
            }
          } catch (error) {
            console.error('❌ Error generating comprehensive itinerary:', error)
            // Continue without comprehensive details
          }
          
          confirmation = `🎉 Perfect! Your ${state.multiCityPlan?.cities.length || 2}-city adventure is confirmed!

📍 **Route**: ${state.multiCityPlan?.route.sequence.join(' → ')}
📅 **Duration**: ${state.multiCityPlan?.route.totalDays} days total
🏨 **Cities**: ${cities}

${comprehensiveItinerary ? `🎯 **Comprehensive Itinerary Generated!**
🗺️ **Route Efficiency**: ${comprehensiveItinerary.route.efficiency}% (${comprehensiveItinerary.route.totalDistance}km total)
✈️ **Transport**: ${comprehensiveItinerary.transport.legs.length} connections
🏨 **Accommodations**: ${comprehensiveItinerary.accommodation.totalNights} nights across ${comprehensiveItinerary.accommodation.cities.length} cities
🎪 **Activities**: ${comprehensiveItinerary.activities.totalActivities} experiences planned
💰 **Budget**: $${comprehensiveItinerary.budget.totalBudget} optimized across all categories
📊 **Planning Confidence**: ${comprehensiveItinerary.metadata.confidence}%

**Key Highlights:**
${comprehensiveItinerary.overview.highlights.slice(0, 3).map(h => `• ${h}`).join('\n')}

` : ''}Now, what city will you be departing from to start this amazing journey?`
          
          nextSlot = 'origin'
          shouldLock = true
          
        } else if (lowerValue.includes('focus') || lowerValue.includes('just one') || lowerValue.includes('single') || lowerValue.includes('single city')) {
          // User wants to focus on single destination instead
          const cities = state.multiCityPlan?.cities.map(c => c.name) || []
          
          if (cities.length > 1) {
            // Ask which city to focus on
            confirmation = `Perfect! Single-city focus it is. Which city would you like to make your main base?

${cities.map((city, index) => `${index + 1}. **${city}** - Base yourself here and explore the surrounding area`).join('\n')}

Just tell me which city you'd prefer (e.g., "${cities[0]}" or "${cities[1]}").`
            nextSlot = 'destination-scope' // Use destination-scope to handle city selection
            shouldLock = false
          } else {
            const chosenCity = cities[0] || 'the city'
            state.destination = {
              value: chosenCity,
              normalized: chosenCity,
              filled: true,
              locked: true,
              type: 'city'
            }
            
            // Clear multi-city plan
            state.multiCityPlan = undefined
            
            confirmation = `Excellent! Let's focus on ${chosenCity} for a more in-depth experience. 

🏨 **Single Hotel**: We'll find you one great accommodation
🎯 **Deep Exploration**: Focus on ${chosenCity}'s best attractions and experiences  
🚶 **Day Trips**: Explore nearby attractions as day trips from your base

What city will you be departing from?`
            nextSlot = 'origin'
          }
          shouldLock = true
          
        } else {
          confirmation = `I'd like to confirm your travel plans. Are you interested in:

🗺️ **Multi-City Tour**: Visit ${state.multiCityPlan?.cities.map(c => c.name).join(', ')}
🏙️ **Single City Focus**: Explore just one destination in depth

Which would you prefer for your trip?`
          nextSlot = 'route-confirmation'
          shouldLock = false
        }
        break
      }

      case 'preferences-or-create': {
        const lowerValue = value.toLowerCase()
        if (lowerValue.includes('create') || lowerValue.includes('start') || lowerValue.includes('begin') || lowerValue.includes('proceed')) {
          // User wants to create the plan now
          let planType = 'personalized itinerary'
          let planDetails = 'flights, hotels, and activities'
          
          if (state.multiCityPlan?.confirmed) {
            planType = `${state.multiCityPlan.cities.length}-city adventure`
            planDetails = `flights between cities, hotels in each location, transport connections, and activities for each destination`
          }
          
          confirmation = `Perfect! I'll start creating your ${planType} for ${state.destination.normalized}. This will include ${planDetails} that match your budget and preferences.`
          nextSlot = 'complete'
          shouldLock = true
        } else {
          // User is providing additional preferences - store them and ask if ready to proceed
          confirmation = `Got it! I've noted your preferences. Is there anything else you'd like to add, or shall I create your itinerary now? Say "create my plan" when you're ready!`
          nextSlot = 'preferences-or-create' // Stay in this state to collect more
          shouldLock = false
        }
        break
      }
    }
    
    // Update expected slot and timestamp
    state.expectedSlot = nextSlot
    state.lastUpdated = new Date().toISOString()
    
    // Save state to persistent storage
    await saveState(state)
    
    // Handle clarification cases (multi-city or comprehensive tours)
    if ((nextSlot === 'route-confirmation' || nextSlot === 'destination-scope') && !shouldLock) {
      return NextResponse.json({
        success: false,
        needsClarification: true,
        message: confirmation,
        state
      })
    }
    
    return NextResponse.json({
      success: true,
      confirmation,
      locked: shouldLock,
      expectedSlot: nextSlot,
      state
    })
    
  } catch (error) {
    console.error('State update error:', error)
    return NextResponse.json({ error: 'Failed to update state' }, { status: 500 })
  }
}