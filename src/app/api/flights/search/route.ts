import { NextRequest, NextResponse } from 'next/server'

interface FlightSearchParams {
  departure: string
  destination: string
  departureDate: string
  returnDate: string
  travelers: number
  budget: number
}

export async function POST(request: NextRequest) {
  try {
    const { departure, destination, departureDate, returnDate, travelers, budget }: FlightSearchParams = await request.json()
    
    if (!departure || !destination || !departureDate || !returnDate) {
      return NextResponse.json({ error: 'Missing required flight search parameters' }, { status: 400 })
    }

    console.log('🛫 Searching flights:', { departure, destination, departureDate, returnDate, travelers, budget })

    // 🛫 4. Realistic Flight Search with Budget Constraints
    const flights = await searchFlights(departure, destination, departureDate, returnDate, travelers, budget)

    return NextResponse.json({
      success: true,
      flights
    })

  } catch (error) {
    console.error('❌ Error in flight search:', error)
    return NextResponse.json(
      { error: 'Failed to search flights' },
      { status: 500 }
    )
  }
}

async function searchFlights(departure: string, destination: string, departureDate: string, returnDate: string, travelers: number, budget: number) {
  // For now, we'll use realistic mock data based on routes and seasons
  // In production, this would integrate with Skyscanner, Amadeus, or Kiwi APIs
  
  const flightRoutes: Record<string, any> = {
    // UK to Europe routes
    'london-rome': {
      airlines: ['British Airways', 'easyJet', 'Ryanair', 'Alitalia'],
      duration: '2h 45m',
      basePrice: 150,
      airports: { departure: 'LHR', arrival: 'FCO' }
    },
    'london-paris': {
      airlines: ['British Airways', 'Air France', 'easyJet'],
      duration: '1h 30m',
      basePrice: 120,
      airports: { departure: 'LHR', arrival: 'CDG' }
    },
    'london-barcelona': {
      airlines: ['British Airways', 'Vueling', 'easyJet'],
      duration: '2h 15m',
      basePrice: 140,
      airports: { departure: 'LHR', arrival: 'BCN' }
    },
    'london-athens': {
      airlines: ['British Airways', 'Aegean Airlines', 'easyJet'],
      duration: '3h 30m',
      basePrice: 180,
      airports: { departure: 'LHR', arrival: 'ATH' }
    },
    'manchester-rome': {
      airlines: ['Jet2', 'Ryanair', 'TUI'],
      duration: '2h 55m',
      basePrice: 160,
      airports: { departure: 'MAN', arrival: 'FCO' }
    }
  }
  
  // Find route or use fallback
  const routeKey = `${departure.toLowerCase()}-${getMainCity(destination)}`
  const route = flightRoutes[routeKey] || {
    airlines: ['Major Airline', 'Budget Airline'],
    duration: '2h 30m',
    basePrice: 200,
    airports: { departure: 'DEP', arrival: 'ARR' }
  }
  
  // Calculate seasonal pricing
  const month = new Date(departureDate).getMonth()
  let seasonalMultiplier = 1.0
  
  // Peak season pricing (June-August, December)
  if ([5, 6, 7, 11].includes(month)) {
    seasonalMultiplier = 1.4
  }
  // Shoulder season (April, May, September, October)
  else if ([3, 4, 8, 9].includes(month)) {
    seasonalMultiplier = 1.2
  }
  
  const perPersonPrice = Math.round(route.basePrice * seasonalMultiplier)
  const totalPrice = perPersonPrice * travelers
  
  // Check if within budget
  const withinBudget = totalPrice <= budget
  
  // Generate flight options
  const outboundFlight = {
    airline: route.airlines[0],
    flightNumber: `${route.airlines[0].substring(0, 2).toUpperCase()}${Math.floor(Math.random() * 9000) + 1000}`,
    departure: {
      airport: route.airports.departure,
      city: departure,
      time: '08:30',
      date: departureDate
    },
    arrival: {
      airport: route.airports.arrival,
      city: getMainCity(destination),
      time: addDurationToTime('08:30', route.duration),
      date: departureDate
    },
    duration: route.duration,
    price: totalPrice,
    perPerson: perPersonPrice
  }
  
  const returnFlight = {
    airline: route.airlines[0],
    flightNumber: `${route.airlines[0].substring(0, 2).toUpperCase()}${Math.floor(Math.random() * 9000) + 1000}`,
    departure: {
      airport: route.airports.arrival,
      city: getMainCity(destination),
      time: '15:45',
      date: returnDate
    },
    arrival: {
      airport: route.airports.departure,
      city: departure,
      time: addDurationToTime('15:45', route.duration),
      date: returnDate
    },
    duration: route.duration,
    price: totalPrice,
    perPerson: perPersonPrice
  }
  
  return {
    outbound: outboundFlight,
    return: returnFlight,
    totalCost: totalPrice * 2, // Round trip
    withinBudget,
    budgetExcess: withinBudget ? 0 : (totalPrice * 2) - budget,
    alternatives: withinBudget ? [] : generateCheaperAlternatives(route, travelers, budget)
  }
}

function getMainCity(destination: string): string {
  const cityMappings: Record<string, string> = {
    'italy': 'rome',
    'france': 'paris',
    'spain': 'madrid',
    'greece': 'athens',
    'germany': 'berlin'
  }
  
  return cityMappings[destination.toLowerCase()] || destination.toLowerCase()
}

function addDurationToTime(startTime: string, duration: string): string {
  const [hours, minutes] = startTime.split(':').map(Number)
  const durationHours = parseInt(duration.match(/(\d+)h/)?.[1] || '0')
  const durationMinutes = parseInt(duration.match(/(\d+)m/)?.[1] || '0')
  
  const totalMinutes = hours * 60 + minutes + durationHours * 60 + durationMinutes
  const endHours = Math.floor(totalMinutes / 60) % 24
  const endMinutes = totalMinutes % 60
  
  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`
}

function generateCheaperAlternatives(route: any, travelers: number, budget: number) {
  // Generate budget airline alternatives if main flights exceed budget
  return route.airlines.slice(1).map((airline: string, index: number) => ({
    airline,
    priceReduction: (index + 1) * 20,
    note: `Budget option with ${airline}`
  }))
}