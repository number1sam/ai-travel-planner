// Multi-City Itinerary Generator
// Orchestrates all planning systems to create comprehensive multi-city trip plans

import { routeOptimizer, type RouteOptions, type OptimizedRoute } from './RouteOptimizer'
import { transportCoordinator, type TransportPlan } from './TransportCoordinator'
import { accommodationDistributor, type MultiCityAccommodationPlan, type AccommodationPreferences } from './AccommodationDistributor'
import { activityDistributor, type MultiCityActivityPlan, type ActivityPreferences } from './ActivityDistributor'
import { budgetOptimizer, type OptimizedBudget, type BudgetConstraints } from './BudgetOptimizer'

export interface MultiCityTripRequest {
  destinations: string[]
  totalDays: number
  budget: number
  currency: string
  travelDates: {
    start: string
    end: string
    flexible: boolean
  }
  travelers: {
    adults: number
    children: number
    groupType: 'solo' | 'couple' | 'family' | 'friends' | 'business'
  }
  preferences: {
    pace: 'relaxed' | 'moderate' | 'packed'
    transportPreference: 'fastest' | 'scenic' | 'budget' | 'mixed'
    accommodationStyle: 'budget' | 'mid-range' | 'luxury' | 'mixed'
    interests: string[]
    physicalAbility: 'low' | 'moderate' | 'high'
    uniqueExperiences: boolean
    flexibility: 'strict' | 'moderate' | 'flexible'
  }
  constraints?: {
    startCity?: string
    endCity?: string
    mustInclude?: string[]
    avoid?: string[]
    routeType?: 'linear' | 'circular' | 'hub-and-spoke' | 'optimal'
  }
}

export interface DayItinerary {
  day: number
  date: string
  city: string
  type: 'arrival' | 'full-day' | 'departure' | 'travel'
  schedule: {
    morning: {
      time: string
      activity: string
      location: string
      duration: string
      cost: number
      notes?: string
    } | null
    afternoon: {
      time: string
      activity: string
      location: string
      duration: string
      cost: number
      notes?: string
    } | null
    evening: {
      time: string
      activity: string
      location: string
      duration: string
      cost: number
      notes?: string
    } | null
  }
  accommodation: {
    name: string
    location: string
    checkIn?: string
    checkOut?: string
    nights?: number
  } | null
  transport: {
    method: string
    from: string
    to: string
    departure: string
    arrival: string
    cost: number
    bookingInfo: string
  } | null
  totalDayCost: number
  highlights: string[]
}

export interface ComprehensiveItinerary {
  overview: {
    title: string
    duration: string
    cities: number
    totalDistance: number
    routeType: string
    highlights: string[]
  }
  route: OptimizedRoute
  transport: TransportPlan
  accommodation: MultiCityAccommodationPlan
  activities: MultiCityActivityPlan
  budget: OptimizedBudget
  dailyItinerary: DayItinerary[]
  bookingChecklist: Array<{
    item: string
    deadline: string
    priority: 'urgent' | 'important' | 'optional'
    estimatedCost: number
    bookingTips: string[]
  }>
  travelTips: {
    packing: string[]
    logistics: string[]
    cultural: string[]
    budgeting: string[]
  }
  alternatives: Array<{
    title: string
    description: string
    impact: string
    savings?: number
    additionalCost?: number
  }>
  metadata: {
    generated: string
    confidence: number // 0-100 how confident we are in this plan
    completeness: number // 0-100 how complete the planning is
    warnings: string[]
  }
}

