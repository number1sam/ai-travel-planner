// Activity Distribution System
// Intelligently distributes and balances activities across multiple cities

export interface CityActivity {
  city: string
  day: number
  timeSlot: 'morning' | 'afternoon' | 'evening' | 'full-day'
  category: 'cultural' | 'adventure' | 'relaxation' | 'food' | 'shopping' | 'nature' | 'nightlife' | 'unique'
  activity: string
  duration: number // hours
  cost: number // per person
  priority: 'must-see' | 'recommended' | 'optional'
  weatherDependent: boolean
  groupSize: 'individual' | 'small-group' | 'family' | 'any'
  physicalDemand: 'low' | 'moderate' | 'high'
  bookingRequired: boolean
  alternatives: string[]
  rationale: string
}

export interface ActivityPreferences {
  interests: string[] // 'culture', 'food', 'adventure', 'nature', etc.
  pace: 'relaxed' | 'moderate' | 'packed'
  budget: number // total activity budget
  physicalAbility: 'low' | 'moderate' | 'high'
  groupType: 'solo' | 'couple' | 'family' | 'friends' | 'business'
  uniqueExperiences: boolean // Prioritize unique/local experiences
  timePreferences: string[] // 'morning', 'afternoon', 'evening'
}

export interface MultiCityActivityPlan {
  cities: Array<{
    city: string
    nights: number
    activities: CityActivity[]
    dailySchedules: Array<{
      day: number
      morning: CityActivity | null
      afternoon: CityActivity | null
      evening: CityActivity | null
      theme: string
    }>
    highlights: string[]
    restTime: number // percentage of time allocated for rest/flexibility
  }>
  totalActivities: number
  totalCost: number
  balanceScore: number // How well activities are distributed (0-100)
  varietyScore: number // How diverse the activity mix is (0-100)
  bookingTimeline: Array<{
    weeks: number
    activities: string[]
    priority: 'urgent' | 'recommended' | 'flexible'
  }>
}

class ActivityDistributor {
  private cityActivities = new Map<string, any[]>()

  constructor() {
    this.initializeCityActivities()
  }

