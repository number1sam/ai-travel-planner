import { SearchResult, SearchSpec } from '../types/SearchSpec';
import { CurrencyDisplayService } from './CurrencyDisplayService';

export interface PresentationCard {
  id: string;
  title: string;
  subtitle: string;
  badge?: string;
  whyItFits: string[];
  priceDisplay: string;
  keyFeatures: string[];
  accessibilityFeatures: string[];
  locationInfo: string;
  bookingLink: string;
  fitScore: number;
  moreActionsAvailable: boolean;
}

export interface ResultPresentation {
  summary: string;
  cards: PresentationCard[];
  iterationPrompts: string[];
  totalResults: number;
  searchTimestamp: string;
}

export interface IterationSuggestion {
  text: string;
  refinement: Partial<SearchSpec>;
  description: string;
}

export class ResultPresentationService {
  private currencyService: CurrencyDisplayService;

  constructor() {
    this.currencyService = new CurrencyDisplayService();
  }

  presentResults(
    searchSpec: Partial<SearchSpec>,
    results: SearchResult[],
    totalAvailable: number = results.length
  ): ResultPresentation {
    const cards = results.slice(0, 8).map(result => this.createPresentationCard(result));
    const summary = this.generateSummary(searchSpec, results.length, totalAvailable);
    const iterationPrompts = this.generateIterationPrompts(searchSpec, results);

    return {
      summary,
      cards,
      iterationPrompts,
      totalResults: totalAvailable,
      searchTimestamp: new Date().toISOString()
    };
  }

  private createPresentationCard(result: SearchResult): PresentationCard {
    const title = result.name;
    
    // Create subtitle with type and ratings
    const subtitleParts = [result.type];
    if (result.star_rating) {
      subtitleParts.push(`${result.star_rating}★`);
    }
    if (result.user_rating) {
      subtitleParts.push(`${result.user_rating}/10 guest rating`);
    }
    const subtitle = subtitleParts.join(' • ');

    // Create badge for exceptional properties
    let badge: string | undefined;
    if (result.user_rating && result.user_rating >= 9.5) {
      badge = 'Exceptional';
    } else if (result.user_rating && result.user_rating >= 9.0) {
      badge = 'Excellent';
    } else if (result.fit_score >= 4) {
      badge = 'Perfect Match';
    } else if (result.fit_score >= 3) {
      badge = 'Great Fit';
    }

    // Format price display
    const priceDisplay = this.currencyService.formatPriceForDisplay(
      result.price,
      result.price.native.per_night,
      true
    );

    // Select key features (max 5)
    const keyFeatures = this.selectKeyFeatures(result.features).slice(0, 5);

    // Format accessibility features
    const accessibilityFeatures = result.accessibility_features.map(feature => 
      this.formatAccessibilityFeature(feature)
    );

    // Create location info
    const locationInfo = this.createLocationInfo(result);

    return {
      id: result.id,
      title,
      subtitle,
      badge,
      whyItFits: result.why_it_fits,
      priceDisplay,
      keyFeatures,
      accessibilityFeatures,
      locationInfo,
      bookingLink: result.booking_link,
      fitScore: result.fit_score,
      moreActionsAvailable: true
    };
  }

  private generateSummary(
    searchSpec: Partial<SearchSpec>,
    resultsCount: number,
    totalAvailable: number
  ): string {
    const location = searchSpec.location?.city || 'your destination';
    const nights = searchSpec.dates?.nights;
    
    let summary = `Found ${resultsCount} excellent options in ${location}`;
    
    if (nights) {
      summary += ` for your ${nights}-night stay`;
    }
    
    if (totalAvailable > resultsCount) {
      summary += ` (${totalAvailable} total available)`;
    }
    
    // Add key criteria met
    const criteria = [];
    if (searchSpec.accommodation?.vibe) {
      const vibes = Object.keys(searchSpec.accommodation.vibe)
        .filter(key => (searchSpec.accommodation!.vibe as any)[key]);
      if (vibes.length > 0) {
        criteria.push(vibes.join(' + '));
      }
    }
    
    if (searchSpec.budget?.per_night_cap) {
      criteria.push(`under £${searchSpec.budget.per_night_cap}/night`);
    }

    if (criteria.length > 0) {
      summary += `. All match your criteria: ${criteria.join(', ')}.`;
    } else {
      summary += '.';
    }

    return summary;
  }

