'use client'

import { useState } from 'react'
import { X, Plane, Hotel, MapPin, Clock, Star, Users, DollarSign, Check, ExternalLink, Download } from 'lucide-react'

interface FlightResult {
  id: string
  airline: string
  flightNumber: string
  departure: { airport: string; time: string }
  arrival: { airport: string; time: string }
  duration: string
  layovers: Array<{ airport: string; duration: string }>
  price: { amount: number; currency: string }
  amenities: string[]
  score: number
}

interface HotelResult {
  id: string
  name: string
  starRating: number
  address: string
  amenities: string[]
  rooms: Array<{
    type: string
    description: string
    price: { amount: number; currency: string; perNight: boolean }
    available: number
  }>
  location: {
    type: string
    nearbyAttractions: string[]
  }
  reviews: {
    overall: number
    count: number
  }
  score: number
}

interface TravelPlan {
  destination: string
  origin?: string
  dates?: { checkIn: string; checkOut: string }
  travelers?: number
  budget?: number
  duration?: number
  preferences?: string
  flights?: FlightResult[]
  hotels?: HotelResult[]
}

interface PlanModalProps {
  isOpen: boolean
  onClose: () => void
  plan: TravelPlan
}

export default function PlanModal({ isOpen, onClose, plan }: PlanModalProps) {
  const [selectedFlight, setSelectedFlight] = useState<string | null>(null)
  const [selectedHotel, setSelectedHotel] = useState<string | null>(null)

  if (!isOpen) return null

  const { destination, origin, dates, travelers, budget, flights, hotels } = plan

  // Calculate costs
  const getSelectedFlightCost = () => {
    if (!flights || flights.length === 0) return 0
    const flight = selectedFlight ? flights.find(f => f.id === selectedFlight) : flights[0]
    return flight ? flight.price.amount * (travelers || 2) : 0
  }

  const getSelectedHotelCost = () => {
    if (!hotels || hotels.length === 0) return 0
    const hotel = selectedHotel ? hotels.find(h => h.id === selectedHotel) : hotels[0]
    if (!hotel) return 0
    const lowestPrice = Math.min(...hotel.rooms.map(room => room.price.amount))
    return lowestPrice * (plan.duration || 3)
  }

  const totalCost = getSelectedFlightCost() + getSelectedHotelCost()

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 z-10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <MapPin className="w-6 h-6" />
                  Your Travel Plan for {destination}
                </h2>
                <div className="flex items-center gap-4 mt-2 text-blue-100">
                  {dates && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {dates.checkIn} to {dates.checkOut}
                    </div>
                  )}
                  {travelers && (
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {travelers} {travelers === 1 ? 'traveler' : 'travelers'}
                    </div>
                  )}
                  {budget && (
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      Budget: £{budget}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-xl transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
            <div className="p-6 space-y-8">
              
              {/* Flights Section */}
              {flights && flights.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Plane className="w-5 h-5 text-blue-600" />
                    Flight Options {origin && `from ${origin}`}
                  </h3>
                  <div className="grid gap-4">
                    {flights.slice(0, 3).map((flight) => (
                      <div
                        key={flight.id}
                        className={`border rounded-xl p-4 cursor-pointer transition-all ${
                          selectedFlight === flight.id || (!selectedFlight && flights[0].id === flight.id)
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedFlight(flight.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 mb-2">
                              {flight.airline} {flight.flightNumber}
                            </div>
                            <div className="flex items-center text-gray-600 mb-2">
                              <span>{flight.departure.time} {flight.departure.airport}</span>
                              <div className="mx-3 flex-1 border-t border-gray-300 relative">
                                <Plane className="w-4 h-4 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white text-gray-400" />
                              </div>
                              <span>{flight.arrival.time} {flight.arrival.airport}</span>
                            </div>
                            <div className="text-sm text-gray-500">
                              Duration: {flight.duration}
                              {flight.layovers.length > 0 && (
                                <span className="ml-2">
                                  • Stops: {flight.layovers.map(l => `${l.airport} (${l.duration})`).join(', ')}
                                </span>
                              )}
                            </div>
                            {flight.amenities.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {flight.amenities.slice(0, 3).map((amenity, i) => (
                                  <span key={i} className="text-xs bg-gray-100 px-2 py-1 rounded">
                                    {amenity}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="text-right ml-6">
                            <div className="text-2xl font-bold text-gray-900">
                              £{flight.price.amount}
                            </div>
                            <div className="text-sm text-gray-500">per person</div>
                            <div className="text-sm font-medium text-blue-600 mt-1">
                              Total: £{flight.price.amount * (travelers || 2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hotels Section */}
              {hotels && hotels.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Hotel className="w-5 h-5 text-green-600" />
                    Hotel Recommendations
                  </h3>
                  <div className="grid gap-4 lg:grid-cols-2">
                    {hotels.slice(0, 3).map((hotel) => {
                      const lowestPrice = Math.min(...hotel.rooms.map(room => room.price.amount))
                      return (
                        <div
                          key={hotel.id}
                          className={`border rounded-xl p-4 cursor-pointer transition-all ${
                            selectedHotel === hotel.id || (!selectedHotel && hotels[0].id === hotel.id)
                              ? 'border-green-500 bg-green-50' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setSelectedHotel(hotel.id)}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900 mb-1">
                                {hotel.name}
                              </div>
                              <div className="flex items-center gap-2 mb-2">
                                <div className="flex">
                                  {[...Array(hotel.starRating)].map((_, i) => (
                                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                  ))}
                                </div>
                                <span className="text-sm text-gray-600">
                                  {hotel.reviews.overall}/10 ({hotel.reviews.count} reviews)
                                </span>
                              </div>
                              <div className="text-sm text-gray-600 mb-2">
                                {hotel.address}
                              </div>
                              {hotel.location.nearbyAttractions.length > 0 && (
                                <div className="text-sm text-gray-500 mb-2">
                                  Near: {hotel.location.nearbyAttractions.slice(0, 2).join(', ')}
                                </div>
                              )}
                              <div className="flex flex-wrap gap-1">
                                {hotel.amenities.slice(0, 4).map((amenity, i) => (
                                  <span key={i} className="text-xs bg-gray-100 px-2 py-1 rounded">
                                    {amenity}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <div className="text-xl font-bold text-gray-900">
                                £{lowestPrice}
                              </div>
                              <div className="text-sm text-gray-500">per night</div>
                              <div className="text-sm font-medium text-green-600 mt-1">
                                {plan.duration || 3} nights: £{lowestPrice * (plan.duration || 3)}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Cost Summary */}
              {flights && hotels && flights.length > 0 && hotels.length > 0 && (
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    Cost Summary
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Flights ({travelers || 2} travelers)</span>
                      <span className="font-semibold">£{getSelectedFlightCost()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Accommodation ({plan.duration || 3} nights)</span>
                      <span className="font-semibold">£{getSelectedHotelCost()}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
                      <span className="text-lg font-bold text-gray-900">Total Trip Cost</span>
                      <span className="text-2xl font-bold text-green-600">£{totalCost}</span>
                    </div>
                    {budget && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Your Budget: £{budget}</span>
                        <span className={`font-semibold ${totalCost <= budget ? 'text-green-600' : 'text-orange-600'}`}>
                          {totalCost <= budget ? (
                            <>
                              <Check className="w-4 h-4 inline mr-1" />
                              £{budget - totalCost} remaining
                            </>
                          ) : (
                            `£${totalCost - budget} over budget`
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6">
            <div className="flex gap-4 justify-end">
              <button
                onClick={onClose}
                className="px-6 py-3 text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                Close
              </button>
              <button className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export PDF
              </button>
              <button className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                Book Selected
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}