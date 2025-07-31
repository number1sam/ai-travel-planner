'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  CreditCard, 
  Shield, 
  Bell,
  Globe,
  Moon,
  Sun,
  Eye,
  EyeOff,
  Save,
  Edit3,
  Camera,
  Trash2,
  Download,
  Key,
  Smartphone
} from 'lucide-react'

interface UserProfile {
  name: string
  email: string
  phone: string
  dateOfBirth: string
  nationality: string
  address: string
  emergencyContact: string
  profilePicture?: string
}

interface NotificationSettings {
  email: boolean
  sms: boolean
  push: boolean
  marketing: boolean
  tripUpdates: boolean
  healthReminders: boolean
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'account' | 'notifications' | 'privacy' | 'billing'>('profile')
  const [profile, setProfile] = useState<UserProfile>({
    name: 'John Smith',
    email: 'john.smith@email.com',
    phone: '+44 7123 456789',
    dateOfBirth: '1990-05-15',
    nationality: 'United Kingdom',
    address: '123 Oxford Street, London, UK',
    emergencyContact: 'Jane Smith - +44 7987 654321',
    profilePicture: undefined
  })
  
  const [notifications, setNotifications] = useState<NotificationSettings>({
    email: true,
    sms: false,
    push: true,
    marketing: false,
    tripUpdates: true,
    healthReminders: true
  })
  
  const [isEditing, setIsEditing] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [language, setLanguage] = useState('en')
  const [currency, setCurrency] = useState('GBP')
  const [timezone, setTimezone] = useState('Europe/London')
  
  const [paymentMethods, setPaymentMethods] = useState([
    {
      id: '1',
      type: 'visa',
      last4: '4242',
      expiry: '12/25',
      isDefault: true
    },
    {
      id: '2', 
      type: 'mastercard',
      last4: '5555',
      expiry: '08/26',
      isDefault: false
    }
  ])

