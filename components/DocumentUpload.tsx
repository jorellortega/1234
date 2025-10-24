'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, FileText, File, X, Loader2 } from 'lucide-react'
import { MemoryFormData } from '@/lib/types'

type DocumentUploadProps = {
  onDocumentProcessed: (memories: MemoryFormData[]) => void
  onCancel: () => void
}

type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'error'

export function DocumentUpload({ onDocumentProcessed, onCancel }: DocumentUploadProps) {
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      if (allowedTypes.includes(selectedFile.type)) {
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

      // Create FormData for file upload
      const formData = new FormData()
      formData.append('file', file)
      formData.append('filename', file.name)

      // Upload and process document
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
        onDocumentProcessed(result.memories)
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
          <h2 className="text-2xl font-bold text-cyan-400">IMPORT DOCUMENT</h2>
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
          {/* File Upload Area */}
          <div className="border-2 border-dashed border-cyan-500/30 rounded-lg p-8 text-center">
            {!file ? (
              <div>
                <Upload className="h-12 w-12 text-cyan-400 mx-auto mb-4" />
                <p className="text-lg text-cyan-400 mb-2">Drop your document here</p>
                <p className="text-gray-400 mb-4">or click to browse</p>
                <Button onClick={triggerFileInput} className="bg-cyan-600 hover:bg-cyan-700">
                  Select Document
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

          {/* Action Buttons */}
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
                'Process Document'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}








