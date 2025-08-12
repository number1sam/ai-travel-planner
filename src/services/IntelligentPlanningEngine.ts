import { ConversationFlowManager } from './ConversationFlowManager';
import { SearchScoringEngine, RawAccommodationData } from './SearchScoringEngine';
import { ResultPresentationService } from './ResultPresentationService';
import { CurrencyDisplayService } from './CurrencyDisplayService';
import { SearchSpec, SearchResult } from '../types/SearchSpec';

export interface PlanningEngineConfig {
  enableMemoryPersistence: boolean;
  maxResultsToShow: number;
  defaultCurrencies: string[];
  enableIterativeRefinement: boolean;
}

export interface PlanningResponse {
  type: 'question' | 'results' | 'refinement' | 'confirmation' | 'error';
  message: string;
  next_question?: string;
  results?: {
    formatted_display: string;
    raw_results: SearchResult[];
    presentation: any;
  };
  search_spec?: Partial<SearchSpec>;
  flow_complete?: boolean;
  iteration_suggestions?: Array<{
    text: string;
    refinement: Partial<SearchSpec>;
    description: string;
  }>;
  error?: string;
}

export class IntelligentPlanningEngine {
  private flowManager: ConversationFlowManager;
  private scoringEngine: SearchScoringEngine;
  private presentationService: ResultPresentationService;
  private currencyService: CurrencyDisplayService;
  private config: PlanningEngineConfig;
  
  // Memory for user preferences across conversations
  private userMemory: Map<string, any> = new Map();

  constructor(config: Partial<PlanningEngineConfig> = {}) {
    this.config = {
      enableMemoryPersistence: true,
      maxResultsToShow: 6,
      defaultCurrencies: ['USD', 'GBP'],
      enableIterativeRefinement: true,
      ...config
    };

    this.flowManager = new ConversationFlowManager();
    this.scoringEngine = new SearchScoringEngine();
    this.presentationService = new ResultPresentationService();
    this.currencyService = new CurrencyDisplayService();
  }