  private initializeCityActivities() {
    // Dublin activities
    this.setCityActivities('Dublin', [
      {
        category: 'cultural',
        activity: 'Trinity College & Book of Kells',
        duration: 2,
        cost: 16,
        priority: 'must-see',
        timeSlot: 'morning',
        weatherDependent: false,
        physicalDemand: 'low',
        bookingRequired: false,
        rationale: 'Ireland\'s most famous manuscript and historic university'
      },
      {
        category: 'cultural',
        activity: 'Guinness Storehouse Experience',
        duration: 2.5,
        cost: 25,
        priority: 'must-see',
        timeSlot: 'afternoon',
        weatherDependent: false,
        physicalDemand: 'low',
        bookingRequired: true,
        rationale: 'Iconic Irish experience with panoramic city views'
      },
      {
        category: 'nightlife',
        activity: 'Temple Bar Evening',
        duration: 3,
        cost: 40,
        priority: 'recommended',
        timeSlot: 'evening',
        weatherDependent: false,
        physicalDemand: 'low',
        bookingRequired: false,
        rationale: 'Traditional Irish pub experience and live music'
      },
      {
        category: 'cultural',
        activity: 'Dublin Castle Tour',
        duration: 1.5,
        cost: 12,
        priority: 'recommended',
        timeSlot: 'morning',
        weatherDependent: false,
        physicalDemand: 'low',
        bookingRequired: false,
        rationale: '800 years of Irish history'
      },
      {
        category: 'nature',
        activity: 'Phoenix Park Walk',
        duration: 2,
        cost: 0,
        priority: 'optional',
        timeSlot: 'morning',
        weatherDependent: true,
        physicalDemand: 'moderate',
        bookingRequired: false,
        rationale: 'One of Europe\'s largest enclosed parks'
      }
    ])

    // Cork activities  
    this.setCityActivities('Cork', [
      {
        category: 'food',
        activity: 'English Market Food Tour',
        duration: 2,
        cost: 30,
        priority: 'must-see',
        timeSlot: 'morning',
        weatherDependent: false,
        physicalDemand: 'low',
        bookingRequired: true,
        rationale: 'Victorian covered market with local specialties'
      },
      {
        category: 'cultural',
        activity: 'Blarney Castle & Stone',
        duration: 3,
        cost: 18,
        priority: 'recommended',
        timeSlot: 'afternoon',
        weatherDependent: true,
        physicalDemand: 'moderate',
        bookingRequired: false,
        rationale: 'Famous castle and the gift of eloquence'
      },
      {
        category: 'unique',
        activity: 'Cork City Walking Tour',
        duration: 2,
        cost: 15,
        priority: 'recommended',
        timeSlot: 'morning',
        weatherDependent: true,
        physicalDemand: 'moderate',
        bookingRequired: false,
        rationale: 'Discover Cork\'s rebel history and architecture'
      }
    ])

    // London activities
    this.setCityActivities('London', [
      {
        category: 'cultural',
        activity: 'Tower of London',
        duration: 3,
        cost: 30,
        priority: 'must-see',
        timeSlot: 'morning',
        weatherDependent: false,
        physicalDemand: 'moderate',
        bookingRequired: true,
        rationale: '1000 years of history and Crown Jewels'
      },
      {
        category: 'cultural',
        activity: 'British Museum',
        duration: 3,
        cost: 0,
        priority: 'must-see',
        timeSlot: 'afternoon',
        weatherDependent: false,
        physicalDemand: 'moderate',
        bookingRequired: false,
        rationale: 'World-class collection spanning human history'
      },
      {
        category: 'unique',
        activity: 'Thames River Cruise',
        duration: 1.5,
        cost: 20,
        priority: 'recommended',
        timeSlot: 'afternoon',
        weatherDependent: true,
        physicalDemand: 'low',
        bookingRequired: false,
        rationale: 'See London\'s landmarks from the river'
      },
      {
        category: 'cultural',
        activity: 'Westminster Abbey',
        duration: 2,
        cost: 25,
        priority: 'recommended',
        timeSlot: 'morning',
        weatherDependent: false,
        physicalDemand: 'low',
        bookingRequired: false,
        rationale: 'Royal church with 1000 years of history'
      }
    ])

    // Paris activities
    this.setCityActivities('Paris', [
      {
        category: 'cultural',
        activity: 'Louvre Museum',
        duration: 4,
        cost: 17,
        priority: 'must-see',
        timeSlot: 'full-day',
        weatherDependent: false,
        physicalDemand: 'moderate',
        bookingRequired: true,
        rationale: 'World\'s largest art museum'
      },
      {
        category: 'cultural',
        activity: 'Eiffel Tower Experience',
        duration: 2,
        cost: 29,
        priority: 'must-see',
        timeSlot: 'afternoon',
        weatherDependent: false,
        physicalDemand: 'low',
        bookingRequired: true,
        rationale: 'Iconic symbol of Paris'
      },
      {
        category: 'food',
        activity: 'Montmartre Food Walk',
        duration: 3,
        cost: 45,
        priority: 'recommended',
        timeSlot: 'afternoon',
        weatherDependent: true,
        physicalDemand: 'moderate',
        bookingRequired: true,
        rationale: 'Artist quarter with authentic bistros'
      }
    ])

    // Tokyo activities
    this.setCityActivities('Tokyo', [
      {
        category: 'cultural',
        activity: 'Senso-ji Temple',
        duration: 2,
        cost: 0,
        priority: 'must-see',
        timeSlot: 'morning',
        weatherDependent: false,
        physicalDemand: 'low',
        bookingRequired: false,
        rationale: 'Tokyo\'s oldest and most significant temple'
      },
      {
        category: 'food',
        activity: 'Tsukiji Outer Market Tour',
        duration: 3,
        cost: 60,
        priority: 'must-see',
        timeSlot: 'morning',
        weatherDependent: false,
        physicalDemand: 'moderate',
        bookingRequired: true,
        rationale: 'World\'s largest fish market and sushi breakfast'
      },
      {
        category: 'unique',
        activity: 'Shibuya Crossing & Harajuku',
        duration: 2,
        cost: 10,
        priority: 'recommended',
        timeSlot: 'afternoon',
        weatherDependent: false,
        physicalDemand: 'moderate',
        bookingRequired: false,
        rationale: 'Modern Tokyo culture and fashion'
      }
    ])
  }

  private setCityActivities(city: string, activities: any[]) {
    this.cityActivities.set(city.toLowerCase(), activities)
  }

  private getCityActivities(city: string): any[] {
    return this.cityActivities.get(city.toLowerCase()) || []
  }

  public distributeActivities(
    cities: Array<{name: string, nights: number, arrivalDay: number}>,
    preferences: ActivityPreferences,
    totalDays: number
  ): MultiCityActivityPlan {
    console.log(`🎯 Distributing activities across ${cities.length} cities over ${totalDays} days`)

    const cityPlans = cities.map((cityInfo, index) => {
      return this.planCityActivities(
        cityInfo.name,
        cityInfo.nights,
        cityInfo.arrivalDay,
        preferences,
        index === 0 // First city flag
      )
    })

    // Calculate total metrics
    const totalActivities = cityPlans.reduce((sum, city) => sum + city.activities.length, 0)
    const totalCost = cityPlans.reduce((sum, city) => 
      sum + city.activities.reduce((citySum, activity) => citySum + activity.cost, 0), 0)

    // Calculate balance and variety scores
    const balanceScore = this.calculateBalanceScore(cityPlans)
    const varietyScore = this.calculateVarietyScore(cityPlans)

    // Generate booking timeline
    const bookingTimeline = this.generateBookingTimeline(cityPlans)

    return {
      cities: cityPlans,
      totalActivities,
      totalCost: Math.round(totalCost),
      balanceScore,
      varietyScore,
      bookingTimeline
    }
  }

