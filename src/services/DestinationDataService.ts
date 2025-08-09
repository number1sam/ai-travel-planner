// Real destination data for generating authentic, detailed itineraries
// Replaces generic placeholder content with specific attractions, restaurants, and activities

export interface DestinationData {
  name: string
  country: string
  majorAttractions: Attraction[]
  restaurants: Restaurant[]
  hotels: Hotel[]
  neighborhoods: Neighborhood[]
  transportation: Transportation
  activities: ActivityTemplate[]
  dayTemplates: DayTemplate[]
}

export interface Attraction {
  name: string
  type: 'museum' | 'temple' | 'park' | 'landmark' | 'market' | 'district' | 'castle' | 'garden'
  location: string
  visitDuration: number // minutes
  openTime: string
  closeTime: string
  price: number
  description: string
  nearbyTo?: string[]
  bestTimeToVisit: string[]
  interests: string[] // matches user preference interests
}

export interface Restaurant {
  name: string
  type: 'traditional' | 'modern' | 'street-food' | 'fine-dining' | 'casual' | 'market'
  cuisine: string
  location: string
  priceRange: 'budget' | 'mid-range' | 'expensive'
  avgPrice: number
  description: string
  specialties: string[]
  nearbyTo: string[]
}

export interface Hotel {
  name: string
  location: string
  type: 'luxury' | 'mid-range' | 'budget' | 'boutique'
  pricePerNight: number
  rating: number
  amenities: string[]
  description: string
  nearbyAttractions: string[]
}

export interface Neighborhood {
  name: string
  description: string
  bestFor: string[]
  walkingTimeFromCenter: number
  attractions: string[]
  restaurants: string[]
}

export interface Transportation {
  fromAirport: {
    methods: string[]
    duration: string
    cost: number
  }
  withinCity: {
    primary: string
    cost: number
    passes: string[]
  }
}

export interface ActivityTemplate {
  name: string
  type: string
  duration: number
  interests: string[]
  locations: string[]
  description: string
  priceRange: [number, number]
}

export interface DayTemplate {
  theme: string
  interests: string[]
  activities: string[]
  flow: string
}

class DestinationDataService {
  private destinationData: { [key: string]: DestinationData } = {}

  constructor() {
    this.initializeDestinationData()
  }

