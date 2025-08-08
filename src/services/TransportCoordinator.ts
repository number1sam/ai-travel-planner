// Transport Coordination System
// Handles complex multi-city transport planning with real-world constraints

export interface TransportLeg {
  from: string
  to: string
  date: string
  method: 'flight' | 'train' | 'bus' | 'car-rental' | 'ferry'
  duration: {
    travel: number // hours
    checkin: number // additional time for checkin/boarding
    total: number
  }
  cost: {
    budget: number
    standard: number
    premium: number
  }
  bookingDetails: {
    providers: string[]
    bookingWindow: string // "Book 2-8 weeks ahead"
    flexibility: 'fixed' | 'flexible' | 'open'
    luggage: string
  }
  alternatives: Array<{
    method: 'flight' | 'train' | 'bus' | 'car-rental' | 'ferry'
    pros: string[]
    cons: string[]
    costDiff: number
  }>
  scenic: boolean
  reliability: number // 0-100 score
}

export interface TransportPlan {
  legs: TransportLeg[]
  totalCost: {
    budget: number
    standard: number  
    premium: number
  }
  totalTravelTime: number // hours
  bookingStrategy: string
  tips: string[]
  passes: Array<{ // Rail passes, multi-country tickets
    name: string
    coverage: string[]
    cost: number
    savings: number
    recommended: boolean
  }>
}

export interface BookingTimeline {
  urgency: 'book-now' | 'book-soon' | 'monitor-prices' | 'last-minute'
  timeline: Array<{
    weeks: number
    action: string
    reason: string
  }>
}

class TransportCoordinator {
  private transportRules = new Map<string, any>()

  constructor() {
    this.initializeTransportRules()
  }

  private initializeTransportRules() {
    // Europe transport rules
    this.addRoute('Dublin', 'Cork', {
      primary: {method: 'train', duration: 2.5, cost: {budget: 25, standard: 35, premium: 60}},
      alternatives: [
        {method: 'bus', duration: 3, cost: {budget: 15, standard: 20, premium: 30}},
        {method: 'car-rental', duration: 2.5, cost: {budget: 45, standard: 65, premium: 90}}
      ],
      scenic: true,
      reliability: 92
    })

    this.addRoute('Dublin', 'Galway', {
      primary: {method: 'bus', duration: 2.5, cost: {budget: 20, standard: 25, premium: 35}},
      alternatives: [
        {method: 'train', duration: 2.5, cost: {budget: 30, standard: 40, premium: 65}},
        {method: 'car-rental', duration: 2, cost: {budget: 40, standard: 60, premium: 85}}
      ],
      scenic: true,
      reliability: 88
    })

    this.addRoute('London', 'Paris', {
      primary: {method: 'train', duration: 2.5, cost: {budget: 85, standard: 120, premium: 200}},
      alternatives: [
        {method: 'flight', duration: 1.5, cost: {budget: 60, standard: 150, premium: 400}},
        {method: 'ferry', duration: 8, cost: {budget: 35, standard: 60, premium: 120}}
      ],
      scenic: false,
      reliability: 95,
      notes: 'Eurostar is most convenient city-center to city-center'
    })

    this.addRoute('Paris', 'Rome', {
      primary: {method: 'flight', duration: 2.5, cost: {budget: 80, standard: 180, premium: 450}},
      alternatives: [
        {method: 'train', duration: 11, cost: {budget: 120, standard: 200, premium: 350}},
      ],
      scenic: false,
      reliability: 90
    })

    // Asian routes  
    this.addRoute('Tokyo', 'Kyoto', {
      primary: {method: 'train', duration: 3, cost: {budget: 120, standard: 120, premium: 180}},
      alternatives: [
        {method: 'flight', duration: 1.5, cost: {budget: 150, standard: 250, premium: 400}}
      ],
      scenic: true,
      reliability: 98,
      notes: 'Shinkansen bullet train - iconic experience'
    })

    this.addRoute('Bangkok', 'Chiang Mai', {
      primary: {method: 'flight', duration: 1.5, cost: {budget: 50, standard: 80, premium: 150}},
      alternatives: [
        {method: 'train', duration: 12, cost: {budget: 25, standard: 45, premium: 80}},
        {method: 'bus', duration: 10, cost: {budget: 15, standard: 25, premium: 40}}
      ],
      scenic: true,
      reliability: 85
    })
  }

