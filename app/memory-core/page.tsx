'use client'

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { MemoryNode } from "@/components/memory-node"
import { MemoryForm } from "@/components/MemoryForm"
import { DocumentUpload } from "@/components/DocumentUpload"
import { MemoryReview } from "@/components/MemoryReview"
import { Home, PlusCircle, RefreshCw, FolderOpen, ArrowLeft, FileText } from "lucide-react"
import { useEffect, useState } from "react"
import { Memory, MemoryCategory, MemoryFormData } from '@/lib/types'
import { supabase } from '@/lib/supabase-client'

export default function MemoryCorePage() {
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showDocumentUpload, setShowDocumentUpload] = useState(false)
  const [showMemoryReview, setShowMemoryReview] = useState(false)
  const [extractedMemories, setExtractedMemories] = useState<MemoryFormData[]>([])
  const [selectedCategory, setSelectedCategory] = useState<MemoryCategory>('all')
  const [currentParent, setCurrentParent] = useState<Memory | null>(null)
  const [breadcrumb, setBreadcrumb] = useState<Memory[]>([])
  
  // Authentication state
  const [user, setUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)

  const fetchMemories = async (parentId?: string, category?: MemoryCategory) => {
    try {
      setLoading(true)
      setError(null)
      
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session')
      }
      
      let url = '/api/memories?'
      if (parentId) {
        url += `parent_id=${parentId}`
      } else {
        url += 'parent_id=null' // Get only root memories
      }
      
      if (category && category !== 'all') {
        url += `&category=${category}`
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      if (!response.ok) {
        throw new Error('Failed to fetch memories')
      }
      const data = await response.json()
      setMemories(data.memories || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching memories:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchRootMemories = async () => {
    setCurrentParent(null)
    setBreadcrumb([])
    await fetchMemories(undefined, selectedCategory)
  }

  const drillDownToMemory = async (memory: Memory) => {
    setCurrentParent(memory)
    setBreadcrumb([...breadcrumb, memory])
    await fetchMemories(memory.id, selectedCategory)
  }

  const goBack = async () => {
    if (breadcrumb.length > 0) {
      const newBreadcrumb = breadcrumb.slice(0, -1)
      const newParent = newBreadcrumb.length > 0 ? newBreadcrumb[newBreadcrumb.length - 1] : null
      
      setBreadcrumb(newBreadcrumb)
      setCurrentParent(newParent)
      
      if (newParent) {
        await fetchMemories(newParent.id, selectedCategory)
      } else {
        await fetchRootMemories()
      }
    }
  }

  const createMemory = async (memoryData: MemoryFormData) => {
    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session')
      }
      
      const response = await fetch('/api/memories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(memoryData),
      })

      if (!response.ok) {
        throw new Error('Failed to create memory')
      }

      // Refresh the memories list
      await fetchMemories(currentParent?.id, selectedCategory)
      setShowForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create memory')
      console.error('Error creating memory:', err)
    }
  }

  const handleDocumentProcessed = (memories: MemoryFormData[]) => {
    setExtractedMemories(memories)
    setShowDocumentUpload(false)
    setShowMemoryReview(true)
  }

  const handleSaveExtractedMemories = async (memories: MemoryFormData[]) => {
    try {
      // Save each extracted memory
      for (const memory of memories) {
        await createMemory(memory)
      }
      
      setShowMemoryReview(false)
      setExtractedMemories([])
      
      // Show success message
      setError(null)
    } catch (err) {
      setError('Failed to save some extracted memories')
      console.error('Error saving extracted memories:', err)
    }
  }

  const handleCategoryChange = async (category: MemoryCategory) => {
    setSelectedCategory(category)
    if (currentParent) {
      await fetchMemories(currentParent.id, category)
    } else {
      await fetchMemories(undefined, category)
    }
  }

  // Check authentication status
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
      } catch (error) {
        console.error('Error getting user:', error)
      } finally {
        setAuthLoading(false)
      }
    }

    getUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (user) {
      fetchRootMemories()
    }
  }, [user])

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      const cycle = Math.floor(Math.random() * 10) + 0.1 // Simulate cycle for demo
      return `CYCLE ${cycle.toFixed(1)} | ${date.toLocaleString()}`
    } catch {
      return timestamp
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'project': return '🚀'
      case 'idea': return '💡'
      case 'family_tree': return '👨‍👩‍👧‍👦'
      case 'question': return '❓'
      case 'general': return '📝'
      case 'conversation': return '💬'
      default: return '📄'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'project': return 'text-blue-400'
      case 'idea': return 'text-yellow-400'
      case 'family_tree': return 'text-green-400'
      case 'question': return 'text-purple-400'
      case 'general': return 'text-gray-400'
      case 'conversation': return 'text-cyan-400'
      default: return 'text-cyan-400'
    }
  }

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="relative min-h-screen w-full overflow-hidden">
        <div className="aztec-background" />
        <div className="animated-grid" />
        <div className="relative z-10 flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto"></div>
            <p className="text-cyan-400 mt-4">Loading Memory Core...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="relative min-h-screen w-full overflow-hidden">
        <div className="aztec-background" />
        <div className="animated-grid" />
        <div className="relative z-10 flex items-center justify-center h-screen">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-cyan-400 mb-4">MEMORY CORE</h1>
            <p className="text-cyan-300 mb-6">Authentication required to access Memory Core</p>
            <div className="flex gap-4 justify-center">
              <Link 
                href="/login"
                className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
              >
                Sign In
              </Link>
              <Link 
                href="/signup"
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Sign Up
              </Link>
              <Link 
                href="/"
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <div className="aztec-background" />
      <div className="animated-grid" />

      <div className="relative z-10 flex flex-col h-full p-4 md:p-6 lg:p-8">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h1 className="text-2xl md:text-3xl font-bold text-cyan-400 glow break-words">MEMORY CORE</h1>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/" className="flex items-center gap-1 sm:gap-2 text-cyan-400 hover:text-white transition-colors text-sm">
              <Home className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">Return to Core</span>
            </Link>
          </div>
        </header>

        {/* Breadcrumb Navigation */}
        {breadcrumb.length > 0 && (
          <div className="my-4 flex items-center gap-2 text-xs sm:text-sm overflow-x-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={goBack}
              className="text-cyan-400 hover:text-white flex-shrink-0"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <span className="text-gray-400 flex-shrink-0">/</span>
            {breadcrumb.map((memory, index) => (
              <div key={memory.id} className="flex items-center gap-2 flex-shrink-0">
                <span className={`${getCategoryColor(memory.memory_category)} font-medium truncate max-w-[150px]`}>
                  {getCategoryIcon(memory.memory_category)} {memory.concept}
                </span>
                {index < breadcrumb.length - 1 && <span className="text-gray-400">/</span>}
              </div>
            ))}
          </div>
        )}

        {/* Category Filter */}
        <div className="my-4">
          <div className="flex flex-wrap gap-2">
            {(['all', 'project', 'idea', 'question', 'general', 'conversation'] as MemoryCategory[]).map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => handleCategoryChange(category)}
                className={`${
                  selectedCategory === category 
                    ? 'bg-cyan-600 text-white' 
                    : 'border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10'
                }`}
              >
                {category !== 'all' && getCategoryIcon(category)} {category.charAt(0).toUpperCase() + category.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        <div className="my-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <Button 
              onClick={() => fetchMemories(currentParent?.id, selectedCategory)}
              disabled={loading}
              className="bg-gradient-to-r from-blue-500/90 to-cyan-500/90 text-white font-bold hover:brightness-110 hover:shadow-lg hover:shadow-cyan-400/50 rounded-lg px-4 py-2 text-xs sm:text-sm tracking-widest transition-all w-full sm:w-auto"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              REFRESH
            </Button>
            {loading && <span className="text-cyan-400 text-xs sm:text-sm">Loading memories...</span>}
            {error && <span className="text-red-400 text-xs sm:text-sm break-words">Error: {error}</span>}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            <Button 
              onClick={() => setShowDocumentUpload(true)}
              className="bg-gradient-to-r from-purple-500/90 to-blue-500/90 text-white font-bold hover:brightness-110 hover:shadow-lg hover:shadow-blue-400/50 rounded-lg px-4 py-2 text-xs sm:text-sm tracking-widest transition-all w-full sm:w-auto"
            >
              <FileText className="mr-2 h-4 w-4" />
              IMPORT DOC
            </Button>
            <Button 
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-green-500/90 to-cyan-500/90 text-white font-bold hover:brightness-110 hover:shadow-lg hover:shadow-cyan-400/50 rounded-lg px-4 sm:px-6 py-2 text-xs sm:text-md tracking-widest transition-all w-full sm:w-auto"
            >
              <PlusCircle className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              IMPLANT MEMORY
            </Button>
          </div>
        </div>

        <main className="w-full max-w-4xl mx-auto">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto"></div>
              <p className="text-cyan-400 mt-4">Loading memory core...</p>
            </div>
          ) : memories.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-cyan-400 text-lg">
                {currentParent ? 'No sub-memories found.' : 'No memories found in the core.'}
              </p>
              <p className="text-gray-400 text-sm mt-2">
                {currentParent ? 'Create sub-memories to expand this project.' : 'Create your first memory to begin.'}
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* Central Spine - hidden on mobile */}
              <div className="hidden md:block absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-0.5 bg-cyan-500/30 glow" />

              <div className="space-y-6 md:space-y-12">
                {memories.map((memory, index) => (
                  <MemoryNode 
                    key={memory.id} 
                    memory={{
                      ...memory,
                      timestamp: formatTimestamp(memory.created_at || memory.timestamp)
                    }} 
                    side={index % 2 === 0 ? "left" : "right"} 
                    onUpdate={() => fetchMemories(currentParent?.id, selectedCategory)}
                    onDrillDown={drillDownToMemory}
                    isDrillable={memory.hierarchy_level === 0}
                  />
                ))}
              </div>
            </div>
          )}
        </main>

        <footer className="text-center text-cyan-800 text-xs mt-12">
          <p>INTERFACE © 2025. UNAUTHORIZED ACCESS IS PROHIBITED.</p>
        </footer>

        {showForm && (
          <MemoryForm
            onSubmit={createMemory}
            onCancel={() => setShowForm(false)}
            availableParents={currentParent ? [currentParent] : memories.filter(m => m.hierarchy_level === 0)}
          />
        )}

        {showDocumentUpload && (
          <DocumentUpload
            onDocumentProcessed={handleDocumentProcessed}
            onCancel={() => setShowDocumentUpload(false)}
          />
        )}

        {showMemoryReview && (
          <MemoryReview
            memories={extractedMemories}
            onSave={handleSaveExtractedMemories}
            onCancel={() => {
              setShowMemoryReview(false)
              setExtractedMemories([])
            }}
          />
        )}
      </div>
    </div>
  )
}
