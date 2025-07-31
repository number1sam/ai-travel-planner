import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto'
import { promisify } from 'util'

const scryptAsync = promisify(scrypt)

export class EncryptionService {
  private static readonly ALGORITHM = 'aes-256-gcm'
  private static readonly KEY_LENGTH = 32
  private static readonly IV_LENGTH = 16
  private static readonly SALT_LENGTH = 32
  private static readonly TAG_LENGTH = 16

  /**
   * Encrypts sensitive data using AES-256-GCM encryption
   * @param plaintext - The data to encrypt
   * @param password - The encryption password/key
   * @returns Encrypted data as base64 string
   */
  static async encrypt(plaintext: string, password: string): Promise<string> {
    try {
      // Generate random salt and IV
      const salt = randomBytes(this.SALT_LENGTH)
      const iv = randomBytes(this.IV_LENGTH)

      // Derive key from password using scrypt
      const key = (await scryptAsync(password, salt, this.KEY_LENGTH)) as Buffer

      // Create cipher
      const cipher = createCipheriv(this.ALGORITHM, key, iv)

      // Encrypt the plaintext
      let encrypted = cipher.update(plaintext, 'utf8', 'hex')
      encrypted += cipher.final('hex')

      // Get the authentication tag
      const tag = cipher.getAuthTag()

      // Combine salt, iv, tag, and encrypted data
      const result = Buffer.concat([
        salt,
        iv,
        tag,
        Buffer.from(encrypted, 'hex')
      ])

      return result.toString('base64')
    } catch (error) {
      console.error('EncryptionService: Encryption failed:', error)
      throw new Error('Failed to encrypt data')
    }
  }

  /**
   * Decrypts data encrypted with AES-256-GCM
   * @param encryptedData - Base64 encoded encrypted data
   * @param password - The decryption password/key
   * @returns Decrypted plaintext
   */
  static async decrypt(encryptedData: string, password: string): Promise<string> {
    try {
      // Parse the encrypted data
      const data = Buffer.from(encryptedData, 'base64')

      // Extract components
      const salt = data.subarray(0, this.SALT_LENGTH)
      const iv = data.subarray(this.SALT_LENGTH, this.SALT_LENGTH + this.IV_LENGTH)
      const tag = data.subarray(this.SALT_LENGTH + this.IV_LENGTH, this.SALT_LENGTH + this.IV_LENGTH + this.TAG_LENGTH)
      const encrypted = data.subarray(this.SALT_LENGTH + this.IV_LENGTH + this.TAG_LENGTH)

      // Derive key from password using scrypt
      const key = (await scryptAsync(password, salt, this.KEY_LENGTH)) as Buffer

      // Create decipher
      const decipher = createDecipheriv(this.ALGORITHM, key, iv)
      decipher.setAuthTag(tag)

      // Decrypt the data
      let decrypted = decipher.update(encrypted, undefined, 'utf8')
      decrypted += decipher.final('utf8')

      return decrypted
    } catch (error) {
      console.error('EncryptionService: Decryption failed:', error)
      throw new Error('Failed to decrypt data')
    }
  }

  /**
   * Encrypts personally identifiable information (PII)
   * Uses environment-specific encryption key
   */
  static async encryptPII(data: string): Promise<string> {
    const encryptionKey = process.env.PII_ENCRYPTION_KEY
    if (!encryptionKey) {
      throw new Error('PII encryption key not configured')
    }
    return this.encrypt(data, encryptionKey)
  }

  /**
   * Decrypts personally identifiable information (PII)
   * Uses environment-specific encryption key
   */
  static async decryptPII(encryptedData: string): Promise<string> {
    const encryptionKey = process.env.PII_ENCRYPTION_KEY
    if (!encryptionKey) {
      throw new Error('PII encryption key not configured')
    }
    return this.decrypt(encryptedData, encryptionKey)
  }

  /**
   * Generates a secure random key for encryption
   * @param length - Key length in bytes (default: 32 for AES-256)
   * @returns Base64 encoded random key
   */
  static generateSecureKey(length: number = 32): string {
    return randomBytes(length).toString('base64')
  }

  /**
   * Hashes sensitive data for storage (one-way)
   * Uses SHA-256 with salt
   */
  static async hashData(data: string): Promise<string> {
    const salt = randomBytes(16)
    const { createHash } = await import('crypto')
    const hash = createHash('sha256')
    hash.update(data + salt.toString('hex'))
    
    return salt.toString('hex') + ':' + hash.digest('hex')
  }

  /**
   * Verifies hashed data
   */
  static async verifyHash(data: string, hashedData: string): Promise<boolean> {
    try {
      const [salt, hash] = hashedData.split(':')
      const { createHash } = await import('crypto')
      const verifyHash = createHash('sha256')
      verifyHash.update(data + salt)
      
      return hash === verifyHash.digest('hex')
    } catch (error) {
      return false
    }
  }
}

/**
 * Field-level encryption for database models
 * Automatically encrypts/decrypts specified fields
 */
export class FieldEncryption {
  private static encryptedFields = new Set([
    'passport_number',
    'credit_card_number',
    'social_security_number',
    'phone_number',
    'address',
    'emergency_contact',
    'medical_conditions',
    'allergies'
  ])

  /**
   * Encrypts an object's sensitive fields
   */
  static async encryptFields(obj: Record<string, any>): Promise<Record<string, any>> {
    const result = { ...obj }

    for (const [key, value] of Object.entries(obj)) {
      if (this.encryptedFields.has(key) && value && typeof value === 'string') {
        result[key] = await EncryptionService.encryptPII(value)
      }
    }

    return result
  }

  /**
   * Decrypts an object's sensitive fields
   */
  static async decryptFields(obj: Record<string, any>): Promise<Record<string, any>> {
    const result = { ...obj }

    for (const [key, value] of Object.entries(obj)) {
      if (this.encryptedFields.has(key) && value && typeof value === 'string') {
        try {
          result[key] = await EncryptionService.decryptPII(value)
        } catch (error) {
          console.error(`Failed to decrypt field ${key}:`, error)
          result[key] = '[ENCRYPTED]'
        }
      }
    }

    return result
  }

  /**
   * Adds a field to the encryption list
   */
  static addEncryptedField(fieldName: string): void {
    this.encryptedFields.add(fieldName)
  }

  /**
   * Removes a field from the encryption list
   */
  static removeEncryptedField(fieldName: string): void {
    this.encryptedFields.delete(fieldName)
  }
}