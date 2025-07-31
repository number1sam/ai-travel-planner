'use client'

import { motion } from 'framer-motion'
import { Twitter, Instagram, Linkedin, Mail, Phone, MapPin } from 'lucide-react'

export default function Footer() {
  const socialLinks = [
    { 
      name: 'Twitter', 
      icon: Twitter, 
      url: 'https://twitter.com/aitravelplanner',
      hoverColor: 'hover:bg-blue-400'
    },
    { 
      name: 'Instagram', 
      icon: Instagram, 
      url: 'https://instagram.com/aitravelplanner',
      hoverColor: 'hover:bg-pink-400'
    },
    { 
      name: 'LinkedIn', 
      icon: Linkedin, 
      url: 'https://linkedin.com/company/aitravelplanner',
      hoverColor: 'hover:bg-blue-600'
    }
  ]

  const footerLinks = [
    { name: 'About', href: '/about' },
    { name: 'Privacy Policy', href: '/privacy' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'Contact Us', href: '/contact' }
  ]

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="md:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <h3 className="text-2xl font-bold bg-gradient-to-r from-brand-green to-brand-seafoam bg-clip-text text-transparent mb-4">
                AI Travel & Health Planner
              </h3>
              <p className="text-gray-300 leading-relaxed mb-6 max-w-md">
                Your personal AI concierge for intelligent travel planning that prioritizes your health, 
                preferences, and peace of mind. Experience the future of travel today.
              </p>
              <div className="space-y-2 text-gray-300">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4" />
                  <span>support@aitravelplanner.com</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4" />
                  <span>+1 (555) 123-4567</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4" />
                  <span>San Francisco, CA</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Quick Links */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <nav className="space-y-3">
                {footerLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    className="block text-gray-300 hover:text-brand-seafoam transition-colors duration-300"
                  >
                    {link.name}
                  </a>
                ))}
              </nav>
            </motion.div>
          </div>

          {/* Newsletter & Social */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
            >
              <h4 className="text-lg font-semibold mb-4">Stay Connected</h4>
              <p className="text-gray-300 mb-4 text-sm">
                Get travel tips, health insights, and platform updates.
              </p>
              
              {/* Newsletter signup */}
              <div className="mb-6">
                <div className="flex">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-l-lg focus:outline-none focus:border-brand-green text-white"
                  />
                  <button className="bg-gradient-to-r from-brand-green to-brand-seafoam px-4 py-2 rounded-r-lg hover:opacity-90 transition-opacity duration-300">
                    Subscribe
                  </button>
                </div>
              </div>

              {/* Social links */}
              <div className="flex gap-3">
                {socialLinks.map((social) => (
                  <motion.a
                    key={social.name}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className={`w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-gray-300 hover:text-white transition-all duration-300 ${social.hoverColor}`}
                  >
                    <social.icon className="w-5 h-5" />
                  </motion.a>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Bottom bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          viewport={{ once: true }}
          className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4"
        >
          <p className="text-gray-400 text-sm">
            © 2024 AI Travel & Health Planner. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-gray-400">
            <a href="/terms" className="hover:text-brand-seafoam transition-colors duration-300">
              Terms of Service
            </a>
            <a href="/cookies" className="hover:text-brand-seafoam transition-colors duration-300">
              Cookie Policy
            </a>
            <a href="/accessibility" className="hover:text-brand-seafoam transition-colors duration-300">
              Accessibility
            </a>
          </div>
        </motion.div>
      </div>
    </footer>
  )
}