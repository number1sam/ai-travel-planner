// Multi-City Accommodation Distribution System
// Intelligently distributes hotel bookings across multiple destinations

export interface CityAccommodation {
  city: string
  nights: number
  checkIn: string
  checkOut: string
  priority: 'primary' | 'secondary' | 'optional'
  budget: {
    total: number
    perNight: number
  }
  hotelType: 'budget' | 'mid-range' | 'luxury' | 'boutique' | 'mixed'
  location: 'city-center' | 'transport-hub' | 'tourist-district' | 'local-neighborhood'
  requirements: {
    walkability: number // 1-10 score
    transportAccess: boolean
    business: boolean // Business traveler needs
    leisure: boolean // Tourist attractions nearby
  }
  rationale: string
}

export interface MultiCityAccommodationPlan {
  cities: CityAccommodation[]
  totalBudget: number
  totalNights: number
  bookingStrategy: {
    approach: 'book-together' | 'book-separately' | 'mixed'
    timing: string
    tips: string[]
  }
  budgetBreakdown: {
    accommodation: number
    taxes: number
    contingency: number
  }
  alternatives: Array<{
    scenario: string
    savings: number
    tradeoffs: string[]
  }>
}

export interface AccommodationPreferences {
  budget: number
  style: 'budget' | 'mid-range' | 'luxury' | 'mixed'
  priorities: Array<'location' | 'price' | 'amenities' | 'reviews' | 'uniqueness'>
  groupSize: number
  travelerType: 'business' | 'leisure' | 'backpacker' | 'family' | 'couple'
  accessibility?: boolean
  pets?: boolean
}

class AccommodationDistributor {
  private cityData = new Map<string, any>()

  constructor() {
    this.initializeCityData()
  }

