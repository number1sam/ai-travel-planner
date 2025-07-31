import { prisma } from '@/lib/prisma'

export interface AccessibilityRequirement {
  wheelchairAccessible: boolean
  hearingImpaired: boolean
  visuallyImpaired: boolean
  mobilityAssistance: boolean
  dietaryRestrictions: string[]
  medicationRequirements: string[]
  serviceAnimalAccommodation: boolean
  signLanguageSupport: boolean
}

export interface LocationAccessibility {
  id: string
  placeId: string
  name: string
  address: string
  wheelchairAccessible: boolean
  hearingLoop: boolean
  brailleMenu: boolean
  wheelchairParking: boolean
  accessibleRestroom: boolean
  elevatorAccess: boolean
  rampAccess: boolean
  accessibilityRating: number // 1-5 scale
  accessibilityFeatures: string[]
  lastUpdated: Date
}

export interface DistanceCalculation {
  origin: string
  destination: string
  distance: number // in meters
  duration: number // in seconds
  walkingDistance?: number
  walkingDuration?: number
  accessibleRoute: boolean
  steps: RouteStep[]
}

export interface RouteStep {
  instruction: string
  distance: number
  duration: number
  coordinates: { lat: number; lng: number }[]
  accessibilityNotes?: string[]
}

export class AccessibilityService {
  private static readonly GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY
  private static readonly MAX_WALKING_DISTANCE = 1000 // 1km in meters
  private static readonly ACCESSIBILITY_RADIUS = 500 // 500m radius for accessibility search

