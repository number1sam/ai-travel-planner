import { BookingHotelResult, RealTimeHotelQuery } from './RealTimeHotelService'

export interface StoredHotelSelection {
  id: string
  userId: string
  tripId?: string
  timestamp: Date
  query: RealTimeHotelQuery
  selectedHotel: BookingHotelResult
  alternatives: BookingHotelResult[]
  selectionReason: string
  locked: boolean // Prevent LLM from modifying
}

export interface HotelSelectionCriteria {
  prioritizePrice: boolean
  prioritizeReviews: boolean
  prioritizeLocation: boolean  
  prioritizeAmenities: boolean
  mustHaveAmenities: string[]
  avoidProperties: string[]
  preferredChains: string[]
}

export class HotelDataManager {
  private static selections = new Map<string, StoredHotelSelection>()
  
  /**
   * CRITICAL: Select and lock hotel data to prevent LLM interference
   */
  static async selectAndLockHotel(
    userId: string,
    query: RealTimeHotelQuery,
    criteria: HotelSelectionCriteria,
    tripId?: string
  ): Promise<StoredHotelSelection> {
    
    console.log('🔒 Starting hotel selection and locking process')
    console.log('Query:', query)
    console.log('Criteria:', criteria)
    
    // Import and use real-time hotel service
    const { RealTimeHotelService } = await import('./RealTimeHotelService')
    
    // Get real-time hotel data
    const availableHotels = await RealTimeHotelService.searchRealTimeHotels(query)
    
    if (availableHotels.length === 0) {
      throw new Error(`No hotels found for ${query.location} on ${query.checkIn} to ${query.checkOut}`)
    }
    
    // Apply user-specific selection criteria
    const scoredHotels = this.applyCriteria(availableHotels, criteria)
    
    // Select the best hotel
    const selectedHotel = scoredHotels[0]
    const alternatives = scoredHotels.slice(1, 4) // Keep top 3 alternatives
    
    // Generate selection reasoning
    const selectionReason = this.generateSelectionReason(selectedHotel, query, criteria)
    
    // Create locked hotel selection
    const selection: StoredHotelSelection = {
      id: `hotel_selection_${Date.now()}_${userId}`,
      userId,
      tripId,
      timestamp: new Date(),
      query,
      selectedHotel,
      alternatives,
      selectionReason,
      locked: true // CRITICAL: Prevents LLM from modifying
    }
    
    // Store in memory (in production, this would be in database/Redis)
    this.selections.set(selection.id, selection)
    
    console.log('✅ Hotel selected and locked:', selectedHotel.name)
    console.log('📊 Selection reason:', selectionReason)
    
    return selection
  }
  
  /**
   * Get locked hotel selection (read-only)
   */
  static getLockedHotelSelection(selectionId: string): StoredHotelSelection | null {
    return this.selections.get(selectionId) || null
  }
  
