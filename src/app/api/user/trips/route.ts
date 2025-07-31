import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET user trips
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const email = url.searchParams.get('email')
    
    if (!email) {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        trips: {
          orderBy: { createdAt: 'desc' },
          include: {
            itinerary: {
              include: {
                days: {
                  include: {
                    activities: true
                  },
                  orderBy: { dayNumber: 'asc' }
                }
              }
            }
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      trips: user.trips,
      totalTrips: user.trips.length
    })
  } catch (error) {
    console.error('Trips fetch error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST create new trip
export async function POST(request: NextRequest) {
  try {
    const { 
      email, 
      destination, 
      startDate, 
      endDate, 
      budget, 
      travelers, 
      preferences,
      itineraryData 
    } = await request.json()
    
    if (!email || !destination) {
      return NextResponse.json(
        { message: 'Email and destination are required' },
        { status: 400 }
      )
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      )
    }

    // Create trip (simplified to match schema)
    const trip = await prisma.trip.create({
      data: {
        userId: user.id,
        destination,
        startDate: startDate ? new Date(startDate) : new Date(), // Required field
        endDate: endDate ? new Date(endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Required field - default to 7 days later
        totalCost: budget || 0, // Schema uses totalCost, not budget
        status: 'planned',
        flightDetails: itineraryData?.flightInfo || null,
        hotelDetails: itineraryData?.hotel || null,
        metadata: {
          preferences: preferences || {},
          travelers: travelers || 1,
          itineraryData: itineraryData || null
        }
      }
    })

    // Create activities separately if provided
    if (itineraryData?.days && itineraryData.days.length > 0) {
      const activitiesToCreate = []
      
      for (const day of itineraryData.days) {
        if (day.activities && day.activities.length > 0) {
          for (const activity of day.activities) {
            activitiesToCreate.push({
              tripId: trip.id,
              name: activity.name || activity.title || 'Activity',
              type: activity.type || 'activity',
              date: day.date ? new Date(day.date) : new Date(),
              time: activity.time || '10:00',
              duration: activity.duration || 60,
              location: activity.location || 'Location TBD',
              description: activity.description || '',
              price: activity.cost || activity.price || 0,
              healthTip: activity.healthTip || null
            })
          }
        }
      }

      if (activitiesToCreate.length > 0) {
        await prisma.activity.createMany({
          data: activitiesToCreate
        })
      }
    }

    return NextResponse.json({
      message: 'Trip saved successfully',
      trip
    })
  } catch (error) {
    console.error('Trip creation error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT update existing trip
export async function PUT(request: NextRequest) {
  try {
    const { tripId, email, ...updateData } = await request.json()
    
    if (!tripId || !email) {
      return NextResponse.json(
        { message: 'Trip ID and email are required' },
        { status: 400 }
      )
    }

    // Verify user owns this trip
    const trip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        user: { email }
      }
    })

    if (!trip) {
      return NextResponse.json(
        { message: 'Trip not found or access denied' },
        { status: 404 }
      )
    }

    // Update trip
    const updatedTrip = await prisma.trip.update({
      where: { id: tripId },
      data: updateData,
      include: {
        itinerary: {
          include: {
            days: {
              include: {
                activities: true
              },
              orderBy: { dayNumber: 'asc' }
            }
          }
        }
      }
    })

    return NextResponse.json({
      message: 'Trip updated successfully',
      trip: updatedTrip
    })
  } catch (error) {
    console.error('Trip update error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}