'use client'

// Simple, working planner page using the new intelligent system
// No complex imports that could cause "missing error components"

import PlanForm from '@/components/PlanForm'

export default function PlannerPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            AI Travel Planner
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Plan your perfect trip with structured guidance and intelligent destination research.
          </p>
          <div className="mt-4 flex items-center justify-center gap-4 text-sm">
            <div className="flex items-center gap-1 text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Structured Q&A Flow</span>
            </div>
            <div className="flex items-center gap-1 text-blue-600">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Web Research for Small Towns</span>
            </div>
            <div className="flex items-center gap-1 text-purple-600">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>Full Context Memory</span>
            </div>
          </div>
        </div>
        
        <PlanForm />
      </div>
    </div>
  )
}