  private initializeCityData() {
    // Dublin
    this.setCityData('Dublin', {
      avgNightlyRates: {
        budget: 80,
        midRange: 140,
        luxury: 280
      },
      seasonality: {
        peak: ['Jun', 'Jul', 'Aug', 'Dec'],
        shoulder: ['Apr', 'May', 'Sep', 'Oct'],
        low: ['Jan', 'Feb', 'Mar', 'Nov']
      },
      districts: {
        'city-center': {multiplier: 1.3, walkability: 9, attractions: 'Temple Bar, Trinity College'},
        'transport-hub': {multiplier: 0.9, walkability: 7, attractions: 'Near airport/stations'},
        'tourist-district': {multiplier: 1.1, walkability: 8, attractions: 'Grafton Street area'},
        'local-neighborhood': {multiplier: 0.8, walkability: 6, attractions: 'Authentic local experience'}
      },
      optimalStay: {min: 2, max: 4},
      taxes: 0.12, // 12% typical hotel taxes/fees
      bookingLead: '2-6 weeks'
    })

    // Cork
    this.setCityData('Cork', {
      avgNightlyRates: {
        budget: 60,
        midRange: 110,
        luxury: 220
      },
      seasonality: {
        peak: ['Jul', 'Aug', 'Dec'],
        shoulder: ['May', 'Jun', 'Sep', 'Oct'],
        low: ['Jan', 'Feb', 'Mar', 'Apr', 'Nov']
      },
      districts: {
        'city-center': {multiplier: 1.2, walkability: 8, attractions: 'English Market, St. Finbarre\'s'},
        'transport-hub': {multiplier: 0.85, walkability: 6, attractions: 'Near train station'},
        'tourist-district': {multiplier: 1.0, walkability: 7, attractions: 'Main shopping area'},
        'local-neighborhood': {multiplier: 0.75, walkability: 5, attractions: 'Residential areas'}
      },
      optimalStay: {min: 2, max: 3},
      taxes: 0.10,
      bookingLead: '2-4 weeks'
    })

    // London
    this.setCityData('London', {
      avgNightlyRates: {
        budget: 120,
        midRange: 200,
        luxury: 400
      },
      seasonality: {
        peak: ['Jun', 'Jul', 'Aug', 'Dec'],
        shoulder: ['Apr', 'May', 'Sep', 'Oct'],
        low: ['Jan', 'Feb', 'Mar', 'Nov']
      },
      districts: {
        'city-center': {multiplier: 1.5, walkability: 9, attractions: 'West End, Covent Garden'},
        'transport-hub': {multiplier: 1.0, walkability: 8, attractions: 'King\'s Cross, Victoria'},
        'tourist-district': {multiplier: 1.3, walkability: 8, attractions: 'South Bank, Tower Bridge'},
        'local-neighborhood': {multiplier: 0.7, walkability: 6, attractions: 'Residential zones'}
      },
      optimalStay: {min: 3, max: 5},
      taxes: 0.15,
      bookingLead: '3-8 weeks'
    })

    // Paris  
    this.setCityData('Paris', {
      avgNightlyRates: {
        budget: 100,
        midRange: 180,
        luxury: 350
      },
      seasonality: {
        peak: ['Jun', 'Jul', 'Aug', 'Dec'],
        shoulder: ['Apr', 'May', 'Sep', 'Oct'],
        low: ['Jan', 'Feb', 'Mar', 'Nov']
      },
      districts: {
        'city-center': {multiplier: 1.4, walkability: 9, attractions: 'Louvre, Champs-Élysées'},
        'transport-hub': {multiplier: 0.9, walkability: 7, attractions: 'Near Gare du Nord'},
        'tourist-district': {multiplier: 1.2, walkability: 8, attractions: 'Marais, Latin Quarter'},
        'local-neighborhood': {multiplier: 0.8, walkability: 6, attractions: 'Montmartre, Belleville'}
      },
      optimalStay: {min: 3, max: 5},
      taxes: 0.18,
      bookingLead: '4-8 weeks'
    })

    // Tokyo
    this.setCityData('Tokyo', {
      avgNightlyRates: {
        budget: 90,
        midRange: 160,
        luxury: 320
      },
      seasonality: {
        peak: ['Mar', 'Apr', 'Oct', 'Nov'],
        shoulder: ['May', 'Jun', 'Sep', 'Dec'],
        low: ['Jan', 'Feb', 'Jul', 'Aug']
      },
      districts: {
        'city-center': {multiplier: 1.3, walkability: 9, attractions: 'Shibuya, Ginza'},
        'transport-hub': {multiplier: 1.0, walkability: 8, attractions: 'Shinjuku Station area'},
        'tourist-district': {multiplier: 1.1, walkability: 7, attractions: 'Asakusa, Harajuku'},
        'local-neighborhood': {multiplier: 0.8, walkability: 6, attractions: 'Residential Tokyo'}
      },
      optimalStay: {min: 3, max: 5},
      taxes: 0.08,
      bookingLead: '3-6 weeks'
    })

    // Bangkok
    this.setCityData('Bangkok', {
      avgNightlyRates: {
        budget: 25,
        midRange: 60,
        luxury: 150
      },
      seasonality: {
        peak: ['Nov', 'Dec', 'Jan', 'Feb'],
        shoulder: ['Mar', 'Apr', 'Oct'],
        low: ['May', 'Jun', 'Jul', 'Aug', 'Sep']
      },
      districts: {
        'city-center': {multiplier: 1.2, walkability: 6, attractions: 'Siam, Sukhumvit'},
        'transport-hub': {multiplier: 0.9, walkability: 7, attractions: 'Near BTS/MRT stations'},
        'tourist-district': {multiplier: 1.0, walkability: 5, attractions: 'Khao San Road area'},
        'local-neighborhood': {multiplier: 0.7, walkability: 4, attractions: 'Local markets, authentic'}
      },
      optimalStay: {min: 3, max: 4},
      taxes: 0.10,
      bookingLead: '2-4 weeks'
    })
  }

  private setCityData(city: string, data: any) {
    this.cityData.set(city.toLowerCase(), data)
  }

