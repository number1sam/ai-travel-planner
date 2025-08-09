// Comprehensive Budget Control and Allocation System
// Following specification: budget governance, allocation across categories, running totals, intelligent swaps

import { TripBrief, Constraint } from '../types/TripBrief'
import { CandidateResult } from './ConstraintEngine'

export interface BudgetAllocation {
  category: 'accommodation' | 'transport' | 'activities' | 'food' | 'misc'
  allocated: number
  spent: number
  remaining: number
  percentage: number // of total budget
  flexibility: 'fixed' | 'flexible' | 'highly-flexible'
  priority: 'essential' | 'important' | 'nice-to-have'
}

export interface BudgetBreakdown {
  total: number
  currency: string
  allocations: BudgetAllocation[]
  
  // Spending limits
  dailyLimit: number
  mealLimits: { breakfast: number; lunch: number; dinner: number }
  
  // Buffer and reserves
  emergencyBuffer: number // 5-10% of total
  contingencyFund: number // for unexpected opportunities
  
  // Tracking
  committed: number // confirmed bookings
  reserved: number // pending/planned expenses
  available: number // still allocatable
  
  // Analysis
  riskLevel: 'low' | 'medium' | 'high' // risk of exceeding budget
  optimizationOpportunities: BudgetOptimization[]
  
  lastUpdated: Date
}

export interface BudgetOptimization {
  type: 'accommodation_downgrade' | 'activity_substitute' | 'meal_adjustment' | 'transport_alternative'
  description: string
  currentCost: number
  alternativeCost: number
  savings: number
  impactOnExperience: 'minimal' | 'moderate' | 'significant'
  confidence: number
  
  // Details for implementation
  currentItem: any
  alternativeItem: any
  swapInstructions: string
}

export interface BudgetConstraint {
  type: 'hard_ceiling' | 'soft_target' | 'category_limit' | 'daily_limit' | 'meal_limit'
  category?: string
  limit: number
  flexibility: number // 0-100, how much we can exceed this
  penalty: number // cost of violating this constraint
  description: string
}

export interface BudgetScenario {
  name: string
  description: string
  totalCost: number
  breakdown: Record<string, number>
  tradeoffs: string[]
  confidence: number
  experienceImpact: 'enhanced' | 'equivalent' | 'reduced'
}

export class BudgetController {
  private tripBrief: TripBrief
  private currentBreakdown: BudgetBreakdown
  private constraints: BudgetConstraint[] = []
  private scenarios: BudgetScenario[] = []
  
  constructor(tripBrief: TripBrief) {
    this.tripBrief = tripBrief
    this.currentBreakdown = this.initializeBudgetBreakdown()
    this.initializeConstraints()
  }
  
  // Initialize budget breakdown from trip brief
  private initializeBudgetBreakdown(): BudgetBreakdown {
    const totalBudget = this.tripBrief.budget?.total?.value || 0
    const currency = this.tripBrief.budget?.currency?.value || 'USD'
    const duration = this.tripBrief.dates?.duration?.value || 7
    
    // Default allocation percentages based on travel style and destination type
    const defaultAllocations = this.getDefaultAllocations()
    
    const allocations: BudgetAllocation[] = [
      {
        category: 'accommodation',
        allocated: Math.round(totalBudget * defaultAllocations.accommodation),
        spent: 0,
        remaining: Math.round(totalBudget * defaultAllocations.accommodation),
        percentage: defaultAllocations.accommodation * 100,
        flexibility: 'flexible',
        priority: 'essential'
      },
      {
        category: 'transport',
        allocated: Math.round(totalBudget * defaultAllocations.transport),
        spent: 0,
        remaining: Math.round(totalBudget * defaultAllocations.transport),
        percentage: defaultAllocations.transport * 100,
        flexibility: 'fixed',
        priority: 'essential'
      },
      {
        category: 'activities',
        allocated: Math.round(totalBudget * defaultAllocations.activities),
        spent: 0,
        remaining: Math.round(totalBudget * defaultAllocations.activities),
        percentage: defaultAllocations.activities * 100,
        flexibility: 'highly-flexible',
        priority: 'important'
      },
      {
        category: 'food',
        allocated: Math.round(totalBudget * defaultAllocations.food),
        spent: 0,
        remaining: Math.round(totalBudget * defaultAllocations.food),
        percentage: defaultAllocations.food * 100,
        flexibility: 'flexible',
        priority: 'essential'
      },
      {
        category: 'misc',
        allocated: Math.round(totalBudget * defaultAllocations.misc),
        spent: 0,
        remaining: Math.round(totalBudget * defaultAllocations.misc),
        percentage: defaultAllocations.misc * 100,
        flexibility: 'highly-flexible',
        priority: 'nice-to-have'
      }
    ]
    
    const emergencyBuffer = Math.round(totalBudget * 0.08) // 8% emergency buffer
    const contingencyFund = Math.round(totalBudget * 0.05) // 5% contingency
    
    return {
      total: totalBudget,
      currency,
      allocations,
      dailyLimit: Math.round(totalBudget / duration),
      mealLimits: this.calculateMealLimits(allocations.find(a => a.category === 'food')!.allocated, duration),
      emergencyBuffer,
      contingencyFund,
      committed: 0,
      reserved: 0,
      available: totalBudget - emergencyBuffer - contingencyFund,
      riskLevel: 'low',
      optimizationOpportunities: [],
      lastUpdated: new Date()
    }
  }
  