  private planCityActivities(
    cityName: string,
    nights: number,
    arrivalDay: number,
    preferences: ActivityPreferences,
    isFirstCity: boolean
  ): any {
    const availableActivities = this.getCityActivities(cityName)
    console.log(`🏛️ Planning activities for ${cityName} (${nights} nights)`)

    // Calculate available time slots (accounting for arrival/departure)
    const availableSlots = this.calculateAvailableSlots(nights, isFirstCity)
    
    // Filter and rank activities based on preferences
    const rankedActivities = this.rankActivities(availableActivities, preferences)
    
    // Select optimal activities for available slots
    const selectedActivities = this.selectOptimalActivities(
      rankedActivities,
      availableSlots,
      preferences
    )

    // Create daily schedules
    const dailySchedules = this.createDailySchedules(selectedActivities, nights, arrivalDay)

    // Calculate rest time percentage
    const totalPossibleSlots = nights * 3 // Morning, afternoon, evening per day
    const usedSlots = selectedActivities.length
    const restTime = Math.round(((totalPossibleSlots - usedSlots) / totalPossibleSlots) * 100)

    // Generate highlights
    const highlights = this.generateCityHighlights(selectedActivities, cityName)

    return {
      city: cityName,
      nights,
      activities: selectedActivities,
      dailySchedules,
      highlights,
      restTime
    }
  }

  private calculateAvailableSlots(nights: number, isFirstCity: boolean): string[] {
    const slots: string[] = []
    
    for (let day = 1; day <= nights; day++) {
      // First day: skip morning if arrival city (travel/checkin time)
      if (day === 1 && isFirstCity) {
        slots.push('afternoon', 'evening')
      } else if (day === nights) {
        // Last day: skip evening (departure prep)
        slots.push('morning', 'afternoon')
      } else {
        // Full days
        slots.push('morning', 'afternoon', 'evening')
      }
    }
    
    return slots
  }

  private rankActivities(activities: any[], preferences: ActivityPreferences): any[] {
    return activities
      .map(activity => ({
        ...activity,
        score: this.calculateActivityScore(activity, preferences)
      }))
      .sort((a, b) => b.score - a.score)
  }

  private calculateActivityScore(activity: any, preferences: ActivityPreferences): number {
    let score = 0

    // Priority weighting
    if (activity.priority === 'must-see') score += 50
    else if (activity.priority === 'recommended') score += 30
    else score += 10

    // Interest matching
    if (preferences.interests.includes(activity.category)) score += 30

    // Physical ability matching
    if (activity.physicalDemand === preferences.physicalAbility) score += 20
    else if (Math.abs(['low', 'moderate', 'high'].indexOf(activity.physicalDemand) - 
                     ['low', 'moderate', 'high'].indexOf(preferences.physicalAbility)) === 1) score += 10

    // Budget consideration
    const avgCostPerActivity = preferences.budget / 10 // Rough estimate
    if (activity.cost <= avgCostPerActivity) score += 15
    else if (activity.cost > avgCostPerActivity * 2) score -= 20

    // Unique experience boost
    if (preferences.uniqueExperiences && activity.category === 'unique') score += 25

    // Group type matching
    if (activity.groupSize === 'any' || activity.groupSize === preferences.groupType) score += 10

    return score
  }

  private selectOptimalActivities(
    rankedActivities: any[],
    availableSlots: string[],
    preferences: ActivityPreferences
  ): CityActivity[] {
    const selected: CityActivity[] = []
    const usedSlots: string[] = []

    for (const activity of rankedActivities) {
      // Check if we have available slots
      if (usedSlots.length >= availableSlots.length) break

      // Check if time slot is available
      let suitableSlot = availableSlots.find(slot => 
        !usedSlots.includes(slot) && 
        (activity.timeSlot === slot || activity.timeSlot === 'full-day')
      )

      if (!suitableSlot && activity.timeSlot === 'full-day') {
        // Full-day activities need morning and afternoon
        if (availableSlots.includes('morning') && availableSlots.includes('afternoon') &&
            !usedSlots.includes('morning') && !usedSlots.includes('afternoon')) {
          suitableSlot = 'full-day'
        }
      }

      if (suitableSlot) {
        selected.push({
          ...activity,
          day: Math.ceil((usedSlots.length + 1) / 3), // Distribute across days
          timeSlot: suitableSlot
        })

        if (activity.timeSlot === 'full-day') {
          usedSlots.push('morning', 'afternoon')
        } else {
          usedSlots.push(suitableSlot)
        }
      }

      // Stop if we've reached optimal activity count based on pace
      const maxActivities = preferences.pace === 'packed' ? availableSlots.length : 
                           preferences.pace === 'moderate' ? Math.ceil(availableSlots.length * 0.7) :
                           Math.ceil(availableSlots.length * 0.5)
      
      if (selected.length >= maxActivities) break
    }

    return selected
  }