  private initializeDestinationData() {
    // JAPAN - Comprehensive real data
    this.destinationData['japan'] = {
      name: 'Japan',
      country: 'Japan',
      majorAttractions: [
        {
          name: 'Senso-ji Temple',
          type: 'temple',
          location: 'Asakusa, Tokyo',
          visitDuration: 120,
          openTime: '06:00',
          closeTime: '17:00',
          price: 0,
          description: 'Tokyo\'s oldest Buddhist temple, founded in 628 AD, famous for its Thunder Gate and traditional shopping street Nakamise-dori.',
          nearbyTo: ['Tokyo Skytree', 'Nakamise Shopping Street'],
          bestTimeToVisit: ['morning', 'afternoon'],
          interests: ['History & Culture', 'Architecture']
        },
        {
          name: 'Tsukiji Outer Market',
          type: 'market',
          location: 'Tsukiji, Tokyo',
          visitDuration: 180,
          openTime: '05:00',
          closeTime: '14:00',
          price: 0,
          description: 'World-famous fish market offering the freshest sushi, street food, and culinary experiences in Tokyo.',
          nearbyTo: ['Imperial Palace', 'Ginza'],
          bestTimeToVisit: ['early-morning'],
          interests: ['Food & Dining', 'Local Culture']
        },
        {
          name: 'Meiji Shrine',
          type: 'temple',
          location: 'Shibuya, Tokyo',
          visitDuration: 90,
          openTime: '05:00',
          closeTime: '18:00',
          price: 0,
          description: 'Peaceful Shinto shrine dedicated to Emperor Meiji, surrounded by a beautiful forest in the heart of Tokyo.',
          nearbyTo: ['Harajuku', 'Omotesando', 'Shibuya Crossing'],
          bestTimeToVisit: ['morning', 'afternoon'],
          interests: ['History & Culture', 'Nature & Outdoors', 'Spirituality']
        },
        {
          name: 'Shibuya Crossing',
          type: 'landmark',
          location: 'Shibuya, Tokyo',
          visitDuration: 30,
          openTime: '00:00',
          closeTime: '23:59',
          price: 0,
          description: 'The world\'s busiest pedestrian crossing, an iconic symbol of Tokyo\'s energy and modern urban life.',
          nearbyTo: ['Meiji Shrine', 'Harajuku', 'Omotesando'],
          bestTimeToVisit: ['evening', 'night'],
          interests: ['Modern Culture', 'Urban Experience']
        },
        {
          name: 'Gion District',
          type: 'district',
          location: 'Kyoto',
          visitDuration: 240,
          openTime: '09:00',
          closeTime: '22:00',
          price: 0,
          description: 'Historic geisha district with traditional wooden buildings, tea houses, and the chance to spot geishas and maikos.',
          nearbyTo: ['Kiyomizu-dera Temple', 'Yasaka Shrine'],
          bestTimeToVisit: ['evening', 'afternoon'],
          interests: ['History & Culture', 'Traditional Arts', 'Photography']
        },
        {
          name: 'Fushimi Inari Shrine',
          type: 'temple',
          location: 'Kyoto',
          visitDuration: 180,
          openTime: '24/7',
          closeTime: '24/7',
          price: 0,
          description: 'Famous for thousands of vermillion torii gates creating tunnels up Mount Inari, offering spectacular views and spiritual experience.',
          nearbyTo: ['Kyoto Station'],
          bestTimeToVisit: ['early-morning', 'late-afternoon'],
          interests: ['History & Culture', 'Nature & Outdoors', 'Photography', 'Hiking']
        }
      ],
      restaurants: [
        {
          name: 'Jiro Honten',
          type: 'fine-dining',
          cuisine: 'Sushi',
          location: 'Ginza, Tokyo',
          priceRange: 'expensive',
          avgPrice: 120,
          description: 'World-renowned sushi restaurant by master Jiro Ono, offering the finest omakase experience.',
          specialties: ['Omakase Sushi', 'Fresh Fish', 'Traditional Techniques'],
          nearbyTo: ['Imperial Palace', 'Tsukiji Market']
        },
        {
          name: 'Ichiran Ramen',
          type: 'casual',
          cuisine: 'Ramen',
          location: 'Multiple locations',
          priceRange: 'budget',
          avgPrice: 12,
          description: 'Famous tonkotsu ramen chain with individual booth dining and customizable flavor options.',
          specialties: ['Tonkotsu Ramen', 'Customizable Broth', 'Solo Dining Experience'],
          nearbyTo: ['Shibuya', 'Shinjuku', 'Harajuku']
        },
        {
          name: 'Ganko Sushi',
          type: 'traditional',
          cuisine: 'Sushi',
          location: 'Kyoto',
          priceRange: 'mid-range',
          avgPrice: 45,
          description: 'Traditional Kyoto sushi restaurant serving fresh fish with local hospitality and authentic atmosphere.',
          specialties: ['Fresh Sashimi', 'Kyoto-style Sushi', 'Seasonal Fish'],
          nearbyTo: ['Gion District', 'Kiyomizu-dera']
        },
        {
          name: 'Takoyaki Wanaka',
          type: 'street-food',
          cuisine: 'Street Food',
          location: 'Osaka',
          priceRange: 'budget',
          avgPrice: 8,
          description: 'Beloved local takoyaki stand serving Osaka\'s famous octopus balls with authentic flavors.',
          specialties: ['Takoyaki', 'Osaka Soul Food', 'Street Food Experience'],
          nearbyTo: ['Dotonbori', 'Osaka Castle']
        }
      ],
      hotels: [
        {
          name: 'Tokyo Station Hotel',
          location: 'Marunouchi, Tokyo',
          type: 'luxury',
          pricePerNight: 280,
          rating: 4.8,
          amenities: ['Free WiFi', '24/7 Concierge', 'Spa', 'Fine Dining', 'Business Center'],
          description: 'Historic luxury hotel located inside Tokyo Station, offering elegant rooms and world-class service.',
          nearbyAttractions: ['Imperial Palace', 'Ginza', 'Tokyo Station']
        },
        {
          name: 'Shibuya Excel Hotel Tokyu',
          location: 'Shibuya, Tokyo',
          type: 'mid-range',
          pricePerNight: 120,
          rating: 4.3,
          amenities: ['Free WiFi', 'Restaurant', 'City Views', 'Convenient Location'],
          description: 'Modern hotel directly connected to Shibuya Station with stunning city views and easy access to attractions.',
          nearbyAttractions: ['Shibuya Crossing', 'Meiji Shrine', 'Harajuku']
        },
        {
          name: 'Kyoto Gion Hotel',
          location: 'Gion, Kyoto',
          type: 'boutique',
          pricePerNight: 180,
          rating: 4.5,
          amenities: ['Traditional Design', 'Japanese Breakfast', 'Tea Ceremony', 'Garden Views'],
          description: 'Charming boutique hotel in the heart of historic Gion district, blending traditional Japanese style with modern comfort.',
          nearbyAttractions: ['Gion District', 'Yasaka Shrine', 'Kiyomizu-dera']
        }
      ],
      neighborhoods: [
        {
          name: 'Shibuya',
          description: 'Energetic district known for the famous crossing, shopping, and nightlife',
          bestFor: ['Modern Culture', 'Shopping', 'Nightlife', 'Urban Experience'],
          walkingTimeFromCenter: 0,
          attractions: ['Shibuya Crossing', 'Meiji Shrine'],
          restaurants: ['Ichiran Ramen', 'Local Izakayas']
        },
        {
          name: 'Asakusa',
          description: 'Traditional district preserving old Tokyo atmosphere with temples and traditional crafts',
          bestFor: ['History & Culture', 'Traditional Arts', 'Local Shopping'],
          walkingTimeFromCenter: 15,
          attractions: ['Senso-ji Temple', 'Nakamise Shopping Street'],
          restaurants: ['Traditional Tempura', 'Tea Houses']
        },
        {
          name: 'Gion',
          description: 'Historic geisha district in Kyoto with traditional architecture and cultural experiences',
          bestFor: ['History & Culture', 'Traditional Arts', 'Photography'],
          walkingTimeFromCenter: 10,
          attractions: ['Gion District', 'Yasaka Shrine'],
          restaurants: ['Traditional Kaiseki', 'Tea Houses']
        }
      ],
      transportation: {
        fromAirport: {
          methods: ['Narita Express', 'Airport Limousine Bus', 'Taxi'],
          duration: '60-90 minutes',
          cost: 25
        },
        withinCity: {
          primary: 'JR Yamanote Line & Tokyo Metro',
          cost: 2.5,
          passes: ['Tokyo Metro 24/48/72h Pass', 'JR Pass']
        }
      },
      activities: [
        {
          name: 'Traditional Tea Ceremony',
          type: 'cultural',
          duration: 90,
          interests: ['History & Culture', 'Traditional Arts'],
          locations: ['Kyoto', 'Tokyo Traditional Districts'],
          description: 'Authentic Japanese tea ceremony experience with master instruction',
          priceRange: [35, 65]
        },
        {
          name: 'Sushi Making Class',
          type: 'culinary',
          duration: 180,
          interests: ['Food & Dining', 'Hands-on Experience'],
          locations: ['Tsukiji Area', 'Kyoto', 'Local Cooking Schools'],
          description: 'Learn to make authentic sushi from professional chefs',
          priceRange: [55, 95]
        }
      ],
      dayTemplates: [
        {
          theme: 'Traditional Culture Day',
          interests: ['History & Culture', 'Traditional Arts'],
          activities: ['Temple Visit', 'Traditional Neighborhood Walk', 'Cultural Experience', 'Traditional Dining'],
          flow: 'Start with major temple → explore traditional district → hands-on cultural activity → authentic local dinner'
        },
        {
          theme: 'Food Adventure Day',
          interests: ['Food & Dining', 'Local Culture'],
          activities: ['Market Visit', 'Cooking Class', 'Street Food Tour', 'Fine Dining'],
          flow: 'Early market exploration → cooking/food experience → street food discoveries → memorable dinner'
        }
      ]
    }

    // FRANCE - Add basic data (can be expanded)
    this.destinationData['france'] = {
      name: 'France',
      country: 'France',
      majorAttractions: [
        {
          name: 'Eiffel Tower',
          type: 'landmark',
          location: '7th Arrondissement, Paris',
          visitDuration: 180,
          openTime: '09:30',
          closeTime: '22:45',
          price: 25,
          description: 'Iconic iron tower offering breathtaking views of Paris from multiple levels.',
          nearbyTo: ['Trocadéro', 'Seine River', 'Champ de Mars'],
          bestTimeToVisit: ['sunset', 'evening'],
          interests: ['Architecture', 'Photography', 'City Views']
        },
        {
          name: 'Louvre Museum',
          type: 'museum',
          location: '1st Arrondissement, Paris',
          visitDuration: 240,
          openTime: '09:00',
          closeTime: '18:00',
          price: 17,
          description: 'World\'s largest art museum housing the Mona Lisa, Venus de Milo, and countless masterpieces.',
          nearbyTo: ['Tuileries Garden', 'Place Vendôme', 'Seine River'],
          bestTimeToVisit: ['morning', 'afternoon'],
          interests: ['History & Culture', 'Art', 'Museums']
        }
      ],
      restaurants: [
        {
          name: 'Le Comptoir du Relais',
          type: 'traditional',
          cuisine: 'French',
          location: '6th Arrondissement, Paris',
          priceRange: 'mid-range',
          avgPrice: 35,
          description: 'Authentic Parisian bistro serving classic French cuisine in a cozy atmosphere.',
          specialties: ['Coq au Vin', 'French Onion Soup', 'Traditional Bistro Fare'],
          nearbyTo: ['Luxembourg Gardens', 'Saint-Germain']
        }
      ],
      hotels: [
        {
          name: 'Hotel des Invalides',
          location: '7th Arrondissement, Paris',
          type: 'mid-range',
          pricePerNight: 150,
          rating: 4.2,
          amenities: ['Free WiFi', 'Concierge', 'Breakfast', 'Historic Building'],
          description: 'Elegant Parisian hotel near major attractions with classic French hospitality.',
          nearbyAttractions: ['Eiffel Tower', 'Invalides', 'Seine River']
        }
      ],
      neighborhoods: [],
      transportation: {
        fromAirport: {
          methods: ['RER B', 'Airport Bus', 'Taxi'],
          duration: '45-60 minutes',
          cost: 15
        },
        withinCity: {
          primary: 'Metro & Bus',
          cost: 1.9,
          passes: ['Navigo Weekly Pass', 'Navigo Day Pass']
        }
      },
      activities: [],
      dayTemplates: []
    }
  }

