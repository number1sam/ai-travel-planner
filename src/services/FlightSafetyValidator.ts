// Safety and practicality checks for flight recommendations

import { FlightItinerary, FlightSegment } from './FlightSearchEngine'

export interface SafetyCheck {
  type: 'connection_time' | 'airport_change' | 'self_transfer' | 'visa_warning' | 'overnight_connection'
  severity: 'error' | 'warning' | 'info'
  message: string
  recommendation?: string
}

export interface ConnectionRisk {
  segments: [FlightSegment, FlightSegment]
  riskLevel: 'low' | 'medium' | 'high' | 'impossible'
  actualTime: number
  minimumTime: number
  buffer: number
  factors: string[]
}

export class FlightSafetyValidator {
  
  // Minimum Connecting Times by airport (in minutes)
  private readonly MCT_DATA = {
    // Major European hubs
    'LHR': { domestic: 60, international: 75, same_terminal: 45, different_terminal: 90 },
    'CDG': { domestic: 60, international: 90, same_terminal: 60, different_terminal: 120 },
    'AMS': { domestic: 40, international: 50, same_terminal: 40, different_terminal: 70 },
    'FRA': { domestic: 45, international: 60, same_terminal: 45, different_terminal: 75 },
    'MUC': { domestic: 35, international: 45, same_terminal: 35, different_terminal: 60 },
    
    // London airports
    'LGW': { domestic: 45, international: 60, same_terminal: 45, different_terminal: 60 },
    'STN': { domestic: 30, international: 45, same_terminal: 30, different_terminal: 45 },
    'LCY': { domestic: 30, international: 45, same_terminal: 30, different_terminal: 45 },
    
    // US hubs (for reference)
    'JFK': { domestic: 90, international: 120, same_terminal: 60, different_terminal: 150 },
    'EWR': { domestic: 90, international: 120, same_terminal: 60, different_terminal: 120 }
  }
  
  // Terminal information for airport changes
  private readonly TERMINAL_DATA = {
    'LHR': {
      'T1': ['BA', 'AA'], 'T2': ['EI', 'LH', 'SQ'], 'T3': ['VS', 'DL', 'AF'], 'T4': ['KL', 'AF'], 'T5': ['BA', 'IB']
    },
    'CDG': {
      '1': ['AF', 'KL'], '2A': ['AF'], '2B': ['AF'], '2C': ['AF'], '2D': ['AF'], '2E': ['AF', 'DL'], '2F': ['AF'], '2G': ['AF']
    }
  }
  
  // Known problematic routes or combinations
  private readonly VISA_RISK_ROUTES = [
    { via: 'SVO', warning: 'Russian transit visa may be required' },
    { via: 'IST', warning: 'Check Turkish transit requirements' },
    { via: 'DOH', warning: 'Qatar transit visa requirements vary by nationality' },
    { via: 'DXB', warning: 'UAE transit visa may be required for some nationalities' }
  ]
  
  /**
   * Validate all safety and practicality aspects of an itinerary
   */
  public validateItinerary(itinerary: FlightItinerary): SafetyCheck[] {
    const checks: SafetyCheck[] = []
    
    // Check connections for outbound journey
    if (itinerary.outbound.length > 1) {
      checks.push(...this.validateConnections(itinerary.outbound))
    }
    
    // Check connections for inbound journey
    if (itinerary.inbound && itinerary.inbound.length > 1) {
      checks.push(...this.validateConnections(itinerary.inbound))
    }
    
    // Check for airport changes within a city
    checks.push(...this.checkAirportChanges(itinerary))
    
    // Check for visa/transit requirements
    checks.push(...this.checkVisaRequirements(itinerary))
    
    // Check for overnight connections
    checks.push(...this.checkOvernightConnections(itinerary))
    
    // Check for self-transfer risks
    checks.push(...this.checkSelfTransferRisks(itinerary))
    
    return checks
  }
  
  /**
   * Validate connection times between flight segments
   */
  private validateConnections(segments: FlightSegment[]): SafetyCheck[] {
    const checks: SafetyCheck[] = []
    
    for (let i = 0; i < segments.length - 1; i++) {
      const arriving = segments[i]
      const departing = segments[i + 1]
      
      const connectionTime = this.calculateConnectionTime(arriving, departing)
      const risk = this.assessConnectionRisk(arriving, departing, connectionTime)
      
      if (risk.riskLevel === 'impossible') {
        checks.push({
          type: 'connection_time',
          severity: 'error',
          message: `Impossible connection at ${departing.departureAirport}: ${risk.actualTime}min available, ${risk.minimumTime}min required`,
          recommendation: 'This connection cannot be made. Please choose a different routing.'
        })
      } else if (risk.riskLevel === 'high') {
        checks.push({
          type: 'connection_time',
          severity: 'warning', 
          message: `Risky connection at ${departing.departureAirport}: Only ${risk.actualTime}min to connect`,
          recommendation: `Consider allowing at least ${risk.minimumTime + 30}min for this connection. Risk factors: ${risk.factors.join(', ')}`
        })
      } else if (risk.riskLevel === 'medium') {
        checks.push({
          type: 'connection_time',
          severity: 'info',
          message: `Tight connection at ${departing.departureAirport}: ${risk.actualTime}min connection time`,
          recommendation: 'Connection is possible but may be stressful if first flight is delayed.'
        })
      }
    }
    
    return checks
  }
  
