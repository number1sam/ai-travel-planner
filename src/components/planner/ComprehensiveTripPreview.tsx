'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MapPin, 
  Calendar, 
  Clock, 
  DollarSign, 
  Users, 
  Plane, 
  Hotel, 
  Camera, 
  Coffee,
  ChevronDown,
  ChevronUp,
  Download,
  Mail,
  PieChart,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'

// Import the TripPlan interface from the parent component
interface TripPlan {
  summary: {
    destination: string
    cities: string[]
    duration: number
    travelers: number
    totalBudget: number
    budgetBreakdown: {
      flights: number
      accommodation: number
      food: number
      activities: number
      transport: number
      emergency: number
    }
    departureLocation: string
    dates: {
      startDate: string
      endDate: string
      month: string
    }
  }
  flights?: {
    outbound: any
    return: any
    totalCost: number
  }
  itinerary: any[]
  totalCost: number
  budgetRemaining: number
}

interface ComprehensiveTripPreviewProps {
  tripPlan?: TripPlan | null
  isGenerating?: boolean
  onDownload?: () => void
  onEmail?: () => void
}

export default function ComprehensiveTripPreview({ 
  tripPlan, 
  isGenerating = false,
  onDownload,
  onEmail 
}: ComprehensiveTripPreviewProps) {
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([1]))
  const [showBudgetBreakdown, setShowBudgetBreakdown] = useState(false)

  const toggleDay = (dayNumber: number) => {
    const newExpanded = new Set(expandedDays)
    if (newExpanded.has(dayNumber)) {
      newExpanded.delete(dayNumber)
    } else {
      newExpanded.add(dayNumber)
    }
    setExpandedDays(newExpanded)
  }

  if (isGenerating) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 h-full">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-brand-green border-t-transparent rounded-full mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            🎯 Creating Your Comprehensive Trip Plan
          </h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>💸 Allocating budget across categories...</p>
            <p>🗺️ Selecting optimal cities and route...</p>
            <p>✈️ Finding flights within budget...</p>
            <p>🏨 Booking accommodation for every night...</p>
            <p>🎯 Planning daily activities and attractions...</p>
            <p>📅 Building your day-by-day itinerary...</p>
          </div>
          <div className="mt-4 bg-gray-100 rounded-full h-2">
            <div className="bg-brand-green h-2 rounded-full animate-pulse" style={{ width: '70%' }}></div>
          </div>
        </div>
      </div>
    )
  }

  if (!tripPlan) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 h-full flex flex-col items-center justify-center text-center">
        <MapPin className="w-16 h-16 text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-600 mb-2">
          Your Trip Plan Will Appear Here
        </h3>
        <p className="text-gray-500 max-w-md">
          Complete the conversation with the AI assistant and confirm your trip details. 
          Your comprehensive itinerary will be generated and displayed here.
        </p>
      </div>
    )
  }

  const budgetUtilization = (tripPlan.totalCost / tripPlan.summary.totalBudget) * 100
  const isWithinBudget = tripPlan.budgetRemaining >= 0

  return (
    <div className="bg-white rounded-xl shadow-lg h-full flex flex-col">
      {/* Header with Summary */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              🎉 {tripPlan.summary.duration}-Day {tripPlan.summary.destination} Adventure
            </h2>
            <div className="flex items-center text-gray-600 space-x-4 text-sm mb-3">
              <div className="flex items-center space-x-1">
                <MapPin className="w-4 h-4" />
                <span>{tripPlan.summary.cities.join(' → ')}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Users className="w-4 h-4" />
                <span>{tripPlan.summary.travelers} {tripPlan.summary.travelers === 1 ? 'traveler' : 'travelers'}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Plane className="w-4 h-4" />
                <span>From {tripPlan.summary.departureLocation}</span>
              </div>
            </div>
            
            {/* Budget Status */}
            <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
              isWithinBudget 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {isWithinBudget ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )}
              <span>
                Budget: £{tripPlan.totalCost.toLocaleString()} / £{tripPlan.summary.totalBudget.toLocaleString()}
                {isWithinBudget && ` (£${tripPlan.budgetRemaining} remaining)`}
              </span>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowBudgetBreakdown(!showBudgetBreakdown)}
              className="p-2 text-gray-600 hover:text-brand-green transition-colors"
              title="Budget Breakdown"
            >
              <PieChart className="w-5 h-5" />
            </button>
            {onDownload && (
              <button
                onClick={onDownload}
                className="p-2 text-gray-600 hover:text-brand-green transition-colors"
                title="Download Plan"
              >
                <Download className="w-5 h-5" />
              </button>
            )}
            {onEmail && (
              <button
                onClick={onEmail}
                className="p-2 text-gray-600 hover:text-brand-green transition-colors"
                title="Email Plan"
              >
                <Mail className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Budget Breakdown */}
        <AnimatePresence>
          {showBudgetBreakdown && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="grid grid-cols-3 gap-3 mt-4"
            >
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <Plane className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                <p className="text-xs text-gray-600">Flights</p>
                <p className="font-semibold text-blue-900">£{tripPlan.summary.budgetBreakdown.flights}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 text-center">
                <Hotel className="w-4 h-4 text-purple-600 mx-auto mb-1" />
                <p className="text-xs text-gray-600">Hotels</p>
                <p className="font-semibold text-purple-900">£{tripPlan.summary.budgetBreakdown.accommodation}</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 text-center">
                <Coffee className="w-4 h-4 text-orange-600 mx-auto mb-1" />
                <p className="text-xs text-gray-600">Food</p>
                <p className="font-semibold text-orange-900">£{tripPlan.summary.budgetBreakdown.food}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <Camera className="w-4 h-4 text-green-600 mx-auto mb-1" />
                <p className="text-xs text-gray-600">Activities</p>
                <p className="font-semibold text-green-900">£{tripPlan.summary.budgetBreakdown.activities}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <MapPin className="w-4 h-4 text-gray-600 mx-auto mb-1" />
                <p className="text-xs text-gray-600">Transport</p>
                <p className="font-semibold text-gray-900">£{tripPlan.summary.budgetBreakdown.transport}</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3 text-center">
                <DollarSign className="w-4 h-4 text-yellow-600 mx-auto mb-1" />
                <p className="text-xs text-gray-600">Emergency</p>
                <p className="font-semibold text-yellow-900">£{tripPlan.summary.budgetBreakdown.emergency}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Summary Stats */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Dates</span>
              <Calendar className="w-4 h-4 text-gray-400" />
            </div>
            <p className="font-semibold text-gray-900 mt-1">
              {new Date(tripPlan.summary.dates.startDate).toLocaleDateString()} - {new Date(tripPlan.summary.dates.endDate).toLocaleDateString()}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Budget Used</span>
              <DollarSign className="w-4 h-4 text-gray-400" />
            </div>
            <p className="font-semibold text-gray-900 mt-1">
              {budgetUtilization.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Day-by-Day Itinerary */}
      <div className="flex-1 overflow-y-auto p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📅 Day-by-Day Itinerary</h3>
        
        <div className="space-y-4">
          {tripPlan.itinerary && tripPlan.itinerary.length > 0 ? (
            tripPlan.itinerary.map((day, index) => {
              const dayNumber = day.day || (index + 1)
              const cityName = day.city || tripPlan.summary.cities[0]
              
              return (
                <motion.div
                  key={`day-${dayNumber}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: dayNumber * 0.1 }}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  {/* Day Header - Your Specified Format */}
                  <button
                    onClick={() => toggleDay(dayNumber)}
                    className="w-full p-4 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 transition-colors text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-bold text-gray-900">
                          Day {dayNumber} – {cityName}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {new Date(day.date).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">
                            💰 Daily Total: £{day.dailyTotal}
                          </div>
                          <div className="text-sm text-gray-600">
                            Running Total: £{day.runningTotal}
                          </div>
                        </div>
                        {expandedDays.has(dayNumber) ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Day Details - Your Specified Format */}
                  <AnimatePresence>
                    {expandedDays.has(dayNumber) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 bg-white space-y-3">
                          
                          {/* Flight Information */}
                          {day.transport?.some((t: any) => t.type.includes('Flight')) && (
                            <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                              <Plane className="w-5 h-5 text-blue-600" />
                              <div className="flex-1">
                                <span className="font-medium text-blue-900">
                                  ✈️ {day.transport.find((t: any) => t.type.includes('Flight'))?.details}
                                </span>
                                {tripPlan.flights && dayNumber === 1 && (
                                  <div className="text-sm text-blue-700 mt-1">
                                    Flight: {tripPlan.flights.outbound.departure.time} from {tripPlan.flights.outbound.departure.city}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Hotel Information */}
                          {day.accommodation && (
                            <div className="p-3 bg-purple-50 rounded-lg">
                              <div className="flex items-center space-x-3">
                                <Hotel className="w-5 h-5 text-purple-600" />
                                <div className="flex-1">
                                  <span className="font-medium text-purple-900">
                                    🏨 Hotel: {day.accommodation.name} (£{day.accommodation.pricePerNight}/night)
                                  </span>
                                  <div className="text-sm text-purple-700 mt-1">
                                    {day.accommodation.location} • ⭐ {day.accommodation.rating}/5 {day.accommodation.stars && `• ${day.accommodation.stars}★`}
                                  </div>
                                  <div className="text-sm text-purple-600 mt-1">
                                    {day.accommodation.amenities?.slice(0, 3).join(', ')} {day.accommodation.reviews && `• ${day.accommodation.reviews} reviews`}
                                  </div>
                                  {day.accommodation.bookingLink && (
                                    <a 
                                      href={day.accommodation.bookingLink} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center text-sm text-purple-700 hover:text-purple-900 mt-2 underline"
                                    >
                                      Book on {day.accommodation.bookingLink.includes('booking.com') ? 'Booking.com' : 
                                                day.accommodation.bookingLink.includes('agoda') ? 'Agoda' : 
                                                day.accommodation.bookingLink.includes('expedia') ? 'Expedia' : 'Hotel Site'}
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Activities */}
                          {day.activities && day.activities.map((activity: any, actIndex: number) => (
                            <div key={actIndex} className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                              <Camera className="w-5 h-5 text-green-600" />
                              <div className="flex-1">
                                <span className="font-medium text-green-900">
                                  🌅 {activity.time}: {activity.activity} (£{activity.cost})
                                </span>
                                <div className="text-sm text-green-700 mt-1">
                                  {activity.description} • Duration: {activity.duration}
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* Meals */}
                          {day.meals && (
                            <>
                              {day.meals.breakfast && (
                                <div className="flex items-center space-x-3 p-3 bg-orange-50 rounded-lg">
                                  <Coffee className="w-5 h-5 text-orange-600" />
                                  <div className="flex-1">
                                    <span className="font-medium text-orange-900">
                                      🍝 Breakfast: {day.meals.breakfast.restaurant} (£{Math.round(day.meals.breakfast.cost)})
                                    </span>
                                  </div>
                                </div>
                              )}
                              {day.meals.lunch && (
                                <div className="flex items-center space-x-3 p-3 bg-orange-50 rounded-lg">
                                  <Coffee className="w-5 h-5 text-orange-600" />
                                  <div className="flex-1">
                                    <span className="font-medium text-orange-900">
                                      🍝 Lunch: {day.meals.lunch.restaurant} (£{Math.round(day.meals.lunch.cost)})
                                    </span>
                                  </div>
                                </div>
                              )}
                              {day.meals.dinner && (
                                <div className="flex items-center space-x-3 p-3 bg-orange-50 rounded-lg">
                                  <Coffee className="w-5 h-5 text-orange-600" />
                                  <div className="flex-1">
                                    <span className="font-medium text-orange-900">
                                      🍝 Dinner: {day.meals.dinner.restaurant} (£{Math.round(day.meals.dinner.cost)})
                                    </span>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })
          ) : (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Itinerary details will appear here once generated.</p>
            </div>
          )}
        </div>

        {/* Grand Total */}
        {tripPlan.itinerary && tripPlan.itinerary.length > 0 && (
          <div className="mt-6 p-4 bg-gray-900 text-white rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold">🎯 Grand Total</span>
              <span className="text-2xl font-bold">£{tripPlan.totalCost.toLocaleString()}</span>
            </div>
            <div className="text-sm text-gray-300 mt-2">
              Budget utilization: {budgetUtilization.toFixed(1)}% • 
              {isWithinBudget ? ` £${tripPlan.budgetRemaining} under budget ✅` : ` £${Math.abs(tripPlan.budgetRemaining)} over budget ⚠️`}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}