'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { 
  Clock, 
  MapPin, 
  Plane, 
  Hotel, 
  Calendar, 
  Camera, 
  Utensils,
  Car,
  Train,
  Bus,
  Walking,
  Star,
  DollarSign,
  Edit3,
  Trash2,
  Plus,
  GripVertical,
  AlertCircle,
  CheckCircle,
  Info,
  Navigation
} from 'lucide-react'

interface ItineraryItem {
  id: string
  type: 'flight' | 'hotel' | 'activity' | 'transport' | 'meal' | 'custom'
  title: string
  description: string
  startTime: string
  endTime: string
  location: {
    name: string
    address: string
    coordinates: [number, number]
  }
  cost?: number
  currency?: string
  rating?: number
  status: 'confirmed' | 'pending' | 'cancelled'
  bookingReference?: string
  notes?: string
  images?: string[]
  tags?: string[]
  priority: 'high' | 'medium' | 'low'
}

interface DayItinerary {
  date: string
  items: ItineraryItem[]
  totalCost: number
  estimatedDuration: number
}

interface VisualItineraryTimelineProps {
  itinerary: DayItinerary[]
  onItemUpdate: (dayIndex: number, itemId: string, updates: Partial<ItineraryItem>) => void
  onItemDelete: (dayIndex: number, itemId: string) => void
  onItemAdd: (dayIndex: number, item: Omit<ItineraryItem, 'id'>) => void
  onReorderItems: (dayIndex: number, newOrder: ItineraryItem[]) => void
  selectedDay?: number
  onDaySelect?: (dayIndex: number) => void
}