  // Get default allocation percentages based on travel style
  private getDefaultAllocations(): Record<string, number> {
    const style = this.tripBrief.preferences?.travelStyle?.value || 'mid-range'
    
    const allocationsByStyle = {
      'luxury': {
        accommodation: 0.45,
        transport: 0.20,
        activities: 0.15,
        food: 0.15,
        misc: 0.05
      },
      'mid-range': {
        accommodation: 0.35,
        transport: 0.25,
        activities: 0.20,
        food: 0.15,
        misc: 0.05
      },
      'budget': {
        accommodation: 0.25,
        transport: 0.30,
        activities: 0.25,
        food: 0.15,
        misc: 0.05
      },
      'mixed': {
        accommodation: 0.30,
        transport: 0.25,
        activities: 0.25,
        food: 0.15,
        misc: 0.05
      }
    }
    
    return allocationsByStyle[style]
  }
  
  // Calculate meal limits based on food allocation
  private calculateMealLimits(foodAllocation: number, duration: number): {
    breakfast: number
    lunch: number
    dinner: number
  } {
    const dailyFoodBudget = foodAllocation / duration
    
    return {
      breakfast: Math.round(dailyFoodBudget * 0.25), // 25% for breakfast
      lunch: Math.round(dailyFoodBudget * 0.35),     // 35% for lunch
      dinner: Math.round(dailyFoodBudget * 0.40)     // 40% for dinner
    }
  }
  
  // Initialize budget constraints
  private initializeConstraints(): void {
    // Hard ceiling - never exceed total budget
    this.constraints.push({
      type: 'hard_ceiling',
      limit: this.currentBreakdown.total,
      flexibility: 0,
      penalty: Infinity,
      description: 'Total budget hard limit'
    })
    
    // Category limits
    for (const allocation of this.currentBreakdown.allocations) {
      if (allocation.flexibility === 'fixed') {
        this.constraints.push({
          type: 'category_limit',
          category: allocation.category,
          limit: allocation.allocated,
          flexibility: 5, // 5% flexibility even for "fixed"
          penalty: 100,
          description: `${allocation.category} budget limit`
        })
      }
    }
    
    // Daily spending limits
    this.constraints.push({
      type: 'daily_limit',
      limit: this.currentBreakdown.dailyLimit,
      flexibility: 30, // Can exceed daily limit as long as total stays within budget
      penalty: 10,
      description: 'Daily spending guideline'
    })
    
    // Meal limits
    this.constraints.push({
      type: 'meal_limit',
      category: 'breakfast',
      limit: this.currentBreakdown.mealLimits.breakfast,
      flexibility: 50,
      penalty: 5,
      description: 'Breakfast spending limit'
    })
  }
  
