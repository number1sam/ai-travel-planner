// Conversation State Recovery and Persistence Service
// Ensures conversations can be resumed after system interruptions or crashes

import { promises as fs } from 'fs'
import { join } from 'path'
import UnifiedConversationManager, { TripContext, ConversationMessage } from './UnifiedConversationManager'

export interface PersistedConversation {
  conversationId: string
  tripContext: TripContext
  messages: ConversationMessage[]
  lastUpdated: string
  conversationSummary: string
  recoveryPoint: 'initial' | 'gathering_info' | 'ready_to_generate' | 'itinerary_completed'
  version: string
}

export interface ConversationRecoveryMetadata {
  isRecovered: boolean
  lastAction: string
  missedDuration: number // seconds since last save
  recoveryPoint: string
}

class ConversationPersistenceService {
  private readonly storageDir: string
  private readonly backupDir: string
  private readonly maxBackups: number = 5
  
  constructor(storageDir = './conversations', backupDir = './conversation-backups') {
    this.storageDir = storageDir
    this.backupDir = backupDir
  }

  // Initialize storage directories
  async initializeStorage(): Promise<void> {
    try {
      await fs.mkdir(this.storageDir, { recursive: true })
      await fs.mkdir(this.backupDir, { recursive: true })
      console.log('✅ Conversation persistence storage initialized')
    } catch (error) {
      console.error('❌ Failed to initialize persistence storage:', error)
    }
  }

  // Save conversation state with automatic recovery point detection
  async saveConversationState(
    conversationId: string, 
    conversationManager: UnifiedConversationManager
  ): Promise<void> {
    try {
      const fullContext = conversationManager.getFullContext()
      // Enhanced system uses tripBrief, old system uses tripContext
      const tripContext = fullContext.tripBrief || fullContext.tripContext
      const recoveryPoint = this.determineRecoveryPoint(tripContext)
      const conversationSummary = this.generateConversationSummary(fullContext)

      const persistedConversation: PersistedConversation = {
        conversationId,
        tripContext: tripContext,
        messages: fullContext.messages,
        lastUpdated: new Date().toISOString(),
        conversationSummary,
        recoveryPoint,
        version: '1.0'
      }

      // Create backup before overwriting
      await this.createBackup(conversationId)

      // Save main conversation file
      const filePath = join(this.storageDir, `${conversationId}.json`)
      await fs.writeFile(filePath, JSON.stringify(persistedConversation, null, 2))
      
      console.log(`💾 Conversation ${conversationId} saved to persistent storage`)
    } catch (error) {
      console.error(`❌ Failed to save conversation ${conversationId}:`, error)
      throw error
    }
  }

  // Load and recover conversation state
  async loadConversationState(conversationId: string): Promise<{
    conversationManager: UnifiedConversationManager | null
    recoveryMetadata: ConversationRecoveryMetadata
  }> {
    try {
      const filePath = join(this.storageDir, `${conversationId}.json`)
      const data = await fs.readFile(filePath, 'utf-8')
      const persistedConversation: PersistedConversation = JSON.parse(data)

      // Calculate recovery metadata
      const lastUpdated = new Date(persistedConversation.lastUpdated)
      const now = new Date()
      const missedDuration = Math.floor((now.getTime() - lastUpdated.getTime()) / 1000)

      const recoveryMetadata: ConversationRecoveryMetadata = {
        isRecovered: true,
        lastAction: this.getLastActionFromMessages(persistedConversation.messages),
        missedDuration,
        recoveryPoint: persistedConversation.recoveryPoint
      }

      // Recreate conversation manager
      const conversationManager = new UnifiedConversationManager(conversationId)
      
      // Restore state
      await this.restoreConversationManager(conversationManager, persistedConversation)

      console.log(`🔄 Conversation ${conversationId} recovered from persistent storage`)
      console.log(`📊 Recovery metadata:`, recoveryMetadata)

      return {
        conversationManager,
        recoveryMetadata
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist - not an error, just no saved state
        return {
          conversationManager: null,
          recoveryMetadata: {
            isRecovered: false,
            lastAction: 'none',
            missedDuration: 0,
            recoveryPoint: 'initial'
          }
        }
      }
      
      console.error(`❌ Failed to load conversation ${conversationId}:`, error)
      
      // Try to recover from backup
      const backupResult = await this.tryRecoverFromBackup(conversationId)
      return backupResult
    }
  }

