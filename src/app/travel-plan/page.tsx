'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { MapPin, Calendar, Users, DollarSign, Plane, Hotel, Star, Clock, Check, Download, Share, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

function TravelPlanContent() {
  const searchParams = useSearchParams()
  
  // Get plan data from URL parameters (we'll pass this from the chat)
  const destination = searchParams.get('destination') || 'Your Destination'
  const origin = searchParams.get('origin') || ''
  const travelers = searchParams.get('travelers') || '2'
  const budget = searchParams.get('budget') || '2000'
  const dates = searchParams.get('dates') || ''
  const checkIn = searchParams.get('checkIn') || ''
  const checkOut = searchParams.get('checkOut') || ''
  const preferences = searchParams.get('preferences') || ''

  // Parse actual search results from URL parameters
  const flightsParam = searchParams.get('flights')
  const hotelsParam = searchParams.get('hotels')
  
  let actualFlights = []
  let actualHotels = []
  
  try {
    if (flightsParam) {
      actualFlights = JSON.parse(flightsParam)
    }
  } catch (error) {
    console.warn('Failed to parse flights data:', error)
  }
  
  try {
    if (hotelsParam) {
      actualHotels = JSON.parse(hotelsParam)
    }
  } catch (error) {
    console.warn('Failed to parse hotels data:', error)
  }

  // Use actual search results if available, otherwise fall back to basic mock data
  const travelPlan = {
    destination,
    origin,
    travelers: parseInt(travelers),
    budget: parseInt(budget),
    dates: dates || `${checkIn} to ${checkOut}`,
    checkIn,
    checkOut,
    preferences,
    flights: actualFlights.length > 0 ? actualFlights : [
      {
        id: 'flight_1',
        airline: 'British Airways',
        flightNumber: 'BA 2551',
        departure: { airport: origin || 'LHR', time: '09:25', terminal: 'T5' },
        arrival: { airport: getAirportCode(destination), time: '13:45', terminal: 'T1' },
        duration: '4h 20m',
        layovers: [],
        price: { amount: 285, currency: 'USD' },
        amenities: ['WiFi', 'Meals', 'Entertainment', 'Extra Legroom'],
        score: 95
      },
      {
        id: 'flight_2',
        airline: 'Lufthansa',
        flightNumber: 'LH 901',
        departure: { airport: origin || 'LHR', time: '14:20' },
        arrival: { airport: getAirportCode(destination), time: '19:15' },
        duration: '5h 25m',
        layovers: [{ airport: 'FRA', duration: '1h 30m' }],
        price: { amount: 195, currency: 'USD' },
        amenities: ['WiFi', 'Meals', 'Entertainment'],
        score: 88
      }
    ],
    hotels: actualHotels.length > 0 ? actualHotels : generateAuthenticHotelsForPlan(destination, parseInt(budget)),
    itinerary: [
      {
        day: 1,
        title: 'Arrival & City Exploration',
        activities: [
          { time: '09:00', activity: 'Flight Departure', location: origin || 'Home City', icon: '✈️' },
          { time: '14:00', activity: 'Arrival & Hotel Check-in', location: destination, icon: '🏨' },
          { time: '16:00', activity: 'Walking Tour of Historic Center', location: 'City Center', icon: '🚶' },
          { time: '19:00', activity: 'Welcome Dinner', location: 'Local Restaurant', icon: '🍽️' }
        ]
      },
      {
        day: 2,
        title: 'Cultural Immersion',
        activities: [
          { time: '09:00', activity: 'Breakfast at Hotel', location: 'Hotel Restaurant', icon: '🥐' },
          { time: '10:00', activity: 'Museum Visit', location: 'Main Museum', icon: '🏛️' },
          { time: '14:00', activity: 'Local Lunch Experience', location: 'Traditional Restaurant', icon: '🍝' },
          { time: '16:00', activity: 'Art Gallery Tour', location: 'Gallery District', icon: '🎨' },
          { time: '20:00', activity: 'Nightlife Experience', location: 'Entertainment District', icon: '🍸' }
        ]
      },
      {
        day: 3,
        title: 'Adventure & Relaxation',
        activities: [
          { time: '09:00', activity: 'Outdoor Adventure', location: 'Nature Area', icon: '🏔️' },
          { time: '12:00', activity: 'Scenic Lunch', location: 'Mountain View Restaurant', icon: '🍽️' },
          { time: '15:00', activity: 'Spa & Wellness', location: 'Hotel Spa', icon: '💆' },
          { time: '18:00', activity: 'Sunset Photography', location: 'Best Viewpoint', icon: '📸' },
          { time: '20:00', activity: 'Farewell Dinner', location: 'Rooftop Restaurant', icon: '🌟' }
        ]
      }
    ],
    costBreakdown: {
      flights: parseInt(travelers) * 285,
      accommodation: 7 * 180, // 7 nights
      activities: 350,
      meals: 450,
      transportation: 150,
      total: 0
    }
  }

  // Calculate total cost
  const costBreakdown = travelPlan.costBreakdown
  costBreakdown.total = costBreakdown.flights + costBreakdown.accommodation + costBreakdown.activities + costBreakdown.meals + costBreakdown.transportation

  function getAirportCode(destination: string): string {
    const codes: Record<string, string> = {
      'naples': 'NAP',
      'rome': 'FCO',
      'paris': 'CDG',
      'london': 'LHR',
      'phuket': 'HKT',
      'bangkok': 'BKK',
      'barbados': 'BGI',
      'delhi': 'DEL',
      'mumbai': 'BOM',
      'goa': 'GOI',
      'bangalore': 'BLR',
      'chennai': 'MAA'
    }
    return codes[destination.toLowerCase()] || 'INT'
  }

  // Generate authentic hotels for travel plan page
  function generateAuthenticHotelsForPlan(destination: string, budget: number) {
    const destinationInfo = getDestinationRegionInfo(destination)
    const basePrice = destinationInfo.costLevel
    
    return [
      // Luxury option
      {
        id: `hotel_${destination.toLowerCase()}_luxury`,
        name: generateHotelNameForPlan(destination, 'luxury'),
        starRating: 5,
        address: generateAddressForPlan(destination, 'luxury'),
        amenities: [...destinationInfo.amenities.luxury, 'WiFi', 'Concierge', 'Room Service'],
        rooms: [{
          type: 'Deluxe Suite',
          description: `Luxurious accommodation with stunning ${destinationInfo.viewType} views`,
          price: { 
            amount: Math.min(basePrice * 3, budget ? budget / 3 : basePrice * 3), 
            currency: 'USD', 
            perNight: true 
          },
          available: Math.floor(Math.random() * 3) + 2
        }],
        location: {
          type: destinationInfo.areaType,
          nearbyAttractions: destinationInfo.attractions.slice(0, 3)
        },
        reviews: { overall: 9.0 + Math.random() * 0.8, count: 800 + Math.floor(Math.random() * 2000) },
        score: 90 + Math.floor(Math.random() * 8)
      },
      // Mid-range option  
      {
        id: `hotel_${destination.toLowerCase()}_mid`,
        name: generateHotelNameForPlan(destination, 'mid-range'),
        starRating: 4,
        address: generateAddressForPlan(destination, 'mid-range'),
        amenities: [...destinationInfo.amenities.standard, 'WiFi', 'Restaurant'],
        rooms: [{
          type: 'Standard Room',
          description: `Comfortable room with modern amenities and ${destinationInfo.style} decor`,
          price: { 
            amount: Math.min(basePrice, budget ? budget / 6 : basePrice), 
            currency: 'USD', 
            perNight: true 
          },
          available: Math.floor(Math.random() * 4) + 4
        }],
        location: {
          type: 'city_center',
          nearbyAttractions: destinationInfo.attractions.slice(1, 4)
        },
        reviews: { overall: 7.5 + Math.random() * 1.3, count: 400 + Math.floor(Math.random() * 1200) },
        score: 75 + Math.floor(Math.random() * 15)
      }
    ]
  }

  // Get destination characteristics for authentic content generation
  function getDestinationRegionInfo(destination: string) {
    const dest = destination.toLowerCase()
    
    // Determine region and characteristics
    const regions = {
      // Asian cities
      asian: ['tokyo', 'bangkok', 'singapore', 'kuala lumpur', 'hong kong', 'seoul', 'delhi', 'mumbai', 'jakarta', 'manila', 'kyoto', 'osaka'],
      // European cities  
      european: ['paris', 'london', 'rome', 'berlin', 'madrid', 'amsterdam', 'vienna', 'prague', 'zurich', 'stockholm'],
      // Middle Eastern cities
      middleEast: ['dubai', 'doha', 'riyadh', 'kuwait city', 'abu dhabi', 'muscat', 'manama', 'amman'],
      // Island/Beach destinations
      tropical: ['maldives', 'barbados', 'bali', 'phuket', 'jamaica', 'hawaii', 'seychelles', 'fiji', 'mauritius'],
      // African cities
      african: ['cape town', 'johannesburg', 'nairobi', 'cairo', 'marrakech', 'casablanca', 'lagos', 'accra'],
      // American cities
      american: ['new york', 'los angeles', 'chicago', 'miami', 'toronto', 'vancouver', 'mexico city', 'rio de janeiro']
    }
    
    let region = 'international'
    for (const [regionName, cities] of Object.entries(regions)) {
      if (cities.some(city => dest.includes(city.split(' ')[0]))) {
        region = regionName
        break
      }
    }
    
    // Regional data
    const regionalData = {
      asian: {
        costLevel: 80,
        amenities: {
          luxury: ['Spa', 'Multiple Restaurants', 'Business Center', 'Pool'],
          standard: ['Restaurant', 'Fitness Center', 'Business Corner']
        },
        attractions: ['Historic Temples', 'Local Markets', 'Cultural District', 'Shopping Centers', 'Food Courts'],
        viewType: 'city skyline',
        areaType: 'downtown',
        style: 'modern Asian'
      },
      european: {
        costLevel: 180,
        amenities: {
          luxury: ['Spa', 'Fine Dining', 'Bar', 'Valet Parking'],
          standard: ['Restaurant', 'Bar', 'Fitness Room']
        },
        attractions: ['Historic Center', 'Museums', 'Cathedral Square', 'Old Town', 'Art Galleries'],
        viewType: 'historic city',
        areaType: 'historic_center', 
        style: 'European classic'
      },
      tropical: {
        costLevel: 200,
        amenities: {
          luxury: ['Beach Access', 'Water Sports', 'Spa', 'Multiple Pools', 'Beach Bar'],
          standard: ['Beach Access', 'Pool', 'Beach Equipment']
        },
        attractions: ['Pristine Beaches', 'Coral Reefs', 'Water Sports Center', 'Sunset Point', 'Local Villages'],
        viewType: 'ocean',
        areaType: 'beachfront',
        style: 'tropical resort'
      },
      international: {
        costLevel: 120,
        amenities: {
          luxury: ['Spa', 'Fine Dining', 'Bar', 'Business Center'],
          standard: ['Restaurant', 'Fitness Center', 'Business Corner']
        },
        attractions: ['City Center', 'Museums', 'Cultural Sites', 'Shopping Districts', 'Entertainment Areas'],
        viewType: 'city',
        areaType: 'city_center',
        style: 'contemporary'
      }
    }
    
    return regionalData[region] || regionalData.international
  }

  // Generate hotel names
  function generateHotelNameForPlan(destination: string, tier: string) {
    const luxuryPrefixes = ['The Grand', 'Royal', 'Imperial', 'Palace', 'The Ritz', 'Luxury']
    const midRangePrefixes = ['Hotel', 'The', 'Central', 'Plaza', 'Garden']
    
    const destinationWords = destination.split(' ')
    const mainCity = destinationWords[0]
    
    switch (tier) {
      case 'luxury':
        const luxPrefix = luxuryPrefixes[Math.floor(Math.random() * luxuryPrefixes.length)]
        return `${luxPrefix} ${destination}`
      case 'mid-range':
        const midPrefix = midRangePrefixes[Math.floor(Math.random() * midRangePrefixes.length)]
        return `${midPrefix} ${mainCity}`
      default:
        return `Hotel ${destination}`
    }
  }

  // Generate addresses
  function generateAddressForPlan(destination: string, tier: string) {
    const streetNumber = Math.floor(Math.random() * 999) + 1
    const streetNames = ['Central', 'Main', 'Royal', 'Garden', 'Park', 'Historic', 'Liberty', 'Victory']
    const streetTypes = ['Street', 'Avenue', 'Boulevard', 'Road', 'Plaza', 'Square']
    
    const streetName = streetNames[Math.floor(Math.random() * streetNames.length)]
    const streetType = streetTypes[Math.floor(Math.random() * streetTypes.length)]
    
    const areas = {
      'luxury': ['Downtown', 'City Center', 'Historic Quarter', 'Marina District'],
      'mid-range': ['Central District', 'Old Town', 'Business District', 'Tourist Area']
    }
    
    const area = areas[tier][Math.floor(Math.random() * areas[tier].length)]
    
    return `${streetNumber} ${streetName} ${streetType}, ${area}, ${destination}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-white shadow-lg">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link 
              href="/planner" 
              className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Chat
            </Link>
            
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900">Your Travel Plan</h1>
              <p className="text-gray-600">Generated by AI Travel Assistant</p>
            </div>
            
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                <Share className="w-4 h-4" />
                Share
              </button>
              <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Trip Overview Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-100">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{destination} Adventure</h2>
            <p className="text-lg text-gray-600">Your personalized travel experience</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-xl">
              <MapPin className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-900">Destination</h3>
              <p className="text-gray-600">{destination}</p>
              {origin && <p className="text-sm text-gray-500">from {origin}</p>}
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-xl">
              <Calendar className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-900">Dates</h3>
              <p className="text-gray-600">{travelPlan.dates}</p>
              <p className="text-sm text-gray-500">7 nights</p>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-xl">
              <Users className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-900">Travelers</h3>
              <p className="text-gray-600">{travelPlan.travelers} {travelPlan.travelers === 1 ? 'person' : 'people'}</p>
              <p className="text-sm text-gray-500">{preferences}</p>
            </div>
            
            <div className="text-center p-4 bg-amber-50 rounded-xl">
              <DollarSign className="w-8 h-8 text-amber-600 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-900">Budget</h3>
              <p className="text-gray-600">${costBreakdown.total.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Total estimated</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Flights Section */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Plane className="w-6 h-6 text-blue-600" />
                Flight Options
              </h3>
              
              <div className="space-y-4">
                {travelPlan.flights.map((flight, index) => (
                  <div key={flight.id} className="border rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold text-lg">{flight.airline} {flight.flightNumber}</h4>
                        <p className="text-gray-600">{flight.departure.time} {flight.departure.airport} → {flight.arrival.time} {flight.arrival.airport}</p>
                        <p className="text-sm text-gray-500">Duration: {flight.duration}</p>
                        {flight.layovers.length > 0 && (
                          <p className="text-sm text-orange-600">
                            Stop: {flight.layovers.map(l => `${l.airport} (${l.duration})`).join(', ')}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600">${flight.price.amount}</p>
                        <p className="text-sm text-gray-500">per person</p>
                        {index === 0 && <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mt-1">Recommended</span>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {flight.amenities.map((amenity, i) => (
                        <span key={i} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hotels Section */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Hotel className="w-6 h-6 text-green-600" />
                Accommodation Options
              </h3>
              
              <div className="space-y-4">
                {travelPlan.hotels.map((hotel, index) => (
                  <div key={hotel.id} className="border rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-lg">{hotel.name}</h4>
                          <div className="flex">
                            {[...Array(hotel.starRating)].map((_, i) => (
                              <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            ))}
                          </div>
                        </div>
                        <p className="text-gray-600 mb-1">{hotel.address}</p>
                        <p className="text-sm text-gray-500 mb-2">{hotel.rooms[0].description}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-green-600 font-medium">{hotel.reviews.overall}/10</span>
                          <span className="text-gray-500">({hotel.reviews.count} reviews)</span>
                          <span className="text-gray-500">{hotel.location.nearbyAttractions.slice(0, 2).join(', ')}</span>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-2xl font-bold text-green-600">${hotel.rooms[0].price.amount}</p>
                        <p className="text-sm text-gray-500">per night</p>
                        {index === 0 && <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full mt-1">Best Value</span>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {hotel.amenities.slice(0, 6).map((amenity, i) => (
                        <span key={i} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Daily Itinerary */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="w-6 h-6 text-purple-600" />
                Daily Itinerary
              </h3>
              
              <div className="space-y-6">
                {travelPlan.itinerary.map((day) => (
                  <div key={day.day} className="border-l-4 border-purple-200 pl-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">
                      Day {day.day}: {day.title}
                    </h4>
                    <div className="space-y-3">
                      {day.activities.map((activity, i) => (
                        <div key={i} className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
                          <div className="text-2xl">{activity.icon}</div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h5 className="font-medium text-gray-900">{activity.activity}</h5>
                              <span className="text-sm font-mono text-gray-500">{activity.time}</span>
                            </div>
                            <p className="text-sm text-gray-600">{activity.location}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cost Breakdown Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Cost Breakdown</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Flights</span>
                  <span className="font-semibold">${costBreakdown.flights.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Accommodation</span>
                  <span className="font-semibold">${costBreakdown.accommodation.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Activities</span>
                  <span className="font-semibold">${costBreakdown.activities.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Meals</span>
                  <span className="font-semibold">${costBreakdown.meals.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Transport</span>
                  <span className="font-semibold">${costBreakdown.transportation.toLocaleString()}</span>
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center text-lg">
                    <span className="font-bold text-gray-900">Total</span>
                    <span className="font-bold text-green-600">${costBreakdown.total.toLocaleString()}</span>
                  </div>
                  {travelPlan.budget && (
                    <div className="mt-2 text-sm">
                      {costBreakdown.total <= travelPlan.budget ? (
                        <div className="text-green-600 flex items-center gap-1">
                          <Check className="w-4 h-4" />
                          Within budget (${(travelPlan.budget - costBreakdown.total).toLocaleString()} remaining)
                        </div>
                      ) : (
                        <div className="text-orange-600">
                          ${(costBreakdown.total - travelPlan.budget).toLocaleString()} over budget
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <button className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                  Book This Trip
                </button>
                <button className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium">
                  Modify Plan
                </button>
              </div>
            </div>

            {/* Quick Tips */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-6">
              <h4 className="font-bold text-gray-900 mb-3">💡 Travel Tips</h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• Book flights at least 2 months in advance for best prices</li>
                <li>• Pack light - most airlines charge for checked bags</li>
                <li>• Download offline maps before you travel</li>
                <li>• Notify your bank of travel plans</li>
                <li>• Consider travel insurance for peace of mind</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TravelPlanPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your travel plan...</p>
        </div>
      </div>
    }>
      <TravelPlanContent />
    </Suspense>
  )
}