  // Audit current itinerary against budget
  auditItinerary(itinerary: any): BudgetAuditResult {
    console.log('💰 Auditing itinerary against budget constraints...')
    
    const costs = this.extractCostsFromItinerary(itinerary)
    const violations = this.checkBudgetViolations(costs)
    const opportunities = this.identifyOptimizationOpportunities(costs, violations)
    const scenarios = this.generateBudgetScenarios(costs, opportunities)
    
    const audit: BudgetAuditResult = {
      totalCost: costs.total,
      breakdown: costs.breakdown,
      violations,
      riskLevel: this.calculateRiskLevel(costs, violations),
      optimizationOpportunities: opportunities,
      recommendedScenarios: scenarios,
      compliance: violations.length === 0,
      adjustmentsNeeded: violations.filter(v => v.severity === 'critical').length > 0,
      confidenceLevel: this.calculateAuditConfidence(costs),
      lastAudited: new Date()
    }
    
    console.log(`📊 Audit complete: ${audit.compliance ? '✅ Compliant' : '⚠️ Needs adjustments'}`)
    return audit
  }
  
  // Extract costs from itinerary
  private extractCostsFromItinerary(itinerary: any): ItineraryCosts {
    const costs: ItineraryCosts = {
      total: 0,
      breakdown: {
        accommodation: 0,
        transport: 0,
        activities: 0,
        food: 0,
        misc: 0
      },
      dailyCosts: [],
      confidence: 90
    }
    
    // Extract accommodation costs
    if (itinerary.hotel) {
      costs.breakdown.accommodation = itinerary.hotel.pricePerNight * (this.tripBrief.dates?.duration?.value || 1)
    }
    
    // Extract activity and dining costs from days
    if (itinerary.days) {
      for (const day of itinerary.days) {
        let dayTotal = 0
        
        if (day.activities) {
          for (const activity of day.activities) {
            const cost = activity.price || 0
            
            switch (activity.type) {
              case 'dining':
                costs.breakdown.food += cost
                break
              case 'activity':
                costs.breakdown.activities += cost
                break
              case 'logistics':
                costs.breakdown.transport += cost
                break
              default:
                costs.breakdown.misc += cost
            }
            
            dayTotal += cost
          }
        }
        
        costs.dailyCosts.push(dayTotal)
      }
    }
    
    costs.total = Object.values(costs.breakdown).reduce((sum, cost) => sum + cost, 0)
    
    return costs
  }
  
  // Check for budget violations
  private checkBudgetViolations(costs: ItineraryCosts): BudgetViolation[] {
    const violations: BudgetViolation[] = []
    
    // Check total budget
    if (costs.total > this.currentBreakdown.available) {
      violations.push({
        type: 'total_exceeded',
        category: 'total',
        limit: this.currentBreakdown.available,
        actual: costs.total,
        excess: costs.total - this.currentBreakdown.available,
        severity: 'critical',
        description: `Total cost exceeds available budget by ${this.formatCurrency(costs.total - this.currentBreakdown.available)}`
      })
    }
    
    // Check category limits
    for (const allocation of this.currentBreakdown.allocations) {
      const actualCost = costs.breakdown[allocation.category] || 0
      const maxAllowed = allocation.allocated * (1 + this.getFlexibilityMultiplier(allocation.flexibility))
      
      if (actualCost > maxAllowed) {
        violations.push({
          type: 'category_exceeded',
          category: allocation.category,
          limit: maxAllowed,
          actual: actualCost,
          excess: actualCost - maxAllowed,
          severity: allocation.priority === 'essential' ? 'critical' : 'warning',
          description: `${allocation.category} exceeds ${allocation.flexibility} limit by ${this.formatCurrency(actualCost - maxAllowed)}`
        })
      }
    }
    
    // Check daily limits
    const maxDailySpend = Math.max(...costs.dailyCosts)
    if (maxDailySpend > this.currentBreakdown.dailyLimit * 1.5) { // 50% tolerance for daily limits
      violations.push({
        type: 'daily_exceeded',
        category: 'daily',
        limit: this.currentBreakdown.dailyLimit,
        actual: maxDailySpend,
        excess: maxDailySpend - this.currentBreakdown.dailyLimit,
        severity: 'warning',
        description: `Highest daily spend (${this.formatCurrency(maxDailySpend)}) significantly exceeds daily guideline`
      })
    }
    
    return violations
  }
  
