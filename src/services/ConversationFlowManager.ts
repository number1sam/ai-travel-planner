import { SlotFillingManager } from './SlotFillingManager';
import { SearchSpec, SlotCompleteness } from '../types/SearchSpec';

export interface FlowStep {
  step: string;
  question: string;
  required: boolean;
  completed: boolean;
  followup?: string;
}

export interface ConversationState {
  current_step: string;
  steps_completed: string[];
  flow_phase: 'initial' | 'core_collection' | 'preference_sweep' | 'confirmation' | 'search' | 'iteration';
  last_user_input: string;
  context_memory: string[];
}

export class ConversationFlowManager {
  private slotManager: SlotFillingManager;
  private state: ConversationState;

  constructor() {
    this.slotManager = new SlotFillingManager();
    this.state = {
      current_step: 'initial',
      steps_completed: [],
      flow_phase: 'initial',
      last_user_input: '',
      context_memory: []
    };
  }

  processUserMessage(message: string): {
    response: string;
    next_question?: string;
    flow_complete: boolean;
    search_ready: boolean;
    search_spec?: Partial<SearchSpec>;
  } {
    // Update context
    this.state.last_user_input = message;
    this.state.context_memory.push(message);
    if (this.state.context_memory.length > 5) {
      this.state.context_memory.shift();
    }

    // Extract entities from user message
    const extracted = this.slotManager.extractEntitiesFromText(message);
    this.slotManager.updateSearchSpec(extracted);

    const completeness = this.slotManager.getSlotCompleteness();
    const searchSpec = this.slotManager.getSearchSpec();

    // Determine response based on current phase and completeness
    const response = this.generateResponse(completeness, searchSpec);
    
    return {
      response: response.message,
      next_question: response.next_question,
      flow_complete: completeness.ready_for_search,
      search_ready: completeness.ready_for_search,
      search_spec: searchSpec
    };
  }

  private generateResponse(completeness: SlotCompleteness, searchSpec: Partial<SearchSpec>): {
    message: string;
    next_question?: string;
  } {
    // Initial phase: Start the conversation
    if (this.state.flow_phase === 'initial') {
      this.state.flow_phase = 'core_collection';
      return {
        message: "I'd love to help you plan your trip! Let me gather some key details to find the perfect options for you.",
        next_question: "Where are you thinking of going and when? Who's traveling?"
      };
    }

    // Core collection phase: Get essential info
    if (this.state.flow_phase === 'core_collection') {
      if (!completeness.core_complete) {
        return this.handleCoreCollection(completeness, searchSpec);
      } else {
        this.state.flow_phase = 'preference_sweep';
        return this.startPreferenceSweep(searchSpec);
      }
    }

    // Preference sweep phase: Gather preferences quickly
    if (this.state.flow_phase === 'preference_sweep') {
      if (!completeness.preferences_complete) {
        return this.handlePreferenceSweep(completeness, searchSpec);
      } else {
        this.state.flow_phase = 'confirmation';
        return this.generateConfirmation(searchSpec);
      }
    }

    // Confirmation phase: Confirm the spec
    if (this.state.flow_phase === 'confirmation') {
      this.state.flow_phase = 'search';
      return {
        message: "Perfect! Let me search for options that match your requirements...",
      };
    }

    return {
      message: "I have all the information I need. Ready to search!",
    };
  }

  private handleCoreCollection(completeness: SlotCompleteness, searchSpec: Partial<SearchSpec>): {
    message: string;
    next_question?: string;
  } {
    const missing = this.slotManager.getMissingSlots();

    if (!completeness.location) {
      return {
        message: "Great! I need to know where you'd like to go.",
        next_question: "Which city or region are you interested in visiting?"
      };
    }

    if (!completeness.dates) {
      const location = searchSpec.location?.city || searchSpec.location?.country || 'your destination';
      return {
        message: `${location} sounds wonderful!`,
        next_question: "When are you planning to travel and for how many nights?"
      };
    }

    if (!completeness.occupancy) {
      return {
        message: "Perfect!",
        next_question: "How many people will be traveling? Any children?"
      };
    }

    return {
      message: "I have the core details. Let me gather some preferences.",
    };
  }

