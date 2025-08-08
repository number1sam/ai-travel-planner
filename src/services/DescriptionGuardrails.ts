// Guardrails to prevent destination descriptions from being generated for origins
// This is the "belt and braces" validation mentioned in the requirements

import { conversationStateService, type TripState } from './ConversationStateService'

interface DescriptionRequest {
  city: string
  type: 'destination' | 'tourist' | 'recommendation' | 'activity'
  conversationId: string
}

interface DescriptionResult {
  allowed: boolean
  reason?: string
  city?: string
}

class DescriptionGuardrailService {
  
  // The main guardrail: only allow descriptions for locked destinations
  async validateDescriptionRequest(request: DescriptionRequest): Promise<DescriptionResult> {
    try {
      const state = await conversationStateService.getState(request.conversationId)
      
      // Rule 1: If no destination is locked, no descriptions allowed
      if (!state.destination.locked || !state.destination.normalized) {
        return {
          allowed: false,
          reason: 'No destination locked yet'
        }
      }
      
      // Rule 2: Only the locked destination can be described
      const isLockedDestination = this.isSameCity(request.city, state.destination.normalized)
      
      if (!isLockedDestination) {
        // Check if this is the origin being described (the critical bug to prevent)
        const isOrigin = state.origin.locked && this.isSameCity(request.city, state.origin.normalized)
        
        return {
          allowed: false,
          reason: isOrigin 
            ? `BLOCKED: Cannot describe origin city ${request.city} as tourist destination`
            : `BLOCKED: Can only describe locked destination ${state.destination.normalized}, not ${request.city}`
        }
      }
      
      // Rule 3: Allow descriptions for locked destination
      return {
        allowed: true,
        city: state.destination.normalized
      }
      
    } catch (error) {
      console.error('Description guardrail error:', error)
      return {
        allowed: false,
        reason: 'Guardrail service error'
      }
    }
  }
  
  // Check if two city names refer to the same place
  private isSameCity(city1: string, city2: string): boolean {
    const normalize = (city: string) => city.toLowerCase().trim()
    
    const norm1 = normalize(city1)
    const norm2 = normalize(city2)
    
    // Direct match
    if (norm1 === norm2) return true
    
    // Check common aliases
    const aliases: Record<string, string[]> = {
      'new york': ['nyc', 'new york city', 'ny'],
      'san francisco': ['sf', 'san fran'],
      'los angeles': ['la', 'los angeles'],
      'london': ['london'],
      'paris': ['paris'],
      'tokyo': ['tokyo']
    }
    
    for (const [canonical, aliasList] of Object.entries(aliases)) {
      if ((norm1 === canonical && aliasList.includes(norm2)) ||
          (norm2 === canonical && aliasList.includes(norm1)) ||
          (aliasList.includes(norm1) && aliasList.includes(norm2))) {
        return true
      }
    }
    
    return false
  }
  
  // Wrapper for existing destination info functions
  async searchDestinationInfoGuarded(city: string, conversationId: string): Promise<any> {
    const validation = await this.validateDescriptionRequest({
      city,
      type: 'destination',
      conversationId
    })
    
    if (!validation.allowed) {
      console.warn('🚫 Description blocked:', validation.reason)
      return null
    }
    
    console.log('✅ Description allowed for locked destination:', validation.city)
    // Here you would call the actual destination info service
    return {
      name: validation.city,
      description: `${validation.city} is a wonderful travel destination.`,
      allowed: true
    }
  }
  
  // Wrapper for activity searches
  async searchActivitiesGuarded(city: string, conversationId: string): Promise<any> {
    const validation = await this.validateDescriptionRequest({
      city,
      type: 'activity',
      conversationId
    })
    
    if (!validation.allowed) {
      console.warn('🚫 Activity search blocked:', validation.reason)
      return null
    }
    
    console.log('✅ Activity search allowed for locked destination:', validation.city)
    return {
      city: validation.city,
      activities: [`Great activities in ${validation.city}`],
      allowed: true
    }
  }
  
  // Log all blocked attempts for monitoring
  logBlockedAttempt(city: string, conversationId: string, reason: string) {
    console.warn('🚫 GUARDRAIL BLOCK:', {
      city,
      conversationId,
      reason,
      timestamp: new Date().toISOString()
    })
  }
}

// Singleton instance
export const descriptionGuardrails = new DescriptionGuardrailService()
export { type DescriptionRequest, type DescriptionResult }