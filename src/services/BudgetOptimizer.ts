// Budget Optimization Engine
// Intelligently allocates and optimizes budgets across multi-city trips

export interface BudgetCategory {
  category: 'accommodation' | 'transport' | 'activities' | 'food' | 'shopping' | 'contingency'
  allocated: number
  minimum: number
  maximum: number
  priority: 'essential' | 'important' | 'flexible'
  breakdown: Array<{
    item: string
    amount: number
    rationale: string
  }>
}

export interface CityBudget {
  city: string
  totalAllocated: number
  categories: BudgetCategory[]
  costOfLiving: 'low' | 'moderate' | 'high' | 'very-high'
  priceIndex: number // Relative to base (100)
  savings: Array<{
    opportunity: string
    amount: number
    tradeoff: string
  }>
}

export interface OptimizedBudget {
  totalBudget: number
  cities: CityBudget[]
  globalBreakdown: {
    accommodation: number
    transport: number
    activities: number
    food: number
    shopping: number
    contingency: number
  }
  recommendations: Array<{
    type: 'saving' | 'upgrade' | 'reallocation'
    title: string
    description: string
    impact: number // Positive = savings, Negative = additional cost
    effort: 'low' | 'medium' | 'high'
  }>
  alternatives: Array<{
    scenario: string
    totalBudget: number
    changes: string[]
    pros: string[]
    cons: string[]
  }>
  timeline: Array<{
    weeks: number
    action: string
    amount: number
    rationale: string
  }>
}

export interface BudgetConstraints {
  totalBudget: number
  currency: string
  flexibility: 'strict' | 'moderate' | 'flexible'
  priorities: Array<'comfort' | 'experience' | 'savings' | 'luxury'>
  travelStyle: 'budget' | 'mid-range' | 'luxury' | 'mixed'
  groupSize: number
  specialRequirements?: string[] // 'accessibility', 'dietary', 'business'
}

class BudgetOptimizer {
  private cityPriceIndex = new Map<string, any>()
  private categoryWeights = {
    accommodation: 0.40, // Typically largest expense
    transport: 0.25,
    activities: 0.15,
    food: 0.15,
    shopping: 0.03,
    contingency: 0.02
  }

  constructor() {
    this.initializePriceData()
  }

