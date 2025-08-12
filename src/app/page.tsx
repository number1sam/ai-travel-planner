import HeroSection from '@/components/HeroSection'
import Link from 'next/link'

export default function HomePage() {
  return (
    <main>
      <HeroSection />
      
      {/* Features Section */}
      <section id="features" className="py-20 relative">
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6 drop-shadow-lg">
              Professional Travel Planning Suite
            </h2>
            <p className="text-xl text-white max-w-3xl mx-auto font-medium drop-shadow-md">
              Advanced AI-powered tools for intelligent travel planning and health-conscious recommendations
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="text-center p-6 bg-white bg-opacity-90 backdrop-filter backdrop-blur-lg rounded-xl hover:shadow-lg transition-all transform hover:scale-105 border border-white border-opacity-30">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Smart Recommendations</h3>
              <p className="text-gray-700 leading-relaxed">
                AI-powered destination and accommodation suggestions based on your health needs and preferences.
              </p>
            </div>

            <div className="text-center p-6 bg-white bg-opacity-90 backdrop-filter backdrop-blur-lg rounded-xl hover:shadow-lg transition-all transform hover:scale-105 border border-white border-opacity-30">
              <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-2xl">💰</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Real-Time Pricing</h3>
              <p className="text-gray-700 leading-relaxed">
                Accurate, up-to-date prices in multiple currencies from verified travel providers.
              </p>
            </div>

            <div className="text-center p-6 bg-white bg-opacity-90 backdrop-filter backdrop-blur-lg rounded-xl hover:shadow-lg transition-all transform hover:scale-105 border border-white border-opacity-30">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Instant Planning</h3>
              <p className="text-gray-700 leading-relaxed">
                Generate comprehensive travel itineraries in minutes with health and accessibility considerations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-black bg-opacity-30"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid md:grid-cols-4 gap-6 text-center">
            <div className="bg-white bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl p-4 border border-white border-opacity-30">
              <div className="text-3xl font-bold text-white mb-2 drop-shadow-lg">50K+</div>
              <div className="text-white text-sm drop-shadow-md">Satisfied Travelers</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl p-4 border border-white border-opacity-30">
              <div className="text-3xl font-bold text-white mb-2 drop-shadow-lg">180+</div>
              <div className="text-white text-sm drop-shadow-md">Countries Covered</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl p-4 border border-white border-opacity-30">
              <div className="text-3xl font-bold text-white mb-2 drop-shadow-lg">99%</div>
              <div className="text-white text-sm drop-shadow-md">Success Rate</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl p-4 border border-white border-opacity-30">
              <div className="text-3xl font-bold text-white mb-2 drop-shadow-lg">24/7</div>
              <div className="text-white text-sm drop-shadow-md">AI Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* Planning Tools Section */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4 drop-shadow-lg">
              Choose Your Planning Experience
            </h2>
            <p className="text-lg text-white max-w-2xl mx-auto drop-shadow-md">
              Professional-grade planning tools designed for different use cases
            </p>
          </div>

          <div className="flex justify-center max-w-md mx-auto">
            <Link href="/smart-planner" className="block group w-full">
              <div className="bg-white bg-opacity-90 backdrop-filter backdrop-blur-lg p-6 rounded-lg shadow-md hover:shadow-xl transition-all border border-white border-opacity-30 group-hover:scale-105">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-200 transition-colors">
                  <span className="text-lg">🧠</span>
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2 text-center">Smart Planner</h4>
                <p className="text-sm text-gray-600 text-center">AI-powered trip planning with intelligent conversation flow</p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-black bg-opacity-60"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center">
            <h3 className="text-3xl font-bold mb-4 drop-shadow-lg">Ready to Experience Professional Travel Planning?</h3>
            <p className="text-gray-200 mb-8 text-lg drop-shadow-md">Join professionals who trust our AI-powered platform</p>
          </div>
        </div>
      </footer>
    </main>
  )
}