  getDestinationData(destination: string): DestinationData | null {
    const key = destination.toLowerCase()
    return this.destinationData[key] || null
  }

  generateRealisticItinerary(tripContext: any): any {
    const destinationKey = tripContext.destination?.primary?.toLowerCase()
    const destinationData = this.getDestinationData(destinationKey)
    
    if (!destinationData) {
      // Fall back to generic generation for unknown destinations
      return null
    }

    const { duration } = tripContext.dates
    const interests = tripContext.preferences?.interests || []
    const style = tripContext.preferences?.style || 'mid-range'
    
    // Select appropriate hotel based on style
    const availableHotels = destinationData.hotels.filter(h => {
      if (style === 'luxury') return h.type === 'luxury' || h.type === 'boutique'
      if (style === 'budget') return h.type === 'budget' || h.type === 'mid-range'
      return h.type === 'mid-range' || h.type === 'boutique'
    })
    const selectedHotel = availableHotels[0] || destinationData.hotels[0]

    // Generate days with real attractions and activities
    const days = []
    for (let dayNum = 1; dayNum <= duration; dayNum++) {
      const isArrival = dayNum === 1
      const isDeparture = dayNum === duration

      if (isArrival) {
        days.push(this.generateArrivalDay(dayNum, selectedHotel, destinationData, tripContext))
      } else if (isDeparture) {
        days.push(this.generateDepartureDay(dayNum, selectedHotel, destinationData, tripContext))
      } else {
        days.push(this.generateExplorationDay(dayNum, selectedHotel, destinationData, tripContext, interests))
      }
    }

    return {
      hotel: selectedHotel,
      days,
      totalCost: this.calculateTotalCost(days, selectedHotel, duration),
      transportation: destinationData.transportation
    }
  }

