'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Share2, 
  Copy, 
  Facebook, 
  Twitter, 
  Instagram, 
  Linkedin,
  Mail,
  Link,
  Users,
  Eye,
  Calendar,
  MapPin,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Download,
  Edit3,
  Trash2,
  Globe,
  Lock,
  QrCode
} from 'lucide-react'

interface SharedTrip {
  id: string
  title: string
  destination: string
  startDate: string
  endDate: string
  shareUrl: string
  views: number
  likes: number
  comments: number
  privacy: 'public' | 'private' | 'friends'
  createdAt: string
  thumbnail: string
}

interface SocialPost {
  id: string
  platform: 'facebook' | 'twitter' | 'instagram' | 'linkedin'
  content: string
  scheduledFor?: string
  status: 'draft' | 'scheduled' | 'posted'
  engagement: {
    likes: number
    shares: number
    comments: number
  }
}

export default function TripSharingPage() {
  const [activeTab, setActiveTab] = useState<'share' | 'social' | 'analytics'>('share')
  const [selectedTrip, setSelectedTrip] = useState<string>('')
  const [shareUrl, setShareUrl] = useState('')
  const [privacy, setPrivacy] = useState<'public' | 'private' | 'friends'>('public')
  const [customMessage, setCustomMessage] = useState('')
  const [showQR, setShowQR] = useState(false)
  
  const [sharedTrips] = useState<SharedTrip[]>([
    {
      id: '1',
      title: 'Amazing Paris Adventure',
      destination: 'Paris, France',
      startDate: '2024-03-15',
      endDate: '2024-03-22',
      shareUrl: 'https://travelplanner.com/share/paris-adventure-xyz',
      views: 1247,
      likes: 89,
      comments: 23,
      privacy: 'public',
      createdAt: '2024-01-15',
      thumbnail: '/api/placeholder/300/200'
    },
    {
      id: '2',
      title: 'Tokyo Discovery Tour',
      destination: 'Tokyo, Japan',
      startDate: '2024-05-10',
      endDate: '2024-05-18',
      shareUrl: 'https://travelplanner.com/share/tokyo-discovery-abc',
      views: 892,
      likes: 156,
      comments: 31,
      privacy: 'friends',
      createdAt: '2024-01-20',
      thumbnail: '/api/placeholder/300/200'
    }
  ])

  const [trips] = useState([
    { id: '1', title: 'Amazing Paris Adventure', destination: 'Paris, France' },
    { id: '2', title: 'Tokyo Discovery Tour', destination: 'Tokyo, Japan' },
    { id: '3', title: 'Italian Coast Road Trip', destination: 'Italy' }
  ])

  const [socialPosts] = useState<SocialPost[]>([
    {
      id: '1',
      platform: 'facebook',
      content: 'Just finished planning my dream trip to Paris! 🗼✨ Check out my itinerary',
      status: 'posted',
      engagement: { likes: 42, shares: 8, comments: 15 }
    },
    {
      id: '2',
      platform: 'instagram',
      content: 'Tokyo here I come! 🇯🇵 My AI travel planner created the perfect itinerary #TokyoTrip',
      scheduledFor: '2024-02-15T09:00',
      status: 'scheduled',
      engagement: { likes: 0, shares: 0, comments: 0 }
    }
  ])

  const generateShareUrl = () => {
    if (!selectedTrip) return
    
    const trip = trips.find(t => t.id === selectedTrip)
    if (!trip) return
    
    const baseUrl = 'https://travelplanner.com/share/'
    const slug = trip.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const url = `${baseUrl}${slug}-${Math.random().toString(36).substr(2, 9)}`
    
    setShareUrl(url)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Link copied to clipboard!')
  }

  const shareToSocial = (platform: string) => {
    const text = customMessage || `Check out my amazing trip itinerary: ${shareUrl}`
    const encodedText = encodeURIComponent(text)
    const encodedUrl = encodeURIComponent(shareUrl)
    
    let shareUrlForPlatform = ''
    
    switch (platform) {
      case 'facebook':
        shareUrlForPlatform = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`
        break
      case 'twitter':
        shareUrlForPlatform = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`
        break
      case 'linkedin':
        shareUrlForPlatform = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`
        break
      case 'email':
        shareUrlForPlatform = `mailto:?subject=Check out my trip itinerary&body=${encodedText} ${encodedUrl}`
        break
    }
    
    if (shareUrlForPlatform) {
      window.open(shareUrlForPlatform, '_blank', 'width=600,height=400')
    }
  }

  const updatePrivacy = (tripId: string, newPrivacy: 'public' | 'private' | 'friends') => {
    // In real implementation, this would update the trip privacy via API
    alert(`Privacy updated to ${newPrivacy}`)
  }

  const deleteSharedTrip = (tripId: string) => {
    if (confirm('Are you sure you want to stop sharing this trip?')) {
      // In real implementation, this would delete the shared trip via API
      alert('Trip sharing removed')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm" style={{ height: '80px' }}>
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-brand-green to-brand-seafoam rounded-xl flex items-center justify-center">
              <Share2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900">Trip Sharing</h1>
              <p className="text-sm text-gray-600">Share your adventures with the world</p>
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
        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 rounded-xl p-1 mb-8 w-fit">
          {[
            { id: 'share', label: 'Share Trip', icon: Share2 },
            { id: 'social', label: 'Social Posts', icon: Users },
            { id: 'analytics', label: 'Analytics', icon: Eye }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-brand-green shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Share Trip Tab */}
        {activeTab === 'share' && (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Create Share Link */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-3xl shadow-xl p-8"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Share Link</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Trip</label>
                  <select
                    value={selectedTrip}
                    onChange={(e) => setSelectedTrip(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-transparent"
                  >
                    <option value="">Choose a trip to share</option>
                    {trips.map((trip) => (
                      <option key={trip.id} value={trip.id}>
                        {trip.title} - {trip.destination}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Privacy Settings</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'public', label: 'Public', icon: Globe, desc: 'Anyone can view' },
                      { value: 'friends', label: 'Friends', icon: Users, desc: 'Friends only' },
                      { value: 'private', label: 'Private', icon: Lock, desc: 'Link only' }
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setPrivacy(option.value as any)}
                        className={`p-3 border rounded-xl text-center transition-colors ${
                          privacy === option.value
                            ? 'border-brand-green bg-green-50 text-brand-green'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <option.icon className="w-5 h-5 mx-auto mb-1" />
                        <div className="text-sm font-medium">{option.label}</div>
                        <div className="text-xs text-gray-500">{option.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Custom Message (Optional)</label>
                  <textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Add a personal message to share with your itinerary..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-transparent h-24"
                  />
                </div>

                <button
                  onClick={generateShareUrl}
                  disabled={!selectedTrip}
                  className="w-full bg-brand-green hover:bg-opacity-90 disabled:bg-gray-300 text-white py-3 px-4 rounded-xl font-medium transition-colors"
                >
                  Generate Share Link
                </button>

                {shareUrl && (
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div className="flex-1 font-mono text-sm text-gray-600 bg-white p-2 rounded border">
                        {shareUrl}
                      </div>
                      <button
                        onClick={() => copyToClipboard(shareUrl)}
                        className="flex items-center gap-2 bg-brand-green text-white px-3 py-2 rounded-lg hover:bg-opacity-90 transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                        Copy
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowQR(!showQR)}
                        className="flex items-center gap-2 bg-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        <QrCode className="w-4 h-4" />
                        QR Code
                      </button>
                    </div>

                    {showQR && (
                      <div className="mt-4 text-center">
                        <div className="w-32 h-32 bg-gray-200 mx-auto rounded-lg flex items-center justify-center">
                          <QrCode className="w-16 h-16 text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-600 mt-2">QR Code for easy sharing</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Social Sharing */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-3xl shadow-xl p-8"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Share on Social Media</h2>
              
              {shareUrl ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => shareToSocial('facebook')}
                      className="flex items-center gap-3 p-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                    >
                      <Facebook className="w-5 h-5" />
                      Facebook
                    </button>

                    <button
                      onClick={() => shareToSocial('twitter')}
                      className="flex items-center gap-3 p-4 bg-sky-500 text-white rounded-xl hover:bg-sky-600 transition-colors"
                    >
                      <Twitter className="w-5 h-5" />
                      Twitter
                    </button>

                    <button
                      onClick={() => shareToSocial('linkedin')}
                      className="flex items-center gap-3 p-4 bg-blue-700 text-white rounded-xl hover:bg-blue-800 transition-colors"
                    >
                      <Linkedin className="w-5 h-5" />
                      LinkedIn
                    </button>

                    <button
                      onClick={() => shareToSocial('email')}
                      className="flex items-center gap-3 p-4 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors"
                    >
                      <Mail className="w-5 h-5" />
                      Email
                    </button>
                  </div>

                  <div className="p-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <Instagram className="w-5 h-5" />
                      <span className="font-medium">Instagram Story</span>
                    </div>
                    <p className="text-sm opacity-90 mb-3">
                      Download a beautiful story template for your trip
                    </p>
                    <button className="flex items-center gap-2 bg-white bg-opacity-20 px-3 py-2 rounded-lg hover:bg-opacity-30 transition-colors">
                      <Download className="w-4 h-4" />
                      Download Template
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Share2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Generate a share link first to enable social sharing</p>
                </div>
              )}
            </motion.div>
          </div>
        )}

        {/* Social Posts Tab */}
        {activeTab === 'social' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Social Post Composer */}
            <div className="bg-white rounded-3xl shadow-xl p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Social Post</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { platform: 'facebook', icon: Facebook, color: 'bg-blue-600' },
                      { platform: 'twitter', icon: Twitter, color: 'bg-sky-500' },
                      { platform: 'instagram', icon: Instagram, color: 'bg-gradient-to-r from-pink-500 to-purple-600' },
                      { platform: 'linkedin', icon: Linkedin, color: 'bg-blue-700' }
                    ].map((social) => (
                      <button
                        key={social.platform}
                        className={`flex items-center justify-center gap-2 p-3 text-white rounded-xl ${social.color} hover:opacity-90 transition-opacity`}
                      >
                        <social.icon className="w-4 h-4" />
                        <span className="capitalize text-sm">{social.platform}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Post Content</label>
                  <textarea
                    placeholder="What's your travel story? Share your excitement about your upcoming trip..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-transparent h-32"
                  />
                </div>

                <div className="flex gap-4">
                  <button className="bg-brand-green hover:bg-opacity-90 text-white px-6 py-3 rounded-xl transition-colors">
                    Post Now
                  </button>
                  <button className="border border-gray-300 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-50 transition-colors">
                    Schedule Post
                  </button>
                </div>
              </div>
            </div>

            {/* Posted Content */}
            <div className="bg-white rounded-3xl shadow-xl p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Posts</h2>
              
              <div className="space-y-4">
                {socialPosts.map((post) => (
                  <div key={post.id} className="border border-gray-200 rounded-xl p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {post.platform === 'facebook' && <Facebook className="w-5 h-5 text-blue-600" />}
                        {post.platform === 'twitter' && <Twitter className="w-5 h-5 text-sky-500" />}
                        {post.platform === 'instagram' && <Instagram className="w-5 h-5 text-pink-500" />}
                        {post.platform === 'linkedin' && <Linkedin className="w-5 h-5 text-blue-700" />}
                        <div>
                          <span className="font-medium text-gray-900 capitalize">{post.platform}</span>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              post.status === 'posted' ? 'bg-green-100 text-green-800' :
                              post.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {post.status}
                            </span>
                            {post.scheduledFor && (
                              <span>• Scheduled for {new Date(post.scheduledFor).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <button className="text-gray-400 hover:text-gray-600">
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </div>

                    <p className="text-gray-700 mb-4">{post.content}</p>

                    {post.status === 'posted' && (
                      <div className="flex gap-6 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          {post.engagement.likes} likes
                        </div>
                        <div className="flex items-center gap-1">
                          <Share2 className="w-4 h-4" />
                          {post.engagement.shares} shares
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-4 h-4" />
                          {post.engagement.comments} comments
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Overview Stats */}
            <div className="grid md:grid-cols-4 gap-6">
              <div className="bg-white rounded-3xl shadow-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Eye className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="font-semibold text-gray-900">Total Views</span>
                </div>
                <div className="text-3xl font-bold text-gray-900">2,139</div>
                <div className="text-sm text-green-600">+15% this month</div>
              </div>

              <div className="bg-white rounded-3xl shadow-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                    <Heart className="w-5 h-5 text-red-600" />
                  </div>
                  <span className="font-semibold text-gray-900">Total Likes</span>
                </div>
                <div className="text-3xl font-bold text-gray-900">245</div>
                <div className="text-sm text-green-600">+23% this month</div>
              </div>

              <div className="bg-white rounded-3xl shadow-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <Share2 className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="font-semibold text-gray-900">Total Shares</span>
                </div>
                <div className="text-3xl font-bold text-gray-900">89</div>
                <div className="text-sm text-green-600">+31% this month</div>
              </div>

              <div className="bg-white rounded-3xl shadow-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="font-semibold text-gray-900">Comments</span>
                </div>
                <div className="text-3xl font-bold text-gray-900">54</div>
                <div className="text-sm text-green-600">+8% this month</div>
              </div>
            </div>

            {/* Shared Trips Management */}
            <div className="bg-white rounded-3xl shadow-xl p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Shared Trips</h2>
              
              <div className="space-y-6">
                {sharedTrips.map((trip) => (
                  <div key={trip.id} className="border border-gray-200 rounded-xl p-6">
                    <div className="grid md:grid-cols-4 gap-6">
                      <div className="md:col-span-2">
                        <div className="flex items-start gap-4">
                          <div className="w-16 h-16 bg-gray-200 rounded-xl flex items-center justify-center">
                            <MapPin className="w-6 h-6 text-gray-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 mb-1">{trip.title}</h3>
                            <p className="text-gray-600 mb-2">{trip.destination}</p>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
                              </div>
                              <div className={`px-2 py-1 rounded-full text-xs ${
                                trip.privacy === 'public' ? 'bg-green-100 text-green-800' :
                                trip.privacy === 'friends' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {trip.privacy}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 text-sm text-gray-600">
                        <div className="text-center">
                          <div className="font-semibold text-gray-900">{trip.views}</div>
                          <div>Views</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-gray-900">{trip.likes}</div>
                          <div>Likes</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-gray-900">{trip.comments}</div>
                          <div>Comments</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(trip.shareUrl)}
                          className="flex items-center gap-2 text-brand-green hover:text-brand-seafoam"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button className="text-gray-400 hover:text-gray-600">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteSharedTrip(trip.id)}
                          className="text-red-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}