'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Heart, Zap, X } from 'lucide-react'

interface Feature {
  id: string
  title: string
  description: string
  icon: React.ComponentType<any>
  modalContent: {
    title: string
    description: string
    features: string[]
    image: string
  }
}

const features: Feature[] = [
  {
    id: 'ai-powered',
    title: 'AI-Powered Trip Planning',
    description: 'Our advanced AI analyzes thousands of options to create your perfect itinerary in minutes.',
    icon: Brain,
    modalContent: {
      title: 'Revolutionary AI Trip Planning',
      description: 'Experience the future of travel planning with our sophisticated AI that understands your preferences, budget, and schedule to craft personalized itineraries.',
      features: [
        'Analyzes millions of flight, hotel, and activity combinations',
        'Learns from your preferences and past trips',
        'Optimizes for time, budget, and personal interests',
        'Integrates real-time pricing and availability',
        'Suggests hidden gems and local experiences'
      ],
      image: '/ai-planning.jpg'
    }
  },
  {
    id: 'health-optimized',
    title: 'Health-Optimized Itineraries',
    description: 'Every trip is tailored to support your wellness goals and health requirements.',
    icon: Heart,
    modalContent: {
      title: 'Travel That Supports Your Wellness',
      description: 'Your health comes first. Our platform creates itineraries that maintain and enhance your wellness routine while exploring the world.',
      features: [
        'Syncs with your fitness trackers and health apps',
        'Suggests activities based on your fitness level',
        'Includes healthy dining options and wellness activities',
        'Accounts for medical conditions and dietary restrictions',
        'Provides local health and emergency information'
      ],
      image: '/health-wellness.jpg'
    }
  },
  {
    id: 'dynamic-adjustments',
    title: 'Dynamic Adjustments in Real Time',
    description: 'Your plans adapt instantly to changes in weather, availability, or your preferences.',
    icon: Zap,
    modalContent: {
      title: 'Plans That Evolve With You',
      description: 'Life happens, and your travel plans should be flexible. Our system continuously monitors and adjusts your itinerary for the best possible experience.',
      features: [
        'Real-time weather and traffic monitoring',
        'Automatic rebooking when flights are cancelled',
        'Suggests alternative activities during closures',
        'Adapts to your energy levels and mood',
        'Instant notifications for important changes'
      ],
      image: '/dynamic-planning.jpg'
    }
  }
]

export default function FeaturesSection() {
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null)

  const openModal = (feature: Feature) => {
    setSelectedFeature(feature)
  }

  const closeModal = () => {
    setSelectedFeature(null)
  }

  return (
    <section id="features" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Why Choose Our AI Travel Planner?
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Discover the three core capabilities that make your travel planning effortless and your trips unforgettable.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-10">
          {features.map((feature, index) => (
            <motion.div
              key={feature.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: index * 0.2 }}
              viewport={{ once: true }}
              className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group"
              style={{ width: '420px', margin: '0 auto' }}
              whileHover={{ y: -8 }}
            >
              <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-r from-brand-green to-brand-seafoam rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-300">
                <feature.icon className="w-8 h-8 text-white" />
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                {feature.title}
              </h3>
              
              <p className="text-gray-600 mb-6 leading-relaxed">
                {feature.description}
              </p>
              
              <button
                onClick={() => openModal(feature)}
                className="text-brand-green font-semibold hover:text-brand-seafoam transition-colors duration-300 flex items-center gap-2 group-hover:gap-3"
              >
                Learn More
                <motion.span
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  →
                </motion.span>
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {selectedFeature && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative">
                <button
                  onClick={closeModal}
                  className="absolute top-6 right-6 z-10 bg-white bg-opacity-80 rounded-full p-2 hover:bg-opacity-100 transition-all duration-300"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
                
                <div className="h-64 bg-gradient-to-r from-brand-green to-brand-seafoam rounded-t-2xl flex items-center justify-center">
                  <selectedFeature.icon className="w-20 h-20 text-white" />
                </div>
                
                <div className="p-8">
                  <h3 className="text-3xl font-bold text-gray-900 mb-4">
                    {selectedFeature.modalContent.title}
                  </h3>
                  
                  <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                    {selectedFeature.modalContent.description}
                  </p>
                  
                  <h4 className="text-xl font-semibold text-gray-900 mb-4">
                    Key Features:
                  </h4>
                  
                  <ul className="space-y-3">
                    {selectedFeature.modalContent.features.map((item, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-brand-green rounded-full mt-2 flex-shrink-0" />
                        <span className="text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}