  private createDailySchedules(activities: CityActivity[], nights: number, arrivalDay: number): any[] {
    const schedules: any[] = []

    for (let day = 1; day <= nights; day++) {
      const dayActivities = activities.filter(a => a.day === day)
      
      const schedule = {
        day: arrivalDay + day - 1,
        morning: dayActivities.find(a => a.timeSlot === 'morning' || a.timeSlot === 'full-day') || null,
        afternoon: dayActivities.find(a => a.timeSlot === 'afternoon' || a.timeSlot === 'full-day') || null,
        evening: dayActivities.find(a => a.timeSlot === 'evening') || null,
        theme: this.generateDayTheme(dayActivities)
      }

      schedules.push(schedule)
    }

    return schedules
  }

  private generateDayTheme(activities: CityActivity[]): string {
    if (activities.length === 0) return 'Free time and exploration'
    
    const categories = activities.map(a => a.category)
    const dominantCategory = categories.reduce((a, b, i, arr) => 
      arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
    )

    const themes = {
      cultural: 'Cultural immersion day',
      food: 'Culinary exploration day', 
      adventure: 'Adventure and activities day',
      nature: 'Nature and outdoors day',
      unique: 'Unique local experiences day',
      relaxation: 'Relaxation and leisure day'
    }

    return themes[dominantCategory as keyof typeof themes] || 'Mixed activities day'
  }

  private calculateBalanceScore(cityPlans: any[]): number {
    // Calculate how evenly activities are distributed across cities
    const activityCounts = cityPlans.map(city => city.activities.length)
    const avgActivities = activityCounts.reduce((a, b) => a + b) / activityCounts.length
    
    const variance = activityCounts.reduce((sum, count) => 
      sum + Math.pow(count - avgActivities, 2), 0) / activityCounts.length
    
    // Lower variance = higher balance score
    const balanceScore = Math.max(0, 100 - (variance * 10))
    return Math.round(balanceScore)
  }

  private calculateVarietyScore(cityPlans: any[]): number {
    // Calculate diversity of activity categories across all cities
    const allCategories = cityPlans.flatMap(city => 
      city.activities.map((activity: any) => activity.category)
    )
    
    const uniqueCategories = new Set(allCategories)
    const varietyScore = (uniqueCategories.size / 8) * 100 // 8 possible categories
    
    return Math.round(Math.min(100, varietyScore))
  }

  private generateCityHighlights(activities: CityActivity[], cityName: string): string[] {
    const highlights: string[] = []
    
    const mustSee = activities.filter(a => a.priority === 'must-see')
    if (mustSee.length > 0) {
      highlights.push(`${mustSee.length} must-see attraction${mustSee.length > 1 ? 's' : ''}`)
    }

    const categories = Array.from(new Set(activities.map(a => a.category)))
    if (categories.length > 1) {
      highlights.push(`Diverse experiences: ${categories.join(', ')}`)
    }

    const bookingRequired = activities.filter(a => a.bookingRequired)
    if (bookingRequired.length > 0) {
      highlights.push(`${bookingRequired.length} pre-bookable experience${bookingRequired.length > 1 ? 's' : ''}`)
    }

    return highlights
  }

  private generateBookingTimeline(cityPlans: any[]): any[] {
    const timeline: any[] = []
    
    const requiresBooking = cityPlans.flatMap(city => 
      city.activities.filter((activity: any) => activity.bookingRequired)
    )

    if (requiresBooking.length > 0) {
      timeline.push({
        weeks: 4,
        activities: requiresBooking.map((a: any) => `${a.city}: ${a.activity}`),
        priority: 'recommended'
      })
    }

    const popular = cityPlans.flatMap(city =>
      city.activities.filter((activity: any) => activity.priority === 'must-see')
    )

    if (popular.length > 0) {
      timeline.push({
        weeks: 2,
        activities: popular.map((a: any) => `${a.city}: ${a.activity}`),
        priority: 'urgent'
      })
    }

    return timeline
  }
}

// Singleton instance
export const activityDistributor = new ActivityDistributor()
export default ActivityDistributor