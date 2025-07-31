'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Copy, Check, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import Image from 'next/image'

interface TwoFactorSetupProps {
  onComplete?: () => void
  onCancel?: () => void
}

interface SetupData {
  secret: string
  qrCode: string
  backupCodes: string[]
  manualEntryKey: string
}

export default function TwoFactorSetup({ onComplete, onCancel }: TwoFactorSetupProps) {
  const [step, setStep] = useState(1)
  const [setupData, setSetupData] = useState<SetupData | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showBackupCodes, setShowBackupCodes] = useState(false)
  const [copiedSecret, setCopiedSecret] = useState(false)
  const [copiedBackupCodes, setCopiedBackupCodes] = useState(false)

  // Initialize 2FA setup
  useEffect(() => {
    initializeSetup()
  }, [])

  const initializeSetup = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to initialize 2FA setup')
      }

      const data = await response.json()
      setSetupData(data)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to initialize 2FA setup')
    } finally {
      setLoading(false)
    }
  }

  const verifyAndEnable = async () => {
    if (!verificationCode.trim()) {
      setError('Please enter the verification code')
      return
    }

    try {
      setLoading(true)
      setError('')

      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: verificationCode,
          action: 'enable'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Verification failed')
      }

      setStep(3) // Show backup codes
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string, type: 'secret' | 'backup') => {
    try {
      await navigator.clipboard.writeText(text)
      if (type === 'secret') {
        setCopiedSecret(true)
        setTimeout(() => setCopiedSecret(false), 2000)
      } else {
        setCopiedBackupCodes(true)
        setTimeout(() => setCopiedBackupCodes(false), 2000)
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const completeSetup = () => {
    onComplete?.()
  }

  if (loading && !setupData) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-green"></div>
        <span className="ml-2 text-gray-600">Initializing 2FA setup...</span>
      </div>
    )
  }

  if (error && !setupData) {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={initializeSetup}
          className="px-4 py-2 bg-brand-green text-white rounded-lg hover:bg-opacity-90"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-green to-brand-seafoam p-6 text-white">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8" />
          <div>
            <h2 className="text-xl font-bold">Two-Factor Authentication</h2>
            <p className="text-sm opacity-90">Add an extra layer of security</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <AnimatePresence mode="wait">
          {/* Step 1: QR Code */}
          {step === 1 && setupData && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Step 1: Scan QR Code</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Use an authenticator app like Google Authenticator, Authy, or 1Password
                </p>
              </div>

              {/* QR Code */}
              <div className="flex justify-center">
                <div className="p-4 bg-white border-2 border-gray-200 rounded-lg">
                  <Image
                    src={setupData.qrCode}
                    alt="2FA QR Code"
                    width={200}
                    height={200}
                    className="block"
                  />
                </div>
              </div>

              {/* Manual Entry */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Can't scan? Enter this code manually:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-white border rounded text-sm font-mono break-all">
                    {setupData.manualEntryKey}
                  </code>
                  <button
                    onClick={() => copyToClipboard(setupData.manualEntryKey, 'secret')}
                    className="p-2 text-gray-500 hover:text-brand-green transition-colors"
                    title="Copy to clipboard"
                  >
                    {copiedSecret ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full bg-brand-green text-white py-3 rounded-lg hover:bg-opacity-90 transition-colors"
              >
                Continue to Verification
              </button>
            </motion.div>
          )}

          {/* Step 2: Verification */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Step 2: Verify Setup</h3>
                <p className="text-sm text-gray-600">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}

              <div>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full p-4 text-center text-2xl font-mono border-2 border-gray-200 rounded-lg focus:border-brand-green focus:outline-none"
                  maxLength={6}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={verifyAndEnable}
                  disabled={loading || verificationCode.length !== 6}
                  className="flex-1 bg-brand-green text-white py-3 rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Verifying...' : 'Verify & Enable'}
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Backup Codes */}
          {step === 3 && setupData && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center">
                <Check className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold mb-2">2FA Enabled Successfully!</h3>
                <p className="text-sm text-gray-600">
                  Save these backup codes in a secure location
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">Important:</p>
                    <p>These backup codes can be used to access your account if you lose your authenticator device. Each code can only be used once.</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-gray-700">Backup Codes:</p>
                  <button
                    onClick={() => setShowBackupCodes(!showBackupCodes)}
                    className="text-sm text-brand-green hover:underline flex items-center gap-1"
                  >
                    {showBackupCodes ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {showBackupCodes ? 'Hide' : 'Show'}
                  </button>
                </div>

                {showBackupCodes && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                      {setupData.backupCodes.map((code, index) => (
                        <div key={index} className="p-2 bg-white border rounded">
                          {code}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => copyToClipboard(setupData.backupCodes.join('\n'), 'backup')}
                      className="w-full mt-3 p-2 text-sm text-brand-green border border-brand-green rounded hover:bg-brand-green hover:text-white transition-colors flex items-center justify-center gap-2"
                    >
                      {copiedBackupCodes ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copiedBackupCodes ? 'Copied!' : 'Copy All Codes'}
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={completeSetup}
                className="w-full bg-brand-green text-white py-3 rounded-lg hover:bg-opacity-90 transition-colors"
              >
                Complete Setup
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Cancel button */}
      {onCancel && (
        <div className="px-6 pb-6">
          <button
            onClick={onCancel}
            className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancel Setup
          </button>
        </div>
      )}
    </div>
  )
}