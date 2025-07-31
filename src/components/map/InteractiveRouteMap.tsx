'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MapPin, 
  Navigation, 
  Layers, 
  ZoomIn, 
  ZoomOut,
  Maximize,
  Minimize,
  Route,
  Clock,
  Car,
  Walking,
  Plane,
  Train,
  Bus,
  Bike,
  Settings,
  Filter,
  Eye,
  EyeOff,
  RotateCcw,
  Share2,
  Download,
  Info,
  Star,
  DollarSign
} from 'lucide-react'

interface MapLocation {
  id: string
  name: string
  address: string
  coordinates: [number, number] // [longitude, latitude]
  type: 'hotel' | 'restaurant' | 'attraction' | 'transport' | 'activity' | 'custom'
  category?: string
  rating?: number
  cost?: number
  visitTime?: string
  duration?: number // in minutes
  description?: string
  images?: string[]
  bookingStatus?: 'confirmed' | 'pending' | 'available'
  priority: 'high' | 'medium' | 'low'
}

interface RouteSegment {
  id: string
  from: string // location id
  to: string // location id
  mode: 'driving' | 'walking' | 'transit' | 'flight' | 'train' | 'bus' | 'bike'
  distance: number // in meters
  duration: number // in minutes
  cost?: number
  path: [number, number][] // route coordinates
  instructions?: string[]
  traffic?: 'low' | 'moderate' | 'heavy'
}

interface InteractiveRouteMapProps {
  locations: MapLocation[]
  routes: RouteSegment[]
  selectedLocation?: string
  onLocationSelect: (locationId: string) => void
  onRouteOptimize: (mode: string) => void
  onLocationUpdate: (locationId: string, updates: Partial<MapLocation>) => void
  center?: [number, number]
  zoom?: number
  dayFilter?: number
  showTraffic?: boolean
}

