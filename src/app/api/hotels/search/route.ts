import { NextRequest, NextResponse } from 'next/server'

interface HotelSearchParams {
  city: string
  checkIn: string
  checkOut: string
  travelers: number
  budget: number
  accommodationType: string
}

export async function POST(request: NextRequest) {
  try {
    const { city, checkIn, checkOut, travelers, budget, accommodationType }: HotelSearchParams = await request.json()
    
    if (!city || !checkIn || !checkOut) {
      return NextResponse.json({ error: 'Missing required hotel search parameters' }, { status: 400 })
    }

    console.log('🏨 Searching hotels:', { city, checkIn, checkOut, travelers, budget, accommodationType })

    // 🏨 5. Hotel Search with Budget Constraints
    const hotels = await searchHotels(city, checkIn, checkOut, travelers, budget, accommodationType)

    return NextResponse.json({
      success: true,
      hotels
    })

  } catch (error) {
    console.error('❌ Error in hotel search:', error)
    return NextResponse.json(
      { error: 'Failed to search hotels' },
      { status: 500 }
    )
  }
}

async function searchHotels(city: string, checkIn: string, checkOut: string, travelers: number, budget: number, accommodationType: string) {
  // Calculate nights
  const checkInDate = new Date(checkIn)
  const checkOutDate = new Date(checkOut)
  const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
  const budgetPerNight = Math.floor(budget / nights)
  
  console.log('🏨 Hotel search params:', { nights, budgetPerNight })
  
  // Hotel database by city
  const hotelDatabase: Record<string, any[]> = {
    'rome': [
      {
        name: 'Hotel Artemide',
        type: 'luxury',
        rating: 4.5,
        location: 'Near Termini Station',
        pricePerNight: 180,
        amenities: ['WiFi', 'Breakfast', 'Air Conditioning', 'Concierge', 'Spa'],
        description: 'Elegant 4-star hotel in central Rome with rooftop terrace'
      },
      {
        name: 'Hotel Quirinale',
        type: 'hotel',
        rating: 4.2,
        location: 'Near Trevi Fountain',
        pricePerNight: 120,
        amenities: ['WiFi', 'Breakfast', 'Air Conditioning', 'Bar'],
        description: '4-star hotel in historic center, walking distance to major attractions'
      },
      {
        name: 'Hotel Sonya',
        type: 'hotel',
        rating: 3.8,
        location: 'Near Termini Station',
        pricePerNight: 85,
        amenities: ['WiFi', 'Air Conditioning', 'Reception 24h'],
        description: 'Comfortable 3-star hotel with modern amenities'
      },
      {
        name: 'The RomeHello',
        type: 'hostel',
        rating: 4.1,
        location: 'Ostiense District',
        pricePerNight: 45,
        amenities: ['WiFi', 'Kitchen', 'Laundry', 'Common Area'],
        description: 'Modern hostel with private rooms and social atmosphere'
      }
    ],
    'florence': [
      {
        name: 'Hotel Davanzati',
        type: 'luxury',
        rating: 4.6,
        location: 'Historic Center',
        pricePerNight: 200,
        amenities: ['WiFi', 'Breakfast', 'Concierge', 'Room Service'],
        description: 'Boutique hotel in a 15th-century palazzo'
      },
      {
        name: 'Hotel Pendini',
        type: 'hotel',
        rating: 4.0,
        location: 'Near Duomo',
        pricePerNight: 130,
        amenities: ['WiFi', 'Breakfast', 'Air Conditioning'],
        description: 'Historic hotel steps from the Duomo'
      },
      {
        name: 'Hotel Casci',
        type: 'hotel',
        rating: 3.9,
        location: 'San Lorenzo',
        pricePerNight: 90,
        amenities: ['WiFi', 'Breakfast', 'Garden'],
        description: 'Family-run hotel in quiet residential area'
      }
    ],
    'paris': [
      {
        name: 'Hotel Malte Opera',
        type: 'luxury',
        rating: 4.4,
        location: 'Opera District',
        pricePerNight: 220,
        amenities: ['WiFi', 'Breakfast', 'Concierge', 'Bar'],
        description: 'Elegant Haussmann-style hotel near major attractions'
      },
      {
        name: 'Hotel des Grands Boulevards',
        type: 'hotel',
        rating: 4.2,
        location: 'Grands Boulevards',
        pricePerNight: 160,
        amenities: ['WiFi', 'Restaurant', 'Bar'],
        description: 'Stylish hotel with contemporary French design'
      },
      {
        name: 'Hotel Jeanne d\'Arc',
        type: 'hotel',
        rating: 3.8,
        location: 'Le Marais',
        pricePerNight: 110,
        amenities: ['WiFi', 'Breakfast'],
        description: 'Charming hotel in the heart of historic Marais'
      }
    ],
    'athens': [
      {
        name: 'Hotel Grande Bretagne',
        type: 'luxury',
        rating: 4.7,
        location: 'Syntagma Square',
        pricePerNight: 250,
        amenities: ['WiFi', 'Spa', 'Pool', 'Concierge', 'Restaurant'],
        description: 'Luxury hotel overlooking Syntagma Square'
      },
      {
        name: 'Electra Palace Athens',
        type: 'hotel',
        rating: 4.3,
        location: 'Plaka',
        pricePerNight: 140,
        amenities: ['WiFi', 'Pool', 'Restaurant', 'Bar'],
        description: '5-star hotel with rooftop pool and Acropolis views'
      },
      {
        name: 'Athens Center Square Hotel',
        type: 'hotel',
        rating: 4.0,
        location: 'City Center',
        pricePerNight: 95,
        amenities: ['WiFi', 'Breakfast', 'Fitness Center'],
        description: 'Modern hotel in central Athens'
      }
    ]
  }
  
  // Get hotels for the city
  const cityHotels = hotelDatabase[city.toLowerCase()] || [
    {
      name: `${city} Central Hotel`,
      type: 'hotel',
      rating: 4.0,
      location: 'City Center',
      pricePerNight: 120,
      amenities: ['WiFi', 'Breakfast', 'Air Conditioning'],
      description: `Comfortable hotel in central ${city}`
    }
  ]
  
  // Filter by accommodation type preference
  let filteredHotels = cityHotels
  if (accommodationType !== 'any') {
    filteredHotels = cityHotels.filter(hotel => {
      if (accommodationType.includes('luxury')) return hotel.type === 'luxury'
      if (accommodationType.includes('budget') || accommodationType.includes('hostel')) return hotel.type === 'hostel' || hotel.pricePerNight < 80
      return hotel.type === 'hotel'
    })
  }
  
  // Sort by price and filter by budget
  const affordableHotels = filteredHotels
    .filter(hotel => hotel.pricePerNight <= budgetPerNight * 1.1) // Allow 10% over budget
    .sort((a, b) => a.pricePerNight - b.pricePerNight)
  
  // If no hotels within budget, show cheapest options
  const hotelsToShow = affordableHotels.length > 0 ? affordableHotels : filteredHotels.sort((a, b) => a.pricePerNight - b.pricePerNight).slice(0, 3)
  
  return {
    hotels: hotelsToShow.map(hotel => ({
      ...hotel,
      totalCost: hotel.pricePerNight * nights,
      withinBudget: hotel.pricePerNight <= budgetPerNight,
      checkIn,
      checkOut,
      nights
    })),
    searchParams: {
      city,
      nights,
      budgetPerNight,
      totalBudget: budget
    }
  }
}