  private addRoute(from: string, to: string, data: any) {
    const key = `${from.toLowerCase()}-${to.toLowerCase()}`
    const reverseKey = `${to.toLowerCase()}-${from.toLowerCase()}`
    
    this.transportRules.set(key, data)
    this.transportRules.set(reverseKey, {
      ...data,
      // Reverse route might have different characteristics
    })
  }

  private getRouteData(from: string, to: string): any {
    const key = `${from.toLowerCase()}-${to.toLowerCase()}`
    return this.transportRules.get(key)
  }

  public planTransport(
    cities: string[],
    dates: string[],
    preferences: {
      budget: 'budget' | 'standard' | 'premium'
      priority: 'cost' | 'time' | 'comfort' | 'experience'
      flexibility: 'fixed' | 'flexible'
      luggage: 'light' | 'standard' | 'heavy'
    }
  ): TransportPlan {
    console.log(`🚄 Planning transport for ${cities.length} cities`)
    
    const legs: TransportLeg[] = []
    let totalBudgetCost = 0
    let totalStandardCost = 0  
    let totalPremiumCost = 0
    let totalTravelTime = 0

    // Generate transport legs
    for (let i = 0; i < cities.length - 1; i++) {
      const from = cities[i]
      const to = cities[i + 1]
      const date = dates[i] || new Date().toISOString().split('T')[0]

      const leg = this.createTransportLeg(from, to, date, preferences)
      legs.push(leg)

      totalBudgetCost += leg.cost.budget
      totalStandardCost += leg.cost.standard
      totalPremiumCost += leg.cost.premium
      totalTravelTime += leg.duration.total
    }

    // Generate booking strategy
    const bookingStrategy = this.generateBookingStrategy(legs, preferences)

    // Find applicable passes
    const passes = this.findApplicablePasses(cities, {
      budget: totalBudgetCost,
      standard: totalStandardCost,
      premium: totalPremiumCost
    })

    // Generate travel tips
    const tips = this.generateTravelTips(legs, preferences)

    return {
      legs,
      totalCost: {
        budget: totalBudgetCost,
        standard: totalStandardCost,
        premium: totalPremiumCost
      },
      totalTravelTime: Math.round(totalTravelTime * 10) / 10,
      bookingStrategy,
      tips,
      passes
    }
  }

  private createTransportLeg(
    from: string,
    to: string, 
    date: string,
    preferences: any
  ): TransportLeg {
    const routeData = this.getRouteData(from, to)
    
    if (!routeData) {
      // Fallback for unknown routes
      return this.createFallbackTransportLeg(from, to, date, preferences)
    }

    // Select optimal method based on preferences
    let selectedMethod = routeData.primary
    
    if (preferences.priority === 'cost' && routeData.alternatives) {
      const cheapest = [...routeData.alternatives, routeData.primary]
        .sort((a, b) => a.cost[preferences.budget] - b.cost[preferences.budget])[0]
      selectedMethod = cheapest
    }

    const checkinTime = this.getCheckinTime(selectedMethod.method)
    
    return {
      from,
      to,
      date,
      method: selectedMethod.method,
      duration: {
        travel: selectedMethod.duration,
        checkin: checkinTime,
        total: selectedMethod.duration + checkinTime
      },
      cost: selectedMethod.cost,
      bookingDetails: {
        providers: this.getProviders(selectedMethod.method, from, to),
        bookingWindow: this.getBookingWindow(selectedMethod.method),
        flexibility: preferences.flexibility,
        luggage: this.getLuggageInfo(selectedMethod.method, preferences.luggage)
      },
      alternatives: this.createAlternatives(routeData, selectedMethod),
      scenic: routeData.scenic || false,
      reliability: routeData.reliability || 85
    }
  }

  private createFallbackTransportLeg(from: string, to: string, date: string, preferences: any): TransportLeg {
    // Generic fallback for unknown city pairs
    return {
      from,
      to,
      date,
      method: 'flight',
      duration: {
        travel: 2,
        checkin: 2,
        total: 4
      },
      cost: {
        budget: 150,
        standard: 250,
        premium: 400
      },
      bookingDetails: {
        providers: ['Airlines', 'Online Travel Agencies'],
        bookingWindow: 'Book 2-8 weeks ahead',
        flexibility: preferences.flexibility,
        luggage: 'Check airline baggage policies'
      },
      alternatives: [
        {
          method: 'train',
          pros: ['Scenic route', 'City center connections'],
          cons: ['Longer journey time'],
          costDiff: -50
        }
      ],
      scenic: false,
      reliability: 85
    }
  }