  /**
   * Calculate actual connection time between segments
   */
  private calculateConnectionTime(arriving: FlightSegment, departing: FlightSegment): number {
    const arrivalTime = new Date(`2024-01-01T${arriving.arrivalTime}:00`)
    const departureTime = new Date(`2024-01-01T${departing.departureTime}:00`)
    
    // Handle next-day connections
    if (departureTime < arrivalTime) {
      departureTime.setDate(departureTime.getDate() + 1)
    }
    
    return (departureTime.getTime() - arrivalTime.getTime()) / (1000 * 60)
  }
  
  /**
   * Assess connection risk level
   */
  private assessConnectionRisk(arriving: FlightSegment, departing: FlightSegment, actualTime: number): ConnectionRisk {
    const airport = departing.departureAirport
    const mctData = this.MCT_DATA[airport] || { domestic: 60, international: 90, same_terminal: 45, different_terminal: 120 }
    
    // Determine minimum connection time based on context
    let minimumTime = mctData.international // Conservative default
    const factors: string[] = []
    
    // Same airline/alliance usually has lower MCT
    if (arriving.airline === departing.airline) {
      minimumTime = Math.min(minimumTime, mctData.same_terminal)
      factors.push('same airline')
    } else {
      factors.push('different airlines')
    }
    
    // Terminal changes require more time
    if (this.requiresTerminalChange(arriving, departing, airport)) {
      minimumTime = mctData.different_terminal
      factors.push('terminal change required')
    }
    
    // International connections need more time
    if (this.isInternationalConnection(arriving, departing)) {
      minimumTime = Math.max(minimumTime, mctData.international)
      factors.push('international connection')
    }
    
    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'impossible'
    if (actualTime < minimumTime) {
      riskLevel = 'impossible'
    } else if (actualTime < minimumTime + 15) {
      riskLevel = 'high'
    } else if (actualTime < minimumTime + 30) {
      riskLevel = 'medium'  
    } else {
      riskLevel = 'low'
    }
    
    return {
      segments: [arriving, departing],
      riskLevel,
      actualTime,
      minimumTime,
      buffer: actualTime - minimumTime,
      factors
    }
  }
  
  /**
   * Check for airport changes within the same city
   */
  private checkAirportChanges(itinerary: FlightItinerary): SafetyCheck[] {
    const checks: SafetyCheck[] = []
    
    // Check outbound segments
    if (itinerary.outbound.length > 1) {
      checks.push(...this.checkSegmentAirportChanges(itinerary.outbound))
    }
    
    // Check inbound segments  
    if (itinerary.inbound && itinerary.inbound.length > 1) {
      checks.push(...this.checkSegmentAirportChanges(itinerary.inbound))
    }
    
    return checks
  }
  
  /**
   * Check segments for airport changes within a city
   */
  private checkSegmentAirportChanges(segments: FlightSegment[]): SafetyCheck[] {
    const checks: SafetyCheck[] = []
    
    for (let i = 0; i < segments.length - 1; i++) {
      const arriving = segments[i]
      const departing = segments[i + 1]
      
      if (arriving.arrivalAirport !== departing.departureAirport) {
        // Check if this is an airport change within the same city
        if (this.isSameCityAirportChange(arriving.arrivalAirport, departing.departureAirport)) {
          checks.push({
            type: 'airport_change',
            severity: 'warning',
            message: `Airport change required: ${arriving.arrivalAirport} arrival → ${departing.departureAirport} departure`,
            recommendation: 'You will need to travel between airports. Allow extra time and consider transportation costs.'
          })
        }
      }
    }
    
    return checks
  }
  
  /**
   * Check for transit visa requirements
   */
  private checkVisaRequirements(itinerary: FlightItinerary): SafetyCheck[] {
    const checks: SafetyCheck[] = []
    const transitAirports = new Set<string>()
    
    // Collect all transit airports
    itinerary.outbound.slice(0, -1).forEach(segment => {
      transitAirports.add(segment.arrivalAirport)
    })
    
    if (itinerary.inbound) {
      itinerary.inbound.slice(0, -1).forEach(segment => {
        transitAirports.add(segment.arrivalAirport)
      })
    }
    
    // Check each transit airport for visa requirements
    transitAirports.forEach(airport => {
      const riskRoute = this.VISA_RISK_ROUTES.find(route => route.via === airport)
      if (riskRoute) {
        checks.push({
          type: 'visa_warning',
          severity: 'warning',
          message: `Transit through ${airport}: ${riskRoute.warning}`,
          recommendation: 'Please verify transit visa requirements for your nationality before booking.'
        })
      }
    })
    
    return checks
  }
  