  private initializePriceData() {
    // Dublin
    this.setCityPriceData('Dublin', {
      index: 105, // Above average
      costOfLiving: 'high',
      avgDailyBudget: {
        budget: 80,
        midRange: 150,
        luxury: 300
      },
      categories: {
        accommodation: {multiplier: 1.2, notes: 'High hotel prices especially city center'},
        transport: {multiplier: 1.1, notes: 'Good public transport, moderate taxi costs'},
        activities: {multiplier: 1.0, notes: 'Many free attractions, reasonable entry fees'},
        food: {multiplier: 1.3, notes: 'Restaurant prices above average, pub food reasonable'},
        shopping: {multiplier: 1.1, notes: 'Standard European pricing'}
      },
      seasonality: {
        peak: {months: ['Jun', 'Jul', 'Aug', 'Dec'], multiplier: 1.3},
        low: {months: ['Jan', 'Feb', 'Mar', 'Nov'], multiplier: 0.8}
      }
    })

    // Cork
    this.setCityPriceData('Cork', {
      index: 85, // Below average
      costOfLiving: 'moderate',
      avgDailyBudget: {
        budget: 60,
        midRange: 120,
        luxury: 250
      },
      categories: {
        accommodation: {multiplier: 0.8, notes: 'More affordable than Dublin'},
        transport: {multiplier: 0.9, notes: 'Compact city, walkable'},
        activities: {multiplier: 0.9, notes: 'Good value attractions'},
        food: {multiplier: 1.0, notes: 'Great local food at reasonable prices'},
        shopping: {multiplier: 0.9, notes: 'Local shops and markets'}
      }
    })

    // London
    this.setCityPriceData('London', {
      index: 140, // Very expensive
      costOfLiving: 'very-high',
      avgDailyBudget: {
        budget: 120,
        midRange: 250,
        luxury: 500
      },
      categories: {
        accommodation: {multiplier: 1.8, notes: 'Very expensive hotels'},
        transport: {multiplier: 1.4, notes: 'Excellent but pricey public transport'},
        activities: {multiplier: 1.2, notes: 'Many expensive attractions, but free museums'},
        food: {multiplier: 1.5, notes: 'Wide range from budget to very expensive'},
        shopping: {multiplier: 1.3, notes: 'High-end shopping destination'}
      }
    })

    // Paris
    this.setCityPriceData('Paris', {
      index: 125,
      costOfLiving: 'high',
      avgDailyBudget: {
        budget: 100,
        midRange: 200,
        luxury: 400
      },
      categories: {
        accommodation: {multiplier: 1.4, notes: 'Expensive hotels, especially central locations'},
        transport: {multiplier: 1.0, notes: 'Excellent metro system, reasonable prices'},
        activities: {multiplier: 1.1, notes: 'Museums can be expensive, many free sights'},
        food: {multiplier: 1.2, notes: 'Fine dining expensive, bistros reasonable'},
        shopping: {multiplier: 1.4, notes: 'Luxury shopping capital'}
      }
    })

    // Tokyo
    this.setCityPriceData('Tokyo', {
      index: 115,
      costOfLiving: 'high',
      avgDailyBudget: {
        budget: 90,
        midRange: 180,
        luxury: 350
      },
      categories: {
        accommodation: {multiplier: 1.3, notes: 'Small but expensive hotels'},
        transport: {multiplier: 0.8, notes: 'Excellent and affordable public transport'},
        activities: {multiplier: 0.9, notes: 'Many temples free, reasonable entry fees'},
        food: {multiplier: 0.7, notes: 'Excellent value, especially local restaurants'},
        shopping: {multiplier: 1.0, notes: 'Wide range from budget to luxury'}
      }
    })

    // Bangkok
    this.setCityPriceData('Bangkok', {
      index: 45, // Very affordable
      costOfLiving: 'low',
      avgDailyBudget: {
        budget: 30,
        midRange: 70,
        luxury: 150
      },
      categories: {
        accommodation: {multiplier: 0.3, notes: 'Very affordable hotels and hostels'},
        transport: {multiplier: 0.4, notes: 'Cheap taxis, tuk-tuks, and public transport'},
        activities: {multiplier: 0.5, notes: 'Temples free, attractions very affordable'},
        food: {multiplier: 0.2, notes: 'Street food incredibly cheap, restaurants affordable'},
        shopping: {multiplier: 0.4, notes: 'Great shopping deals, markets'}
      }
    })
  }

  private setCityPriceData(city: string, data: any) {
    this.cityPriceIndex.set(city.toLowerCase(), data)
  }

  private getCityPriceData(city: string): any {
    return this.cityPriceIndex.get(city.toLowerCase()) || {
      index: 100,
      costOfLiving: 'moderate',
      avgDailyBudget: {budget: 70, midRange: 140, luxury: 280},
      categories: {
        accommodation: {multiplier: 1.0},
        transport: {multiplier: 1.0},
        activities: {multiplier: 1.0},
        food: {multiplier: 1.0},
        shopping: {multiplier: 1.0}
      }
    }
  }

  public optimizeBudget(
    cities: Array<{name: string, nights: number, activities: number}>,
    constraints: BudgetConstraints,
    existingCosts: {
      accommodation: number
      transport: number
      activities: number
    }
  ): OptimizedBudget {
    console.log(`💰 Optimizing budget of ${constraints.currency}${constraints.totalBudget} across ${cities.length} cities`)

    // Calculate base allocation per city based on cost of living
    const cityBudgets = this.calculateCityBudgets(cities, constraints, existingCosts)

    // Generate global breakdown
    const globalBreakdown = this.calculateGlobalBreakdown(cityBudgets)

    // Generate recommendations for savings and improvements
    const recommendations = this.generateRecommendations(cityBudgets, constraints)

    // Create alternative budget scenarios
    const alternatives = this.generateAlternativeScenarios(cityBudgets, constraints)

    // Create spending timeline
    const timeline = this.generateSpendingTimeline(cityBudgets, constraints)

    return {
      totalBudget: constraints.totalBudget,
      cities: cityBudgets,
      globalBreakdown,
      recommendations,
      alternatives,
      timeline
    }
  }