  // Identify optimization opportunities
  private identifyOptimizationOpportunities(
    costs: ItineraryCosts, 
    violations: BudgetViolation[]
  ): BudgetOptimization[] {
    
    const opportunities: BudgetOptimization[] = []
    
    // If accommodation is over budget, suggest alternatives
    if (violations.some(v => v.category === 'accommodation' || v.type === 'total_exceeded')) {
      const accommodationCost = costs.breakdown.accommodation
      const targetCost = this.currentBreakdown.allocations.find(a => a.category === 'accommodation')!.allocated
      
      if (accommodationCost > targetCost) {
        opportunities.push({
          type: 'accommodation_downgrade',
          description: 'Consider a slightly less expensive hotel with similar amenities',
          currentCost: accommodationCost,
          alternativeCost: targetCost,
          savings: accommodationCost - targetCost,
          impactOnExperience: 'minimal',
          confidence: 85,
          currentItem: null, // Would be populated with actual hotel data
          alternativeItem: null,
          swapInstructions: 'Look for 4-star instead of 5-star, or location slightly outside city center'
        })
      }
    }
    
    // If activities are over budget, suggest substitutions
    if (violations.some(v => v.category === 'activities')) {
      const activitiesCost = costs.breakdown.activities
      const targetCost = this.currentBreakdown.allocations.find(a => a.category === 'activities')!.allocated
      
      opportunities.push({
        type: 'activity_substitute',
        description: 'Replace some paid activities with free alternatives',
        currentCost: activitiesCost,
        alternativeCost: targetCost,
        savings: activitiesCost - targetCost,
        impactOnExperience: 'moderate',
        confidence: 70,
        currentItem: null,
        alternativeItem: null,
        swapInstructions: 'Replace paid museum visits with free walking tours, or paid tours with self-guided exploration'
      })
    }
    
    // If food is over budget, suggest meal adjustments
    if (violations.some(v => v.category === 'food')) {
      const foodCost = costs.breakdown.food
      const targetCost = this.currentBreakdown.allocations.find(a => a.category === 'food')!.allocated
      
      opportunities.push({
        type: 'meal_adjustment',
        description: 'Mix of restaurant meals and casual dining',
        currentCost: foodCost,
        alternativeCost: targetCost,
        savings: foodCost - targetCost,
        impactOnExperience: 'minimal',
        confidence: 90,
        currentItem: null,
        alternativeItem: null,
        swapInstructions: 'Have some meals at casual places, consider breakfast at hotel, lunch at cafes'
      })
    }
    
    // Transportation optimizations
    if (violations.some(v => v.category === 'transport')) {
      opportunities.push({
        type: 'transport_alternative',
        description: 'Use public transport instead of taxis for some journeys',
        currentCost: costs.breakdown.transport,
        alternativeCost: costs.breakdown.transport * 0.6,
        savings: costs.breakdown.transport * 0.4,
        impactOnExperience: 'minimal',
        confidence: 80,
        currentItem: null,
        alternativeItem: null,
        swapInstructions: 'Use metro/bus for longer distances, reserve taxis for airport transfers and late-night journeys'
      })
    }
    
    return opportunities.sort((a, b) => b.savings - a.savings) // Sort by potential savings
  }
  
