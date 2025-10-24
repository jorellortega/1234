// Shared types for the memory system
export type Memory = {
  id: string
  timestamp: string
  salience: number
  concept: string
  data: string
  connections: string[]
  memory_type: string
  priority: number
  memory_category: string
  parent_id?: string
  hierarchy_level: number
  sort_order: number
  created_at?: string
  updated_at?: string
  // Document reference fields
  document_id?: string
  document_filename?: string
  document_url?: string
}

export type MemoryCategory = 'all' | 'project' | 'idea' | 'family_tree' | 'question' | 'general'

export type MemoryFormData = {
  concept: string
  data: string
  salience: number
  connections: string[]
  memory_type: string
  priority: number
  memory_category: string
  parent_id?: string
  hierarchy_level: number
  // Document reference fields
  document_id?: string
  document_filename?: string
  document_url?: string
}

export type Document = {
  id: string
  filename: string
  original_name: string
  file_path: string
  file_url: string
  file_size: number
  file_type: string
  uploaded_at: string
  user_id?: string
  is_public: boolean
}