  private calculateCityBudgets(
    cities: Array<{name: string, nights: number, activities: number}>,
    constraints: BudgetConstraints,
    existingCosts: any
  ): CityBudget[] {
    // Calculate total nights and relative cost weights
    const totalNights = cities.reduce((sum, city) => sum + city.nights, 0)
    const weightedNights = cities.reduce((sum, city) => {
      const priceData = this.getCityPriceData(city.name)
      return sum + (city.nights * priceData.index / 100)
    }, 0)

    return cities.map(city => {
      const priceData = this.getCityPriceData(city.name)
      const cityWeight = (city.nights * priceData.index / 100) / weightedNights
      const baseBudget = constraints.totalBudget * cityWeight

      // Allocate budget across categories
      const categories = this.allocateCategoryBudgets(
        city,
        baseBudget,
        constraints,
        priceData,
        existingCosts
      )

      const totalAllocated = categories.reduce((sum, cat) => sum + cat.allocated, 0)

      // Generate savings opportunities
      const savings = this.generateSavingsOpportunities(city, categories, priceData)

      return {
        city: city.name,
        totalAllocated: Math.round(totalAllocated),
        categories,
        costOfLiving: priceData.costOfLiving,
        priceIndex: priceData.index,
        savings
      }
    })
  }

  private allocateCategoryBudgets(
    city: {name: string, nights: number, activities: number},
    baseBudget: number,
    constraints: BudgetConstraints,
    priceData: any,
    existingCosts: any
  ): BudgetCategory[] {
    const categories: BudgetCategory[] = []

    // Accommodation
    const accommodationBudget = baseBudget * this.categoryWeights.accommodation
    const accommodationMultiplier = priceData.categories.accommodation.multiplier
    categories.push({
      category: 'accommodation',
      allocated: Math.round(accommodationBudget * accommodationMultiplier),
      minimum: Math.round(accommodationBudget * accommodationMultiplier * 0.6),
      maximum: Math.round(accommodationBudget * accommodationMultiplier * 1.5),
      priority: 'essential',
      breakdown: [{
        item: `${city.nights} nights accommodation`,
        amount: Math.round(accommodationBudget * accommodationMultiplier),
        rationale: `${constraints.travelStyle} tier accommodation for ${city.nights} nights`
      }]
    })

    // Transport (city-specific portion)
    const localTransportBudget = baseBudget * 0.05 // Local transport only
    const transportMultiplier = priceData.categories.transport.multiplier
    categories.push({
      category: 'transport',
      allocated: Math.round(localTransportBudget * transportMultiplier),
      minimum: Math.round(localTransportBudget * transportMultiplier * 0.5),
      maximum: Math.round(localTransportBudget * transportMultiplier * 2),
      priority: 'essential',
      breakdown: [{
        item: 'Local transport and transfers',
        amount: Math.round(localTransportBudget * transportMultiplier),
        rationale: 'Metro, buses, taxis for getting around the city'
      }]
    })

    // Activities
    const activitiesBudget = baseBudget * this.categoryWeights.activities
    const activitiesMultiplier = priceData.categories.activities.multiplier
    categories.push({
      category: 'activities',
      allocated: Math.round(activitiesBudget * activitiesMultiplier),
      minimum: Math.round(activitiesBudget * activitiesMultiplier * 0.4),
      maximum: Math.round(activitiesBudget * activitiesMultiplier * 2),
      priority: 'important',
      breakdown: [{
        item: `${city.activities} planned activities`,
        amount: Math.round(activitiesBudget * activitiesMultiplier),
        rationale: 'Attractions, tours, experiences, and entrance fees'
      }]
    })

    // Food
    const foodBudget = baseBudget * this.categoryWeights.food
    const foodMultiplier = priceData.categories.food.multiplier
    categories.push({
      category: 'food',
      allocated: Math.round(foodBudget * foodMultiplier),
      minimum: Math.round(foodBudget * foodMultiplier * 0.6),
      maximum: Math.round(foodBudget * foodMultiplier * 2),
      priority: 'essential',
      breakdown: [{
        item: `${city.nights + 1} days of meals`,
        amount: Math.round(foodBudget * foodMultiplier),
        rationale: 'Mix of restaurants, local cuisine, and casual dining'
      }]
    })

    // Shopping
    const shoppingBudget = baseBudget * this.categoryWeights.shopping
    const shoppingMultiplier = priceData.categories.shopping.multiplier || 1.0
    categories.push({
      category: 'shopping',
      allocated: Math.round(shoppingBudget * shoppingMultiplier),
      minimum: 0,
      maximum: Math.round(shoppingBudget * shoppingMultiplier * 3),
      priority: 'flexible',
      breakdown: [{
        item: 'Souvenirs and shopping',
        amount: Math.round(shoppingBudget * shoppingMultiplier),
        rationale: 'Local crafts, gifts, and personal purchases'
      }]
    })

    // Contingency (per city)
    const contingencyBudget = baseBudget * this.categoryWeights.contingency
    categories.push({
      category: 'contingency',
      allocated: Math.round(contingencyBudget),
      minimum: Math.round(contingencyBudget * 0.5),
      maximum: Math.round(contingencyBudget * 2),
      priority: 'important',
      breakdown: [{
        item: 'Emergency fund',
        amount: Math.round(contingencyBudget),
        rationale: 'Unexpected expenses, price changes, tips'
      }]
    })

    return categories
  }

