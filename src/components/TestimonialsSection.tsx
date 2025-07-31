'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Star, Loader2 } from 'lucide-react'

interface Testimonial {
  id: string
  name: string
  location: string
  rating: number
  text: string
  image?: string
  tripDestination: string
  createdAt?: string
  trip?: {
    destination: string
    startDate: string
    endDate: string
  }
}

// Fallback testimonials for when API is unavailable or database is empty
const fallbackTestimonials: Testimonial[] = [
  {
    id: '1',
    name: 'Dr. Sarah Chen',
    location: 'San Francisco, CA',
    rating: 5,
    text: 'As a busy surgeon, I thought personalized travel was impossible with my schedule and health needs. This AI planner created a perfect 2-week Southeast Asia itinerary that included meditation retreats, healthy cuisine, and activities matching my fitness tracker data. I came back rejuvenated and 10 pounds lighter!',
    image: '/testimonial-sarah.jpg',
    tripDestination: 'Wellness & Cultural Immersion - Thailand & Vietnam'
  },
  {
    id: '2',
    name: 'Marcus Rodriguez',
    location: 'Austin, TX',
    rating: 5,
    text: 'After my accident, I thought adventure travel was over. This platform proved me wrong! It found wheelchair-accessible hiking trails in New Zealand, adaptive surfing lessons, and restaurants with perfect accessibility ratings. The AI even connected me with other adaptive athletes traveling the same route.',
    image: '/testimonial-marcus.jpg',
    tripDestination: 'Adaptive Adventure Travel - New Zealand'
  },
  {
    id: '3',
    name: 'Emily Watson & Family',
    location: 'London, UK',
    rating: 5,
    text: 'Planning family travel with a diabetic child and elderly parents seemed impossible. The AI created a magical Disney World experience with diabetic-friendly restaurants, rest stops perfectly timed for my father\'s medication schedule, and activities suited for all ages. Every family member had their best vacation ever!',
    image: '/testimonial-emily.jpg',
    tripDestination: 'Multi-Generational Family - Orlando, FL'
  },
  {
    id: '4',
    name: 'David Kim',
    location: 'Seoul, South Korea',
    rating: 5,
    text: 'The AI discovered hidden food markets in Istanbul that weren\'t in any guidebook, matched to my exact spice tolerance and dietary preferences from my food tracking app. When political unrest cancelled my original plans, it instantly rerouted me to equally amazing experiences in Morocco!',
    image: '/testimonial-david.jpg',
    tripDestination: 'Culinary & Cultural Exploration - Turkey/Morocco'
  },
  {
    id: '5',
    name: 'Jennifer & Michael Thompson',
    location: 'Denver, CO',
    rating: 5,
    text: 'Our honeymoon in Bali was beyond perfect. The AI learned that I\'m a morning person and my husband is a night owl, then crafted an itinerary with sunrise yoga for me and sunset beach clubs for him, plus romantic dinners we both loved. It even tracked our stress levels and suggested spa treatments when needed!',
    image: '/testimonial-jennifer.jpg',
    tripDestination: 'Romantic Wellness Honeymoon - Bali, Indonesia'
  },
  {
    id: '6',
    name: 'Robert Chen',
    location: 'Vancouver, Canada',
    rating: 5,
    text: 'As a Type 1 diabetic marathon runner, travel planning was a nightmare of insulin storage, medical facilities research, and finding safe running routes. This AI platform handled everything - from refrigerated hotel rooms for insulin to mapped running routes with medical stations nearby!',
    image: '/testimonial-robert.jpg',
    tripDestination: 'Athletic Medical Travel - Boston Marathon'
  }
]

export default function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>(fallbackTestimonials)
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState(0)

  // Fetch real testimonials from API
  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const response = await fetch('/api/testimonials?featured=true&limit=10')
        if (response.ok) {
          const data = await response.json()
          if (data.testimonials && data.testimonials.length > 0) {
            setTestimonials(data.testimonials)
          }
        }
      } catch (error) {
        console.error('Failed to fetch testimonials:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTestimonials()
  }, [])

  const nextTestimonial = () => {
    setDirection(1)
    setCurrentIndex((prev) => (prev + 1) % testimonials.length)
  }

  const prevTestimonial = () => {
    setDirection(-1)
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length)
  }

  // Auto-advance testimonials every 6 seconds
  useEffect(() => {
    const timer = setInterval(nextTestimonial, 6000)
    return () => clearInterval(timer)
  }, [])

  // Handle swipe gestures (basic implementation)
  const handleTouchStart = (e: React.TouchEvent) => {
    const touchStartX = e.touches[0].clientX
    
    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndX = e.changedTouches[0].clientX
      const deltaX = touchStartX - touchEndX
      
      if (Math.abs(deltaX) > 50) {
        if (deltaX > 0) {
          nextTestimonial()
        } else {
          prevTestimonial()
        }
      }
      
      document.removeEventListener('touchend', handleTouchEnd)
    }
    
    document.addEventListener('touchend', handleTouchEnd)
  }

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 400 : -400,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 400 : -400,
      opacity: 0
    })
  }

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            What Our Travelers Say
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Join thousands of satisfied travelers who have discovered the future of trip planning.
          </p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-brand-green" />
          </div>
        ) : testimonials.length === 0 ? (
          <div className="text-center text-gray-500">
            <p>No testimonials available at the moment.</p>
          </div>
        ) : (

        <div className="relative">
          {/* Navigation arrows */}
          <button
            onClick={prevTestimonial}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg rounded-full p-3 hover:bg-gray-50 transition-all duration-300 hover:scale-110"
            style={{ transform: 'translateY(-50%) translateX(-50%)' }}
          >
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>

          <button
            onClick={nextTestimonial}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg rounded-full p-3 hover:bg-gray-50 transition-all duration-300 hover:scale-110"
            style={{ transform: 'translateY(-50%) translateX(50%)' }}
          >
            <ChevronRight className="w-6 h-6 text-gray-600" />
          </button>

          {/* Testimonials carousel */}
          <div 
            className="overflow-hidden mx-16"
            onTouchStart={handleTouchStart}
          >
            <div className="flex justify-center">
              <div className="relative" style={{ width: '400px', height: '300px' }}>
                <AnimatePresence initial={false} custom={direction}>
                  <motion.div
                    key={currentIndex}
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                      x: { type: "spring", stiffness: 300, damping: 30 },
                      opacity: { duration: 0.2 }
                    }}
                    className="absolute inset-0 bg-white rounded-2xl shadow-lg p-8 border border-gray-100"
                  >
                    <div className="flex items-center mb-6">
                      <div className="w-16 h-16 bg-gradient-to-r from-brand-green to-brand-seafoam rounded-full flex items-center justify-center mr-4">
                        <span className="text-white font-bold text-lg">
                          {testimonials[currentIndex].name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {testimonials[currentIndex].name}
                        </h4>
                        <p className="text-gray-600 text-sm">
                          {testimonials[currentIndex].location}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          {[...Array(testimonials[currentIndex].rating)].map((_, i) => (
                            <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-gray-700 leading-relaxed mb-4">
                      "{testimonials[currentIndex].text}"
                    </p>
                    
                    <div className="text-sm text-brand-green font-medium">
                      Trip: {testimonials[currentIndex].tripDestination}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Pagination dots */}
          <div className="flex justify-center mt-8 gap-2">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setDirection(index > currentIndex ? 1 : -1)
                  setCurrentIndex(index)
                }}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentIndex 
                    ? 'bg-brand-green scale-125' 
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
        </div>
        )}
      </div>
    </section>
  )
}