  private getCityData(city: string): any {
    return this.cityData.get(city.toLowerCase()) || {
      avgNightlyRates: {budget: 60, midRange: 120, luxury: 250},
      seasonality: {peak: [], shoulder: [], low: []},
      districts: {
        'city-center': {multiplier: 1.2, walkability: 7, attractions: 'Central area'},
        'transport-hub': {multiplier: 0.9, walkability: 6, attractions: 'Transport links'},
        'tourist-district': {multiplier: 1.0, walkability: 7, attractions: 'Main attractions'},
        'local-neighborhood': {multiplier: 0.8, walkability: 5, attractions: 'Local experience'}
      },
      optimalStay: {min: 2, max: 3},
      taxes: 0.12,
      bookingLead: '2-4 weeks'
    }
  }

  public distributeAccommodations(
    cities: Array<{name: string, nights: number, arrivalDay: number}>,
    totalBudget: number,
    preferences: AccommodationPreferences,
    travelDates: {start: string, end: string}
  ): MultiCityAccommodationPlan {
    console.log(`🏨 Distributing accommodations across ${cities.length} cities with $${totalBudget} budget`)

    // Calculate budget allocation
    const budgetAllocation = this.calculateBudgetAllocation(cities, totalBudget, preferences)
    
    // Create accommodation plan for each city
    const cityAccommodations: CityAccommodation[] = cities.map((cityInfo, index) => {
      return this.planCityAccommodation(
        cityInfo.name,
        cityInfo.nights,
        budgetAllocation[index],
        preferences,
        this.calculateCityDates(cityInfo.arrivalDay, cityInfo.nights, travelDates.start),
        index === 0 ? 'primary' : (index === 1 ? 'secondary' : 'optional')
      )
    })

    // Generate booking strategy
    const bookingStrategy = this.generateBookingStrategy(cityAccommodations, preferences)

    // Calculate totals
    const totalNights = cityAccommodations.reduce((sum, city) => sum + city.nights, 0)
    const actualTotalBudget = cityAccommodations.reduce((sum, city) => sum + city.budget.total, 0)

    // Generate alternatives
    const alternatives = this.generateAlternatives(cityAccommodations, preferences)

    return {
      cities: cityAccommodations,
      totalBudget: actualTotalBudget,
      totalNights,
      bookingStrategy,
      budgetBreakdown: {
        accommodation: actualTotalBudget * 0.87,
        taxes: actualTotalBudget * 0.13,
        contingency: totalBudget * 0.05
      },
      alternatives
    }
  }

  private calculateBudgetAllocation(
    cities: Array<{name: string, nights: number}>,
    totalBudget: number,
    preferences: AccommodationPreferences
  ): number[] {
    const totalNights = cities.reduce((sum, city) => sum + city.nights, 0)
    const baseAllocation = cities.map(city => (city.nights / totalNights) * totalBudget)
    
    // Adjust based on city cost differences
    const adjustedAllocation = baseAllocation.map((budget, index) => {
      const city = cities[index]
      const cityData = this.getCityData(city.name)
      
      // Get base rate for the preferred style
      const styleKey = preferences.style === 'mid-range' ? 'midRange' : preferences.style
      const baseRate = cityData.avgNightlyRates[styleKey] || cityData.avgNightlyRates.midRange
      
      // Calculate what this city needs based on local rates
      const estimatedCost = baseRate * city.nights * 1.15 // Include taxes/fees
      
      return estimatedCost
    })

    // Scale to fit total budget while maintaining proportions
    const totalEstimated = adjustedAllocation.reduce((sum, cost) => sum + cost, 0)
    const scaleFactor = (totalBudget * 0.95) / totalEstimated // 5% buffer
    
    return adjustedAllocation.map(cost => cost * scaleFactor)
  }

