'use client'

import PlanForm from '@/components/PlanForm'

export default function SmartPlannerPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🧠 Smart Travel Planner
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            AI Travel Planner with web research capabilities. Ask for ANY destination - including small towns, villages, or hidden gems!
          </p>
          <div className="mt-4 text-sm text-green-600 font-medium">
            ✨ Now with intelligent conversation memory & web research
          </div>
        </div>
        
        <PlanForm />
      </div>
    </div>
  )
}