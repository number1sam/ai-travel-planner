import { SearchSpec, SearchResult } from '../types/SearchSpec';

export interface RawAccommodationData {
  id: string;
  name: string;
  type: string;
  star_rating?: number;
  user_rating?: number;
  location: {
    neighborhood: string;
    lat: number;
    lon: number;
    distance_to_center?: number;
    distance_to_beach?: number;
    distance_to_transport?: number;
  };
  price: {
    amount: number;
    currency: string;
    per_night: boolean;
    taxes_included: boolean;
  };
  features: string[];
  accessibility_features: string[];
  vibe_tags: string[];
  booking_url: string;
}

export class SearchScoringEngine {
  private currencyRates = new Map([
    ['EUR', { usd: 1.09, gbp: 0.85 }],
    ['GBP', { usd: 1.28, gbp: 1.0 }],
    ['USD', { usd: 1.0, gbp: 0.78 }],
  ]);

  scoreAndRankResults(
    searchSpec: Partial<SearchSpec>, 
    rawResults: RawAccommodationData[]
  ): SearchResult[] {
    // First apply hard filters
    const filteredResults = this.applyHardFilters(searchSpec, rawResults);
    
    // Then score each result
    const scoredResults = filteredResults.map(result => 
      this.scoreResult(searchSpec, result)
    );

    // Apply diversity penalty to avoid near-duplicates
    const diversifiedResults = this.applyDiversityBonus(scoredResults);

    // Sort by fit score (highest first)
    diversifiedResults.sort((a, b) => b.fit_score - a.fit_score);

    return diversifiedResults;
  }

  private applyHardFilters(
    searchSpec: Partial<SearchSpec>, 
    results: RawAccommodationData[]
  ): RawAccommodationData[] {
    return results.filter(result => {
      // Budget hard filter
      if (searchSpec.budget?.per_night_cap) {
        const priceInGBP = this.convertPrice(result.price, 'GBP');
        if (priceInGBP > searchSpec.budget.per_night_cap) {
          return false;
        }
      }

      // Accessibility requirements (hard filter)
      const accessibility = searchSpec.accommodation?.accessibility;
      if (accessibility) {
        if (accessibility.step_free && !result.accessibility_features.includes('step_free')) {
          return false;
        }
        if (accessibility.roll_in_shower && !result.accessibility_features.includes('roll_in_shower')) {
          return false;
        }
        if (accessibility.service_animal_friendly && !result.accessibility_features.includes('service_animal_friendly')) {
          return false;
        }
      }

      // Pet policy (hard filter if traveling with pets)
      if (searchSpec.accommodation?.features?.pet_friendly) {
        if (!result.features.includes('pet_friendly')) {
          return false;
        }
      }

      // Dietary requirements (would be applied to restaurant results)
      // Location bounds (if specified with lat/lon + radius)
      
      return true;
    });
  }

