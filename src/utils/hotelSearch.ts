import { getHotelSourcesForCountry } from './getHotelSourcesForCountry'

export interface SearchProfile {
  destinationCity: string
  country: string
  checkIn: string
  checkOut: string
  guests: number
  nights: number
  totalBudget: number
  accommodationBudget: number
  maxNightlyRate: number
  stayType: string
  preferredAmenities: string[]
  locationPreference: string
}

export interface Hotel {
  name: string
  pricePerNight: number
  total: number
  rating: number
  reviews: number
  location: string
  amenities: string[]
  link: string
  description?: string
  stars?: number
  // Additional fields from real API
  coordinates?: { lat: number; lng: number }
  images?: string[]
  cancellationPolicy?: string
  rooms?: Array<{
    type: string
    description: string
    price: number
    available: number
  }>
}

// Simulated hotel database by country/city (replace with real API calls later)
const HOTEL_DATABASE: Record<string, Hotel[]> = {
  "Rome, Italy": [
    {
      name: "Hotel Quirinale",
      pricePerNight: 158,
      total: 1106,
      rating: 4.4,
      reviews: 1245,
      location: "Central Rome",
      amenities: ["WiFi", "Breakfast", "Air Conditioning", "Room Service"],
      link: "https://www.booking.com/hotel/quirinale",
      description: "Elegant 4-star hotel in the heart of Rome, near the Opera House and Termini Station.",
      stars: 4
    },
    {
      name: "Roma Garden View",
      pricePerNight: 130,
      total: 910,
      rating: 4.2,
      reviews: 800,
      location: "Near Termini Station",
      amenities: ["WiFi", "Air Conditioning"],
      link: "https://www.agoda.com/roma-garden",
      description: "Modern hotel with garden views, convenient location near major attractions.",
      stars: 3
    },
    {
      name: "Grand Hotel de la Minerve",
      pricePerNight: 185,
      total: 1295,
      rating: 4.6,
      reviews: 2100,
      location: "Pantheon Area",
      amenities: ["WiFi", "Breakfast", "Spa", "Fitness Center", "Room Service"],
      link: "https://www.booking.com/hotel/grand-minerve",
      description: "Luxury 5-star hotel near the Pantheon, featuring elegant rooms and exceptional service.",
      stars: 5
    }
  ],
  "Paris, France": [
    {
      name: "Hotel des Grands Boulevards",
      pricePerNight: 165,
      total: 1155,
      rating: 4.5,
      reviews: 890,
      location: "2nd Arrondissement",
      amenities: ["WiFi", "Breakfast", "Restaurant", "Bar"],
      link: "https://www.booking.com/hotel/grands-boulevards",
      description: "Boutique hotel in the heart of Paris with stylish decor and excellent dining.",
      stars: 4
    },
    {
      name: "Hotel Malte Opera",
      pricePerNight: 140,
      total: 980,
      rating: 4.3,
      reviews: 1520,
      location: "9th Arrondissement",
      amenities: ["WiFi", "Air Conditioning", "Breakfast"],
      link: "https://www.booking.com/hotel/malte-opera",
      description: "Charming hotel near Opera Garnier with classic Parisian atmosphere.",
      stars: 3
    }
  ],
  "London, United Kingdom": [
    {
      name: "The Z Hotel Piccadilly",
      pricePerNight: 145,
      total: 1015,
      rating: 4.3,
      reviews: 2340,
      location: "West End",
      amenities: ["WiFi", "Air Conditioning", "24-hour Reception"],
      link: "https://www.booking.com/hotel/z-piccadilly",
      description: "Modern hotel in the heart of London's theater district.",
      stars: 4
    },
    {
      name: "Premier Inn London County Hall",
      pricePerNight: 120,
      total: 840,
      rating: 4.1,
      reviews: 3450,
      location: "South Bank",
      amenities: ["WiFi", "Restaurant", "Bar"],
      link: "https://www.booking.com/hotel/premier-county-hall",
      description: "Contemporary hotel with views of the Thames and Big Ben.",
      stars: 3
    }
  ],
  "Tokyo, Japan": [
    {
      name: "Hotel Gracery Shinjuku",
      pricePerNight: 155,
      total: 1085,
      rating: 4.4,
      reviews: 1890,
      location: "Shinjuku",
      amenities: ["WiFi", "Restaurant", "24-hour Reception"],
      link: "https://www.agoda.com/hotel/gracery-shinjuku",
      description: "Modern hotel in vibrant Shinjuku district with Godzilla Head landmark.",
      stars: 4
    },
    {
      name: "APA Hotel Shimbashi",
      pricePerNight: 125,
      total: 875,
      rating: 4.0,
      reviews: 2100,
      location: "Shimbashi",
      amenities: ["WiFi", "Air Conditioning", "Vending Machines"],
      link: "https://www.agoda.com/apa-shimbashi",
      description: "Efficient business hotel near Tokyo Station with compact, well-designed rooms.",
      stars: 3
    }
  ],
  "Bangkok, Thailand": [
    {
      name: "Mandarin Oriental Bangkok",
      pricePerNight: 180,
      total: 1260,
      rating: 4.7,
      reviews: 1560,
      location: "Riverside",
      amenities: ["WiFi", "Breakfast", "Spa", "Pool", "River Views"],
      link: "https://www.agoda.com/mandarin-oriental-bangkok",
      description: "Legendary luxury hotel on the Chao Phraya River with world-class service.",
      stars: 5
    },
    {
      name: "Novotel Bangkok on Siam Square",
      pricePerNight: 135,
      total: 945,
      rating: 4.3,
      reviews: 2890,
      location: "Siam Square",
      amenities: ["WiFi", "Pool", "Fitness Center", "Restaurant"],
      link: "https://www.agoda.com/novotel-siam",
      description: "Modern hotel in the shopping district with excellent facilities.",
      stars: 4
    }
  ],
  "Barcelona, Spain": [
    {
      name: "Hotel Casa Fuster",
      pricePerNight: 175,
      total: 1225,
      rating: 4.5,
      reviews: 1670,
      location: "Passeig de Gracia",
      amenities: ["WiFi", "Breakfast", "Pool", "Spa", "Rooftop Terrace"],
      link: "https://www.booking.com/hotel/casa-fuster",
      description: "Modernist luxury hotel on Barcelona's most elegant boulevard.",
      stars: 5
    },
    {
      name: "H10 Casa Mimosa",
      pricePerNight: 145,
      total: 1015,
      rating: 4.4,
      reviews: 2340,
      location: "Eixample",
      amenities: ["WiFi", "Breakfast", "Rooftop Bar", "Air Conditioning"],
      link: "https://www.booking.com/hotel/h10-casa-mimosa",
      description: "Boutique hotel in the heart of Barcelona with rooftop views of Sagrada Familia.",
      stars: 4
    }
  ],
  "New York, United States": [
    {
      name: "The Jane Hotel",
      pricePerNight: 165,
      total: 1155,
      rating: 4.2,
      reviews: 3450,
      location: "Greenwich Village",
      amenities: ["WiFi", "Bar", "24-hour Reception"],
      link: "https://www.booking.com/hotel/the-jane",
      description: "Historic hotel in the Meatpacking District with unique character.",
      stars: 3
    },
    {
      name: "Pod Times Square",
      pricePerNight: 155,
      total: 1085,
      rating: 4.3,
      reviews: 4230,
      location: "Times Square",
      amenities: ["WiFi", "Rooftop Terrace", "Restaurant", "Bar"],
      link: "https://www.expedia.com/hotel/pod-times-square",
      description: "Modern budget-luxury hotel in the heart of Manhattan.",
      stars: 4
    }
  ],
  "Dubai, United Arab Emirates": [
    {
      name: "Rove Downtown",
      pricePerNight: 125,
      total: 875,
      rating: 4.4,
      reviews: 2890,
      location: "Downtown Dubai",
      amenities: ["WiFi", "Pool", "Gym", "Restaurant", "Burj Khalifa Views"],
      link: "https://www.booking.com/hotel/rove-downtown",
      description: "Contemporary hotel with views of Burj Khalifa and Dubai Fountain.",
      stars: 4
    },
    {
      name: "Atlantis The Palm",
      pricePerNight: 220,
      total: 1540,
      rating: 4.6,
      reviews: 5670,
      location: "Palm Jumeirah",
      amenities: ["WiFi", "Multiple Pools", "Water Park", "Private Beach", "Multiple Restaurants"],
      link: "https://www.booking.com/hotel/atlantis-the-palm",
      description: "Iconic resort on Palm Jumeirah with aquarium and water park.",
      stars: 5
    }
  ],
  "Sydney, Australia": [
    {
      name: "QT Sydney",
      pricePerNight: 180,
      total: 1260,
      rating: 4.5,
      reviews: 1890,
      location: "CBD",
      amenities: ["WiFi", "Spa", "Restaurant", "Bar", "Theatre"],
      link: "https://www.booking.com/hotel/qt-sydney",
      description: "Designer hotel in historic theatre district with quirky style.",
      stars: 5
    },
    {
      name: "Harbour Rocks Hotel",
      pricePerNight: 165,
      total: 1155,
      rating: 4.3,
      reviews: 2340,
      location: "The Rocks",
      amenities: ["WiFi", "Breakfast", "Heritage Building"],
      link: "https://www.booking.com/hotel/harbour-rocks",
      description: "Heritage boutique hotel near Sydney Harbour Bridge.",
      stars: 4
    }
  ],
  "Cancun, Mexico": [
    {
      name: "Hyatt Zilara Cancun",
      pricePerNight: 195,
      total: 1365,
      rating: 4.6,
      reviews: 3450,
      location: "Hotel Zone",
      amenities: ["All-Inclusive", "WiFi", "Multiple Pools", "Beach", "Spa", "6 Restaurants"],
      link: "https://www.booking.com/hotel/hyatt-zilara-cancun",
      description: "Adults-only all-inclusive resort on beautiful beach.",
      stars: 5
    },
    {
      name: "Aloft Cancun",
      pricePerNight: 135,
      total: 945,
      rating: 4.3,
      reviews: 2100,
      location: "Downtown Cancun",
      amenities: ["WiFi", "Pool", "Gym", "Bar", "Pet-Friendly"],
      link: "https://www.booking.com/hotel/aloft-cancun",
      description: "Modern hotel with vibrant atmosphere in downtown area.",
      stars: 4
    }
  ],
  "Amsterdam, Netherlands": [
    {
      name: "The Hoxton Amsterdam",
      pricePerNight: 160,
      total: 1120,
      rating: 4.4,
      reviews: 2670,
      location: "Herengracht Canal",
      amenities: ["WiFi", "Restaurant", "Bar", "Canal Views", "Bicycles"],
      link: "https://www.booking.com/hotel/hoxton-amsterdam",
      description: "Hip hotel on the canal with local neighborhood feel.",
      stars: 4
    },
    {
      name: "Lloyd Hotel",
      pricePerNight: 145,
      total: 1015,
      rating: 4.2,
      reviews: 1890,
      location: "Eastern Docklands",
      amenities: ["WiFi", "Restaurant", "Cultural Center", "Unique Rooms"],
      link: "https://www.booking.com/hotel/lloyd-amsterdam",
      description: "Eclectic cultural hotel with rooms from 1 to 5 stars.",
      stars: 3
    }
  ],
  "Singapore, Singapore": [
    {
      name: "Marina Bay Sands",
      pricePerNight: 240,
      total: 1680,
      rating: 4.5,
      reviews: 8900,
      location: "Marina Bay",
      amenities: ["WiFi", "Infinity Pool", "Casino", "Shopping Mall", "Multiple Restaurants"],
      link: "https://www.booking.com/hotel/marina-bay-sands",
      description: "Iconic hotel with rooftop infinity pool and SkyPark.",
      stars: 5
    },
    {
      name: "Hotel Indigo Singapore",
      pricePerNight: 155,
      total: 1085,
      rating: 4.3,
      reviews: 1560,
      location: "Katong",
      amenities: ["WiFi", "Pool", "Fitness Center", "Restaurant", "Heritage Area"],
      link: "https://www.agoda.com/hotel-indigo-singapore",
      description: "Boutique hotel in colorful Peranakan neighborhood.",
      stars: 4
    }
  ],
  "Cape Town, South Africa": [
    {
      name: "The Silo Hotel",
      pricePerNight: 280,
      total: 1960,
      rating: 4.8,
      reviews: 890,
      location: "V&A Waterfront",
      amenities: ["WiFi", "Spa", "Pool", "Museum", "Rooftop Bar", "Fine Dining"],
      link: "https://www.booking.com/hotel/the-silo",
      description: "Luxury hotel in converted grain silo with art museum.",
      stars: 5
    },
    {
      name: "POD Camps Bay",
      pricePerNight: 145,
      total: 1015,
      rating: 4.4,
      reviews: 1230,
      location: "Camps Bay",
      amenities: ["WiFi", "Beach Access", "Mountain Views", "Restaurant"],
      link: "https://www.booking.com/hotel/pod-camps-bay",
      description: "Boutique hotel near beach with Table Mountain views.",
      stars: 4
    }
  ],
  "Istanbul, Turkey": [
    {
      name: "Four Seasons Sultanahmet",
      pricePerNight: 195,
      total: 1365,
      rating: 4.7,
      reviews: 1450,
      location: "Sultanahmet",
      amenities: ["WiFi", "Spa", "Restaurant", "Courtyard", "Historic Building"],
      link: "https://www.booking.com/hotel/four-seasons-sultanahmet",
      description: "Luxury hotel in former prison near Hagia Sophia.",
      stars: 5
    },
    {
      name: "Vault Karakoy",
      pricePerNight: 135,
      total: 945,
      rating: 4.5,
      reviews: 2100,
      location: "Karakoy",
      amenities: ["WiFi", "Restaurant", "Bar", "Historic Bank Building"],
      link: "https://www.booking.com/hotel/vault-karakoy",
      description: "Boutique hotel in converted bank building in trendy Karakoy.",
      stars: 4
    }
  ],
  "Tenerife, Spain": [
    {
      name: "Hotel Botanico & The Oriental Spa Garden",
      pricePerNight: 185,
      total: 1295,
      rating: 4.6,
      reviews: 2340,
      location: "Puerto de la Cruz",
      amenities: ["WiFi", "Spa", "Pool", "Gardens", "Tennis Court", "Restaurants"],
      link: "https://www.booking.com/hotel/botanico-oriental-spa",
      description: "Luxury resort with oriental spa and botanical gardens overlooking the Atlantic.",
      stars: 5
    },
    {
      name: "Hotel Villa Cortés",
      pricePerNight: 165,
      total: 1155,
      rating: 4.4,
      reviews: 1890,
      location: "Playa de las Américas",
      amenities: ["WiFi", "Pool", "Beach Access", "Spa", "Restaurant", "Bar"],
      link: "https://www.booking.com/hotel/villa-cortes",
      description: "Beachfront hotel with Aztec-inspired architecture in the heart of Tenerife's resort area.",
      stars: 4
    },
    {
      name: "Hotel Rural Orotava",
      pricePerNight: 125,
      total: 875,
      rating: 4.3,
      reviews: 1245,
      location: "La Orotava",
      amenities: ["WiFi", "Pool", "Garden", "Traditional Architecture", "Mountain Views"],
      link: "https://www.booking.com/hotel/rural-orotava",
      description: "Charming rural hotel in historic La Orotava with views of Mount Teide.",
      stars: 4
    },
    {
      name: "Parador de Cañadas del Teide",
      pricePerNight: 145,
      total: 1015,
      rating: 4.2,
      reviews: 1567,
      location: "Teide National Park",
      amenities: ["WiFi", "Restaurant", "Mountain Views", "Hiking Trails", "Stargazing"],
      link: "https://www.booking.com/hotel/parador-canadas-teide",
      description: "Unique mountain lodge in Teide National Park, perfect for stargazing and hiking.",
      stars: 4
    }
  ]
}

