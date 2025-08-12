import { SearchSpec, SlotCompleteness, Location, DateRange, Occupancy } from '../types/SearchSpec';

export class SlotFillingManager {
  private searchSpec: Partial<SearchSpec> = {
    location: {},
    dates: {},
    occupancy: { adults: 1, children: [], rooms: 1 },
    accommodation: {
      types: {},
      features: {},
      accessibility: {},
      vibe: {},
      neighborhood: {}
    },
    transport: {
      long_distance: {},
      local: {}
    },
    activities: {},
    food: {},
    budget: { currency_display: ["USD", "GBP"] },
    docs_insurance: {}
  };

  extractEntitiesFromText(text: string): Partial<SearchSpec> {
    const extracted: Partial<SearchSpec> = {};
    const lowercaseText = text.toLowerCase();

    extracted.location = this.extractLocation(text);
    extracted.dates = this.extractDates(text);
    extracted.occupancy = this.extractOccupancy(text);
    extracted.accommodation = this.extractAccommodation(lowercaseText);
    extracted.activities = this.extractActivities(lowercaseText);
    extracted.food = this.extractFoodPreferences(lowercaseText);
    extracted.budget = this.extractBudget(text);

    return extracted;
  }

  private extractLocation(text: string): Partial<Location> {
    const location: Partial<Location> = {};
    
    // City pattern matching
    const cityPatterns = [
      /(?:going to|visiting|travel to|trip to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:trip|vacation|holiday)/i,
      /\bin\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i
    ];

    for (const pattern of cityPatterns) {
      const match = text.match(pattern);
      if (match) {
        location.city = match[1].trim();
        break;
      }
    }

    // Flexibility indicators
    if (text.match(/\b(?:nearby|around|close to|flexible|open to)\b/i)) {
      location.flexible = true;
      location.radius_km = 50; // Default radius
    }

    return location;
  }

  private extractDates(text: string): Partial<DateRange> {
    const dates: Partial<DateRange> = {};

    // Night patterns
    const nightPatterns = [
      /(\d+)\s+nights?/i,
      /(\d+)\s+days?/i
    ];

    for (const pattern of nightPatterns) {
      const match = text.match(pattern);
      if (match) {
        dates.nights = pattern.source.includes('days') 
          ? parseInt(match[1]) - 1 
          : parseInt(match[1]);
        break;
      }
    }

    // Month/date patterns
    const monthPattern = /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i;
    const monthMatch = text.match(monthPattern);
    if (monthMatch) {
      const month = this.parseMonth(monthMatch[1]);
      const year = new Date().getFullYear();
      // Simple approximation - could be enhanced with specific date parsing
      dates.checkin = `${year}-${month.toString().padStart(2, '0')}-01`;
    }

    // Flexibility indicators
    if (text.match(/\b(?:flexible|±|plus or minus|around)\b/i)) {
      dates.flex_days = 3; // Default flexibility
    }

    return dates;
  }

  private extractOccupancy(text: string): Partial<Occupancy> {
    const occupancy: Partial<Occupancy> = { adults: 1, children: [], rooms: 1 };

    // Adult patterns
    const adultPatterns = [
      /(\d+)\s+adults?/i,
      /(\d+)\s+people/i,
      /party of (\d+)/i
    ];

    for (const pattern of adultPatterns) {
      const match = text.match(pattern);
      if (match) {
        occupancy.adults = parseInt(match[1]);
        break;
      }
    }

    // Children patterns
    const childrenPattern = /(\d+)\s+(?:children|kids|child)/i;
    const childrenMatch = text.match(childrenPattern);
    if (childrenMatch) {
      const childCount = parseInt(childrenMatch[1]);
      occupancy.children = Array(childCount).fill(8); // Default age
    }

    // Room patterns
    const roomPattern = /(\d+)\s+rooms?/i;
    const roomMatch = text.match(roomPattern);
    if (roomMatch) {
      occupancy.rooms = parseInt(roomMatch[1]);
    }

    // Accessibility needs
    if (text.match(/\b(?:wheelchair|step-free|accessible|mobility)/i)) {
      occupancy.accessibility_needs = ['step_free'];
    }

    // Dietary needs
    const dietaryPatterns = [
      { pattern: /\b(?:vegetarian|veggie)\b/i, need: 'vegetarian' },
      { pattern: /\bvegan\b/i, need: 'vegan' },
      { pattern: /\bhalal\b/i, need: 'halal' },
      { pattern: /\bkosher\b/i, need: 'kosher' },
      { pattern: /\b(?:gluten.free|celiac)\b/i, need: 'gluten_free' },
      { pattern: /\blactose.free\b/i, need: 'lactose_free' },
      { pattern: /\bnut.free\b/i, need: 'nut_free' }
    ];

    occupancy.dietary_needs = [];
    for (const { pattern, need } of dietaryPatterns) {
      if (text.match(pattern)) {
        occupancy.dietary_needs.push(need);
      }
    }

    return occupancy;
  }

