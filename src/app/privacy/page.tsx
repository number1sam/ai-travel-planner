'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Shield, Download, Trash2, Check, X, Info, Lock, Eye, Database, UserCheck } from 'lucide-react'

interface ConsentStatus {
  marketing: boolean
  analytics: boolean
  essential: boolean
  personalization: boolean
}

export default function PrivacyPage() {
  const [consent, setConsent] = useState<ConsentStatus>({
    marketing: false,
    analytics: false,
    essential: true,
    personalization: false
  })
  
  const [isLoading, setIsLoading] = useState(true)
  const [exportRequests, setExportRequests] = useState<any[]>([])
  const [deletionRequests, setDeletionRequests] = useState<any[]>([])

  useEffect(() => {
    fetchConsentStatus()
    fetchDataRequests()
  }, [])

  const fetchConsentStatus = async () => {
    try {
      const response = await fetch('/api/gdpr/consent', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setConsent(data.consent)
      }
    } catch (error) {
      console.error('Error fetching consent status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchDataRequests = async () => {
    try {
      const [exportResponse, deletionResponse] = await Promise.all([
        fetch('/api/gdpr/data-export', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/gdpr/data-deletion', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ])

      if (exportResponse.ok) {
        const exportData = await exportResponse.json()
        setExportRequests(exportData.requests || [])
      }

      if (deletionResponse.ok) {
        const deletionData = await deletionResponse.json()
        setDeletionRequests(deletionData.requests || [])
      }
    } catch (error) {
      console.error('Error fetching data requests:', error)
    }
  }

  const updateConsent = async (type: keyof ConsentStatus, value: boolean) => {
    if (type === 'essential') return // Essential cookies cannot be disabled

    try {
      const updatedConsent = { ...consent, [type]: value }
      setConsent(updatedConsent)

      const response = await fetch('/api/gdpr/consent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ [type]: value })
      })

      if (!response.ok) {
        // Revert on error
        setConsent(consent)
        alert('Failed to update consent preferences')
      }
    } catch (error) {
      console.error('Error updating consent:', error)
      setConsent(consent)
      alert('Failed to update consent preferences')
    }
  }

  const requestDataExport = async () => {
    try {
      const response = await fetch('/api/gdpr/data-export', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        alert('Data export request submitted. You will receive an email when ready.')
        fetchDataRequests()
      } else {
        alert('Failed to submit data export request')
      }
    } catch (error) {
      console.error('Error requesting data export:', error)
      alert('Failed to submit data export request')
    }
  }

  const requestDataDeletion = async () => {
    const reason = prompt('Please provide a reason for account deletion (optional):')
    
    if (confirm('Are you sure you want to delete your account? This action cannot be undone after the grace period.')) {
      try {
        const response = await fetch('/api/gdpr/data-deletion', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ reason })
        })

        if (response.ok) {
          alert('Account deletion request submitted. You have 30 days to cancel.')
          fetchDataRequests()
        } else {
          alert('Failed to submit deletion request')
        }
      } catch (error) {
        console.error('Error requesting data deletion:', error)
        alert('Failed to submit deletion request')
      }
    }
  }

  if (isLoading) {
    return (
      <div className=\"min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center\">
        <div className=\"text-center\">
          <div className=\"w-16 h-16 border-4 border-brand-green border-t-transparent rounded-full animate-spin mx-auto mb-4\"></div>
          <p className=\"text-gray-600\">Loading privacy settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className=\"min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50\">
      {/* Header */}
      <div className=\"bg-white shadow-sm\">
        <div className=\"max-w-7xl mx-auto px-4 py-4\">
          <div className=\"flex items-center justify-between\">
            <div className=\"flex items-center gap-3\">
              <div className=\"w-10 h-10 bg-gradient-to-r from-brand-green to-brand-seafoam rounded-xl flex items-center justify-center\">
                <Shield className=\"w-5 h-5 text-white\" />
              </div>
              <div>
                <h1 className=\"font-bold text-gray-900\">Privacy & Data Control</h1>
                <p className=\"text-sm text-gray-600\">Manage your data and privacy preferences</p>
              </div>
            </div>
            
            <button 
              onClick={() => window.location.href = '/home'}
              className=\"text-brand-green hover:text-brand-seafoam transition-colors font-medium\"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </div>

      <div className=\"max-w-4xl mx-auto px-4 py-8\">
        {/* Consent Management */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className=\"bg-white rounded-3xl shadow-xl p-8 mb-8\"
        >
          <div className=\"flex items-center gap-3 mb-6\">
            <UserCheck className=\"w-6 h-6 text-brand-green\" />
            <h2 className=\"text-2xl font-bold text-gray-900\">Consent Preferences</h2>
          </div>

          <p className=\"text-gray-600 mb-8\">
            Control how we use your data. You can change these preferences at any time.
          </p>

          <div className=\"space-y-6\">
            {/* Essential Cookies */}
            <div className=\"flex items-start justify-between p-4 bg-gray-50 rounded-xl\">
              <div className=\"flex-1\">
                <div className=\"flex items-center gap-2 mb-2\">
                  <Lock className=\"w-5 h-5 text-gray-500\" />
                  <h3 className=\"font-semibold text-gray-900\">Essential</h3>
                  <span className=\"bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs font-medium\">
                    Required
                  </span>
                </div>
                <p className=\"text-sm text-gray-600\">
                  Necessary for basic website functionality, security, and your account access. Cannot be disabled.
                </p>
              </div>
              <div className=\"ml-4\">
                <div className=\"w-12 h-6 bg-brand-green rounded-full flex items-center justify-end px-1\">
                  <div className=\"w-4 h-4 bg-white rounded-full\" />
                </div>
              </div>
            </div>

            {/* Analytics Cookies */}
            <div className=\"flex items-start justify-between p-4 border border-gray-200 rounded-xl\">
              <div className=\"flex-1\">
                <div className=\"flex items-center gap-2 mb-2\">
                  <Database className=\"w-5 h-5 text-blue-500\" />
                  <h3 className=\"font-semibold text-gray-900\">Analytics</h3>
                </div>
                <p className=\"text-sm text-gray-600\">
                  Help us understand how you use our service to improve performance and user experience.
                </p>
              </div>
              <div className=\"ml-4\">
                <button
                  onClick={() => updateConsent('analytics', !consent.analytics)}
                  className={`w-12 h-6 rounded-full flex items-center transition-colors ${
                    consent.analytics
                      ? 'bg-brand-green justify-end'
                      : 'bg-gray-300 justify-start'
                  } px-1`}
                >
                  <div className=\"w-4 h-4 bg-white rounded-full\" />
                </button>
              </div>
            </div>

            {/* Marketing Cookies */}
            <div className=\"flex items-start justify-between p-4 border border-gray-200 rounded-xl\">
              <div className=\"flex-1\">
                <div className=\"flex items-center gap-2 mb-2\">
                  <Eye className=\"w-5 h-5 text-purple-500\" />
                  <h3 className=\"font-semibold text-gray-900\">Marketing</h3>
                </div>
                <p className=\"text-sm text-gray-600\">
                  Allow us to send you personalized offers, travel tips, and promotional content.
                </p>
              </div>
              <div className=\"ml-4\">
                <button
                  onClick={() => updateConsent('marketing', !consent.marketing)}
                  className={`w-12 h-6 rounded-full flex items-center transition-colors ${
                    consent.marketing
                      ? 'bg-brand-green justify-end'
                      : 'bg-gray-300 justify-start'
                  } px-1`}
                >
                  <div className=\"w-4 h-4 bg-white rounded-full\" />
                </button>
              </div>
            </div>

            {/* Personalization Cookies */}
            <div className=\"flex items-start justify-between p-4 border border-gray-200 rounded-xl\">
              <div className=\"flex-1\">
                <div className=\"flex items-center gap-2 mb-2\">
                  <Info className=\"w-5 h-5 text-orange-500\" />
                  <h3 className=\"font-semibold text-gray-900\">Personalization</h3>
                </div>
                <p className=\"text-sm text-gray-600\">
                  Customize your experience with personalized recommendations and content based on your preferences.
                </p>
              </div>
              <div className=\"ml-4\">
                <button
                  onClick={() => updateConsent('personalization', !consent.personalization)}
                  className={`w-12 h-6 rounded-full flex items-center transition-colors ${
                    consent.personalization
                      ? 'bg-brand-green justify-end'
                      : 'bg-gray-300 justify-start'
                  } px-1`}
                >
                  <div className=\"w-4 h-4 bg-white rounded-full\" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Data Rights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className=\"bg-white rounded-3xl shadow-xl p-8 mb-8\"
        >
          <div className=\"flex items-center gap-3 mb-6\">
            <Shield className=\"w-6 h-6 text-brand-green\" />
            <h2 className=\"text-2xl font-bold text-gray-900\">Your Data Rights</h2>
          </div>

          <div className=\"grid md:grid-cols-2 gap-6\">
            {/* Data Export */}
            <div className=\"border border-gray-200 rounded-xl p-6\">
              <div className=\"flex items-center gap-3 mb-4\">
                <Download className=\"w-6 h-6 text-blue-500\" />
                <h3 className=\"font-semibold text-gray-900\">Export Your Data</h3>
              </div>
              <p className=\"text-sm text-gray-600 mb-4\">
                Download a copy of all your personal data we have stored. Includes profile, trips, health data, and activity history.
              </p>
              <button
                onClick={requestDataExport}
                className=\"w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-xl font-medium transition-colors\"
              >
                Request Data Export
              </button>
            </div>

            {/* Account Deletion */}
            <div className=\"border border-red-200 rounded-xl p-6\">
              <div className=\"flex items-center gap-3 mb-4\">
                <Trash2 className=\"w-6 h-6 text-red-500\" />
                <h3 className=\"font-semibold text-gray-900\">Delete Your Account</h3>
              </div>
              <p className=\"text-sm text-gray-600 mb-4\">
                Permanently delete your account and all associated data. This action cannot be undone after the 30-day grace period.
              </p>
              <button
                onClick={requestDataDeletion}
                className=\"w-full bg-red-500 hover:bg-red-600 text-white py-3 px-4 rounded-xl font-medium transition-colors\"
              >
                Request Account Deletion
              </button>
            </div>
          </div>
        </motion.div>

        {/* Request History */}
        {(exportRequests.length > 0 || deletionRequests.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className=\"bg-white rounded-3xl shadow-xl p-8\"
          >
            <h2 className=\"text-2xl font-bold text-gray-900 mb-6\">Request History</h2>

            {/* Export Requests */}
            {exportRequests.length > 0 && (
              <div className=\"mb-6\">
                <h3 className=\"font-semibold text-gray-900 mb-3\">Data Export Requests</h3>
                <div className=\"space-y-3\">
                  {exportRequests.map((request, index) => (
                    <div key={index} className=\"flex items-center justify-between p-3 bg-gray-50 rounded-lg\">
                      <div>
                        <p className=\"font-medium text-gray-900\">
                          Requested: {new Date(request.requestDate).toLocaleDateString()}
                        </p>
                        <p className=\"text-sm text-gray-600\">Status: {request.status}</p>
                      </div>
                      <div className=\"flex items-center gap-2\">
                        {request.status === 'completed' ? (
                          <Check className=\"w-5 h-5 text-green-500\" />
                        ) : request.status === 'failed' ? (
                          <X className=\"w-5 h-5 text-red-500\" />
                        ) : (
                          <div className=\"w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin\" />
                        )}
                        {request.downloadUrl && (
                          <a
                            href={request.downloadUrl}
                            className=\"text-blue-500 hover:text-blue-600 text-sm font-medium\"
                          >
                            Download
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Deletion Requests */}
            {deletionRequests.length > 0 && (
              <div>
                <h3 className=\"font-semibold text-gray-900 mb-3\">Account Deletion Requests</h3>
                <div className=\"space-y-3\">
                  {deletionRequests.map((request, index) => (
                    <div key={index} className=\"flex items-center justify-between p-3 bg-red-50 rounded-lg\">
                      <div>
                        <p className=\"font-medium text-gray-900\">
                          Requested: {new Date(request.requestDate).toLocaleDateString()}
                        </p>
                        <p className=\"text-sm text-gray-600\">
                          Scheduled: {new Date(request.scheduledDeletion).toLocaleDateString()}
                        </p>
                        <p className=\"text-sm text-gray-600\">Status: {request.status}</p>
                      </div>
                      <div className=\"flex items-center gap-2\">
                        {request.status === 'pending' ? (
                          <span className=\"bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs\">
                            Grace Period
                          </span>
                        ) : request.status === 'deleted' ? (
                          <Check className=\"w-5 h-5 text-red-500\" />
                        ) : (
                          <X className=\"w-5 h-5 text-gray-500\" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Privacy Policy Link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className=\"text-center mt-8\"
        >
          <p className=\"text-gray-600 mb-4\">
            Learn more about how we protect your privacy and use your data.
          </p>
          <div className=\"flex justify-center gap-4\">
            <a
              href=\"/privacy-policy\"
              className=\"text-brand-green hover:text-brand-seafoam font-medium transition-colors\"
            >
              Privacy Policy
            </a>
            <span className=\"text-gray-300\">|</span>
            <a
              href=\"/terms\"
              className=\"text-brand-green hover:text-brand-seafoam font-medium transition-colors\"
            >
              Terms of Service
            </a>
            <span className=\"text-gray-300\">|</span>
            <a
              href=\"/contact\"
              className=\"text-brand-green hover:text-brand-seafoam font-medium transition-colors\"
            >
              Contact Support
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  )
}