  // Generate budget scenarios
  private generateBudgetScenarios(
    costs: ItineraryCosts, 
    opportunities: BudgetOptimization[]
  ): BudgetScenario[] {
    
    const scenarios: BudgetScenario[] = []
    
    // Current scenario
    scenarios.push({
      name: 'Current Plan',
      description: 'All selected options as planned',
      totalCost: costs.total,
      breakdown: costs.breakdown,
      tradeoffs: [],
      confidence: 95,
      experienceImpact: 'enhanced'
    })
    
    // Optimized scenario (apply top optimizations)
    if (opportunities.length > 0) {
      const optimizedBreakdown = { ...costs.breakdown }
      const tradeoffs: string[] = []
      let totalSavings = 0
      
      // Apply top 2-3 optimizations
      for (const opp of opportunities.slice(0, 3)) {
        optimizedBreakdown[opp.type.split('_')[0] as keyof typeof optimizedBreakdown] = opp.alternativeCost
        tradeoffs.push(opp.description)
        totalSavings += opp.savings
      }
      
      scenarios.push({
        name: 'Budget Optimized',
        description: 'Adjusted to fit budget while maintaining experience quality',
        totalCost: costs.total - totalSavings,
        breakdown: optimizedBreakdown,
        tradeoffs,
        confidence: 80,
        experienceImpact: 'equivalent'
      })
    }
    
    // Budget scenario (stay within original allocation)
    const budgetBreakdown = { ...costs.breakdown }
    const budgetTradeoffs: string[] = []
    
    for (const allocation of this.currentBreakdown.allocations) {
      if (budgetBreakdown[allocation.category] > allocation.allocated) {
        budgetBreakdown[allocation.category] = allocation.allocated
        budgetTradeoffs.push(`Reduced ${allocation.category} to stay within ${allocation.percentage}% allocation`)
      }
    }
    
    if (budgetTradeoffs.length > 0) {
      scenarios.push({
        name: 'Strict Budget',
        description: 'Stay within original category allocations',
        totalCost: Object.values(budgetBreakdown).reduce((sum, cost) => sum + cost, 0),
        breakdown: budgetBreakdown,
        tradeoffs: budgetTradeoffs,
        confidence: 70,
        experienceImpact: 'reduced'
      })
    }
    
    return scenarios
  }
  
  // Apply optimizations to itinerary
  async applyOptimizations(
    itinerary: any, 
    selectedOptimizations: BudgetOptimization[]
  ): Promise<{ updatedItinerary: any; actualSavings: number; changes: string[] }> {
    
    console.log(`🔧 Applying ${selectedOptimizations.length} budget optimizations...`)
    
    const updatedItinerary = { ...itinerary }
    let actualSavings = 0
    const changes: string[] = []
    
    for (const optimization of selectedOptimizations) {
      try {
        const result = await this.applySpecificOptimization(updatedItinerary, optimization)
        actualSavings += result.savings
        changes.push(result.description)
        
        console.log(`✅ Applied ${optimization.type}: saved ${this.formatCurrency(result.savings)}`)
      } catch (error) {
        console.warn(`⚠️ Could not apply ${optimization.type}: ${error}`)
        changes.push(`Could not apply ${optimization.description} - ${error}`)
      }
    }
    
    console.log(`💰 Total savings achieved: ${this.formatCurrency(actualSavings)}`)
    
    return {
      updatedItinerary,
      actualSavings,
      changes
    }
  }
  
  // Apply specific optimization
  private async applySpecificOptimization(
    itinerary: any, 
    optimization: BudgetOptimization
  ): Promise<{ savings: number; description: string }> {
    
    switch (optimization.type) {
      case 'accommodation_downgrade':
        return this.optimizeAccommodation(itinerary, optimization)
      
      case 'activity_substitute':
        return this.optimizeActivities(itinerary, optimization)
      
      case 'meal_adjustment':
        return this.optimizeDining(itinerary, optimization)
      
      case 'transport_alternative':
        return this.optimizeTransport(itinerary, optimization)
      
      default:
        throw new Error(`Unknown optimization type: ${optimization.type}`)
    }
  }
  