  private generateIterationPrompts(
    searchSpec: Partial<SearchSpec>,
    results: SearchResult[]
  ): string[] {
    const prompts: string[] = [];

    // Budget refinement
    if (searchSpec.budget?.per_night_cap) {
      const budget = searchSpec.budget.per_night_cap;
      prompts.push(`Show options under £${budget - 20}/night`);
      prompts.push(`Show luxury options up to £${budget + 50}/night`);
    }

    // Location refinement
    const hasBeachOptions = results.some(r => r.distance_to_beach && r.distance_to_beach <= 1);
    const hasCentralOptions = results.some(r => r.distance_to_center && r.distance_to_center <= 2);
    
    if (hasBeachOptions && hasCentralOptions) {
      prompts.push('Show only beachfront options');
      prompts.push('Show only central city options');
    } else if (!hasBeachOptions) {
      prompts.push('Include beach-area options');
    } else if (!hasCentralOptions) {
      prompts.push('Include city center options');
    }

    // Feature refinement
    const commonFeatures = this.analyzeCommonFeatures(results);
    if (!commonFeatures.includes('pool') && results.length > 3) {
      prompts.push('Add pool requirement');
    }
    if (!commonFeatures.includes('spa') && results.length > 3) {
      prompts.push('Add spa requirement');
    }

    // Type refinement
    const types = [...new Set(results.map(r => r.type))];
    if (types.length > 1) {
      types.forEach(type => {
        prompts.push(`Show only ${type}s`);
      });
    }

    // Accessibility refinement
    if (searchSpec.accommodation?.accessibility?.step_free) {
      prompts.push('Include roll-in shower requirement');
    } else {
      prompts.push('Add accessibility requirements');
    }

    return prompts.slice(0, 4); // Limit to 4 prompts
  }

  private selectKeyFeatures(features: string[]): string[] {
    // Priority order for displaying features
    const featurePriority = [
      'wifi',
      'pool',
      'spa',
      'gym',
      'air_conditioning',
      'parking',
      'kitchen',
      '24h_front_desk',
      'laundry',
      'pet_friendly',
      'restaurant',
      'bar',
      'room_service',
      'concierge',
      'business_center'
    ];

    const featureMap: Record<string, string> = {
      'wifi': 'Wi-Fi',
      'pool': 'Pool',
      'spa': 'Spa',
      'gym': 'Gym',
      'air_conditioning': 'A/C',
      'parking': 'Parking',
      'kitchen': 'Kitchen',
      '24h_front_desk': '24h Front Desk',
      'laundry': 'Laundry',
      'pet_friendly': 'Pet-Friendly',
      'restaurant': 'Restaurant',
      'bar': 'Bar',
      'room_service': 'Room Service',
      'concierge': 'Concierge',
      'business_center': 'Business Center'
    };

    const selectedFeatures: string[] = [];
    
    // Add features in priority order
    for (const feature of featurePriority) {
      if (features.includes(feature) && selectedFeatures.length < 5) {
        selectedFeatures.push(featureMap[feature] || feature);
      }
    }

    // Add any remaining features up to limit
    for (const feature of features) {
      if (!featurePriority.includes(feature) && selectedFeatures.length < 5) {
        selectedFeatures.push(featureMap[feature] || feature);
      }
    }

    return selectedFeatures;
  }

  private formatAccessibilityFeature(feature: string): string {
    const featureMap: Record<string, string> = {
      'step_free': 'Step-Free Access',
      'lift': 'Elevator',
      'roll_in_shower': 'Roll-In Shower',
      'hearing_aids': 'Hearing Loop',
      'visual_aids': 'Visual Aids',
      'service_animal_friendly': 'Service Animals Welcome',
      'accessible_parking': 'Accessible Parking',
      'braille_signage': 'Braille Signage'
    };

    return featureMap[feature] || feature;
  }

  private createLocationInfo(result: SearchResult): string {
    const locationParts: string[] = [result.neighborhood];

    if (result.distance_to_center) {
      locationParts.push(`${result.distance_to_center}km from center`);
    }

    if (result.distance_to_beach && result.distance_to_beach <= 2) {
      locationParts.push(`${result.distance_to_beach}km from beach`);
    }

    if (result.distance_to_transport && result.distance_to_transport <= 1) {
      locationParts.push(`${result.distance_to_transport}km from metro`);
    }

    return locationParts.join(' • ');
  }

  private analyzeCommonFeatures(results: SearchResult[]): string[] {
    const featureCounts = new Map<string, number>();
    
    results.forEach(result => {
      result.features.forEach(feature => {
        featureCounts.set(feature, (featureCounts.get(feature) || 0) + 1);
      });
    });

    // Return features present in at least 75% of results
    const threshold = Math.ceil(results.length * 0.75);
    return Array.from(featureCounts.entries())
      .filter(([feature, count]) => count >= threshold)
      .map(([feature]) => feature);
  }

