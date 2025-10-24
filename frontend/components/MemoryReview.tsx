'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { X, Check, Edit3, Save, Trash2 } from 'lucide-react'
import { MemoryFormData } from '@/lib/types'

type MemoryReviewProps = {
  memories: MemoryFormData[]
  onSave: (memories: MemoryFormData[]) => void
  onCancel: () => void
}

export function MemoryReview({ memories, onSave, onCancel }: MemoryReviewProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editedMemories, setEditedMemories] = useState<MemoryFormData[]>(memories)
  const [selectedMemories, setSelectedMemories] = useState<Set<number>>(new Set(Array.from({ length: memories.length }, (_, i) => i)))

  const handleEdit = (index: number) => {
    setEditingIndex(index)
  }

  const handleSaveEdit = (index: number) => {
    setEditingIndex(null)
  }

  const handleCancelEdit = () => {
    setEditingIndex(null)
    // Reset to original values
    setEditedMemories(memories)
  }

  const handleMemoryChange = (index: number, field: keyof MemoryFormData, value: any) => {
    const updatedMemories = [...editedMemories]
    updatedMemories[index] = { ...updatedMemories[index], [field]: value }
    setEditedMemories(updatedMemories)
  }

  const handleToggleMemory = (index: number) => {
    const newSelected = new Set(selectedMemories)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedMemories(newSelected)
  }

  const handleDeleteMemory = (index: number) => {
    const updatedMemories = editedMemories.filter((_, i) => i !== index)
    setEditedMemories(updatedMemories)
    
    // Update selected indices
    const newSelected = new Set<number>()
    selectedMemories.forEach(i => {
      if (i < index) {
        newSelected.add(i)
      } else if (i > index) {
        newSelected.add(i - 1)
      }
    })
    setSelectedMemories(newSelected)
  }

  const handleSaveSelected = () => {
    const selectedMemoriesList = editedMemories.filter((_, index) => selectedMemories.has(index))
    onSave(selectedMemoriesList)
  }

  const handleSelectAll = () => {
    if (selectedMemories.size === editedMemories.length) {
      setSelectedMemories(new Set())
    } else {
      setSelectedMemories(new Set(Array.from({ length: editedMemories.length }, (_, i) => i)))
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'project': return '🚀'
      case 'idea': return '💡'
      case 'family_tree': return '👨‍👩‍👧‍👦'
      case 'question': return '❓'
      case 'general': return '📝'
      default: return '📄'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-cyan-500/30 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-cyan-400">REVIEW EXTRACTED MEMORIES</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-4">
          {/* Header with controls */}
          <div className="flex justify-between items-center p-4 bg-gray-800/50 rounded-lg">
            <div className="flex items-center gap-4">
              <span className="text-cyan-400">
                {selectedMemories.size} of {editedMemories.length} memories selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
              >
                {selectedMemories.size === editedMemories.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            <Button
              onClick={handleSaveSelected}
              disabled={selectedMemories.size === 0}
              className="bg-gradient-to-r from-green-500/90 to-cyan-500/90 text-white font-bold hover:brightness-110"
            >
              <Save className="mr-2 h-4 w-4" />
              Save Selected ({selectedMemories.size})
            </Button>
          </div>

          {/* Memory list */}
          <div className="space-y-4">
            {editedMemories.map((memory, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 transition-all ${
                  selectedMemories.has(index)
                    ? 'border-cyan-500 bg-cyan-900/20'
                    : 'border-gray-600 bg-gray-800/50'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedMemories.has(index)}
                      onChange={() => handleToggleMemory(index)}
                      className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500"
                    />
                    <span className="text-cyan-400 font-medium">
                      {getCategoryIcon(memory.memory_category)} {memory.memory_category}
                    </span>
                    <span className="text-gray-400 text-sm">
                      Salience: {memory.salience.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {editingIndex === index ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleSaveEdit(index)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                          className="border-gray-500 text-gray-400 hover:bg-gray-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(index)}
                          className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteMemory(index)}
                          className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {editingIndex === index ? (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-cyan-400 text-sm">Concept</Label>
                      <Input
                        value={memory.concept}
                        onChange={(e) => handleMemoryChange(index, 'concept', e.target.value)}
                        className="mt-1 bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-cyan-400 text-sm">Data</Label>
                      <Textarea
                        value={memory.data}
                        onChange={(e) => handleMemoryChange(index, 'data', e.target.value)}
                        className="mt-1 bg-gray-700 border-gray-600 text-white min-h-[80px]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-cyan-400 text-sm">Salience</Label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={memory.salience}
                          onChange={(e) => handleMemoryChange(index, 'salience', parseFloat(e.target.value))}
                          className="mt-1 w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-xs text-gray-400">{memory.salience.toFixed(2)}</span>
                      </div>
                      <div>
                        <Label className="text-cyan-400 text-sm">Priority</Label>
                        <select
                          value={memory.priority}
                          onChange={(e) => handleMemoryChange(index, 'priority', parseInt(e.target.value))}
                          className="mt-1 w-full bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 text-sm"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h4 className="text-lg font-semibold text-green-400 mb-2">{memory.concept}</h4>
                    <p className="text-gray-300 text-sm mb-3">{memory.data}</p>
                    <div className="flex flex-wrap gap-2">
                      {memory.connections.map((tag, tagIndex) => (
                        <span key={tagIndex} className="text-xs bg-cyan-900/50 text-cyan-300 px-2 py-1 rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
            <Button
              variant="outline"
              onClick={onCancel}
              className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveSelected}
              disabled={selectedMemories.size === 0}
              className="bg-gradient-to-r from-green-500/90 to-cyan-500/90 text-white font-bold hover:brightness-110"
            >
              <Save className="mr-2 h-4 w-4" />
              Save Selected Memories
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}