  private extractAccommodation(text: string) {
    const accommodation = {
      types: {},
      features: {},
      accessibility: {},
      vibe: {},
      neighborhood: {}
    };

    // Accommodation types
    const typePatterns = [
      { pattern: /\bhotel\b/i, type: 'hotel' },
      { pattern: /\bhostel\b/i, type: 'hostel' },
      { pattern: /\b(?:apartment|aparthotel|serviced apartment)\b/i, type: 'aparthotel' },
      { pattern: /\b(?:rental|airbnb|vrbo)\b/i, type: 'rental' },
      { pattern: /\bvilla\b/i, type: 'villa' },
      { pattern: /\b(?:cabin|lodge)\b/i, type: 'cabin' },
      { pattern: /\bglamping\b/i, type: 'glamping' },
      { pattern: /\bcamping\b/i, type: 'camping' },
      { pattern: /\bryokan\b/i, type: 'ryokan' }
    ];

    for (const { pattern, type } of typePatterns) {
      if (text.match(pattern)) {
        (accommodation.types as any)[type] = true;
      }
    }

    // Features
    const featurePatterns = [
      { pattern: /\b(?:wifi|wi-fi|internet)\b/i, feature: 'wifi' },
      { pattern: /\b(?:ac|air conditioning|aircon)\b/i, feature: 'ac' },
      { pattern: /\bpool\b/i, feature: 'pool' },
      { pattern: /\bspa\b/i, feature: 'spa' },
      { pattern: /\bgym\b/i, feature: 'gym' },
      { pattern: /\b(?:kitchen|kitchenette)\b/i, feature: 'kitchen' },
      { pattern: /\bparking\b/i, feature: 'parking' },
      { pattern: /\b(?:24.?hour|24h|front desk)\b/i, feature: 'front_desk_24h' },
      { pattern: /\b(?:laundry|washing)\b/i, feature: 'laundry' },
      { pattern: /\b(?:pet.friendly|pets? allowed)\b/i, feature: 'pet_friendly' }
    ];

    for (const { pattern, feature } of featurePatterns) {
      if (text.match(pattern)) {
        (accommodation.features as any)[feature] = true;
      }
    }

    // Accessibility
    const accessibilityPatterns = [
      { pattern: /\b(?:step.free|wheelchair accessible)\b/i, feature: 'step_free' },
      { pattern: /\blift\b/i, feature: 'lift' },
      { pattern: /\b(?:roll.in shower|accessible shower)\b/i, feature: 'roll_in_shower' },
      { pattern: /\bhearing aids?\b/i, feature: 'hearing_aids' },
      { pattern: /\bvisual aids?\b/i, feature: 'visual_aids' },
      { pattern: /\bservice animals?\b/i, feature: 'service_animal_friendly' }
    ];

    for (const { pattern, feature } of accessibilityPatterns) {
      if (text.match(pattern)) {
        (accommodation.accessibility as any)[feature] = true;
      }
    }

    // Vibe
    const vibePatterns = [
      { pattern: /\bromantic\b/i, vibe: 'romantic' },
      { pattern: /\bfamily\b/i, vibe: 'family' },
      { pattern: /\bbusiness\b/i, vibe: 'business' },
      { pattern: /\bparty\b/i, vibe: 'party' },
      { pattern: /\bquiet\b/i, vibe: 'quiet' },
      { pattern: /\bluxury\b/i, vibe: 'luxury' },
      { pattern: /\bbudget\b/i, vibe: 'budget' },
      { pattern: /\b(?:eco|sustainable|green)\b/i, vibe: 'eco' },
      { pattern: /\bboutique\b/i, vibe: 'boutique' }
    ];

    for (const { pattern, vibe } of vibePatterns) {
      if (text.match(pattern)) {
        (accommodation.vibe as any)[vibe] = true;
      }
    }

    // Neighborhood
    const neighborhoodPatterns = [
      { pattern: /\b(?:central|center|downtown|city center)\b/i, pref: 'central' },
      { pattern: /\bbeach\b/i, pref: 'beach' },
      { pattern: /\bnature\b/i, pref: 'nature' },
      { pattern: /\b(?:metro|transport|subway|train)\b/i, pref: 'near_transport' },
      { pattern: /\bquiet\b/i, pref: 'quiet' }
    ];

    for (const { pattern, pref } of neighborhoodPatterns) {
      if (text.match(pattern)) {
        (accommodation.neighborhood as any)[pref] = true;
      }
    }

    return accommodation;
  }