  private generateSavingsOpportunities(
    city: {name: string},
    categories: BudgetCategory[],
    priceData: any
  ): Array<{opportunity: string, amount: number, tradeoff: string}> {
    const savings: Array<{opportunity: string, amount: number, tradeoff: string}> = []

    // Accommodation savings
    const accommodationBudget = categories.find(c => c.category === 'accommodation')?.allocated || 0
    if (accommodationBudget > 100) {
      savings.push({
        opportunity: 'Choose budget accommodation',
        amount: Math.round(accommodationBudget * 0.3),
        tradeoff: 'Less central location or fewer amenities'
      })
    }

    // Activity savings
    const activitiesBudget = categories.find(c => c.category === 'activities')?.allocated || 0
    if (activitiesBudget > 50) {
      savings.push({
        opportunity: 'Free walking tours and museums',
        amount: Math.round(activitiesBudget * 0.4),
        tradeoff: 'Less structured experiences, more research needed'
      })
    }

    // Food savings
    const foodBudget = categories.find(c => c.category === 'food')?.allocated || 0
    if (foodBudget > 80) {
      savings.push({
        opportunity: 'Local markets and street food',
        amount: Math.round(foodBudget * 0.5),
        tradeoff: 'Less restaurant dining, more adventurous eating'
      })
    }

    return savings
  }

  private calculateGlobalBreakdown(cityBudgets: CityBudget[]): any {
    const breakdown = {
      accommodation: 0,
      transport: 0,
      activities: 0,
      food: 0,
      shopping: 0,
      contingency: 0
    }

    cityBudgets.forEach(city => {
      city.categories.forEach(category => {
        breakdown[category.category] += category.allocated
      })
    })

    return breakdown
  }

  private generateRecommendations(cityBudgets: CityBudget[], constraints: BudgetConstraints): any[] {
    const recommendations: any[] = []

    // Budget distribution analysis
    const totalAllocated = cityBudgets.reduce((sum, city) => sum + city.totalAllocated, 0)
    const budgetUtilization = totalAllocated / constraints.totalBudget

    if (budgetUtilization > 1.1) {
      recommendations.push({
        type: 'reallocation',
        title: 'Budget Overrun Alert',
        description: `Current allocation is ${Math.round((budgetUtilization - 1) * 100)}% over budget. Consider reducing accommodation tier or activities.`,
        impact: (totalAllocated - constraints.totalBudget),
        effort: 'medium'
      })
    }

    if (budgetUtilization < 0.9) {
      recommendations.push({
        type: 'upgrade',
        title: 'Budget Underutilization',
        description: `You have ${Math.round((1 - budgetUtilization) * 100)}% budget remaining. Consider upgrading accommodations or adding premium experiences.`,
        impact: -(constraints.totalBudget - totalAllocated),
        effort: 'low'
      })
    }

    // City-specific recommendations
    const expensiveCities = cityBudgets.filter(city => city.priceIndex > 120)
    if (expensiveCities.length > 0) {
      recommendations.push({
        type: 'saving',
        title: 'High-Cost City Strategy',
        description: `${expensiveCities.map(c => c.city).join(', ')} are expensive destinations. Book accommodations early and consider day passes for attractions.`,
        impact: Math.round(expensiveCities.reduce((sum, city) => sum + city.totalAllocated, 0) * 0.15),
        effort: 'medium'
      })
    }

    return recommendations
  }