  private getCheckinTime(method: string): number {
    switch (method) {
      case 'flight': return 2 // 2 hours for international, 1 for domestic
      case 'train': return 0.5 // 30 min buffer
      case 'bus': return 0.5
      case 'ferry': return 1
      case 'car-rental': return 0.5 // Pickup time
      default: return 0
    }
  }

  private getProviders(method: string, from: string, to: string): string[] {
    switch (method) {
      case 'flight':
        return ['Skyscanner', 'Google Flights', 'Kayak', 'Airlines Direct']
      case 'train':
        if (from.toLowerCase().includes('europe') || to.toLowerCase().includes('europe')) {
          return ['Trainline', 'Omio', 'Rail Europe', 'National Railways']
        }
        return ['National Railways', 'Trainline', 'Omio']
      case 'bus':
        return ['FlixBus', 'Megabus', 'National Bus Lines', 'Omio']
      case 'ferry':
        return ['Ferry Booking Sites', 'Direct Ferry Lines']
      case 'car-rental':
        return ['Rental Cars', 'Europcar', 'Hertz', 'Local Providers']
      default:
        return ['Travel Booking Sites']
    }
  }

  private getBookingWindow(method: string): string {
    switch (method) {
      case 'flight': return 'Book 2-8 weeks ahead for best prices'
      case 'train': return 'Book 1-4 weeks ahead (earlier for high-speed rail)'
      case 'bus': return 'Book 1-2 weeks ahead or same day'
      case 'ferry': return 'Book 2-6 weeks ahead in peak season'
      case 'car-rental': return 'Book 1-4 weeks ahead for better rates'
      default: return 'Book 1-2 weeks ahead'
    }
  }

  private getLuggageInfo(method: string, luggageLevel: string): string {
    const baseInfo = {
      'flight': 'Check airline policies - fees may apply',
      'train': 'Generally generous luggage allowances',
      'bus': 'Limited luggage space - pack light',
      'ferry': 'Usually generous allowances',
      'car-rental': 'Unlimited luggage space'
    }

    let info = baseInfo[method as keyof typeof baseInfo] || 'Check with provider'
    
    if (luggageLevel === 'heavy') {
      info += '. Consider shipping items ahead for heavy luggage.'
    }

    return info
  }

  private createAlternatives(routeData: any, selectedMethod: any): any[] {
    if (!routeData.alternatives) return []

    return routeData.alternatives
      .filter((alt: any) => alt.method !== selectedMethod.method)
      .map((alt: any) => ({
        method: alt.method,
        pros: this.getMethodPros(alt.method),
        cons: this.getMethodCons(alt.method),
        costDiff: alt.cost.standard - selectedMethod.cost.standard
      }))
  }

  private getMethodPros(method: string): string[] {
    const pros = {
      'flight': ['Fastest option', 'Long distance efficiency'],
      'train': ['City center to center', 'Scenic views', 'No baggage restrictions'],
      'bus': ['Most economical', 'Frequent departures'],
      'car-rental': ['Complete flexibility', 'Scenic routes', 'Luggage freedom'],
      'ferry': ['Scenic journey', 'Vehicle transport option']
    }
    return pros[method as keyof typeof pros] || ['Alternative transport option']
  }

  private getMethodCons(method: string): string[] {
    const cons = {
      'flight': ['Airport transfers needed', 'Baggage restrictions', 'Weather delays'],
      'train': ['May require reservations', 'Limited luggage space'],
      'bus': ['Longer journey time', 'Limited luggage'],
      'car-rental': ['Driving responsibility', 'Parking costs', 'Traffic'],
      'ferry': ['Weather dependent', 'Longer journey time']
    }
    return cons[method as keyof typeof cons] || ['Consider pros and cons']
  }

  private generateBookingStrategy(legs: TransportLeg[], preferences: any): string {
    const hasFlights = legs.some(leg => leg.method === 'flight')
    const hasTrains = legs.some(leg => leg.method === 'train')
    
    let strategy = `📅 **Booking Strategy for ${legs.length}-leg journey:**\n\n`

    if (hasFlights) {
      strategy += `✈️ **Flights**: Book 2-8 weeks ahead for best prices. Consider flexible dates.\n`
    }
    
    if (hasTrains) {
      strategy += `🚄 **Trains**: Book 1-4 weeks ahead. High-speed trains fill up faster.\n`
    }

    strategy += `\n💡 **Pro Tips**:\n`
    strategy += `• Book longer routes first (flights, international trains)\n`
    strategy += `• Local buses/short trains can be booked closer to travel\n`
    
    if (preferences.flexibility === 'flexible') {
      strategy += `• Consider flexible tickets for uncertain plans\n`
    }

    return strategy
  }

