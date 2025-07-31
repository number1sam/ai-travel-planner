import { NextRequest, NextResponse } from 'next/server'
import { realtimeSyncService } from '@/services/RealtimeSyncService'
import { verifyAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request)
    if (!auth.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const channel = searchParams.get('channel')

    switch (action) {
      case 'status':
        const status = {
          connected: true,
          channels: Array.from(realtimeSyncService['channels'].keys()),
          timestamp: new Date()
        }
        return NextResponse.json(status)

      case 'cache-stats':
        const cacheStats = realtimeSyncService['cacheMetrics']
        return NextResponse.json(Object.fromEntries(cacheStats))

      case 'warm-cache':
        if (!channel) {
          return NextResponse.json({ error: 'Channel required' }, { status: 400 })
        }
        await realtimeSyncService.warmCache(auth.userId, { channel })
        return NextResponse.json({ success: true })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Sync API error:', error)
    return NextResponse.json(
      { error: 'Failed to process sync request' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request)
    if (!auth.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, key, data, strategy } = body

    switch (action) {
      case 'cache-data':
        if (!key || !data || !strategy) {
          return NextResponse.json(
            { error: 'Key, data, and strategy are required' },
            { status: 400 }
          )
        }
        await realtimeSyncService.cacheData(key, data, strategy)
        return NextResponse.json({ success: true })

      case 'get-cached':
        if (!key || !strategy) {
          return NextResponse.json(
            { error: 'Key and strategy are required' },
            { status: 400 }
          )
        }
        const cachedData = await realtimeSyncService.getCachedData(key, strategy)
        return NextResponse.json({ 
          success: true, 
          data: cachedData,
          cached: cachedData !== null
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Sync POST API error:', error)
    return NextResponse.json(
      { error: 'Failed to process sync request' },
      { status: 500 }
    )
  }
}