  /**
   * Check for overnight connections
   */
  private checkOvernightConnections(itinerary: FlightItinerary): SafetyCheck[] {
    const checks: SafetyCheck[] = []
    
    // Check outbound overnight connections
    checks.push(...this.checkSegmentOvernightConnections(itinerary.outbound))
    
    // Check inbound overnight connections
    if (itinerary.inbound) {
      checks.push(...this.checkSegmentOvernightConnections(itinerary.inbound))
    }
    
    return checks
  }
  
  /**
   * Check segments for overnight connections
   */
  private checkSegmentOvernightConnections(segments: FlightSegment[]): SafetyCheck[] {
    const checks: SafetyCheck[] = []
    
    for (let i = 0; i < segments.length - 1; i++) {
      const arriving = segments[i]
      const departing = segments[i + 1]
      
      const connectionHours = this.calculateConnectionTime(arriving, departing) / 60
      
      if (connectionHours >= 8) {
        checks.push({
          type: 'overnight_connection',
          severity: 'info',
          message: `Overnight layover at ${departing.departureAirport}: ${Math.floor(connectionHours)}h ${Math.floor((connectionHours % 1) * 60)}m`,
          recommendation: connectionHours >= 12 
            ? 'Long layover - consider exploring the city or airport hotel options'
            : 'Overnight connection - airport hotel or nearby accommodation may be needed'
        })
      }
    }
    
    return checks
  }
  
  /**
   * Check for self-transfer risks on separate tickets
   */
  private checkSelfTransferRisks(itinerary: FlightItinerary): SafetyCheck[] {
    const checks: SafetyCheck[] = []
    
    // This would check if segments are on separate tickets
    // For now, we assume all segments are on the same ticket
    // In a real implementation, this would analyze booking references and fare structures
    
    return checks
  }
  
  /**
   * Check if connection requires terminal change
   */
  private requiresTerminalChange(arriving: FlightSegment, departing: FlightSegment, airport: string): boolean {
    const terminalData = this.TERMINAL_DATA[airport]
    if (!terminalData) return false
    
    // Find terminals for each airline
    let arrivingTerminal = ''
    let departingTerminal = ''
    
    for (const [terminal, airlines] of Object.entries(terminalData)) {
      if (Array.isArray(airlines) && airlines.includes(arriving.airline)) arrivingTerminal = terminal
      if (Array.isArray(airlines) && airlines.includes(departing.airline)) departingTerminal = terminal
    }
    
    return arrivingTerminal !== departingTerminal && arrivingTerminal !== '' && departingTerminal !== ''
  }
  
  /**
   * Check if connection crosses international boundaries
   */
  private isInternationalConnection(arriving: FlightSegment, departing: FlightSegment): boolean {
    // This would check country codes for airports
    // For simplicity, assume any connection involving non-UK/EU airports is international
    const euAirports = ['LHR', 'LGW', 'LCY', 'LTN', 'STN', 'MAN', 'EDI', 'CDG', 'ORY', 'AMS', 'FRA', 'MUC', 'BCN', 'MAD']
    
    const arrivingEU = euAirports.includes(arriving.arrivalAirport)
    const departingEU = euAirports.includes(departing.departureAirport)
    
    return arrivingEU !== departingEU
  }
  
  /**
   * Check if airports are in the same city but different locations
   */
  private isSameCityAirportChange(airport1: string, airport2: string): boolean {
    const londonAirports = ['LHR', 'LGW', 'LCY', 'LTN', 'STN']
    const parisAirports = ['CDG', 'ORY', 'BVA']
    const nyAirports = ['JFK', 'EWR', 'LGA']
    
    const cityGroups = [londonAirports, parisAirports, nyAirports]
    
    return cityGroups.some(group => 
      group.includes(airport1) && group.includes(airport2) && airport1 !== airport2
    )
  }
  
  /**
   * Generate a summary of all safety concerns for user presentation
   */
  public generateSafetySummary(checks: SafetyCheck[]): string {
    if (checks.length === 0) {
      return '✅ **Safety Check: All Clear**\nThis itinerary meets all safety and practicality requirements.'
    }
    
    const errors = checks.filter(c => c.severity === 'error')
    const warnings = checks.filter(c => c.severity === 'warning')
    const info = checks.filter(c => c.severity === 'info')
    
    let summary = ''
    
    if (errors.length > 0) {
      summary += '🚨 **Critical Issues:**\n'
      errors.forEach(error => {
        summary += `• ${error.message}\n`
        if (error.recommendation) {
          summary += `  → ${error.recommendation}\n`
        }
      })
      summary += '\n'
    }
    
    if (warnings.length > 0) {
      summary += '⚠️ **Important Warnings:**\n'
      warnings.forEach(warning => {
        summary += `• ${warning.message}\n`
        if (warning.recommendation) {
          summary += `  → ${warning.recommendation}\n`
        }
      })
      summary += '\n'
    }
    
    if (info.length > 0) {
      summary += 'ℹ️ **Good to Know:**\n'
      info.forEach(infoItem => {
        summary += `• ${infoItem.message}\n`
        if (infoItem.recommendation) {
          summary += `  → ${infoItem.recommendation}\n`
        }
      })
    }
    
    return summary.trim()
  }
}