class MultiCityItineraryGenerator {
  public async generateItinerary(request: MultiCityTripRequest): Promise<ComprehensiveItinerary> {
    console.log(`🌍 Generating comprehensive ${request.totalDays}-day itinerary for ${request.destinations.length} cities`)
    
    try {
      // Step 1: Optimize the route
      const routeOptions: RouteOptions = {
        routeType: request.constraints?.routeType || 'optimal',
        totalDays: request.totalDays,
        transportPreference: request.preferences.transportPreference,
        pace: request.preferences.pace,
        startCity: request.constraints?.startCity,
        endCity: request.constraints?.endCity,
        mustInclude: request.constraints?.mustInclude,
        avoid: request.constraints?.avoid
      }

      const optimizedRoute = routeOptimizer.optimizeRoute(request.destinations, routeOptions)
      console.log(`✅ Route optimized: ${optimizedRoute.sequence.join(' → ')}`)

      // Step 2: Plan transport between cities
      const transportDates = this.generateTransportDates(optimizedRoute, request.travelDates.start)
      const transportPlan = transportCoordinator.planTransport(
        optimizedRoute.sequence,
        transportDates,
        {
          budget: request.preferences.accommodationStyle as 'budget' | 'standard' | 'premium',
          priority: this.mapTransportPreference(request.preferences.transportPreference),
          flexibility: request.preferences.flexibility as 'fixed' | 'flexible',
          luggage: this.estimateLuggageLevel(request.travelers, request.totalDays)
        }
      )
      console.log(`✅ Transport planned: ${transportPlan.legs.length} legs`)

      // Step 3: Distribute accommodations
      const accommodationPreferences: AccommodationPreferences = {
        budget: this.calculateAccommodationBudget(request.budget),
        style: request.preferences.accommodationStyle,
        priorities: this.mapAccommodationPriorities(request.preferences),
        groupSize: request.travelers.adults + request.travelers.children,
        travelerType: request.travelers.groupType as any
      }

      const accommodationPlan = accommodationDistributor.distributeAccommodations(
        optimizedRoute.dayBreakdown.map(city => ({
          name: city.city,
          nights: city.nights,
          arrivalDay: city.arrivalDay
        })),
        accommodationPreferences.budget,
        accommodationPreferences,
        request.travelDates
      )
      console.log(`✅ Accommodations distributed across ${accommodationPlan.cities.length} cities`)

      // Step 4: Plan activities for each city
      const activityPreferences: ActivityPreferences = {
        interests: request.preferences.interests,
        pace: request.preferences.pace,
        budget: this.calculateActivityBudget(request.budget),
        physicalAbility: request.preferences.physicalAbility,
        groupType: request.travelers.groupType,
        uniqueExperiences: request.preferences.uniqueExperiences,
        timePreferences: this.getTimePreferences(request.preferences.pace)
      }

      const activityPlan = activityDistributor.distributeActivities(
        optimizedRoute.dayBreakdown.map(city => ({
          name: city.city,
          nights: city.nights,
          arrivalDay: city.arrivalDay
        })),
        activityPreferences,
        request.totalDays
      )
      console.log(`✅ Activities distributed: ${activityPlan.totalActivities} total activities`)

      // Step 5: Optimize budget allocation
      const budgetConstraints: BudgetConstraints = {
        totalBudget: request.budget,
        currency: request.currency,
        flexibility: request.preferences.flexibility as any,
        priorities: this.mapBudgetPriorities(request.preferences),
        travelStyle: request.preferences.accommodationStyle,
        groupSize: request.travelers.adults + request.travelers.children
      }

      const budgetPlan = budgetOptimizer.optimizeBudget(
        optimizedRoute.dayBreakdown.map(city => ({
          name: city.city,
          nights: city.nights,
          activities: activityPlan.cities.find(a => a.city === city.city)?.activities.length || 0
        })),
        budgetConstraints,
        {
          accommodation: accommodationPlan.totalBudget,
          transport: transportPlan.totalCost.standard,
          activities: activityPlan.totalCost
        }
      )
      console.log(`✅ Budget optimized: ${request.currency}${budgetPlan.totalBudget}`)

      // Step 6: Generate daily itinerary
      const dailyItinerary = this.generateDailyItinerary(
        optimizedRoute,
        accommodationPlan,
        activityPlan,
        transportPlan,
        request
      )

      // Step 7: Create booking checklist
      const bookingChecklist = this.generateBookingChecklist(
        accommodationPlan,
        transportPlan,
        activityPlan,
        request.travelDates.start
      )

      // Step 8: Generate travel tips
      const travelTips = this.generateTravelTips(optimizedRoute, request)

      // Step 9: Create alternatives
      const alternatives = this.generateAlternatives(budgetPlan, optimizedRoute, request)

      // Step 10: Calculate metadata
      const metadata = this.calculateMetadata(optimizedRoute, accommodationPlan, activityPlan, transportPlan)

      return {
        overview: {
          title: this.generateTitle(optimizedRoute.sequence),
          duration: `${request.totalDays} days`,
          cities: optimizedRoute.sequence.length,
          totalDistance: optimizedRoute.totalDistance,
          routeType: optimizedRoute.routeType,
          highlights: optimizedRoute.highlights
        },
        route: optimizedRoute,
        transport: transportPlan,
        accommodation: accommodationPlan,
        activities: activityPlan,
        budget: budgetPlan,
        dailyItinerary,
        bookingChecklist,
        travelTips,
        alternatives,
        metadata
      }

    } catch (error) {
      console.error('❌ Error generating itinerary:', error)
      throw new Error(`Failed to generate itinerary: ${error}`)
    }
  }