  async processUserMessage(
    message: string,
    userId?: string,
    conversationId?: string
  ): Promise<PlanningResponse> {
    try {
      // Load user memory if available
      if (userId && this.config.enableMemoryPersistence) {
        this.loadUserMemory(userId);
      }

      // Check if this is an iteration request
      if (this.isIterationRequest(message)) {
        return await this.handleIterationRequest(message);
      }

      // Process through conversation flow
      const flowResult = this.flowManager.processUserMessage(message);

      if (flowResult.search_ready && flowResult.search_spec) {
        // Execute search
        return await this.executeSearch(flowResult.search_spec);
      } else {
        // Continue conversation flow
        return {
          type: 'question',
          message: flowResult.response,
          next_question: flowResult.next_question,
          search_spec: flowResult.search_spec,
          flow_complete: flowResult.flow_complete
        };
      }

    } catch (error) {
      console.error('Planning engine error:', error);
      return {
        type: 'error',
        message: 'I encountered an issue processing your request. Could you please try rephrasing?',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async executeSearch(searchSpec: Partial<SearchSpec>): Promise<PlanningResponse> {
    try {
      // Simulate fetching data from providers
      const rawResults = await this.fetchAccommodationData(searchSpec);
      
      // Score and rank results
      const rankedResults = this.scoringEngine.scoreAndRankResults(searchSpec, rawResults);
      
      // Limit results to configured maximum
      const limitedResults = rankedResults.slice(0, this.config.maxResultsToShow);
      
      // Create presentation
      const presentation = this.presentationService.presentResults(
        searchSpec,
        limitedResults,
        rankedResults.length
      );

      // Format for chat display
      const formattedDisplay = this.presentationService.formatForChatDisplay(presentation);
      
      // Generate iteration suggestions
      const iterationSuggestions = this.config.enableIterativeRefinement
        ? this.presentationService.generateIterationSuggestions(searchSpec, limitedResults)
        : [];

      return {
        type: 'results',
        message: 'Here are your search results:',
        results: {
          formatted_display: formattedDisplay,
          raw_results: limitedResults,
          presentation
        },
        search_spec: searchSpec,
        iteration_suggestions: iterationSuggestions
      };

    } catch (error) {
      console.error('Search execution error:', error);
      return {
        type: 'error',
        message: 'I had trouble searching for accommodations. Please try again or adjust your criteria.',
        error: error instanceof Error ? error.message : 'Search failed'
      };
    }
  }

  private async fetchAccommodationData(searchSpec: Partial<SearchSpec>): Promise<RawAccommodationData[]> {
    // In a real implementation, this would call actual provider APIs
    // For now, return mock data that matches the search criteria
    
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this.generateMockResults(searchSpec));
      }, 500); // Simulate API delay
    });
  }

  private generateMockResults(searchSpec: Partial<SearchSpec>): RawAccommodationData[] {
    const city = searchSpec.location?.city || 'London';
    const baseResults: RawAccommodationData[] = [
      {
        id: 'hotel_001',
        name: `The Boutique ${city}`,
        type: 'hotel',
        star_rating: 4,
        user_rating: 8.9,
        location: {
          neighborhood: 'City Center',
          lat: 51.5074,
          lon: -0.1278,
          distance_to_center: 0.5,
          distance_to_beach: 15.2,
          distance_to_transport: 0.2
        },
        price: {
          amount: 145,
          currency: 'GBP',
          per_night: true,
          taxes_included: false
        },
        features: ['wifi', 'ac', 'gym', 'front_desk_24h', 'restaurant'],
        accessibility_features: ['step_free', 'lift'],
        vibe_tags: ['boutique', 'quiet', 'business'],
        booking_url: 'https://example.com/book/hotel_001'
      },
      {
        id: 'hotel_002',
        name: `Grand Palace ${city}`,
        type: 'hotel',
        star_rating: 5,
        user_rating: 9.2,
        location: {
          neighborhood: 'Historic District',
          lat: 51.5074,
          lon: -0.1278,
          distance_to_center: 1.2,
          distance_to_beach: 18.5,
          distance_to_transport: 0.3
        },
        price: {
          amount: 289,
          currency: 'GBP',
          per_night: true,
          taxes_included: false
        },
        features: ['wifi', 'ac', 'pool', 'spa', 'gym', 'front_desk_24h', 'restaurant', 'bar', 'room_service'],
        accessibility_features: ['step_free', 'lift', 'roll_in_shower'],
        vibe_tags: ['luxury', 'romantic', 'quiet'],
        booking_url: 'https://example.com/book/hotel_002'
      },
      {
        id: 'hotel_003',
        name: `Budget Inn ${city}`,
        type: 'hotel',
        star_rating: 2,
        user_rating: 7.8,
        location: {
          neighborhood: 'Transport Hub',
          lat: 51.5074,
          lon: -0.1278,
          distance_to_center: 3.1,
          distance_to_beach: 22.0,
          distance_to_transport: 0.1
        },
        price: {
          amount: 78,
          currency: 'GBP',
          per_night: true,
          taxes_included: true
        },
        features: ['wifi', 'front_desk_24h'],
        accessibility_features: ['step_free'],
        vibe_tags: ['budget'],
        booking_url: 'https://example.com/book/hotel_003'
      },
      {
        id: 'aparthotel_001',
        name: `Serviced Suites ${city}`,
        type: 'aparthotel',
        star_rating: 4,
        user_rating: 8.5,
        location: {
          neighborhood: 'Business District',
          lat: 51.5074,
          lon: -0.1278,
          distance_to_center: 2.0,
          distance_to_beach: 19.8,
          distance_to_transport: 0.4
        },
        price: {
          amount: 165,
          currency: 'GBP',
          per_night: true,
          taxes_included: false
        },
        features: ['wifi', 'ac', 'kitchen', 'gym', 'laundry', 'parking'],
        accessibility_features: ['step_free', 'lift'],
        vibe_tags: ['business', 'family'],
        booking_url: 'https://example.com/book/aparthotel_001'
      },
      {
        id: 'hotel_004',
        name: `Beachfront Resort ${city}`,
        type: 'hotel',
        star_rating: 4,
        user_rating: 8.7,
        location: {
          neighborhood: 'Seaside',
          lat: 51.5074,
          lon: -0.1278,
          distance_to_center: 12.5,
          distance_to_beach: 0.1,
          distance_to_transport: 1.2
        },
        price: {
          amount: 198,
          currency: 'GBP',
          per_night: true,
          taxes_included: false
        },
        features: ['wifi', 'ac', 'pool', 'spa', 'restaurant', 'bar', 'parking'],
        accessibility_features: ['step_free', 'lift'],
        vibe_tags: ['family', 'romantic'],
        booking_url: 'https://example.com/book/hotel_004'
      }
    ];

    // Filter results based on search criteria
    return baseResults.filter(result => {
      // Apply basic filtering logic
      if (searchSpec.budget?.per_night_cap && result.price.amount > searchSpec.budget.per_night_cap) {
        return false;
      }

      // Type filtering
      const accommodationTypes = searchSpec.accommodation?.types;
      if (accommodationTypes) {
        const hasRequestedType = Object.entries(accommodationTypes)
          .some(([type, requested]) => requested && result.type.toLowerCase().includes(type));
        if (!hasRequestedType && Object.values(accommodationTypes).some(Boolean)) {
          return false;
        }
      }

      return true;
    });
  }

  private isIterationRequest(message: string): boolean {
    const iterationKeywords = [
      'show more', 'different', 'change', 'adjust', 'refine', 'instead',
      'cheaper', 'more expensive', 'luxury', 'budget', 'closer', 'further',
      'with pool', 'without', 'nearer to', 'option', 'alternative'
    ];

    const lowerMessage = message.toLowerCase();
    return iterationKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  private async handleIterationRequest(message: string): Promise<PlanningResponse> {
    try {
      // Use flow manager to refine search based on feedback
      const refinementResult = this.flowManager.refineSearch(message);
      
      // Execute refined search
      return await this.executeSearch(refinementResult.search_spec);
      
    } catch (error) {
      console.error('Iteration request error:', error);
      return {
        type: 'error',
        message: 'I had trouble understanding your refinement. Could you be more specific?',
        error: error instanceof Error ? error.message : 'Refinement failed'
      };
    }
  }

  private loadUserMemory(userId: string): void {
    // In a real implementation, load from database
    // For now, use in-memory storage
    const savedPreferences = this.userMemory.get(userId);
    if (savedPreferences) {
      // Apply saved preferences to flow manager
      console.log(`Loaded preferences for user ${userId}:`, savedPreferences);
    }
  }

  private saveUserPreferences(userId: string, preferences: Partial<SearchSpec>): void {
    if (this.config.enableMemoryPersistence) {
      this.userMemory.set(userId, {
        timestamp: new Date().toISOString(),
        preferences: preferences
      });
    }
  }

  // Public methods for external integration

  getSearchSpec(): Partial<SearchSpec> {
    return this.flowManager.getSearchSpec();
  }

  getSlotCompleteness() {
    return this.flowManager.getSlotCompleteness();
  }

  getConversationState() {
    return this.flowManager.getConversationState();
  }

  resetConversation(): void {
    this.flowManager.reset();
  }

  // Configuration methods
  updateConfig(newConfig: Partial<PlanningEngineConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  async updateCurrencyRates(): Promise<void> {
    await this.currencyService.updateRatesFromAPI();
  }

  // Debug methods
  getDebugInfo(): any {
    return {
      config: this.config,
      conversationState: this.getConversationState(),
      searchSpec: this.getSearchSpec(),
      slotCompleteness: this.getSlotCompleteness(),
      memoryEntries: this.userMemory.size
    };
  }
}