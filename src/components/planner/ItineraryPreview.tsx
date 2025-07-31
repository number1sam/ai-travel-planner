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
  Edit3,
  Save,
  X
} from 'lucide-react'

interface Activity {
  id: string
  time: string
  name: string
  description: string
  location: string
  price?: number
  duration?: string
  type: 'flight' | 'hotel' | 'activity' | 'restaurant' | 'transport'
}

interface Hotel {
  name: string
  rating: number
  location: string
  amenities: string[]
  pricePerNight: number
}

interface Flight {
  airline: string
  flightNumber: string
  departure: string
  arrival: string
  duration: string
  price: number
}

interface Day {
  id: string
  date: string
  hotel?: Hotel
  flight?: Flight
  activities?: Activity[]
}

interface ItineraryData {
  id: string
  title: string
  destination: string
  startDate: string
  endDate: string
  totalDays: number
  totalCost: number
  travelers: number
  days: Day[]
  summary?: string
}

interface ItineraryPreviewProps {
  itinerary?: ItineraryData
  isLoading?: boolean
  onEdit?: (itinerary: ItineraryData) => void
  onSave?: (itinerary: ItineraryData) => void
}

const getActivityIcon = (type: Activity['type']) => {
  switch (type) {
    case 'flight': return <Plane className="w-4 h-4" />
    case 'hotel': return <Hotel className="w-4 h-4" />
    case 'restaurant': return <Coffee className="w-4 h-4" />
    case 'activity': return <Camera className="w-4 h-4" />
    default: return <MapPin className="w-4 h-4" />
  }
}

const getActivityColor = (type: Activity['type']) => {
  switch (type) {
    case 'flight': return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'hotel': return 'bg-purple-100 text-purple-700 border-purple-200'
    case 'restaurant': return 'bg-orange-100 text-orange-700 border-orange-200'
    case 'activity': return 'bg-green-100 text-green-700 border-green-200'
    default: return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

export default function ItineraryPreview({ 
  itinerary, 
  isLoading = false,
  onEdit,
  onSave 
}: ItineraryPreviewProps) {
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([1]))
  const [isEditing, setIsEditing] = useState(false)

  const toggleDay = (dayNumber: number) => {
    const newExpanded = new Set(expandedDays)
    if (newExpanded.has(dayNumber)) {
      newExpanded.delete(dayNumber)
    } else {
      newExpanded.add(dayNumber)
    }
    setExpandedDays(newExpanded)
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 h-full">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-6"></div>
        </div>
      </div>
    )
  }

  if (!itinerary) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 h-full flex flex-col items-center justify-center text-center">
        <MapPin className="w-16 h-16 text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-600 mb-2">
          No Itinerary Yet
        </h3>
        <p className="text-gray-500 max-w-md">
          Start chatting with the AI assistant to create your personalized travel itinerary. 
          It will appear here once generated.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {itinerary.title}
            </h2>
            <div className="flex items-center text-gray-600 space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <MapPin className="w-4 h-4" />
                <span>{itinerary.destination}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>{itinerary.totalDays} days</span>
              </div>
              <div className="flex items-center space-x-1">
                <Users className="w-4 h-4" />
                <span>{itinerary.travelers} travelers</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="p-2 text-gray-600 hover:text-brand-green transition-colors"
            >
              {isEditing ? <X className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
            </button>
            {onSave && (
              <button
                onClick={() => onSave(itinerary)}
                className="px-4 py-2 bg-brand-green text-white rounded-lg hover:bg-brand-green/90 transition-colors flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Save</span>
              </button>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <DollarSign className="w-5 h-5 text-blue-600 mx-auto mb-1" />
            <p className="text-sm text-gray-600">Total Cost</p>
            <p className="font-semibold text-blue-900">£{itinerary.totalCost}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <Calendar className="w-5 h-5 text-green-600 mx-auto mb-1" />
            <p className="text-sm text-gray-600">Start Date</p>
            <p className="font-semibold text-green-900">
              {new Date(itinerary.startDate).toLocaleDateString()}
            </p>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 text-center">
            <Clock className="w-5 h-5 text-purple-600 mx-auto mb-1" />
            <p className="text-sm text-gray-600">End Date</p>
            <p className="font-semibold text-purple-900">
              {new Date(itinerary.endDate).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Days List */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-4">
          {itinerary.days && itinerary.days.length > 0 ? (
            itinerary.days.map((day, index) => {
              const dayNumber = day.id && day.id.includes('-') ? parseInt(day.id.split('-')[1]) || (index + 1) : (index + 1)
              const totalCost = (day.hotel?.pricePerNight || 0) + (day.flight?.price || 0) + 
                               (day.activities?.reduce((sum, act) => sum + (act.price || 0), 0) || 0)
              
              return (
                <motion.div
                  key={day.id || `day-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: dayNumber * 0.1 }}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  {/* Day Header */}
                  <button
                    onClick={() => toggleDay(dayNumber)}
                    className="w-full p-4 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-brand-green text-white rounded-full flex items-center justify-center text-sm font-bold">
                        {dayNumber}
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-gray-900">
                          Day {dayNumber}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {new Date(day.date).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">£{totalCost}</span>
                      {expandedDays.has(dayNumber) ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {/* Day Details */}
                  <AnimatePresence>
                    {expandedDays.has(dayNumber) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 space-y-4">
                          {/* Hotel Information */}
                          {day.hotel && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex items-start space-x-3">
                                  <div className="p-2 bg-blue-100 rounded-lg">
                                    <Hotel className="w-5 h-5 text-blue-600" />
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-gray-900 flex items-center space-x-2">
                                      <span>{day.hotel.name}</span>
                                      <span className="text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                                        ⭐ {day.hotel.rating}
                                      </span>
                                    </h4>
                                    <p className="text-sm text-gray-600 mt-1">{day.hotel.location}</p>
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {day.hotel.amenities?.slice(0, 4).map((amenity) => (
                                        <span key={amenity} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                          {amenity}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-bold text-gray-900">
                                    £{day.hotel.pricePerNight}
                                  </div>
                                  <div className="text-xs text-gray-500">per night</div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Activities */}
                          {day.activities && day.activities.length > 0 && (
                            <div className="space-y-3">
                              {day.activities.map((activity) => (
                                <div
                                  key={activity.id}
                                  className="flex items-start space-x-3 p-3 border border-gray-100 rounded-lg"
                                >
                                  <div className={`p-2 rounded-lg border ${getActivityColor(activity.type)}`}>
                                    {getActivityIcon(activity.type)}
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="font-medium text-gray-900">{activity.name}</h4>
                                    <p className="text-sm text-gray-600">{activity.description}</p>
                                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                      <span>{activity.time}</span>
                                      <span>{activity.location}</span>
                                      {activity.price && <span>£{activity.price}</span>}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
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
              <p className="text-gray-500">No itinerary days available yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}