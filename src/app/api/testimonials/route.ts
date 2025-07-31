import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const featured = searchParams.get('featured') === 'true'
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where = {
      verified: true,
      ...(featured && { featured: true })
    }

    const [testimonials, total] = await Promise.all([
      prisma.testimonial.findMany({
        where,
        orderBy: [
          { featured: 'desc' },
          { createdAt: 'desc' }
        ],
        take: limit,
        skip: offset,
        select: {
          id: true,
          name: true,
          location: true,
          rating: true,
          text: true,
          tripDestination: true,
          image: true,
          createdAt: true,
          trip: {
            select: {
              destination: true,
              startDate: true,
              endDate: true
            }
          }
        }
      }),
      prisma.testimonial.count({ where })
    ])

    return NextResponse.json({
      testimonials,
      total,
      hasMore: offset + limit < total
    })
  } catch (error) {
    console.error('Failed to fetch testimonials:', error)
    return NextResponse.json(
      { error: 'Failed to fetch testimonials' },
      { status: 500 }
    )
  }
}