  private generateTransportDates(route: OptimizedRoute, startDate: string): string[] {
    const dates: string[] = []
    let currentDate = new Date(startDate)

    for (const cityBreakdown of route.dayBreakdown) {
      if (dates.length === 0) {
        // First city - no transport needed
        dates.push(currentDate.toISOString().split('T')[0])
      } else {
        // Travel to next city on departure day
        currentDate = new Date(startDate)
        currentDate.setDate(currentDate.getDate() + cityBreakdown.arrivalDay - 1)
        dates.push(currentDate.toISOString().split('T')[0])
      }
    }

    return dates
  }

  private mapTransportPreference(pref: string): 'cost' | 'time' | 'comfort' | 'experience' {
    const mapping = {
      'budget': 'cost' as const,
      'fastest': 'time' as const,
      'scenic': 'experience' as const,
      'mixed': 'comfort' as const
    }
    return mapping[pref as keyof typeof mapping] || 'comfort'
  }

  private estimateLuggageLevel(travelers: any, days: number): 'light' | 'standard' | 'heavy' {
    if (days <= 5) return 'light'
    if (days <= 10) return 'standard'
    if (travelers.adults + travelers.children > 3) return 'heavy'
    return 'standard'
  }

  private calculateAccommodationBudget(totalBudget: number): number {
    return Math.round(totalBudget * 0.4) // 40% of total budget for accommodation
  }

  private calculateActivityBudget(totalBudget: number): number {
    return Math.round(totalBudget * 0.15) // 15% of total budget for activities
  }

  private mapAccommodationPriorities(preferences: any): Array<'location' | 'price' | 'amenities' | 'reviews' | 'uniqueness'> {
    const priorities: Array<'location' | 'price' | 'amenities' | 'reviews' | 'uniqueness'> = []
    
    if (preferences.accommodationStyle === 'budget') priorities.push('price', 'location')
    else if (preferences.accommodationStyle === 'luxury') priorities.push('amenities', 'location', 'reviews')
    else priorities.push('location', 'reviews', 'price')

    if (preferences.uniqueExperiences) priorities.push('uniqueness')

    return priorities.slice(0, 3) // Top 3 priorities
  }

  private getTimePreferences(pace: string): string[] {
    if (pace === 'packed') return ['morning', 'afternoon', 'evening']
    if (pace === 'relaxed') return ['morning', 'afternoon']
    return ['morning', 'afternoon', 'evening']
  }

  private mapBudgetPriorities(preferences: any): Array<'comfort' | 'experience' | 'savings' | 'luxury'> {
    const priorities: Array<'comfort' | 'experience' | 'savings' | 'luxury'> = []
    
    if (preferences.accommodationStyle === 'luxury') priorities.push('luxury', 'comfort')
    else if (preferences.accommodationStyle === 'budget') priorities.push('savings', 'experience')
    else priorities.push('comfort', 'experience')

    if (preferences.uniqueExperiences) priorities.unshift('experience')

    return priorities.slice(0, 2)
  }

