import { NextRequest, NextResponse } from 'next/server'
import { aiRankingService } from '@/services/AIRankingService'
import { verifyAuth } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request)
    if (!auth.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, ...data } = body

    switch (action) {
      case 'rank-items':
        const { items, itemType, constraints } = data
        if (!items || !itemType) {
          return NextResponse.json(
            { error: 'Items and itemType are required' },
            { status: 400 }
          )
        }

        const rankingContext = {
          userId: auth.userId,
          userProfile: await getUserProfile(auth.userId),
          items,
          itemType,
          constraints
        }

        const rankedItems = await aiRankingService.rankItems(rankingContext)
        return NextResponse.json({ success: true, data: rankedItems })

      case 'optimize-itinerary':
        const { itinerary, objectives, optimizationConstraints } = data
        if (!itinerary || !objectives) {
          return NextResponse.json(
            { error: 'Itinerary and objectives are required' },
            { status: 400 }
          )
        }

        const optimizationContext = {
          userId: auth.userId,
          itinerary,
          objectives,
          constraints: optimizationConstraints || []
        }

        const optimizedItinerary = await aiRankingService.optimizeItinerary(optimizationContext)
        return NextResponse.json({ success: true, data: optimizedItinerary })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('AI Ranking API error:', error)
    return NextResponse.json(
      { error: 'Failed to process ranking request' },
      { status: 500 }
    )
  }
}

async function getUserProfile(userId: string) {
  // Implementation would fetch user profile from database
  return { preferences: {}, behavioralPatterns: {} }
}