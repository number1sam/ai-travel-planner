import axios from 'axios'
import { HotelResult, HotelSearchParams } from '@/services/HotelBot'

export class AmadeusAPI {
  private static readonly CLIENT_ID = process.env.AMADEUS_CLIENT_ID
  private static readonly CLIENT_SECRET = process.env.AMADEUS_CLIENT_SECRET
  private static readonly BASE_URL = 'https://api.amadeus.com/v1'
  private static accessToken: string | null = null
  private static tokenExpiry: number = 0

  static async searchHotels(params: HotelSearchParams): Promise<HotelResult[]> {
    if (!this.CLIENT_ID || !this.CLIENT_SECRET) {
      console.warn('AmadeusAPI: No credentials found, using fallback data')
      return []
    }

    try {
      // Get access token
      await this.authenticate()

      // Search hotels by city
      const hotels = await this.searchHotelsByCity(params)
      
      // Get detailed offers for top hotels
      const hotelOffers = await this.getHotelOffers(hotels.slice(0, 10), params)
      
      return this.transformResults(hotelOffers, params)
    } catch (error) {
      console.error('AmadeusAPI: Error searching hotels:', error)
      return []
    }
  }

  private static async authenticate(): Promise<void> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return
    }

    try {
      const response = await axios.post(
        'https://api.amadeus.com/v1/security/oauth2/token',
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.CLIENT_ID!,
          client_secret: this.CLIENT_SECRET!
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      )

      this.accessToken = response.data.access_token
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000 // Refresh 1 min early
    } catch (error) {
      console.error('AmadeusAPI: Authentication failed:', error)
      throw error
    }
  }

  private static async searchHotelsByCity(params: HotelSearchParams): Promise<any[]> {
    try {
      // First, get city coordinates
      const cityCode = await this.getCityCode(params.destination)
      if (!cityCode) return []

      const response = await axios.get(
        'https://api.amadeus.com/v1/reference-data/locations/hotels/by-city',
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`
          },
          params: {
            cityCode: cityCode,
            radius: 10,
            radiusUnit: 'KM',
            hotelSource: 'ALL'
          }
        }
      )

      return response.data?.data || []
    } catch (error) {
      console.error('AmadeusAPI: Error searching hotels by city:', error)
      return []
    }
  }

  private static async getCityCode(destination: string): Promise<string | null> {
    try {
      const response = await axios.get(
        'https://api.amadeus.com/v1/reference-data/locations',
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`
          },
          params: {
            keyword: destination,
            subType: 'CITY'
          }
        }
      )

      if (response.data?.data?.length > 0) {
        return response.data.data[0].iataCode
      }
      return null
    } catch (error) {
      console.error('AmadeusAPI: Error getting city code:', error)
      return null
    }
  }

  private static async getHotelOffers(hotels: any[], params: HotelSearchParams): Promise<any[]> {
    if (hotels.length === 0) return []

    try {
      const hotelIds = hotels.map(h => h.hotelId).join(',')
      
      const response = await axios.get(
        'https://api.amadeus.com/v3/shopping/hotel-offers',
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`
          },
          params: {
            hotelIds: hotelIds,
            checkInDate: params.checkInDate,
            checkOutDate: params.checkOutDate,
            adults: params.guests,
            currency: 'GBP',
            bestRateOnly: true
          }
        }
      )

      return response.data?.data || []
    } catch (error) {
      console.error('AmadeusAPI: Error getting hotel offers:', error)
      return []
    }
  }

  private static transformResults(offers: any[], params: HotelSearchParams): HotelResult[] {
    return offers.map(offer => {
      const hotel = offer.hotel
      const firstOffer = offer.offers?.[0]
      
      return {
        id: `amadeus_${hotel.hotelId}`,
        name: hotel.name || 'Unknown Hotel',
        starRating: parseInt(hotel.rating || '3'),
        address: this.formatAddress(hotel.address),
        coordinates: {
          lat: parseFloat(hotel.latitude || 0),
          lng: parseFloat(hotel.longitude || 0)
        },
        images: hotel.media?.[0]?.uri ? [hotel.media[0].uri] : [],
        amenities: hotel.amenities || ['WiFi'],
        rooms: firstOffer ? [{
          type: firstOffer.room?.typeEstimated?.bedType || 'Standard Room',
          description: firstOffer.room?.description?.text || 'Comfortable accommodation',
          price: {
            amount: parseFloat(firstOffer.price?.total || '100'),
            currency: firstOffer.price?.currency || 'GBP',
            perNight: false // Amadeus returns total price
          },
          available: firstOffer.available || 1
        }] : [{
          type: 'Standard Room',
          description: 'Comfortable accommodation',
          price: {
            amount: 100,
            currency: 'GBP',
            perNight: true
          },
          available: 1
        }],
        location: {
          type: this.determineLocationType(hotel),
          walkingDistanceToCenter: hotel.distance?.value 
            ? `${hotel.distance.value} ${hotel.distance.unit.toLowerCase()}`
            : 'Unknown',
          nearbyAttractions: []
        },
        accessibility: {
          wheelchairAccessible: false,
          features: []
        },
        reviews: {
          overall: 8.0,
          cleanliness: 8.0,
          location: 8.0,
          service: 8.0,
          value: 8.0,
          count: 100
        },
        cancellationPolicy: firstOffer?.policies?.cancellation?.description?.text || 'Standard policy',
        score: 0,
        chainCode: hotel.chainCode
      }
    })
  }

  private static formatAddress(address: any): string {
    if (!address) return 'Address not available'
    
    const parts = []
    if (address.lines) parts.push(...address.lines)
    if (address.cityName) parts.push(address.cityName)
    if (address.stateCode) parts.push(address.stateCode)
    if (address.postalCode) parts.push(address.postalCode)
    if (address.countryCode) parts.push(address.countryCode)
    
    return parts.filter(Boolean).join(', ')
  }

  private static determineLocationType(hotel: any): string {
    if (!hotel.distance?.value) return 'unknown'
    
    const distance = parseFloat(hotel.distance.value)
    const unit = hotel.distance.unit
    
    const distanceInKm = unit === 'MI' ? distance * 1.60934 : distance
    
    if (distanceInKm < 1) return 'city_center'
    if (distanceInKm < 3) return 'close_to_center'
    if (distanceInKm < 5) return 'suburban'
    return 'outskirts'
  }
}