  /**
   * Get all selections for a user
   */
  static getUserHotelSelections(userId: string): StoredHotelSelection[] {
    return Array.from(this.selections.values())
      .filter(selection => selection.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }
  
  /**
   * SECURITY: Validate that hotel data hasn't been tampered with
   */
  static validateHotelData(selection: StoredHotelSelection): boolean {
    if (!selection.locked) {
      console.error('❌ Hotel selection is not locked - potential tampering')
      return false
    }
    
    // Validate required fields exist
    const required = ['name', 'address', 'pricePerNight', 'totalPrice', 'deepBookingLink']
    for (const field of required) {
      if (!selection.selectedHotel[field as keyof BookingHotelResult]) {
        console.error(`❌ Missing required field: ${field}`)
        return false
      }
    }
    
    // Validate booking link format
    const bookingLink = selection.selectedHotel.deepBookingLink
    if (!bookingLink.includes(selection.query.checkIn) || !bookingLink.includes(selection.query.checkOut)) {
      console.error('❌ Booking link does not match query dates')
      return false
    }
    
    console.log('✅ Hotel data validation passed')
    return true
  }
  
  /**
   * Apply user selection criteria to rank hotels
   */
  private static applyCriteria(
    hotels: BookingHotelResult[], 
    criteria: HotelSelectionCriteria
  ): BookingHotelResult[] {
    
    return hotels.map(hotel => {
      let score = (hotel as any).score || 100
      
      // Apply weight preferences
      if (criteria.prioritizePrice) {
        // Lower price gets higher score
        const avgPrice = hotels.reduce((sum, h) => sum + h.pricePerNight, 0) / hotels.length
        if (hotel.pricePerNight < avgPrice) score += 25
      }
      
      if (criteria.prioritizeReviews) {
        score += (hotel.reviewScore / 10) * 30 // Heavy weight on reviews
      }
      
      if (criteria.prioritizeAmenities) {
        score += hotel.amenities.length * 5
      }
      
      // Must-have amenities
      if (criteria.mustHaveAmenities.length > 0) {
        const hasRequired = criteria.mustHaveAmenities.every(amenity => 
          hotel.amenities.some(ha => ha.toLowerCase().includes(amenity.toLowerCase()))
        )
        if (!hasRequired) score -= 100 // Eliminate if missing required amenities
      }
      
      // Avoid certain properties
      if (criteria.avoidProperties.length > 0) {
        const shouldAvoid = criteria.avoidProperties.some(avoid =>
          hotel.name.toLowerCase().includes(avoid.toLowerCase())
        )
        if (shouldAvoid) score -= 200
      }
      
      // Preferred chains bonus
      if (criteria.preferredChains.length > 0) {
        const isPreferred = criteria.preferredChains.some(chain =>
          hotel.name.toLowerCase().includes(chain.toLowerCase())
        )
        if (isPreferred) score += 30
      }
      
      return { ...hotel, finalScore: Math.round(score) }
    }).sort((a, b) => (b as any).finalScore - (a as any).finalScore)
  }
  
  /**
   * Generate human-readable explanation for hotel selection
   */
  private static generateSelectionReason(
    hotel: BookingHotelResult,
    query: RealTimeHotelQuery,
    criteria: HotelSelectionCriteria
  ): string {
    const reasons = []
    
    // Price reasoning
    if (query.budget && hotel.totalPrice <= query.budget.max) {
      const budgetUsed = (hotel.totalPrice / query.budget.max) * 100
      reasons.push(`fits within budget (using ${budgetUsed.toFixed(1)}% of maximum)`)
    }
    
    // Review reasoning
    if (hotel.reviewScore >= 8.5) {
      reasons.push(`excellent reviews (${hotel.reviewScore}/10 from ${hotel.reviewCount} guests)`)
    } else if (hotel.reviewScore >= 7.5) {
      reasons.push(`good reviews (${hotel.reviewScore}/10)`)
    }
    
    // Star rating
    if (hotel.starRating >= 4) {
      reasons.push(`${hotel.starRating}-star quality property`)
    }
    
    // Amenities
    if (hotel.amenities.length >= 5) {
      reasons.push(`comprehensive amenities (${hotel.amenities.slice(0, 3).join(', ')})`)
    }
    
    // Availability
    if (hotel.availability.roomsLeft <= 5) {
      reasons.push(`limited availability (${hotel.availability.roomsLeft} rooms left)`)
    }
    
    return reasons.length > 0 
      ? `Selected because it ${reasons.join(', ')}.`
      : 'Selected as the best available option matching your criteria.'
  }
  
  /**
   * Format hotel data for LLM consumption (read-only)
   */
  static formatHotelForLLM(selection: StoredHotelSelection): string {
    if (!this.validateHotelData(selection)) {
      throw new Error('Hotel data validation failed - cannot provide to LLM')
    }
    
    const hotel = selection.selectedHotel
    const query = selection.query
    
    return `LOCKED_HOTEL_DATA: {
  "name": "${hotel.name}",
  "address": "${hotel.address}",
  "starRating": ${hotel.starRating},
  "reviewScore": ${hotel.reviewScore},
  "reviewCount": ${hotel.reviewCount},
  "pricePerNight": ${hotel.pricePerNight},
  "totalPrice": ${hotel.totalPrice},
  "currency": "${hotel.currency}",
  "checkIn": "${query.checkIn}",
  "checkOut": "${query.checkOut}",
  "guests": ${query.guests},
  "amenities": ${JSON.stringify(hotel.amenities)},
  "cancellationPolicy": "${hotel.cancellationPolicy}",
  "bookingLink": "${hotel.deepBookingLink}",
  "selectionReason": "${selection.selectionReason}"
}

INSTRUCTIONS: Use this exact hotel data. DO NOT modify the name, price, or any details. DO NOT invent alternative hotels. Present this hotel information naturally in your response and include the booking link as a clickable element.`
  }
  
  /**
   * Clean up old selections (garbage collection)
   */
  static cleanupOldSelections(maxAgeHours: number = 24): void {
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000)
    
    for (const [id, selection] of this.selections.entries()) {
      if (selection.timestamp < cutoffTime) {
        this.selections.delete(id)
      }
    }
  }
}