  private scoreResult(
    searchSpec: Partial<SearchSpec>, 
    result: RawAccommodationData
  ): SearchResult {
    let score = 0;
    const scoreBreakdown = {
      type_match: 0,
      features_match: 0,
      vibe_match: 0,
      location_bonus: 0,
      review_bonus: 0,
      price_fit: 0,
      accessibility_bonus: 0
    };

    // Type match scoring
    const preferredTypes = searchSpec.accommodation?.types;
    if (preferredTypes) {
      const typeMapping: Record<string, string> = {
        'hotel': 'hotel',
        'hostel': 'hostel',
        'aparthotel': 'aparthotel',
        'apartment': 'aparthotel',
        'rental': 'rental',
        'villa': 'villa',
        'cabin': 'cabin',
        'lodge': 'cabin'
      };
      
      const mappedType = typeMapping[result.type.toLowerCase()];
      if (mappedType && (preferredTypes as any)[mappedType]) {
        scoreBreakdown.type_match = 1;
        score += 1;
      }
    }

    // Features match scoring
    const requestedFeatures = searchSpec.accommodation?.features;
    if (requestedFeatures) {
      const featureMapping: Record<string, string> = {
        'wifi': 'wifi',
        'ac': 'air_conditioning',
        'pool': 'pool',
        'spa': 'spa',
        'gym': 'fitness_center',
        'kitchen': 'kitchen',
        'parking': 'parking',
        'front_desk_24h': '24h_front_desk',
        'laundry': 'laundry',
        'pet_friendly': 'pet_friendly'
      };

      const requestedCount = Object.values(requestedFeatures).filter(Boolean).length;
      const matchedCount = Object.entries(requestedFeatures)
        .filter(([key, value]) => value && result.features.includes(featureMapping[key] || key))
        .length;

      if (requestedCount > 0) {
        scoreBreakdown.features_match = matchedCount / requestedCount;
        score += scoreBreakdown.features_match * 0.4;
      }
    }

    // Vibe match scoring
    const requestedVibe = searchSpec.accommodation?.vibe;
    if (requestedVibe) {
      const vibeMapping: Record<string, string> = {
        'romantic': 'romantic',
        'family': 'family_friendly',
        'business': 'business',
        'party': 'party',
        'quiet': 'quiet',
        'luxury': 'luxury',
        'budget': 'budget',
        'eco': 'eco_friendly',
        'boutique': 'boutique'
      };

      const requestedVibes = Object.entries(requestedVibe)
        .filter(([key, value]) => value)
        .map(([key]) => vibeMapping[key] || key);

      const matchedVibes = requestedVibes.filter(vibe => 
        result.vibe_tags.includes(vibe)
      ).length;

      if (requestedVibes.length > 0) {
        scoreBreakdown.vibe_match = matchedVibes / requestedVibes.length;
        score += scoreBreakdown.vibe_match * 0.5;
      }
    }

    // Location proximity bonus
    const locationPrefs = searchSpec.accommodation?.neighborhood;
    if (locationPrefs) {
      if (locationPrefs.central && result.location.distance_to_center && result.location.distance_to_center <= 2) {
        scoreBreakdown.location_bonus += 0.3;
      }
      if (locationPrefs.beach && result.location.distance_to_beach && result.location.distance_to_beach <= 1) {
        scoreBreakdown.location_bonus += 0.3;
      }
      if (locationPrefs.near_transport && result.location.distance_to_transport && result.location.distance_to_transport <= 0.5) {
        scoreBreakdown.location_bonus += 0.2;
      }
      score += scoreBreakdown.location_bonus;
    }

    // Review quality bonus
    if (result.user_rating && result.user_rating > 8.5) {
      scoreBreakdown.review_bonus = (result.user_rating - 8.5) * 0.5;
      score += Math.min(scoreBreakdown.review_bonus, 1); // Cap at +1
    }

    // Price fit scoring
    if (searchSpec.budget?.per_night_cap) {
      const priceInGBP = this.convertPrice(result.price, 'GBP');
      const budget = searchSpec.budget.per_night_cap;
      
      if (priceInGBP <= budget) {
        scoreBreakdown.price_fit = 1;
        score += 1;
      } else if (priceInGBP <= budget * 1.1) {
        scoreBreakdown.price_fit = 0.3;
        score += 0.3;
      } else {
        scoreBreakdown.price_fit = -1;
        score -= 1;
      }
    }

    // Accessibility bonus (soft scoring for exceeding requirements)
    const accessibilityRequested = searchSpec.accommodation?.accessibility;
    if (accessibilityRequested) {
      const requestedFeatures = Object.values(accessibilityRequested).filter(Boolean).length;
      const availableFeatures = result.accessibility_features.length;
      
      if (availableFeatures > requestedFeatures) {
        scoreBreakdown.accessibility_bonus = (availableFeatures - requestedFeatures) * 0.1;
        score += scoreBreakdown.accessibility_bonus;
      }
    }

    // Generate why_it_fits explanations
    const whyItFits = this.generateWhyItFits(searchSpec, result, scoreBreakdown);

    // Convert prices to display currencies
    const priceDisplay = {
      native: {
        amount: result.price.amount,
        currency: result.price.currency,
        per_night: result.price.per_night
      },
      usd: {
        amount: this.convertPrice(result.price, 'USD'),
        per_night: result.price.per_night
      },
      gbp: {
        amount: this.convertPrice(result.price, 'GBP'),
        per_night: result.price.per_night
      },
      taxes_included: result.price.taxes_included,
      quote_timestamp: new Date().toISOString()
    };

    return {
      id: result.id,
      name: result.name,
      type: result.type,
      star_rating: result.star_rating,
      user_rating: result.user_rating,
      neighborhood: result.location.neighborhood,
      distance_to_center: result.location.distance_to_center,
      distance_to_beach: result.location.distance_to_beach,
      distance_to_transport: result.location.distance_to_transport,
      why_it_fits: whyItFits,
      price: priceDisplay,
      features: result.features,
      accessibility_features: result.accessibility_features,
      booking_link: result.booking_url,
      fit_score: Math.round(score * 100) / 100, // Round to 2 decimal places
      score_breakdown: scoreBreakdown
    };
  }

