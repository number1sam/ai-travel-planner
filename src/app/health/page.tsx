'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Activity, 
  Heart, 
  Footprints, 
  Droplets, 
  Moon, 
  Scale,
  Plus,
  Calendar,
  TrendingUp,
  Watch,
  Smartphone,
  Wifi,
  Battery,
  RefreshCw
} from 'lucide-react'

interface HealthMetric {
  id: string
  type: string
  value: number
  unit: string
  timestamp: Date
  source: string
}

interface ConnectedDevice {
  id: string
  name: string
  type: 'fitbit' | 'apple_watch' | 'google_fit' | 'manual'
  connected: boolean
  lastSync: Date
  battery?: number
}

export default function HealthTrackingPage() {
  const [metrics, setMetrics] = useState<HealthMetric[]>([])
  const [devices, setDevices] = useState<ConnectedDevice[]>([
    {
      id: '1',
      name: 'Fitbit Versa 3',
      type: 'fitbit',
      connected: true,
      lastSync: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
      battery: 85
    },
    {
      id: '2', 
      name: 'iPhone Health',
      type: 'apple_watch',
      connected: true,
      lastSync: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      battery: 92
    }
  ])
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('week')
  const [isLoading, setIsLoading] = useState(true)
  const [showAddDevice, setShowAddDevice] = useState(false)

  // Mock health data
  const healthData = {
    steps: { value: 8543, goal: 10000, unit: 'steps' },
    heartRate: { value: 72, unit: 'bpm', zone: 'resting' },
    sleep: { value: 7.5, goal: 8, unit: 'hours' },
    hydration: { value: 6, goal: 8, unit: 'glasses' },
    weight: { value: 70.2, unit: 'kg', trend: '+0.2' },
    calories: { value: 2145, goal: 2200, unit: 'kcal' }
  }

  const weeklyTrends = [
    { day: 'Mon', steps: 9200, sleep: 7.2, heartRate: 68 },
    { day: 'Tue', steps: 8100, sleep: 6.8, heartRate: 70 },
    { day: 'Wed', steps: 10500, sleep: 8.1, heartRate: 65 },
    { day: 'Thu', steps: 7800, sleep: 7.5, heartRate: 72 },
    { day: 'Fri', steps: 9600, sleep: 7.8, heartRate: 69 },
    { day: 'Sat', steps: 12200, sleep: 8.5, heartRate: 63 },
    { day: 'Sun', steps: 8543, sleep: 7.5, heartRate: 72 }
  ]

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setIsLoading(false), 1500)
  }, [])

  const syncDevice = async (deviceId: string) => {
    const updatedDevices = devices.map(device => 
      device.id === deviceId 
        ? { ...device, lastSync: new Date() }
        : device
    )
    setDevices(updatedDevices)
  }

  const addManualEntry = () => {
    // In real implementation, this would open a modal for manual data entry
    alert('Manual entry modal would open here')
  }

  const connectNewDevice = () => {
    setShowAddDevice(true)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your health data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm" style={{ height: '80px' }}>
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-brand-green to-brand-seafoam rounded-xl flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900">Health Tracking</h1>
              <p className="text-sm text-gray-600">Monitor your wellness journey</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <select 
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as any)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-green focus:border-transparent"
            >
              <option value="day">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
            
            <button 
              onClick={connectNewDevice}
              className="flex items-center gap-2 bg-brand-green hover:bg-opacity-90 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Connect Device
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Connected Devices */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl p-6 mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Connected Devices</h2>
            <button
              onClick={() => devices.forEach(device => syncDevice(device.id))}
              className="flex items-center gap-2 text-brand-green hover:text-brand-seafoam transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Sync All
            </button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {devices.map((device) => (
              <div key={device.id} className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {device.type === 'fitbit' && <Watch className="w-5 h-5 text-green-500" />}
                    {device.type === 'apple_watch' && <Smartphone className="w-5 h-5 text-blue-500" />}
                    {device.type === 'google_fit' && <Activity className="w-5 h-5 text-red-500" />}
                    <span className="font-semibold text-gray-900">{device.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Wifi className={`w-4 h-4 ${device.connected ? 'text-green-500' : 'text-gray-400'}`} />
                    {device.battery && (
                      <div className="flex items-center gap-1">
                        <Battery className="w-4 h-4 text-gray-500" />
                        <span className="text-xs text-gray-600">{device.battery}%</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="text-sm text-gray-600 mb-3">
                  Last sync: {device.lastSync.toLocaleTimeString()}
                </div>
                
                <button
                  onClick={() => syncDevice(device.id)}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-3 rounded-lg text-sm transition-colors"
                >
                  Sync Now
                </button>
              </div>
            ))}
            
            {/* Add Device Card */}
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center min-h-[140px]">
              <Plus className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-gray-600 text-sm mb-2">Add New Device</span>
              <button
                onClick={connectNewDevice}
                className="text-brand-green hover:text-brand-seafoam text-sm font-medium"
              >
                Connect
              </button>
            </div>
          </div>
        </motion.div>

        {/* Health Metrics Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Steps */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl shadow-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Footprints className="w-5 h-5 text-blue-600" />
                </div>
                <span className="font-semibold text-gray-900">Steps</span>
              </div>
              <button onClick={addManualEntry}>
                <Plus className="w-4 h-4 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            
            <div className="mb-4">
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {healthData.steps.value.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">
                Goal: {healthData.steps.goal.toLocaleString()} {healthData.steps.unit}
              </div>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((healthData.steps.value / healthData.steps.goal) * 100, 100)}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-600">
              {Math.round((healthData.steps.value / healthData.steps.goal) * 100)}% of goal
            </div>
          </motion.div>

          {/* Heart Rate */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-3xl shadow-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <Heart className="w-5 h-5 text-red-600" />
                </div>
                <span className="font-semibold text-gray-900">Heart Rate</span>
              </div>
              <button onClick={addManualEntry}>
                <Plus className="w-4 h-4 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            
            <div className="mb-4">
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {healthData.heartRate.value}
              </div>
              <div className="text-sm text-gray-600">
                {healthData.heartRate.unit} • {healthData.heartRate.zone}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-600">Normal range</span>
            </div>
          </motion.div>

          {/* Sleep */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-3xl shadow-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Moon className="w-5 h-5 text-purple-600" />
                </div>
                <span className="font-semibold text-gray-900">Sleep</span>
              </div>
              <button onClick={addManualEntry}>
                <Plus className="w-4 h-4 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            
            <div className="mb-4">
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {healthData.sleep.value}
              </div>
              <div className="text-sm text-gray-600">
                {healthData.sleep.unit} • Goal: {healthData.sleep.goal}h
              </div>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((healthData.sleep.value / healthData.sleep.goal) * 100, 100)}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-600">
              {Math.round((healthData.sleep.value / healthData.sleep.goal) * 100)}% of goal
            </div>
          </motion.div>

          {/* Hydration */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-3xl shadow-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center">
                  <Droplets className="w-5 h-5 text-cyan-600" />
                </div>
                <span className="font-semibold text-gray-900">Hydration</span>
              </div>
              <button onClick={addManualEntry}>
                <Plus className="w-4 h-4 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            
            <div className="mb-4">
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {healthData.hydration.value}
              </div>
              <div className="text-sm text-gray-600">
                of {healthData.hydration.goal} {healthData.hydration.unit}
              </div>
            </div>
            
            <div className="flex gap-1 mb-2">
              {Array.from({ length: healthData.hydration.goal }, (_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-2 rounded-full ${
                    i < healthData.hydration.value ? 'bg-cyan-600' : 'bg-gray-200'
                  }`}
                ></div>
              ))}
            </div>
            <div className="text-xs text-gray-600">
              {healthData.hydration.goal - healthData.hydration.value} glasses remaining
            </div>
          </motion.div>

          {/* Weight */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-3xl shadow-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                  <Scale className="w-5 h-5 text-orange-600" />
                </div>
                <span className="font-semibold text-gray-900">Weight</span>
              </div>
              <button onClick={addManualEntry}>
                <Plus className="w-4 h-4 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            
            <div className="mb-4">
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {healthData.weight.value}
              </div>
              <div className="text-sm text-gray-600">
                {healthData.weight.unit}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-xs text-gray-600">
                {healthData.weight.trend} kg this week
              </span>
            </div>
          </motion.div>

          {/* Calories */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-3xl shadow-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <Activity className="w-5 h-5 text-yellow-600" />
                </div>
                <span className="font-semibold text-gray-900">Calories</span>
              </div>
              <button onClick={addManualEntry}>
                <Plus className="w-4 h-4 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            
            <div className="mb-4">
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {healthData.calories.value.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">
                Goal: {healthData.calories.goal.toLocaleString()} {healthData.calories.unit}
              </div>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div 
                className="bg-yellow-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((healthData.calories.value / healthData.calories.goal) * 100, 100)}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-600">
              {healthData.calories.goal - healthData.calories.value} kcal remaining
            </div>
          </motion.div>
        </div>

        {/* Weekly Trends Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-3xl shadow-xl p-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Weekly Trends</h2>
            <div className="flex gap-2">
              <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm">Steps</button>
              <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm">Sleep</button>
              <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm">Heart Rate</button>
            </div>
          </div>

          <div className="h-64 flex items-end justify-between gap-4">
            {weeklyTrends.map((day, index) => (
              <div key={day.day} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-blue-500 rounded-t-lg mb-2 transition-all duration-500"
                  style={{ 
                    height: `${(day.steps / 12000) * 200}px`,
                    minHeight: '20px'
                  }}
                ></div>
                <span className="text-xs text-gray-600 mb-1">{day.steps.toLocaleString()}</span>
                <span className="text-xs font-medium text-gray-900">{day.day}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Health Insights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-white rounded-3xl shadow-xl p-8 mt-8"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-6">Health Insights</h2>
          
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-green-50 rounded-xl">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Great Job on Activity!</h3>
                <p className="text-sm text-gray-600">
                  You've been consistently active this week. Your average daily steps increased by 15% compared to last week.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-xl">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Moon className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Sleep Quality Tip</h3>
                <p className="text-sm text-gray-600">
                  Try to maintain a consistent sleep schedule. Going to bed at the same time each night can improve your sleep quality.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-cyan-50 rounded-xl">
              <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Droplets className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Hydration Reminder</h3>
                <p className="text-sm text-gray-600">
                  You're doing well with hydration! Remember to drink more water during your travels to stay refreshed.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}