  private extractActivities(text: string) {
    const activities: any = {};

    const activityPatterns = [
      { pattern: /\b(?:culture|museums?|art|historic)\b/i, interest: 'culture_urban' },
      { pattern: /\b(?:nature|wildlife|hiking|outdoors?)\b/i, interest: 'nature_wildlife' },
      { pattern: /\b(?:water|swimming|beach|snorkeling|diving)\b/i, interest: 'water_sports' },
      { pattern: /\b(?:mountain|skiing|winter|snow)\b/i, interest: 'mountain_winter' },
      { pattern: /\b(?:adventure|extreme|zip.?line|bungee)\b/i, interest: 'adventure' },
      { pattern: /\b(?:wellness|spa|yoga|meditation|relaxation)\b/i, interest: 'wellness' },
      { pattern: /\b(?:food|dining|restaurants?|cuisine)\b/i, interest: 'food_drink' },
      { pattern: /\b(?:family|kids|children|theme park)\b/i, interest: 'family_theme' },
      { pattern: /\b(?:nightlife|bars?|clubs?|party)\b/i, interest: 'nightlife_events' },
      { pattern: /\b(?:learning|workshop|class|course)\b/i, interest: 'learning_workshops' },
      { pattern: /\b(?:shopping|markets?|boutique)\b/i, interest: 'shopping' },
      { pattern: /\b(?:scenic|sightseeing|views?)\b/i, interest: 'scenic_travel' }
    ];

    for (const { pattern, interest } of activityPatterns) {
      if (text.match(pattern)) {
        activities[interest] = true;
      }
    }

    // Pace
    if (text.match(/\b(?:chill|relaxed|slow|easy)\b/i)) {
      activities.pace = 'chill';
    } else if (text.match(/\b(?:packed|busy|full|active)\b/i)) {
      activities.pace = 'packed';
    } else if (text.match(/\b(?:moderate|balanced|mix)\b/i)) {
      activities.pace = 'moderate';
    }

    return activities;
  }

  private extractFoodPreferences(text: string) {
    const food: any = {};

    const formatPatterns = [
      { pattern: /\b(?:fine dining|michelin|upscale)\b/i, format: 'fine_dining' },
      { pattern: /\bcasual\b/i, format: 'casual' },
      { pattern: /\b(?:street food|street)\b/i, format: 'street_food' },
      { pattern: /\b(?:markets?|food markets?)\b/i, format: 'markets' },
      { pattern: /\b(?:cooking class|culinary)\b/i, format: 'cooking_classes' }
    ];

    for (const { pattern, format } of formatPatterns) {
      if (text.match(pattern)) {
        food[format] = true;
      }
    }

    return food;
  }

