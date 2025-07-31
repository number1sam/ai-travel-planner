import { NextRequest, NextResponse } from 'next/server'
import { BackupService } from '@/services/BackupService'
import { FailoverService } from '@/services/FailoverService'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'status':
        const status = await BackupService.getBackupStatus()
        return NextResponse.json(status)

      case 'system-status':
        const systemStatus = await FailoverService.getSystemStatus()
        return NextResponse.json(systemStatus)

      case 'list':
        const backups = await BackupService.getAllBackups()
        return NextResponse.json(backups)

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
    const body = await request.json()
    const { action, backupId, config } = body

    switch (action) {
      case 'create-full':
        const fullBackup = await BackupService.performFullBackup(config)
        return NextResponse.json(fullBackup)

      case 'create-database':
        const dbBackup = await BackupService.performDatabaseBackup(config || {})
        return NextResponse.json(dbBackup)

      case 'create-cache':
        const cacheBackup = await BackupService.performCacheBackup(config || {})
        return NextResponse.json(cacheBackup)

      case 'create-files':
        const fileBackup = await BackupService.performFileBackup(config || {})
        return NextResponse.json(fileBackup)

      case 'restore':
        if (!backupId) {
          return NextResponse.json({ error: 'Backup ID required' }, { status: 400 })
        }
        const restored = await BackupService.restoreFromBackup(backupId)
        return NextResponse.json({ success: restored })

      case 'cleanup':
        await BackupService.cleanupExpiredBackups()
        return NextResponse.json({ message: 'Cleanup completed' })

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

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const backupId = searchParams.get('backupId')

    if (!backupId) {
      return NextResponse.json({ error: 'Backup ID required' }, { status: 400 })
    }

    await BackupService.deleteBackup(backupId)
    return NextResponse.json({ message: 'Backup deleted successfully' })
  } catch (error) {
    console.error('Backup deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete backup' },
      { status: 500 }
    )
  }
}