  /**
   * Get user's accessibility requirements
   */
  static async getUserAccessibilityProfile(userId: string): Promise<AccessibilityRequirement | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { preferences: true }
      })

      if (!user || !user.preferences.length) return null

      const profile = user.preferences[0]
      
      return {
        wheelchairAccessible: profile.wheelchairAccessible || false,
        hearingImpaired: profile.hearingImpaired || false,
        visuallyImpaired: profile.visuallyImpaired || false,
        mobilityAssistance: profile.mobilityAssistance || false,
        dietaryRestrictions: profile.dietaryRestrictions ? JSON.parse(profile.dietaryRestrictions as string) : [],
        medicationRequirements: profile.medicationRequirements ? JSON.parse(profile.medicationRequirements as string) : [],
        serviceAnimalAccommodation: profile.serviceAnimalAccommodation || false,
        signLanguageSupport: profile.signLanguageSupport || false
      }
    } catch (error) {
      console.error('AccessibilityService: Error getting user accessibility profile:', error)
      return null
    }
  }

  /**
   * Calculate distance and duration between two locations
   */
  static async calculateDistance(
    origin: string,
    destination: string,
    travelMode: 'walking' | 'driving' | 'transit' = 'walking'
  ): Promise<DistanceCalculation | null> {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?` +
        `origin=${encodeURIComponent(origin)}&` +
        `destination=${encodeURIComponent(destination)}&` +
        `mode=${travelMode}&` +
        `key=${this.GOOGLE_MAPS_API_KEY}`
      )

      const data = await response.json()

      if (data.status !== 'OK' || !data.routes.length) {
        console.error('AccessibilityService: No routes found')
        return null
      }

      const route = data.routes[0]
      const leg = route.legs[0]

      // Check if route is accessible
      const accessibleRoute = await this.analyzeRouteAccessibility(route)

      const steps: RouteStep[] = leg.steps.map((step: any) => ({
        instruction: step.html_instructions.replace(/<[^>]*>/g, ''), // Strip HTML
        distance: step.distance.value,
        duration: step.duration.value,
        coordinates: this.decodePolyline(step.polyline.points),
        accessibilityNotes: this.getStepAccessibilityNotes(step)
      }))

      return {
        origin: leg.start_address,
        destination: leg.end_address,
        distance: leg.distance.value,
        duration: leg.duration.value,
        walkingDistance: travelMode === 'walking' ? leg.distance.value : undefined,
        walkingDuration: travelMode === 'walking' ? leg.duration.value : undefined,
        accessibleRoute,
        steps
      }
    } catch (error) {
      console.error('AccessibilityService: Error calculating distance:', error)
      return null
    }
  }

  /**
   * Find accessible venues near a location
   */
  static async findAccessibleVenues(
    location: string,
    type: 'restaurant' | 'hotel' | 'attraction' | 'hospital' = 'restaurant',
    accessibilityRequirements: AccessibilityRequirement
  ): Promise<LocationAccessibility[]> {
    try {
      // First, get coordinates for the location
      const geocodeResponse = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?` +
        `address=${encodeURIComponent(location)}&` +
        `key=${this.GOOGLE_MAPS_API_KEY}`
      )

      const geocodeData = await geocodeResponse.json()
      if (!geocodeData.results.length) return []

      const { lat, lng } = geocodeData.results[0].geometry.location

      // Search for places nearby
      const placesResponse = await fetch(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?` +
        `location=${lat},${lng}&` +
        `radius=${this.ACCESSIBILITY_RADIUS}&` +
        `type=${type}&` +
        `key=${this.GOOGLE_MAPS_API_KEY}`
      )

      const placesData = await placesResponse.json()
      const venues: LocationAccessibility[] = []

      for (const place of placesData.results.slice(0, 10)) {
        const accessibility = await this.getPlaceAccessibility(place.place_id)
        
        // Filter based on accessibility requirements
        if (this.matchesAccessibilityRequirements(accessibility, accessibilityRequirements)) {
          venues.push({
            id: place.place_id,
            placeId: place.place_id,
            name: place.name,
            address: place.vicinity,
            wheelchairAccessible: accessibility.wheelchairAccessible,
            hearingLoop: accessibility.hearingLoop,
            brailleMenu: accessibility.brailleMenu,
            wheelchairParking: accessibility.wheelchairParking,
            accessibleRestroom: accessibility.accessibleRestroom,
            elevatorAccess: accessibility.elevatorAccess,
            rampAccess: accessibility.rampAccess,
            accessibilityRating: accessibility.accessibilityRating,
            accessibilityFeatures: accessibility.accessibilityFeatures,
            lastUpdated: new Date()
          })
        }
      }

      return venues
    } catch (error) {
      console.error('AccessibilityService: Error finding accessible venues:', error)
      return []
    }
  }

  /**
   * Get detailed accessibility information for a specific place
   */
  static async getPlaceAccessibility(placeId: string): Promise<LocationAccessibility> {
    try {
      // Check if we have cached accessibility data
      const cached = await prisma.locationAccessibility.findUnique({
        where: { placeId }
      })

      if (cached && this.isCacheValid(cached.lastUpdated)) {
        return cached
      }

      // Get place details from Google Places API
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?` +
        `place_id=${placeId}&` +
        `fields=name,formatted_address,wheelchair_accessible_entrance,reviews&` +
        `key=${this.GOOGLE_MAPS_API_KEY}`
      )

      const data = await response.json()
      const place = data.result

      // Analyze accessibility from various sources
      const accessibility = this.analyzeAccessibilityData(place)

      // Cache the result
      const locationAccessibility = await prisma.locationAccessibility.upsert({
        where: { placeId },
        update: {
          name: place.name,
          address: place.formatted_address,
          wheelchairAccessible: accessibility.wheelchairAccessible,
          hearingLoop: accessibility.hearingLoop,
          brailleMenu: accessibility.brailleMenu,
          wheelchairParking: accessibility.wheelchairParking,
          accessibleRestroom: accessibility.accessibleRestroom,
          elevatorAccess: accessibility.elevatorAccess,
          rampAccess: accessibility.rampAccess,
          accessibilityRating: accessibility.accessibilityRating,
          accessibilityFeatures: accessibility.accessibilityFeatures,
          lastUpdated: new Date()
        },
        create: {
          placeId,
          name: place.name,
          address: place.formatted_address,
          wheelchairAccessible: accessibility.wheelchairAccessible,
          hearingLoop: accessibility.hearingLoop,
          brailleMenu: accessibility.brailleMenu,
          wheelchairParking: accessibility.wheelchairParking,
          accessibleRestroom: accessibility.accessibleRestroom,
          elevatorAccess: accessibility.elevatorAccess,
          rampAccess: accessibility.rampAccess,
          accessibilityRating: accessibility.accessibilityRating,
          accessibilityFeatures: accessibility.accessibilityFeatures,
          lastUpdated: new Date()
        }
      })

      return locationAccessibility
    } catch (error) {
      console.error('AccessibilityService: Error getting place accessibility:', error)
      
      // Return basic accessibility data as fallback
      return {
        id: placeId,
        placeId,
        name: 'Unknown',
        address: 'Unknown',
        wheelchairAccessible: false,
        hearingLoop: false,
        brailleMenu: false,
        wheelchairParking: false,
        accessibleRestroom: false,
        elevatorAccess: false,
        rampAccess: false,
        accessibilityRating: 0,
        accessibilityFeatures: [],
        lastUpdated: new Date()
      }
    }
  }

  /**
   * Optimize itinerary for accessibility and minimal walking distance
   */
  static async optimizeItineraryForAccessibility(
    activities: Array<{ id: string; name: string; location: string; duration: number }>,
    userLocation: string,
    accessibilityRequirements: AccessibilityRequirement
  ): Promise<Array<{ 
    activity: any; 
    order: number; 
    distanceFromPrevious?: DistanceCalculation;
    accessibilityScore: number;
    recommendations: string[];
  }>> {
    try {
      const optimizedItinerary = []
      let currentLocation = userLocation
      let totalWalkingDistance = 0

      // Calculate distances between all activities
      const distanceMatrix: { [key: string]: DistanceCalculation } = {}
      
      for (let i = 0; i < activities.length; i++) {
        for (let j = 0; j < activities.length; j++) {
          if (i !== j) {
            const key = `${i}-${j}`
            const distance = await this.calculateDistance(
              activities[i].location,
              activities[j].location
            )
            if (distance) {
              distanceMatrix[key] = distance
            }
          }
        }
      }

      // Greedy algorithm to minimize walking distance while considering accessibility
      const visited = new Set<number>()
      let currentIndex = -1

      for (let step = 0; step < activities.length; step++) {
        let bestIndex = -1
        let bestScore = -1

        for (let i = 0; i < activities.length; i++) {
          if (visited.has(i)) continue

          let score = 0

          // Accessibility score (0-100)
          const accessibility = await this.getPlaceAccessibility(activities[i].id)
          const accessibilityScore = this.calculateAccessibilityScore(accessibility, accessibilityRequirements)
          score += accessibilityScore * 0.7 // 70% weight for accessibility

          // Distance score (0-30)
          if (currentIndex >= 0) {
            const distanceKey = `${currentIndex}-${i}`
            const distance = distanceMatrix[distanceKey]
            if (distance) {
              const distanceScore = Math.max(0, 30 - (distance.distance / 1000) * 5) // Penalty for distance
              score += distanceScore * 0.3 // 30% weight for distance
            }
          } else {
            score += 30 // No distance penalty for first activity
          }

          if (score > bestScore) {
            bestScore = score
            bestIndex = i
          }
        }

        if (bestIndex >= 0) {
          visited.add(bestIndex)
          const activity = activities[bestIndex]

          let distanceFromPrevious: DistanceCalculation | undefined
          if (currentIndex >= 0) {
            const distanceKey = `${currentIndex}-${bestIndex}`
            distanceFromPrevious = distanceMatrix[distanceKey]
            if (distanceFromPrevious) {
              totalWalkingDistance += distanceFromPrevious.distance
            }
          }

          const accessibility = await this.getPlaceAccessibility(activity.id)
          const accessibilityScore = this.calculateAccessibilityScore(accessibility, accessibilityRequirements)
          const recommendations = this.generateAccessibilityRecommendations(accessibility, accessibilityRequirements)

          optimizedItinerary.push({
            activity,
            order: step + 1,
            distanceFromPrevious,
            accessibilityScore,
            recommendations
          })

          currentIndex = bestIndex
        }
      }

      // Check if total walking distance exceeds limits
      if (totalWalkingDistance > this.MAX_WALKING_DISTANCE && accessibilityRequirements.mobilityAssistance) {
        // Suggest alternative transportation between distant locations
        optimizedItinerary.forEach(item => {
          if (item.distanceFromPrevious && item.distanceFromPrevious.distance > 500) {
            item.recommendations.push(
              'Consider using accessible transportation (taxi, accessible bus) due to distance and mobility requirements'
            )
          }
        })
      }

      return optimizedItinerary
    } catch (error) {
      console.error('AccessibilityService: Error optimizing itinerary:', error)
      return activities.map((activity, index) => ({
        activity,
        order: index + 1,
        accessibilityScore: 50, // Default score
        recommendations: ['Accessibility information not available']
      }))
    }
  }

  /**
   * Private helper methods
   */
  private static analyzeRouteAccessibility(route: any): boolean {
    // Analyze route for accessibility barriers
    // This is a simplified version - in reality, you'd need more sophisticated analysis
    
    const steps = route.legs[0].steps
    let accessibilityIssues = 0

    for (const step of steps) {
      // Check for potential accessibility barriers
      const instruction = step.html_instructions.toLowerCase()
      
      if (instruction.includes('stairs') || 
          instruction.includes('steep') ||
          instruction.includes('narrow') ||
          instruction.includes('construction')) {
        accessibilityIssues++
      }
    }

    return accessibilityIssues === 0
  }

  private static decodePolyline(encoded: string): { lat: number; lng: number }[] {
    // Simplified polyline decoding - in production, use a proper library
    const points = []
    let index = 0
    const len = encoded.length
    let lat = 0
    let lng = 0

    while (index < len) {
      let b, shift = 0, result = 0
      do {
        b = encoded.charCodeAt(index++) - 63
        result |= (b & 0x1f) << shift
        shift += 5
      } while (b >= 0x20)
      const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1))
      lat += dlat

      shift = 0
      result = 0
      do {
        b = encoded.charCodeAt(index++) - 63
        result |= (b & 0x1f) << shift
        shift += 5
      } while (b >= 0x20)
      const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1))
      lng += dlng

      points.push({ lat: lat / 1E5, lng: lng / 1E5 })
    }

    return points
  }

  private static getStepAccessibilityNotes(step: any): string[] {
    const notes = []
    const instruction = step.html_instructions.toLowerCase()

    if (instruction.includes('stairs')) {
      notes.push('Contains stairs - not wheelchair accessible')
    }
    if (instruction.includes('steep')) {
      notes.push('Steep incline - may be difficult for mobility assistance users')
    }
    if (instruction.includes('narrow')) {
      notes.push('Narrow path - check width for wheelchair access')
    }

    return notes
  }

  private static analyzeAccessibilityData(place: any) {
    const accessibility = {
      wheelchairAccessible: place.wheelchair_accessible_entrance || false,
      hearingLoop: false,
      brailleMenu: false,
      wheelchairParking: false,
      accessibleRestroom: false,
      elevatorAccess: false,
      rampAccess: false,
      accessibilityRating: 0,
      accessibilityFeatures: [] as string[]
    }

    // Analyze reviews for accessibility mentions
    if (place.reviews) {
      for (const review of place.reviews) {
        const text = review.text.toLowerCase()
        
        if (text.includes('wheelchair') || text.includes('accessible')) {
          accessibility.accessibilityRating += 1
          accessibility.accessibilityFeatures.push('Mentioned as accessible in reviews')
        }
        if (text.includes('hearing loop') || text.includes('hearing aid')) {
          accessibility.hearingLoop = true
          accessibility.accessibilityFeatures.push('Hearing loop available')
        }
        if (text.includes('braille')) {
          accessibility.brailleMenu = true
          accessibility.accessibilityFeatures.push('Braille menu available')
        }
        if (text.includes('elevator')) {
          accessibility.elevatorAccess = true
          accessibility.accessibilityFeatures.push('Elevator access')
        }
        if (text.includes('ramp')) {
          accessibility.rampAccess = true
          accessibility.accessibilityFeatures.push('Ramp access')
        }
      }
    }

    // Normalize rating (0-5 scale)
    accessibility.accessibilityRating = Math.min(5, accessibility.accessibilityRating)

    return accessibility
  }

  private static matchesAccessibilityRequirements(
    accessibility: LocationAccessibility,
    requirements: AccessibilityRequirement
  ): boolean {
    if (requirements.wheelchairAccessible && !accessibility.wheelchairAccessible) {
      return false
    }
    if (requirements.hearingImpaired && !accessibility.hearingLoop) {
      return false
    }
    if (requirements.visuallyImpaired && !accessibility.brailleMenu) {
      return false
    }

    return true
  }

  private static calculateAccessibilityScore(
    accessibility: LocationAccessibility,
    requirements: AccessibilityRequirement
  ): number {
    let score = 0
    let maxScore = 0

    // Wheelchair accessibility
    if (requirements.wheelchairAccessible) {
      maxScore += 30
      if (accessibility.wheelchairAccessible) score += 30
      if (accessibility.rampAccess) score += 5
      if (accessibility.elevatorAccess) score += 5
    }

    // Hearing impairment support
    if (requirements.hearingImpaired) {
      maxScore += 20
      if (accessibility.hearingLoop) score += 20
    }

    // Visual impairment support
    if (requirements.visuallyImpaired) {
      maxScore += 20
      if (accessibility.brailleMenu) score += 20
    }

    // General accessibility features
    maxScore += 30
    score += accessibility.accessibilityRating * 6 // 0-5 rating scaled to 0-30

    return maxScore > 0 ? Math.round((score / maxScore) * 100) : 50
  }

  private static generateAccessibilityRecommendations(
    accessibility: LocationAccessibility,
    requirements: AccessibilityRequirement
  ): string[] {
    const recommendations = []

    if (requirements.wheelchairAccessible) {
      if (!accessibility.wheelchairAccessible) {
        recommendations.push('This location may not be wheelchair accessible - call ahead to confirm')
      }
      if (!accessibility.accessibleRestroom) {
        recommendations.push('Accessible restroom availability unknown - inquire before visiting')
      }
    }

    if (requirements.hearingImpaired && !accessibility.hearingLoop) {
      recommendations.push('No hearing loop detected - bring personal hearing assistance if needed')
    }

    if (requirements.visuallyImpaired && !accessibility.brailleMenu) {
      recommendations.push('Braille menu not available - staff assistance may be needed')
    }

    if (requirements.serviceAnimalAccommodation) {
      recommendations.push('Ensure service animal accommodation is available')
    }

    if (accessibility.accessibilityRating < 3) {
      recommendations.push('Limited accessibility information available - contact venue directly')
    }

    return recommendations
  }

  private static isCacheValid(lastUpdated: Date): boolean {
    const cacheExpiryHours = 24 * 7 // 1 week
    const expiryTime = new Date(lastUpdated.getTime() + cacheExpiryHours * 60 * 60 * 1000)
    return new Date() < expiryTime
  }
}