  // Generate conversation summary for recovery context
  private generateConversationSummary(fullContext: any): string {
    const tripContext = fullContext.tripBrief || fullContext.tripContext || {}
    const messages = fullContext.messages || []
    const messageCount = messages.length

    if (messageCount === 0) {
      return "New conversation - no messages yet"
    }

    // Handle both constraint object structure and simple values
    const destination = tripContext.destination?.primary?.value || tripContext.destination?.primary || 'Not specified'
    const durationValue = tripContext.dates?.duration?.value || tripContext.dates?.duration
    const duration = durationValue ? `${durationValue} days` : 'Not specified'
    const budgetValue = tripContext.budget?.total?.value || tripContext.budget?.total
    const currencyValue = tripContext.budget?.currency?.value || tripContext.budget?.currency || 'USD'
    const budget = budgetValue ? `${currencyValue}${budgetValue}` : 'Not specified'
    const travelersValue = tripContext.travelers?.adults?.value || tripContext.travelers?.adults
    const travelers = travelersValue ? `${travelersValue} people` : 'Not specified'

    return `Trip planning for ${destination} (${duration}, ${budget}, ${travelers}) - ${messageCount} messages exchanged`
  }

  // Determine what stage of conversation we're at for recovery
  private determineRecoveryPoint(tripContext: any): string {
    // Handle both old and new intent structures
    if (!tripContext) return 'initial'
    
    const currentIntent = tripContext.currentIntent || tripContext.intent?.current
    
    if (currentIntent === 'itinerary_completed') {
      return 'itinerary_completed'
    }

    if (currentIntent === 'generating_itinerary') {
      return 'ready_to_generate'  
    }

    // Check if we have all basic information
    const hasDestination = !!tripContext.destination?.primary
    const hasDuration = !!tripContext.dates?.duration
    const hasBudget = !!tripContext.budget?.total
    const hasTravelers = !!tripContext.travelers?.adults
    const hasOrigin = !!tripContext.origin
    const hasAccommodation = !!tripContext.preferences?.accommodation?.length
    const hasStyle = !!tripContext.preferences?.style
    const hasInterests = !!tripContext.preferences?.interests?.length

    if (hasDestination && hasDuration && hasBudget && hasTravelers && 
        hasOrigin && hasAccommodation && hasStyle && hasInterests) {
      return 'ready_to_generate'
    }

    if (hasDestination || hasDuration || hasBudget) {
      return 'gathering_info'
    }

    return 'initial'
  }

  // Get the last meaningful action from conversation
  private getLastActionFromMessages(messages: ConversationMessage[]): string {
    if (messages.length === 0) return 'none'

    const lastMessage = messages[messages.length - 1]
    if (lastMessage.role === 'user') {
      return `User said: "${lastMessage.content.substring(0, 50)}..."`
    } else {
      const content = lastMessage.content
      if (content.includes('itinerary is ready')) {
        return 'Itinerary generation completed'
      } else if (content.includes('What\'s your total budget')) {
        return 'Asked for budget information'
      } else if (content.includes('How many people')) {
        return 'Asked for traveler count'
      } else if (content.includes('Where will you be departing')) {
        return 'Asked for departure location'
      }
      return 'Bot provided response'
    }
  }

  // Restore conversation manager state from persisted data
  private async restoreConversationManager(
    conversationManager: UnifiedConversationManager,
    persistedConversation: PersistedConversation
  ): Promise<void> {
    // Restore trip context
    conversationManager.updateTripContext(persistedConversation.tripContext)

    // Restore message history
    for (const message of persistedConversation.messages) {
      conversationManager.addMessage(message.content, message.role, message.metadata)
    }
  }