  // Generate iteration suggestions based on current results
  generateIterationSuggestions(
    searchSpec: Partial<SearchSpec>,
    results: SearchResult[]
  ): IterationSuggestion[] {
    const suggestions: IterationSuggestion[] = [];

    // Budget-based suggestions
    if (searchSpec.budget?.per_night_cap) {
      const avgPrice = results.reduce((sum, r) => sum + r.price.gbp.amount, 0) / results.length;
      const budget = searchSpec.budget.per_night_cap;

      if (avgPrice < budget * 0.8) {
        suggestions.push({
          text: 'Show more premium options',
          refinement: {
            budget: { ...searchSpec.budget, per_night_cap: budget + 30 }
          },
          description: 'Increase budget to see higher-end accommodations'
        });
      }

      if (avgPrice > budget * 0.9) {
        suggestions.push({
          text: 'Find more budget options',
          refinement: {
            budget: { ...searchSpec.budget, per_night_cap: budget - 20 }
          },
          description: 'Lower budget to find more affordable options'
        });
      }
    }

    // Location-based suggestions
    const locationSuggestions = this.generateLocationSuggestions(results);
    suggestions.push(...locationSuggestions);

    // Feature-based suggestions
    const featureSuggestions = this.generateFeatureSuggestions(searchSpec, results);
    suggestions.push(...featureSuggestions);

    return suggestions.slice(0, 6); // Limit to 6 suggestions
  }

  private generateLocationSuggestions(results: SearchResult[]): IterationSuggestion[] {
    const suggestions: IterationSuggestion[] = [];

    const hasBeachNear = results.some(r => r.distance_to_beach && r.distance_to_beach <= 1);
    const hasCenterNear = results.some(r => r.distance_to_center && r.distance_to_center <= 1);

    if (!hasBeachNear) {
      suggestions.push({
        text: 'Closer to beach',
        refinement: {
          accommodation: {
            neighborhood: { beach: true, near_transport: true }
          }
        },
        description: 'Focus on beachfront locations'
      });
    }

    if (!hasCenterNear) {
      suggestions.push({
        text: 'More central',
        refinement: {
          accommodation: {
            neighborhood: { central: true, near_transport: true }
          }
        },
        description: 'Focus on city center locations'
      });
    }

    return suggestions;
  }

  private generateFeatureSuggestions(
    searchSpec: Partial<SearchSpec>, 
    results: SearchResult[]
  ): IterationSuggestion[] {
    const suggestions: IterationSuggestion[] = [];

    const currentFeatures = searchSpec.accommodation?.features || {};
    
    // Suggest adding popular features not currently selected
    if (!currentFeatures.pool) {
      const withPool = results.filter(r => r.features.includes('pool')).length;
      if (withPool > 0) {
        suggestions.push({
          text: 'Must have pool',
          refinement: {
            accommodation: {
              ...searchSpec.accommodation,
              features: { ...currentFeatures, pool: true }
            }
          },
          description: 'Filter for properties with swimming pools'
        });
      }
    }

    if (!currentFeatures.spa) {
      const withSpa = results.filter(r => r.features.includes('spa')).length;
      if (withSpa > 0) {
        suggestions.push({
          text: 'Add spa requirement',
          refinement: {
            accommodation: {
              ...searchSpec.accommodation,
              features: { ...currentFeatures, spa: true }
            }
          },
          description: 'Filter for properties with spa facilities'
        });
      }
    }

    return suggestions;
  }

  // Format results for different output modes (chat, email, export)
  formatForChatDisplay(presentation: ResultPresentation): string {
    let output = `${presentation.summary}\n\n`;

    presentation.cards.forEach((card, index) => {
      output += `**${index + 1}. ${card.title}**`;
      if (card.badge) {
        output += ` • ${card.badge}`;
      }
      output += `\n${card.subtitle}\n`;
      output += `${card.locationInfo}\n`;
      output += `💰 ${card.priceDisplay}\n`;
      
      if (card.whyItFits.length > 0) {
        output += `✨ ${card.whyItFits.join(', ')}\n`;
      }
      
      if (card.keyFeatures.length > 0) {
        output += `🏨 ${card.keyFeatures.join(' • ')}\n`;
      }

      if (card.accessibilityFeatures.length > 0) {
        output += `♿ ${card.accessibilityFeatures.join(' • ')}\n`;
      }

      output += '\n';
    });

    if (presentation.iterationPrompts.length > 0) {
      output += '**Refine your search:**\n';
      presentation.iterationPrompts.forEach(prompt => {
        output += `• ${prompt}\n`;
      });
    }

    return output;
  }
}