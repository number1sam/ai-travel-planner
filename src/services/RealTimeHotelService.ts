import axios from 'axios'
import { HotelResult, HotelSearchParams } from './HotelBot'

export interface RealTimeHotelQuery {
  location: string
  locationCode?: string
  checkIn: string // YYYY-MM-DD format
  checkOut: string // YYYY-MM-DD format
  guests: number
  rooms: number
  currency: string
  budget?: {
    min: number
    max: number
  }
  filters?: {
    minStarRating?: number
    minReviewScore?: number
    amenities?: string[]
  }
}

export interface BookingHotelResult {
  id: string
  name: string
  address: string
  coordinates: {
    lat: number
    lng: number
  }
  starRating: number
  reviewScore: number
  reviewCount: number
  pricePerNight: number
  totalPrice: number
  currency: string
  amenities: string[]
  photos: string[]
  description: string
  cancellationPolicy: string
  deepBookingLink: string // Direct link to booking page with exact dates/guests
  lastUpdated: Date
  availability: {
    available: boolean
    roomsLeft: number
    roomTypes: Array<{
      type: string
      price: number
      description: string
    }>
  }
}

export class RealTimeHotelService {
  private static readonly BOOKING_API_KEY = process.env.BOOKING_RAPIDAPI_KEY
  private static readonly AGODA_API_KEY = process.env.AGODA_API_KEY
  private static readonly EXPEDIA_API_KEY = process.env.EXPEDIA_API_KEY
  
  private static readonly API_ENDPOINTS = {
    booking: 'https://booking-com.p.rapidapi.com/v1',
    agoda: 'https://agoda-com.p.rapidapi.com/v2', 
    expedia: 'https://expedia.p.rapidapi.com/api/v1'
  }

  /**
   * Main entry point - searches multiple OTAs for real-time hotel data
   */
  static async searchRealTimeHotels(query: RealTimeHotelQuery): Promise<BookingHotelResult[]> {
    console.log('🔍 Starting real-time hotel search:', query)
    
    // Validate query parameters
    if (!this.validateQuery(query)) {
      throw new Error('Invalid search query parameters')
    }

    const results: BookingHotelResult[] = []
    
    // Search multiple providers in parallel
    const searchTasks = []
    
    if (this.BOOKING_API_KEY) {
      searchTasks.push(this.searchBookingCom(query))
    }
    
    if (this.AGODA_API_KEY) {
      searchTasks.push(this.searchAgoda(query))
    }
    
    if (this.EXPEDIA_API_KEY) {
      searchTasks.push(this.searchExpedia(query))
    }

    // If no API keys available, use structured fallback with real hotel database
    if (searchTasks.length === 0) {
      console.log('📡 No API keys found, using structured fallback with real hotel database')
      return this.searchWithStructuredFallback(query)
    }

    try {
      const searchResults = await Promise.allSettled(searchTasks)
      
      // Combine results from all providers
      searchResults.forEach((result, index) => {
        const provider = ['booking', 'agoda', 'expedia'][index]
        
        if (result.status === 'fulfilled' && result.value.length > 0) {
          console.log(`✅ ${provider} returned ${result.value.length} hotels`)
          results.push(...result.value)
        } else {
          console.warn(`⚠️ ${provider} search failed:`, result.status === 'rejected' ? result.reason : 'No results')
        }
      })

      // Remove duplicates and rank results
      const uniqueHotels = this.deduplicateHotels(results)
      const rankedHotels = this.rankHotels(uniqueHotels, query)
      
      console.log(`🏆 Returning ${rankedHotels.length} ranked hotel results`)
      return rankedHotels

    } catch (error) {
      console.error('❌ Error in real-time hotel search:', error)
      throw error
    }
  }