  private planCityAccommodation(
    cityName: string,
    nights: number,
    budget: number,
    preferences: AccommodationPreferences,
    dates: {checkIn: string, checkOut: string},
    priority: 'primary' | 'secondary' | 'optional'
  ): CityAccommodation {
    const cityData = this.getCityData(cityName)
    const perNightBudget = budget / nights
    
    // Determine optimal location based on preferences and trip priority
    let location: 'city-center' | 'transport-hub' | 'tourist-district' | 'local-neighborhood'
    
    if (preferences.priorities.includes('location') && priority === 'primary') {
      location = 'city-center'
    } else if (preferences.travelerType === 'business') {
      location = 'transport-hub' 
    } else if (preferences.travelerType === 'backpacker' || preferences.priorities.includes('price')) {
      location = 'local-neighborhood'
    } else {
      location = 'tourist-district'
    }

    // Determine hotel type based on budget and preferences
    let hotelType: 'budget' | 'mid-range' | 'luxury' | 'boutique' | 'mixed'
    const locationData = cityData.districts[location]
    const adjustedRate = cityData.avgNightlyRates.midRange * locationData.multiplier

    if (perNightBudget < adjustedRate * 0.7) {
      hotelType = 'budget'
    } else if (perNightBudget > adjustedRate * 1.5) {
      hotelType = 'luxury'
    } else if (preferences.style === 'boutique' || preferences.priorities.includes('uniqueness')) {
      hotelType = 'boutique'
    } else {
      hotelType = 'mid-range'
    }

    // Generate rationale
    const rationale = this.generateAccommodationRationale(
      cityName, nights, priority, location, hotelType, preferences
    )

    return {
      city: cityName,
      nights,
      checkIn: dates.checkIn,
      checkOut: dates.checkOut,
      priority,
      budget: {
        total: budget,
        perNight: perNightBudget
      },
      hotelType,
      location,
      requirements: {
        walkability: locationData.walkability,
        transportAccess: location === 'transport-hub' || preferences.travelerType === 'business',
        business: preferences.travelerType === 'business',
        leisure: preferences.travelerType === 'leisure' || preferences.travelerType === 'family'
      },
      rationale
    }
  }

  private calculateCityDates(arrivalDay: number, nights: number, tripStart: string): {checkIn: string, checkOut: string} {
    const startDate = new Date(tripStart)
    const checkInDate = new Date(startDate)
    checkInDate.setDate(startDate.getDate() + arrivalDay - 1)
    
    const checkOutDate = new Date(checkInDate)
    checkOutDate.setDate(checkInDate.getDate() + nights)

    return {
      checkIn: checkInDate.toISOString().split('T')[0],
      checkOut: checkOutDate.toISOString().split('T')[0]
    }
  }

  private generateAccommodationRationale(
    city: string,
    nights: number,
    priority: string,
    location: string,
    hotelType: string,
    preferences: AccommodationPreferences
  ): string {
    let rationale = ''

    // Base rationale on priority and nights
    if (priority === 'primary') {
      rationale += `${nights}-night stay in ${city} (primary destination)`
    } else {
      rationale += `${nights}-night stopover in ${city}`
    }

    // Add location reasoning
    switch (location) {
      case 'city-center':
        rationale += ` - staying centrally for walkable access to major attractions`
        break
      case 'transport-hub':
        rationale += ` - near transport links for easy connections`
        break
      case 'tourist-district':
        rationale += ` - in tourist area for attractions and dining`
        break
      case 'local-neighborhood':
        rationale += ` - local area for authentic experience and value`
        break
    }

    // Add hotel type reasoning  
    if (hotelType === 'luxury') {
      rationale += `. Luxury accommodation for special experience`
    } else if (hotelType === 'budget') {
      rationale += `. Budget-friendly option to maximize value`
    } else if (hotelType === 'boutique') {
      rationale += `. Boutique property for unique character`
    }

    return rationale
  }

