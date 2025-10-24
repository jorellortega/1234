'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { X, Plus, FolderOpen } from 'lucide-react'
import { Memory, MemoryFormData } from '@/lib/types'

type MemoryFormProps = {
  onSubmit: (memory: MemoryFormData) => void
  onCancel: () => void
  initialData?: MemoryFormData
  isEditing?: boolean
  availableParents?: Memory[]
}

export function MemoryForm({ 
  onSubmit, 
  onCancel, 
  initialData, 
  isEditing = false,
  availableParents = []
}: MemoryFormProps) {
  const [concept, setConcept] = useState(initialData?.concept || '')
  const [data, setData] = useState(initialData?.data || '')
  const [salience, setSalience] = useState(initialData?.salience || 0.5)
  const [connections, setConnections] = useState<string[]>(initialData?.connections || [])
  const [newConnection, setNewConnection] = useState('')
  const [memoryType, setMemoryType] = useState(initialData?.memory_type || 'core')
  const [priority, setPriority] = useState(initialData?.priority || 1)
  const [memoryCategory, setMemoryCategory] = useState(initialData?.memory_category || 'general')
  const [parentId, setParentId] = useState<string | undefined>(initialData?.parent_id)
  const [hierarchyLevel, setHierarchyLevel] = useState(initialData?.hierarchy_level || 0)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!concept.trim() || !data.trim()) return

    onSubmit({
      concept: concept.trim(),
      data: data.trim(),
      salience,
      connections: connections.filter(c => c.trim()),
      memory_type: memoryType,
      priority,
      memory_category: memoryCategory,
      parent_id: parentId,
      hierarchy_level: hierarchyLevel
    })
  }

  const addConnection = () => {
    if (newConnection.trim() && !connections.includes(newConnection.trim())) {
      setConnections([...connections, newConnection.trim()])
      setNewConnection('')
    }
  }

  const removeConnection = (index: number) => {
    setConnections(connections.filter((_, i) => i !== index))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addConnection()
    }
  }

  const handleParentChange = (newParentId: string | undefined) => {
    setParentId(newParentId)
    if (newParentId) {
      const parent = availableParents.find(p => p.id === newParentId)
      if (parent) {
        setHierarchyLevel(parent.hierarchy_level + 1)
        setMemoryCategory(parent.memory_category)
      }
    } else {
      setHierarchyLevel(0)
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
      <div className="bg-gray-900 border border-cyan-500/30 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-cyan-400">
            {isEditing ? 'EDIT MEMORY' : 'IMPLANT MEMORY'}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="concept" className="text-cyan-400 font-semibold">
              CONCEPT
            </Label>
            <Input
              id="concept"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="Enter memory concept..."
              className="mt-2 bg-gray-800 border-cyan-500/30 text-white placeholder:text-gray-500"
              required
            />
          </div>

          <div>
            <Label htmlFor="data" className="text-cyan-400 font-semibold">
              MEMORY DATA
            </Label>
            <Textarea
              id="data"
              value={data}
              onChange={(e) => setData(e.target.value)}
              placeholder="Enter detailed memory data..."
              className="mt-2 bg-gray-800 border-cyan-500/30 text-white placeholder:text-gray-500 min-h-[100px]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="salience" className="text-cyan-400 font-semibold">
                SALIENCE ({salience.toFixed(2)})
              </Label>
              <input
                type="range"
                id="salience"
                min="0"
                max="1"
                step="0.01"
                value={salience}
                onChange={(e) => setSalience(parseFloat(e.target.value))}
                className="mt-2 w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>

            <div>
              <Label htmlFor="priority" className="text-cyan-400 font-semibold">
                PRIORITY
              </Label>
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value))}
                className="mt-2 w-full bg-gray-800 border border-cyan-500/30 text-white rounded-md px-3 py-2"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="memoryType" className="text-cyan-400 font-semibold">
                MEMORY TYPE
              </Label>
              <select
                id="memoryType"
                value={memoryType}
                onChange={(e) => setMemoryType(e.target.value)}
                className="mt-2 w-full bg-gray-800 border border-cyan-500/30 text-white rounded-md px-3 py-2"
              >
                <option value="core">Core</option>
                <option value="episodic">Episodic</option>
                <option value="semantic">Semantic</option>
                <option value="procedural">Procedural</option>
              </select>
            </div>

            <div>
              <Label htmlFor="memoryCategory" className="text-cyan-400 font-semibold">
                CATEGORY
              </Label>
              <select
                id="memoryCategory"
                value={memoryCategory}
                onChange={(e) => setMemoryCategory(e.target.value)}
                className="mt-2 w-full bg-gray-800 border border-cyan-500/30 text-white rounded-md px-3 py-2"
              >
                <option value="general">General</option>
                <option value="project">Project</option>
                <option value="idea">Idea</option>
                <option value="family_tree">Family Tree</option>
                <option value="question">Question</option>
              </select>
            </div>
          </div>

          {availableParents.length > 0 && (
            <div>
              <Label htmlFor="parentId" className="text-cyan-400 font-semibold flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                PARENT MEMORY (Optional)
              </Label>
              <select
                id="parentId"
                value={parentId || ''}
                onChange={(e) => handleParentChange(e.target.value || undefined)}
                className="mt-2 w-full bg-gray-800 border border-cyan-500/30 text-white rounded-md px-3 py-2"
              >
                <option value="">No parent (Root memory)</option>
                {availableParents.map(parent => (
                  <option key={parent.id} value={parent.id}>
                    {getCategoryIcon(parent.memory_category)} {parent.concept}
                  </option>
                ))}
              </select>
              {parentId && (
                <p className="text-xs text-cyan-400 mt-1">
                  This will be a sub-memory of the selected parent
                </p>
              )}
            </div>
          )}

          <div>
            <Label className="text-cyan-400 font-semibold">
              CONNECTIONS
            </Label>
            <div className="mt-2 flex gap-2">
              <Input
                value={newConnection}
                onChange={(e) => setNewConnection(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Add connection tag..."
                className="bg-gray-800 border-cyan-500/30 text-white placeholder:text-gray-500"
              />
              <Button
                type="button"
                onClick={addConnection}
                className="bg-cyan-600 hover:bg-cyan-700 text-white px-3"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {connections.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {connections.map((connection, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 bg-cyan-900/50 text-cyan-300 px-2 py-1 rounded text-sm"
                  >
                    #{connection}
                    <button
                      type="button"
                      onClick={() => removeConnection(index)}
                      className="text-cyan-400 hover:text-red-400"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
            >
              CANCEL
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-green-500/90 to-cyan-500/90 text-white font-bold hover:brightness-110"
            >
              {isEditing ? 'UPDATE MEMORY' : 'IMPLANT MEMORY'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
