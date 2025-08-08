import axios from 'axios'
import { HotelResult, HotelSearchParams } from '@/services/HotelBot'
import { searchHotelsForDestination, SearchProfile } from '@/utils/hotelSearch'

export class BookingAPI {
  private static readonly API_KEY = process.env.BOOKING_API_KEY
  private static readonly RAPID_API_KEY = process.env.RAPID_API_KEY
  private static readonly BASE_URL = 'https://booking-com.p.rapidapi.com/v1'

  static async searchHotels(params: HotelSearchParams): Promise<HotelResult[]> {
    if (!this.RAPID_API_KEY) {
      console.warn('BookingAPI: No API key found, using fallback data')
      return await this.getFallbackData(params)
    }

    try {
      // Step 1: Get location ID
      const locationId = await this.getLocationId(params.destination)
      if (!locationId) {
        return await this.getFallbackData(params)
      }

      // Step 2: Search hotels
      const searchResults = await this.performHotelSearch(locationId, params)
      
      // Step 3: Transform to our format
      return this.transformResults(searchResults, params)
    } catch (error) {
      console.error('BookingAPI: Error searching hotels:', error)
      return await this.getFallbackData(params)
    }
  }

  private static async getLocationId(destination: string): Promise<string | null> {
    try {
      const response = await axios.get(`${this.BASE_URL}/hotels/locations`, {
        headers: {
          'X-RapidAPI-Key': this.RAPID_API_KEY!,
          'X-RapidAPI-Host': 'booking-com.p.rapidapi.com'
        },
        params: {
          name: destination,
          locale: 'en-gb'
        }
      })

      if (response.data && response.data.length > 0) {
        return response.data[0].dest_id
      }
      return null
    } catch (error) {
      console.error('BookingAPI: Error getting location ID:', error)
      return null
    }
  }

  private static async performHotelSearch(locationId: string, params: HotelSearchParams): Promise<any[]> {
    try {
      const response = await axios.get(`${this.BASE_URL}/hotels/search`, {
        headers: {
          'X-RapidAPI-Key': this.RAPID_API_KEY!,
          'X-RapidAPI-Host': 'booking-com.p.rapidapi.com'
        },
        params: {
          dest_id: locationId,
          order_by: 'popularity',
          filter_by_currency: 'GBP',
          adults_number: params.guests,
          checkin_date: params.checkInDate,
          checkout_date: params.checkOutDate,
          room_number: 1,
          units: 'metric'
        }
      })

      return response.data?.result || []
    } catch (error) {
      console.error('BookingAPI: Error performing hotel search:', error)
      return []
    }
  }

  private static transformResults(hotels: any[], params: HotelSearchParams): HotelResult[] {
    return hotels.map(hotel => ({
      id: `booking_${hotel.hotel_id || Math.random()}`,
      name: hotel.hotel_name || 'Unknown Hotel',
      starRating: parseInt(hotel.class || 3),
      address: hotel.address || 'Address not available',
      coordinates: {
        lat: parseFloat(hotel.latitude || 0),
        lng: parseFloat(hotel.longitude || 0)
      },
      images: hotel.main_photo_url ? [hotel.main_photo_url] : ['/api/placeholder/400/300'],
      amenities: this.extractAmenities(hotel),
      rooms: [{
        type: hotel.accommodation_type || 'Standard Room',
        description: hotel.unit_configuration_label || 'Comfortable room',
        price: {
          amount: Math.round(hotel.price_breakdown?.gross_price?.value || hotel.min_total_price || 100),
          currency: hotel.price_breakdown?.currency || 'GBP',
          perNight: true
        },
        available: hotel.available_rooms || 5
      }],
      location: {
        type: this.determineLocationType(hotel),
        walkingDistanceToCenter: `${hotel.distance_to_cc || 1} km`,
        nearbyAttractions: []
      },
      accessibility: {
        wheelchairAccessible: hotel.is_accessible || false,
        features: hotel.is_accessible ? ['Accessible entrance', 'Accessible rooms'] : []
      },
      reviews: {
        overall: parseFloat(hotel.review_score || 8.0),
        cleanliness: parseFloat(hotel.review_score || 8.0),
        location: parseFloat(hotel.review_score || 8.0),
        service: parseFloat(hotel.review_score || 8.0),
        value: parseFloat(hotel.review_score || 8.0),
        count: parseInt(hotel.review_score_word?.match(/\d+/) || '100')
      },
      cancellationPolicy: hotel.is_free_cancellable 
        ? 'Free cancellation available' 
        : 'Standard cancellation policy',
      score: 0,
      bookingUrl: hotel.url
    }))
  }

  private static extractAmenities(hotel: any): string[] {
    const amenities: string[] = ['WiFi'] // Most hotels have WiFi
    
    if (hotel.is_beach_front) amenities.push('Beach Access')
    if (hotel.has_swimming_pool) amenities.push('Pool')
    if (hotel.has_spa) amenities.push('Spa')
    if (hotel.has_fitness_center) amenities.push('Gym')
    if (hotel.has_restaurant) amenities.push('Restaurant')
    if (hotel.has_bar) amenities.push('Bar')
    if (hotel.has_parking) amenities.push('Parking')
    if (hotel.has_airport_shuttle) amenities.push('Airport Shuttle')
    
    return amenities
  }

  private static determineLocationType(hotel: any): string {
    const distance = parseFloat(hotel.distance_to_cc || 0)
    if (distance <= 1) return 'city_center'
    if (distance <= 5) return 'business_district'
    if (hotel.is_beach_front) return 'beach'
    return 'suburban'
  }

