'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users, MapPin, Star, TrendingUp } from 'lucide-react'

interface Stats {
  users: {
    total: number
    active: number
  }
  trips: {
    total: number
    completed: number
    destinations: number
  }
  testimonials: {
    total: number
    averageRating: number
  }
  stats: {
    satisfactionRate: number
    tripCompletionRate: number
  }
}

export default function StatsSection() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/stats')
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading || !stats) {
    return null
  }

  const statsDisplay = [
    {
      icon: Users,
      label: 'Happy Travelers',
      value: stats.users.total.toLocaleString(),
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      icon: MapPin,
      label: 'Trips Planned',
      value: stats.trips.total.toLocaleString(),
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      icon: Star,
      label: 'Average Rating',
      value: stats.testimonials.averageRating.toFixed(1),
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      icon: TrendingUp,
      label: 'Satisfaction Rate',
      value: `${Math.round(stats.stats.satisfactionRate)}%`,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    }
  ]

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {statsDisplay.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${stat.bgColor} mb-4`}>
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-gray-600">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}