  private generateDailyItinerary(
    route: OptimizedRoute,
    accommodation: MultiCityAccommodationPlan,
    activities: MultiCityActivityPlan,
    transport: TransportPlan,
    request: MultiCityTripRequest
  ): DayItinerary[] {
    const dailyItinerary: DayItinerary[] = []
    const startDate = new Date(request.travelDates.start)

    let currentTransportIndex = 0

    for (let day = 1; day <= request.totalDays; day++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + day - 1)

      // Find which city we're in on this day
      const cityBreakdown = route.dayBreakdown.find(city => 
        day >= city.arrivalDay && day < city.departureDay
      )

      if (!cityBreakdown) continue

      // Check if this is a travel day
      const isArrivalDay = day === cityBreakdown.arrivalDay && day > 1
      const isDepartureDay = day === cityBreakdown.departureDay - 1 && day < request.totalDays

      // Get accommodation for this city
      const cityAccommodation = accommodation.cities.find(acc => acc.city === cityBreakdown.city)
      
      // Get activities for this day
      const cityActivities = activities.cities.find(act => act.city === cityBreakdown.city)
      const daySchedule = cityActivities?.dailySchedules.find(schedule => 
        schedule.day === (day - cityBreakdown.arrivalDay + 1)
      )

      // Get transport if applicable
      let transportInfo = null
      if (isArrivalDay && currentTransportIndex < transport.legs.length) {
        const transportLeg = transport.legs[currentTransportIndex]
        transportInfo = {
          method: transportLeg.method,
          from: transportLeg.from,
          to: transportLeg.to,
          departure: '10:00', // Placeholder - would be dynamic
          arrival: '14:00',   // Placeholder - would be dynamic
          cost: transportLeg.cost.standard,
          bookingInfo: transportLeg.bookingDetails.providers.join(', ')
        }
        currentTransportIndex++
      }

      const dayType = isArrivalDay ? 'arrival' : 
                     isDepartureDay ? 'departure' :
                     transportInfo ? 'travel' : 'full-day'

      let totalDayCost = 0

      // Build schedule
      const schedule = {
        morning: daySchedule?.morning ? {
          time: '09:00',
          activity: daySchedule.morning.activity,
          location: cityBreakdown.city,
          duration: `${daySchedule.morning.duration}h`,
          cost: daySchedule.morning.cost,
          notes: daySchedule.morning.rationale
        } : null,
        afternoon: daySchedule?.afternoon ? {
          time: '14:00',
          activity: daySchedule.afternoon.activity,
          location: cityBreakdown.city,
          duration: `${daySchedule.afternoon.duration}h`,
          cost: daySchedule.afternoon.cost,
          notes: daySchedule.afternoon.rationale
        } : null,
        evening: daySchedule?.evening ? {
          time: '19:00',
          activity: daySchedule.evening.activity,
          location: cityBreakdown.city,
          duration: `${daySchedule.evening.duration}h`,
          cost: daySchedule.evening.cost,
          notes: daySchedule.evening.rationale
        } : null
      }

      // Calculate total day cost
      if (schedule.morning) totalDayCost += schedule.morning.cost
      if (schedule.afternoon) totalDayCost += schedule.afternoon.cost
      if (schedule.evening) totalDayCost += schedule.evening.cost
      if (transportInfo) totalDayCost += transportInfo.cost

      dailyItinerary.push({
        day,
        date: date.toISOString().split('T')[0],
        city: cityBreakdown.city,
        type: dayType,
        schedule,
        accommodation: cityAccommodation ? {
          name: `${cityAccommodation.hotelType} hotel`,
          location: cityAccommodation.location,
          checkIn: day === cityBreakdown.arrivalDay ? cityAccommodation.checkIn : undefined,
          checkOut: day === cityBreakdown.departureDay - 1 ? cityAccommodation.checkOut : undefined,
          nights: cityAccommodation.nights
        } : null,
        transport: transportInfo,
        totalDayCost: Math.round(totalDayCost),
        highlights: cityActivities?.highlights || []
      })
    }

