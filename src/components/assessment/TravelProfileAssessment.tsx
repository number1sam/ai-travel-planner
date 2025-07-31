'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Check, User, MapPin, Heart, DollarSign, Utensils, Bed } from 'lucide-react'

interface AssessmentQuestion {
  id: string
  title: string
  description: string
  type: 'single' | 'multiple' | 'scale' | 'text'
  icon: React.ComponentType<any>
  options?: {
    value: string
    label: string
    description?: string
    icon?: React.ComponentType<any>
  }[]
  required: boolean
}

interface AssessmentData {
  travelPace: string
  budgetRange: string
  accommodationType: string
  dietaryPreferences: string[]
  fitnessLevel: string
  healthGoals: string[]
  interests: string[]
  travelStyle: string
  mobilityNeeds: string[]
  preferredActivities: string[]
}

const assessmentQuestions: AssessmentQuestion[] = [
  {
    id: 'travel_pace',
    title: "What's your preferred travel pace?",
    description: 'This helps us plan the right amount of activities for each day',
    type: 'single',
    icon: MapPin,
    options: [
      {
        value: 'relaxed',
        label: 'Relaxed',
        description: '2-3 activities per day with plenty of free time'
      },
      {
        value: 'balanced',
        label: 'Balanced',
        description: '4-5 activities per day with moderate breaks'
      },
      {
        value: 'fast_paced',
        label: 'Fast-Paced',
        description: '6+ activities per day, maximize every moment'
      }
    ],
    required: true
  },
  {
    id: 'budget_range',
    title: 'What is your typical trip budget?',
    description: 'Per person, including flights, accommodation, and activities',
    type: 'single',
    icon: DollarSign,
    options: [
      { value: 'budget', label: 'Budget-Friendly', description: '£500 - £1,000' },
      { value: 'moderate', label: 'Moderate', description: '£1,000 - £2,500' },
      { value: 'comfortable', label: 'Comfortable', description: '£2,500 - £5,000' },
      { value: 'luxury', label: 'Luxury', description: '£5,000+' }
    ],
    required: true
  },
  {
    id: 'accommodation_type',
    title: 'What type of accommodation do you prefer?',
    description: 'This affects our hotel and location recommendations',
    type: 'single',
    icon: Bed,
    options: [
      { value: 'budget_hotel', label: 'Budget Hotel', description: '2-3 star hotels, clean and functional' },
      { value: 'mid_range', label: 'Mid-Range Hotel', description: '3-4 star hotels with good amenities' },
      { value: 'luxury_hotel', label: 'Luxury Hotel', description: '4-5 star hotels with premium services' },
      { value: 'boutique', label: 'Boutique/Unique', description: 'Unique properties with character' }
    ],
    required: true
  },
  {
    id: 'dietary_preferences',
    title: 'Do you have any dietary preferences or restrictions?',
    description: 'We'll ensure restaurant recommendations match your needs',
    type: 'multiple',
    icon: Utensils,
    options: [
      { value: 'none', label: 'No restrictions' },
      { value: 'vegetarian', label: 'Vegetarian' },
      { value: 'vegan', label: 'Vegan' },
      { value: 'gluten_free', label: 'Gluten-free' },
      { value: 'halal', label: 'Halal' },
      { value: 'kosher', label: 'Kosher' },
      { value: 'dairy_free', label: 'Dairy-free' },
      { value: 'nut_allergy', label: 'Nut allergy' }
    ],
    required: false
  },
  {
    id: 'fitness_level',
    title: 'How would you describe your fitness level?',
    description: 'This helps us recommend appropriate physical activities',
    type: 'single',
    icon: Heart,
    options: [
      { value: 'low', label: 'Low Activity', description: 'Prefer minimal walking, comfortable pace' },
      { value: 'moderate', label: 'Moderate Activity', description: 'Comfortable with 3-5km walking per day' },
      { value: 'active', label: 'Active', description: 'Enjoy 5-10km walking, light hiking' },
      { value: 'very_active', label: 'Very Active', description: 'Love hiking, cycling, adventure sports' }
    ],
    required: true
  },
  {
    id: 'health_goals',
    title: 'What are your health and wellness goals while traveling?',
    description: 'We can incorporate wellness activities into your itinerary',
    type: 'multiple',
    icon: Heart,
    options: [
      { value: 'maintain_fitness', label: 'Maintain fitness routine' },
      { value: 'try_local_cuisine', label: 'Try healthy local cuisine' },
      { value: 'relaxation', label: 'Focus on relaxation and stress relief' },
      { value: 'adventure', label: 'Challenge myself with new activities' },
      { value: 'wellness_activities', label: 'Include spa/wellness activities' },
      { value: 'outdoor_time', label: 'Spend time outdoors in nature' }
    ],
    required: false
  },
  {
    id: 'interests',
    title: 'What are your main travel interests?',
    description: 'Select all that appeal to you - we\'ll prioritize these in your itinerary',
    type: 'multiple',
    icon: User,
    options: [
      { value: 'history', label: 'History & Museums' },
      { value: 'art', label: 'Art & Galleries' },
      { value: 'food', label: 'Food & Dining' },
      { value: 'nature', label: 'Nature & Parks' },
      { value: 'adventure', label: 'Adventure Sports' },
      { value: 'shopping', label: 'Shopping' },
      { value: 'nightlife', label: 'Nightlife & Entertainment' },
      { value: 'culture', label: 'Local Culture & Traditions' },
      { value: 'architecture', label: 'Architecture' },
      { value: 'photography', label: 'Photography' },
      { value: 'music', label: 'Music & Concerts' },
      { value: 'wellness', label: 'Wellness & Spa' }
    ],
    required: true
  },
  {
    id: 'mobility_needs',
    title: 'Do you have any mobility considerations?',
    description: 'This ensures we recommend accessible venues and activities',
    type: 'multiple',
    icon: Heart,
    options: [
      { value: 'none', label: 'No special requirements' },
      { value: 'wheelchair', label: 'Wheelchair accessibility needed' },
      { value: 'limited_walking', label: 'Limited walking ability' },
      { value: 'elevator_access', label: 'Prefer elevator access' },
      { value: 'ground_floor', label: 'Ground floor accommodation preferred' },
      { value: 'handrails', label: 'Need handrails/support' }
    ],
    required: false
  }
]

