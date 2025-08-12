'use client'

import { useState, useRef, useEffect } from 'react'
import { User, Send, Plane, Hotel, Calendar, Users, DollarSign, Eye, ExternalLink } from 'lucide-react'
import BackToHomeButton from '../../components/BackToHomeButton'
import PlanModal from '../../components/PlanModal'
import WebTravelSearchService from '../../services/WebTravelSearchService'
// Mock interfaces for flight and hotel services
interface FlightSearchParams {
  origin: string
  destination: string
  departureDate: string
  returnDate?: string
  passengers: number
  budget?: number
  preferences?: {
    preferNonStop?: boolean
    classOfService?: 'economy' | 'premium_economy' | 'business' | 'first'
  }
}

interface FlightResult {
  id: string
  airline: string
  flightNumber: string
  departure: { airport: string; time: string }
  arrival: { airport: string; time: string }
  duration: string
  layovers: Array<{ airport: string; duration: string }>
  price: { amount: number; currency: string }
  amenities: string[]
  score: number
}

interface HotelSearchParams {
  destination: string
  checkInDate: string
  checkOutDate: string
  guests: number
  budget?: number
  preferences?: {
    starRating?: number
    amenities?: string[]
    location?: string
  }
}

interface HotelResult {
  id: string
  name: string
  starRating: number
  address: string
  amenities: string[]
  rooms: Array<{
    type: string
    description: string
    price: { amount: number; currency: string; perNight: boolean }
    available: number
  }>
  location: {
    type: string
    nearbyAttractions: string[]
  }
  reviews: {
    overall: number
    count: number
  }
  score: number
}

interface Message {
  id: string
  text: string
  sender: 'user' | 'ai'
  timestamp: Date
  showPlanButton?: boolean
}

interface TravelPlan {
  destination: string
  origin?: string
  dates?: { checkIn: string; checkOut: string }
  travelers?: number
  budget?: number
  duration?: number
  preferences?: string
  flights?: FlightResult[]
  hotels?: HotelResult[]
}