    return dailyItinerary
  }

  private generateBookingChecklist(
    accommodation: MultiCityAccommodationPlan,
    transport: TransportPlan,
    activities: MultiCityActivityPlan,
    startDate: string
  ): Array<any> {
    const checklist: Array<any> = []
    const start = new Date(startDate)
    const weeksUntilTravel = Math.ceil((start.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 7))

    // Accommodation bookings
    checklist.push({
      item: `Book accommodations (${accommodation.cities.length} cities)`,
      deadline: new Date(Date.now() + 6 * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      priority: 'urgent' as const,
      estimatedCost: accommodation.totalBudget,
      bookingTips: accommodation.bookingStrategy.tips
    })

    // Transport bookings
    checklist.push({
      item: `Book transport (${transport.legs.length} legs)`,
      deadline: new Date(Date.now() + 4 * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      priority: 'urgent' as const,
      estimatedCost: transport.totalCost.standard,
      bookingTips: transport.tips
    })

    // Activity bookings
    const bookingRequired = activities.cities.flatMap(city => 
      city.activities.filter(activity => activity.bookingRequired)
    )
    
    if (bookingRequired.length > 0) {
      checklist.push({
        item: `Pre-book activities (${bookingRequired.length} experiences)`,
        deadline: new Date(Date.now() + 2 * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priority: 'important' as const,
        estimatedCost: Math.round(bookingRequired.reduce((sum, activity) => sum + activity.cost, 0)),
        bookingTips: ['Book skip-the-line access', 'Check cancellation policies', 'Confirm group size requirements']
      })
    }

    return checklist.sort((a, b) => {
      if (a.priority === 'urgent' && b.priority !== 'urgent') return -1
      if (b.priority === 'urgent' && a.priority !== 'urgent') return 1
      return 0
    })
  }

  private generateTravelTips(route: OptimizedRoute, request: MultiCityTripRequest): any {
    return {
      packing: [
        'Pack light - you\'ll be moving between cities frequently',
        'Bring versatile clothing for different climates',
        'Pack a day bag for city exploration',
        'Consider packing cubes for organization'
      ],
      logistics: [
        'Keep digital copies of all bookings accessible offline',
        'Notify banks of travel plans to avoid card blocks',
        'Check visa requirements for all destinations',
        `Build buffer time between connections - you're visiting ${route.sequence.length} cities`
      ],
      cultural: [
        'Learn basic phrases in local languages',
        'Research local customs and tipping practices',
        'Download offline maps and translation apps',
        'Respect photography restrictions at attractions'
      ],
      budgeting: [
        `Set daily spending limits per city based on cost of living`,
        'Keep emergency cash in different locations',
        'Track expenses to stay within budget',
        'Consider getting local currency at destination ATMs'
      ]
    }
  }

  private generateAlternatives(budget: OptimizedBudget, route: OptimizedRoute, request: MultiCityTripRequest): Array<any> {
    const alternatives: Array<any> = []

    // Use budget alternatives
    budget.alternatives.forEach(alt => {
      alternatives.push({
        title: alt.scenario,
        description: alt.changes.join(', '),
        impact: alt.totalBudget > budget.totalBudget ? 'Increased cost' : 'Cost savings',
        savings: alt.totalBudget < budget.totalBudget ? budget.totalBudget - alt.totalBudget : undefined,
        additionalCost: alt.totalBudget > budget.totalBudget ? alt.totalBudget - budget.totalBudget : undefined
      })
    })

    // Route alternatives
    if (route.routeType !== 'circular' && route.sequence.length >= 3) {
      alternatives.push({
        title: 'Circular Route Option',
        description: 'Return to starting city for easier flights',
        impact: 'More comprehensive exploration, slightly higher transport cost',
        additionalCost: Math.round(budget.totalBudget * 0.1)
      })
    }

    return alternatives
  }

  private calculateMetadata(
    route: OptimizedRoute,
    accommodation: MultiCityAccommodationPlan,
    activities: MultiCityActivityPlan,
    transport: TransportPlan
  ): any {
    let confidence = 85 // Base confidence

    // Adjust based on route efficiency
    confidence += (route.efficiency - 70) * 0.2

    // Adjust based on activity coverage
    const activityBalance = activities.balanceScore
    confidence += (activityBalance - 70) * 0.1

    // Adjust based on accommodation fit
    const accommodationBalance = accommodation.cities.every(city => city.budget.total > 0) ? 5 : -10
    confidence += accommodationBalance

    const warnings: string[] = []
    
    if (route.efficiency < 60) {
      warnings.push('Route involves significant backtracking - consider reordering cities')
    }
    
    if (activities.varietyScore < 50) {
      warnings.push('Limited activity variety - consider adding different experience types')
    }

    if (transport.totalTravelTime > 20) {
      warnings.push('High travel time between cities - consider longer stays or fewer destinations')
    }

    return {
      generated: new Date().toISOString(),
      confidence: Math.max(0, Math.min(100, Math.round(confidence))),
      completeness: 90, // High completeness with all systems integrated
      warnings
    }
  }

  private generateTitle(cities: string[]): string {
    if (cities.length === 2) {
      return `${cities[0]} to ${cities[1]} Adventure`
    } else if (cities.length === 3) {
      return `${cities.join(' - ')} Grand Tour`
    } else {
      return `Multi-City ${cities.length}-Destination Journey`
    }
  }
}

// Singleton instance
export const multiCityItineraryGenerator = new MultiCityItineraryGenerator()
export default MultiCityItineraryGenerator