  /**
   * Search Booking.com via RapidAPI
   */
  private static async searchBookingCom(query: RealTimeHotelQuery): Promise<BookingHotelResult[]> {
    try {
      // Step 1: Get destination ID
      const locationResponse = await axios.get(`${this.API_ENDPOINTS.booking}/hotels/locations`, {
        headers: {
          'X-RapidAPI-Key': this.BOOKING_API_KEY!,
          'X-RapidAPI-Host': 'booking-com.p.rapidapi.com'
        },
        params: {
          name: query.location,
          locale: 'en-gb'
        }
      })

      if (!locationResponse.data || locationResponse.data.length === 0) {
        console.log('❌ No location found on Booking.com for:', query.location)
        return []
      }

      const destId = locationResponse.data[0].dest_id
      const destType = locationResponse.data[0].dest_type

      // Step 2: Search hotels
      const searchResponse = await axios.get(`${this.API_ENDPOINTS.booking}/hotels/search`, {
        headers: {
          'X-RapidAPI-Key': this.BOOKING_API_KEY!,
          'X-RapidAPI-Host': 'booking-com.p.rapidapi.com'
        },
        params: {
          dest_id: destId,
          dest_type: destType,
          checkin_date: query.checkIn,
          checkout_date: query.checkOut,
          adults_number: query.guests,
          room_number: query.rooms || 1,
          filter_by_currency: query.currency,
          order_by: 'popularity',
          units: 'metric',
          include_adjacency: 'true',
          page_number: 0,
          ...(query.budget && {
            price_filter_currencycode: query.currency,
            pricefilter_from: query.budget.min,
            pricefilter_to: query.budget.max
          }),
          ...(query.filters?.minStarRating && {
            categories_filter: query.filters.minStarRating
          })
        }
      })

      const hotels = searchResponse.data?.result || []
      
      return hotels.slice(0, 10).map((hotel: any) => this.transformBookingResult(hotel, query))

    } catch (error) {
      console.error('❌ Booking.com search error:', error)
      return []
    }
  }

  /**
   * Structured fallback using existing hotel database
   */
  private static async searchWithStructuredFallback(query: RealTimeHotelQuery): Promise<BookingHotelResult[]> {
    console.log('🏛️ Using structured fallback with real hotel database')
    
    try {
      // Import the existing hotel search system
      const { searchHotelsForDestination } = await import('../utils/hotelSearch')
      
      // Convert query to SearchProfile format
      const searchProfile = {
        destinationCity: query.location,
        country: this.guessCountryFromLocation(query.location),
        checkIn: query.checkIn,
        checkOut: query.checkOut,
        guests: query.guests,
        nights: this.calculateNights(query.checkIn, query.checkOut),
        totalBudget: query.budget?.max || 1000,
        accommodationBudget: query.budget?.max || 1000,
        maxNightlyRate: query.budget?.max || 200,
        stayType: 'hotel',
        preferredAmenities: query.filters?.amenities || [],
        locationPreference: 'city_center'
      }
      
      const { selectedHotel, alternatives } = await searchHotelsForDestination(searchProfile)
      const allHotels = [selectedHotel, ...alternatives].filter(Boolean)
      
      // Transform to BookingHotelResult format
      return allHotels.map(hotel => ({
        id: `fallback_${hotel.name.toLowerCase().replace(/\s+/g, '_')}`,
        name: hotel.name,
        address: hotel.location,
        coordinates: hotel.coordinates || { lat: 0, lng: 0 },
        starRating: hotel.stars || 4,
        reviewScore: hotel.rating * 2, // Convert 5-point to 10-point
        reviewCount: hotel.reviews || 100,
        pricePerNight: hotel.pricePerNight,
        totalPrice: hotel.pricePerNight * searchProfile.nights,
        currency: query.currency,
        amenities: hotel.amenities,
        photos: hotel.images || [],
        description: hotel.description || `${hotel.stars || 4}-star hotel in ${query.location}`,
        cancellationPolicy: hotel.cancellationPolicy || 'Standard cancellation policy',
        deepBookingLink: this.generateFallbackBookingLink(hotel, query),
        lastUpdated: new Date(),
        availability: {
          available: true,
          roomsLeft: 5,
          roomTypes: [{
            type: 'Standard Room',
            price: hotel.pricePerNight,
            description: hotel.description || 'Comfortable accommodation'
          }]
        }
      }))
      
    } catch (error) {
      console.error('❌ Structured fallback search failed:', error)
      return []
    }
  }

  /**
   * Generate booking link for fallback hotels
   */
  private static generateFallbackBookingLink(hotel: any, query: RealTimeHotelQuery): string {
    // Use existing booking link if available
    if (hotel.link && hotel.link !== '#') {
      return hotel.link
    }
    
    // Generate Booking.com search link with parameters
    const params = new URLSearchParams({
      checkin: query.checkIn,
      checkout: query.checkOut,
      adults: query.guests.toString(),
      rooms: (query.rooms || 1).toString(),
      dest_type: 'city',
      dest_name: query.location
    })
    
    return `https://www.booking.com/searchresults.html?${params.toString()}`
  }