  private static async getFallbackData(params: HotelSearchParams): Promise<HotelResult[]> {
    try {
      console.log('BookingAPI: Using real hotel database as fallback')
      
      // Use the real hotel database from hotelSearch.ts
      const searchProfile: SearchProfile = {
        destinationCity: params.destination,
        country: this.getCountryFromDestination(params.destination),
        checkIn: params.checkInDate,
        checkOut: params.checkOutDate,
        guests: params.guests,
        nights: this.calculateNights(params.checkInDate, params.checkOutDate),
        totalBudget: params.budget || 1000,
        accommodationBudget: params.budget || 1000,
        maxNightlyRate: params.budget ? Math.floor(params.budget / this.calculateNights(params.checkInDate, params.checkOutDate)) : 150,
        stayType: 'hotel',
        preferredAmenities: params.preferences?.amenities || [],
        locationPreference: params.preferences?.location || 'city_center'
      }

      const realHotels = await searchHotelsForDestination(searchProfile)
      const convertedHotels = this.convertRealHotelsToHotelResults(realHotels.selectedHotel, realHotels.alternatives, params)
      
      if (convertedHotels.length > 0) {
        console.log(`BookingAPI: Using real hotel database with ${convertedHotels.length} hotels`)
        return convertedHotels
      }
    } catch (error) {
      console.error('BookingAPI: Error getting real hotels for fallback:', error)
    }

    // Final fallback - simple generic hotel
    return [{
      id: 'booking_generic_fallback',
      name: `${params.destination} Central Hotel`,
      starRating: 3,
      address: `Central Area, ${params.destination}`,
      coordinates: { lat: 0, lng: 0 },
      images: ['/api/placeholder/400/300'],
      amenities: ['WiFi', 'Reception', 'Breakfast'],
      rooms: [{
        type: 'Standard Room',
        description: 'Comfortable accommodation',
        price: { amount: 120, currency: 'GBP', perNight: true },
        available: 10
      }],
      location: {
        type: 'city_center',
        walkingDistanceToCenter: '15 minutes',
        nearbyAttractions: ['City Center']
      },
      accessibility: {
        wheelchairAccessible: true,
        features: ['Basic accessibility']
      },
      reviews: {
        overall: 8.0, cleanliness: 8.0, location: 8.0, service: 8.0, value: 8.0, count: 100
      },
      cancellationPolicy: 'Standard cancellation policy',
      score: 75
    }]
  }

  // Convert real hotel data to HotelResult format
  private static convertRealHotelsToHotelResults(selectedHotel: any, alternatives: any[], params: HotelSearchParams): HotelResult[] {
    const allHotels = [selectedHotel, ...alternatives].filter(Boolean)
    
    return allHotels.map((hotel: any) => ({
      id: `booking_real_${hotel.name.toLowerCase().replace(/\s+/g, '_')}`,
      name: hotel.name,
      starRating: hotel.stars || 4,
      address: hotel.location,
      coordinates: hotel.coordinates || { lat: 0, lng: 0 },
      images: hotel.images || ['/api/placeholder/400/300'],
      amenities: hotel.amenities,
      rooms: hotel.rooms || [{
        type: 'Standard Room',
        description: hotel.description || 'Comfortable room',
        price: { amount: hotel.pricePerNight, currency: 'GBP', perNight: true },
        available: 5
      }],
      location: {
        type: 'city_center',
        walkingDistanceToCenter: '10 minutes',
        nearbyAttractions: [hotel.location]
      },
      accessibility: {
        wheelchairAccessible: hotel.amenities.includes('Accessible'),
        features: hotel.amenities.includes('Accessible') ? ['Accessible entrance'] : []
      },
      reviews: {
        overall: hotel.rating * 2, // Convert from 5-point to 10-point scale
        cleanliness: hotel.rating * 2,
        location: hotel.rating * 2,
        service: hotel.rating * 2,
        value: hotel.rating * 2,
        count: hotel.reviews || 100
      },
      cancellationPolicy: hotel.cancellationPolicy || 'Standard cancellation policy',
      score: Math.round(hotel.rating * 30) // Base score from rating
    }))
  }

  // Map destination to country
  private static getCountryFromDestination(destination: string): string {
    const destinationToCountry: Record<string, string> = {
      'rome': 'Italy', 'florence': 'Italy', 'venice': 'Italy', 'milan': 'Italy',
      'paris': 'France', 'nice': 'France', 'lyon': 'France',
      'london': 'United Kingdom', 'manchester': 'United Kingdom', 'edinburgh': 'United Kingdom',
      'tokyo': 'Japan', 'osaka': 'Japan', 'kyoto': 'Japan',
      'bangkok': 'Thailand', 'phuket': 'Thailand', 'chiang mai': 'Thailand',
      'barcelona': 'Spain', 'madrid': 'Spain', 'seville': 'Spain', 'tenerife': 'Spain',
      'new york': 'United States', 'los angeles': 'United States', 'chicago': 'United States',
      'dubai': 'United Arab Emirates', 'abu dhabi': 'United Arab Emirates',
      'sydney': 'Australia', 'melbourne': 'Australia',
      'cancun': 'Mexico', 'mexico city': 'Mexico',
      'amsterdam': 'Netherlands', 'rotterdam': 'Netherlands',
      'singapore': 'Singapore',
      'cape town': 'South Africa', 'johannesburg': 'South Africa',
      'istanbul': 'Turkey', 'ankara': 'Turkey'
    }

    const lowerDestination = destination.toLowerCase()
    
    for (const [city, country] of Object.entries(destinationToCountry)) {
      if (lowerDestination.includes(city) || city.includes(lowerDestination)) {
        return country
      }
    }
    
    return 'Unknown'
  }

  private static calculateNights(checkIn: string, checkOut: string): number {
    const start = new Date(checkIn)
    const end = new Date(checkOut)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }
}