  private generateArrivalDay(dayNum: number, hotel: Hotel, destinationData: DestinationData, tripContext: any): any {
    return {
      day: dayNum,
      title: `Arrival in ${destinationData.name}`,
      activities: [
        {
          id: `arrival-${dayNum}`,
          name: `Arrival & Check-in at ${hotel.name}`,
          type: 'logistics',
          time: '15:00',
          duration: 90,
          location: hotel.location,
          description: `Arrive in ${destinationData.name} and check into ${hotel.name}. ${hotel.description}`,
          price: 0
        },
        {
          id: `welcome-dinner-${dayNum}`,
          name: 'Welcome Dinner',
          type: 'dining',
          time: '19:00',
          duration: 120,
          location: hotel.location,
          description: `Start your ${destinationData.name} adventure with dinner at a local restaurant near your hotel, sampling authentic local cuisine.`,
          price: 35
        }
      ]
    }
  }

  private generateDepartureDay(dayNum: number, hotel: Hotel, destinationData: DestinationData, tripContext: any): any {
    return {
      day: dayNum,
      title: `Departure from ${destinationData.name}`,
      activities: [
        {
          id: `final-breakfast-${dayNum}`,
          name: 'Final Breakfast',
          type: 'dining',
          time: '08:00',
          duration: 60,
          location: hotel.location,
          description: `Enjoy your final breakfast at ${hotel.name} and take in the views of ${destinationData.name} one last time.`,
          price: 20
        },
        {
          id: `checkout-${dayNum}`,
          name: 'Hotel Checkout & Departure',
          type: 'logistics',
          time: '11:00',
          duration: 120,
          location: hotel.location,
          description: `Check out from ${hotel.name} and prepare for your journey home. Consider last-minute souvenir shopping if time permits.`,
          price: 0
        }
      ]
    }
  }