  private generateBookingStrategy(
    accommodations: CityAccommodation[],
    preferences: AccommodationPreferences
  ): {approach: string, timing: string, tips: string[]} {
    const totalCities = accommodations.length
    const hasLuxury = accommodations.some(acc => acc.hotelType === 'luxury')
    const hasPrimary = accommodations.some(acc => acc.priority === 'primary')

    let approach: 'book-together' | 'book-separately' | 'mixed'
    let timing: string
    const tips: string[] = []

    // Determine booking approach
    if (totalCities <= 2) {
      approach = 'book-together'
      timing = 'Book all accommodations at the same time for consistency'
    } else if (hasLuxury || hasPrimary) {
      approach = 'mixed'
      timing = 'Book priority destinations first, then secondary cities'
    } else {
      approach = 'book-separately'
      timing = 'Book each city individually for maximum flexibility'
    }

    // Generate booking tips
    tips.push('🔍 Use comparison sites like Booking.com, Hotels.com, and Expedia')
    tips.push('📱 Check hotel websites directly for best rates and perks')
    
    if (preferences.style === 'luxury') {
      tips.push('💎 Book luxury hotels 6-8 weeks ahead for best availability')
      tips.push('📧 Contact hotels directly for possible upgrades')
    } else if (preferences.style === 'budget') {
      tips.push('💰 Consider hostels, guesthouses, and budget hotel chains')
      tips.push('📍 Check locations carefully - cheaper may mean less convenient')
    }

    if (totalCities >= 3) {
      tips.push('📅 Book accommodations in travel order to maintain timeline')
      tips.push('🎒 Consider luggage storage/forwarding services between cities')
    }

    // Seasonal considerations
    const peakSeasonCities = accommodations.filter(acc => {
      const cityData = this.getCityData(acc.city)
      const month = new Date(acc.checkIn).toLocaleString('default', {month: 'short'})
      return cityData.seasonality.peak.includes(month)
    })

    if (peakSeasonCities.length > 0) {
      tips.push('⚠️ Peak season travel - book early for better rates and availability')
    }

    return {approach, timing, tips}
  }

  private generateAlternatives(
    accommodations: CityAccommodation[],
    preferences: AccommodationPreferences
  ): Array<{scenario: string, savings: number, tradeoffs: string[]}> {
    const alternatives: Array<{scenario: string, savings: number, tradeoffs: string[]}> = []
    const totalCost = accommodations.reduce((sum, acc) => sum + acc.budget.total, 0)

    // Budget optimization alternative
    const budgetSavings = totalCost * 0.30
    alternatives.push({
      scenario: 'Budget Optimization',
      savings: budgetSavings,
      tradeoffs: [
        'Stay in local neighborhoods vs city centers',
        'Choose budget hotels/hostels over mid-range',
        'Less walkable locations requiring more transport'
      ]
    })

    // Location optimization alternative  
    if (accommodations.some(acc => acc.location !== 'transport-hub')) {
      alternatives.push({
        scenario: 'Transport Hub Focus',
        savings: totalCost * 0.15,
        tradeoffs: [
          'Stay near stations/airports for easy connections',
          'May miss central city atmosphere',
          'Extra transport to main attractions'
        ]
      })
    }

    // Luxury upgrade alternative
    if (preferences.style !== 'luxury') {
      alternatives.push({
        scenario: 'Luxury Upgrade',
        savings: -totalCost * 0.50, // Cost increase
        tradeoffs: [
          'Premium locations and amenities',
          'Higher nightly rates',
          'Enhanced experience and comfort'
        ]
      })
    }

    return alternatives
  }

  public optimizeBudgetDistribution(
    accommodations: CityAccommodation[],
    newBudget: number
  ): CityAccommodation[] {
    // Redistribute budget proportionally while maintaining priorities
    const totalCurrentBudget = accommodations.reduce((sum, acc) => sum + acc.budget.total, 0)
    const scaleFactor = newBudget / totalCurrentBudget

    return accommodations.map(acc => ({
      ...acc,
      budget: {
        total: acc.budget.total * scaleFactor,
        perNight: acc.budget.perNight * scaleFactor
      }
    }))
  }
}

// Singleton instance
export const accommodationDistributor = new AccommodationDistributor()
export default AccommodationDistributor