export async function queryHotelsUsingAPI(apiNames: string[], profile: SearchProfile): Promise<Hotel[]> {
  console.log(`🏨 Searching hotels in ${profile.destinationCity} from ${profile.checkIn} to ${profile.checkOut}`)
  console.log(`💰 Budget: ${profile.maxNightlyRate}/night for ${profile.guests} guests`)
  console.log(`🔍 Using APIs: ${apiNames.join(', ')}`)

  try {
    // Call the real hotel search API
    const response = await fetch('/api/hotels/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        city: profile.destinationCity,
        checkIn: profile.checkIn,
        checkOut: profile.checkOut,
        travelers: profile.guests,
        budget: profile.accommodationBudget,
        accommodationType: profile.stayType || 'hotel'
      })
    })

    if (!response.ok) {
      console.error('Hotel search API failed:', response.status)
      return getFallbackHotels(profile)
    }

    const data = await response.json()
    
    // Handle nested hotel data structure from API
    const hotelArray = data.hotels?.hotels || data.hotels || []
    
    if (!data.success || !Array.isArray(hotelArray) || hotelArray.length === 0) {
      console.log('No hotels found in API response, using fallback data')
      console.log('API response structure:', JSON.stringify(data, null, 2))
      return getFallbackHotels(profile)
    }

    // Transform API response to our Hotel format with safety checks
    const hotels: Hotel[] = hotelArray.filter(hotel => hotel && hotel.name).map((hotel: any) => ({
      name: hotel.name || 'Hotel Name Not Available',
      pricePerNight: hotel.pricePerNight || hotel.price || 100,
      total: hotel.totalCost || hotel.total || (hotel.pricePerNight || 100) * profile.nights,
      rating: hotel.rating || 4.0,
      reviews: hotel.reviews?.count || hotel.reviews || 100,
      location: hotel.location || profile.destinationCity,
      amenities: Array.isArray(hotel.amenities) ? hotel.amenities : ['WiFi'],
      link: hotel.bookingUrl || hotel.link || `https://www.booking.com/search?q=${encodeURIComponent(hotel.name || profile.destinationCity)}`,
      description: hotel.description || `${hotel.rating || 4.0}/5 rated hotel in ${profile.destinationCity}`,
      stars: hotel.stars || (hotel.type === 'luxury' ? 5 : hotel.type === 'hotel' ? 4 : 3),
      // Additional real data from API
      coordinates: hotel.coordinates,
      images: Array.isArray(hotel.images) ? hotel.images : undefined,
      cancellationPolicy: hotel.cancellationPolicy,
      rooms: Array.isArray(hotel.rooms) ? hotel.rooms : undefined
    }))

    console.log(`✅ Found ${hotels.length} real hotels from API`)
    return hotels
  } catch (error) {
    console.error('Error querying hotel API:', error)
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error')
    return getFallbackHotels(profile)
  }
}