  private findApplicablePasses(cities: string[], costs: any): any[] {
    const passes: any[] = []

    // European rail pass logic
    const europeanCities = cities.filter(city => 
      ['London', 'Paris', 'Rome', 'Barcelona', 'Amsterdam', 'Berlin'].includes(city)
    )

    if (europeanCities.length >= 3) {
      const euriailCost = Math.min(500 + (europeanCities.length - 3) * 100, 800)
      const standardCost = costs.standard
      
      if (euriailCost < standardCost * 0.8) {
        passes.push({
          name: 'Eurail Pass',
          coverage: europeanCities,
          cost: euriailCost,
          savings: standardCost - euriailCost,
          recommended: true
        })
      }
    }

    // Japan rail pass logic
    const japaneseCities = cities.filter(city => 
      ['Tokyo', 'Kyoto', 'Osaka', 'Hiroshima'].includes(city)
    )

    if (japaneseCities.length >= 2) {
      passes.push({
        name: 'JR Pass',
        coverage: japaneseCities,
        cost: 280,
        savings: costs.standard * 0.3,
        recommended: japaneseCities.length >= 3
      })
    }

    return passes
  }

  private generateTravelTips(legs: TransportLeg[], preferences: any): string[] {
    const tips: string[] = []

    // Method-specific tips
    const methods = Array.from(new Set(legs.map(leg => leg.method)))
    
    if (methods.includes('flight')) {
      tips.push('✈️ Check-in online 24hrs ahead and arrive at airport 2hrs early for international flights')
      tips.push('📱 Download airline apps for real-time updates and mobile boarding passes')
    }

    if (methods.includes('train')) {
      tips.push('🚄 Validate tickets before boarding (where required) and arrive 15min early')
      tips.push('💺 Reserve seats on high-speed trains during peak season')
    }

    if (methods.includes('car-rental')) {
      tips.push('🚗 Bring international driving permit and check insurance coverage')
      tips.push('🅿️ Research parking options at destinations in advance')
    }

    // Multi-city specific tips
    if (legs.length >= 3) {
      tips.push('🎒 Pack light - you\'ll be moving frequently between cities')
      tips.push('📋 Keep digital copies of all transport bookings accessible offline')
      tips.push('⏰ Build buffer time between connections for delays and city orientation')
    }

    // Luggage tips
    if (preferences.luggage === 'heavy') {
      tips.push('📦 Consider luggage shipping services between cities to travel lighter')
    }

    return tips
  }

  public generateBookingTimeline(legs: TransportLeg[], travelStartDate: string): BookingTimeline {
    const startDate = new Date(travelStartDate)
    const weeksUntilTravel = Math.ceil((startDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 7))
    
    let urgency: 'book-now' | 'book-soon' | 'monitor-prices' | 'last-minute'
    const timeline: Array<{weeks: number, action: string, reason: string}> = []

    if (weeksUntilTravel <= 2) {
      urgency = 'book-now'
      timeline.push({
        weeks: 0,
        action: 'Book all transport immediately',
        reason: 'Last-minute booking - limited availability and higher prices'
      })
    } else if (weeksUntilTravel <= 4) {
      urgency = 'book-soon' 
      timeline.push({
        weeks: 1,
        action: 'Book flights and major train routes',
        reason: 'Prices start increasing closer to travel date'
      })
    } else if (weeksUntilTravel <= 12) {
      urgency = 'monitor-prices'
      timeline.push({
        weeks: 8,
        action: 'Start monitoring flight prices',
        reason: 'Sweet spot for finding deals'
      })
      timeline.push({
        weeks: 4,
        action: 'Book flights and international trains',
        reason: 'Optimal booking window for most routes'
      })
      timeline.push({
        weeks: 2,
        action: 'Book local transport and buses',
        reason: 'Close enough for accurate planning'
      })
    } else {
      urgency = 'monitor-prices'
      timeline.push({
        weeks: 16,
        action: 'Set up price alerts',
        reason: 'Monitor for early bird deals and price drops'
      })
      timeline.push({
        weeks: 8,
        action: 'Book major transport',
        reason: 'Optimal pricing window begins'
      })
    }

    return {
      urgency,
      timeline
    }
  }
}

// Singleton instance
export const transportCoordinator = new TransportCoordinator()
export default TransportCoordinator