export default function VisualItineraryTimeline({
  itinerary,
  onItemUpdate,
  onItemDelete,
  onItemAdd,
  onReorderItems,
  selectedDay = 0,
  onDaySelect
}: VisualItineraryTimelineProps) {
  const [editingItem, setEditingItem] = useState<{ dayIndex: number, itemId: string } | null>(null)
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [showAddItem, setShowAddItem] = useState<number | null>(null)

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'flight':
        return <Plane className="w-5 h-5" />
      case 'hotel':
        return <Hotel className="w-5 h-5" />
      case 'transport':
        return <Car className="w-5 h-5" />
      case 'meal':
        return <Utensils className="w-5 h-5" />
      case 'activity':
        return <Camera className="w-5 h-5" />
      default:
        return <MapPin className="w-5 h-5" />
    }
  }

  const getItemColor = (type: string) => {
    switch (type) {
      case 'flight':
        return 'bg-blue-100 border-blue-300 text-blue-800'
      case 'hotel':
        return 'bg-purple-100 border-purple-300 text-purple-800'
      case 'transport':
        return 'bg-green-100 border-green-300 text-green-800'
      case 'meal':
        return 'bg-orange-100 border-orange-300 text-orange-800'
      case 'activity':
        return 'bg-pink-100 border-pink-300 text-pink-800'
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'cancelled':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return <Info className="w-4 h-4 text-gray-500" />
    }
  }

  const formatTime = (timeString: string) => {
    const time = new Date(`2000-01-01T${timeString}`)
    return time.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    })
  }

  const calculateDuration = (startTime: string, endTime: string) => {
    const start = new Date(`2000-01-01T${startTime}`)
    const end = new Date(`2000-01-01T${endTime}`)
    const diffMinutes = (end.getTime() - start.getTime()) / (1000 * 60)
    
    if (diffMinutes < 60) {
      return `${diffMinutes}m`
    }
    
    const hours = Math.floor(diffMinutes / 60)
    const minutes = diffMinutes % 60
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  }

  return (
    <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-green to-brand-seafoam p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Trip Itinerary</h2>
            <p className="text-sm opacity-90">
              {itinerary.length} day{itinerary.length !== 1 ? 's' : ''} planned • 
              Drag items to reorder
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">
              ${itinerary.reduce((sum, day) => sum + day.totalCost, 0).toLocaleString()}
            </div>
            <div className="text-sm opacity-90">Total Budget</div>
          </div>
        </div>
      </div>

      {/* Day Selector */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {itinerary.map((day, index) => (
            <motion.button
              key={index}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onDaySelect?.(index)}
              className={`
                flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all
                ${selectedDay === index 
                  ? 'bg-brand-green text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              Day {index + 1}
              <span className="ml-2 text-xs opacity-75">
                {day.items.length} items
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Timeline Content */}
      <div className="p-6">
        {itinerary[selectedDay] && (
          <div>
            {/* Day Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {formatDate(itinerary[selectedDay].date)}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {itinerary[selectedDay].items.length} activities • 
                  {Math.floor(itinerary[selectedDay].estimatedDuration / 60)}h {itinerary[selectedDay].estimatedDuration % 60}m total •
                  ${itinerary[selectedDay].totalCost.toLocaleString()} budget
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowAddItem(selectedDay)}
                className="flex items-center gap-2 px-4 py-2 bg-brand-green text-white rounded-xl hover:bg-opacity-90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </motion.button>
            </div>

            {/* Timeline Items */}
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-brand-green via-brand-seafoam to-brand-green"></div>

              <Reorder.Group
                axis="y"
                values={itinerary[selectedDay].items}
                onReorder={(newOrder) => onReorderItems(selectedDay, newOrder)}
                className="space-y-4"
              >
                <AnimatePresence>
                  {itinerary[selectedDay].items.map((item, itemIndex) => (
                    <Reorder.Item
                      key={item.id}
                      value={item}
                      dragListener={false}
                      className="relative"
                    >
                      <motion.div
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3, delay: itemIndex * 0.1 }}
                        className={`
                          group relative flex gap-4 p-4 bg-white border-2 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200
                          ${draggedItem === item.id ? 'shadow-lg scale-105 rotate-1' : ''}
                          ${getItemColor(item.type)}
                        `}
                      >
                        {/* Timeline Dot */}
                        <div className="absolute -left-8 top-6 w-6 h-6 bg-white border-4 border-brand-green rounded-full flex items-center justify-center shadow-lg">
                          <div className="w-2 h-2 bg-brand-green rounded-full"></div>
                        </div>

                        {/* Drag Handle */}
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          className="flex-shrink-0 p-2 text-gray-400 hover:text-brand-green cursor-grab active:cursor-grabbing transition-colors"
                          onPointerDown={(e) => {
                            setDraggedItem(item.id)
                            // @ts-ignore
                            e.target.closest('[data-framer-name="reorder-item"]')?.dragControls.start(e)
                          }}
                        >
                          <GripVertical className="w-5 h-5" />
                        </motion.div>

                        {/* Item Icon */}
                        <div className="flex-shrink-0 p-3 bg-white bg-opacity-50 rounded-xl">
                          {getItemIcon(item.type)}
                        </div>

                        {/* Item Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-bold text-lg text-gray-900 mb-1">
                                {item.title}
                              </h4>
                              <p className="text-sm text-gray-600 line-clamp-2">
                                {item.description}
                              </p>
                            </div>
                            
                            {/* Status & Actions */}
                            <div className="flex items-center gap-2 ml-4">
                              {getStatusIcon(item.status)}
                              <button
                                onClick={() => setEditingItem({ dayIndex: selectedDay, itemId: item.id })}
                                className="p-1 text-gray-400 hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => onItemDelete(selectedDay, item.id)}
                                className="p-1 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Time & Location */}
                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>
                                {formatTime(item.startTime)} - {formatTime(item.endTime)}
                                <span className="ml-2 px-2 py-1 bg-white bg-opacity-50 rounded-full text-xs">
                                  {calculateDuration(item.startTime, item.endTime)}
                                </span>
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              <span className="truncate">{item.location.name}</span>
                            </div>
                          </div>

                          {/* Cost & Rating */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              {item.cost && (
                                <div className="flex items-center gap-1 text-sm">
                                  <DollarSign className="w-4 h-4 text-green-600" />
                                  <span className="font-semibold text-green-600">
                                    ${item.cost.toLocaleString()}
                                  </span>
                                </div>
                              )}
                              {item.rating && (
                                <div className="flex items-center gap-1">
                                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                                  <span className="text-sm font-medium">{item.rating}</span>
                                </div>
                              )}
                            </div>

                            {/* Priority Indicator */}
                            <div className={`
                              px-3 py-1 rounded-full text-xs font-medium
                              ${item.priority === 'high' ? 'bg-red-100 text-red-700' : ''}
                              ${item.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : ''}
                              ${item.priority === 'low' ? 'bg-green-100 text-green-700' : ''}
                            `}>
                              {item.priority} priority
                            </div>
                          </div>

                          {/* Tags */}
                          {item.tags && item.tags.length > 0 && (
                            <div className="flex gap-2 mt-3 flex-wrap">
                              {item.tags.map((tag, tagIndex) => (
                                <span
                                  key={tagIndex}
                                  className="px-2 py-1 bg-white bg-opacity-60 text-xs rounded-full"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Notes */}
                          {item.notes && (
                            <div className="mt-3 p-3 bg-white bg-opacity-50 rounded-lg">
                              <p className="text-sm text-gray-600">{item.notes}</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    </Reorder.Item>
                  ))}
                </AnimatePresence>
              </Reorder.Group>

              {/* Empty State */}
              {itinerary[selectedDay].items.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-12"
                >
                  <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No activities planned for this day
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Add some activities to get started with your itinerary
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowAddItem(selectedDay)}
                    className="px-6 py-3 bg-gradient-to-r from-brand-green to-brand-seafoam text-white rounded-xl shadow-lg hover:shadow-xl transition-all"
                  >
                    <Plus className="w-5 h-5 inline mr-2" />
                    Add Your First Activity
                  </motion.button>
                </motion.div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}