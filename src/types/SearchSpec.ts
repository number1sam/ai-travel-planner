export interface Location {
  city?: string;
  country?: string;
  region?: string;
  lat?: number;
  lon?: number;
  radius_km?: number;
  flexible?: boolean;
}

export interface DateRange {
  checkin?: string; // ISO date
  nights?: number;
  flex_days?: number;
  checkout?: string; // calculated or provided
}

export interface Occupancy {
  adults: number;
  children: number[];
  rooms: number;
  accessibility_needs?: string[];
  dietary_needs?: string[];
}

export interface AccommodationType {
  hotel?: boolean;
  hostel?: boolean;
  aparthotel?: boolean;
  rental?: boolean;
  villa?: boolean;
  cabin?: boolean;
  glamping?: boolean;
  camping?: boolean;
  boatel?: boolean;
  ryokan?: boolean;
}

export interface AccommodationFeatures {
  wifi?: boolean;
  ac?: boolean;
  pool?: boolean;
  spa?: boolean;
  gym?: boolean;
  kitchen?: boolean;
  parking?: boolean;
  front_desk_24h?: boolean;
  laundry?: boolean;
  pet_friendly?: boolean;
}

export interface AccessibilityFeatures {
  step_free?: boolean;
  lift?: boolean;
  roll_in_shower?: boolean;
  hearing_aids?: boolean;
  visual_aids?: boolean;
  service_animal_friendly?: boolean;
}

export interface NeighborhoodPreference {
  central?: boolean;
  beach?: boolean;
  nature?: boolean;
  near_transport?: boolean;
  quiet?: boolean;
}

export interface TransportPreferences {
  long_distance: {
    flight_ok?: boolean;
    train_ok?: boolean;
    coach_ok?: boolean;
    ferry_ok?: boolean;
    cabin_class?: 'economy' | 'premium' | 'business' | 'first';
    airports_ok?: string[];
    stations_ok?: string[];
    baggage_requirements?: string;
  };
  local: {
    public_transport?: boolean;
    taxi_ridehail?: boolean;
    car_hire?: {
      needed: boolean;
      type?: string;
      ev_preferred?: boolean;
      one_way?: boolean;
    };
    transfers?: 'private' | 'shared' | 'rail';
  };
}

export interface ActivityInterests {
  culture_urban?: boolean;
  nature_wildlife?: boolean;
  water_sports?: boolean;
  mountain_winter?: boolean;
  adventure?: boolean;
  wellness?: boolean;
  food_drink?: boolean;
  family_theme?: boolean;
  nightlife_events?: boolean;
  learning_workshops?: boolean;
  shopping?: boolean;
  scenic_travel?: boolean;
  special_experiences?: string[];
  must_dos?: string[];
  avoid_at_all_costs?: string[];
  pace?: 'chill' | 'moderate' | 'packed';
}

export interface FoodDiningPreferences {
  fine_dining?: boolean;
  casual?: boolean;
  street_food?: boolean;
  markets?: boolean;
  cooking_classes?: boolean;
  dietary_patterns?: ('vegetarian' | 'vegan' | 'halal' | 'kosher' | 'gluten_free' | 
                      'lactose_free' | 'low_fodmap' | 'nut_free')[];
}

export interface BudgetConstraints {
  total_trip_budget?: number;
  per_night_cap?: number;
  currency_display: string[]; // e.g., ["USD", "GBP"]
  payment_instruments?: string[];
}

export interface DocumentsInsurance {
  passports_held?: string[];
  visa_status?: string;
  driving_license?: boolean;
  idp_needed?: boolean;
  insurance_needs?: {
    single_trip?: boolean;
    annual?: boolean;
    medical_evac?: boolean;
    cancellation?: boolean;
    baggage?: boolean;
    gadgets?: boolean;
    rental_car_excess?: boolean;
    adventure_sports?: boolean;
  };
}

export interface TripVibe {
  romantic?: boolean;
  family?: boolean;
  business?: boolean;
  party?: boolean;
  quiet?: boolean;
  luxury?: boolean;
  budget?: boolean;
  eco?: boolean;
  boutique?: boolean;
}

export interface SearchSpec {
  location: Location;
  dates: DateRange;
  occupancy: Occupancy;
  accommodation: {
    types: AccommodationType;
    features: AccommodationFeatures;
    accessibility: AccessibilityFeatures;
    vibe: TripVibe;
    neighborhood: NeighborhoodPreference;
  };
  transport: TransportPreferences;
  activities: ActivityInterests;
  food: FoodDiningPreferences;
  budget: BudgetConstraints;
  docs_insurance: DocumentsInsurance;
  created_at: string;
  last_updated: string;
}

export interface SlotCompleteness {
  location: boolean;
  dates: boolean;
  occupancy: boolean;
  accommodation_type: boolean;
  budget: boolean;
  core_complete: boolean;
  preferences_complete: boolean;
  ready_for_search: boolean;
}

export interface SearchResult {
  id: string;
  name: string;
  type: string;
  star_rating?: number;
  user_rating?: number;
  neighborhood: string;
  distance_to_center?: number;
  distance_to_beach?: number;
  distance_to_transport?: number;
  why_it_fits: string[];
  price: {
    native: { amount: number; currency: string; per_night: boolean };
    usd: { amount: number; per_night: boolean };
    gbp: { amount: number; per_night: boolean };
    taxes_included: boolean;
    quote_timestamp: string;
  };
  features: string[];
  accessibility_features: string[];
  booking_link: string;
  fit_score: number;
  score_breakdown: {
    type_match: number;
    features_match: number;
    vibe_match: number;
    location_bonus: number;
    review_bonus: number;
    price_fit: number;
    accessibility_bonus: number;
  };
}