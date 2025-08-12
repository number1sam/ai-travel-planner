'use client'

import BackToHomeButton from '@/components/BackToHomeButton'

export default function FullPlannerPage() {
  return (
    <div className="min-h-screen">
      <BackToHomeButton />
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-white mb-6 drop-shadow-lg">Full AI Travel Planner</h1>
        <p className="text-white mb-8 drop-shadow-md">This would contain the complete planner functionality.</p>
        <div className="bg-white bg-opacity-95 backdrop-filter backdrop-blur-lg rounded-lg shadow-lg p-6 border border-white border-opacity-30">
          <p className="text-center text-gray-600">Full planner implementation coming soon...</p>
        </div>
      </div>
    </div>
  )
}