  // Optimize accommodation
  private async optimizeAccommodation(
    itinerary: any, 
    optimization: BudgetOptimization
  ): Promise<{ savings: number; description: string }> {
    
    if (itinerary.hotel) {
      const currentCost = itinerary.hotel.pricePerNight * (this.tripBrief.dates?.duration?.value || 1)
      const targetNightlyRate = optimization.alternativeCost / (this.tripBrief.dates?.duration?.value || 1)
      
      // Simulate finding a similar but less expensive hotel
      const originalRating = itinerary.hotel.rating
      const newRating = Math.max(3.5, originalRating - 0.3)
      
      itinerary.hotel.pricePerNight = targetNightlyRate
      itinerary.hotel.rating = newRating
      itinerary.hotel.name = itinerary.hotel.name.replace('Premium', 'Comfort').replace('Luxury', 'Quality')
      
      const actualSavings = currentCost - optimization.alternativeCost
      
      return {
        savings: actualSavings,
        description: `Switched to ${itinerary.hotel.name} (${newRating} stars) for ${this.formatCurrency(actualSavings)} savings`
      }
    }
    
    return { savings: 0, description: 'No accommodation found to optimize' }
  }
  
  // Optimize activities
  private async optimizeActivities(
    itinerary: any, 
    optimization: BudgetOptimization
  ): Promise<{ savings: number; description: string }> {
    
    let actualSavings = 0
    const changes: string[] = []
    
    if (itinerary.days) {
      for (const day of itinerary.days) {
        if (day.activities) {
          for (const activity of day.activities) {
            if (activity.type === 'activity' && activity.price > 30) {
              // Replace expensive activities with cheaper alternatives
              const originalPrice = activity.price
              const newPrice = Math.round(activity.price * 0.6) // 40% cheaper
              
              activity.price = newPrice
              activity.name = activity.name.replace('Premium', 'Standard').replace('Private', 'Small Group')
              activity.description = `Budget-friendly alternative: ${activity.description}`
              
              actualSavings += originalPrice - newPrice
              changes.push(`${activity.name} (saved ${this.formatCurrency(originalPrice - newPrice)})`)
              
              // Stop when we've achieved target savings
              if (actualSavings >= optimization.savings) break
            }
          }
          
          if (actualSavings >= optimization.savings) break
        }
      }
    }
    
    return {
      savings: actualSavings,
      description: `Optimized activities: ${changes.join(', ')}`
    }
  }
  
  // Optimize dining
  private async optimizeDining(
    itinerary: any, 
    optimization: BudgetOptimization
  ): Promise<{ savings: number; description: string }> {
    
    let actualSavings = 0
    const changes: string[] = []
    
    if (itinerary.days) {
      for (const day of itinerary.days) {
        if (day.activities) {
          for (const activity of day.activities) {
            if (activity.type === 'dining') {
              const originalPrice = activity.price
              
              // Adjust meal prices based on meal type
              if (activity.name.toLowerCase().includes('dinner') && originalPrice > 40) {
                activity.price = Math.round(originalPrice * 0.75) // 25% reduction for dinner
                changes.push(`${activity.name} (casual dining)`)
              } else if (activity.name.toLowerCase().includes('lunch') && originalPrice > 25) {
                activity.price = Math.round(originalPrice * 0.8) // 20% reduction for lunch
                changes.push(`${activity.name} (cafe style)`)
              }
              
              actualSavings += originalPrice - activity.price
              
              if (actualSavings >= optimization.savings) break
            }
          }
          
          if (actualSavings >= optimization.savings) break
        }
      }
    }
    
    return {
      savings: actualSavings,
      description: `Optimized dining: ${changes.join(', ')}`
    }
  }
  
  // Optimize transport
  private async optimizeTransport(
    itinerary: any, 
    optimization: BudgetOptimization
  ): Promise<{ savings: number; description: string }> {
    
    let actualSavings = 0
    const changes: string[] = []
    
    // This would integrate with the TwoRouteTransferComposer to find cheaper alternatives
    // For now, simulate the optimization
    
    if (itinerary.days) {
      for (const day of itinerary.days) {
        if (day.activities) {
          for (const activity of day.activities) {
            if (activity.type === 'logistics' && activity.price > 15) {
              const originalPrice = activity.price
              const newPrice = Math.round(originalPrice * 0.4) // Use public transport
              
              activity.price = newPrice
              activity.description = activity.description.replace('taxi', 'public transport')
              
              actualSavings += originalPrice - newPrice
              changes.push(`${activity.name} (public transport)`)
              
              if (actualSavings >= optimization.savings * 0.8) break // Target 80% of planned savings
            }
          }
        }
      }
    }
    
    return {
      savings: actualSavings,
      description: `Optimized transport: ${changes.join(', ')}`
    }
  }
  
