import { NextRequest, NextResponse } from 'next/server'
import { orchestrator } from '@/services/MicroservicesOrchestrator'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'status':
        const status = orchestrator.getStatus()
        return NextResponse.json(status)

      case 'metrics':
        // Get detailed metrics from Redis
        const metrics = await getDetailedMetrics()
        return NextResponse.json(metrics)

      case 'events':
        // Get recent orchestration events
        const events = await getRecentEvents()
        return NextResponse.json(events)

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Orchestrator API error:', error)
    return NextResponse.json(
      { error: 'Failed to process orchestrator request' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, serviceId, instanceId, request: serviceRequest } = body

    switch (action) {
      case 'start-service':
        if (!serviceId) {
          return NextResponse.json({ error: 'Service ID required' }, { status: 400 })
        }
        const instance = await orchestrator.startService(serviceId)
        return NextResponse.json({ success: true, instance })

      case 'stop-instance':
        if (!serviceId || !instanceId) {
          return NextResponse.json({ error: 'Service ID and Instance ID required' }, { status: 400 })
        }
        await orchestrator.stopServiceInstance(serviceId, instanceId)
        return NextResponse.json({ success: true })

      case 'route-request':
        if (!serviceRequest) {
          return NextResponse.json({ error: 'Service request required' }, { status: 400 })
        }
        const result = await orchestrator.routeRequest(serviceRequest)
        return NextResponse.json({ success: true, result })

      case 'scale':
        if (!serviceId) {
          return NextResponse.json({ error: 'Service ID required' }, { status: 400 })
        }
        const scaleAction = body.scaleAction || 'up'
        if (scaleAction === 'up') {
          await orchestrator.scaleUp(serviceId)
        } else {
          await orchestrator.scaleDown(serviceId)
        }
        return NextResponse.json({ success: true })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Orchestrator API error:', error)
    return NextResponse.json(
      { error: 'Failed to process orchestrator request' },
      { status: 500 }
    )
  }
}

async function getDetailedMetrics(): Promise<any> {
  // This would fetch from Redis or monitoring service
  return {
    timestamp: new Date(),
    services: {
      'flight-bot': {
        requestsPerMinute: 145,
        averageLatency: 234,
        errorRate: 0.02,
        saturation: 0.65
      },
      'hotel-bot': {
        requestsPerMinute: 98,
        averageLatency: 189,
        errorRate: 0.01,
        saturation: 0.45
      },
      'activity-bot': {
        requestsPerMinute: 267,
        averageLatency: 156,
        errorRate: 0.03,
        saturation: 0.78
      }
    },
    system: {
      totalRequests: 510,
      totalErrors: 12,
      averageLatency: 193,
      cpuUsage: 0.68,
      memoryUsage: 0.72
    }
  }
}

async function getRecentEvents(): Promise<any[]> {
  // This would fetch from event store
  return [
    {
      id: 'evt-1',
      type: 'service_scaled',
      service: 'activity-bot',
      action: 'scale_up',
      timestamp: new Date(Date.now() - 300000),
      reason: 'High CPU usage (85%)'
    },
    {
      id: 'evt-2',
      type: 'circuit_breaker_open',
      service: 'flight-bot',
      timestamp: new Date(Date.now() - 600000),
      reason: 'Error rate exceeded threshold (45%)'
    },
    {
      id: 'evt-3',
      type: 'health_check_failed',
      service: 'hotel-bot',
      instance: 'hotel-bot-a1b2c3',
      timestamp: new Date(Date.now() - 900000),
      reason: 'Connection timeout'
    }
  ]
}