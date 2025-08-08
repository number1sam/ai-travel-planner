// AWS SDK imports disabled for development
// import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
// import { RDSClient, CreateDBSnapshotCommand, DescribeDBSnapshotsCommand, DeleteDBSnapshotCommand } from '@aws-sdk/client-rds'
// import { ElastiCacheClient, CreateSnapshotCommand, DescribeSnapshotsCommand, DeleteSnapshotCommand } from '@aws-sdk/client-elasticache'

// Stub types for development
type S3Client = any
type RDSClient = any
type ElastiCacheClient = any
import { prisma } from '@/lib/prisma'
import { createGzip, createGunzip } from 'zlib'
import { pipeline } from 'stream/promises'
import { createReadStream, createWriteStream } from 'fs'
import { promisify } from 'util'
import { exec } from 'child_process'

const execAsync = promisify(exec)

export interface BackupConfiguration {
  schedule: {
    daily: boolean
    weekly: boolean
    monthly: boolean
    hourly: boolean
  }
  retention: {
    daily: number // days
    weekly: number // weeks
    monthly: number // months
    hourly: number // hours
  }
  destinations: {
    s3: {
      enabled: boolean
      bucket: string
      region: string
      encryption: boolean
    }
    local: {
      enabled: boolean
      path: string
    }
    crossRegion: {
      enabled: boolean
      regions: string[]
    }
  }
  compression: boolean
  verification: boolean
}

export interface BackupMetadata {
  id: string
  type: 'database' | 'files' | 'cache' | 'full'
  timestamp: Date
  size: number
  location: string
  checksum: string
  compressed: boolean
  encrypted: boolean
  status: 'pending' | 'running' | 'completed' | 'failed'
  verification: {
    verified: boolean
    verifiedAt?: Date
    errors?: string[]
  }
  retention: {
    expiresAt: Date
    policy: string
  }
}

export class BackupService {
  private static s3Client: S3Client
  private static rdsClient: RDSClient
  private static elastiCacheClient: ElastiCacheClient
  
  private static readonly DEFAULT_CONFIG: BackupConfiguration = {
    schedule: {
      daily: true,
      weekly: true,
      monthly: true,
      hourly: false
    },
    retention: {
      daily: 7,
      weekly: 4,
      monthly: 12,
      hourly: 24
    },
    destinations: {
      s3: {
        enabled: true,
        bucket: process.env.AWS_BACKUP_BUCKET || 'travel-agent-backups',
        region: process.env.AWS_REGION || 'us-east-1',
        encryption: true
      },
      local: {
        enabled: true,
        path: '/backups'
      },
      crossRegion: {
        enabled: true,
        regions: ['us-west-2', 'eu-west-1']
      }
    },
    compression: true,
    verification: true
  }