  /**
   * Guess country from location name
   */
  private static guessCountryFromLocation(location: string): string {
    const locationMappings: Record<string, string> = {
      'rome': 'Italy', 'florence': 'Italy', 'venice': 'Italy', 'milan': 'Italy',
      'paris': 'France', 'nice': 'France', 'lyon': 'France', 'marseille': 'France',
      'london': 'United Kingdom', 'manchester': 'United Kingdom', 'edinburgh': 'United Kingdom',
      'madrid': 'Spain', 'barcelona': 'Spain', 'seville': 'Spain', 'tenerife': 'Spain',
      'berlin': 'Germany', 'munich': 'Germany', 'hamburg': 'Germany',
      'amsterdam': 'Netherlands', 'rotterdam': 'Netherlands',
      'tokyo': 'Japan', 'osaka': 'Japan', 'kyoto': 'Japan',
      'bangkok': 'Thailand', 'phuket': 'Thailand', 'chiang mai': 'Thailand',
      'sydney': 'Australia', 'melbourne': 'Australia', 'brisbane': 'Australia'
    }
    
    const lowerLocation = location.toLowerCase()
    for (const [city, country] of Object.entries(locationMappings)) {
      if (lowerLocation.includes(city)) {
        return country
      }
    }
    
    return 'Unknown'
  }

  /**
   * Search via browser automation (future implementation)
   */
  private static async searchViaBrowserAutomation(query: RealTimeHotelQuery): Promise<BookingHotelResult[]> {
    // Note: This would require Puppeteer/Playwright for headless browsing
    console.log('🤖 Browser automation search not implemented yet')
    
    // For now, fall back to structured search
    return this.searchWithStructuredFallback(query)
  }

  /**
   * Transform Booking.com API response to our standard format
   */
  private static transformBookingResult(hotel: any, query: RealTimeHotelQuery): BookingHotelResult {
    const pricePerNight = hotel.composite_price_breakdown?.gross_amount_per_night?.value || hotel.min_total_price || 0
    const totalPrice = hotel.composite_price_breakdown?.gross_amount?.value || (pricePerNight * this.calculateNights(query.checkIn, query.checkOut))

    return {
      id: `booking_${hotel.hotel_id}`,
      name: hotel.hotel_name || 'Hotel Name Not Available',
      address: hotel.address || 'Address not available',
      coordinates: {
        lat: parseFloat(hotel.latitude || 0),
        lng: parseFloat(hotel.longitude || 0)
      },
      starRating: parseInt(hotel.class || hotel.star_rating || 3),
      reviewScore: parseFloat(hotel.review_score || 8.0),
      reviewCount: parseInt(hotel.review_nr || 100),
      pricePerNight: Math.round(pricePerNight),
      totalPrice: Math.round(totalPrice),
      currency: query.currency,
      amenities: this.extractBookingAmenities(hotel),
      photos: hotel.main_photo_url ? [hotel.main_photo_url] : [],
      description: hotel.hotel_name_trans || hotel.hotel_name || '',
      cancellationPolicy: hotel.is_free_cancellable ? 'Free cancellation available' : 'Check cancellation policy',
      deepBookingLink: this.generateBookingDeepLink(hotel, query),
      lastUpdated: new Date(),
      availability: {
        available: hotel.is_available !== false,
        roomsLeft: parseInt(hotel.available_rooms || 5),
        roomTypes: [{
          type: hotel.accommodation_type || 'Standard Room',
          price: Math.round(pricePerNight),
          description: hotel.room_name || 'Standard accommodation'
        }]
      }
    }
  }

  /**
   * Generate direct booking link with exact parameters
   */
  private static generateBookingDeepLink(hotel: any, query: RealTimeHotelQuery): string {
    const baseUrl = 'https://www.booking.com/hotel'
    const hotelSlug = hotel.url?.replace('/hotel/', '') || `generic/${hotel.hotel_id}`
    
    const params = new URLSearchParams({
      checkin: query.checkIn,
      checkout: query.checkOut,
      adults: query.guests.toString(),
      rooms: (query.rooms || 1).toString(),
      group_adults: query.guests.toString(),
      group_children: '0',
      no_rooms: (query.rooms || 1).toString()
    })

    return `${baseUrl}/${hotelSlug}.html?${params.toString()}`
  }