  private generateAlternativeScenarios(cityBudgets: CityBudget[], constraints: BudgetConstraints): any[] {
    const alternatives: any[] = []
    const currentTotal = constraints.totalBudget

    // Budget scenario (-20%)
    alternatives.push({
      scenario: 'Budget-Conscious Trip',
      totalBudget: Math.round(currentTotal * 0.8),
      changes: [
        'Hostels/budget hotels instead of mid-range',
        'Public transport instead of taxis',
        'Free attractions and walking tours',
        'Local markets instead of restaurants'
      ],
      pros: ['Significant savings', 'More authentic local experience', 'Flexible spending'],
      cons: ['Less comfort', 'More planning required', 'Limited luxury experiences']
    })

    // Luxury scenario (+50%)
    alternatives.push({
      scenario: 'Luxury Experience',
      totalBudget: Math.round(currentTotal * 1.5),
      changes: [
        '4-5 star hotels in prime locations',
        'Private transfers and tours',
        'Premium experiences and skip-the-line access',
        'Fine dining and wine tastings'
      ],
      pros: ['Maximum comfort', 'VIP experiences', 'Time-saving convenience'],
      cons: ['Significantly higher cost', 'Less spontaneous', 'May feel less authentic']
    })

    // Balanced scenario (+15%)
    alternatives.push({
      scenario: 'Enhanced Comfort',
      totalBudget: Math.round(currentTotal * 1.15),
      changes: [
        'Upgrade to better hotel locations',
        'Add one premium experience per city',
        'Include guided food tours',
        'Airport transfers included'
      ],
      pros: ['Good value upgrades', 'Enhanced experiences', 'Stress-free travel'],
      cons: ['Moderate budget increase', 'Some pre-planning required']
    })

    return alternatives
  }

  private generateSpendingTimeline(cityBudgets: CityBudget[], constraints: BudgetConstraints): any[] {
    const timeline: any[] = []

    // Pre-trip bookings
    const accommodationTotal = cityBudgets.reduce((sum, city) => 
      sum + (city.categories.find(c => c.category === 'accommodation')?.allocated || 0), 0)
    
    timeline.push({
      weeks: 6,
      action: 'Book accommodations',
      amount: Math.round(accommodationTotal * 0.8), // Assuming 80% payment upfront
      rationale: 'Secure best rates and availability'
    })

    const activitiesTotal = cityBudgets.reduce((sum, city) =>
      sum + (city.categories.find(c => c.category === 'activities')?.allocated || 0), 0)

    timeline.push({
      weeks: 3,
      action: 'Pre-book major attractions',
      amount: Math.round(activitiesTotal * 0.4), // High-priority bookings
      rationale: 'Skip-the-line access and guaranteed entry'
    })

    // During trip spending
    const dailyBudget = cityBudgets.reduce((sum, city) => {
      const food = city.categories.find(c => c.category === 'food')?.allocated || 0
      const transport = city.categories.find(c => c.category === 'transport')?.allocated || 0
      const shopping = city.categories.find(c => c.category === 'shopping')?.allocated || 0
      return sum + food + transport + shopping
    }, 0)

    timeline.push({
      weeks: 0,
      action: 'Daily expenses during travel',
      amount: Math.round(dailyBudget),
      rationale: 'Food, local transport, activities, and incidental purchases'
    })

    return timeline
  }

  public rebalanceBudget(
    currentBudget: OptimizedBudget,
    changes: {
      totalBudget?: number
      priorities?: string[]
      travelStyle?: string
    }
  ): OptimizedBudget {
    // Rebalance budget based on new constraints
    // This would involve recalculating all allocations with new parameters
    // Implementation would follow similar pattern as optimizeBudget method
    
    console.log('🔄 Rebalancing budget with new constraints')
    return currentBudget // Placeholder - full implementation would recalculate
  }
}

// Singleton instance
export const budgetOptimizer = new BudgetOptimizer()
export default BudgetOptimizer