interface TravelProfileAssessmentProps {
  onComplete: (data: AssessmentData) => void
  onSkip?: () => void
  existingData?: Partial<AssessmentData>
}

export default function TravelProfileAssessment({ 
  onComplete, 
  onSkip, 
  existingData 
}: TravelProfileAssessmentProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [isCompleting, setIsCompleting] = useState(false)

  // Pre-populate with existing data
  useEffect(() => {
    if (existingData) {
      const mappedAnswers: Record<string, any> = {}
      
      if (existingData.travelPace) mappedAnswers.travel_pace = existingData.travelPace
      if (existingData.budgetRange) mappedAnswers.budget_range = existingData.budgetRange
      if (existingData.accommodationType) mappedAnswers.accommodation_type = existingData.accommodationType
      if (existingData.dietaryPreferences) mappedAnswers.dietary_preferences = existingData.dietaryPreferences
      if (existingData.interests) mappedAnswers.interests = existingData.interests
      if (existingData.healthGoals) mappedAnswers.health_goals = existingData.healthGoals
      if (existingData.mobilityNeeds) mappedAnswers.mobility_needs = existingData.mobilityNeeds

      setAnswers(mappedAnswers)
    }
  }, [existingData])

  const currentQ = assessmentQuestions[currentQuestion]
  const isLastQuestion = currentQuestion === assessmentQuestions.length - 1
  const canProceed = !currentQ.required || answers[currentQ.id]

  const handleAnswer = (questionId: string, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }))
  }

  const handleNext = () => {
    if (isLastQuestion) {
      handleComplete()
    } else {
      setCurrentQuestion(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1)
    }
  }

  const handleComplete = async () => {
    setIsCompleting(true)
    
    // Transform answers to expected format
    const assessmentData: AssessmentData = {
      travelPace: answers.travel_pace || 'balanced',
      budgetRange: answers.budget_range || 'moderate',
      accommodationType: answers.accommodation_type || 'mid_range',
      dietaryPreferences: answers.dietary_preferences || [],
      fitnessLevel: answers.fitness_level || 'moderate',
      healthGoals: answers.health_goals || [],
      interests: answers.interests || [],
      travelStyle: answers.travel_pace || 'balanced',
      mobilityNeeds: answers.mobility_needs || [],
      preferredActivities: answers.interests || []
    }

    // Save to backend
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(assessmentData)
      })

      if (response.ok) {
        onComplete(assessmentData)
      } else {
        console.error('Failed to save preferences')
        onComplete(assessmentData) // Still complete locally
      }
    } catch (error) {
      console.error('Error saving preferences:', error)
      onComplete(assessmentData)
    }
    
    setIsCompleting(false)
  }

  const renderQuestion = () => {
    const question = currentQ

    return (
      <motion.div
        key={question.id}
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-2xl mx-auto"
      >
        {/* Question Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-brand-green to-brand-seafoam rounded-2xl flex items-center justify-center mx-auto mb-4">
            <question.icon className="w-8 h-8 text-white" />
          </div>
          
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            {question.title}
          </h2>
          
          <p className="text-lg text-gray-600">
            {question.description}
          </p>
        </div>

        {/* Question Options */}
        <div className="space-y-4">
          {question.type === 'single' && question.options?.map((option) => (
            <motion.div
              key={option.value}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <label
                className={`block p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                  answers[question.id] === option.value
                    ? 'border-brand-green bg-green-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name={question.id}
                  value={option.value}
                  checked={answers[question.id] === option.value}
                  onChange={(e) => handleAnswer(question.id, e.target.value)}
                  className="sr-only"
                />
                
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-900 mb-1">
                      {option.label}
                    </div>
                    {option.description && (
                      <div className="text-sm text-gray-600">
                        {option.description}
                      </div>
                    )}
                  </div>
                  
                  {answers[question.id] === option.value && (
                    <div className="w-6 h-6 bg-brand-green rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              </label>
            </motion.div>
          ))}

          {question.type === 'multiple' && (
            <div className="grid grid-cols-2 gap-3">
              {question.options?.map((option) => {
                const isSelected = answers[question.id]?.includes(option.value) || false
                
                return (
                  <motion.div
                    key={option.value}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <label
                      className={`block p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 text-center ${
                        isSelected
                          ? 'border-brand-green bg-green-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        value={option.value}
                        checked={isSelected}
                        onChange={(e) => {
                          const currentValues = answers[question.id] || []
                          const newValues = e.target.checked
                            ? [...currentValues, option.value]
                            : currentValues.filter((v: string) => v !== option.value)
                          
                          handleAnswer(question.id, newValues)
                        }}
                        className="sr-only"
                      />
                      
                      <div className="font-medium text-gray-900 mb-1">
                        {option.label}
                      </div>
                      
                      {isSelected && (
                        <div className="w-5 h-5 bg-brand-green rounded-full flex items-center justify-center mx-auto mt-2">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </label>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </motion.div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Travel Profile Assessment
            </h1>
            
            {onSkip && (
              <button
                onClick={onSkip}
                className="text-gray-500 hover:text-gray-700 font-medium"
              >
                Skip for now
              </button>
            )}
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className="bg-gradient-to-r from-brand-green to-brand-seafoam h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${((currentQuestion + 1) / assessmentQuestions.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          
          <div className="flex justify-between text-sm text-gray-500 mt-2">
            <span>Question {currentQuestion + 1} of {assessmentQuestions.length}</span>
            <span>{Math.round(((currentQuestion + 1) / assessmentQuestions.length) * 100)}% complete</span>
          </div>
        </div>

        {/* Question Content */}
        <AnimatePresence mode="wait">
          {renderQuestion()}
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-12">
          <button
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            className="flex items-center gap-2 px-6 py-3 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Previous
          </button>

          <div className="text-sm text-gray-500">
            {currentQuestion + 1} / {assessmentQuestions.length}
          </div>

          <motion.button
            whileHover={{ scale: canProceed ? 1.05 : 1 }}
            whileTap={{ scale: canProceed ? 0.95 : 1 }}
            onClick={handleNext}
            disabled={!canProceed || isCompleting}
            className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-brand-green to-brand-seafoam text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
          >
            {isCompleting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : isLastQuestion ? (
              <>
                Complete Assessment
                <Check className="w-5 h-5" />
              </>
            ) : (
              <>
                Next
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  )
}