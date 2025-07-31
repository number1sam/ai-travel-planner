'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react'
import SocialLoginButtons from '@/components/auth/SocialLoginButtons'

const signupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .refine((password) => {
      const hasLowercase = /[a-z]/.test(password)
      const hasUppercase = /[A-Z]/.test(password)
      const hasNumber = /\d/.test(password)
      const hasSymbol = /[@$!%*?&]/.test(password)
      return hasLowercase && hasUppercase && hasNumber && hasSymbol
    }, 'Password must contain uppercase, lowercase, number, and symbol'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required')
})

type SignupForm = z.infer<typeof signupSchema>
type LoginForm = z.infer<typeof loginSchema>

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const signupForm = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    mode: 'onChange'
  })

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange'
  })

  const currentForm = isLogin ? loginForm : signupForm
  const router = useRouter()

  const onSubmit = async (data: SignupForm | LoginForm) => {
    setIsLoading(true)
    setError('')

    try {
      if (isLogin) {
        // Actual login with database verification
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: data.email,
            password: data.password
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Login failed')
        }

        const { user } = await response.json()
        
        // Store user session info
        localStorage.setItem('user', JSON.stringify({
          id: user.id,
          email: user.email,
          name: user.name,
          subscriptionTier: user.subscriptionTier
        }))
        
        // 🔀 UPDATED NAVIGATION - Redirect to /home instead of dashboard
        router.push('/home')
        return
      } else {
        // Handle signup
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Signup failed')
        }

        // After successful signup, automatically sign in
        const loginResult = await signIn('credentials', {
          email: data.email,
          password: data.password,
          redirect: false
        })

        if (loginResult?.ok) {
          // 🔀 UPDATED NAVIGATION - Redirect to /home instead of dashboard
          router.push('/home')
        }
      }
      
      // 🔀 UPDATED NAVIGATION - Redirect to /home instead of dashboard
      window.location.href = '/home'
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
      // Add shake animation to form
      const formElement = document.getElementById('auth-form')
      if (formElement) {
        formElement.style.animation = 'shake 0.5s ease-in-out'
        setTimeout(() => {
          formElement.style.animation = ''
        }, 500)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    setIsLoading(true)
    try {
      // Redirect to OAuth provider
      window.location.href = `/api/auth/${provider}`
    } catch (err) {
      setError('Social login failed')
      setIsLoading(false)
    }
  }

  const handleForgotPassword = () => {
    window.location.href = '/forgot-password'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md"
        style={{ 
          width: '500px', 
          minHeight: '640px',
          borderRadius: '28px',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.12)'
        }}
      >
        <div className="text-center mb-8">
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-3xl font-bold text-gray-900 mb-4"
            style={{ fontSize: '32px' }}
          >
            {isLogin ? 'Welcome Back' : 'Create Your Account'}
          </motion.h1>
          <p className="text-gray-600">
            {isLogin 
              ? 'Sign in to continue your travel planning journey'
              : 'Join thousands planning smarter, healthier trips'
            }
          </p>
        </div>

        {/* Social Login Buttons */}
        <SocialLoginButtons callbackUrl="/home" />

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm"
          >
            {error}
          </motion.div>
        )}

        {/* Form */}
        <form
          id="auth-form"
          onSubmit={currentForm.handleSubmit(onSubmit)}
          className="space-y-4"
        >
          {/* Email Field */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                {...currentForm.register('email')}
                type="email"
                placeholder="Enter your email"
                className="w-full h-12 pl-10 pr-4 border-2 border-gray-200 rounded-xl focus:border-brand-green focus:outline-none transition-colors duration-300"
                style={{ height: '50px' }}
              />
            </div>
            {currentForm.formState.errors.email && (
              <p className="mt-1 text-sm text-red-600">
                {currentForm.formState.errors.email.message}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                {...currentForm.register('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                className="w-full h-12 pl-10 pr-12 border-2 border-gray-200 rounded-xl focus:border-brand-green focus:outline-none transition-colors duration-300"
                style={{ height: '50px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {currentForm.formState.errors.password && (
              <p className="mt-1 text-sm text-red-600">
                {currentForm.formState.errors.password.message}
              </p>
            )}
          </div>

          {/* Confirm Password Field (Signup only) */}
          {!isLogin && (
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  {...signupForm.register('confirmPassword')}
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  className="w-full h-12 pl-10 pr-12 border-2 border-gray-200 rounded-xl focus:border-brand-green focus:outline-none transition-colors duration-300"
                  style={{ height: '50px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {signupForm.formState.errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">
                  {signupForm.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>
          )}

          {/* Submit Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-gradient-to-r from-brand-green to-brand-seafoam text-white font-semibold rounded-xl hover:opacity-90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              isLogin ? 'Sign In' : 'Create Account'
            )}
          </motion.button>
        </form>

        {/* Forgot Password (Login only) */}
        {isLogin && (
          <div className="mt-4 text-center">
            <button
              onClick={handleForgotPassword}
              className="text-brand-green hover:text-brand-seafoam font-medium transition-colors duration-300"
            >
              Forgot Password?
            </button>
          </div>
        )}

        {/* Toggle Login/Signup */}
        <div className="mt-6 text-center">
          <p className="text-gray-600">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => {
                setIsLogin(!isLogin)
                setError('')
                currentForm.reset()
              }}
              className="text-brand-green hover:text-brand-seafoam font-semibold transition-colors duration-300"
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </motion.div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  )
}