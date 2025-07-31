// Comprehensive activities database with real locations and pricing
export interface Activity {
  id: string
  name: string
  type: 'sightseeing' | 'restaurant' | 'activity' | 'transport' | 'entertainment' | 'shopping' | 'wellness'
  location: string
  description: string
  duration: number // in minutes
  cost: number // in GBP
  timeSlot: 'morning' | 'afternoon' | 'evening' | 'flexible'
  coordinates?: {
    lat: number
    lng: number
  }
  healthTip?: string
  tags: string[]
  rating: number
  reviewCount: number
  bookingRequired: boolean
}

export interface DestinationActivities {
  name: string
  activities: Activity[]
}

export const activitiesDatabase: DestinationActivities[] = [
  {
    name: 'Italy',
    activities: [
      // Rome Activities
      {
        id: 'colosseum-tour',
        name: 'Colosseum & Roman Forum Tour',
        type: 'sightseeing',
        location: 'Colosseum, Rome',
        description: 'Skip-the-line guided tour of ancient Roman amphitheater and forum',
        duration: 180,
        cost: 45,
        timeSlot: 'morning',
        coordinates: { lat: 41.8902, lng: 12.4922 },
        healthTip: 'Wear comfortable walking shoes for uneven ancient stones',
        tags: ['history', 'ancient', 'guided', 'skip-the-line'],
        rating: 4.7,
        reviewCount: 15420,
        bookingRequired: true
      },
      {
        id: 'vatican-museums',
        name: 'Vatican Museums & Sistine Chapel',
        type: 'sightseeing',
        location: 'Vatican City',
        description: 'World-class art collection including Michelangelo\'s Sistine Chapel',
        duration: 240,
        cost: 65,
        timeSlot: 'morning',
        coordinates: { lat: 41.9034, lng: 12.4546 },
        healthTip: 'Bring water bottle - lots of walking in warm museums',
        tags: ['art', 'history', 'religious', 'renaissance', 'guided'],
        rating: 4.8,
        reviewCount: 23150,
        bookingRequired: true
      },
      {
        id: 'roman-food-tour',
        name: 'Roman Street Food Tour',
        type: 'restaurant',
        location: 'Trastevere, Rome',
        description: 'Guided food tour through authentic Roman neighborhoods',
        duration: 180,
        cost: 55,
        timeSlot: 'evening',
        coordinates: { lat: 41.8839, lng: 12.4677 },
        healthTip: 'Traditional Roman cuisine is rich in healthy olive oil',
        tags: ['food', 'local', 'guided', 'walking', 'authentic'],
        rating: 4.6,
        reviewCount: 8920,
        bookingRequired: true
      },
      {
        id: 'cooking-class-rome',
        name: 'Italian Cooking Class',
        type: 'activity',
        location: 'Central Rome',
        description: 'Learn to make pasta, pizza and tiramisu with local chef',
        duration: 240,
        cost: 75,
        timeSlot: 'afternoon',
        coordinates: { lat: 41.9028, lng: 12.4964 },
        healthTip: 'Learn healthy Mediterranean cooking techniques',
        tags: ['cooking', 'hands-on', 'food', 'local', 'interactive'],
        rating: 4.9,
        reviewCount: 3420,
        bookingRequired: true
      },
      {
        id: 'trevi-fountain-walk',
        name: 'Evening Trevi Fountain Stroll',
        type: 'sightseeing',
        location: 'Trevi Fountain',
        description: 'Romantic evening walk to Rome\'s most famous fountain',
        duration: 60,
        cost: 0,
        timeSlot: 'evening',
        coordinates: { lat: 41.9009, lng: 12.4833 },
        healthTip: 'Evening walks aid digestion after dinner',
        tags: ['romantic', 'free', 'landmark', 'photography'],
        rating: 4.5,
        reviewCount: 12350,
        bookingRequired: false
      },
      // Florence Activities
      {
        id: 'uffizi-gallery',
        name: 'Uffizi Gallery Tour',
        type: 'sightseeing',
        location: 'Florence',
        description: 'Renaissance masterpieces including Botticelli and Da Vinci',
        duration: 180,
        cost: 40,
        timeSlot: 'morning',
        coordinates: { lat: 43.7679, lng: 11.2554 },
        healthTip: 'Museum air conditioning provides relief from Florence heat',
        tags: ['art', 'renaissance', 'museum', 'guided', 'masterpieces'],
        rating: 4.7,
        reviewCount: 18900,
        bookingRequired: true
      },
      {
        id: 'duomo-climb',
        name: 'Florence Cathedral Dome Climb',
        type: 'sightseeing',
        location: 'Florence Cathedral', 
        description: 'Climb 463 steps to the top of Brunelleschi\'s Dome',
        duration: 90,
        cost: 25,
        timeSlot: 'morning',
        coordinates: { lat: 43.7731, lng: 11.2560 },
        healthTip: 'Great cardio workout - equivalent to 30-story building',
        tags: ['architecture', 'climbing', 'views', 'exercise', 'cathedral'],
        rating: 4.6,
        reviewCount: 9840,
        bookingRequired: true
      },
      {
        id: 'tuscan-dinner',
        name: 'Traditional Tuscan Dinner',
        type: 'restaurant',
        location: 'Oltrarno, Florence',
        description: 'Authentic Tuscan cuisine with local wine pairing',
        duration: 150,
        cost: 65,
        timeSlot: 'evening',
        coordinates: { lat: 43.7654, lng: 11.2486 },
        healthTip: 'Tuscan diet rich in olive oil, vegetables and red wine antioxidants',
        tags: ['fine-dining', 'local', 'wine', 'traditional', 'romantic'],
        rating: 4.8,
        reviewCount: 5670,
        bookingRequired: true
      }
    ]
  },
  {
    name: 'France',
    activities: [
      // Paris Activities
      {
        id: 'louvre-tour',
        name: 'Louvre Museum Highlights Tour',
        type: 'sightseeing',
        location: 'Louvre Museum, Paris',
        description: 'Skip-the-line tour featuring Mona Lisa and Venus de Milo',
        duration: 180,
        cost: 55,
        timeSlot: 'morning',
        coordinates: { lat: 48.8606, lng: 2.3376 },
        healthTip: 'Comfortable shoes essential - museum covers 35,000 works',
        tags: ['art', 'museum', 'guided', 'skip-the-line', 'famous'],
        rating: 4.6,
        reviewCount: 28500,
        bookingRequired: true
      },
      {
        id: 'eiffel-tower',
        name: 'Eiffel Tower Summit Visit',
        type: 'sightseeing',
        location: 'Eiffel Tower, Paris',
        description: 'Skip-the-line access to the summit of Paris\' iconic tower',
        duration: 120,
        cost: 35,
        timeSlot: 'afternoon',
        coordinates: { lat: 48.8584, lng: 2.2945 },
        healthTip: 'Elevator ride saves energy for more sightseeing',
        tags: ['landmark', 'views', 'iconic', 'skip-the-line', 'photography'],
        rating: 4.5,
        reviewCount: 45200,
        bookingRequired: true
      },
      {
        id: 'seine-river-cruise',
        name: 'Seine River Evening Cruise',
        type: 'sightseeing',
        location: 'Seine River, Paris',
        description: 'Romantic evening cruise past illuminated landmarks',
        duration: 90,
        cost: 25,
        timeSlot: 'evening',
        coordinates: { lat: 48.8566, lng: 2.3522 },
        healthTip: 'Relaxing boat ride reduces stress after walking tours',
        tags: ['romantic', 'cruise', 'evening', 'landmarks', 'relaxing'],
        rating: 4.4,
        reviewCount: 12400,
        bookingRequired: true
      },
      {
        id: 'french-cooking-class',
        name: 'French Pastry Making Class',
        type: 'activity',
        location: 'Marais District, Paris',
        description: 'Learn to make croissants, macarons and French pastries',
        duration: 180,
        cost: 85,
        timeSlot: 'afternoon',
        coordinates: { lat: 48.8566, lng: 2.3616 },
        healthTip: 'Learn portion control techniques from French culinary tradition',
        tags: ['cooking', 'pastry', 'hands-on', 'local', 'interactive'],
        rating: 4.8,
        reviewCount: 2850,
        bookingRequired: true
      },
      {
        id: 'paris-bistro-dinner',
        name: 'Classic Paris Bistro Experience',
        type: 'restaurant',
        location: 'Saint-Germain, Paris',
        description: 'Traditional French bistro with wine pairing menu',
        duration: 150,
        cost: 75,
        timeSlot: 'evening',
        coordinates: { lat: 48.8534, lng: 2.3350 },
        healthTip: 'French dining emphasizes slower eating for better digestion',
        tags: ['bistro', 'traditional', 'wine', 'authentic', 'romantic'],
        rating: 4.7,
        reviewCount: 8350,
        bookingRequired: true
      }
    ]
  },
  {
    name: 'Japan',
    activities: [
      // Tokyo Activities
      {
        id: 'tsukiji-food-tour',
        name: 'Tsukiji Outer Market Food Tour',
        type: 'restaurant',
        location: 'Tsukiji, Tokyo',
        description: 'Early morning sushi and street food tour at famous market',
        duration: 180,
        cost: 65,
        timeSlot: 'morning',
        coordinates: { lat: 35.6654, lng: 139.7707 },
        healthTip: 'Fresh fish provides omega-3 fatty acids for heart health',
        tags: ['sushi', 'market', 'early-morning', 'authentic', 'guided'],
        rating: 4.9,
        reviewCount: 15600,
        bookingRequired: true
      },
      {
        id: 'senso-ji-temple',
        name: 'Senso-ji Temple & Asakusa District',
        type: 'sightseeing',
        location: 'Asakusa, Tokyo',
        description: 'Tokyo\'s oldest temple with traditional shopping street',
        duration: 120,
        cost: 0,
        timeSlot: 'afternoon',
        coordinates: { lat: 35.7148, lng: 139.7967 },
        healthTip: 'Temple grounds offer peaceful meditation space',
        tags: ['temple', 'traditional', 'free', 'cultural', 'historic'],
        rating: 4.6,
        reviewCount: 22500,
        bookingRequired: false
      },
      {
        id: 'tokyo-cooking-class',
        name: 'Japanese Home Cooking Class',
        type: 'activity',
        location: 'Shibuya, Tokyo',
        description: 'Learn to make sushi, ramen and traditional Japanese dishes',
        duration: 240,
        cost: 90,
        timeSlot: 'afternoon',
        coordinates: { lat: 35.6598, lng: 139.7006 },
        healthTip: 'Japanese cuisine emphasizes fresh ingredients and balanced nutrition',
        tags: ['cooking', 'sushi', 'ramen', 'hands-on', 'authentic'],
        rating: 4.8,
        reviewCount: 4200,
        bookingRequired: true
      },
      {
        id: 'shibuya-crossing',
        name: 'Shibuya Crossing Experience',
        type: 'sightseeing',
        location: 'Shibuya Crossing, Tokyo',
        description: 'Experience the world\'s busiest pedestrian crossing',
        duration: 60,
        cost: 0,
        timeSlot: 'flexible',
        coordinates: { lat: 35.6598, lng: 139.7006 },
        healthTip: 'Walking in crowds burns extra calories',
        tags: ['urban', 'free', 'iconic', 'photography', 'modern'],
        rating: 4.3,
        reviewCount: 18900,
        bookingRequired: false
      },
      {
        id: 'traditional-kaiseki',
        name: 'Traditional Kaiseki Dinner',
        type: 'restaurant',
        location: 'Ginza, Tokyo',
        description: 'Multi-course traditional Japanese haute cuisine experience',
        duration: 180,
        cost: 150,
        timeSlot: 'evening',
        coordinates: { lat: 35.6719, lng: 139.7644 },
        healthTip: 'Kaiseki emphasizes seasonal ingredients and mindful eating',
        tags: ['fine-dining', 'traditional', 'kaiseki', 'seasonal', 'cultural'],
        rating: 4.9,
        reviewCount: 3400,
        bookingRequired: true
      }
    ]
  }
]

