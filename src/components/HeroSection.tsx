'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Play, ArrowDown } from 'lucide-react'

export default function HeroSection() {
  const [isPlaying, setIsPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const handlePlayVideo = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handlePlanTrip = () => {
    // Always go to dashboard for now - will add auth check later
    window.location.href = '/dashboard'
  }

  const handleLearnMore = () => {
    const featuresSection = document.getElementById('features')
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden">
      {/* Video Background */}
      <div className="absolute inset-0 z-0">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          muted
          loop
          autoPlay
          playsInline
        >
          <source src="/hero-video.mp4" type="video/mp4" />
          {/* Fallback gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-teal-500 to-green-500" />
        </video>
        
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-black bg-opacity-40" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-6xl md:text-8xl font-bold mb-6"
          style={{ 
            fontSize: '68px',
            textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
            lineHeight: '1.1'
          }}
        >
          Your Personal AI Travel & Health Concierge
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-2xl md:text-3xl mb-12 text-gray-200"
          style={{ fontSize: '26px' }}
        >
          Effortlessly plan smarter trips tailored to your health, schedule, and preferences — all in minutes.
        </motion.p>

        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
          <motion.button
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            whileHover={{ scale: 1.04, boxShadow: '0 10px 40px rgba(14, 127, 118, 0.4)' }}
            whileTap={{ scale: 0.98 }}
            onClick={handlePlanTrip}
            className="bg-gradient-to-r from-brand-green to-brand-seafoam text-white font-semibold py-4 px-8 rounded-lg transition-all duration-300"
            style={{ width: '220px', height: '60px' }}
          >
            Plan My First Trip
          </motion.button>

          <motion.button
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            whileHover={{ 
              backgroundColor: 'rgba(14, 127, 118, 0.1)',
              borderColor: 'rgba(14, 127, 118, 0.8)'
            }}
            onClick={handleLearnMore}
            className="border-2 border-white border-opacity-60 text-white font-semibold py-4 px-8 rounded-lg transition-all duration-300 hover:bg-white hover:bg-opacity-10 flex items-center gap-2"
            style={{ width: '180px', height: '60px' }}
          >
            Learn More
            <ArrowDown className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Play button for video control */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1 }}
          onClick={handlePlayVideo}
          className="absolute bottom-8 right-8 bg-white bg-opacity-20 backdrop-blur-sm rounded-full p-3 hover:bg-opacity-30 transition-all duration-300"
        >
          <Play className={`w-6 h-6 ${isPlaying ? 'opacity-50' : 'opacity-100'}`} />
        </motion.button>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.2 }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ArrowDown className="w-6 h-6 opacity-60" />
        </motion.div>
      </motion.div>
    </section>
  )
}