  private startPreferenceSweep(searchSpec: Partial<SearchSpec>): {
    message: string;
    next_question?: string;
  } {
    const coreDetails = this.summarizeCoreDetails(searchSpec);
    
    return {
      message: `Got it! ${coreDetails}`,
      next_question: "Speed round—pick any that matter to you: vibe (quiet/party/boutique/luxury), must-haves (wifi/pool/step-free), food preferences (vegetarian/halal/kosher/gluten-free), or activity interests (culture/nature/adventure/wellness/food/nightlife/family)?"
    };
  }

  private handlePreferenceSweep(completeness: SlotCompleteness, searchSpec: Partial<SearchSpec>): {
    message: string;
    next_question?: string;
  } {
    if (!completeness.budget) {
      return {
        message: "Thanks for those preferences!",
        next_question: "What's your budget per night (or total trip budget)? I'll show prices in both USD and GBP."
      };
    }

    const hasBasicPrefs = this.hasBasicPreferences(searchSpec);
    if (!hasBasicPrefs) {
      return {
        message: "Great!",
        next_question: "Any deal-breakers? Things you absolutely must have or want to avoid?"
      };
    }

    return {
      message: "Perfect! I have everything I need.",
    };
  }

  private generateConfirmation(searchSpec: Partial<SearchSpec>): {
    message: string;
    next_question?: string;
  } {
    const summary = this.generateSearchSummary(searchSpec);
    
    return {
      message: `Let me confirm: ${summary}`,
      next_question: "Does this sound right? Any adjustments before I search?"
    };
  }

  private summarizeCoreDetails(searchSpec: Partial<SearchSpec>): string {
    const parts: string[] = [];

    if (searchSpec.dates?.nights) {
      parts.push(`${searchSpec.dates.nights} nights`);
    }

    if (searchSpec.location?.city) {
      parts.push(`in ${searchSpec.location.city}`);
    }

    if (searchSpec.dates?.checkin) {
      const date = new Date(searchSpec.dates.checkin);
      const month = date.toLocaleDateString('en', { month: 'long' });
      parts.push(`in ${month}`);
    }

    const occupancy = searchSpec.occupancy;
    if (occupancy) {
      const travelers = [];
      if (occupancy.adults && occupancy.adults > 0) {
        travelers.push(`${occupancy.adults} adult${occupancy.adults > 1 ? 's' : ''}`);
      }
      if (occupancy.children && occupancy.children.length > 0) {
        travelers.push(`${occupancy.children.length} child${occupancy.children.length > 1 ? 'ren' : ''}`);
      }
      if (travelers.length > 0) {
        parts.push(travelers.join(' and '));
      }
    }

    return parts.join(', ') || 'Your trip details';
  }

