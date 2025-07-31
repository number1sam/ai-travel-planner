'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { FcGoogle } from 'react-icons/fc'
import { FaFacebook, FaApple } from 'react-icons/fa'
import { Loader2 } from 'lucide-react'

interface SocialLoginButtonsProps {
  callbackUrl?: string
  className?: string
}

export default function SocialLoginButtons({ 
  callbackUrl = '/dashboard',
  className = ''
}: SocialLoginButtonsProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSocialLogin = async (provider: string) => {
    try {
      setLoading(provider)
      setError(null)
      
      const result = await signIn(provider, {
        callbackUrl,
        redirect: true
      })

      if (result?.error) {
        setError(`Failed to sign in with ${provider}. Please try again.`)
        setLoading(null)
      }
    } catch (error) {
      console.error(`${provider} login error:`, error)
      setError(`An error occurred during ${provider} login. Please try again.`)
      setLoading(null)
    }
  }

  const socialProviders = [
    {
      name: 'google',
      label: 'Continue with Google',
      icon: FcGoogle,
      color: 'border-gray-300 hover:border-gray-400 hover:bg-gray-50',
      textColor: 'text-gray-700'
    },
    {
      name: 'facebook',
      label: 'Continue with Facebook',
      icon: FaFacebook,
      color: 'border-blue-600 bg-blue-600 hover:bg-blue-700',
      textColor: 'text-white'
    },
    {
      name: 'apple',
      label: 'Continue with Apple',
      icon: FaApple,
      color: 'border-black bg-black hover:bg-gray-800',
      textColor: 'text-white'
    }
  ]

  return (
    <div className={`space-y-3 ${className}`}>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg"
        >
          {error}
        </motion.div>
      )}

      {socialProviders.map((provider) => {
        const Icon = provider.icon
        const isLoading = loading === provider.name

        return (
          <motion.button
            key={provider.name}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleSocialLogin(provider.name)}
            disabled={loading !== null}
            className={`
              w-full flex items-center justify-center gap-3 px-4 py-3 
              border-2 rounded-lg font-medium transition-all duration-200
              ${provider.color} ${provider.textColor}
              disabled:opacity-50 disabled:cursor-not-allowed
              focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2
            `}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Icon className="w-5 h-5" />
            )}
            
            <span className="text-sm font-medium">
              {isLoading ? 'Signing in...' : provider.label}
            </span>
          </motion.button>
        )
      })}

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Or continue with email</span>
        </div>
      </div>
    </div>
  )
}

// Optional: Export individual social login button for custom layouts
export function GoogleLoginButton({ 
  callbackUrl = '/dashboard',
  className = '',
  size = 'default'
}: SocialLoginButtonsProps & { size?: 'small' | 'default' | 'large' }) {
  const [loading, setLoading] = useState(false)

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      await signIn('google', { callbackUrl })
    } catch (error) {
      console.error('Google login error:', error)
    } finally {
      setLoading(false)
    }
  }

  const sizeClasses = {
    small: 'px-3 py-2 text-sm',
    default: 'px-4 py-3 text-sm',
    large: 'px-6 py-4 text-base'
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleGoogleLogin}
      disabled={loading}
      className={`
        flex items-center justify-center gap-3 
        border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50
        rounded-lg font-medium transition-all duration-200 text-gray-700
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2
        ${sizeClasses[size]} ${className}
      `}
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <FcGoogle className="w-5 h-5" />
      )}
      
      <span>
        {loading ? 'Signing in...' : 'Continue with Google'}
      </span>
    </motion.button>
  )
}