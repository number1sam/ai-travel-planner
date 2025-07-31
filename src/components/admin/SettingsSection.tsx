'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Save, Eye, EyeOff, Key, Globe, DollarSign, Flag, History, Shield } from 'lucide-react'

interface APIKey {
  id: string
  name: string
  key: string
  lastUsed: string
  status: 'active' | 'inactive'
}

interface FeatureFlag {
  id: string
  name: string
  description: string
  enabled: boolean
  environment: string
}

export default function SettingsSection() {
  const [activeTab, setActiveTab] = useState<'api' | 'search' | 'pricing' | 'features' | 'security'>('api')
  const [showKeys, setShowKeys] = useState<{[key: string]: boolean}>({})
  const [isLoading, setIsLoading] = useState(false)

  const [apiKeys, setApiKeys] = useState<APIKey[]>([
    {
      id: '1',
      name: 'Amadeus Flight API',
      key: 'sk_live_51234567890abcdef',
      lastUsed: '2024-07-28T10:30:00Z',
      status: 'active'
    },
    {
      id: '2',
      name: 'Booking.com Hotels',
      key: 'booking_api_key_987654321',
      lastUsed: '2024-07-28T09:15:00Z',
      status: 'active'
    },
    {
      id: '3',
      name: 'Google Maps Places',
      key: 'AIzaSyC4YourGoogleMapsAPIKey',
      lastUsed: '2024-07-27T16:45:00Z',
      status: 'active'
    },
    {
      id: '4',
      name: 'Stripe Payments',
      key: 'sk_live_stripe_key_example',
      lastUsed: '2024-07-28T08:20:00Z',
      status: 'inactive'
    }
  ])

  const [searchFilters, setSearchFilters] = useState({
    maxActivityRadius: 25,
    maxFlightLayovers: 2,
    minHotelRating: 3,
    maxBudgetDeviation: 20,
    includeUnratedVenues: false
  })

  const [pricingTiers, setPricingTiers] = useState({
    free: { price: 0, trips: 1, features: ['Basic itineraries', 'Standard health tips'] },
    premium: { price: 9.99, trips: -1, features: ['Unlimited trips', 'Personalized AI', 'Advanced health tracking'] },
    pro: { price: 19.99, trips: -1, features: ['All Premium', 'Priority support', 'Concierge assistance'] }
  })

  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([
    {
      id: '1',
      name: 'AI_HEALTH_RECOMMENDATIONS',
      description: 'Enable AI-powered health recommendations',
      enabled: true,
      environment: 'production'
    },
    {
      id: '2',
      name: 'SOCIAL_SHARING',
      description: 'Allow users to share trip itineraries',
      enabled: true,
      environment: 'production'
    },
    {
      id: '3',
      name: 'REALTIME_NOTIFICATIONS',
      description: 'Real-time push notifications for trip updates',
      enabled: false,
      environment: 'beta'
    },
    {
      id: '4',
      name: 'VOICE_PLANNING',
      description: 'Voice-activated trip planning (experimental)',
      enabled: false,
      environment: 'experimental'
    }
  ])

  const toggleKeyVisibility = (keyId: string) => {
    setShowKeys(prev => ({ ...prev, [keyId]: !prev[keyId] }))
  }

  const maskApiKey = (key: string) => {
    return key.substring(0, 8) + '...' + key.substring(key.length - 4)
  }

  const handleSaveSettings = async (section: string) => {
    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      alert(`${section} settings saved successfully!`)
    } catch (error) {
      alert('Failed to save settings. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFeatureToggle = (flagId: string) => {
    setFeatureFlags(prev => prev.map(flag => 
      flag.id === flagId ? { ...flag, enabled: !flag.enabled } : flag
    ))
  }

  const tabs = [
    { id: 'api', label: 'API Keys', icon: Key },
    { id: 'search', label: 'Search Filters', icon: Globe },
    { id: 'pricing', label: 'Pricing Tiers', icon: DollarSign },
    { id: 'features', label: 'Feature Flags', icon: Flag },
    { id: 'security', label: 'Security', icon: Shield }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">System Settings</h2>
        <p className="text-gray-600">Manage global configurations and system parameters</p>
        
        {/* Tabs */}
        <div className="flex gap-2 mt-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-brand-green to-brand-seafoam text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-2xl shadow-lg p-6"
      >
        {activeTab === 'api' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">API Key Management</h3>
              <button className="px-4 py-2 bg-gradient-to-r from-brand-green to-brand-seafoam text-white rounded-lg hover:opacity-90 transition-opacity">
                Add New Key
              </button>
            </div>
            
            <div className="space-y-4">
              {apiKeys.map((apiKey) => (
                <div key={apiKey.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">{apiKey.name}</h4>
                      <p className="text-sm text-gray-500">Last used: {new Date(apiKey.lastUsed).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        apiKey.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {apiKey.status}
                      </span>
                      <button
                        onClick={() => toggleKeyVisibility(apiKey.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        {showKeys[apiKey.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-lg font-mono text-sm">
                    {showKeys[apiKey.id] ? apiKey.key : maskApiKey(apiKey.key)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'search' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Default Search Filters</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Activity Radius (km)
                </label>
                <input
                  type="number"
                  value={searchFilters.maxActivityRadius}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, maxActivityRadius: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Flight Layovers
                </label>
                <input
                  type="number"
                  value={searchFilters.maxFlightLayovers}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, maxFlightLayovers: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Hotel Rating
                </label>
                <select
                  value={searchFilters.minHotelRating}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, minHotelRating: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green"
                >
                  <option value={1}>1 Star</option>
                  <option value={2}>2 Stars</option>
                  <option value={3}>3 Stars</option>
                  <option value={4}>4 Stars</option>
                  <option value={5}>5 Stars</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Budget Deviation (%)
                </label>
                <input
                  type="number"
                  value={searchFilters.maxBudgetDeviation}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, maxBudgetDeviation: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green"
                />
              </div>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeUnratedVenues"
                checked={searchFilters.includeUnratedVenues}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, includeUnratedVenues: e.target.checked }))}
                className="mr-3 h-4 w-4 text-brand-green focus:ring-brand-green border-gray-300 rounded"
              />
              <label htmlFor="includeUnratedVenues" className="text-sm text-gray-700">
                Include unrated venues in search results
              </label>
            </div>
            
            <button
              onClick={() => handleSaveSettings('Search Filters')}
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-brand-green to-brand-seafoam text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Filters
            </button>
          </div>
        )}

        {activeTab === 'pricing' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Pricing Tier Management</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Object.entries(pricingTiers).map(([tier, config]) => (
                <div key={tier} className="border border-gray-200 rounded-lg p-4">
                  <div className="text-center mb-4">
                    <h4 className="font-semibold text-gray-900 capitalize mb-2">{tier}</h4>
                    <div className="text-2xl font-bold text-gray-900">
                      £{config.price}{config.price > 0 && <span className="text-sm font-normal text-gray-500">/month</span>}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Price (£)</label>
                      <input
                        type="number"
                        value={config.price}
                        onChange={(e) => setPricingTiers(prev => ({
                          ...prev,
                          [tier]: { ...prev[tier as keyof typeof prev], price: parseFloat(e.target.value) }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Trips per month</label>
                      <input
                        type="number"
                        value={config.trips}
                        onChange={(e) => setPricingTiers(prev => ({
                          ...prev,
                          [tier]: { ...prev[tier as keyof typeof prev], trips: parseInt(e.target.value) }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green"
                        placeholder="Unlimited = -1"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Features</label>
                      <div className="space-y-1">
                        {config.features.map((feature, index) => (
                          <div key={index} className="text-sm text-gray-600">• {feature}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <button
              onClick={() => handleSaveSettings('Pricing Tiers')}
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-brand-green to-brand-seafoam text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Pricing
            </button>
          </div>
        )}

        {activeTab === 'features' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Feature Flag System</h3>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <History className="w-4 h-4" />
                Rollback options available
              </div>
            </div>
            
            <div className="space-y-4">
              {featureFlags.map((flag) => (
                <div key={flag.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="font-mono text-sm font-medium text-gray-900">
                        {flag.name}
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        flag.environment === 'production' ? 'bg-green-100 text-green-800' :
                        flag.environment === 'beta' ? 'bg-blue-100 text-blue-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {flag.environment}
                      </span>
                    </div>
                    
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={flag.enabled}
                        onChange={() => handleFeatureToggle(flag.id)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-green/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-green"></div>
                    </label>
                  </div>
                  
                  <p className="text-sm text-gray-600">{flag.description}</p>
                </div>
              ))}
            </div>
            
            <button
              onClick={() => handleSaveSettings('Feature Flags')}
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-brand-green to-brand-seafoam text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Feature Flags
            </button>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Security Configuration</h3>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800">Security Notice</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Only authorized administrators can make changes to security configurations. 
                    All changes are logged and require additional verification.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Authentication Settings</h4>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Session Timeout (minutes)
                  </label>
                  <input
                    type="number"
                    defaultValue={30}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Login Attempts
                  </label>
                  <input
                    type="number"
                    defaultValue={5}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green"
                  />
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="requireTwoFactor"
                    defaultChecked
                    className="mr-3 h-4 w-4 text-brand-green focus:ring-brand-green border-gray-300 rounded"
                  />
                  <label htmlFor="requireTwoFactor" className="text-sm text-gray-700">
                    Require two-factor authentication for admin accounts
                  </label>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Data Protection</h4>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="encryptAtRest"
                    defaultChecked
                    className="mr-3 h-4 w-4 text-brand-green focus:ring-brand-green border-gray-300 rounded"
                  />
                  <label htmlFor="encryptAtRest" className="text-sm text-gray-700">
                    Encrypt data at rest
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="auditLogging"
                    defaultChecked
                    className="mr-3 h-4 w-4 text-brand-green focus:ring-brand-green border-gray-300 rounded"
                  />
                  <label htmlFor="auditLogging" className="text-sm text-gray-700">
                    Enable comprehensive audit logging
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="gdprCompliance"
                    defaultChecked
                    className="mr-3 h-4 w-4 text-brand-green focus:ring-brand-green border-gray-300 rounded"
                  />
                  <label htmlFor="gdprCompliance" className="text-sm text-gray-700">
                    GDPR compliance mode
                  </label>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => handleSaveSettings('Security')}
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-brand-green to-brand-seafoam text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Security Settings
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}