  private generateWhyItFits(
    searchSpec: Partial<SearchSpec>, 
    result: RawAccommodationData,
    scoreBreakdown: any
  ): string[] {
    const reasons: string[] = [];

    // Type match
    if (scoreBreakdown.type_match > 0) {
      reasons.push(`${result.type} as requested`);
    }

    // Key features
    if (scoreBreakdown.features_match > 0.5) {
      const matchedFeatures = [];
      const features = searchSpec.accommodation?.features;
      if (features?.pool && result.features.includes('pool')) matchedFeatures.push('pool');
      if (features?.spa && result.features.includes('spa')) matchedFeatures.push('spa');
      if (features?.wifi && result.features.includes('wifi')) matchedFeatures.push('wifi');
      if (matchedFeatures.length > 0) {
        reasons.push(matchedFeatures.join(' + '));
      }
    }

    // Vibe match
    if (scoreBreakdown.vibe_match > 0.5) {
      const matchedVibes = [];
      const vibe = searchSpec.accommodation?.vibe;
      if (vibe?.quiet && result.vibe_tags.includes('quiet')) matchedVibes.push('quiet');
      if (vibe?.boutique && result.vibe_tags.includes('boutique')) matchedVibes.push('boutique');
      if (vibe?.luxury && result.vibe_tags.includes('luxury')) matchedVibes.push('luxury');
      if (matchedVibes.length > 0) {
        reasons.push(matchedVibes.join(' + '));
      }
    }

    // Location benefits
    if (scoreBreakdown.location_bonus > 0.2) {
      const locationBenefits = [];
      if (result.location.distance_to_center && result.location.distance_to_center <= 2) {
        locationBenefits.push('central location');
      }
      if (result.location.distance_to_beach && result.location.distance_to_beach <= 1) {
        locationBenefits.push('near beach');
      }
      if (result.location.distance_to_transport && result.location.distance_to_transport <= 0.5) {
        locationBenefits.push('near metro');
      }
      if (locationBenefits.length > 0) {
        reasons.push(locationBenefits.join(' + '));
      }
    }

    // Price fit
    if (scoreBreakdown.price_fit >= 1) {
      reasons.push('under budget');
    }

    // Accessibility
    if (result.accessibility_features.length > 0) {
      const accessFeatures = [];
      if (result.accessibility_features.includes('step_free')) accessFeatures.push('step-free');
      if (result.accessibility_features.includes('roll_in_shower')) accessFeatures.push('roll-in shower');
      if (accessFeatures.length > 0) {
        reasons.push(accessFeatures.join(' + '));
      }
    }

    // High ratings
    if (result.user_rating && result.user_rating >= 9.0) {
      reasons.push('excellent reviews');
    }

    return reasons.slice(0, 3); // Limit to top 3 reasons
  }

  private applyDiversityBonus(results: SearchResult[]): SearchResult[] {
    // Penalize results that are too similar (same brand, same neighborhood)
    const seenBrands = new Map<string, number>();
    const seenNeighborhoods = new Map<string, number>();

    return results.map(result => {
      let diversityPenalty = 0;

      // Extract brand from name (simple heuristic)
      const brand = this.extractBrand(result.name);
      if (brand) {
        const brandCount = seenBrands.get(brand) || 0;
        diversityPenalty += brandCount * 0.1;
        seenBrands.set(brand, brandCount + 1);
      }

      // Neighborhood diversity
      const neighborhoodCount = seenNeighborhoods.get(result.neighborhood) || 0;
      if (neighborhoodCount >= 2) {
        diversityPenalty += 0.2;
      }
      seenNeighborhoods.set(result.neighborhood, neighborhoodCount + 1);

      return {
        ...result,
        fit_score: Math.max(0, result.fit_score - diversityPenalty)
      };
    });
  }

  private extractBrand(hotelName: string): string | null {
    const commonBrands = [
      'Hilton', 'Marriott', 'Hyatt', 'IHG', 'Radisson', 'Best Western',
      'Holiday Inn', 'Sheraton', 'Westin', 'Doubletree', 'Hampton',
      'Courtyard', 'Residence Inn', 'Fairfield', 'AC Hotel'
    ];

    for (const brand of commonBrands) {
      if (hotelName.toLowerCase().includes(brand.toLowerCase())) {
        return brand;
      }
    }

    return null;
  }

  private convertPrice(price: { amount: number; currency: string }, targetCurrency: string): number {
    if (price.currency === targetCurrency) {
      return price.amount;
    }

    const rates = this.currencyRates.get(price.currency);
    if (!rates) {
      // Fallback: assume USD if currency not found
      return targetCurrency === 'USD' ? price.amount : price.amount * 0.78;
    }

    return targetCurrency === 'USD' ? 
      price.amount * rates.usd : 
      price.amount * rates.gbp;
  }

  // Method to update currency rates (could be called from an external API)
  updateCurrencyRates(rates: Map<string, { usd: number; gbp: number }>): void {
    this.currencyRates = rates;
  }
}