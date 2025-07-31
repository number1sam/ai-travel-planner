'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Eye, Edit, Calendar, DollarSign, MapPin, User, Plane, Hotel } from 'lucide-react'

interface Trip {
  id: string
  userId: string
  userName: string
  destination: string
  startDate: string
  endDate: string
  totalCost: number
  status: 'planned' | 'completed' | 'cancelled'
  flightDetails: string
  hotelName: string
}

export default function TripsSection() {
  const [trips, setTrips] = useState<Trip[]>([
    {
      id: 'TRP-001',
      userId: '1',
      userName: 'Sarah Johnson',
      destination: 'Rome, Italy',
      startDate: '2024-07-15',
      endDate: '2024-07-22',
      totalCost: 2450,
      status: 'planned',
      flightDetails: 'BA 2551',
      hotelName: 'Hotel Artemide'
    },
    {
      id: 'TRP-002',
      userId: '2',
      userName: 'Michael Chen',
      destination: 'Tokyo, Japan',
      startDate: '2024-06-10',
      endDate: '2024-06-20',
      totalCost: 4200,
      status: 'completed',
      flightDetails: 'JAL 44',
      hotelName: 'Park Hyatt Tokyo'
    },
    {
      id: 'TRP-003',
      userId: '3',
      userName: 'Emma Rodriguez',
      destination: 'Paris, France',
      startDate: '2024-08-05',
      endDate: '2024-08-12',
      totalCost: 1800,
      status: 'planned',
      flightDetails: 'AF 1234',
      hotelName: 'Hotel Le Marais'
    }
  ])

  const [searchQuery, setSearchQuery] = useState('')

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredTrips = trips.filter(trip =>
    trip.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    trip.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    trip.destination.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">All Trips</h2>
          <div className="text-sm text-gray-500">
            {filteredTrips.length} trips found
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by trip ID, user name, or destination..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-green"
          />
        </div>
      </div>

      {/* Trips Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Trip ID</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Destination</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTrips.map((trip, index) => (
                <motion.tr
                  key={trip.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                    {trip.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gradient-to-r from-brand-green to-brand-seafoam rounded-full flex items-center justify-center mr-3">
                        <span className="text-white text-xs font-medium">
                          {trip.userName.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{trip.userName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">{trip.destination}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">£{trip.totalCost.toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(trip.status)}`}>
                      {trip.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button className="text-brand-green hover:text-brand-seafoam">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="text-gray-600 hover:text-gray-800">
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}