// Function to get activities for a destination
export function getActivitiesForDestination(destination: string): Activity[] {
  const dest = activitiesDatabase.find(d => d.name.toLowerCase() === destination.toLowerCase())
  return dest ? dest.activities : []
}

// Function to filter activities by preferences
export function filterActivitiesByPreferences(
  activities: Activity[], 
  preferences: string[]
): Activity[] {
  if (preferences.length === 0) return activities
  
  return activities.filter(activity => 
    preferences.some(pref => 
      activity.tags.some(tag => tag.toLowerCase().includes(pref.toLowerCase())) ||
      activity.type.toLowerCase().includes(pref.toLowerCase())
    )
  )
}

// Function to get activities by time slot
export function getActivitiesByTimeSlot(
  activities: Activity[], 
  timeSlot: 'morning' | 'afternoon' | 'evening'
): Activity[] {
  return activities.filter(activity => 
    activity.timeSlot === timeSlot || activity.timeSlot === 'flexible'
  ).sort((a, b) => b.rating - a.rating) // Sort by rating
}

// Function to calculate distance between two coordinates (Haversine formula)
export function calculateDistance(
  lat1: number, lng1: number, 
  lat2: number, lng2: number
): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c // Distance in kilometers
}

// Function to filter activities by proximity to hotel
export function filterActivitiesByProximity(
  activities: Activity[],
  hotelLat: number,
  hotelLng: number,
  maxDistanceKm: number = 5
): Activity[] {
  return activities.filter(activity => {
    if (!activity.coordinates) return true // Include if no coordinates available
    
    const distance = calculateDistance(
      hotelLat, hotelLng,
      activity.coordinates.lat, activity.coordinates.lng
    )
    
    return distance <= maxDistanceKm
  })
}