  private generateSearchSummary(searchSpec: Partial<SearchSpec>): string {
    const parts: string[] = [];

    // Core details
    if (searchSpec.dates?.nights && searchSpec.location?.city) {
      parts.push(`${searchSpec.dates.nights} nights in ${searchSpec.location.city}`);
    }

    if (searchSpec.dates?.checkin) {
      const date = new Date(searchSpec.dates.checkin);
      const month = date.toLocaleDateString('en', { month: 'long' });
      parts.push(`in ${month}`);
    }

    // Travelers
    const occupancy = searchSpec.occupancy;
    if (occupancy?.adults) {
      const travelers = [`${occupancy.adults} adult${occupancy.adults > 1 ? 's' : ''}`];
      if (occupancy.children?.length) {
        travelers.push(`${occupancy.children.length} child${occupancy.children.length > 1 ? 'ren' : ''}`);
      }
      parts.push(travelers.join(' and '));
    }

    // Accommodation preferences
    const accTypes = this.getSelectedTypes(searchSpec.accommodation?.types);
    if (accTypes.length > 0) {
      parts.push(accTypes.join(' or '));
    }

    // Vibe
    const vibes = this.getSelectedVibes(searchSpec.accommodation?.vibe);
    if (vibes.length > 0) {
      parts.push(vibes.join(' + '));
    }

    // Key features
    const features = this.getSelectedFeatures(searchSpec.accommodation?.features);
    const accessibility = this.getSelectedAccessibility(searchSpec.accommodation?.accessibility);
    const allFeatures = [...features, ...accessibility];
    if (allFeatures.length > 0) {
      parts.push(allFeatures.join(' + '));
    }

    // Budget
    if (searchSpec.budget?.per_night_cap) {
      parts.push(`under £${searchSpec.budget.per_night_cap}/night`);
    }

    return parts.join(', ');
  }

  private hasBasicPreferences(searchSpec: Partial<SearchSpec>): boolean {
    const acc = searchSpec.accommodation;
    if (!acc) return false;

    const hasTypes = Object.values(acc.types || {}).some(Boolean);
    const hasFeatures = Object.values(acc.features || {}).some(Boolean);
    const hasVibes = Object.values(acc.vibe || {}).some(Boolean);
    const hasAccessibility = Object.values(acc.accessibility || {}).some(Boolean);

    return hasTypes || hasFeatures || hasVibes || hasAccessibility;
  }

  private getSelectedTypes(types: any): string[] {
    if (!types) return [];
    return Object.keys(types).filter(key => types[key]);
  }

  private getSelectedVibes(vibes: any): string[] {
    if (!vibes) return [];
    return Object.keys(vibes).filter(key => vibes[key]);
  }

  private getSelectedFeatures(features: any): string[] {
    if (!features) return [];
    const selected = Object.keys(features).filter(key => features[key]);
    const mapping: Record<string, string> = {
      'wifi': 'wifi',
      'pool': 'pool',
      'spa': 'spa',
      'gym': 'gym',
      'kitchen': 'kitchen',
      'parking': 'parking',
      'front_desk_24h': '24h desk',
      'pet_friendly': 'pet-friendly'
    };
    return selected.map(key => mapping[key] || key);
  }

  private getSelectedAccessibility(accessibility: any): string[] {
    if (!accessibility) return [];
    const selected = Object.keys(accessibility).filter(key => accessibility[key]);
    const mapping: Record<string, string> = {
      'step_free': 'step-free',
      'lift': 'lift',
      'roll_in_shower': 'roll-in shower',
      'hearing_aids': 'hearing aids',
      'visual_aids': 'visual aids',
      'service_animal_friendly': 'service animal friendly'
    };
    return selected.map(key => mapping[key] || key);
  }

  getConversationState(): ConversationState {
    return { ...this.state };
  }

  getSearchSpec(): Partial<SearchSpec> {
    return this.slotManager.getSearchSpec();
  }

  getSlotCompleteness(): SlotCompleteness {
    return this.slotManager.getSlotCompleteness();
  }

  // For iterative refinement after showing results
  refineSearch(feedback: string): {
    response: string;
    search_spec: Partial<SearchSpec>;
  } {
    // Extract refinement from feedback
    const extracted = this.slotManager.extractEntitiesFromText(feedback);
    this.slotManager.updateSearchSpec(extracted);

    return {
      response: "Got it! Let me refine the search with your feedback...",
      search_spec: this.slotManager.getSearchSpec()
    };
  }

  // Reset for new conversation
  reset(): void {
    this.slotManager = new SlotFillingManager();
    this.state = {
      current_step: 'initial',
      steps_completed: [],
      flow_phase: 'initial',
      last_user_input: '',
      context_memory: []
    };
  }
}