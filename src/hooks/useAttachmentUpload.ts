'use client'

import { useState, useCallback, useRef } from 'react'
import { Attachment } from './useMessageLifecycle'

interface UploadProgress {
  attachmentId: string
  progress: number
  status: 'uploading' | 'completed' | 'failed' | 'cancelled'
  error?: string
}

interface UseAttachmentUploadOptions {
  maxFileSize?: number // bytes
  maxFiles?: number
  allowedTypes?: string[]
  compressionQuality?: number
  onUploadProgress?: (progress: UploadProgress) => void
  onUploadComplete?: (attachment: Attachment) => void
  onUploadError?: (attachmentId: string, error: Error) => void
  uploadEndpoint?: string
}

export function useAttachmentUpload(options: UseAttachmentUploadOptions = {}) {
  const {
    maxFileSize = 10 * 1024 * 1024, // 10MB default
    maxFiles = 5,
    allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    compressionQuality = 0.8,
    onUploadProgress,
    onUploadComplete,
    onUploadError,
    uploadEndpoint = '/api/upload'
  } = options

  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Map<string, UploadProgress>>(new Map())
  
  const uploadControllers = useRef<Map<string, AbortController>>(new Map())
  const compressionCanvas = useRef<HTMLCanvasElement>()

  // Generate unique attachment ID
  const generateAttachmentId = useCallback((): string => {
    return `attachment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }, [])

  // Validate file before upload
  const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
    if (file.size > maxFileSize) {
      return { valid: false, error: `File size exceeds ${(maxFileSize / 1024 / 1024).toFixed(1)}MB limit` }
    }

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: `File type ${file.type} not allowed` }
    }

    if (attachments.length >= maxFiles) {
      return { valid: false, error: `Maximum ${maxFiles} files allowed` }
    }

    return { valid: true }
  }, [maxFileSize, allowedTypes, maxFiles, attachments.length])

  // Compress image if needed
  const compressImage = useCallback(async (file: File): Promise<File> => {
    if (!file.type.startsWith('image/') || file.type === 'image/gif') {
      return file // Don't compress non-images or GIFs
    }

    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        if (!compressionCanvas.current) {
          compressionCanvas.current = document.createElement('canvas')
        }
        
        const canvas = compressionCanvas.current
        const ctx = canvas.getContext('2d')!
        
        // Calculate new dimensions (max 1920px width)
        const maxWidth = 1920
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height)
        canvas.width = img.width * ratio
        canvas.height = img.height * ratio
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        
        canvas.toBlob(
          (blob) => {
            if (blob && blob.size < file.size) {
              // Use compressed version if smaller
              resolve(new File([blob], file.name, { type: file.type }))
            } else {
              // Use original if compression didn't help
              resolve(file)
            }
          },
          file.type,
          compressionQuality
        )
      }
      
      img.src = URL.createObjectURL(file)
    })
  }, [compressionQuality])

  // Add files for upload
  const addFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    const newAttachments: Attachment[] = []

    for (const file of fileArray) {
      const validation = validateFile(file)
      if (!validation.valid) {
        console.error(`File validation failed: ${validation.error}`)
        continue
      }

      // Compress image if needed
      const processedFile = await compressImage(file)
      
      const attachment: Attachment = {
        id: generateAttachmentId(),
        name: file.name,
        size: processedFile.size,
        type: file.type,
        uploadStatus: 'pending',
        uploadProgress: 0
      }

      newAttachments.push(attachment)
    }

    setAttachments(prev => [...prev, ...newAttachments])

    // Start uploads immediately with user consent
    if (newAttachments.length > 0) {
      newAttachments.forEach(attachment => {
        const file = fileArray.find(f => f.name === attachment.name)
        if (file) {
          startUpload(attachment.id, file)
        }
      })
    }

    return newAttachments
  }, [validateFile, compressImage, generateAttachmentId])

  // Start individual file upload
  const startUpload = useCallback(async (attachmentId: string, file: File) => {
    const controller = new AbortController()
    uploadControllers.current.set(attachmentId, controller)

    // Update attachment status
    setAttachments(prev => prev.map(att => 
      att.id === attachmentId 
        ? { ...att, uploadStatus: 'uploading', uploadProgress: 0 }
        : att
    ))

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('attachmentId', attachmentId)

      const xhr = new XMLHttpRequest()
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100)
          
          setAttachments(prev => prev.map(att =>
            att.id === attachmentId 
              ? { ...att, uploadProgress: progress }
              : att
          ))

          const progressData: UploadProgress = {
            attachmentId,
            progress,
            status: 'uploading'
          }
          
          setUploadProgress(prev => new Map(prev).set(attachmentId, progressData))
          onUploadProgress?.(progressData)
        }
      })

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText)
            const completedAttachment: Attachment = {
              id: attachmentId,
              name: file.name,
              size: file.size,
              type: file.type,
              url: response.url,
              uploadStatus: 'completed',
              uploadProgress: 100
            }

            setAttachments(prev => prev.map(att =>
              att.id === attachmentId ? completedAttachment : att
            ))

            const progressData: UploadProgress = {
              attachmentId,
              progress: 100,
              status: 'completed'
            }
            
            setUploadProgress(prev => new Map(prev).set(attachmentId, progressData))
            onUploadComplete?.(completedAttachment)

          } catch (error) {
            throw new Error('Invalid response format')
          }
        } else {
          throw new Error(`HTTP ${xhr.status}: ${xhr.statusText}`)
        }
      })

      // Handle errors
      xhr.addEventListener('error', () => {
        throw new Error('Network error occurred')
      })

      xhr.addEventListener('abort', () => {
        const progressData: UploadProgress = {
          attachmentId,
          progress: 0,
          status: 'cancelled'
        }
        
        setUploadProgress(prev => new Map(prev).set(attachmentId, progressData))
      })

      // Send request
      xhr.open('POST', uploadEndpoint)
      xhr.send(formData)

      // Handle abort signal
      controller.signal.addEventListener('abort', () => {
        xhr.abort()
      })

    } catch (error) {
      console.error(`Upload failed for ${attachmentId}:`, error)
      
      setAttachments(prev => prev.map(att =>
        att.id === attachmentId 
          ? { 
              ...att, 
              uploadStatus: 'failed', 
              error: error instanceof Error ? error.message : 'Upload failed' 
            }
          : att
      ))

      const progressData: UploadProgress = {
        attachmentId,
        progress: 0,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Upload failed'
      }
      
      setUploadProgress(prev => new Map(prev).set(attachmentId, progressData))
      onUploadError?.(attachmentId, error instanceof Error ? error : new Error('Upload failed'))

    } finally {
      uploadControllers.current.delete(attachmentId)
      
      // Check if any uploads are still in progress
      const stillUploading = Array.from(uploadControllers.current.values()).length > 0
      setIsUploading(stillUploading)
    }
  }, [uploadEndpoint, onUploadProgress, onUploadComplete, onUploadError])

  // Retry failed upload
  const retryUpload = useCallback(async (attachmentId: string) => {
    const attachment = attachments.find(att => att.id === attachmentId)
    if (!attachment || attachment.uploadStatus !== 'failed') return

    // We need to get the original file again - this is a limitation
    // In a real app, you might store file references or ask user to re-select
    console.warn('Retry upload requires file re-selection')
  }, [attachments])

  // Cancel upload
  const cancelUpload = useCallback((attachmentId: string) => {
    const controller = uploadControllers.current.get(attachmentId)
    if (controller) {
      controller.abort()
    }
  }, [])

  // Remove attachment
  const removeAttachment = useCallback((attachmentId: string) => {
    // Cancel upload if in progress
    cancelUpload(attachmentId)
    
    // Remove from list
    setAttachments(prev => prev.filter(att => att.id !== attachmentId))
    setUploadProgress(prev => {
      const newMap = new Map(prev)
      newMap.delete(attachmentId)
      return newMap
    })
  }, [cancelUpload])

  // Clear all attachments
  const clearAttachments = useCallback(() => {
    // Cancel all uploads
    uploadControllers.current.forEach(controller => controller.abort())
    uploadControllers.current.clear()
    
    setAttachments([])
    setUploadProgress(new Map())
    setIsUploading(false)
  }, [])

  // Check if ready to send (all uploads completed or failed)
  const canSend = useCallback(() => {
    if (attachments.length === 0) return true
    
    return attachments.every(att => 
      att.uploadStatus === 'completed' || att.uploadStatus === 'failed'
    )
  }, [attachments])

  // Get completed attachments for message
  const getCompletedAttachments = useCallback(() => {
    return attachments.filter(att => att.uploadStatus === 'completed')
  }, [attachments])

  // Handle drag and drop
  const handleDrop = useCallback(async (event: DragEvent) => {
    event.preventDefault()
    const files = event.dataTransfer?.files
    if (files && files.length > 0) {
      await addFiles(files)
    }
  }, [addFiles])

  const handleDragOver = useCallback((event: DragEvent) => {
    event.preventDefault()
  }, [])

  return {
    attachments,
    isUploading,
    uploadProgress,
    canSend: canSend(),
    addFiles,
    retryUpload,
    cancelUpload,
    removeAttachment,
    clearAttachments,
    getCompletedAttachments,
    handleDrop,
    handleDragOver,
    stats: {
      total: attachments.length,
      completed: attachments.filter(att => att.uploadStatus === 'completed').length,
      failed: attachments.filter(att => att.uploadStatus === 'failed').length,
      uploading: attachments.filter(att => att.uploadStatus === 'uploading').length,
      totalSize: attachments.reduce((sum, att) => sum + att.size, 0)
    }
  }
}