export default function InteractiveRouteMap({
  locations,
  routes,
  selectedLocation,
  onLocationSelect,
  onRouteOptimize,
  onLocationUpdate,
  center = [-74.006, 40.7128], // Default to NYC
  zoom = 12,
  dayFilter,
  showTraffic = false
}: InteractiveRouteMapProps) {
  const [mapView, setMapView] = useState<'satellite' | 'street' | 'terrain'>('street')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [routeMode, setRouteMode] = useState<'driving' | 'walking' | 'transit'>('driving')
  const [showLocationDetails, setShowLocationDetails] = useState(true)
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)

  // Mock map initialization (in real implementation, this would use Google Maps or Mapbox)
  useEffect(() => {
    // Simulate map loading
    const timer = setTimeout(() => {
      setMapLoaded(true)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  const getLocationIcon = (type: string) => {
    switch (type) {
      case 'hotel':
        return '🏨'
      case 'restaurant':
        return '🍽️'
      case 'attraction':
        return '🎯'
      case 'transport':
        return '🚉'
      case 'activity':
        return '🎭'
      default:
        return '📍'
    }
  }

  const getLocationColor = (type: string, priority: string) => {
    const baseColors = {
      hotel: 'bg-purple-500',
      restaurant: 'bg-orange-500',
      attraction: 'bg-pink-500',
      transport: 'bg-blue-500',
      activity: 'bg-green-500',
      custom: 'bg-gray-500'
    }

    const priorityRing = {
      high: 'ring-4 ring-red-300',
      medium: 'ring-2 ring-yellow-300',
      low: 'ring-1 ring-gray-300'
    }

    return `${baseColors[type as keyof typeof baseColors] || baseColors.custom} ${priorityRing[priority as keyof typeof priorityRing]}`
  }

  const getRouteColor = (mode: string) => {
    switch (mode) {
      case 'driving':
        return '#3B82F6' // blue
      case 'walking':
        return '#10B981' // green
      case 'transit':
        return '#8B5CF6' // purple
      case 'flight':
        return '#EF4444' // red
      case 'train':
        return '#F59E0B' // amber
      case 'bus':
        return '#06B6D4' // cyan
      case 'bike':
        return '#84CC16' // lime
      default:
        return '#6B7280' // gray
    }
  }

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'driving':
        return <Car className="w-4 h-4" />
      case 'walking':
        return <Walking className="w-4 h-4" />
      case 'transit':
        return <Bus className="w-4 h-4" />
      case 'flight':
        return <Plane className="w-4 h-4" />
      case 'train':
        return <Train className="w-4 h-4" />
      case 'bike':
        return <Bike className="w-4 h-4" />
      default:
        return <Navigation className="w-4 h-4" />
    }
  }

  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${meters}m`
    }
    return `${(meters / 1000).toFixed(1)}km`
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  }

  const filteredLocations = locations.filter(location => {
    if (activeFilters.length === 0) return true
    return activeFilters.includes(location.type)
  })

  const totalDistance = routes.reduce((sum, route) => sum + route.distance, 0)
  const totalDuration = routes.reduce((sum, route) => sum + route.duration, 0)
  const totalCost = routes.reduce((sum, route) => sum + (route.cost || 0), 0)

  return (
    <div className={`relative bg-white rounded-3xl shadow-lg overflow-hidden ${isFullscreen ? 'fixed inset-4 z-50' : 'h-[600px]'}`}>
      {/* Map Header */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-r from-brand-green to-brand-seafoam p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Interactive Route Map</h2>
            <p className="text-sm opacity-90">
              {filteredLocations.length} locations • {formatDistance(totalDistance)} • {formatDuration(totalDuration)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors"
            >
              <Filter className="w-5 h-5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors"
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </motion.button>
          </div>
        </div>

        {/* Route Summary */}
        <div className="flex items-center gap-4 mt-3 text-sm">
          <div className="flex items-center gap-1">
            <Route className="w-4 h-4" />
            <span>{routes.length} segments</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{formatDuration(totalDuration)}</span>
          </div>
          {totalCost > 0 && (
            <div className="flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              <span>${totalCost.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Map Controls */}
      <div className="absolute top-20 right-4 z-20 flex flex-col gap-2">
        {/* Map View Selector */}
        <div className="bg-white rounded-lg shadow-lg p-2">
          <div className="flex flex-col gap-1">
            {['street', 'satellite', 'terrain'].map((view) => (
              <button
                key={view}
                onClick={() => setMapView(view as any)}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  mapView === view 
                    ? 'bg-brand-green text-white' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="bg-white rounded-lg shadow-lg p-1">
          <button className="block p-2 text-gray-600 hover:text-brand-green transition-colors">
            <ZoomIn className="w-5 h-5" />
          </button>
          <button className="block p-2 text-gray-600 hover:text-brand-green transition-colors">
            <ZoomOut className="w-5 h-5" />
          </button>
        </div>

        {/* Other Controls */}
        <div className="bg-white rounded-lg shadow-lg p-1">
          <button 
            onClick={() => setShowLocationDetails(!showLocationDetails)}
            className="block p-2 text-gray-600 hover:text-brand-green transition-colors"
          >
            {showLocationDetails ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
          </button>
          <button className="block p-2 text-gray-600 hover:text-brand-green transition-colors">
            <RotateCcw className="w-5 h-5" />
          </button>
          <button className="block p-2 text-gray-600 hover:text-brand-green transition-colors">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, x: -300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -300 }}
            className="absolute top-20 left-4 z-20 w-64 bg-white rounded-lg shadow-lg p-4"
          >
            <h3 className="font-bold text-gray-900 mb-3">Filter Locations</h3>
            <div className="space-y-2">
              {['hotel', 'restaurant', 'attraction', 'transport', 'activity'].map((type) => (
                <label key={type} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={activeFilters.includes(type)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setActiveFilters([...activeFilters, type])
                      } else {
                        setActiveFilters(activeFilters.filter(f => f !== type))
                      }
                    }}
                    className="rounded border-gray-300 text-brand-green focus:ring-brand-green"
                  />
                  <span className="text-sm capitalize">{type}s</span>
                  <span className="text-xs text-gray-500">
                    ({locations.filter(l => l.type === type).length})
                  </span>
                </label>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="font-medium text-gray-900 mb-2">Route Mode</h4>
              <div className="flex gap-2">
                {['driving', 'walking', 'transit'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => {
                      setRouteMode(mode as any)
                      onRouteOptimize(mode)
                    }}
                    className={`flex items-center gap-1 px-3 py-1 text-xs rounded transition-colors ${
                      routeMode === mode
                        ? 'bg-brand-green text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {getModeIcon(mode)}
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map Container */}
      <div ref={mapRef} className="w-full h-full relative">
        {!mapLoaded ? (
          <div className="flex items-center justify-center h-full bg-gray-100">
            <div className="text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 border-4 border-brand-green border-t-transparent rounded-full mx-auto mb-4"
              />
              <p className="text-gray-600">Loading interactive map...</p>
            </div>
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-100 to-green-100 relative">
            {/* Mock Map Background */}
            <div className="absolute inset-0 opacity-20">
              <div className="w-full h-full bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200"></div>
              {/* Grid pattern to simulate map */}
              <div className="absolute inset-0" style={{
                backgroundImage: `
                  linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
                `,
                backgroundSize: '50px 50px'
              }}></div>
            </div>

            {/* Route Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {routes.map((route, index) => {
                const fromLocation = locations.find(l => l.id === route.from)
                const toLocation = locations.find(l => l.id === route.to)
                
                if (!fromLocation || !toLocation) return null

                // Mock coordinates conversion (in real implementation, this would use proper projection)
                const x1 = ((fromLocation.coordinates[0] + 74.006) * 100) % 100 + '%'
                const y1 = ((fromLocation.coordinates[1] - 40.7128) * 100) % 100 + '%'
                const x2 = ((toLocation.coordinates[0] + 74.006) * 100) % 100 + '%'
                const y2 = ((toLocation.coordinates[1] - 40.7128) * 100) % 100 + '%'

                return (
                  <motion.line
                    key={route.id}
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1, delay: index * 0.2 }}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={getRouteColor(route.mode)}
                    strokeWidth="3"
                    strokeDasharray={route.mode === 'flight' ? '10,5' : 'none'}
                    className="drop-shadow-sm"
                  />
                )
              })}
            </svg>

            {/* Location Markers */}
            {filteredLocations.map((location, index) => {
              // Mock positioning (in real implementation, this would use proper map projection)
              const x = ((location.coordinates[0] + 74.006) * 100) % 100
              const y = ((location.coordinates[1] - 40.7128) * 100) % 100

              return (
                <motion.div
                  key={location.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                  style={{ left: `${x}%`, top: `${y}%` }}
                  onClick={() => onLocationSelect(location.id)}
                  onMouseEnter={() => setHoveredLocation(location.id)}
                  onMouseLeave={() => setHoveredLocation(null)}
                >
                  {/* Location Pin */}
                  <div className={`
                    w-10 h-10 rounded-full shadow-lg transition-all duration-200 flex items-center justify-center text-white font-bold
                    ${getLocationColor(location.type, location.priority)}
                    ${selectedLocation === location.id ? 'scale-125' : 'hover:scale-110'}
                  `}>
                    <span className="text-lg">{getLocationIcon(location.type)}</span>
                  </div>

                  {/* Location Label */}
                  {(showLocationDetails || hoveredLocation === location.id || selectedLocation === location.id) && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute top-12 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-3 min-w-48 z-10"
                    >
                      <h4 className="font-bold text-gray-900 mb-1">{location.name}</h4>
                      <p className="text-xs text-gray-600 mb-2">{location.address}</p>
                      
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          {location.rating && (
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-yellow-500 fill-current" />
                              <span>{location.rating}</span>
                            </div>
                          )}
                          {location.cost && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3 text-green-600" />
                              <span>${location.cost}</span>
                            </div>
                          )}
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          location.bookingStatus === 'confirmed' ? 'bg-green-100 text-green-700' :
                          location.bookingStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {location.bookingStatus || 'available'}
                        </span>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Bottom Route Summary */}
      {routes.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <span className="font-medium text-gray-900">{formatDistance(totalDistance)}</span>
                <span className="text-gray-500 ml-2">{formatDuration(totalDuration)}</span>
              </div>
              {totalCost > 0 && (
                <div className="text-sm">
                  <span className="font-medium text-green-600">${totalCost.toLocaleString()}</span>
                  <span className="text-gray-500 ml-1">total cost</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onRouteOptimize('optimize')}
                className="px-4 py-2 bg-brand-green text-white text-sm rounded-lg hover:bg-opacity-90 transition-colors"
              >
                Optimize Route
              </motion.button>
              <button className="p-2 text-gray-500 hover:text-brand-green transition-colors">
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}