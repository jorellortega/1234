'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { MemoryForm } from "@/components/MemoryForm"
import { cn } from "@/lib/utils"
import { Pencil, Trash2, FolderOpen } from "lucide-react"
import { Memory, MemoryFormData } from '@/lib/types'

type MemoryNodeProps = {
  memory: Memory
  side: "left" | "right"
  onUpdate?: () => void
  onDrillDown?: (memory: Memory) => void
  isDrillable?: boolean
}

export function MemoryNode({ memory, side, onUpdate, onDrillDown, isDrillable = false }: MemoryNodeProps) {
  const [showEditForm, setShowEditForm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  const salienceColor = memory.salience > 0.9 ? "bg-red-500" : memory.salience > 0.7 ? "bg-amber-500" : "bg-cyan-500"

  const handleEdit = async (memoryData: MemoryFormData) => {
    try {
      const response = await fetch(`/api/memories/${memory.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(memoryData),
      })

      if (!response.ok) {
        throw new Error('Failed to update memory')
      }

      setShowEditForm(false)
      if (onUpdate) {
        onUpdate()
      }
    } catch (error) {
      console.error('Error updating memory:', error)
      alert('Failed to update memory')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this memory? This action cannot be undone.')) {
      return
    }

    try {
      setIsDeleting(true)
      const response = await fetch(`/api/memories/${memory.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete memory')
      }

      if (onUpdate) {
        onUpdate()
      }
    } catch (error) {
      console.error('Error deleting memory:', error)
      alert('Failed to delete memory')
    } finally {
      setIsDeleting(false)
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'project': return '🚀'
      case 'idea': return '💡'
      case 'family_tree': return '👨‍👩‍👧‍👦'
      case 'question': return '❓'
      case 'general': return '📝'
      case 'vision_analysis': return '🖼️'
      case 'image_document': return '📷'
      case 'document': return '📄'
      default: return '📄'
    }
  }

  // Get document icon based on file type
  const getDocumentIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📕'
    if (fileType.includes('word') || fileType.includes('document')) return '📘'
    if (fileType.includes('text') || fileType.includes('txt')) return '📃'
    if (fileType.includes('image')) return '🖼️'
    return '📄'
  }

  // Extract image data from memory content
  const extractImageData = (memoryData: string) => {
    // Look for base64 image data in the memory content
    const base64Match = memoryData.match(/data:image\/[^;]+;base64,([^\\s]+)/)
    if (base64Match) {
      return base64Match[0]
    }
    
    // Look for storage URL in the memory content
    const urlMatch = memoryData.match(/Storage URL: (https?:\/\/[^\s\n]+)/)
    if (urlMatch) {
      return urlMatch[1]
    }
    
    return null
  }

  // Extract document file information from memory content
  const extractDocumentInfo = (memoryData: string) => {
    // Look for document filename in the memory content
    const filenameMatch = memoryData.match(/Filename: ([^\s\n]+)/)
    const fileTypeMatch = memoryData.match(/Type: ([^\s\n]+)/)
    const fileSizeMatch = memoryData.match(/Size: ([^\s\n]+)/)
    
    if (filenameMatch) {
      return {
        filename: filenameMatch[1],
        fileType: fileTypeMatch ? fileTypeMatch[1] : 'unknown',
        fileSize: fileSizeMatch ? fileSizeMatch[1] : 'unknown'
      }
    }
    
    return null
  }

  const hasImage = extractImageData(memory.data)
  const documentInfo = extractDocumentInfo(memory.data)
  const hasDocument = documentInfo && (memory.memory_category === 'document' || memory.concept.includes('Document'))

  return (
    <>
      <div className={cn("relative w-full flex", side === "left" ? "justify-start" : "justify-end")}>
        <div className="hidden md:block absolute left-1/2 -translate-x-1/2 top-8 h-0.5 w-1/2 bg-cyan-500/30" />
        <div className="hidden md:block absolute left-1/2 -translate-x-1/2 top-8 h-4 w-4 rounded-full bg-cyan-500 glow" />

        <div className="w-full md:w-[calc(50%-2rem)] aztec-panel backdrop-blur-sm p-4 group transition-all hover:border-cyan-400 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0 flex-1">
              <span className="text-xs text-cyan-600 font-mono break-all">{memory.timestamp}</span>
              <span className="text-xs text-cyan-400 break-words">
                {getCategoryIcon(memory.memory_category)} {memory.memory_category}
                {hasImage && <span className="ml-1 text-purple-400">🖼️</span>}
                {hasDocument && !hasImage && <span className="ml-1 text-blue-400">📄</span>}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-gray-400">SALIENCE</span>
              <div className={cn("h-2 w-2 rounded-full glow", salienceColor)} />
              <span className="font-bold text-white">{memory.salience.toFixed(2)}</span>
            </div>
          </div>

          <h4 className="text-lg font-bold text-green-400 mt-2 break-words">{memory.concept}</h4>
          
          {/* Image Thumbnail */}
          {hasImage && (
            <div className="mt-3 mb-3">
              <div className="relative inline-block">
                <img 
                  src={hasImage} 
                  alt="Memory image" 
                  className="w-20 h-20 object-cover rounded-lg border border-cyan-500/30 shadow-lg"
                  onError={(e) => {
                    // Hide image on error (e.g., if base64 is corrupted)
                    e.currentTarget.style.display = 'none'
                  }}
                />
                <div className="absolute -top-1 -right-1 bg-cyan-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  📷
                </div>
              </div>
            </div>
          )}

          {/* Document Thumbnail */}
          {hasDocument && !hasImage && (
            <div className="mt-3 mb-3">
              <div className="relative inline-block">
                <div className="w-20 h-20 bg-gradient-to-br from-cyan-900/50 to-blue-900/50 rounded-lg border border-cyan-500/30 shadow-lg flex items-center justify-center">
                  <span className="text-3xl">{getDocumentIcon(documentInfo.fileType)}</span>
                </div>
                <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  📄
                </div>
                <div className="absolute -bottom-1 -left-1 bg-cyan-900/80 text-cyan-300 text-xs px-2 py-1 rounded">
                  {documentInfo.fileType.split('/')[0]}
                </div>
              </div>
            </div>
          )}
          
          <p className="text-gray-300 mt-2 text-sm break-words overflow-wrap-anywhere">{memory.data}</p>

          <div className="mt-4 border-t border-cyan-500/20 pt-3">
            <p className="text-xs text-cyan-400 mb-2">CONNECTIONS:</p>
            <div className="flex flex-wrap gap-2">
              {memory.connections.map((tag) => (
                <span key={tag} className="text-xs bg-cyan-900/50 text-cyan-300 px-2 py-1 rounded break-words">
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {isDrillable && onDrillDown && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-blue-400 hover:text-blue-300 h-7 w-7"
                onClick={() => onDrillDown(memory)}
                title="Drill down into sub-memories"
              >
                <FolderOpen className="h-4 w-4" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-gray-400 hover:text-white h-7 w-7"
              onClick={() => setShowEditForm(true)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-red-500/70 hover:text-red-500 hover:bg-red-500/10 h-7 w-7"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {showEditForm && (
        <MemoryForm
          onSubmit={handleEdit}
          onCancel={() => setShowEditForm(false)}
          initialData={{
            concept: memory.concept,
            data: memory.data,
            salience: memory.salience,
            connections: memory.connections,
            memory_type: memory.memory_type,
            priority: memory.priority,
            memory_category: memory.memory_category,
            parent_id: memory.parent_id,
            hierarchy_level: memory.hierarchy_level
          }}
          isEditing={true}
        />
      )}
    </>
  )
}