  // Calculate risk level
  private calculateRiskLevel(costs: ItineraryCosts, violations: BudgetViolation[]): 'low' | 'medium' | 'high' {
    const totalExcess = violations.reduce((sum, v) => sum + v.excess, 0)
    const budgetUtilization = costs.total / this.currentBreakdown.available
    
    if (violations.some(v => v.severity === 'critical')) return 'high'
    if (budgetUtilization > 0.95 || totalExcess > this.currentBreakdown.total * 0.1) return 'medium'
    return 'low'
  }
  
  // Calculate audit confidence
  private calculateAuditConfidence(costs: ItineraryCosts): number {
    // Base confidence on data completeness and cost accuracy
    let confidence = costs.confidence
    
    // Reduce confidence if costs seem estimated
    const hasEstimatedCosts = costs.total % 5 === 0 // Round numbers suggest estimation
    if (hasEstimatedCosts) confidence -= 10
    
    // Reduce confidence if budget is very tight
    const budgetUtilization = costs.total / this.currentBreakdown.available
    if (budgetUtilization > 0.95) confidence -= 15
    
    return Math.max(50, confidence)
  }
  
  // Helper methods
  private getFlexibilityMultiplier(flexibility: string): number {
    switch (flexibility) {
      case 'fixed': return 0.05 // 5% flexibility
      case 'flexible': return 0.15 // 15% flexibility
      case 'highly-flexible': return 0.30 // 30% flexibility
      default: return 0.10
    }
  }
  
  private formatCurrency(amount: number): string {
    const currency = this.currentBreakdown.currency
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: currency 
    }).format(amount)
  }
  
  // Public getters
  getCurrentBreakdown(): BudgetBreakdown {
    return { ...this.currentBreakdown }
  }
  
  getBudgetConstraints(): BudgetConstraint[] {
    return [...this.constraints]
  }
  
  // Update budget allocation
  updateAllocation(category: string, newAmount: number): void {
    const allocation = this.currentBreakdown.allocations.find(a => a.category === category)
    if (allocation) {
      const difference = newAmount - allocation.allocated
      allocation.allocated = newAmount
      allocation.remaining = Math.max(0, newAmount - allocation.spent)
      
      // Adjust available budget
      this.currentBreakdown.available -= difference
      
      // Recalculate percentages
      for (const alloc of this.currentBreakdown.allocations) {
        alloc.percentage = (alloc.allocated / this.currentBreakdown.total) * 100
      }
      
      this.currentBreakdown.lastUpdated = new Date()
    }
  }
  
  // Record spending
  recordSpending(category: string, amount: number, description: string): void {
    const allocation = this.currentBreakdown.allocations.find(a => a.category === category)
    if (allocation) {
      allocation.spent += amount
      allocation.remaining = Math.max(0, allocation.allocated - allocation.spent)
      
      this.currentBreakdown.committed += amount
      this.currentBreakdown.available -= amount
      this.currentBreakdown.lastUpdated = new Date()
      
      console.log(`💸 Recorded spending: ${this.formatCurrency(amount)} for ${description} (${category})`)
    }
  }
}

// Supporting interfaces
export interface BudgetAuditResult {
  totalCost: number
  breakdown: Record<string, number>
  violations: BudgetViolation[]
  riskLevel: 'low' | 'medium' | 'high'
  optimizationOpportunities: BudgetOptimization[]
  recommendedScenarios: BudgetScenario[]
  compliance: boolean
  adjustmentsNeeded: boolean
  confidenceLevel: number
  lastAudited: Date
}

export interface BudgetViolation {
  type: 'total_exceeded' | 'category_exceeded' | 'daily_exceeded' | 'meal_exceeded'
  category: string
  limit: number
  actual: number
  excess: number
  severity: 'warning' | 'critical'
  description: string
}

export interface ItineraryCosts {
  total: number
  breakdown: Record<string, number>
  dailyCosts: number[]
  confidence: number
}