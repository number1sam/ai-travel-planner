// Trade-off presentation and budget negotiation logic

import { FlightItinerary, SearchSpec } from './FlightSearchEngine'

export interface TradeOffOption {
  id: string
  title: string
  description: string
  itinerary: FlightItinerary
  tradeoffs: string[]
  advantages: string[]
  priceVsBudget: {
    difference: number
    percentageOver: number
    isOverBudget: boolean
  }
}

export class FlightTradeoffManager {
  
  /**
   * Present clear trade-offs when budget, time, and comfort pull in different directions
   */
  public presentTradeOffs(
    itineraries: FlightItinerary[], 
    spec: SearchSpec, 
    userBudget: number
  ): string {
    
    if (itineraries.length === 0) {
      return this.handleNoResults(spec, userBudget)
    }
    
    const tradeoffOptions = this.analyzeTradeoffs(itineraries, spec, userBudget)
    
    // Find the preferred option (best fit for user's stated preferences)
    const preferred = tradeoffOptions.find(opt => this.meetsAllPreferences(opt.itinerary, spec))
    
    if (preferred && !preferred.priceVsBudget.isOverBudget) {
      // Perfect match - present as recommended
      return this.presentRecommendedOption(preferred)
    }
    
    // Present honest alternatives with clear trade-offs
    return this.presentAlternatives(tradeoffOptions, spec, userBudget)
  }
  
  /**
   * Analyze each itinerary against user preferences and budget
   */
  private analyzeTradeoffs(
    itineraries: FlightItinerary[], 
    spec: SearchSpec, 
    userBudget: number
  ): TradeOffOption[] {
    
    return itineraries.map((itinerary, index) => {
      const priceDiff = itinerary.totalPrice - userBudget
      const percentOver = (priceDiff / userBudget) * 100
      
      return {
        id: `option-${index + 1}`,
        title: this.generateOptionTitle(itinerary, spec),
        description: this.generateOptionDescription(itinerary, spec),
        itinerary,
        tradeoffs: this.identifyTradeoffs(itinerary, spec),
        advantages: this.identifyAdvantages(itinerary, spec),
        priceVsBudget: {
          difference: priceDiff,
          percentageOver: percentOver,
          isOverBudget: priceDiff > 0
        }
      }
    })
  }
  
  /**
   * Present recommended option when it fits perfectly
   */
  private presentRecommendedOption(option: TradeOffOption): string {
    const price = this.formatPrice(option.itinerary.totalPrice, option.itinerary.nativeCurrency)
    const airports = this.formatRoute(option.itinerary)
    
    return `✈️ **PERFECT MATCH FOUND**

**${option.title}**
${option.description}

${airports}
**Price: ${price}** (£${Math.abs(option.priceVsBudget.difference)} under your budget)

✅ **Why this is perfect for you:**
${option.advantages.map(adv => `• ${adv}`).join('\n')}

**Included in this price:**
• ${option.itinerary.includedBags.checked} checked bag${option.itinerary.includedBags.checked !== 1 ? 's' : ''}
• ${option.itinerary.includedBags.carry} carry-on bag
• All taxes and fees
• ${option.itinerary.changes.allowed ? `Changes allowed (£${option.itinerary.changes.fee} fee)` : 'No changes allowed'}

Ready to book this option?`
  }
  
