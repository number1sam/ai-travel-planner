import { NextRequest, NextResponse } from 'next/server'
import { BackupService } from '@/services/BackupService'
import { verifyAuth } from '@/lib/auth'

const backupService = new BackupService()

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request)
    if (!auth.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow admin users to access backup operations
    if (!auth.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'status':
        const status = await backupService.getBackupStatus()
        return NextResponse.json({ success: true, data: status })

      case 'history':
        const limit = parseInt(searchParams.get('limit') || '10')
        const history = await backupService.getBackupHistory(limit)
        return NextResponse.json({ success: true, data: history })

      case 'failover-status':
        const failoverStatus = await backupService.getFailoverStatus()
        return NextResponse.json({ success: true, data: failoverStatus })

      case 'system-health':
        const health = await backupService.checkSystemHealth()
        return NextResponse.json({ success: true, data: health })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Backup API error:', error)
    return NextResponse.json(
      { error: 'Failed to process backup request' },
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

    // Only allow admin users to trigger backup operations
    if (!auth.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { action, ...data } = body

    switch (action) {
      case 'create-backup':
        const { backupType, includeUserData } = data
        const backupResult = await backupService.createBackup(
          backupType || 'full',
          includeUserData !== false
        )
        return NextResponse.json({ success: true, data: backupResult })

      case 'restore-backup':
        const { backupId, restoreOptions } = data
        if (!backupId) {
          return NextResponse.json(
            { error: 'Backup ID is required' },
            { status: 400 }
          )
        }

        const restoreResult = await backupService.restoreFromBackup(backupId, restoreOptions)
        return NextResponse.json({ success: true, data: restoreResult })

      case 'test-failover':
        const failoverTest = await backupService.testFailover()
        return NextResponse.json({ success: true, data: failoverTest })

      case 'trigger-failover':
        const { reason } = data
        if (!reason) {
          return NextResponse.json(
            { error: 'Failover reason is required' },
            { status: 400 }
          )
        }

        const failoverResult = await backupService.triggerFailover(reason)
        return NextResponse.json({ success: true, data: failoverResult })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Backup POST API error:', error)
    return NextResponse.json(
      { error: 'Failed to process backup request' },
      { status: 500 }
    )
  }
}