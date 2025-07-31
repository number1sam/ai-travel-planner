import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const [
      totalUsers,
      activeUsers,
      totalTrips,
      completedTrips,
      totalTestimonials,
      avgRating,
      totalDestinations
    ] = await Promise.all([
      // Total users
      prisma.user.count({
        where: {
          deletedAt: null
        }
      }),
      
      // Active users (logged in within last 30 days)
      prisma.user.count({
        where: {
          lastLogin: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          },
          deletedAt: null
        }
      }),
      
      // Total trips
      prisma.trip.count(),
      
      // Completed trips
      prisma.trip.count({
        where: {
          status: 'completed'
        }
      }),
      
      // Total testimonials
      prisma.testimonial.count({
        where: {
          verified: true
        }
      }),
      
      // Average rating
      prisma.testimonial.aggregate({
        where: {
          verified: true
        },
        _avg: {
          rating: true
        }
      }),
      
      // Unique destinations
      prisma.trip.findMany({
        select: {
          destination: true
        },
        distinct: ['destination']
      })
    ])

    return NextResponse.json({
      users: {
        total: totalUsers,
        active: activeUsers
      },
      trips: {
        total: totalTrips,
        completed: completedTrips,
        destinations: totalDestinations.length
      },
      testimonials: {
        total: totalTestimonials,
        averageRating: avgRating._avg.rating || 0
      },
      stats: {
        satisfactionRate: avgRating._avg.rating ? (avgRating._avg.rating / 5) * 100 : 0,
        tripCompletionRate: totalTrips > 0 ? (completedTrips / totalTrips) * 100 : 0
      }
    })
  } catch (error) {
    console.error('Failed to fetch stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}