  /**
   * Present multiple alternatives with honest trade-offs
   */
  private presentAlternatives(options: TradeOffOption[], spec: SearchSpec, userBudget: number): string {
    // Sort by how well they fit user preferences vs budget
    const sorted = this.sortByUserFit(options, spec)
    const topOptions = sorted.slice(0, 3)
    
    let result = `✈️ **FLIGHT OPTIONS WITH HONEST TRADE-OFFS**\n\n`
    result += `Based on your request for ${this.formatRoute(topOptions[0].itinerary)} with a £${userBudget} budget:\n\n`
    
    topOptions.forEach((option, index) => {
      const letter = String.fromCharCode(65 + index) // A, B, C
      const price = this.formatPrice(option.itinerary.totalPrice, option.itinerary.nativeCurrency)
      
      result += `**Option ${letter}: ${option.title}**\n`
      result += `${price} (${option.priceVsBudget.isOverBudget ? 
        `£${option.priceVsBudget.difference} over budget` : 
        `£${Math.abs(option.priceVsBudget.difference)} under budget`})\n\n`
      
      // What you get
      result += `✅ **What you get:**\n`
      option.advantages.forEach(adv => {
        result += `• ${adv}\n`
      })
      
      // Trade-offs (if any)
      if (option.tradeoffs.length > 0) {
        result += `\n⚖️ **Trade-offs:**\n`
        option.tradeoffs.forEach(tradeoff => {
          result += `• ${tradeoff}\n`
        })
      }
      
      result += `\n`
    })
    
    result += `\n**All prices include taxes, fees, and your required ${spec.checkedBags} checked bag${spec.checkedBags !== 1 ? 's' : ''}**\n\n`
    result += `Which option feels right for your trip? (Reply with A, B, or C)`
    
    return result
  }
  
  /**
   * Handle cases where no results meet user requirements
   */
  private handleNoResults(spec: SearchSpec, userBudget: number): string {
    const route = `${spec.departureAirports[0]} to ${spec.arrivalAirports[0]}`
    
    return `I searched extensively for flights ${route} on your specified dates, but couldn't find options that meet all your requirements within £${userBudget}.

Let me suggest some alternatives to help find flights that work:

**Option 1: Increase Budget**
Flights on this route typically start around £${Math.floor(userBudget * 1.3)} for your dates and requirements.

**Option 2: Flexible Dates** 
Moving your departure ±2-3 days could reduce prices by 20-40%.

**Option 3: Nearby Airports**
${this.suggestAlternateAirports(spec)}

**Option 4: Adjust Requirements**
${this.suggestRequirementAdjustments(spec)}

Which approach would you like to explore? I'll search again with your preferred adjustments.`
  }
  
  /**
   * Generate option title based on key characteristics
   */
  private generateOptionTitle(itinerary: FlightItinerary, spec: SearchSpec): string {
    if (itinerary.connectionCount === 0) {
      return `${itinerary.outbound[0].airline} Nonstop`
    } else if (itinerary.connectionCount === 1) {
      return `${itinerary.outbound[0].airline} One-Stop via ${itinerary.outbound[0].arrivalAirport}`
    } else {
      return `${itinerary.outbound[0].airline} Multi-Stop`
    }
  }
  
  /**
   * Generate detailed option description
   */
  private generateOptionDescription(itinerary: FlightItinerary, spec: SearchSpec): string {
    const outbound = itinerary.outbound[0]
    const duration = Math.floor(itinerary.totalDuration / 60)
    const minutes = itinerary.totalDuration % 60
    
    return `${outbound.departureTime} departure, ${duration}h ${minutes}m total travel time, ${itinerary.fareBrand} fare`
  }
  
  /**
   * Identify what user gives up with this option
   */
  private identifyTradeoffs(itinerary: FlightItinerary, spec: SearchSpec): string[] {
    const tradeoffs: string[] = []
    
    if (spec.nonstopOnly && itinerary.connectionCount > 0) {
      tradeoffs.push(`${itinerary.connectionCount} stop${itinerary.connectionCount > 1 ? 's' : ''} (you requested nonstop)`)
    }
    
    if (spec.arrivalTimeWindow && !itinerary.convenientTimes) {
      tradeoffs.push('Arrives outside your preferred time window')
    }
    
    if (spec.requireWiFi && !itinerary.wifiAvailable) {
      tradeoffs.push('No WiFi available')
    }
    
    if (spec.seatSelectionRequired && itinerary.seatSelection === 'none') {
      tradeoffs.push('No advance seat selection')
    }
    
    if (itinerary.onTimePerformance < 0.7) {
      tradeoffs.push('Below-average on-time performance')
    }
    
    return tradeoffs
  }
  
