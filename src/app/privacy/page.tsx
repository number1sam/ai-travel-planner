'use client'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🔒 Privacy & Data Protection
          </h1>
          <p className="text-lg text-gray-600">
            Your privacy is our priority
          </p>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Privacy Settings Temporarily Unavailable
            </h3>
            <p className="text-gray-600 mb-4">
              We're updating our privacy management system. Please check back shortly.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}