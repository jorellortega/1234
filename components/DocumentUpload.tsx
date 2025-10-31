'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, FileText, File, X, Loader2 } from 'lucide-react'
import { MemoryFormData } from '@/lib/types'

type DocumentUploadProps = {
  onDocumentProcessed?: (memories: MemoryFormData[]) => void
  onCancel: () => void
  onProcessAndSave?: (file: File) => Promise<void>
}

type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'error'

export function DocumentUpload({ onDocumentProcessed, onCancel, onProcessAndSave }: DocumentUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain'
  ]

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      if (allowedTypes.includes(selectedFile.type)) {
        // If onProcessAndSave is provided, use the same flow as drag/drop - process immediately
        if (onProcessAndSave) {
          try {
            setProcessingStatus('uploading')
            setProgress(0)
            setFile(selectedFile)
            setError(null)
            
            // Call the exact same function that drag/drop uses
            await onProcessAndSave(selectedFile)
            
            // Close modal after processing (same as drag/drop - no button needed)
            onCancel()
            return
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to process document')
            setProcessingStatus('error')
            return
          }
        }
        
        // Otherwise use old flow with review modal
        setFile(selectedFile)
        setError(null)
      } else {
        setError('Please select a valid PDF, Word document, or text file.')
        setFile(null)
      }
    }
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return <FileText className="h-8 w-8 text-red-500" />
    if (fileType.includes('word') || fileType.includes('document')) return <File className="h-8 w-8 text-blue-500" />
    return <FileText className="h-8 w-8 text-gray-500" />
  }

  const getFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const processDocument = async () => {
    if (!file) return

    try {
      setProcessingStatus('uploading')
      setProgress(0)

      // If onProcessAndSave is provided, use the same flow as drag/drop
      if (onProcessAndSave) {
        await onProcessAndSave(file)
        setProcessingStatus('completed')
        setProgress(100)
        onCancel() // Close modal after processing
        return
      }

      // Otherwise, use the old flow with review modal
      const formData = new FormData()
      formData.append('file', file)
      formData.append('filename', file.name)

      const response = await fetch('/api/documents/process', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to process document')
      }

      setProcessingStatus('processing')
      setProgress(50)

      const result = await response.json()
      
      if (result.memories && result.memories.length > 0) {
        setProgress(100)
        setProcessingStatus('completed')
        
        // Pass the extracted memories to parent component
        if (onDocumentProcessed) {
        onDocumentProcessed(result.memories)
        }
      } else {
        throw new Error('No memories extracted from document')
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process document')
      setProcessingStatus('error')
    }
  }

  const removeFile = () => {
    setFile(null)
    setError(null)
    setProgress(0)
    setProcessingStatus('idle')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-cyan-500/30 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-cyan-400">IMPORT FILE</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-6">
          {/* File Upload Area - Clickable on mobile too */}
          <div 
            className="border-2 border-dashed border-cyan-500/30 rounded-lg p-8 text-center cursor-pointer hover:border-cyan-500/50 transition-colors"
            onClick={triggerFileInput}
            onDragOver={(e) => {
              e.preventDefault()
              e.currentTarget.classList.add('border-cyan-500')
            }}
            onDragLeave={(e) => {
              e.preventDefault()
              e.currentTarget.classList.remove('border-cyan-500')
            }}
            onDrop={async (e) => {
              e.preventDefault()
              e.currentTarget.classList.remove('border-cyan-500')
              const files = e.dataTransfer.files
              if (files.length > 0) {
                const droppedFile = files[0]
                if (allowedTypes.includes(droppedFile.type)) {
                  // If onProcessAndSave is provided, process immediately like drag/drop
                  if (onProcessAndSave) {
                    try {
                      setProcessingStatus('uploading')
                      setProgress(0)
                      setError(null)
                      await onProcessAndSave(droppedFile)
                      onCancel()
                      return
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Failed to process document')
                      setProcessingStatus('error')
                      return
                    }
                  }
                  // Otherwise use old flow
                  setFile(droppedFile)
                  setError(null)
                } else {
                  setError('Please select a valid PDF, Word document, or text file.')
                }
              }
            }}
          >
            {!file ? (
              <div>
                <Upload className="h-12 w-12 text-cyan-400 mx-auto mb-4" />
                <p className="text-lg text-cyan-400 mb-2">Drop your file here</p>
                <p className="text-gray-400 mb-4">or click to browse</p>
                <Button 
                  onClick={(e) => {
                    e.stopPropagation()
                    triggerFileInput()
                  }} 
                  className="bg-cyan-600 hover:bg-cyan-700"
                >
                  Select File
                </Button>
                <p className="text-xs text-gray-500 mt-2">
                  Supports PDF, Word (.docx, .doc), and text files
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-4">
                {getFileIcon(file.type)}
                <div className="text-left">
                  <p className="text-cyan-400 font-medium">{file.name}</p>
                  <p className="text-gray-400 text-sm">{getFileSize(file.size)}</p>
                  <p className="text-gray-400 text-sm">{file.type}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={removeFile}
                  className="text-red-400 hover:text-red-300"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Error Display */}
          {error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Progress Bar */}
          {processingStatus === 'uploading' || processingStatus === 'processing' ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-cyan-400">
                  {processingStatus === 'uploading' ? 'Uploading...' : 'Processing with AI...'}
                </span>
                <span className="text-gray-400">{progress}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : null}

          {/* Action Buttons - Only show if using old flow (no auto-process) */}
          {!onProcessAndSave && (
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={onCancel}
                className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
              >
                Cancel
              </Button>
              <Button
                onClick={processDocument}
                disabled={!file || processingStatus === 'uploading' || processingStatus === 'processing'}
                className="bg-gradient-to-r from-green-500/90 to-cyan-500/90 text-white font-bold hover:brightness-110"
              >
                {processingStatus === 'uploading' || processingStatus === 'processing' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {processingStatus === 'uploading' ? 'Uploading...' : 'Processing...'}
                  </>
                ) : (
                  'Process File'
                )}
              </Button>
            </div>
          )}
          
          {/* Show only Cancel button when auto-processing (matches drag/drop behavior) */}
          {onProcessAndSave && processingStatus === 'idle' && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={onCancel}
                className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}








