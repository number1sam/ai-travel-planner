import { NextRequest, NextResponse } from 'next/server'
import { HealthCompanionService } from '@/services/HealthCompanionService'
import { verifyAuth } from '@/lib/auth'

const healthCompanion = new HealthCompanionService()

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request)
    if (!auth.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const deviceType = searchParams.get('deviceType')

    switch (action) {
      case 'sync-status':
        const syncStatus = await healthCompanion.getSyncStatus(auth.userId)
        return NextResponse.json({ success: true, data: syncStatus })

      case 'health-insights':
        const insights = await healthCompanion.generateHealthInsights(auth.userId)
        return NextResponse.json({ success: true, data: insights })

      case 'travel-readiness':
        const readiness = await healthCompanion.assessTravelReadiness(auth.userId)
        return NextResponse.json({ success: true, data: readiness })

      case 'device-compatibility':
        if (!deviceType) {
          return NextResponse.json({ error: 'Device type required' }, { status: 400 })
        }
        const compatibility = await healthCompanion.checkDeviceCompatibility(deviceType)
        return NextResponse.json({ success: true, data: compatibility })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Health Companion API error:', error)
    return NextResponse.json(
      { error: 'Failed to process health companion request' },
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
    const { action, ...data } = body

    switch (action) {
      case 'connect-device':
        const { deviceType, credentials } = data
        if (!deviceType || !credentials) {
          return NextResponse.json(
            { error: 'Device type and credentials are required' },
            { status: 400 }
          )
        }

        const connectionResult = await healthCompanion.connectDevice(auth.userId, deviceType, credentials)
        return NextResponse.json({ success: true, data: connectionResult })

      case 'sync-data':
        const { forceSync } = data
        const syncResult = await healthCompanion.syncHealthData(auth.userId, forceSync)
        return NextResponse.json({ success: true, data: syncResult })

      case 'set-health-goals':
        const { goals } = data
        if (!goals) {
          return NextResponse.json(
            { error: 'Health goals are required' },
            { status: 400 }
          )
        }

        await healthCompanion.setHealthGoals(auth.userId, goals)
        return NextResponse.json({ success: true })

      case 'log-manual-data':
        const { metrics } = data
        if (!metrics) {
          return NextResponse.json(
            { error: 'Health metrics are required' },
            { status: 400 }
          )
        }

        await healthCompanion.logManualHealthData(auth.userId, metrics)
        return NextResponse.json({ success: true })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Health Companion POST API error:', error)
    return NextResponse.json(
      { error: 'Failed to process health companion request' },
      { status: 500 }
    )
  }
}