export default function PlannerPage() {
  const [currentMessage, setCurrentMessage] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [detectedDestination, setDetectedDestination] = useState<string | null>(null)
  const [conversationStep, setConversationStep] = useState(0)
  const [travelPlan, setTravelPlan] = useState<TravelPlan | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [webSearchEnabled, setWebSearchEnabled] = useState(true)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const webSearchService = useRef(new WebTravelSearchService())

  // Initialize with welcome message - only once on component mount
  useEffect(() => {
    const welcomeMessage: Message = {
      id: '1',
      text: `Hello! I'm your AI travel assistant. ✈️

I'll help you plan your perfect trip step by step. I'll ask you about:
• Your destination (specific city)
• Departure location  
• Number of travelers
• Budget
• Duration
• Your interests

Once I have all the details, I'll create a complete travel plan with flights, hotels, and a detailed itinerary!

**Let's start: What destination are you interested in visiting? You can mention a country (like "Italy") and I'll show you popular cities, or specify a city directly (like "Rome").**`,
      sender: 'ai',
      timestamp: new Date()
    }
    setMessages([welcomeMessage])
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Country and destination detection function
  const detectDestination = (message: string): { type: 'city' | 'country', name: string, country?: string } | null => {
    const input = message.toLowerCase()
    
    // Specific cities (these take priority)
    const cities = {
      // France
      'paris': { country: 'France', keywords: ['paris', 'pariz', 'paries', 'eiffel tower', 'louvre', 'champs elysees'] },
      'nice': { country: 'France', keywords: ['nice', 'french riviera', 'cote d\'azur'] },
      'lyon': { country: 'France', keywords: ['lyon', 'lyons'] },
      'marseille': { country: 'France', keywords: ['marseille', 'marseilles'] },
      
      // Italy
      'rome': { country: 'Italy', keywords: ['rome', 'colosseum', 'vatican', 'trevi fountain'] },
      'florence': { country: 'Italy', keywords: ['florence', 'firenze', 'uffizi', 'duomo'] },
      'venice': { country: 'Italy', keywords: ['venice', 'venezia', 'gondola', 'st marks'] },
      'milan': { country: 'Italy', keywords: ['milan', 'milano', 'scala', 'fashion'] },
      'naples': { country: 'Italy', keywords: ['naples', 'napoli', 'pompeii'] },
      
      // UK
      'london': { country: 'United Kingdom', keywords: ['london', 'londun', 'londn', 'big ben', 'tower bridge', 'british museum'] },
      'edinburgh': { country: 'Scotland', keywords: ['edinburgh', 'scotland', 'castle', 'royal mile'] },
      'manchester': { country: 'England', keywords: ['manchester', 'northern england'] },
      'liverpool': { country: 'England', keywords: ['liverpool', 'beatles', 'mersey'] },
      
      // Spain
      'barcelona': { country: 'Spain', keywords: ['barcelona', 'barcelonn', 'barcelons', 'gaudi', 'sagrada familia', 'catalonia'] },
      'madrid': { country: 'Spain', keywords: ['madrid', 'madred', 'madris', 'prado', 'spanish capital'] },
      'seville': { country: 'Spain', keywords: ['seville', 'sevilla', 'serville', 'andalusia'] },
      'valencia': { country: 'Spain', keywords: ['valencia', 'paella'] },
      
      // Germany
      'berlin': { country: 'Germany', keywords: ['berlin', 'brandenburg', 'german capital'] },
      'munich': { country: 'Germany', keywords: ['munich', 'munchen', 'bavaria', 'oktoberfest'] },
      'hamburg': { country: 'Germany', keywords: ['hamburg', 'port city'] },
      'cologne': { country: 'Germany', keywords: ['cologne', 'koln', 'cathedral'] },
      
      // Netherlands
      'amsterdam': { country: 'Netherlands', keywords: ['amsterdam', 'canals', 'dutch', 'anne frank'] },
      'rotterdam': { country: 'Netherlands', keywords: ['rotterdam', 'port', 'modern'] },
      
      // Other major cities
      'tokyo': { country: 'Japan', keywords: ['tokyo', 'shibuya', 'harajuku', 'senso-ji'] },
      'osaka': { country: 'Japan', keywords: ['osaka', 'kansai', 'takoyaki'] },
      'kyoto': { country: 'Japan', keywords: ['kyoto', 'temples', 'geisha', 'bamboo'] },
      'new york': { country: 'United States', keywords: ['new york', 'nyc', 'manhattan', 'brooklyn', 'times square'] },
      'los angeles': { country: 'United States', keywords: ['los angeles', 'la', 'hollywood', 'beverly hills'] },
      'chicago': { country: 'United States', keywords: ['chicago', 'windy city', 'deep dish', 'millennium park'] },
      'miami': { country: 'United States', keywords: ['miami', 'south beach', 'art deco', 'little havana'] },
      'las vegas': { country: 'United States', keywords: ['las vegas', 'vegas', 'strip', 'casinos'] },
      'san francisco': { country: 'United States', keywords: ['san francisco', 'sf', 'golden gate', 'alcatraz'] },
      'boston': { country: 'United States', keywords: ['boston', 'freedom trail', 'harvard', 'mit'] },
      'washington dc': { country: 'United States', keywords: ['washington dc', 'dc', 'capitol', 'white house'] },
      'seattle': { country: 'United States', keywords: ['seattle', 'space needle', 'pike place'] },
      'orlando': { country: 'United States', keywords: ['orlando', 'disney world', 'universal studios'] },
      'dubai': { country: 'UAE', keywords: ['dubai', 'burj khalifa', 'emirates'] },
      'istanbul': { country: 'Turkey', keywords: ['istanbul', 'bosphorus', 'hagia sophia'] },
      'bangkok': { country: 'Thailand', keywords: ['bangkok', 'temples', 'street food'] },
      'phuket': { country: 'Thailand', keywords: ['phuket', 'beaches', 'patong', 'phi phi'] },
      'chiang mai': { country: 'Thailand', keywords: ['chiang mai', 'northern thailand', 'temples', 'mountains'] },
      'pattaya': { country: 'Thailand', keywords: ['pattaya', 'beach resort', 'walking street'] },
      'krabi': { country: 'Thailand', keywords: ['krabi', 'railay beach', 'limestone cliffs'] },
      'singapore': { country: 'Singapore', keywords: ['singapore', 'marina bay', 'gardens by the bay'] },
      
      // India destinations
      'delhi': { country: 'India', keywords: ['delhi', 'new delhi', 'red fort', 'india gate', 'old delhi'] },
      'mumbai': { country: 'India', keywords: ['mumbai', 'bombay', 'bollywood', 'gateway of india'] },
      'goa': { country: 'India', keywords: ['goa', 'beaches', 'panaji', 'portuguese', 'beach parties'] },
      'jaipur': { country: 'India', keywords: ['jaipur', 'pink city', 'rajasthan', 'palace', 'amber fort'] },
      'kerala': { country: 'India', keywords: ['kerala', 'backwaters', 'kochi', 'alleppey', 'coconut'] },
      'agra': { country: 'India', keywords: ['agra', 'taj mahal', 'wonder of the world'] },
      'varanasi': { country: 'India', keywords: ['varanasi', 'benares', 'ganges', 'spiritual', 'ghats'] },
      'bangalore': { country: 'India', keywords: ['bangalore', 'bengaluru', 'silicon valley', 'tech hub'] },
      'chennai': { country: 'India', keywords: ['chennai', 'madras', 'south india', 'temple city'] },
      'kolkata': { country: 'India', keywords: ['kolkata', 'calcutta', 'cultural capital', 'durga puja'] },
      'hyderabad': { country: 'India', keywords: ['hyderabad', 'charminar', 'biryani', 'tech city'] },
      'pune': { country: 'India', keywords: ['pune', 'poona', 'maharashtra', 'education hub'] },
      
      // Caribbean destinations
      'barbados': { country: 'Barbados', keywords: ['barbados', 'bridgetown', 'caribbean', 'rum', 'beaches'] },
      'jamaica': { country: 'Jamaica', keywords: ['jamaica', 'kingston', 'montego bay', 'negril', 'bob marley'] },
      'bahamas': { country: 'Bahamas', keywords: ['bahamas', 'nassau', 'paradise island', 'atlantis'] },
      'aruba': { country: 'Aruba', keywords: ['aruba', 'oranjestad', 'eagle beach', 'palm beach'] },
      'trinidad': { country: 'Trinidad and Tobago', keywords: ['trinidad', 'port of spain', 'carnival'] },
      'antigua': { country: 'Antigua and Barbuda', keywords: ['antigua', 'st johns', '365 beaches'] },
      'st lucia': { country: 'Saint Lucia', keywords: ['st lucia', 'saint lucia', 'pitons', 'castries'] }
    }

    // Countries (only if no specific city is mentioned)
    const countries = {
      'france': { keywords: ['france', 'french'], cities: ['Paris', 'Nice', 'Lyon', 'Marseille', 'Cannes', 'Bordeaux'] },
      'italy': { keywords: ['italy', 'italian'], cities: ['Rome', 'Florence', 'Venice', 'Milan', 'Naples', 'Bologna'] },
      'spain': { keywords: ['spain', 'spanish'], cities: ['Barcelona', 'Madrid', 'Seville', 'Valencia', 'Bilbao', 'Granada'] },
      'germany': { keywords: ['germany', 'german'], cities: ['Berlin', 'Munich', 'Hamburg', 'Cologne', 'Frankfurt', 'Dresden'] },
      'japan': { keywords: ['japan', 'japanese'], cities: ['Tokyo', 'Osaka', 'Kyoto', 'Hiroshima', 'Nara', 'Yokohama'] },
      'thailand': { keywords: ['thailand', 'thai'], cities: ['Bangkok', 'Phuket', 'Chiang Mai', 'Pattaya', 'Krabi'] },
      'greece': { keywords: ['greece', 'greek'], cities: ['Athens', 'Santorini', 'Mykonos', 'Thessaloniki', 'Crete', 'Rhodes'] },
      'portugal': { keywords: ['portugal', 'portuguese'], cities: ['Lisbon', 'Porto', 'Lagos', 'Sintra', 'Coimbra'] },
      'netherlands': { keywords: ['netherlands', 'holland', 'dutch'], cities: ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht'] },
      'united kingdom': { keywords: ['uk', 'britain', 'british', 'england', 'united kingdom'], cities: ['London', 'Edinburgh', 'Manchester', 'Liverpool', 'Bath', 'York'] },
      'turkey': { keywords: ['turkey', 'turkish'], cities: ['Istanbul', 'Cappadocia', 'Antalya', 'Izmir', 'Ankara'] },
      'croatia': { keywords: ['croatia', 'croatian'], cities: ['Dubrovnik', 'Split', 'Zagreb', 'Plitvice', 'Hvar'] },
      'morocco': { keywords: ['morocco', 'moroccan'], cities: ['Marrakech', 'Casablanca', 'Fez', 'Rabat', 'Chefchaouen'] },
      'egypt': { keywords: ['egypt', 'egyptian', 'pyramids'], cities: ['Cairo', 'Alexandria', 'Luxor', 'Aswan', 'Hurghada'] },
      'india': { keywords: ['india', 'indian'], cities: ['Delhi', 'Mumbai', 'Goa', 'Jaipur', 'Kerala', 'Agra', 'Varanasi'] },
      'united states': { keywords: ['usa', 'united states', 'america', 'us', 'united states of america'], cities: ['New York', 'Los Angeles', 'Chicago', 'Miami', 'Las Vegas', 'San Francisco', 'Boston', 'Washington DC'] },
      'caribbean': { keywords: ['caribbean', 'west indies'], cities: ['Barbados', 'Jamaica', 'Bahamas', 'Aruba', 'Trinidad', 'Antigua', 'St Lucia'] }
    }

    // First check for specific cities - use word boundaries to prevent partial matches
    for (const [cityName, cityData] of Object.entries(cities)) {
      if (cityData.keywords.some(keyword => {
        // Create a regex with word boundaries to ensure exact word matches
        const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'i')
        return regex.test(input)
      })) {
        return {
          type: 'city',
          name: cityName.charAt(0).toUpperCase() + cityName.slice(1),
          country: cityData.country
        }
      }
    }

    // Then check for countries - also use word boundaries
    for (const [countryName, countryData] of Object.entries(countries)) {
      if (countryData.keywords.some(keyword => {
        // Create a regex with word boundaries to ensure exact word matches
        const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'i')
        return regex.test(input)
      })) {
        return {
          type: 'country',
          name: countryName.charAt(0).toUpperCase() + countryName.slice(1),
        }
      }
    }
    
    // If no exact match found, try to extract a potential destination name
    const extractPotentialDestination = (text: string): string | null => {
      // Remove common travel phrases
      const cleanText = text.replace(/\b(i want to|would like to|planning to|going to|visit|travel to|trip to|go to|to go to|like to go to)\b/gi, '')
        .replace(/\b(the|a|an)\b/gi, '')
        .trim()
      
      // Look for capitalized words that could be place names
      const words = cleanText.split(' ')
      const potentialPlaces = words.filter(word => {
        // Filter out common non-destination words
        const excludeWords = ['trip', 'vacation', 'holiday', 'travel', 'visit', 'planning', 'with', 'for', 'in', 'on', 'at']
        return word.length > 2 && 
               !excludeWords.includes(word.toLowerCase()) &&
               /^[A-Za-z\s-']+$/.test(word) // Only letters, spaces, hyphens, and apostrophes
      })
      
      if (potentialPlaces.length > 0) {
        // Take the first 1-2 words as the destination
        return potentialPlaces.slice(0, 2).join(' ').trim()
      }
      
      return null
    }
    
    // Try to extract a potential destination
    const potentialDestination = extractPotentialDestination(input)
    if (potentialDestination && potentialDestination.length > 2) {
      // Treat as a city if it's a single word or short phrase
      return {
        type: 'city',
        name: potentialDestination.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ')
      }
    }
    
    return null
  }

  // Get popular cities for a country
  const getCitiesForCountry = (country: string): string[] => {
    const countryCities: Record<string, string[]> = {
      'france': ['Paris', 'Nice', 'Lyon', 'Marseille', 'Cannes', 'Bordeaux', 'Strasbourg', 'Toulouse'],
      'italy': ['Rome', 'Florence', 'Venice', 'Milan', 'Naples', 'Bologna', 'Turin', 'Palermo'],
      'spain': ['Barcelona', 'Madrid', 'Seville', 'Valencia', 'Bilbao', 'Granada', 'San Sebastian', 'Cordoba'],
      'germany': ['Berlin', 'Munich', 'Hamburg', 'Cologne', 'Frankfurt', 'Dresden', 'Heidelberg', 'Nuremberg'],
      'japan': ['Tokyo', 'Osaka', 'Kyoto', 'Hiroshima', 'Nara', 'Yokohama', 'Kobe', 'Fukuoka'],
      'thailand': ['Bangkok', 'Phuket', 'Chiang Mai', 'Pattaya', 'Krabi', 'Koh Samui', 'Hua Hin'],
      'greece': ['Athens', 'Santorini', 'Mykonos', 'Thessaloniki', 'Crete', 'Rhodes', 'Corfu', 'Zakynthos'],
      'portugal': ['Lisbon', 'Porto', 'Lagos', 'Sintra', 'Coimbra', 'Aveiro', 'Braga', 'Óbidos'],
      'netherlands': ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht', 'Maastricht', 'Groningen'],
      'united kingdom': ['London', 'Edinburgh', 'Manchester', 'Liverpool', 'Bath', 'York', 'Cambridge', 'Oxford'],
      'turkey': ['Istanbul', 'Cappadocia', 'Antalya', 'Izmir', 'Ankara', 'Bodrum', 'Pamukkale'],
      'croatia': ['Dubrovnik', 'Split', 'Zagreb', 'Plitvice Lakes', 'Hvar', 'Rovinj', 'Zadar'],
      'morocco': ['Marrakech', 'Casablanca', 'Fez', 'Rabat', 'Chefchaouen', 'Essaouira', 'Meknes'],
      'egypt': ['Cairo', 'Alexandria', 'Luxor', 'Aswan', 'Hurghada', 'Sharm El Sheikh'],
      'india': ['Delhi', 'Mumbai', 'Goa', 'Jaipur', 'Kerala', 'Agra', 'Varanasi', 'Bangalore', 'Chennai'],
      'united states': ['New York', 'Los Angeles', 'Chicago', 'Miami', 'Las Vegas', 'San Francisco', 'Boston', 'Washington DC', 'Seattle', 'Orlando'],
      'caribbean': ['Barbados', 'Jamaica', 'Bahamas', 'Aruba', 'Trinidad', 'Antigua', 'St Lucia', 'Dominican Republic']
    }

    return countryCities[country.toLowerCase()] || []
  }

  // Generate comprehensive research for unknown destinations
  const generateDestinationResearch = (destination: string): string => {
    console.log(`🔍 Researching destination: ${destination}`)
    
    // Determine likely region and characteristics based on name patterns and common knowledge
    const research = researchDestinationIntelligently(destination)
    
    let response = `Excellent! **${destination}** ${research.flag} 🌍\n\n`
    
    if (research.isCountry) {
      response += `**About ${destination}:**\n`
      response += `${destination} is ${research.description} Known for ${research.knownFor}, it offers ${research.experiences}.\n\n`
      
      response += `**Major Cities & Destinations:**\n`
      research.majorCities.forEach(city => {
        response += `• **${city.name}** - ${city.description}\n`
      })
      response += `\n`
      
      response += `**Key Highlights:**\n`
      research.highlights.forEach(highlight => {
        response += `• ${highlight}\n`
      })
      response += `\n`
    } else {
      response += `**About ${destination}:**\n`
      response += `${destination} is ${research.description} ${research.additionalInfo}\n\n`
      
      response += `**What to Expect:**\n`
      research.highlights.forEach(highlight => {
        response += `• ${highlight}\n`
      })
      response += `\n`
    }
    
    response += `**Travel Information:**\n`
    response += `• **Best time to visit:** ${research.bestTime}\n`
    response += `• **Climate:** ${research.climate}\n`
    response += `• **Getting there:** ${research.access}\n`
    response += `• **Language:** ${research.language}\n`
    if (research.currency) {
      response += `• **Currency:** ${research.currency}\n`
    }
    
    response += `\nI'll help you create the perfect itinerary for ${destination}!`
    
    return response
  }

  // Research destination intelligently based on name patterns and knowledge
  const researchDestinationIntelligently = (destination: string) => {
    const dest = destination.toLowerCase()
    
    // Regional patterns and intelligent defaults
    const patterns = {
      // Asian countries/cities
      asian: {
        patterns: ['stan', 'abad', 'pur', 'ganj', 'nagar', 'bhutan', 'nepal', 'myanmar', 'lanka', 'cambodia', 'laos', 'mongolia'],
        flag: '🏔️',
        defaultClimate: 'Varies from tropical to temperate depending on region and altitude',
        defaultLanguage: 'Local languages with English often spoken in tourist areas',
        defaultBestTime: 'October to March (avoiding monsoon season)',
        currency: 'Local currency',
        experiences: 'stunning landscapes, rich cultural heritage, and spiritual experiences'
      },
      // European patterns  
      european: {
        patterns: ['burg', 'heim', 'stad', 'ville', 'ova', 'ica', 'ania', 'land', 'mark', 'way', 'iceland', 'estonia', 'latvia', 'lithuania', 'slovakia', 'slovenia'],
        flag: '🏰',
        defaultClimate: 'Temperate with distinct seasons',
        defaultLanguage: 'Local European language, with English widely understood',
        defaultBestTime: 'May to September (warmer weather)',
        currency: 'Euro (EUR) or local currency',
        experiences: 'historic architecture, cultural treasures, and diverse landscapes'
      },
      // African patterns
      african: {
        patterns: ['nia', 'ana', 'wana', 'kara', 'mali', 'chad', 'togo', 'benin', 'ghana', 'ivory', 'sierra', 'liberia', 'guinea', 'senegal', 'gambia', 'mauritania', 'madagascar', 'mozambique', 'zimbabwe', 'zambia', 'botswana', 'namibia'],
        flag: '🦁',
        defaultClimate: 'Generally warm with wet and dry seasons',
        defaultLanguage: 'Local languages with colonial languages (English, French, Portuguese)',
        defaultBestTime: 'Dry season (varies by region, typically May to September)',
        currency: 'Local currency',
        experiences: 'incredible wildlife, diverse cultures, and dramatic landscapes'
      },
      // Island/Pacific patterns
      island: {
        patterns: ['island', 'islands', 'samoa', 'fiji', 'tonga', 'vanuatu', 'solomon', 'kiribati', 'tuvalu', 'nauru', 'palau', 'marshall'],
        flag: '🏝️',
        defaultClimate: 'Tropical with warm temperatures year-round',
        defaultLanguage: 'English and local Polynesian/Melanesian languages',
        defaultBestTime: 'May to October (dry season)',
        currency: 'USD or local currency',
        experiences: 'pristine beaches, crystal-clear waters, and unique island culture'
      },
      // South American patterns
      southAmerican: {
        patterns: ['guay', 'ina', 'uador', 'ombia', 'ezuela', 'yana', 'uriname', 'razil', 'olivia', 'aragua', 'hile', 'eru'],
        flag: '🌎',
        defaultClimate: 'Diverse from tropical to temperate depending on latitude and altitude',
        defaultLanguage: 'Spanish or Portuguese, with indigenous languages',
        defaultBestTime: 'Varies by region - generally April to October',
        currency: 'Local currency',
        experiences: 'amazing biodiversity, ancient cultures, and diverse landscapes'
      }
    }
    
    // Determine region
    let region = 'international'
    let regionData = {
      flag: '🌍',
      defaultClimate: 'Varies by location and season',
      defaultLanguage: 'Local language with English often understood in tourist areas',
      defaultBestTime: 'Year-round, with peak seasons varying',
      currency: 'Local currency',
      experiences: 'unique culture, local attractions, and memorable experiences'
    }
    
    for (const [regionName, data] of Object.entries(patterns)) {
      if (data.patterns.some(pattern => dest.includes(pattern))) {
        region = regionName
        regionData = data
        break
      }
    }
    
    // Generate intelligent content based on region
    const isCountry = !dest.includes('city') && !dest.includes('town') && (dest.length > 4 || ['fiji', 'peru', 'chad', 'mali', 'cuba', 'iran', 'iraq'].includes(dest))
    
    if (isCountry) {
      return {
        isCountry: true,
        flag: regionData.flag,
        description: generateCountryDescription(destination, region),
        knownFor: generateKnownFor(destination, region),
        experiences: regionData.experiences,
        majorCities: generateMajorCities(destination, region),
        highlights: generateCountryHighlights(destination, region),
        bestTime: regionData.defaultBestTime,
        climate: regionData.defaultClimate,
        access: generateAccessInfo(destination, region),
        language: regionData.defaultLanguage,
        currency: regionData.currency
      }
    } else {
      return {
        isCountry: false,
        flag: regionData.flag,
        description: generateCityDescription(destination, region),
        additionalInfo: generateCityAdditionalInfo(destination, region),
        highlights: generateCityHighlights(destination, region),
        bestTime: regionData.defaultBestTime,
        climate: regionData.defaultClimate,
        access: generateAccessInfo(destination, region),
        language: regionData.defaultLanguage,
        currency: regionData.currency
      }
    }
  }
  
  // Helper functions for generating intelligent content
  const generateCountryDescription = (destination: string, region: string): string => {
    const descriptions = {
      asian: `a captivating ${region === 'asian' ? 'Asian' : ''} nation with a rich tapestry of traditions and landscapes.`,
      european: `a charming European country with deep historical roots and cultural significance.`,
      african: `a vibrant African nation known for its diverse cultures and natural beauty.`,
      island: `a stunning island destination in the Pacific with pristine natural beauty.`,
      southAmerican: `a fascinating South American country with incredible biodiversity and culture.`,
      international: `a remarkable destination with its own unique character and attractions.`
    }
    return descriptions[region] || descriptions.international
  }
  
  const generateKnownFor = (destination: string, region: string): string => {
    const knownFors = {
      asian: 'ancient temples, spiritual traditions, mountain landscapes, and warm hospitality',
      european: 'historic castles, cultural heritage, architectural marvels, and scenic countryside', 
      african: 'wildlife safaris, tribal cultures, dramatic landscapes, and adventure activities',
      island: 'crystal-clear waters, coral reefs, tropical beaches, and island traditions',
      southAmerican: 'ancient civilizations, rainforests, mountain ranges, and colonial architecture',
      international: 'unique attractions, local culture, natural beauty, and distinctive experiences'
    }
    return knownFors[region] || knownFors.international
  }
  
  const generateMajorCities = (destination: string, region: string) => {
    // Generate plausible city names based on the country name and regional patterns
    const cityTypes = {
      asian: ['Capital City', 'Temple City', 'Mountain Town', 'Ancient City'],
      european: ['Historic Center', 'Royal City', 'Medieval Town', 'Cultural Hub'],
      african: ['National Capital', 'Coastal City', 'Safari Town', 'Trading Center'],
      island: ['Main Island', 'Port City', 'Resort Area', 'Cultural Center'],
      southAmerican: ['Capital City', 'Colonial Town', 'Mountain City', 'Coastal Port'],
      international: ['Main City', 'Cultural Center', 'Historic Town', 'Economic Hub']
    }
    
    const types = cityTypes[region] || cityTypes.international
    return types.slice(0, 3).map((type, index) => ({
      name: index === 0 ? `${destination} City` : type,
      description: `${type.toLowerCase()} with local attractions and cultural sites`
    }))
  }
  
  const generateCountryHighlights = (destination: string, region: string) => {
    const highlights = {
      asian: [
        'Ancient temples and spiritual sites',
        'Stunning mountain and valley landscapes', 
        'Traditional festivals and ceremonies',
        'Local cuisine and tea culture',
        'Trekking and adventure opportunities'
      ],
      european: [
        'Historic castles and monuments',
        'Charming old town centers',
        'Local museums and galleries',
        'Traditional cuisine and markets',
        'Scenic countryside and villages'
      ],
      african: [
        'National parks and wildlife reserves',
        'Cultural villages and tribal experiences',
        'Dramatic landscapes and natural wonders',
        'Traditional music and dance',
        'Local crafts and markets'
      ],
      island: [
        'Pristine beaches and coral reefs',
        'Water sports and diving opportunities', 
        'Island hopping adventures',
        'Local Polynesian/Melanesian culture',
        'Tropical rainforests and nature walks'
      ],
      southAmerican: [
        'Ancient archaeological sites',
        'Diverse ecosystems and wildlife',
        'Colonial architecture and churches',
        'Indigenous cultures and traditions',
        'Adventure activities and trekking'
      ],
      international: [
        'Local cultural attractions',
        'Natural landmarks and scenic areas',
        'Traditional cuisine and dining',
        'Historical sites and museums',
        'Unique local experiences'
      ]
    }
    
    return (highlights[region] || highlights.international).slice(0, 4)
  }
  
  const generateCityDescription = (destination: string, region: string): string => {
    const descriptions = {
      asian: `a fascinating ${region === 'asian' ? 'Asian' : ''} city that blends traditional culture with modern development.`,
      european: `a historic European city with centuries of culture and architectural heritage.`,
      african: `a dynamic African city showcasing the continent's rich culture and traditions.`,
      island: `a beautiful island city surrounded by tropical paradise and natural beauty.`,
      southAmerican: `a vibrant South American city with colonial charm and modern energy.`,
      international: `a unique city destination with its own character and local attractions.`
    }
    return descriptions[region] || descriptions.international
  }
  
  const generateCityAdditionalInfo = (destination: string, region: string): string => {
    return `Visitors can explore local neighborhoods, experience the culture, and discover what makes this destination special.`
  }
  
  const generateCityHighlights = (destination: string, region: string) => {
    const highlights = {
      asian: [
        'Historic temples and cultural sites',
        'Local markets and street food',
        'Traditional neighborhoods to explore',
        'Museums and cultural centers'
      ],
      european: [
        'Historic city center and architecture',
        'Local museums and galleries',
        'Traditional restaurants and cafes',
        'Cultural events and festivals'
      ],
      african: [
        'Cultural districts and local markets',
        'Traditional music and dance venues',
        'Local art and craft centers',
        'Historic sites and monuments'
      ],
      island: [
        'Beautiful beaches and waterfront',
        'Local island culture and traditions',
        'Water activities and boat tours',
        'Tropical gardens and nature areas'
      ],
      southAmerican: [
        'Colonial architecture and plazas',
        'Local markets and artisan shops',
        'Cultural museums and centers',
        'Traditional restaurants and nightlife'
      ],
      international: [
        'Local attractions and landmarks',
        'Cultural sites and museums',
        'Traditional dining and shopping',
        'Unique local experiences'
      ]
    }
    
    return (highlights[region] || highlights.international).slice(0, 4)
  }
  
  const generateAccessInfo = (destination: string, region: string): string => {
    const accessInfo = {
      asian: 'International flights to major airports, with domestic connections available',
      european: 'Well-connected by international flights, trains, and road networks',
      african: 'International flights to main airports, with regional connections',
      island: 'International flights to main airport, with inter-island connections',
      southAmerican: 'International flights to major cities, with domestic travel options',
      international: 'Accessible by international flights and regional transport'
    }
    return accessInfo[region] || accessInfo.international
  }

  // Get destination quick facts for chat responses
  const getDestinationQuickInfo = (destination: string): string => {
    const destinationData: { [key: string]: any } = {
      'Paris': {
        country: 'France',
        currency: 'EUR',
        bestTime: 'April-June, September-October',
        highlights: ['Eiffel Tower', 'Louvre Museum', 'Notre-Dame', 'Champs-Élysées'],
        avgTemp: '15°C',
        timeZone: 'CET',
        language: 'French'
      },
      'London': {
        country: 'United Kingdom',
        currency: 'GBP',
        bestTime: 'May-September',
        highlights: ['Big Ben', 'Tower of London', 'British Museum', 'Buckingham Palace'],
        avgTemp: '12°C',
        timeZone: 'GMT',
        language: 'English'
      },
      'Rome': {
        country: 'Italy',
        currency: 'EUR',
        bestTime: 'April-June, September-October',
        highlights: ['Colosseum', 'Vatican City', 'Trevi Fountain', 'Roman Forum'],
        avgTemp: '17°C',
        timeZone: 'CET',
        language: 'Italian'
      },
      'Tokyo': {
        country: 'Japan',
        currency: 'JPY',
        bestTime: 'March-May, September-November',
        highlights: ['Shibuya Crossing', 'Tokyo Tower', 'Senso-ji Temple', 'Imperial Palace'],
        avgTemp: '16°C',
        timeZone: 'JST',
        language: 'Japanese'
      },
      'New York': {
        country: 'United States',
        currency: 'USD',
        bestTime: 'April-June, September-November',
        highlights: ['Statue of Liberty', 'Central Park', 'Times Square', 'Brooklyn Bridge'],
        avgTemp: '13°C',
        timeZone: 'EST',
        language: 'English'
      },
      'Los Angeles': {
        country: 'United States',
        currency: 'USD',
        bestTime: 'March-May, September-November',
        highlights: ['Hollywood Sign', 'Santa Monica Pier', 'Beverly Hills', 'Getty Center'],
        avgTemp: '18°C',
        timeZone: 'PST',
        language: 'English'
      },
      'Chicago': {
        country: 'United States',
        currency: 'USD',
        bestTime: 'April-October',
        highlights: ['Millennium Park', 'Navy Pier', 'Art Institute', 'Architecture Tours'],
        avgTemp: '10°C',
        timeZone: 'CST',
        language: 'English'
      },
      'Miami': {
        country: 'United States',
        currency: 'USD',
        bestTime: 'December-April',
        highlights: ['South Beach', 'Art Deco District', 'Little Havana', 'Everglades'],
        avgTemp: '25°C',
        timeZone: 'EST',
        language: 'English'
      },
      'Las Vegas': {
        country: 'United States',
        currency: 'USD',
        bestTime: 'March-May, September-November',
        highlights: ['The Strip', 'Fremont Street', 'Grand Canyon Day Trips', 'Shows'],
        avgTemp: '20°C',
        timeZone: 'PST',
        language: 'English'
      },
      'Phuket': {
        country: 'Thailand',
        currency: 'THB',
        bestTime: 'November-April',
        highlights: ['Patong Beach', 'Phi Phi Islands', 'Big Buddha', 'Old Phuket Town'],
        avgTemp: '28°C',
        timeZone: 'ICT',
        language: 'Thai'
      },
      'Bangkok': {
        country: 'Thailand',
        currency: 'THB',
        bestTime: 'November-February',
        highlights: ['Grand Palace', 'Wat Pho Temple', 'Floating Markets', 'Khao San Road'],
        avgTemp: '29°C',
        timeZone: 'ICT',
        language: 'Thai'
      },
      'Chiang Mai': {
        country: 'Thailand',
        currency: 'THB',
        bestTime: 'November-February',
        highlights: ['Doi Suthep Temple', 'Night Bazaar', 'Elephant Sanctuary', 'Old City'],
        avgTemp: '26°C',
        timeZone: 'ICT',
        language: 'Thai'
      },
      'Thailand': {
        country: 'Thailand',
        currency: 'THB',
        bestTime: 'November-February',
        highlights: ['Grand Palace Bangkok', 'Phi Phi Islands', 'Chiang Mai Temples', 'Floating Markets'],
        avgTemp: '28°C',
        timeZone: 'ICT',
        language: 'Thai'
      },
      'Barbados': {
        country: 'Barbados',
        currency: 'BBD',
        bestTime: 'December-April',
        highlights: ['Harrison\'s Cave', 'Bridgetown', 'Rum Distilleries', 'Pink Sand Beaches'],
        avgTemp: '28°C',
        timeZone: 'AST',
        language: 'English'
      },
      'Jamaica': {
        country: 'Jamaica',
        currency: 'JMD',
        bestTime: 'December-April',
        highlights: ['Blue Mountains', 'Bob Marley Museum', 'Dunn\'s River Falls', 'Negril Beach'],
        avgTemp: '27°C',
        timeZone: 'EST',
        language: 'English'
      },
      'Greece': {
        country: 'Greece',
        currency: 'EUR',
        bestTime: 'April-June, September-October',
        highlights: ['Acropolis', 'Santorini Sunsets', 'Mykonos Beaches', 'Delphi'],
        avgTemp: '19°C',
        timeZone: 'EET',
        language: 'Greek'
      }
    }

    const info = destinationData[destination]
    if (!info) {
      // Research unknown destination and provide comprehensive info
      return generateDestinationResearch(destination)
    }

    return `Excellent! **${destination}, ${info.country}** 🌍

**Quick Facts:**
• Currency: ${info.currency}
• Best time to visit: ${info.bestTime}
• Average temperature: ${info.avgTemp}
• Time zone: ${info.timeZone}
• Language: ${info.language}

**Must-see highlights:**
${info.highlights.map((h: string) => `• ${h}`).join('\n')}

I'll help you create the perfect itinerary for ${destination}!`
  }

  // Extract travel information from user messages
  const extractTravelInfo = (message: string, currentPlan: TravelPlan | null): TravelPlan => {
    const input = message.toLowerCase()
    const plan = currentPlan || { destination: detectedDestination || '' }

    // Extract origin city
    const originKeywords = ['from', 'departing from', 'flying from', 'leaving from', 'start from']
    let originDetected = false
    
    // Check for origin keywords in message
    originKeywords.forEach(keyword => {
      const index = input.indexOf(keyword)
      if (index !== -1) {
        const afterKeyword = input.substring(index + keyword.length).trim()
        const originMatch = afterKeyword.split(' ').slice(0, 2).join(' ')
        if (originMatch.length > 2) {
          plan.origin = originMatch
          originDetected = true
        }
      }
    })
    
    // If no keyword found, check if this is a response to a departure city question
    // and if it's a known city name
    if (!originDetected && !plan.origin) {
      const potentialCities = ['london', 'paris', 'new york', 'madrid', 'barcelona', 'rome', 'berlin', 
                              'amsterdam', 'munich', 'vienna', 'zurich', 'brussels', 'dublin', 'edinburgh',
                              'manchester', 'birmingham', 'glasgow', 'newcastle', 'bristol', 'leeds',
                              'liverpool', 'cambridge', 'oxford', 'bath', 'york', 'brighton',
                              'los angeles', 'chicago', 'miami', 'las vegas', 'san francisco', 'boston',
                              'washington dc', 'seattle', 'orlando', 'philadelphia', 'atlanta', 'denver']
      
      const userInput = input.trim()
      for (const city of potentialCities) {
        if (userInput === city || userInput === city.replace(' ', '')) {
          plan.origin = city.charAt(0).toUpperCase() + city.slice(1)
          originDetected = true
          break
        }
      }
    }

    // Extract dates - improved parsing to handle various formats
    const dateInput = input.toLowerCase()
    
    // Handle date ranges like "20-30 of June", "June 20-30", etc.
    const dateRangePatterns = [
      /(\d{1,2})-(\d{1,2})\s+of\s+(january|february|march|april|may|june|july|august|september|october|november|december)/i,
      /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})-(\d{1,2})/i,
      /(\d{1,2})(?:st|nd|rd|th)?\s*-\s*(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)/i
    ]
    
    // Try to match date ranges first
    for (const pattern of dateRangePatterns) {
      const match = dateInput.match(pattern)
      if (match) {
        try {
          let startDay, endDay, month
          if (match[0].includes('of')) {
            // Format: "20-30 of June"
            startDay = parseInt(match[1])
            endDay = parseInt(match[2]) 
            month = match[3]
          } else if (match[3]) {
            // Format: "June 20-30" or "20th-30th June"
            if (match[1].match(/\d+/)) {
              startDay = parseInt(match[1])
              endDay = parseInt(match[2])
              month = match[3]
            } else {
              month = match[1]
              startDay = parseInt(match[2])
              endDay = parseInt(match[3])
            }
          }
          
          // Create dates with current year if not specified
          const currentYear = new Date().getFullYear()
          const checkInDate = new Date(`${month} ${startDay}, ${currentYear}`)
          const checkOutDate = new Date(`${month} ${endDay}, ${currentYear}`)
          
          if (!isNaN(checkInDate.getTime()) && !isNaN(checkOutDate.getTime())) {
            plan.dates = {
              checkIn: checkInDate.toISOString().split('T')[0],
              checkOut: checkOutDate.toISOString().split('T')[0]
            }
            plan.duration = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
            break
          }
        } catch (error) {
          console.log('Date parsing error:', error)
        }
      }
    }
    
    // If no date range found, try single date patterns
    if (!plan.dates) {
      const singleDatePatterns = [
        /(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?/gi,
        /\d{1,2}\/\d{1,2}\/\d{4}/g,
        /\d{4}-\d{1,2}-\d{1,2}/g
      ]
      
      for (const pattern of singleDatePatterns) {
        const matches = message.match(pattern)
        if (matches && matches.length >= 1) {
          try {
            const testDate = new Date(matches[0])
            if (!isNaN(testDate.getTime())) {
              plan.dates = {
                checkIn: testDate.toISOString().split('T')[0],
                checkOut: testDate.toISOString().split('T')[0]
              }
              break
            }
          } catch (error) {
            console.log('Single date parsing error:', error)
          }
        }
      }
    }

    // Extract number of travelers
    const travelerPatterns = [
      /(\d+)\s+(?:people|person|traveler|guest)/i,
      /(?:for\s+)?(\d+)(?:\s+of\s+us)?/i,
      /(couple|two of us|2)/i,
      /(solo|myself|alone|1)/i,
      /(family)/i
    ]
    
    travelerPatterns.forEach(pattern => {
      const match = input.match(pattern)
      if (match) {
        if (match[1]) {
          const num = parseInt(match[1])
          if (!isNaN(num)) plan.travelers = num
        } else if (match[0].includes('couple') || match[0].includes('two')) {
          plan.travelers = 2
        } else if (match[0].includes('solo') || match[0].includes('alone')) {
          plan.travelers = 1
        } else if (match[0].includes('family')) {
          plan.travelers = 4
        }
      }
    })

    // Extract budget
    const budgetPatterns = [
      /[\$£€](\d{1,4})/g,
      /(\d{1,4})\s*(?:pounds?|dollars?|euros?)/gi,
      /budget.*?(\d{1,4})/gi
    ]
    
    budgetPatterns.forEach(pattern => {
      const match = input.match(pattern)
      if (match) {
        const amount = parseInt(match[1] || match[0].replace(/[^\d]/g, ''))
        if (!isNaN(amount) && amount > 50) {
          plan.budget = amount
        }
      }
    })

    // Extract duration
    const durationPatterns = [
      /(\d+)\s*(?:days?|nights?)/i,
      /(\d+)\s*weeks?/i,
      /(weekend|week)/i
    ]
    
    durationPatterns.forEach(pattern => {
      const match = input.match(pattern)
      if (match) {
        if (match[1]) {
          const num = parseInt(match[1])
          if (!isNaN(num)) {
            plan.duration = input.includes('week') && !input.includes('weekend') ? num * 7 : num
          }
        } else if (match[0].includes('weekend')) {
          plan.duration = 2
        } else if (match[0].includes('week')) {
          plan.duration = 7
        }
      }
    })

    // Extract preferences
    if (input.includes('cultural') || input.includes('museum') || input.includes('history')) {
      plan.preferences = (plan.preferences || '') + ' cultural sites,'
    }
    if (input.includes('food') || input.includes('restaurant') || input.includes('dining')) {
      plan.preferences = (plan.preferences || '') + ' food tours,'
    }
    if (input.includes('adventure') || input.includes('active') || input.includes('hiking')) {
      plan.preferences = (plan.preferences || '') + ' adventure activities,'
    }
    if (input.includes('relaxing') || input.includes('spa') || input.includes('beach')) {
      plan.preferences = (plan.preferences || '') + ' relaxation,'
    }

    return plan
  }

  // Mock flight search function
  const searchFlights = async (params: FlightSearchParams): Promise<FlightResult[]> => {
    await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate API delay
    
    const mockFlights: FlightResult[] = [
      {
        id: 'flight_1',
        airline: 'British Airways',
        flightNumber: 'BA 2551',
        departure: { airport: params.origin, time: '09:25' },
        arrival: { airport: params.destination, time: '13:45' },
        duration: '2h 50m',
        layovers: [],
        price: { amount: Math.min(285, params.budget ? params.budget / 3 : 285), currency: 'GBP' },
        amenities: ['WiFi', 'Meals', 'Entertainment'],
        score: 95
      },
      {
        id: 'flight_2',
        airline: 'Ryanair',
        flightNumber: 'FR 4632',
        departure: { airport: params.origin, time: '06:15' },
        arrival: { airport: params.destination, time: '10:30' },
        duration: '2h 45m',
        layovers: [],
        price: { amount: Math.min(89, params.budget ? params.budget / 5 : 89), currency: 'GBP' },
        amenities: ['Paid WiFi'],
        score: 85
      },
      {
        id: 'flight_3',
        airline: 'Lufthansa',
        flightNumber: 'LH 901',
        departure: { airport: params.origin, time: '14:20' },
        arrival: { airport: params.destination, time: '19:15' },
        duration: '3h 25m',
        layovers: [{ airport: 'FRA', duration: '1h 30m' }],
        price: { amount: Math.min(195, params.budget ? params.budget / 4 : 195), currency: 'GBP' },
        amenities: ['WiFi', 'Meals', 'Entertainment'],
        score: 90
      }
    ]

    return mockFlights.filter(flight => !params.budget || flight.price.amount * params.passengers <= params.budget)
  }

  // Mock hotel search function
  const searchHotels = async (params: HotelSearchParams): Promise<HotelResult[]> => {
    await new Promise(resolve => setTimeout(resolve, 1500)) // Simulate API delay

    const destinationHotels: Record<string, HotelResult[]> = {
      'paris': [
        {
          id: 'hotel_paris_1',
          name: 'Hotel Malte Opera',
          starRating: 4,
          address: '63 Rue de Richelieu, 75002 Paris',
          amenities: ['WiFi', 'Bar', 'Concierge', 'Room Service'],
          rooms: [{
            type: 'Superior Room',
            description: 'Parisian elegance with modern comfort',
            price: { amount: Math.min(195, params.budget ? params.budget / 5 : 195), currency: 'GBP', perNight: true },
            available: 3
          }],
          location: {
            type: 'city_center',
            nearbyAttractions: ['Louvre', 'Opera', 'Palais Royal']
          },
          reviews: { overall: 8.7, count: 1256 },
          score: 92
        },
        {
          id: 'hotel_paris_2',
          name: 'Hotel des Grands Boulevards',
          starRating: 4,
          address: '17 Boulevard Poissonnière, 75002 Paris',
          amenities: ['WiFi', 'Restaurant', 'Bar', 'Fitness Center'],
          rooms: [{
            type: 'Classic Room',
            description: 'Modern French design',
            price: { amount: Math.min(165, params.budget ? params.budget / 6 : 165), currency: 'GBP', perNight: true },
            available: 5
          }],
          location: {
            type: 'city_center',
            nearbyAttractions: ['Grands Boulevards', 'Opera', 'Marais']
          },
          reviews: { overall: 8.5, count: 987 },
          score: 88
        }
      ],
      'rome': [
        {
          id: 'hotel_rome_1',
          name: 'Hotel Forum Roma',
          starRating: 4,
          address: 'Via Tor de Conti, 25, 00184 Roma',
          amenities: ['WiFi', 'Restaurant', 'Bar', 'Rooftop Terrace', 'Concierge'],
          rooms: [{
            type: 'Classic Room',
            description: 'Elegant room with Roman decor',
            price: { amount: Math.min(165, params.budget ? params.budget / 5 : 165), currency: 'GBP', perNight: true },
            available: 4
          }],
          location: {
            type: 'city_center',
            nearbyAttractions: ['Colosseum', 'Roman Forum', 'Trevi Fountain']
          },
          reviews: { overall: 8.6, count: 1842 },
          score: 95
        }
      ],
      'london': [
        {
          id: 'hotel_london_1',
          name: 'The Z Hotel Piccadilly',
          starRating: 4,
          address: '2 Leicester Street, London WC2H 7BZ',
          amenities: ['WiFi', 'Bar', 'Restaurant', '24h Reception'],
          rooms: [{
            type: 'Smart Room',
            description: 'Compact modern room in prime location',
            price: { amount: Math.min(145, params.budget ? params.budget / 5 : 145), currency: 'GBP', perNight: true },
            available: 6
          }],
          location: {
            type: 'city_center',
            nearbyAttractions: ['Leicester Square', 'Covent Garden', 'Piccadilly Circus']
          },
          reviews: { overall: 8.4, count: 2156 },
          score: 89
        }
      ],
      'barbados': [
        {
          id: 'hotel_barbados_1',
          name: 'The Crane Resort',
          starRating: 5,
          address: 'St. Philip, Barbados',
          amenities: ['WiFi', 'Pool', 'Spa', 'Beach Access', 'Restaurant', 'Bar'],
          rooms: [{
            type: 'Ocean View Suite',
            description: 'Luxury suite with stunning ocean views',
            price: { amount: Math.min(320, params.budget ? params.budget / 3 : 320), currency: 'USD', perNight: true },
            available: 2
          }],
          location: {
            type: 'beachfront',
            nearbyAttractions: ['Crane Beach', 'Harrismith Beach', 'Bottom Bay']
          },
          reviews: { overall: 9.1, count: 1543 },
          score: 95
        },
        {
          id: 'hotel_barbados_2',
          name: 'Sandals Royal Barbados',
          starRating: 5,
          address: 'Aquatic Gap, St. Michael, Barbados',
          amenities: ['All-Inclusive', 'WiFi', 'Multiple Pools', 'Spa', 'Beach', 'Water Sports'],
          rooms: [{
            type: 'Luxury Room',
            description: 'All-inclusive beachfront accommodation',
            price: { amount: Math.min(450, params.budget ? params.budget / 2.5 : 450), currency: 'USD', perNight: true },
            available: 3
          }],
          location: {
            type: 'beachfront',
            nearbyAttractions: ['Dover Beach', 'St. Lawrence Gap', 'Bridgetown']
          },
          reviews: { overall: 9.3, count: 2187 },
          score: 98
        },
        {
          id: 'hotel_barbados_3',
          name: 'Ocean Two Resort & Residences',
          starRating: 4,
          address: 'Dover Beach, St. Lawrence Gap, Barbados',
          amenities: ['WiFi', 'Pool', 'Restaurant', 'Beach Access', 'Fitness Center'],
          rooms: [{
            type: 'Studio Suite',
            description: 'Modern suite steps from Dover Beach',
            price: { amount: Math.min(185, params.budget ? params.budget / 5 : 185), currency: 'USD', perNight: true },
            available: 4
          }],
          location: {
            type: 'beachfront',
            nearbyAttractions: ['Dover Beach', 'St. Lawrence Gap', 'Oistins Fish Market']
          },
          reviews: { overall: 8.7, count: 1289 },
          score: 88
        }
      ],
      'delhi': [
        {
          id: 'hotel_delhi_1',
          name: 'The Imperial New Delhi',
          starRating: 5,
          address: 'Janpath, Connaught Place, New Delhi',
          amenities: ['WiFi', 'Pool', 'Spa', 'Multiple Restaurants', 'Business Center', 'Fitness Center'],
          rooms: [{
            type: 'Deluxe Room',
            description: 'Elegant room with modern amenities and city views',
            price: { amount: Math.min(180, params.budget ? params.budget / 4 : 180), currency: 'USD', perNight: true },
            available: 4
          }],
          location: {
            type: 'city_center',
            nearbyAttractions: ['India Gate', 'Red Fort', 'Connaught Place']
          },
          reviews: { overall: 9.0, count: 1654 },
          score: 94
        },
        {
          id: 'hotel_delhi_2',
          name: 'Hotel Metropolis',
          starRating: 4,
          address: 'Karol Bagh, New Delhi',
          amenities: ['WiFi', 'Restaurant', 'Bar', 'Room Service', 'Travel Desk'],
          rooms: [{
            type: 'Superior Room',
            description: 'Comfortable room with traditional Indian hospitality',
            price: { amount: Math.min(85, params.budget ? params.budget / 8 : 85), currency: 'USD', perNight: true },
            available: 6
          }],
          location: {
            type: 'city_center',
            nearbyAttractions: ['Karol Bagh Market', 'Rajouri Garden', 'Central Delhi']
          },
          reviews: { overall: 8.3, count: 987 },
          score: 86
        },
        {
          id: 'hotel_delhi_3',
          name: 'FabHotel Prime Karol Bagh',
          starRating: 3,
          address: 'Pusa Road, Karol Bagh, Delhi',
          amenities: ['WiFi', 'AC', 'TV', 'Room Service', 'Travel Assistance'],
          rooms: [{
            type: 'Standard Room',
            description: 'Modern budget room with all essential amenities',
            price: { amount: Math.min(45, params.budget ? params.budget / 12 : 45), currency: 'USD', perNight: true },
            available: 8
          }],
          location: {
            type: 'central',
            nearbyAttractions: ['Karol Bagh Metro', 'Shopping Centers', 'Local Markets']
          },
          reviews: { overall: 7.8, count: 543 },
          score: 78
        }
      ]
    }

    // Get hotels for destination or return generic ones
    const destination = params.destination.toLowerCase()
    let hotels = Object.entries(destinationHotels).find(([key]) => 
      destination.includes(key)
    )?.[1] || []

    // If no specific hotels found, generate authentic ones based on destination
    if (hotels.length === 0) {
      hotels = generateAuthenticHotels(params.destination, params.budget)
    }

    return hotels.filter(hotel => {
      if (params.budget) {
        const lowestPrice = Math.min(...hotel.rooms.map(room => room.price.amount))
        const nights = 3 // Assume 3 nights for budget calculation
        return lowestPrice * nights <= params.budget
      }
      return true
    })
  }

  // Generate authentic hotels for any destination
  const generateAuthenticHotels = (destination: string, budget?: number): HotelResult[] => {
    const destinationInfo = getDestinationInfo(destination)
    const basePrice = destinationInfo.costLevel
    const hotelTypes = destinationInfo.hotelTypes
    const localAmenities = destinationInfo.amenities
    const attractions = destinationInfo.attractions
    
    return [
      // Luxury option
      {
        id: `hotel_${destination.toLowerCase()}_luxury`,
        name: generateHotelName(destination, 'luxury'),
        starRating: 5,
        address: generateAddress(destination, 'luxury'),
        amenities: [...localAmenities.luxury, 'WiFi', 'Concierge', 'Room Service'],
        rooms: [{
          type: 'Deluxe Suite',
          description: `Luxurious accommodation with stunning ${destinationInfo.viewType} views`,
          price: { 
            amount: Math.min(basePrice * 3, budget ? budget / 3 : basePrice * 3), 
            currency: 'USD', 
            perNight: true 
          },
          available: Math.floor(Math.random() * 3) + 2
        }],
        location: {
          type: destinationInfo.areaType,
          nearbyAttractions: attractions.slice(0, 3)
        },
        reviews: { overall: 9.0 + Math.random() * 0.8, count: 800 + Math.floor(Math.random() * 2000) },
        score: 90 + Math.floor(Math.random() * 8)
      },
      // Mid-range option  
      {
        id: `hotel_${destination.toLowerCase()}_mid`,
        name: generateHotelName(destination, 'mid-range'),
        starRating: 3,
        address: generateAddress(destination, 'mid-range'),
        amenities: [...localAmenities.standard, 'WiFi', 'Restaurant'],
        rooms: [{
          type: 'Standard Room',
          description: `Comfortable room with modern amenities and ${destinationInfo.style} decor`,
          price: { 
            amount: Math.min(basePrice, budget ? budget / 6 : basePrice), 
            currency: 'USD', 
            perNight: true 
          },
          available: Math.floor(Math.random() * 4) + 4
        }],
        location: {
          type: 'city_center',
          nearbyAttractions: attractions.slice(1, 4)
        },
        reviews: { overall: 7.5 + Math.random() * 1.3, count: 400 + Math.floor(Math.random() * 1200) },
        score: 75 + Math.floor(Math.random() * 15)
      },
      // Budget option
      {
        id: `hotel_${destination.toLowerCase()}_budget`,
        name: generateHotelName(destination, 'budget'),
        starRating: 2,
        address: generateAddress(destination, 'budget'),
        amenities: localAmenities.budget.length > 0 ? [...localAmenities.budget, 'WiFi'] : ['WiFi', 'Reception 24h'],
        rooms: [{
          type: 'Economy Room',
          description: `Clean and comfortable accommodation in the heart of ${destination}`,
          price: { 
            amount: Math.min(basePrice * 0.4, budget ? budget / 12 : basePrice * 0.4), 
            currency: 'USD', 
            perNight: true 
          },
          available: Math.floor(Math.random() * 6) + 6
        }],
        location: {
          type: 'central',
          nearbyAttractions: attractions.slice(2, 5)
        },
        reviews: { overall: 7.0 + Math.random() * 1.0, count: 200 + Math.floor(Math.random() * 800) },
        score: 65 + Math.floor(Math.random() * 20)
      }
    ]
  }

  // Get destination characteristics for authentic content generation
  const getDestinationInfo = (destination: string) => {
    const dest = destination.toLowerCase()
    
    // Determine region and characteristics
    const regions = {
      // Asian cities
      asian: ['tokyo', 'bangkok', 'singapore', 'kuala lumpur', 'hong kong', 'seoul', 'delhi', 'mumbai', 'jakarta', 'manila'],
      // European cities  
      european: ['paris', 'london', 'rome', 'berlin', 'madrid', 'amsterdam', 'vienna', 'prague', 'zurich', 'stockholm'],
      // Middle Eastern cities
      middleEast: ['dubai', 'doha', 'riyadh', 'kuwait city', 'abu dhabi', 'muscat', 'manama', 'amman'],
      // Island/Beach destinations
      tropical: ['maldives', 'barbados', 'bali', 'phuket', 'jamaica', 'hawaii', 'seychelles', 'fiji', 'mauritius'],
      // African cities
      african: ['cape town', 'johannesburg', 'nairobi', 'cairo', 'marrakech', 'casablanca', 'lagos', 'accra'],
      // American cities
      american: ['new york', 'los angeles', 'chicago', 'miami', 'toronto', 'vancouver', 'mexico city', 'rio de janeiro']
    }
    
    let region = 'international'
    for (const [regionName, cities] of Object.entries(regions)) {
      if (cities.some(city => dest.includes(city.split(' ')[0]))) {
        region = regionName
        break
      }
    }
    
    // Cost levels by region (base price in USD)
    const costLevels = {
      european: 180,
      middleEast: 160,
      american: 150,
      tropical: 200,
      asian: 80,
      african: 90,
      international: 120
    }
    
    // Regional amenities and characteristics
    const regionalData = {
      asian: {
        amenities: {
          luxury: ['Spa', 'Multiple Restaurants', 'Business Center', 'Pool'],
          standard: ['Restaurant', 'Fitness Center', 'Business Corner'],
          budget: ['Tea/Coffee', 'Local Tours Desk']
        },
        attractions: ['Historic Temples', 'Local Markets', 'Cultural District', 'Shopping Centers', 'Food Courts'],
        viewType: 'city skyline',
        areaType: 'downtown',
        style: 'modern Asian'
      },
      european: {
        amenities: {
          luxury: ['Spa', 'Fine Dining', 'Bar', 'Valet Parking'],
          standard: ['Restaurant', 'Bar', 'Fitness Room'],
          budget: ['Continental Breakfast', 'Luggage Storage']
        },
        attractions: ['Historic Center', 'Museums', 'Cathedral Square', 'Old Town', 'Art Galleries'],
        viewType: 'historic city',
        areaType: 'historic_center', 
        style: 'European classic'
      },
      tropical: {
        amenities: {
          luxury: ['Beach Access', 'Water Sports', 'Spa', 'Multiple Pools', 'Beach Bar'],
          standard: ['Beach Access', 'Pool', 'Beach Equipment'],
          budget: ['Beach Access', 'Hammocks']
        },
        attractions: ['Pristine Beaches', 'Coral Reefs', 'Water Sports Center', 'Sunset Point', 'Local Villages'],
        viewType: 'ocean',
        areaType: 'beachfront',
        style: 'tropical resort'
      },
      middleEast: {
        amenities: {
          luxury: ['Desert Safari', 'Spa', 'Multiple Restaurants', 'Pool', 'Shopping Access'],
          standard: ['Pool', 'Restaurant', 'Shopping Mall Access'],
          budget: ['AC', 'Prayer Room', 'Local Transport']
        },
        attractions: ['Shopping Malls', 'Historic Souks', 'Modern Architecture', 'Cultural Sites', 'Desert Tours'],
        viewType: 'skyline',
        areaType: 'city_center',
        style: 'modern luxury'
      },
      african: {
        amenities: {
          luxury: ['Safari Tours', 'Spa', 'Pool', 'Cultural Shows', 'Fine Dining'],
          standard: ['Pool', 'Restaurant', 'Tour Desk'],
          budget: ['Local Tours', 'Cultural Experience']
        },
        attractions: ['Wildlife Parks', 'Cultural Villages', 'Historic Sites', 'Local Markets', 'Craft Centers'],
        viewType: 'landscape',
        areaType: 'central',
        style: 'African contemporary'
      },
      american: {
        amenities: {
          luxury: ['Rooftop Bar', 'Spa', 'Fine Dining', 'Fitness Center', 'Business Center'],
          standard: ['Gym', 'Restaurant', 'Business Corner'],
          budget: ['Coffee Bar', 'Laundry']
        },
        attractions: ['Downtown District', 'Museums', 'Entertainment Quarter', 'Shopping Centers', 'Sports Venues'],
        viewType: 'city',
        areaType: 'downtown',
        style: 'contemporary'
      }
    }
    
    const data = regionalData[region] || regionalData.international || regionalData.european
    
    return {
      costLevel: costLevels[region] || costLevels.international,
      ...data,
      region
    }
  }

  // Generate authentic hotel names based on destination and tier
  const generateHotelName = (destination: string, tier: string) => {
    const luxuryPrefixes = ['The Grand', 'Royal', 'Imperial', 'Palace', 'The Ritz', 'Luxury']
    const midRangePrefixes = ['Hotel', 'The', 'Central', 'Plaza', 'Garden']
    const budgetPrefixes = ['Budget Inn', 'City Hotel', 'Traveler Lodge', 'Express Hotel', 'Metro Inn']
    
    const destinationWords = destination.split(' ')
    const mainCity = destinationWords[0]
    
    switch (tier) {
      case 'luxury':
        const luxPrefix = luxuryPrefixes[Math.floor(Math.random() * luxuryPrefixes.length)]
        return `${luxPrefix} ${destination}`
      case 'mid-range':
        const midPrefix = midRangePrefixes[Math.floor(Math.random() * midRangePrefixes.length)]
        return `${midPrefix} ${mainCity}`
      case 'budget':
        const budgetPrefix = budgetPrefixes[Math.floor(Math.random() * budgetPrefixes.length)]
        return `${budgetPrefix} ${mainCity}`
      default:
        return `Hotel ${destination}`
    }
  }

  // Generate authentic addresses based on destination and tier
  const generateAddress = (destination: string, tier: string) => {
    const streetNumbers = [Math.floor(Math.random() * 999) + 1]
    const streetTypes = ['Street', 'Avenue', 'Boulevard', 'Road', 'Plaza', 'Square']
    const streetNames = ['Central', 'Main', 'Royal', 'Garden', 'Park', 'Historic', 'Liberty', 'Victory']
    
    const streetNumber = streetNumbers[0]
    const streetName = streetNames[Math.floor(Math.random() * streetNames.length)]
    const streetType = streetTypes[Math.floor(Math.random() * streetTypes.length)]
    
    const areas = {
      'luxury': ['Downtown', 'City Center', 'Historic Quarter', 'Marina District'],
      'mid-range': ['Central District', 'Old Town', 'Business District', 'Tourist Area'],
      'budget': ['City Center', 'Transport Hub', 'Local District', 'Market Area']
    }
    
    const area = areas[tier][Math.floor(Math.random() * areas[tier].length)]
    
    return `${streetNumber} ${streetName} ${streetType}, ${area}, ${destination}`
  }

  // Search for flights and hotels using web search or fallback
  const searchFlightsAndHotels = async (plan: TravelPlan): Promise<{ flights: FlightResult[], hotels: HotelResult[] }> => {
    console.log('🔍 Searching for flights and hotels with plan:', plan)
    console.log('🌐 Web search enabled:', webSearchEnabled)
    
    let flights: FlightResult[] = []
    let hotels: HotelResult[] = []

    // Search flights if we have origin and destination
    if (plan.origin && plan.destination) {
      const flightParams = {
        origin: plan.origin,
        destination: plan.destination,
        departureDate: plan.dates?.checkIn || new Date().toISOString().split('T')[0],
        returnDate: plan.dates?.checkOut || new Date().toISOString().split('T')[0],
        passengers: plan.travelers || 2,
        budget: plan.budget,
        preferences: {
          preferNonStop: true,
          classOfService: 'economy' as const
        }
      }
      
      console.log('✈️ Searching flights with params:', flightParams)
      try {
        if (webSearchEnabled) {
          // Use web search service for real flight data
          const webFlights = await webSearchService.current.searchFlights(flightParams)
          flights = webFlights.map(wf => ({
            id: wf.id,
            airline: wf.airline,
            flightNumber: wf.flightNumber,
            departure: wf.departure,
            arrival: wf.arrival,
            duration: wf.duration,
            layovers: wf.layovers,
            price: wf.price,
            amenities: wf.amenities,
            score: wf.score
          }))
          console.log('🌐 Found web flights:', flights.length)
        } else {
          // Fallback to intelligent mock data
          flights = await searchFlights(flightParams)
          console.log('🎯 Found mock flights:', flights.length)
        }
      } catch (error) {
        console.error('❌ Flight search error:', error)
        // Always fallback to mock data on error
        try {
          flights = await searchFlights(flightParams)
        } catch (fallbackError) {
          console.error('❌ Fallback flight search error:', fallbackError)
          flights = []
        }
      }
    }

    // Search hotels if we have destination
    if (plan.destination) {
      const hotelParams = {
        destination: plan.destination,
        checkInDate: plan.dates?.checkIn || new Date().toISOString().split('T')[0],
        checkOutDate: plan.dates?.checkOut || new Date().toISOString().split('T')[0],
        guests: plan.travelers || 2,
        budget: plan.budget,
        preferences: {
          starRating: 3,
          amenities: ['WiFi', 'Breakfast'],
          location: 'city_center'
        }
      }
      
      console.log('🏨 Searching hotels with params:', hotelParams)
      try {
        if (webSearchEnabled) {
          // Use web search service for real hotel data
          const webHotels = await webSearchService.current.searchHotels(hotelParams)
          hotels = webHotels.map(wh => ({
            id: wh.id,
            name: wh.name,
            starRating: wh.starRating,
            address: wh.address,
            amenities: wh.amenities,
            rooms: wh.rooms,
            location: wh.location,
            reviews: wh.reviews,
            score: wh.score
          }))
          console.log('🌐 Found web hotels:', hotels.length)
        } else {
          // Fallback to intelligent mock data
          hotels = await searchHotels(hotelParams)
          console.log('🎯 Found mock hotels:', hotels.length)
        }
      } catch (error) {
        console.error('❌ Hotel search error:', error)
        // Always fallback to mock data on error
        try {
          hotels = await searchHotels(hotelParams)
        } catch (fallbackError) {
          console.error('❌ Fallback hotel search error:', fallbackError)
          hotels = []
        }
      }
    }

    console.log('🎯 Final search results - Flights:', flights.length, 'Hotels:', hotels.length)
    return { flights, hotels }
  }

  // Get airport code for destination - enhanced with intelligent generation
  const getAirportCode = (destination: string): string => {
    const knownAirportCodes: Record<string, string> = {
      // Major European cities
      'paris': 'CDG', 'london': 'LHR', 'rome': 'FCO', 'barcelona': 'BCN', 'amsterdam': 'AMS', 
      'berlin': 'BER', 'athens': 'ATH', 'madrid': 'MAD', 'vienna': 'VIE', 'prague': 'PRG',
      'zurich': 'ZUR', 'stockholm': 'ARN', 'oslo': 'OSL', 'copenhagen': 'CPH', 'helsinki': 'HEL',
      
      // Major Asian cities
      'tokyo': 'NRT', 'bangkok': 'BKK', 'singapore': 'SIN', 'hong kong': 'HKG', 'seoul': 'ICN',
      'delhi': 'DEL', 'mumbai': 'BOM', 'bangalore': 'BLR', 'chennai': 'MAA', 'kolkata': 'CCU',
      'hyderabad': 'HYD', 'goa': 'GOI', 'jakarta': 'CGK', 'manila': 'MNL', 'kuala lumpur': 'KUL',
      
      // Middle Eastern cities
      'dubai': 'DXB', 'doha': 'DOH', 'riyadh': 'RUH', 'kuwait city': 'KWI', 'abu dhabi': 'AUH',
      'muscat': 'MCT', 'manama': 'BAH', 'amman': 'AMM', 'istanbul': 'IST',
      
      // American cities
      'new york': 'JFK', 'los angeles': 'LAX', 'chicago': 'ORD', 'miami': 'MIA', 'toronto': 'YYZ',
      'vancouver': 'YVR', 'mexico city': 'MEX', 'rio de janeiro': 'GIG', 'buenos aires': 'EZE',
      
      // African cities
      'cape town': 'CPT', 'johannesburg': 'JNB', 'nairobi': 'NBO', 'cairo': 'CAI', 'casablanca': 'CMN',
      'marrakech': 'RAK', 'lagos': 'LOS', 'accra': 'ACC',
      
      // Island/Beach destinations
      'barbados': 'BGI', 'phuket': 'HKT', 'bali': 'DPS', 'jamaica': 'KIN', 'hawaii': 'HNL',
      'maldives': 'MLE', 'seychelles': 'SEZ', 'fiji': 'NAN', 'mauritius': 'MRU'
    }
    
    const key = destination.toLowerCase()
    
    // First check known codes
    if (knownAirportCodes[key]) {
      return knownAirportCodes[key]
    }
    
    // Check if it's a partial match
    for (const [city, code] of Object.entries(knownAirportCodes)) {
      if (key.includes(city) || city.includes(key)) {
        return code
      }
    }
    
    // Generate intelligent airport code for unknown destinations
    return generateAirportCode(destination)
  }

  // Generate realistic airport codes for unknown destinations
  const generateAirportCode = (destination: string): string => {
    const words = destination.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(w => w.length > 0)
    
    if (words.length === 0) return 'INT'
    
    if (words.length === 1) {
      const word = words[0]
      // Take first 3 consonants if available, otherwise first 3 letters
      const consonants = word.replace(/[aeiou]/g, '')
      if (consonants.length >= 3) {
        return consonants.substring(0, 3).toUpperCase()
      }
      return word.substring(0, 3).toUpperCase().padEnd(3, 'X')
    }
    
    // Multiple words: take first letter of each word + first consonant of first word
    if (words.length >= 2) {
      const firstLetters = words.map(w => w[0]).join('')
      if (firstLetters.length >= 3) {
        return firstLetters.substring(0, 3).toUpperCase()
      }
      // Fallback: first letter of first two words + first consonant
      const firstWord = words[0]
      const firstConsonant = firstWord.replace(/[aeiou]/g, '')[0] || firstWord[1] || 'X'
      return (words[0][0] + words[1][0] + firstConsonant).toUpperCase()
    }
    
    return words[0].substring(0, 3).toUpperCase()
  }

  const handleSend = () => {
    if (!currentMessage.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      text: currentMessage.trim(),
      sender: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    const userInput = currentMessage.trim()
    setCurrentMessage('')
    setIsLoading(true)

    // Extract travel information from user message
    const updatedPlan = extractTravelInfo(userInput, travelPlan)
    setTravelPlan(updatedPlan)

    // Only detect destination if we don't already have one
    const destinationResult = !detectedDestination ? detectDestination(userInput) : null
    
    console.log('🔍 Debug info:', {
      userInput,
      detectedDestination,
      conversationStep,
      destinationResult,
      updatedPlan: {
        origin: updatedPlan.origin,
        destination: updatedPlan.destination,
        dates: updatedPlan.dates,
        travelers: updatedPlan.travelers,
        budget: updatedPlan.budget
      }
    })
    
    console.log('🔍 Condition checks:', {
      'destinationResult && !detectedDestination': destinationResult && !detectedDestination,
      'destinationResult && destinationResult.type === "city"': destinationResult && destinationResult.type === 'city',
      'detectedDestination (for main flow)': !!detectedDestination
    })
    
    // Simulate AI response with delay
    setTimeout(() => {
      let responseText = ''
      
      if (destinationResult && !detectedDestination) {
        if (destinationResult.type === 'city') {
          // User specified a specific city
          setDetectedDestination(destinationResult.name)
          updatedPlan.destination = destinationResult.name
          setTravelPlan(updatedPlan)
          responseText = getDestinationQuickInfo(destinationResult.name)
          responseText += `\n\nNow, let's plan your trip! When would you like to travel to ${destinationResult.name}? Also, which city will you be departing from?`
          setConversationStep(1)
        } else if (destinationResult.type === 'country') {
          // User specified a country - ask which city
          const cities = getCitiesForCountry(destinationResult.name)
          responseText = `Great choice! ${destinationResult.name} has so many amazing cities to explore. 🌍\n\n**Popular destinations in ${destinationResult.name}:**\n`
          cities.slice(0, 6).forEach(city => {
            responseText += `• ${city}\n`
          })
          responseText += `\nWhich city in ${destinationResult.name} would you like to visit? You can choose from the list above or tell me about any other city you're interested in.`
          // Don't set detectedDestination yet - wait for city selection
        }
      } else if (destinationResult && destinationResult.type === 'city') {
        // User selected a city (either initial or after mentioning country)
        if (!detectedDestination) {
          setDetectedDestination(destinationResult.name)
          updatedPlan.destination = destinationResult.name
          setTravelPlan(updatedPlan)
          responseText = getDestinationQuickInfo(destinationResult.name)
          responseText += `\n\nPerfect choice! Now, let's plan your trip to ${destinationResult.name}. When would you like to travel? Also, which city will you be departing from?`
          setConversationStep(1)
        }
      } else if (detectedDestination || updatedPlan.destination) {
        // Continue conversation based on step
        const currentDestination = detectedDestination || updatedPlan.destination
        if (conversationStep === 1) {
          // Check what information we got from the user's response
          if (updatedPlan.origin && !updatedPlan.dates) {
            // User provided origin city, now ask for dates
            responseText = `Great! Flying from ${updatedPlan.origin} to ${currentDestination}. ✈️\n\nWhen would you like to travel? You can mention specific dates like "June 15-22" or general timeframes like "next month" or "summer".`
          } else if (updatedPlan.dates && !updatedPlan.origin) {
            // User provided dates, now ask for origin
            responseText = `Perfect! I've noted your travel dates. Which city will you be departing from?`
          } else if (updatedPlan.origin && updatedPlan.dates) {
            // User provided both origin and dates, move to next step
            responseText = `Excellent! So you're planning to fly from ${updatedPlan.origin} to ${currentDestination}${updatedPlan.dates ? ` around ${updatedPlan.dates.checkIn}` : ''}. ✈️\n\nHow many people will be traveling?`
            setConversationStep(2)
          } else {
            // User didn't provide required info, ask again
            responseText = `I'd love to help plan your trip to ${currentDestination}! I need to know:\n\n• **When** would you like to travel? (dates or timeframe)\n• **Which city** will you be departing from?\n\nYou can tell me both at once or one at a time!`
          }
        } else if (conversationStep === 2) {
          responseText = `Great! What's your approximate budget for this trip to ${currentDestination}? (e.g., £1500, $2000)`
          setConversationStep(3)
        } else if (conversationStep === 3) {
          responseText = `Excellent! What type of experiences interest you most in ${currentDestination}? (e.g., cultural sites, food tours, adventure activities, nightlife, shopping)`
          setConversationStep(4)
        } else if (conversationStep === 4) {
          responseText = `Wonderful! I love that you're interested in ${updatedPlan.preferences || 'those experiences'}. 🎯\n\nLet me ask a few follow-up questions to make sure I find you the perfect options:\n\n• Are you flexible with your travel dates, or are they fixed?\n• Do you prefer direct flights or don't mind layovers if it saves money?\n• For accommodation, would you like to stay in the city center or are you open to nearby areas?\n\nJust let me know your thoughts on any of these!`
          setConversationStep(5)
        } else if (conversationStep === 5) {
          // Collect the follow-up preferences
          responseText = `Perfect! Thanks for those details. 📝\n\nLet me summarize what I have:\n`
          responseText += `🏙️ **Destination:** ${updatedPlan.destination}\n`
          if (updatedPlan.origin) responseText += `✈️ **From:** ${updatedPlan.origin}\n`
          if (updatedPlan.dates) responseText += `📅 **Dates:** Around ${updatedPlan.dates.checkIn}\n`
          if (updatedPlan.travelers) responseText += `👥 **Travelers:** ${updatedPlan.travelers} ${updatedPlan.travelers === 1 ? 'person' : 'people'}\n`
          if (updatedPlan.budget) responseText += `💰 **Budget:** £${updatedPlan.budget}\n`
          if (updatedPlan.preferences) responseText += `🎯 **Interests:** ${updatedPlan.preferences.replace(/,$/, '')}\n`
          
          responseText += `\nWould you like me to use my **Flight Finder Tool** and **Hotel Search Tool** to create a comprehensive travel plan with real flight options, hotel recommendations, and pricing? Just say "yes" or "create my plan" and I'll get started! 🚀`
          setConversationStep(6)
        } else if (conversationStep >= 6) {
          // Check if user wants to proceed with plan generation
          const userWantsPlan = userInput.toLowerCase().includes('yes') || userInput.toLowerCase().includes('create') || userInput.toLowerCase().includes('plan') || userInput.toLowerCase().includes('go ahead') || userInput.toLowerCase().includes('proceed')
          
          if (userWantsPlan) {
            // Generate a travel plan with the information we have
            responseText = `Excellent! 🎉 Let me fire up my advanced travel planning system:\n\n🌐 **Web Search Engine** - Scanning travel websites for real-time data...\n✈️ **Flight Comparison Tool** - Checking Skyscanner, Kayak, Expedia...\n🏨 **Hotel Booking Scanner** - Searching Booking.com, Hotels.com, Agoda...\n🚗 **Transport Finder** - Finding trains, buses, and car rentals...\n📊 **Price Analyzer** - Comparing deals across multiple platforms...\n\nSearching the web for the best current prices and availability!`
            setConversationStep(7)
            
            // Start search process
            setIsSearching(true)
            searchAndGeneratePlan(updatedPlan)
          } else if (userInput.toLowerCase().includes('no') || userInput.toLowerCase().includes('wait') || userInput.toLowerCase().includes('not yet')) {
            responseText = `No problem! Take your time. Is there anything you'd like to change or any other questions you have about your trip to ${currentDestination}? I'm here to help adjust any details.`
          } else {
            // Still missing critical information
            const missingInfo = []
            if (!updatedPlan.destination) missingInfo.push('destination')
            if (!updatedPlan.dates && !updatedPlan.duration) missingInfo.push('travel dates')
            if (!updatedPlan.travelers) missingInfo.push('number of travelers')
            if (!updatedPlan.budget) missingInfo.push('approximate budget')
            
            if (missingInfo.length > 0) {
              responseText = `I'd love to create your plan! I just need a bit more information:\n`
              missingInfo.forEach(info => responseText += `• ${info.charAt(0).toUpperCase() + info.slice(1)}\n`)
              responseText += `\nOnce I have these details, I can use my Flight Finder and Hotel Search tools to create your perfect trip!`
            } else {
              responseText = `I have all the information I need! Would you like me to use my **Flight Finder Tool** and **Hotel Search Tool** to create your travel plan? Just say "yes" and I'll start searching for the best options! ✈️🏨`
            }
          }
        }
      } else {
        // No destination detected yet
        responseText = `I'd love to help you plan your trip! Could you tell me which destination you're interested in visiting? For example: "I want to go to Paris" or "Planning a trip to Tokyo"`
      }

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        sender: 'ai',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiResponse])
      setIsLoading(false)
    }, 1500 + Math.random() * 1000)
  }

  // Separate function to handle search and plan generation
  const searchAndGeneratePlan = async (plan: TravelPlan) => {
    try {
      // Search for flights and hotels
      const { flights, hotels } = await searchFlightsAndHotels(plan)
      plan.flights = flights
      plan.hotels = hotels
      setTravelPlan(plan)

      // Generate comprehensive travel plan
      const travelPlanText = await generateTravelPlan(plan)
      
      // Add the plan summary with modal button
      const planMessage: Message = {
        id: (Date.now() + 2).toString(),
        text: travelPlanText,
        sender: 'ai',
        timestamp: new Date(),
        showPlanButton: true
      }
      
      setMessages(prev => [...prev, planMessage])
      setIsSearching(false)
    } catch (error) {
      console.error('Error generating travel plan:', error)
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        text: `I encountered an issue while searching for flights and hotels. Let me create a basic plan for your trip to ${plan.destination} with the information I have.` + await generateBasicTravelPlan(plan),
        sender: 'ai',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
      setIsSearching(false)
    }
  }

  // Generate compact travel plan summary with modal button
  const generateTravelPlan = async (plan: TravelPlan): Promise<string> => {
    const { destination, flights, hotels, travelers, budget } = plan
    
    let summary = `🎉 **Great news!** I found some excellent options for your ${destination} trip:\n\n`
    
    // Quick summary
    if (flights && flights.length > 0) {
      summary += `✈️ **${flights.length} flight options** starting from £${Math.min(...flights.map(f => f.price.amount))}/person\n`
    }
    
    if (hotels && hotels.length > 0) {
      const lowestHotelPrice = Math.min(...hotels.flatMap(h => h.rooms.map(room => room.price.amount)))
      summary += `🏨 **${hotels.length} hotel options** starting from £${lowestHotelPrice}/night\n`
    }
    
    // Cost estimate
    if (flights && hotels && flights.length > 0 && hotels.length > 0) {
      const estimatedFlightCost = flights[0].price.amount * (travelers || 2)
      const estimatedHotelCost = Math.min(...hotels[0].rooms.map(room => room.price.amount)) * (plan.duration || 3)
      const totalEstimate = estimatedFlightCost + estimatedHotelCost
      
      summary += `💰 **Estimated total**: £${totalEstimate}`
      if (budget) {
        summary += totalEstimate <= budget ? ` (within budget ✅)` : ` (£${totalEstimate - budget} over budget)`
      }
    }

    return summary
  }

  // Generate basic travel plan without API results
  const generateBasicTravelPlan = async (plan: TravelPlan): Promise<string> => {
    const { destination, travelers, budget, preferences } = plan
    
    let response = `\n\n🌟 **Your Basic Travel Plan for ${destination}** 🌟\n\n`
    response += `I'll help you plan your trip with the following recommendations:\n\n`
    
    response += `✈️ **Flight Tips**\n`
    response += `• Book flights 2-3 months in advance for best prices\n`
    response += `• Consider nearby airports for potential savings\n`
    response += `• Tuesday and Wednesday departures are often cheaper\n\n`
    
    response += `🏨 **Accommodation Suggestions**\n`
    response += `• City center hotels for easy access to attractions\n`
    response += `• Look for properties with good reviews and WiFi\n`
    response += `• Consider booking directly with hotels for perks\n\n`
    
    if (preferences) {
      response += `🎯 **Based on your interests (${preferences.replace(/,$/, '')}):**\n`
      if (preferences.includes('cultural')) {
        response += `• Visit major museums and historical sites\n`
        response += `• Book guided cultural tours in advance\n`
      }
      if (preferences.includes('food')) {
        response += `• Try local specialties and street food\n`
        response += `• Book food tours or cooking classes\n`
      }
      if (preferences.includes('adventure')) {
        response += `• Research outdoor activities and book ahead\n`
        response += `• Pack appropriate gear for activities\n`
      }
      response += `\n`
    }
    
    response += `💰 **Budget Planning**\n`
    if (budget) {
      const dailyBudget = Math.floor(budget / (plan.duration || 5))
      response += `• Your daily budget: £${dailyBudget}\n`
      response += `• Allocate 40% for accommodation, 30% for food, 20% for activities, 10% for transport\n`
    }
    response += `• Consider city tourist cards for discounts\n`
    response += `• Mix of free and paid activities to stay within budget\n\n`
    
    response += `📱 **Useful Apps & Tips**\n`
    response += `• Download offline maps before you go\n`
    response += `• Check visa requirements and book in advance if needed\n`
    response += `• Notify your bank of travel plans\n`
    response += `• Get travel insurance for peace of mind\n\n`
    
    response += `Would you like me to search again for specific flights and hotels, or do you need help with any other aspect of your trip?`
    
    return response
  }

  const handleClearChat = () => {
    setDetectedDestination(null)
    setConversationStep(0)
    setTravelPlan(null)
    setIsSearching(false)
    setMessages([{
      id: '1',
      text: `Hello! I'm your AI travel assistant. ✈️

I'll help you plan your perfect trip step by step. I'll ask you about:
• Your destination (specific city)
• Departure location  
• Number of travelers
• Budget
• Duration
• Your interests

Once I have all the details, I'll create a complete travel plan with flights, hotels, and a detailed itinerary!

**Let's start: What destination are you interested in visiting? You can mention a country (like "Italy") and I'll show you popular cities, or specify a city directly (like "Rome").**`,
      sender: 'ai',
      timestamp: new Date()
    }])
  }

  return (
    <>
      <BackToHomeButton />
      
      {/* Web Search Toggle */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        backgroundColor: 'white',
        padding: '8px 16px',
        borderRadius: '8px',
        border: '1px solid #d1d5db',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <span style={{ fontSize: '14px', fontWeight: '500' }}>
          🌐 Web Search: 
        </span>
        <button
          onClick={() => setWebSearchEnabled(!webSearchEnabled)}
          style={{
            backgroundColor: webSearchEnabled ? '#10b981' : '#6b7280',
            color: 'white',
            border: 'none',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          {webSearchEnabled ? 'ON' : 'OFF'}
        </button>
        <span style={{ fontSize: '12px', color: '#6b7280' }}>
          {webSearchEnabled ? 'Live data from travel sites' : 'Using intelligent mock data'}
        </span>
      </div>

      <div style={{ 
        height: '100vh', 
        width: '100vw', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        position: 'absolute',
        top: 0,
        left: 0,
        gap: '20px',
        backgroundColor: 'transparent'
      }}>
        {/* Chat Box */}
        <div style={{
          width: '625px',
          height: '625px',
          backgroundColor: 'white',
          border: '4px solid #2563eb',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}>
          {/* Header */}
          <div style={{
            padding: '24px',
            borderBottom: '2px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                backgroundColor: '#2563eb',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <User style={{ width: '24px', height: '24px', color: 'white' }} />
              </div>
              <div>
                <h1 style={{ 
                  fontSize: '32px', 
                  fontWeight: 'bold', 
                  color: '#111827',
                  margin: 0
                }}>
                  Travel Planner
                </h1>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  {travelPlan && travelPlan.destination ? (
                    `Planning trip to ${travelPlan.destination}${travelPlan.travelers ? ` • ${travelPlan.travelers} travelers` : ''}${travelPlan.budget ? ` • £${travelPlan.budget} budget` : ''} • ${messages.length} messages`
                  ) : (
                    `${messages.length} messages`
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => {
                  const shortcuts = [
                    'Enter: Send message',
                    'Shift+Enter: New line'
                  ]
                  alert('Keyboard Shortcuts:\n\n' + shortcuts.join('\n'))
                }}
                style={{
                  padding: '8px',
                  backgroundColor: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  color: '#374151'
                }}
                title="Show keyboard shortcuts"
              >
                ?
              </button>
              <button
                onClick={handleClearChat}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  color: '#374151'
                }}
                title="Clear conversation"
              >
                Clear Chat
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div style={{
            flex: 1,
            padding: '24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="flex flex-col" style={{ maxWidth: '80%' }}>
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    backgroundColor: message.sender === 'user' ? '#2563eb' : '#f3f4f6',
                    color: message.sender === 'user' ? 'white' : '#111827',
                    fontSize: '14px',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {message.text}
                  </div>
                  
                  {/* Show View Plan button for plan messages */}
                  {message.showPlanButton && travelPlan && (
                    <button
                      onClick={() => {
                        // Create URL with travel plan data including actual search results
                        const planParams = new URLSearchParams({
                          destination: travelPlan.destination || 'Your Destination',
                          origin: travelPlan.origin || 'Your City',
                          travelers: (travelPlan.travelers || 2).toString(),
                          budget: (travelPlan.budget || 2000).toString(),
                          checkIn: travelPlan.dates?.checkIn || '',
                          checkOut: travelPlan.dates?.checkOut || '',
                          preferences: travelPlan.preferences || 'Adventure & Culture',
                          dates: travelPlan.dates ? `${travelPlan.dates.checkIn} to ${travelPlan.dates.checkOut}` : '',
                          // Pass actual search results as JSON
                          flights: travelPlan.flights ? JSON.stringify(travelPlan.flights) : '',
                          hotels: travelPlan.hotels ? JSON.stringify(travelPlan.hotels) : ''
                        })
                        window.open(`/travel-plan?${planParams.toString()}`, '_blank')
                      }}
                      style={{
                        marginTop: '12px',
                        padding: '12px 24px',
                        backgroundColor: '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        alignSelf: 'flex-start',
                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = '#1d4ed8'
                        e.currentTarget.style.transform = 'translateY(-2px)'
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = '#2563eb'
                        e.currentTarget.style.transform = 'translateY(0)'
                      }}
                    >
                      <ExternalLink style={{ width: '16px', height: '16px' }} />
                      View Full Travel Plan
                    </button>
                  )}
                </div>
              </div>
            ))}
            
            {/* Loading indicator */}
            {(isLoading || isSearching) && (
              <div className="flex justify-start">
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  backgroundColor: '#f3f4f6',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <div style={{
                    display: 'flex',
                    gap: '4px'
                  }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      backgroundColor: '#9ca3af',
                      borderRadius: '50%',
                      animation: 'bounce 1s infinite'
                    }}></div>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      backgroundColor: '#9ca3af',
                      borderRadius: '50%',
                      animation: 'bounce 1s infinite 0.1s'
                    }}></div>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      backgroundColor: '#9ca3af',
                      borderRadius: '50%',
                      animation: 'bounce 1s infinite 0.2s'
                    }}></div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isSearching && (
                      <>
                        <Plane style={{ width: '16px', height: '16px', color: '#2563eb' }} />
                        <Hotel style={{ width: '16px', height: '16px', color: '#16a34a' }} />
                      </>
                    )}
                    <span style={{ fontSize: '14px', color: '#6b7280' }}>
                      {isSearching ? 'Searching flights & hotels...' : 'Typing...'}
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div style={{ padding: '24px', borderTop: '2px solid #e5e7eb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="text"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder="Tell me about your ideal trip..."
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none'
                }}
                disabled={isLoading || isSearching}
              />
              <button
                onClick={handleSend}
                disabled={!currentMessage.trim() || isLoading || isSearching}
                style={{
                  padding: '12px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  opacity: (!currentMessage.trim() || isLoading || isSearching) ? 0.5 : 1
                }}
              >
                <Send style={{ width: '20px', height: '20px' }} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Modal */}
      {travelPlan && (
        <PlanModal
          isOpen={showPlanModal}
          onClose={() => setShowPlanModal(false)}
          plan={travelPlan}
        />
      )}
    </>
  )
}