// Fallback function when API fails
function getFallbackHotels(profile: SearchProfile): Hotel[] {
  const searchKey = `${profile.destinationCity}, ${profile.country}`
  const availableHotels = HOTEL_DATABASE[searchKey] || []

  // Filter hotels based on budget and preferences
  const filteredHotels = availableHotels.filter(hotel => {
    // Check budget
    if (hotel.pricePerNight > profile.maxNightlyRate) return false
    
    // Check total budget
    if (hotel.total > profile.accommodationBudget) return false
    
    // Check preferred amenities (at least one should match)
    if (profile.preferredAmenities.length > 0) {
      const hasPreferredAmenity = profile.preferredAmenities.some(
        amenity => hotel.amenities.includes(amenity)
      )
      if (!hasPreferredAmenity) return false
    }
    
    return true
  })

  // Calculate total cost for the stay
  const hotelsWithCorrectTotal = filteredHotels.map(hotel => ({
    ...hotel,
    total: hotel.pricePerNight * profile.nights
  }))

  console.log(`✅ Found ${hotelsWithCorrectTotal.length} hotels matching criteria`)
  
  return hotelsWithCorrectTotal
}

export function pickBestHotel(hotels: Hotel[]): Hotel | null {
  if (hotels.length === 0) return null

  return hotels.sort((a, b) => {
    // Calculate score based on rating, amenities, and value
    const aScore = a.rating + 
      (a.amenities.includes("Breakfast") ? 0.5 : 0) +
      (a.amenities.includes("WiFi") ? 0.3 : 0) +
      (a.stars && a.stars >= 4 ? 0.4 : 0) +
      (a.reviews > 1000 ? 0.2 : 0)
    
    const bScore = b.rating + 
      (b.amenities.includes("Breakfast") ? 0.5 : 0) +
      (b.amenities.includes("WiFi") ? 0.3 : 0) +
      (b.stars && b.stars >= 4 ? 0.4 : 0) +
      (b.reviews > 1000 ? 0.2 : 0)
    
    return bScore - aScore
  })[0]
}

export function getHotelAlternatives(hotels: Hotel[], selectedHotel: Hotel): Hotel[] {
  return hotels
    .filter(hotel => hotel.name !== selectedHotel.name)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 2)
}

export async function searchHotelsForDestination(profile: SearchProfile): Promise<{
  selectedHotel: Hotel | null
  alternatives: Hotel[]
  hotelSource: any
}> {
  // Get hotel sources for the country
  const hotelSource = getHotelSourcesForCountry(profile.country)
  
  if (!hotelSource) {
    console.log(`❌ No hotel sources found for ${profile.country}`)
    return { selectedHotel: null, alternatives: [], hotelSource: null }
  }

  console.log(`🌍 Using ${hotelSource.region} hotel sources for ${profile.country}`)
  console.log(`📡 Primary APIs: ${hotelSource.primaryAPIs.join(', ')}`)

  // Query hotels using the primary APIs
  const hotels = await queryHotelsUsingAPI(hotelSource.primaryAPIs, profile)
  
  // Pick best hotel and alternatives
  const selectedHotel = pickBestHotel(hotels)
  const alternatives = selectedHotel ? getHotelAlternatives(hotels, selectedHotel) : []

  return { selectedHotel, alternatives, hotelSource }
}