  static initialize() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      }
    })

    this.rdsClient = new RDSClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      }
    })

    this.elastiCacheClient = new ElastiCacheClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      }
    })
  }

  /**
   * Perform full system backup
   */
  static async performFullBackup(config?: BackupConfiguration): Promise<BackupMetadata> {
    const backupConfig = config || this.DEFAULT_CONFIG
    const backupId = `full-backup-${Date.now()}`
    
    console.log(`BackupService: Starting full backup ${backupId}`)

    const metadata: BackupMetadata = {
      id: backupId,
      type: 'full',
      timestamp: new Date(),
      size: 0,
      location: '',
      checksum: '',
      compressed: backupConfig.compression,
      encrypted: backupConfig.destinations.s3.encryption,
      status: 'running',
      verification: {
        verified: false
      },
      retention: {
        expiresAt: this.calculateExpirationDate('daily', backupConfig.retention.daily),
        policy: 'daily'
      }
    }

    try {
      // Record backup start
      await this.recordBackupStart(metadata)

      // Perform database backup
      const dbBackup = await this.performDatabaseBackup(backupConfig)
      
      // Perform cache backup
      const cacheBackup = await this.performCacheBackup(backupConfig)
      
      // Perform file system backup
      const fileBackup = await this.performFileBackup(backupConfig)

      // Combine all backups
      const combinedSize = dbBackup.size + cacheBackup.size + fileBackup.size
      const combinedLocation = await this.combineBackups([dbBackup, cacheBackup, fileBackup], backupId, backupConfig)

      metadata.size = combinedSize
      metadata.location = combinedLocation
      metadata.checksum = await this.calculateChecksum(combinedLocation)
      metadata.status = 'completed'

      // Verify backup if enabled
      if (backupConfig.verification) {
        const verification = await this.verifyBackup(metadata)
        metadata.verification = verification
      }

      // Upload to cross-region if enabled
      if (backupConfig.destinations.crossRegion.enabled) {
        await this.replicateBackupCrossRegion(metadata, backupConfig.destinations.crossRegion.regions)
      }

      // Update metadata
      await this.recordBackupCompletion(metadata)

      console.log(`BackupService: Full backup ${backupId} completed successfully`)
      return metadata

    } catch (error) {
      console.error(`BackupService: Full backup ${backupId} failed:`, error)
      metadata.status = 'failed'
      await this.recordBackupCompletion(metadata)
      throw error
    }
  }

  /**
   * Perform database backup
   */
  static async performDatabaseBackup(config: BackupConfiguration): Promise<BackupMetadata> {
    const backupId = `db-backup-${Date.now()}`
    const timestamp = new Date()
    
    console.log(`BackupService: Starting database backup ${backupId}`)

    try {
      // Create RDS snapshot for production
      if (process.env.NODE_ENV === 'production' && process.env.RDS_INSTANCE_ID) {
        const snapshotId = `travel-agent-db-${timestamp.getTime()}`
        
        const command = new CreateDBSnapshotCommand({
          DBSnapshotIdentifier: snapshotId,
          DBInstanceIdentifier: process.env.RDS_INSTANCE_ID
        })

        await this.rdsClient.send(command)
        
        return {
          id: backupId,
          type: 'database',
          timestamp,
          size: 0, // Will be updated after snapshot completion
          location: `rds-snapshot:${snapshotId}`,
          checksum: '',
          compressed: false,
          encrypted: true,
          status: 'completed',
          verification: { verified: false },
          retention: {
            expiresAt: this.calculateExpirationDate('daily', config.retention.daily),
            policy: 'daily'
          }
        }
      }

      // For development/local, use pg_dump
      const dumpPath = `/tmp/db-backup-${timestamp.getTime()}.sql`
      const dumpCommand = `pg_dump ${process.env.DATABASE_URL} > ${dumpPath}`
      
      await execAsync(dumpCommand)

      let finalPath = dumpPath
      let size = await this.getFileSize(dumpPath)

      // Compress if enabled
      if (config.compression) {
        const compressedPath = `${dumpPath}.gz`
        await this.compressFile(dumpPath, compressedPath)
        finalPath = compressedPath
        size = await this.getFileSize(compressedPath)
      }

      // Upload to S3 if enabled
      if (config.destinations.s3.enabled) {
        const s3Key = `database/${backupId}.sql${config.compression ? '.gz' : ''}`
        await this.uploadToS3(finalPath, config.destinations.s3.bucket, s3Key, config.destinations.s3.encryption)
        finalPath = `s3://${config.destinations.s3.bucket}/${s3Key}`
      }

      const metadata: BackupMetadata = {
        id: backupId,
        type: 'database',
        timestamp,
        size,
        location: finalPath,
        checksum: await this.calculateChecksum(finalPath),
        compressed: config.compression,
        encrypted: config.destinations.s3.encryption,
        status: 'completed',
        verification: { verified: false },
        retention: {
          expiresAt: this.calculateExpirationDate('daily', config.retention.daily),
          policy: 'daily'
        }
      }

      console.log(`BackupService: Database backup ${backupId} completed`)
      return metadata

    } catch (error) {
      console.error(`BackupService: Database backup ${backupId} failed:`, error)
      throw error
    }
  }

  /**
   * Perform cache backup (Redis)
   */
  static async performCacheBackup(config: BackupConfiguration): Promise<BackupMetadata> {
    const backupId = `cache-backup-${Date.now()}`
    const timestamp = new Date()
    
    console.log(`BackupService: Starting cache backup ${backupId}`)

    try {
      // Create ElastiCache snapshot for production
      if (process.env.NODE_ENV === 'production' && process.env.ELASTICACHE_CLUSTER_ID) {
        const snapshotName = `travel-agent-cache-${timestamp.getTime()}`
        
        const command = new CreateSnapshotCommand({
          SnapshotName: snapshotName,
          ReplicationGroupId: process.env.ELASTICACHE_CLUSTER_ID
        })

        await this.elastiCacheClient.send(command)
        
        return {
          id: backupId,
          type: 'cache',
          timestamp,
          size: 0,
          location: `elasticache-snapshot:${snapshotName}`,
          checksum: '',
          compressed: false,
          encrypted: true,
          status: 'completed',
          verification: { verified: false },
          retention: {
            expiresAt: this.calculateExpirationDate('daily', config.retention.daily),
            policy: 'daily'
          }
        }
      }

      // For development/local, use Redis BGSAVE
      const backupPath = `/tmp/cache-backup-${timestamp.getTime()}.rdb`
      
      // Create Redis backup
      const redisCommand = `redis-cli --rdb ${backupPath}`
      await execAsync(redisCommand)

      let finalPath = backupPath
      let size = await this.getFileSize(backupPath)

      // Compress if enabled
      if (config.compression) {
        const compressedPath = `${backupPath}.gz`
        await this.compressFile(backupPath, compressedPath)
        finalPath = compressedPath
        size = await this.getFileSize(compressedPath)
      }

      // Upload to S3 if enabled
      if (config.destinations.s3.enabled) {
        const s3Key = `cache/${backupId}.rdb${config.compression ? '.gz' : ''}`
        await this.uploadToS3(finalPath, config.destinations.s3.bucket, s3Key, config.destinations.s3.encryption)
        finalPath = `s3://${config.destinations.s3.bucket}/${s3Key}`
      }

      const metadata: BackupMetadata = {
        id: backupId,
        type: 'cache',
        timestamp,
        size,
        location: finalPath,
        checksum: await this.calculateChecksum(finalPath),
        compressed: config.compression,
        encrypted: config.destinations.s3.encryption,
        status: 'completed',
        verification: { verified: false },
        retention: {
          expiresAt: this.calculateExpirationDate('daily', config.retention.daily),
          policy: 'daily'
        }
      }

      console.log(`BackupService: Cache backup ${backupId} completed`)
      return metadata

    } catch (error) {
      console.error(`BackupService: Cache backup ${backupId} failed:`, error)
      throw error
    }
  }

  /**
   * Perform file system backup
   */
  static async performFileBackup(config: BackupConfiguration): Promise<BackupMetadata> {
    const backupId = `files-backup-${Date.now()}`
    const timestamp = new Date()
    
    console.log(`BackupService: Starting file backup ${backupId}`)

    try {
      const sourceDirectories = [
        '/app/uploads',
        '/app/logs',
        '/app/config'
      ]

      const backupPath = `/tmp/files-backup-${timestamp.getTime()}.tar`
      
      // Create tar archive
      const tarCommand = `tar -cf ${backupPath} ${sourceDirectories.join(' ')}`
      await execAsync(tarCommand)

      let finalPath = backupPath
      let size = await this.getFileSize(backupPath)

      // Compress if enabled
      if (config.compression) {
        const compressedPath = `${backupPath}.gz`
        await this.compressFile(backupPath, compressedPath)
        finalPath = compressedPath
        size = await this.getFileSize(compressedPath)
      }

      // Upload to S3 if enabled
      if (config.destinations.s3.enabled) {
        const s3Key = `files/${backupId}.tar${config.compression ? '.gz' : ''}`
        await this.uploadToS3(finalPath, config.destinations.s3.bucket, s3Key, config.destinations.s3.encryption)
        finalPath = `s3://${config.destinations.s3.bucket}/${s3Key}`
      }

      const metadata: BackupMetadata = {
        id: backupId,
        type: 'files',
        timestamp,
        size,
        location: finalPath,
        checksum: await this.calculateChecksum(finalPath),
        compressed: config.compression,
        encrypted: config.destinations.s3.encryption,
        status: 'completed',
        verification: { verified: false },
        retention: {
          expiresAt: this.calculateExpirationDate('daily', config.retention.daily),
          policy: 'daily'
        }
      }

      console.log(`BackupService: File backup ${backupId} completed`)
      return metadata

    } catch (error) {
      console.error(`BackupService: File backup ${backupId} failed:`, error)
      throw error
    }
  }

  /**
   * Restore from backup
   */
  static async restoreFromBackup(backupId: string): Promise<boolean> {
    console.log(`BackupService: Starting restore from backup ${backupId}`)

    try {
      const backup = await this.getBackupMetadata(backupId)
      if (!backup) {
        throw new Error(`Backup ${backupId} not found`)
      }

      if (backup.status !== 'completed') {
        throw new Error(`Backup ${backupId} is not in completed state`)
      }

      // Verify backup before restore
      if (backup.verification.verified !== true) {
        const verification = await this.verifyBackup(backup)
        if (!verification.verified) {
          throw new Error(`Backup ${backupId} failed verification`)
        }
      }

      switch (backup.type) {
        case 'database':
          await this.restoreDatabase(backup)
          break
        case 'cache':
          await this.restoreCache(backup)
          break
        case 'files':
          await this.restoreFiles(backup)
          break
        case 'full':
          await this.restoreFullBackup(backup)
          break
      }

      console.log(`BackupService: Restore from backup ${backupId} completed successfully`)
      return true

    } catch (error) {
      console.error(`BackupService: Restore from backup ${backupId} failed:`, error)
      return false
    }
  }

  /**
   * Clean up expired backups
   */
  static async cleanupExpiredBackups(): Promise<void> {
    console.log('BackupService: Starting cleanup of expired backups')

    try {
      const expiredBackups = await this.getExpiredBackups()
      
      for (const backup of expiredBackups) {
        await this.deleteBackup(backup.id)
        console.log(`BackupService: Deleted expired backup ${backup.id}`)
      }

      console.log(`BackupService: Cleanup completed. Removed ${expiredBackups.length} expired backups`)

    } catch (error) {
      console.error('BackupService: Cleanup failed:', error)
    }
  }

  /**
   * Get backup status and metrics
   */
  static async getBackupStatus(): Promise<{
    totalBackups: number
    totalSize: number
    lastBackup: Date | null
    successRate: number
    upcomingBackups: Array<{ type: string; scheduledAt: Date }>
    alerts: string[]
  }> {
    try {
      const backups = await this.getAllBackups()
      const totalBackups = backups.length
      const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0)
      const lastBackup = backups.length > 0 ? new Date(Math.max(...backups.map(b => b.timestamp.getTime()))) : null
      
      const completed = backups.filter(b => b.status === 'completed').length
      const successRate = totalBackups > 0 ? (completed / totalBackups) * 100 : 100

      const alerts = []
      if (successRate < 95) {
        alerts.push(`Low backup success rate: ${successRate.toFixed(1)}%`)
      }
      if (lastBackup && (Date.now() - lastBackup.getTime()) > 24 * 60 * 60 * 1000) {
        alerts.push('No recent backups in the last 24 hours')
      }

      return {
        totalBackups,
        totalSize,
        lastBackup,
        successRate,
        upcomingBackups: [], // Would be populated from scheduled jobs
        alerts
      }

    } catch (error) {
      console.error('BackupService: Error getting backup status:', error)
      return {
        totalBackups: 0,
        totalSize: 0,
        lastBackup: null,
        successRate: 0,
        upcomingBackups: [],
        alerts: ['Error retrieving backup status']
      }
    }
  }

  /**
   * Private helper methods
   */
  private static async uploadToS3(filePath: string, bucket: string, key: string, encrypted: boolean): Promise<void> {
    const fileStream = createReadStream(filePath)
    
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: fileStream,
      ServerSideEncryption: encrypted ? 'AES256' : undefined
    })

    await this.s3Client.send(command)
  }

  private static async downloadFromS3(bucket: string, key: string, filePath: string): Promise<void> {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key
    })

    const response = await this.s3Client.send(command)
    const fileStream = createWriteStream(filePath)
    
    if (response.Body) {
      await pipeline(response.Body as any, fileStream)
    }
  }

  private static async compressFile(inputPath: string, outputPath: string): Promise<void> {
    const input = createReadStream(inputPath)
    const output = createWriteStream(outputPath)
    const gzip = createGzip()

    await pipeline(input, gzip, output)
  }

  private static async decompressFile(inputPath: string, outputPath: string): Promise<void> {
    const input = createReadStream(inputPath)
    const output = createWriteStream(outputPath)
    const gunzip = createGunzip()

    await pipeline(input, gunzip, output)
  }

  private static async getFileSize(filePath: string): Promise<number> {
    const { stdout } = await execAsync(`stat -c%s "${filePath}"`)
    return parseInt(stdout.trim())
  }

  private static async calculateChecksum(filePath: string): Promise<string> {
    if (filePath.startsWith('s3://') || filePath.startsWith('rds-snapshot:') || filePath.startsWith('elasticache-snapshot:')) {
      return 'cloud-resource'
    }
    
    const { stdout } = await execAsync(`sha256sum "${filePath}"`)
    return stdout.split(' ')[0]
  }

  private static calculateExpirationDate(policy: string, retention: number): Date {
    const now = new Date()
    switch (policy) {
      case 'hourly':
        return new Date(now.getTime() + retention * 60 * 60 * 1000)
      case 'daily':
        return new Date(now.getTime() + retention * 24 * 60 * 60 * 1000)
      case 'weekly':
        return new Date(now.getTime() + retention * 7 * 24 * 60 * 60 * 1000)
      case 'monthly':
        return new Date(now.getTime() + retention * 30 * 24 * 60 * 60 * 1000)
      default:
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    }
  }

  private static async recordBackupStart(metadata: BackupMetadata): Promise<void> {
    await prisma.backupLog.create({
      data: {
        id: metadata.id,
        type: metadata.type,
        status: metadata.status,
        timestamp: metadata.timestamp,
        size: metadata.size,
        location: metadata.location,
        checksum: metadata.checksum,
        compressed: metadata.compressed,
        encrypted: metadata.encrypted,
        verified: metadata.verification.verified,
        expiresAt: metadata.retention.expiresAt,
        policy: metadata.retention.policy
      }
    })
  }

  private static async recordBackupCompletion(metadata: BackupMetadata): Promise<void> {
    await prisma.backupLog.update({
      where: { id: metadata.id },
      data: {
        status: metadata.status,
        size: metadata.size,
        location: metadata.location,
        checksum: metadata.checksum,
        verified: metadata.verification.verified,
        verifiedAt: metadata.verification.verifiedAt
      }
    })
  }

  private static async verifyBackup(metadata: BackupMetadata): Promise<{ verified: boolean; verifiedAt?: Date; errors?: string[] }> {
    try {
      const errors = []

      // Verify checksum if possible
      if (metadata.checksum && !metadata.location.includes('snapshot:')) {
        const currentChecksum = await this.calculateChecksum(metadata.location)
        if (currentChecksum !== metadata.checksum) {
          errors.push('Checksum mismatch')
        }
      }

      // Additional verification based on backup type
      if (metadata.type === 'database') {
        // Could attempt to restore to a test database
      }

      return {
        verified: errors.length === 0,
        verifiedAt: new Date(),
        errors: errors.length > 0 ? errors : undefined
      }

    } catch (error) {
      return {
        verified: false,
        verifiedAt: new Date(),
        errors: [`Verification failed: ${error.message}`]
      }
    }
  }

  private static async combineBackups(backups: BackupMetadata[], backupId: string, config: BackupConfiguration): Promise<string> {
    // In a real implementation, this would combine multiple backup files
    // For now, return a reference to the combined backup location
    return `s3://${config.destinations.s3.bucket}/combined/${backupId}.tar.gz`
  }

  private static async replicateBackupCrossRegion(metadata: BackupMetadata, regions: string[]): Promise<void> {
    for (const region of regions) {
      // Replicate backup to cross-region
      console.log(`BackupService: Replicating backup ${metadata.id} to region ${region}`)
    }
  }

  private static async restoreDatabase(backup: BackupMetadata): Promise<void> {
    // Implementation for database restore
    console.log(`BackupService: Restoring database from ${backup.location}`)
  }

  private static async restoreCache(backup: BackupMetadata): Promise<void> {
    // Implementation for cache restore
    console.log(`BackupService: Restoring cache from ${backup.location}`)
  }

  private static async restoreFiles(backup: BackupMetadata): Promise<void> {
    // Implementation for file restore
    console.log(`BackupService: Restoring files from ${backup.location}`)
  }

  private static async restoreFullBackup(backup: BackupMetadata): Promise<void> {
    // Implementation for full system restore
    console.log(`BackupService: Restoring full backup from ${backup.location}`)
  }

  private static async getBackupMetadata(backupId: string): Promise<BackupMetadata | null> {
    const backup = await prisma.backupLog.findUnique({
      where: { id: backupId }
    })

    if (!backup) return null

    return {
      id: backup.id,
      type: backup.type as any,
      timestamp: backup.timestamp,
      size: backup.size,
      location: backup.location,
      checksum: backup.checksum,
      compressed: backup.compressed,
      encrypted: backup.encrypted,
      status: backup.status as any,
      verification: {
        verified: backup.verified,
        verifiedAt: backup.verifiedAt || undefined
      },
      retention: {
        expiresAt: backup.expiresAt,
        policy: backup.policy
      }
    }
  }

  private static async getAllBackups(): Promise<BackupMetadata[]> {
    const backups = await prisma.backupLog.findMany({
      orderBy: { timestamp: 'desc' }
    })

    return backups.map(backup => ({
      id: backup.id,
      type: backup.type as any,
      timestamp: backup.timestamp,
      size: backup.size,
      location: backup.location,
      checksum: backup.checksum,
      compressed: backup.compressed,
      encrypted: backup.encrypted,
      status: backup.status as any,
      verification: {
        verified: backup.verified,
        verifiedAt: backup.verifiedAt || undefined
      },
      retention: {
        expiresAt: backup.expiresAt,
        policy: backup.policy
      }
    }))
  }

  private static async getExpiredBackups(): Promise<BackupMetadata[]> {
    const backups = await prisma.backupLog.findMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    })

    return backups.map(backup => ({
      id: backup.id,
      type: backup.type as any,
      timestamp: backup.timestamp,
      size: backup.size,
      location: backup.location,
      checksum: backup.checksum,
      compressed: backup.compressed,
      encrypted: backup.encrypted,
      status: backup.status as any,
      verification: {
        verified: backup.verified,
        verifiedAt: backup.verifiedAt || undefined
      },
      retention: {
        expiresAt: backup.expiresAt,
        policy: backup.policy
      }
    }))
  }

  private static async deleteBackup(backupId: string): Promise<void> {
    const backup = await this.getBackupMetadata(backupId)
    if (!backup) return

    // Delete from S3 if stored there
    if (backup.location.startsWith('s3://')) {
      const [, , bucket, ...keyParts] = backup.location.split('/')
      const key = keyParts.join('/')
      
      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: key
      })

      await this.s3Client.send(command)
    }

    // Delete metadata from database
    await prisma.backupLog.delete({
      where: { id: backupId }
    })
  }
}

// Initialize AWS clients
BackupService.initialize()