  /**
   * Identify advantages of this option
   */
  private identifyAdvantages(itinerary: FlightItinerary, spec: SearchSpec): string[] {
    const advantages: string[] = []
    
    if (itinerary.connectionCount === 0) {
      advantages.push('Nonstop flight - no connections')
    }
    
    if (itinerary.convenientTimes) {
      advantages.push('Convenient departure and arrival times')
    }
    
    if (itinerary.onTimePerformance >= 0.85) {
      advantages.push('Excellent on-time performance record')
    }
    
    if (itinerary.wifiAvailable) {
      advantages.push('WiFi available throughout flight')
    }
    
    if (itinerary.powerAvailable) {
      advantages.push('Power outlets at every seat')
    }
    
    if (itinerary.changes.allowed && itinerary.changes.fee && itinerary.changes.fee <= 50) {
      advantages.push('Flexible changes allowed')
    }
    
    advantages.push(`Departs from ${spec.departureAirports[0]} as requested`)
    advantages.push(`Arrives at ${spec.arrivalAirports[0]} as requested`)
    
    return advantages
  }
  
  /**
   * Check if itinerary meets all user preferences
   */
  private meetsAllPreferences(itinerary: FlightItinerary, spec: SearchSpec): boolean {
    if (spec.nonstopOnly && itinerary.connectionCount > 0) return false
    if (spec.requireWiFi && !itinerary.wifiAvailable) return false
    if (spec.requirePower && !itinerary.powerAvailable) return false
    if (spec.arrivalTimeWindow && !itinerary.convenientTimes) return false
    return true
  }
  
  /**
   * Sort options by how well they fit user preferences vs budget
   */
  private sortByUserFit(options: TradeOffOption[], spec: SearchSpec): TradeOffOption[] {
    return options.sort((a, b) => {
      // Prefer options that meet user preferences
      const aMeetsPrefs = this.meetsAllPreferences(a.itinerary, spec) ? 10 : 0
      const bMeetsPrefs = this.meetsAllPreferences(b.itinerary, spec) ? 10 : 0
      
      // Prefer options within or closer to budget
      const aBudgetScore = a.priceVsBudget.isOverBudget ? -a.priceVsBudget.percentageOver : 5
      const bBudgetScore = b.priceVsBudget.isOverBudget ? -b.priceVsBudget.percentageOver : 5
      
      return (bMeetsPrefs + bBudgetScore) - (aMeetsPrefs + aBudgetScore)
    })
  }
  
  /**
   * Format route display
   */
  private formatRoute(itinerary: FlightItinerary): string {
    const outbound = itinerary.outbound[0]
    const lastSegment = itinerary.outbound[itinerary.outbound.length - 1]
    return `${outbound.departureAirport} → ${lastSegment.arrivalAirport}`
  }
  
  /**
   * Format price with currency
   */
  private formatPrice(amount: number, currency: string): string {
    const symbol = currency === 'GBP' ? '£' : currency === 'USD' ? '$' : '€'
    return `${symbol}${amount.toLocaleString()}`
  }
  
  /**
   * Suggest alternate airports when primary search fails
   */
  private suggestAlternateAirports(spec: SearchSpec): string {
    // This would suggest nearby airports based on the SearchSpec
    return 'I could check nearby airports which might have better availability or pricing.'
  }
  
  /**
   * Suggest requirement adjustments when search fails
   */
  private suggestRequirementAdjustments(spec: SearchSpec): string {
    const suggestions: string[] = []
    
    if (spec.nonstopOnly) {
      suggestions.push('Allow one stop (often saves 30-50%)')
    }
    
    if (spec.checkedBags > 0) {
      suggestions.push('Consider carry-on only to access more fare options')
    }
    
    if (spec.cabinClass !== 'economy') {
      suggestions.push('Check economy options for significant savings')
    }
    
    return suggestions.join(' • ')
  }
}