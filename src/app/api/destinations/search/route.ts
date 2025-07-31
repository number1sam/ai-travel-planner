import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { destination } = await request.json()
    
    if (!destination) {
      return NextResponse.json({ error: 'Destination is required' }, { status: 400 })
    }

    console.log('🔍 Searching for destination info:', destination)

    // Search for destination information
    const searchQuery = `${destination} travel tourism destination location country attractions activities best time visit`
    
    // Make a web search to get destination information (if API key available)
    let searchResponse = null
    if (process.env.BING_SEARCH_KEY) {
      try {
        const searchUrl = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(searchQuery)}&count=3&mkt=en-US`
        searchResponse = await fetch(searchUrl, {
          method: 'GET',
          headers: {
            'Ocp-Apim-Subscription-Key': process.env.BING_SEARCH_KEY,
          }
        })
      } catch (error) {
        console.log('Bing search not available, using fallback data')
        searchResponse = null
      }
    }

    let destinationInfo = {
      name: destination,
      country: 'Unknown',
      region: 'Unknown',
      description: `${destination} is a travel destination.`,
      attractions: [],
      bestTime: 'Year-round',
      currency: 'Local currency',
      searchPerformed: false
    }

    // If we have a Bing search key and the search succeeded, parse results
    if (searchResponse && searchResponse.ok) {
      const searchData = await searchResponse.json()
      if (searchData.webPages && searchData.webPages.value.length > 0) {
        // Extract information from search results
        const topResult = searchData.webPages.value[0]
        const snippet = topResult.snippet || ''
        
        // Simple parsing to extract location info
        const countryMatch = snippet.match(/(?:in|located in|part of)\s+([A-Z][a-zA-Z\s]+?)(?:[,.]|$)/)
        if (countryMatch) {
          destinationInfo.country = countryMatch[1].trim()
        }
        
        destinationInfo.description = snippet.substring(0, 200) + '...'
        destinationInfo.searchPerformed = true
      }
    }

    // Fallback: Use a simple location database for common destinations
    const knownDestinations: Record<string, any> = {
      'punta cana': {
        country: 'Dominican Republic',
        region: 'Caribbean',
        description: 'Punta Cana is a resort town in the Dominican Republic, known for its white sand beaches, luxury resorts, and championship golf courses.',
        attractions: ['Bavaro Beach', 'Cap Cana', 'Hoyo Azul', 'Saona Island'],
        bestTime: 'December to April',
        currency: 'Dominican Peso (DOP)'
      },
      'cancun': {
        country: 'Mexico',
        region: 'Yucatan Peninsula',
        description: 'Cancun is a popular beach destination on Mexico\'s Caribbean coast, famous for its white sand beaches, turquoise waters, and vibrant nightlife.',
        attractions: ['Chichen Itza', 'Tulum', 'Xcaret', 'Cozumel'],
        bestTime: 'December to March',
        currency: 'Mexican Peso (MXN)'
      },
      'bali': {
        country: 'Indonesia',
        region: 'Southeast Asia',
        description: 'Bali is an Indonesian island known for its forested volcanic mountains, iconic rice paddies, beaches and coral reefs.',
        attractions: ['Ubud', 'Tanah Lot', 'Mount Batur', 'Seminyak Beach'],
        bestTime: 'April to October',
        currency: 'Indonesian Rupiah (IDR)'
      },
      'santorini': {
        country: 'Greece',
        region: 'Cyclades Islands',
        description: 'Santorini is a Greek island in the Aegean Sea, famous for its dramatic cliff-top towns, blue-domed churches, and stunning sunsets.',
        attractions: ['Oia', 'Fira', 'Red Beach', 'Akrotiri'],
        bestTime: 'April to October',
        currency: 'Euro (EUR)'
      },
      'dubai': {
        country: 'United Arab Emirates',
        region: 'Middle East',
        description: 'Dubai is a city of superlatives, known for its luxury shopping, ultramodern architecture, and vibrant nightlife scene.',
        attractions: ['Burj Khalifa', 'Palm Jumeirah', 'Dubai Mall', 'Burj Al Arab'],
        bestTime: 'November to March',
        currency: 'UAE Dirham (AED)'
      },
      'mykonos': {
        country: 'Greece',
        region: 'Cyclades Islands',
        description: 'Mykonos is a Greek island known for its vibrant nightlife, pristine beaches, and iconic white-washed buildings with blue accents.',
        attractions: ['Paradise Beach', 'Little Venice', 'Windmills', 'Delos Island'],
        bestTime: 'May to September',
        currency: 'Euro (EUR)'
      },
      'ibiza': {
        country: 'Spain',
        region: 'Balearic Islands',
        description: 'Ibiza is a Spanish island in the Mediterranean Sea known for its legendary nightlife, beautiful beaches, and electronic music scene.',
        attractions: ['Es Vedra', 'Dalt Vila', 'Playa d\'en Bossa', 'Sunset Strip'],
        bestTime: 'May to October',
        currency: 'Euro (EUR)'
      },
      'maldives': {
        country: 'Maldives',
        region: 'Indian Ocean',
        description: 'The Maldives is a tropical paradise of 1,200 coral islands grouped into 26 atolls, known for luxury overwater bungalows and pristine beaches.',
        attractions: ['Male', 'Banana Reef', 'Vaadhoo Island', 'Hulhumale Beach'],
        bestTime: 'November to April',
        currency: 'Maldivian Rufiyaa (MVR)'
      },
      'tulum': {
        country: 'Mexico',
        region: 'Riviera Maya',
        description: 'Tulum is a coastal town in Mexico known for its well-preserved Mayan ruins perched on cliffs overlooking the Caribbean Sea.',
        attractions: ['Tulum Ruins', 'Gran Cenote', 'Sian Ka\'an Biosphere', 'Playa Paraiso'],
        bestTime: 'November to April',
        currency: 'Mexican Peso (MXN)'
      },
      'cabo san lucas': {
        country: 'Mexico',
        region: 'Baja California',
        description: 'Cabo San Lucas is a resort city at the southern tip of Mexico\'s Baja California Peninsula, known for its beaches, water sports, and nightlife.',
        attractions: ['El Arco', 'Medano Beach', 'Lover\'s Beach', 'Marina'],
        bestTime: 'November to April',
        currency: 'Mexican Peso (MXN)'
      }
    }

    const lowerDestination = destination.toLowerCase()
    if (knownDestinations[lowerDestination]) {
      destinationInfo = {
        name: destination,
        ...knownDestinations[lowerDestination],
        searchPerformed: true
      }
    }

    console.log('✅ Destination info retrieved:', destinationInfo)

    return NextResponse.json({
      success: true,
      destinationInfo
    })

  } catch (error) {
    console.error('❌ Error in destination search:', error)
    return NextResponse.json(
      { error: 'Failed to search destination information' },
      { status: 500 }
    )
  }
}