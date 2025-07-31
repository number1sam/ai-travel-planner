import { NextRequest, NextResponse } from 'next/server'

interface ActivitySearchParams {
  city: string
  duration: number
  budget: number
  preferences: string[]
  pace: string
}

export async function POST(request: NextRequest) {
  try {
    const { city, duration, budget, preferences, pace }: ActivitySearchParams = await request.json()
    
    if (!city || !duration) {
      return NextResponse.json({ error: 'Missing required activity search parameters' }, { status: 400 })
    }

    console.log('🎯 Searching activities:', { city, duration, budget, preferences, pace })

    // 🧭 6. Activity Planning with Real Sightseeing Ideas
    const activities = await searchActivities(city, duration, budget, preferences, pace)

    return NextResponse.json({
      success: true,
      activities
    })

  } catch (error) {
    console.error('❌ Error in activity search:', error)
    return NextResponse.json(
      { error: 'Failed to search activities' },
      { status: 500 }
    )
  }
}

async function searchActivities(city: string, duration: number, budget: number, preferences: string[], pace: string) {
  // Activities database by city
  const activitiesDatabase: Record<string, any[]> = {
    'rome': [
      // Must-see attractions
      { name: 'Colosseum & Roman Forum', type: 'attraction', cost: 25, duration: '3h', category: 'historical', description: 'Ancient Rome\'s most iconic amphitheater and forum', priority: 1 },
      { name: 'Vatican Museums & Sistine Chapel', type: 'attraction', cost: 30, duration: '4h', category: 'cultural', description: 'World\'s greatest art collection and Michelangelo\'s masterpiece', priority: 1 },
      { name: 'Pantheon', type: 'attraction', cost: 0, duration: '1h', category: 'historical', description: 'Best-preserved Roman temple with stunning dome', priority: 1 },
      { name: 'Trevi Fountain', type: 'attraction', cost: 0, duration: '30m', category: 'landmark', description: 'Baroque fountain - throw a coin for good luck', priority: 1 },
      { name: 'Spanish Steps', type: 'attraction', cost: 0, duration: '45m', category: 'landmark', description: 'Famous stairway and luxury shopping area', priority: 2 },
      { name: 'Villa Borghese Gardens', type: 'attraction', cost: 0, duration: '2h', category: 'nature', description: 'Peaceful park perfect for relaxation', priority: 2 },
      { name: 'Trastevere Walking Tour', type: 'tour', cost: 15, duration: '2h', category: 'cultural', description: 'Explore Rome\'s most charming neighborhood', priority: 2 },
      
      // Restaurants
      { name: 'Lunch at Roscioli', type: 'restaurant', cost: 25, duration: '1h', category: 'food', description: 'Famous deli with exceptional Italian products', priority: 2 },
      { name: 'Dinner at Da Enzo al 29', type: 'restaurant', cost: 30, duration: '2h', category: 'food', description: 'Authentic Roman trattoria in Trastevere', priority: 2 },
      { name: 'Gelato at Giolitti', type: 'restaurant', cost: 5, duration: '15m', category: 'food', description: 'Historic gelateria since 1900', priority: 3 },
      
      // Evening activities
      { name: 'Evening stroll through Trastevere', type: 'free', cost: 0, duration: '2h', category: 'nightlife', description: 'Vibrant nightlife district with bars and restaurants', priority: 2 }
    ],
    
    'florence': [
      { name: 'Uffizi Gallery', type: 'attraction', cost: 25, duration: '3h', category: 'cultural', description: 'Renaissance masterpieces including Botticelli and da Vinci', priority: 1 },
      { name: 'Duomo & Dome Climb', type: 'attraction', cost: 20, duration: '2h', category: 'historical', description: 'Florence\'s iconic cathedral with breathtaking dome views', priority: 1 },
      { name: 'Ponte Vecchio', type: 'attraction', cost: 0, duration: '30m', category: 'landmark', description: 'Medieval bridge lined with jewelry shops', priority: 1 },
      { name: 'Palazzo Pitti & Boboli Gardens', type: 'attraction', cost: 16, duration: '3h', category: 'cultural', description: 'Renaissance palace with stunning gardens', priority: 2 },
      { name: 'Piazzale Michelangelo', type: 'attraction', cost: 0, duration: '1h', category: 'viewpoint', description: 'Best panoramic views of Florence', priority: 2 },
      { name: 'San Lorenzo Market', type: 'attraction', cost: 0, duration: '1h', category: 'shopping', description: 'Historic market for leather goods and souvenirs', priority: 3 },
      
      // Food experiences
      { name: 'Cooking Class', type: 'tour', cost: 65, duration: '4h', category: 'food', description: 'Learn to make authentic Tuscan pasta and sauces', priority: 2 },
      { name: 'Wine Tasting in Oltrarno', type: 'tour', cost: 35, duration: '2h', category: 'food', description: 'Taste Chianti wines in historic wine bar', priority: 3 },
      { name: 'Lunch at Mercato Centrale', type: 'restaurant', cost: 15, duration: '1h', category: 'food', description: 'Gourmet food hall with local specialties', priority: 2 }
    ],
    
    'paris': [
      { name: 'Eiffel Tower', type: 'attraction', cost: 25, duration: '2h', category: 'landmark', description: 'Paris\'s iconic iron tower with stunning city views', priority: 1 },
      { name: 'Louvre Museum', type: 'attraction', cost: 17, duration: '4h', category: 'cultural', description: 'World\'s largest art museum, home to the Mona Lisa', priority: 1 },
      { name: 'Notre-Dame Cathedral', type: 'attraction', cost: 10, duration: '1h', category: 'historical', description: 'Gothic masterpiece (exterior visits due to restoration)', priority: 1 },
      { name: 'Montmartre & Sacré-Cœur', type: 'attraction', cost: 0, duration: '3h', category: 'cultural', description: 'Artistic district with stunning basilica', priority: 1 },
      { name: 'Seine River Cruise', type: 'tour', cost: 15, duration: '1h', category: 'sightseeing', description: 'See Paris landmarks from the water', priority: 2 },
      { name: 'Champs-Élysées & Arc de Triomphe', type: 'attraction', cost: 12, duration: '2h', category: 'landmark', description: 'Famous avenue and Napoleon\'s triumphal arch', priority: 2 },
      { name: 'Latin Quarter Walking Tour', type: 'free', cost: 0, duration: '2h', category: 'cultural', description: 'Historic student quarter with medieval streets', priority: 2 },
      
      // Food experiences
      { name: 'Café Culture at Les Deux Magots', type: 'restaurant', cost: 20, duration: '1h', category: 'food', description: 'Historic café frequented by Hemingway and Picasso', priority: 3 },
      { name: 'French Pastry Workshop', type: 'tour', cost: 75, duration: '3h', category: 'food', description: 'Learn to make croissants and macarons', priority: 3 }
    ],
    
    'athens': [
      { name: 'Acropolis & Parthenon', type: 'attraction', cost: 20, duration: '3h', category: 'historical', description: 'Ancient citadel with iconic temple ruins', priority: 1 },
      { name: 'Acropolis Museum', type: 'attraction', cost: 10, duration: '2h', category: 'cultural', description: 'Modern museum showcasing Acropolis artifacts', priority: 1 },
      { name: 'Ancient Agora', type: 'attraction', cost: 10, duration: '2h', category: 'historical', description: 'Heart of ancient Athens with well-preserved temple', priority: 2 },
      { name: 'Plaka District Walk', type: 'free', cost: 0, duration: '2h', category: 'cultural', description: 'Charming old town with traditional architecture', priority: 2 },
      { name: 'National Archaeological Museum', type: 'attraction', cost: 12, duration: '2h', category: 'cultural', description: 'World\'s finest collection of ancient Greek artifacts', priority: 2 },
      { name: 'Mount Lycabettus', type: 'attraction', cost: 7, duration: '2h', category: 'viewpoint', description: 'Highest point in Athens with panoramic views', priority: 3 },
      
      // Food & Culture
      { name: 'Greek Cooking Class', type: 'tour', cost: 55, duration: '4h', category: 'food', description: 'Learn to prepare moussaka and other Greek classics', priority: 3 },
      { name: 'Dinner in Psyrri', type: 'restaurant', cost: 25, duration: '2h', category: 'food', description: 'Traditional taverna with live Greek music', priority: 2 }
    ]
  }
  
  const cityActivities = activitiesDatabase[city.toLowerCase()] || []
  
  // Filter activities based on preferences
  let filteredActivities = cityActivities
  if (preferences && preferences.length > 0) {
    filteredActivities = cityActivities.filter(activity => 
      preferences.some(pref => 
        activity.category.includes(pref.toLowerCase()) || 
        activity.description.toLowerCase().includes(pref.toLowerCase())
      )
    )
  }
  
  // Adjust quantity based on pace
  let activitiesPerDay = 3 // balanced default
  if (pace === 'fast-paced') activitiesPerDay = 4
  if (pace === 'relaxed') activitiesPerDay = 2
  
  const totalActivities = Math.min(activitiesPerDay * duration, filteredActivities.length)
  
  // Budget per activity
  const budgetPerActivity = budget / totalActivities
  
  // Sort by priority and budget fit
  const sortedActivities = filteredActivities
    .sort((a, b) => {
      // Prioritize by importance first, then by budget fit
      if (a.priority !== b.priority) return a.priority - b.priority
      return Math.abs(a.cost - budgetPerActivity) - Math.abs(b.cost - budgetPerActivity)
    })
    .slice(0, totalActivities)
  
  // Organize by days
  const dailyItineraries = []
  for (let day = 1; day <= duration; day++) {
    const dayActivities = sortedActivities.splice(0, activitiesPerDay)
    dailyItineraries.push({
      day,
      activities: dayActivities,
      dailyCost: dayActivities.reduce((sum, act) => sum + act.cost, 0)
    })
  }
  
  return {
    dailyItineraries,
    totalCost: dailyItineraries.reduce((sum, day) => sum + day.dailyCost, 0),
    activitiesPerDay,
    budgetPerActivity: Math.round(budgetPerActivity)
  }
}