  // Create backup of existing conversation before overwriting
  private async createBackup(conversationId: string): Promise<void> {
    try {
      const sourcePath = join(this.storageDir, `${conversationId}.json`)
      
      // Check if original file exists
      try {
        await fs.access(sourcePath)
      } catch {
        // No existing file to backup
        return
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupPath = join(this.backupDir, `${conversationId}-${timestamp}.json`)
      
      await fs.copyFile(sourcePath, backupPath)
      
      // Clean up old backups
      await this.cleanupOldBackups(conversationId)
    } catch (error) {
      console.error(`⚠️ Failed to create backup for ${conversationId}:`, error)
      // Don't throw - backup failure shouldn't prevent saving
    }
  }

  // Clean up old backup files to prevent disk space issues
  private async cleanupOldBackups(conversationId: string): Promise<void> {
    try {
      const files = await fs.readdir(this.backupDir)
      const backupFiles = files
        .filter(file => file.startsWith(conversationId) && file.endsWith('.json'))
        .map(file => ({
          name: file,
          path: join(this.backupDir, file)
        }))
        .sort((a, b) => b.name.localeCompare(a.name)) // Sort by timestamp descending

      // Keep only the most recent backups
      if (backupFiles.length > this.maxBackups) {
        const filesToDelete = backupFiles.slice(this.maxBackups)
        for (const file of filesToDelete) {
          await fs.unlink(file.path)
        }
      }
    } catch (error) {
      console.error(`⚠️ Failed to cleanup old backups:`, error)
    }
  }

  // Try to recover from backup if main file is corrupted
  private async tryRecoverFromBackup(conversationId: string): Promise<{
    conversationManager: UnifiedConversationManager | null
    recoveryMetadata: ConversationRecoveryMetadata  
  }> {
    try {
      const files = await fs.readdir(this.backupDir)
      const backupFiles = files
        .filter(file => file.startsWith(conversationId) && file.endsWith('.json'))
        .sort((a, b) => b.localeCompare(a)) // Most recent first

      if (backupFiles.length === 0) {
        console.log(`📁 No backups found for conversation ${conversationId}`)
        return {
          conversationManager: null,
          recoveryMetadata: {
            isRecovered: false,
            lastAction: 'none',
            missedDuration: 0,
            recoveryPoint: 'initial'
          }
        }
      }

      // Try the most recent backup
      const backupPath = join(this.backupDir, backupFiles[0])
      const data = await fs.readFile(backupPath, 'utf-8')
      const persistedConversation: PersistedConversation = JSON.parse(data)

      const conversationManager = new UnifiedConversationManager(conversationId)
      await this.restoreConversationManager(conversationManager, persistedConversation)

      console.log(`🔄 Conversation ${conversationId} recovered from backup: ${backupFiles[0]}`)

      return {
        conversationManager,
        recoveryMetadata: {
          isRecovered: true,
          lastAction: this.getLastActionFromMessages(persistedConversation.messages),
          missedDuration: 0, // Unknown for backup recovery
          recoveryPoint: persistedConversation.recoveryPoint
        }
      }
    } catch (error) {
      console.error(`❌ Failed to recover from backup:`, error)
      return {
        conversationManager: null,
        recoveryMetadata: {
          isRecovered: false,
          lastAction: 'recovery_failed',
          missedDuration: 0,
          recoveryPoint: 'initial'
        }
      }
    }
  }

  // Delete conversation and all its backups
  async deleteConversation(conversationId: string): Promise<void> {
    try {
      // Delete main file
      const mainPath = join(this.storageDir, `${conversationId}.json`)
      try {
        await fs.unlink(mainPath)
      } catch (error) {
        // File might not exist
      }

      // Delete all backup files
      const files = await fs.readdir(this.backupDir)
      const backupFiles = files.filter(file => file.startsWith(conversationId))
      
      for (const backupFile of backupFiles) {
        await fs.unlink(join(this.backupDir, backupFile))
      }

      console.log(`🗑️ Deleted conversation ${conversationId} and all backups`)
    } catch (error) {
      console.error(`❌ Failed to delete conversation ${conversationId}:`, error)
    }
  }

  // Get recovery statistics for monitoring
  async getRecoveryStatistics(): Promise<{
    totalConversations: number
    oldestConversation: string | null
    newestConversation: string | null  
    totalBackups: number
    storageSize: number
  }> {
    try {
      const mainFiles = await fs.readdir(this.storageDir)
      const backupFiles = await fs.readdir(this.backupDir)
      
      const conversations = mainFiles.filter(f => f.endsWith('.json'))
      
      let oldestConversation: string | null = null
      let newestConversation: string | null = null
      let totalSize = 0

      if (conversations.length > 0) {
        // Calculate storage size and find oldest/newest
        for (const file of conversations) {
          const filePath = join(this.storageDir, file)
          const stats = await fs.stat(filePath)
          totalSize += stats.size
          
          if (!oldestConversation || stats.mtime < (await fs.stat(join(this.storageDir, oldestConversation))).mtime) {
            oldestConversation = file.replace('.json', '')
          }
          
          if (!newestConversation || stats.mtime > (await fs.stat(join(this.storageDir, newestConversation))).mtime) {
            newestConversation = file.replace('.json', '')
          }
        }
      }

      return {
        totalConversations: conversations.length,
        oldestConversation,
        newestConversation,
        totalBackups: backupFiles.length,
        storageSize: totalSize
      }
    } catch (error) {
      console.error('❌ Failed to get recovery statistics:', error)
      return {
        totalConversations: 0,
        oldestConversation: null,
        newestConversation: null,
        totalBackups: 0,
        storageSize: 0
      }
    }
  }
}

export default ConversationPersistenceService