  private extractBudget(text: string) {
    const budget: any = { currency_display: ["USD", "GBP"] };

    // Per-night budget patterns
    const perNightPatterns = [
      /([£$€¥]?\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:per night|\/night|night)/i,
      /(?:under|max|maximum|cap)\s*([£$€¥]?\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:per night|\/night|night)?/i
    ];

    for (const pattern of perNightPatterns) {
      const match = text.match(pattern);
      if (match) {
        const amount = this.parseCurrencyAmount(match[1]);
        if (amount) {
          budget.per_night_cap = amount.amount;
        }
        break;
      }
    }

    // Total budget patterns
    const totalPatterns = [
      /(?:total|overall|entire)\s*budget\s*(?:of|is)?\s*([£$€¥]?\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      /([£$€¥]?\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:total|overall|for everything)/i
    ];

    for (const pattern of totalPatterns) {
      const match = text.match(pattern);
      if (match) {
        const amount = this.parseCurrencyAmount(match[1]);
        if (amount) {
          budget.total_trip_budget = amount.amount;
        }
        break;
      }
    }

    return budget;
  }

  private parseCurrencyAmount(text: string): { amount: number; currency?: string } | null {
    const cleanAmount = text.replace(/[£$€¥,]/g, '');
    const amount = parseFloat(cleanAmount);
    
    if (isNaN(amount)) return null;

    let currency;
    if (text.includes('£')) currency = 'GBP';
    else if (text.includes('$')) currency = 'USD';
    else if (text.includes('€')) currency = 'EUR';
    else if (text.includes('¥')) currency = 'JPY';

    return { amount, currency };
  }

  private parseMonth(monthStr: string): number {
    const months: Record<string, number> = {
      'january': 1, 'jan': 1,
      'february': 2, 'feb': 2,
      'march': 3, 'mar': 3,
      'april': 4, 'apr': 4,
      'may': 5,
      'june': 6, 'jun': 6,
      'july': 7, 'jul': 7,
      'august': 8, 'aug': 8,
      'september': 9, 'sep': 9,
      'october': 10, 'oct': 10,
      'november': 11, 'nov': 11,
      'december': 12, 'dec': 12
    };
    
    return months[monthStr.toLowerCase()] || 1;
  }

  updateSearchSpec(extracted: Partial<SearchSpec>): void {
    this.searchSpec = this.deepMerge(this.searchSpec, extracted);
    this.searchSpec.last_updated = new Date().toISOString();
    
    if (!this.searchSpec.created_at) {
      this.searchSpec.created_at = this.searchSpec.last_updated;
    }
  }

  getSlotCompleteness(): SlotCompleteness {
    const spec = this.searchSpec;
    
    const location = !!(spec.location?.city || spec.location?.country);
    const dates = !!(spec.dates?.checkin || spec.dates?.nights);
    const occupancy = !!(spec.occupancy?.adults && spec.occupancy.adults > 0);
    const accommodation_type = Object.values(spec.accommodation?.types || {}).some(Boolean);
    const budget = !!(spec.budget?.per_night_cap || spec.budget?.total_trip_budget);

    const core_complete = location && dates && occupancy;
    const preferences_complete = accommodation_type && budget;
    const ready_for_search = core_complete && (accommodation_type || budget);

    return {
      location,
      dates,
      occupancy,
      accommodation_type,
      budget,
      core_complete,
      preferences_complete,
      ready_for_search
    };
  }

  getSearchSpec(): Partial<SearchSpec> {
    return this.searchSpec;
  }

  getMissingSlots(): string[] {
    const completeness = this.getSlotCompleteness();
    const missing: string[] = [];

    if (!completeness.location) missing.push('location');
    if (!completeness.dates) missing.push('dates');
    if (!completeness.occupancy) missing.push('occupancy');
    if (!completeness.accommodation_type && !completeness.budget) {
      missing.push('accommodation preferences or budget');
    }

    return missing;
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else if (source[key] !== undefined) {
        result[key] = source[key];
      }
    }
    
    return result;
  }
}