  /**
   * Extract amenities from Booking.com response
   */
  private static extractBookingAmenities(hotel: any): string[] {
    const amenities = ['WiFi'] // Default amenity
    
    if (hotel.is_free_cancellable) amenities.push('Free Cancellation')
    if (hotel.has_swimming_pool) amenities.push('Swimming Pool')
    if (hotel.has_fitness_center) amenities.push('Fitness Center')
    if (hotel.has_restaurant) amenities.push('Restaurant')
    if (hotel.has_bar) amenities.push('Bar')
    if (hotel.has_spa) amenities.push('Spa')
    if (hotel.has_parking) amenities.push('Parking')
    if (hotel.is_beach_front) amenities.push('Beachfront')
    
    return amenities
  }

  /**
   * Remove duplicate hotels from multiple providers
   */
  private static deduplicateHotels(hotels: BookingHotelResult[]): BookingHotelResult[] {
    const seen = new Map<string, BookingHotelResult>()
    
    for (const hotel of hotels) {
      // Create unique key based on name and approximate location
      const key = `${hotel.name.toLowerCase().trim()}-${Math.round(hotel.coordinates.lat * 100)}-${Math.round(hotel.coordinates.lng * 100)}`
      
      if (!seen.has(key) || seen.get(key)!.reviewScore < hotel.reviewScore) {
        seen.set(key, hotel)
      }
    }
    
    return Array.from(seen.values())
  }

  /**
   * Rank hotels based on user preferences and quality metrics
   */
  private static rankHotels(hotels: BookingHotelResult[], query: RealTimeHotelQuery): BookingHotelResult[] {
    return hotels.map(hotel => {
      let score = 100
      
      // Price factor (within budget gets bonus)
      if (query.budget) {
        if (hotel.totalPrice <= query.budget.max) {
          score += 20
          // Sweet spot bonus (not too cheap, not too expensive)
          const budgetMidpoint = (query.budget.min + query.budget.max) / 2
          const priceDistance = Math.abs(hotel.totalPrice - budgetMidpoint)
          const maxDistance = (query.budget.max - query.budget.min) / 2
          score += Math.max(0, 15 - (priceDistance / maxDistance) * 15)
        } else {
          score -= 50 // Penalty for over budget
        }
      }
      
      // Review score factor (heavily weighted)
      score += (hotel.reviewScore / 10) * 30
      
      // Review count factor (more reviews = more reliable)
      score += Math.min(hotel.reviewCount / 100, 10)
      
      // Star rating factor
      score += hotel.starRating * 5
      
      // Amenities factor
      score += hotel.amenities.length * 2
      
      // Availability factor
      if (!hotel.availability.available) {
        score -= 100 // Major penalty for unavailable hotels
      }
      
      // Apply user filters
      if (query.filters) {
        if (query.filters.minStarRating && hotel.starRating < query.filters.minStarRating) {
          score -= 30
        }
        if (query.filters.minReviewScore && hotel.reviewScore < query.filters.minReviewScore) {
          score -= 25
        }
      }
      
      return { ...hotel, score: Math.round(score) }
    }).sort((a, b) => (b as any).score - (a as any).score)
  }

  /**
   * Validate search query parameters
   */
  private static validateQuery(query: RealTimeHotelQuery): boolean {
    if (!query.location || !query.checkIn || !query.checkOut || !query.guests) {
      return false
    }
    
    const checkIn = new Date(query.checkIn)
    const checkOut = new Date(query.checkOut)
    
    if (checkIn >= checkOut || checkIn < new Date()) {
      return false
    }
    
    if (query.guests < 1 || query.guests > 20) {
      return false
    }
    
    return true
  }

  /**
   * Calculate number of nights between dates
   */
  private static calculateNights(checkIn: string, checkOut: string): number {
    const start = new Date(checkIn)
    const end = new Date(checkOut)
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  }

  /**
   * Placeholder methods for additional OTAs (to be implemented)
   */
  private static async searchAgoda(query: RealTimeHotelQuery): Promise<BookingHotelResult[]> {
    // TODO: Implement Agoda API integration
    console.log('Agoda search not implemented yet')
    return []
  }

  private static async searchExpedia(query: RealTimeHotelQuery): Promise<BookingHotelResult[]> {
    // TODO: Implement Expedia API integration  
    console.log('Expedia search not implemented yet')
    return []
  }
}