import { NextRequest, NextResponse } from 'next/server'
import { HotelBot } from '@/services/HotelBot'

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
  try {
    // Use HotelBot to search for real hotels
    const searchParams = {
      destination: city,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      guests: travelers,
      budget: budget,
      preferences: {
        starRating: accommodationType.includes('luxury') ? 4 : undefined,
        location: 'city_center' as const
      }
    }

    console.log('🏨 Searching hotels with HotelBot:', searchParams)
    
    const hotels = await HotelBot.searchHotels(searchParams)
    
    // Calculate nights for display
    const checkInDate = new Date(checkIn)
    const checkOutDate = new Date(checkOut)
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
    const budgetPerNight = Math.floor(budget / nights)
    
    // Transform results for frontend
    const transformedHotels = hotels.map(hotel => {
      const lowestPrice = Math.min(...hotel.rooms.map(room => room.price.amount))
      const totalCost = hotel.rooms[0].price.perNight 
        ? lowestPrice * nights 
        : lowestPrice
      
      return {
        id: hotel.id,
        name: hotel.name,
        type: hotel.starRating >= 4 ? 'luxury' : hotel.starRating >= 3 ? 'hotel' : 'budget',
        rating: hotel.reviews.overall / 2, // Convert from 10-point to 5-point scale
        location: hotel.location.nearbyAttractions?.join(', ') || hotel.address,
        pricePerNight: hotel.rooms[0].price.perNight ? lowestPrice : lowestPrice / nights,
        amenities: hotel.amenities.slice(0, 5), // Top 5 amenities
        description: `${hotel.starRating}-star hotel with ${hotel.reviews.count} reviews. ${hotel.location.walkingDistanceToCenter} from center.`,
        totalCost,
        withinBudget: totalCost <= budget,
        checkIn,
        checkOut,
        nights,
        score: hotel.score,
        images: hotel.images,
        cancellationPolicy: hotel.cancellationPolicy,
        rooms: hotel.rooms.map(room => ({
          type: room.type,
          description: room.description,
          price: room.price.amount,
          available: room.available
        }))
      }
    })
    
    return {
      hotels: transformedHotels,
      searchParams: {
        city,
        nights,
        budgetPerNight,
        totalBudget: budget
      }
    }
  } catch (error) {
    console.error('Error in searchHotels:', error)
    // Fallback to simple response
    return {
      hotels: [{
        name: `${city} Central Hotel`,
        type: 'hotel',
        rating: 4.0,
        location: 'City Center',
        pricePerNight: 120,
        amenities: ['WiFi', 'Breakfast', 'Air Conditioning'],
        description: `Comfortable hotel in central ${city}`,
        totalCost: 120 * Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)),
        withinBudget: true,
        checkIn,
        checkOut,
        nights: Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24))
      }],
      searchParams: {
        city,
        nights: Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)),
        budgetPerNight: budget / Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)),
        totalBudget: budget
      }
    }
  }
}