  const handleProfileSave = async () => {
    // In real implementation, this would save to backend
    setIsEditing(false)
    alert('Profile updated successfully!')
  }

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match')
      return
    }
    
    if (newPassword.length < 8) {
      alert('Password must be at least 8 characters')
      return
    }
    
    // In real implementation, this would update password via API
    alert('Password updated successfully!')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  const handleNotificationChange = (key: keyof NotificationSettings, value: boolean) => {
    setNotifications(prev => ({ ...prev, [key]: value }))
  }

  const toggleTwoFactor = () => {
    if (!twoFactorEnabled) {
      // In real implementation, this would start 2FA setup process
      alert('Two-factor authentication setup would begin here')
    }
    setTwoFactorEnabled(!twoFactorEnabled)
  }

  const deleteAccount = () => {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      // In real implementation, this would trigger account deletion process
      alert('Account deletion request submitted. You will receive a confirmation email.')
    }
  }

  const exportData = () => {
    // In real implementation, this would trigger data export
    alert('Data export request submitted. You will receive a download link via email.')
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'account', label: 'Account', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy', icon: Eye },
    { id: 'billing', label: 'Billing', icon: CreditCard }
  ]

  const TabButton = ({ tab }) => (
    <button
      onClick={() => setActiveTab(tab.id)}
      className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-left transition-colors ${
        activeTab === tab.id
          ? 'bg-brand-green text-white'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      <tab.icon className="w-5 h-5" />
      {tab.label}
    </button>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm" style={{ height: '80px' }}>
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-brand-green to-brand-seafoam rounded-xl flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900">Settings</h1>
              <p className="text-sm text-gray-600">Manage your account and preferences</p>
            </div>
          </div>
          
          <button 
            onClick={() => window.location.href = '/home'}
            className="text-brand-green hover:text-brand-seafoam transition-colors font-medium"
          >
            ← Back to Home
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl shadow-xl p-6 sticky top-8">
              <div className="space-y-2">
                {tabs.map((tab) => (
                  <TabButton key={tab.id} tab={tab} />
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-3xl shadow-xl p-8"
              >
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-gray-900">Profile Information</h2>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="flex items-center gap-2 bg-brand-green hover:bg-opacity-90 text-white px-4 py-2 rounded-xl transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                    {isEditing ? 'Cancel' : 'Edit'}
                  </button>
                </div>

                {/* Profile Picture */}
                <div className="flex items-center gap-6 mb-8">
                  <div className="relative">
                    <div className="w-24 h-24 bg-gradient-to-r from-brand-green to-brand-seafoam rounded-full flex items-center justify-center text-white text-2xl font-bold">
                      {profile.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    {isEditing && (
                      <button className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white hover:bg-blue-600 transition-colors">
                        <Camera className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{profile.name}</h3>
                    <p className="text-gray-600">{profile.email}</p>
                    <p className="text-sm text-gray-500 mt-1">Member since January 2024</p>
                  </div>
                </div>

                {/* Profile Form */}
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                      <input
                        type="text"
                        value={profile.name}
                        onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                        disabled={!isEditing}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                      <input
                        type="email"
                        value={profile.email}
                        onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                        disabled={!isEditing}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                      <input
                        type="tel"
                        value={profile.phone}
                        onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                        disabled={!isEditing}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                      <input
                        type="date"
                        value={profile.dateOfBirth}
                        onChange={(e) => setProfile(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                        disabled={!isEditing}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nationality</label>
                      <select
                        value={profile.nationality}
                        onChange={(e) => setProfile(prev => ({ ...prev, nationality: e.target.value }))}
                        disabled={!isEditing}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                      >
                        <option value="United Kingdom">United Kingdom</option>
                        <option value="United States">United States</option>
                        <option value="Canada">Canada</option>
                        <option value="Australia">Australia</option>
                        <option value="Germany">Germany</option>
                        <option value="France">France</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        disabled={!isEditing}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                      >
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                        <option value="it">Italian</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                    <textarea
                      value={profile.address}
                      onChange={(e) => setProfile(prev => ({ ...prev, address: e.target.value }))}
                      disabled={!isEditing}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Contact</label>
                    <input
                      type="text"
                      value={profile.emergencyContact}
                      onChange={(e) => setProfile(prev => ({ ...prev, emergencyContact: e.target.value }))}
                      disabled={!isEditing}
                      placeholder="Name - Phone Number"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>

                  {isEditing && (
                    <div className="flex gap-4">
                      <button
                        onClick={handleProfileSave}
                        className="flex items-center gap-2 bg-brand-green hover:bg-opacity-90 text-white px-6 py-3 rounded-xl transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        Save Changes
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Account Tab */}
            {activeTab === 'account' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-8"
              >
                {/* Change Password */}
                <div className="bg-white rounded-3xl shadow-xl p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Change Password</h2>
                  
                  <div className="space-y-4 max-w-md">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-transparent pr-12"
                        />
                        <button
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-transparent"
                      />
                    </div>

                    <button
                      onClick={handlePasswordChange}
                      className="flex items-center gap-2 bg-brand-green hover:bg-opacity-90 text-white px-6 py-3 rounded-xl transition-colors"
                    >
                      <Key className="w-4 h-4" />
                      Update Password
                    </button>
                  </div>
                </div>

                {/* Two-Factor Authentication */}
                <div className="bg-white rounded-3xl shadow-xl p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Two-Factor Authentication</h2>
                  
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                        <Smartphone className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Authenticator App</h3>
                        <p className="text-sm text-gray-600">
                          {twoFactorEnabled ? 'Two-factor authentication is enabled' : 'Add extra security to your account'}
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={toggleTwoFactor}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        twoFactorEnabled
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-brand-green text-white hover:bg-opacity-90'
                      }`}
                    >
                      {twoFactorEnabled ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </div>

                {/* Account Actions */}
                <div className="bg-white rounded-3xl shadow-xl p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Account Actions</h2>
                  
                  <div className="space-y-4">
                    <button
                      onClick={exportData}
                      className="flex items-center gap-3 w-full p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-left"
                    >
                      <Download className="w-5 h-5 text-gray-600" />
                      <div>
                        <div className="font-medium text-gray-900">Export Your Data</div>
                        <div className="text-sm text-gray-600">Download all your personal data</div>
                      </div>
                    </button>

                    <button
                      onClick={deleteAccount}
                      className="flex items-center gap-3 w-full p-4 border border-red-200 rounded-xl hover:bg-red-50 transition-colors text-left"
                    >
                      <Trash2 className="w-5 h-5 text-red-600" />
                      <div>
                        <div className="font-medium text-red-900">Delete Account</div>
                        <div className="text-sm text-red-600">Permanently delete your account and data</div>
                      </div>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-3xl shadow-xl p-8"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Notification Preferences</h2>
                
                <div className="space-y-6">
                  {[
                    { key: 'email', label: 'Email Notifications', description: 'Receive notifications via email' },
                    { key: 'sms', label: 'SMS Notifications', description: 'Receive notifications via text message' },
                    { key: 'push', label: 'Push Notifications', description: 'Receive push notifications in your browser' },
                    { key: 'marketing', label: 'Marketing Emails', description: 'Receive promotional offers and updates' },
                    { key: 'tripUpdates', label: 'Trip Updates', description: 'Get notified about changes to your trips' },
                    { key: 'healthReminders', label: 'Health Reminders', description: 'Receive reminders about health goals' }
                  ].map((setting) => (
                    <div key={setting.key} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                      <div>
                        <h3 className="font-semibold text-gray-900">{setting.label}</h3>
                        <p className="text-sm text-gray-600">{setting.description}</p>
                      </div>
                      
                      <button
                        onClick={() => handleNotificationChange(setting.key as keyof NotificationSettings, !notifications[setting.key as keyof NotificationSettings])}
                        className={`w-12 h-6 rounded-full flex items-center transition-colors ${
                          notifications[setting.key as keyof NotificationSettings]
                            ? 'bg-brand-green justify-end'
                            : 'bg-gray-300 justify-start'
                        } px-1`}
                      >
                        <div className="w-4 h-4 bg-white rounded-full" />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Privacy Tab */}
            {activeTab === 'privacy' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-3xl shadow-xl p-8"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Privacy Settings</h2>
                
                <div className="space-y-6">
                  <div className="p-4 bg-blue-50 rounded-xl">
                    <h3 className="font-semibold text-blue-900 mb-2">Data Privacy</h3>
                    <p className="text-sm text-blue-700 mb-4">
                      We take your privacy seriously. Review and manage how your data is used.
                    </p>
                    <button
                      onClick={() => window.location.href = '/privacy'}
                      className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                    >
                      Manage Privacy Settings →
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                      <div>
                        <h3 className="font-semibold text-gray-900">Analytics Cookies</h3>
                        <p className="text-sm text-gray-600">Help us improve our service</p>
                      </div>
                      <div className="w-12 h-6 bg-brand-green rounded-full flex items-center justify-end px-1">
                        <div className="w-4 h-4 bg-white rounded-full" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                      <div>
                        <h3 className="font-semibold text-gray-900">Marketing Cookies</h3>
                        <p className="text-sm text-gray-600">Personalized content and ads</p>
                      </div>
                      <div className="w-12 h-6 bg-gray-300 rounded-full flex items-center justify-start px-1">
                        <div className="w-4 h-4 bg-white rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Billing Tab */}
            {activeTab === 'billing' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-8"
              >
                {/* Current Plan */}
                <div className="bg-white rounded-3xl shadow-xl p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Current Plan</h2>
                  
                  <div className="border border-gray-200 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">Premium Plan</h3>
                        <p className="text-gray-600">Billed monthly</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">£9.99</div>
                        <div className="text-sm text-gray-600">per month</div>
                      </div>
                    </div>
                    
                    <div className="flex gap-4">
                      <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                        Change Plan
                      </button>
                      <button className="px-4 py-2 text-red-600 hover:text-red-700 transition-colors">
                        Cancel Subscription
                      </button>
                    </div>
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="bg-white rounded-3xl shadow-xl p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Payment Methods</h2>
                    <button className="flex items-center gap-2 bg-brand-green hover:bg-opacity-90 text-white px-4 py-2 rounded-xl transition-colors">
                      <CreditCard className="w-4 h-4" />
                      Add Card
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {paymentMethods.map((method) => (
                      <div key={method.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-8 bg-gray-200 rounded flex items-center justify-center text-xs font-medium">
                            {method.type.toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">•••• •••• •••• {method.last4}</div>
                            <div className="text-sm text-gray-600">Expires {method.expiry}</div>
                          </div>
                          {method.isDefault && (
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                              Default
                            </span>
                          )}
                        </div>
                        
                        <div className="flex gap-2">
                          <button className="text-gray-400 hover:text-gray-600">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button className="text-red-400 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Billing History */}
                <div className="bg-white rounded-3xl shadow-xl p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Billing History</h2>
                  
                  <div className="space-y-4">
                    {[
                      { date: '2024-01-01', amount: '£9.99', status: 'Paid', invoice: 'INV-001' },
                      { date: '2023-12-01', amount: '£9.99', status: 'Paid', invoice: 'INV-002' },
                      { date: '2023-11-01', amount: '£9.99', status: 'Paid', invoice: 'INV-003' }
                    ].map((transaction, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">Premium Plan</div>
                            <div className="text-sm text-gray-600">{transaction.date}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-medium text-gray-900">{transaction.amount}</div>
                            <div className="text-sm text-green-600">{transaction.status}</div>
                          </div>
                          <button className="text-brand-green hover:text-brand-seafoam">
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}