  private generateExplorationDay(dayNum: number, hotel: Hotel, destinationData: DestinationData, tripContext: any, interests: string[]): any {
    // Select attractions based on interests
    const relevantAttractions = destinationData.majorAttractions.filter(attraction => 
      interests.some(interest => attraction.interests.includes(interest))
    ).slice(0, 2) // Limit to 2 main attractions per day

    if (relevantAttractions.length === 0) {
      relevantAttractions.push(destinationData.majorAttractions[0]) // At least one attraction
    }

    // Select restaurants based on style preference
    const style = tripContext.preferences?.style || 'mid-range'
    const relevantRestaurants = destinationData.restaurants.filter(restaurant =>
      (style === 'luxury' && restaurant.priceRange === 'expensive') ||
      (style === 'budget' && restaurant.priceRange === 'budget') ||
      (style === 'mid-range' && (restaurant.priceRange === 'mid-range' || restaurant.priceRange === 'budget'))
    )

    const activities = [
      {
        id: `breakfast-${dayNum}`,
        name: 'Hotel Breakfast',
        type: 'dining',
        time: '08:00',
        duration: 60,
        location: hotel.location,
        description: `Start your day with breakfast at ${hotel.name} before exploring ${destinationData.name}.`,
        price: 20
      }
    ]

    // Add main attractions
    let currentTime = 10 * 60 // 10:00 in minutes
    relevantAttractions.forEach((attraction, index) => {
      const startHour = Math.floor(currentTime / 60)
      const startMin = currentTime % 60
      const timeString = `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`

      activities.push({
        id: `attraction-${dayNum}-${index}`,
        name: `Visit ${attraction.name}`,
        type: 'attraction',
        time: timeString,
        duration: attraction.visitDuration,
        location: attraction.location,
        description: `${attraction.description} ${attraction.nearbyTo?.length ? `Located near ${attraction.nearbyTo.join(', ')}.` : ''}`,
        price: attraction.price
      })

      currentTime += attraction.visitDuration + 30 // Add travel time
    })

    // Add lunch
    const lunchRestaurant = relevantRestaurants[0] || destinationData.restaurants[0]
    if (lunchRestaurant) {
      const lunchHour = Math.floor(currentTime / 60)
      const lunchMin = currentTime % 60
      const lunchTime = `${lunchHour.toString().padStart(2, '0')}:${lunchMin.toString().padStart(2, '0')}`

      activities.push({
        id: `lunch-${dayNum}`,
        name: `Lunch at ${lunchRestaurant.name}`,
        type: 'dining',
        time: lunchTime,
        duration: 90,
        location: lunchRestaurant.location,
        description: `${lunchRestaurant.description} Known for: ${lunchRestaurant.specialties.join(', ')}.`,
        price: lunchRestaurant.avgPrice
      })
    }

    return {
      day: dayNum,
      title: `Exploring ${destinationData.name}`,
      activities
    }
  }

  private calculateTotalCost(days: any[], hotel: Hotel, duration: number): number {
    const activityCosts = days.reduce((total, day) => {
      return total + day.activities.reduce((dayTotal: number, activity: any) => dayTotal + activity.price, 0)
    }, 0)
    
    const hotelCosts = hotel.pricePerNight * duration
    return activityCosts + hotelCosts
  }
}

export default DestinationDataService