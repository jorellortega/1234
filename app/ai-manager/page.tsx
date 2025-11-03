"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { 
  Bot, 
  Settings, 
  ListTodo, 
  FileText, 
  Plus, 
  Trash2, 
  Edit, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Loader2,
  Sparkles,
  Save,
  X,
  ArrowLeft,
  Info
} from "lucide-react"
import { supabase } from "@/lib/supabase-client"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

interface Rule {
  id: string
  rule_name: string
  rule_type: string
  rule_content: string
  description?: string
  scope: string
  page_path?: string
  priority: number
  is_active: boolean
  applies_to: string[]
}

interface Task {
  id: string
  intent_id?: string
  task_title: string
  task_description?: string
  task_type: string
  ai_service?: string
  ai_model?: string
  task_params?: any
  status: string
  priority: number
  order_index: number
  depends_on_task_id?: string
  execution_result?: any
  error_message?: string
  started_at?: string
  completed_at?: string
}

interface Intent {
  id: string
  user_prompt: string
  detected_intent: string
  intent_category: string
  confidence_score: number
  extracted_params?: any
  created_at: string
}

interface Context {
  id: string
  context_key: string
  context_value: any
  context_type: string
  scope: string
  importance: number
}

export default function AIManagerPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("prompt")
  
  // LLM Model selection state
  const [selectedLLMModel, setSelectedLLMModel] = useState<string>("gpt-4o")
  const [adminPreferences, setAdminPreferences] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  
  // Prompt window state
  const [prompt, setPrompt] = useState("")
  const [processingPrompt, setProcessingPrompt] = useState(false)
  const [useAIProcessing, setUseAIProcessing] = useState(true) // Enable AI processing by default
  const [allowAIQuestions, setAllowAIQuestions] = useState(true) // Allow AI to ask questions by default
  const [currentIntent, setCurrentIntent] = useState<Intent | null>(null)
  const [generatedTasks, setGeneratedTasks] = useState<Task[]>([])
  const [pendingQuestions, setPendingQuestions] = useState<any[]>([])
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({})
  
  // Rules state
  const [rules, setRules] = useState<Rule[]>([])
  const [loadingRules, setLoadingRules] = useState(false)
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<Rule | null>(null)
  const [ruleForm, setRuleForm] = useState({
    rule_name: "",
    rule_type: "guideline",
    rule_content: "",
    description: "",
    scope: "global",
    page_path: "",
    priority: 5,
    is_active: true,
    applies_to: ["all"]
  })
  
  // Context state
  const [context, setContext] = useState<Context[]>([])
  const [loadingContext, setLoadingContext] = useState(false)
  const [contextDialogOpen, setContextDialogOpen] = useState(false)
  const [contextForm, setContextForm] = useState({
    context_key: "",
    context_value: "",
    context_type: "preference",
    scope: "global",
    importance: 5
  })
  
  const { toast } = useToast()

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (user) {
      fetchRules()
      fetchContext()
      fetchAdminPreferences()
      checkAdminStatus()
    }
  }, [user])

  useEffect(() => {
    // Load saved LLM model from context
    const savedModelContext = context.find(c => c.context_key === 'ai_manager_llm_model')
    if (savedModelContext) {
      const modelValue = typeof savedModelContext.context_value === 'string' 
        ? savedModelContext.context_value 
        : savedModelContext.context_value?.model || savedModelContext.context_value
      if (modelValue) {
        setSelectedLLMModel(modelValue)
      }
    }
  }, [context])

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to access AI Manager",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error checking auth:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRules = async () => {
    try {
      setLoadingRules(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch('/api/ai-manager/rules', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setRules(data.rules || [])
      }
    } catch (error) {
      console.error('Error fetching rules:', error)
      toast({
        title: "Error",
        description: "Failed to fetch rules",
        variant: "destructive"
      })
    } finally {
      setLoadingRules(false)
    }
  }

  const fetchContext = async () => {
    try {
      setLoadingContext(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch('/api/ai-manager/context', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setContext(data.context || [])
      }
    } catch (error) {
      console.error('Error fetching context:', error)
    } finally {
      setLoadingContext(false)
    }
  }

  const checkAdminStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch('/api/admin/check-role', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setIsAdmin(data.isAdmin || false)
      }
    } catch (error) {
      console.error('Error checking admin status:', error)
    }
  }

  const fetchAdminPreferences = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch('/api/admin/preferences', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setAdminPreferences(data.preferences)
      }
    } catch (error) {
      console.error('Error fetching admin preferences:', error)
    }
  }

  const isModelEnabled = (modelKey: string) => {
    if (isAdmin) return true
    if (!adminPreferences) return true
    return adminPreferences[`model_${modelKey}`] !== false
  }

  const handleModelChange = async (model: string) => {
    setSelectedLLMModel(model)
    
    // Save to context
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch('/api/ai-manager/context', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          context_key: 'ai_manager_llm_model',
          context_value: model,
          context_type: 'preference',
          scope: 'global',
          importance: 8
        })
      })

      if (response.ok) {
        await fetchContext()
        toast({
          title: "Model Updated",
          description: `Using ${model.toUpperCase()} for AI Manager`,
        })
      }
    } catch (error) {
      console.error('Error saving model preference:', error)
    }
  }

  const handlePromptSubmit = async () => {
    if (!prompt.trim() || !user) return

    try {
      setProcessingPrompt(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toast({
          title: "Error",
          description: "Please log in",
          variant: "destructive"
        })
        return
      }

      // Generate tasks from prompt
      const response = await fetch('/api/ai-manager/generate-tasks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          user_prompt: prompt,
          use_llm: useAIProcessing,
          llm_model: selectedLLMModel,
          allow_questions: allowAIQuestions
        })
      })

      if (response.ok) {
        const data = await response.json()
        setCurrentIntent(data.intent)
        setGeneratedTasks(data.tasks || [])
        
        // Handle questions if clarification is needed
        if (data.needs_clarification && data.questions && data.questions.length > 0) {
          // Use actual database IDs from the API response (they should have UUIDs)
          // Only use fallback IDs if absolutely necessary (shouldn't happen if API works correctly)
          const questionsWithIds = data.questions.map((q: any, idx: number) => {
            // API should return questions with database UUIDs - verify they're valid UUIDs
            if (q.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q.id)) {
              return q // Valid UUID, use as-is
            }
            // Invalid or missing ID - log warning and create fallback
            console.warn(`Question ${idx} missing valid UUID:`, q)
            return {
              ...q,
              id: `temp-${Date.now()}-${idx}` // Temporary ID, but this shouldn't be used for API calls
            }
          })
          setPendingQuestions(questionsWithIds)
          // Clear any previous answers
          setQuestionAnswers({})
          toast({
            title: "Clarification Needed",
            description: `Please answer ${questionsWithIds.length} question(s) to proceed`,
          })
        } else {
          setPendingQuestions([])
          setQuestionAnswers({}) // Clear answers when no questions
          toast({
            title: "Tasks Generated",
            description: `Generated ${data.tasks?.length || 0} tasks from your prompt`,
          })
        }
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to generate tasks",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error processing prompt:', error)
      toast({
        title: "Error",
        description: "Failed to process prompt",
        variant: "destructive"
      })
    } finally {
      setProcessingPrompt(false)
    }
  }

  const handleSaveRule = async () => {
    if (!ruleForm.rule_name || !ruleForm.rule_content) {
      toast({
        title: "Error",
        description: "Rule name and content are required",
        variant: "destructive"
      })
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const url = '/api/ai-manager/rules'
      const method = editingRule ? 'PUT' : 'POST'
      const body = editingRule
        ? { id: editingRule.id, ...ruleForm }
        : ruleForm

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      if (response.ok) {
        await fetchRules()
        setRuleDialogOpen(false)
        setEditingRule(null)
        setRuleForm({
          rule_name: "",
          rule_type: "guideline",
          rule_content: "",
          description: "",
          scope: "global",
          page_path: "",
          priority: 5,
          is_active: true,
          applies_to: ["all"]
        })
        toast({
          title: "Success",
          description: editingRule ? "Rule updated" : "Rule created",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to save rule",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error saving rule:', error)
      toast({
        title: "Error",
        description: "Failed to save rule",
        variant: "destructive"
      })
    }
  }

  const handleDeleteRule = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch(`/api/ai-manager/rules?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        await fetchRules()
        toast({
          title: "Success",
          description: "Rule deleted",
        })
      }
    } catch (error) {
      console.error('Error deleting rule:', error)
      toast({
        title: "Error",
        description: "Failed to delete rule",
        variant: "destructive"
      })
    }
  }

  const handleSaveContext = async () => {
    if (!contextForm.context_key || !contextForm.context_value) {
      toast({
        title: "Error",
        description: "Context key and value are required",
        variant: "destructive"
      })
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      // Try to parse context_value as JSON, otherwise store as string
      let contextValue
      try {
        contextValue = JSON.parse(contextForm.context_value)
      } catch {
        contextValue = contextForm.context_value
      }

      const response = await fetch('/api/ai-manager/context', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...contextForm,
          context_value: contextValue
        })
      })

      if (response.ok) {
        await fetchContext()
        setContextDialogOpen(false)
        setContextForm({
          context_key: "",
          context_value: "",
          context_type: "preference",
          scope: "global",
          importance: 5
        })
        toast({
          title: "Success",
          description: "Context saved",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to save context",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error saving context:', error)
      toast({
        title: "Error",
        description: "Failed to save context",
        variant: "destructive"
      })
    }
  }

  const handleAnswerQuestion = async (questionId: string, answer: string) => {
    try {
      // Validate UUID format
      if (!questionId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(questionId)) {
        toast({
          title: "Error",
          description: "Invalid question ID. Please refresh the page.",
          variant: "destructive"
        })
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch('/api/ai-manager/questions', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: questionId,
          answer: answer.trim()
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to save answer')
      }

      if (response.ok) {
        const data = await response.json()
        // Clear the answer from state for this question
        setQuestionAnswers(prev => {
          const updated = { ...prev }
          delete updated[questionId]
          return updated
        })
        
        // Update question in list (use actual database ID from response)
        setPendingQuestions(prev => prev.map(q => q.id === questionId ? data.question : q))
        
        // Check if all required questions are answered, then regenerate tasks
        const updated = pendingQuestions.map(q => q.id === questionId ? data.question : q)
        const allRequiredAnswered = updated
          .filter(q => q.is_required)
          .every(q => q.status === 'answered')
        
        if (allRequiredAnswered && currentIntent) {
          // Save answers to context for future use
          const answersContext = updated
            .filter(q => q.status === 'answered' && q.answer)
            .map(q => ({ field: q.related_field || 'answer', value: q.answer }))
          
          // Regenerate tasks with the answers
          const regenerateResponse = await fetch('/api/ai-manager/generate-tasks', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
              intent_id: currentIntent.id,
              use_llm: useAIProcessing,
              llm_model: selectedLLMModel,
              answers: answersContext,
              allow_questions: allowAIQuestions
            })
          })

          if (regenerateResponse.ok) {
            const regenerateData = await regenerateResponse.json()
            setGeneratedTasks(regenerateData.tasks || [])
            setPendingQuestions(regenerateData.questions || [])
            toast({
              title: "Tasks Generated",
              description: `Generated ${regenerateData.tasks?.length || 0} tasks with your answers`,
            })
          }
        } else {
          toast({
            title: "Answer Saved",
            description: "Your answer has been saved",
          })
        }
      }
    } catch (error) {
      console.error('Error answering question:', error)
      toast({
        title: "Error",
        description: "Failed to save answer",
        variant: "destructive"
      })
    }
  }

  const handleTaskStatusUpdate = async (taskId: string, newStatus: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch('/api/ai-manager/tasks', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: taskId,
          status: newStatus
        })
      })

      if (response.ok) {
        const data = await response.json()
        setGeneratedTasks(prev => prev.map(t => t.id === taskId ? data.task : t))
      }
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className="text-cyan-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-cyan-400 mb-4">Authentication Required</h1>
          <p className="text-gray-400 mb-6">Please log in to access AI Manager</p>
          <Link href="/login">
            <Button className="bg-cyan-600 hover:bg-cyan-700">
              Go to Login
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-400 mb-4">Access Denied</h1>
          <p className="text-gray-400 mb-6">AI Manager is restricted to administrators only</p>
          <Link href="/">
            <Button className="bg-cyan-600 hover:bg-cyan-700">
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Homepage
          </Link>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Bot className="h-8 w-8 text-cyan-400" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                AI Manager
              </h1>
            </div>
            {/* LLM Model Selector */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Label htmlFor="llm-model" className="text-sm text-gray-400 whitespace-nowrap">
                  LLM Model:
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-gray-500 hover:text-cyan-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-gray-800 border-cyan-500/50 text-white max-w-xs">
                      <p className="font-semibold mb-1">LLM Model Selector</p>
                      <p className="text-xs">Select which AI model to use for processing prompts and generating tasks. The selected model will intelligently analyze your requests, apply rules, and create task lists. Your preference is saved automatically.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select value={selectedLLMModel} onValueChange={handleModelChange}>
                <SelectTrigger 
                  id="llm-model"
                  className="w-[200px] bg-gray-900 border-cyan-500/50 text-cyan-300 hover:border-cyan-400 focus:border-cyan-400"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-cyan-500/50 backdrop-blur-md max-h-[400px] overflow-y-auto">
                  {/* OpenAI GPT Models */}
                  {isModelEnabled('gpt-4o') && (
                    <SelectItem value="gpt-4o" className="text-cyan-300 hover:bg-cyan-500/20">
                      GPT-4O {isAdmin && '- $2.50/$10'}
                    </SelectItem>
                  )}
                  {isModelEnabled('gpt-4o-mini') && (
                    <SelectItem value="gpt-4o-mini" className="text-cyan-300 hover:bg-cyan-500/20">
                      GPT-4O MINI {isAdmin && '- $0.15/$0.60'}
                    </SelectItem>
                  )}
                  {isModelEnabled('gpt-4-turbo') && (
                    <SelectItem value="gpt-4-turbo" className="text-cyan-300 hover:bg-cyan-500/20">
                      GPT-4 TURBO {isAdmin && '- $10/$30'}
                    </SelectItem>
                  )}
                  {isModelEnabled('gpt-4') && (
                    <SelectItem value="gpt-4" className="text-cyan-300 hover:bg-cyan-500/20">
                      GPT-4 {isAdmin && '- $30/$60'}
                    </SelectItem>
                  )}
                  {isModelEnabled('gpt-3.5-turbo') && (
                    <SelectItem value="gpt-3.5-turbo" className="text-cyan-300 hover:bg-cyan-500/20">
                      GPT-3.5 TURBO {isAdmin && '- $0.50/$1.50'}
                    </SelectItem>
                  )}
                  {/* OpenAI Reasoning Models */}
                  {isModelEnabled('o1') && (
                    <SelectItem value="o1" className="text-cyan-300 hover:bg-cyan-500/20">
                      O1 (REASONING) {isAdmin && '- $15/$60'}
                    </SelectItem>
                  )}
                  {isModelEnabled('o1-mini') && (
                    <SelectItem value="o1-mini" className="text-cyan-300 hover:bg-cyan-500/20">
                      O1-MINI {isAdmin && '- $3/$12'}
                    </SelectItem>
                  )}
                  {isModelEnabled('o1-preview') && (
                    <SelectItem value="o1-preview" className="text-cyan-300 hover:bg-cyan-500/20">
                      O1-PREVIEW {isAdmin && '- $15/$60'}
                    </SelectItem>
                  )}
                  {/* Local Models */}
                  {isModelEnabled('llama') && (
                    <SelectItem value="llama" className="text-cyan-300 hover:bg-cyan-500/20">
                      ZEPHYR (Local) {isAdmin && '- FREE'}
                    </SelectItem>
                  )}
                  {isModelEnabled('mistral') && (
                    <SelectItem value="mistral" className="text-cyan-300 hover:bg-cyan-500/20">
                      MAESTRO (Local) {isAdmin && '- FREE'}
                    </SelectItem>
                  )}
                  {/* Legacy shortcuts */}
                  {isModelEnabled('openai') && (
                    <SelectItem value="openai" className="text-cyan-300 hover:bg-cyan-500/20">
                      AiO (GPT-3.5) {isAdmin && '- $0.50/$1.50'}
                    </SelectItem>
                  )}
                  {isModelEnabled('gpt') && (
                    <SelectItem value="gpt" className="text-cyan-300 hover:bg-cyan-500/20">
                      GPT (GPT-4) {isAdmin && '- $30/$60'}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <Badge variant="outline" className="bg-cyan-900/30 border-cyan-500/50 text-cyan-300">
                {selectedLLMModel.toUpperCase()}
              </Badge>
            </div>
          </div>
          <p className="text-gray-400">
            Manage AI tasks, rules, and context for intelligent automation
          </p>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-gray-900 border border-gray-800">
            <TabsTrigger value="prompt" className="data-[state=active]:bg-cyan-600">
              <Sparkles className="h-4 w-4 mr-2" />
              Prompt Test
            </TabsTrigger>
            <TabsTrigger value="tasks" className="data-[state=active]:bg-cyan-600">
              <ListTodo className="h-4 w-4 mr-2" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="rules" className="data-[state=active]:bg-cyan-600">
              <Settings className="h-4 w-4 mr-2" />
              Rules
            </TabsTrigger>
            <TabsTrigger value="context" className="data-[state=active]:bg-cyan-600">
              <FileText className="h-4 w-4 mr-2" />
              Context
            </TabsTrigger>
          </TabsList>

          {/* Prompt Test Tab */}
          <TabsContent value="prompt" className="space-y-6">
            <Card className="bg-gradient-to-br from-gray-900 to-black border border-cyan-500/30">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-cyan-400 flex items-center gap-2">
                      <Bot className="h-5 w-5" />
                      Test Prompt Window
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-gray-500 hover:text-cyan-400 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="bg-gray-800 border-cyan-500/50 text-white max-w-xs">
                            <p className="font-semibold mb-1">Prompt Test Window</p>
                            <p className="text-xs">Enter any request here (e.g., "create an image", "make 5 videos", "start a company"). The AI Manager will detect your intent, apply your rules and context, and generate a task checklist. This is a testing area for development.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </CardTitle>
                    <CardDescription>
                      Enter a prompt to test intent detection and task generation
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* AI Processing Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-cyan-500/20">
                  <div className="flex items-center gap-3 flex-1">
                    <Bot className="h-5 w-5 text-cyan-400" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="ai-processing" className="text-cyan-300 font-medium cursor-pointer">
                          AI Processing ({selectedLLMModel.toUpperCase()})
                        </Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-gray-500 hover:text-cyan-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="bg-gray-800 border-cyan-500/50 text-white max-w-xs">
                              <p className="font-semibold mb-1">AI Processing Mode</p>
                              <p className="text-xs mb-2"><strong>ON:</strong> Uses your selected LLM model to intelligently analyze prompts, understand intent, apply rules/context, and generate structured task lists. Best for complex requests.</p>
                              <p className="text-xs"><strong>OFF:</strong> Uses basic keyword matching and simple rule replacement. Faster but less intelligent. Useful for simple, repetitive tasks.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <p className="text-xs text-gray-400">
                        Use {selectedLLMModel.toUpperCase()} to intelligently generate tasks
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="ai-processing"
                    checked={useAIProcessing}
                    onCheckedChange={setUseAIProcessing}
                    className="data-[state=checked]:bg-cyan-600"
                  />
                </div>
                
                {/* Allow AI Questions Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-yellow-500/20">
                  <div className="flex items-center gap-3 flex-1">
                    <Bot className="h-5 w-5 text-yellow-400" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="allow-questions" className="text-yellow-300 font-medium cursor-pointer">
                          Allow AI to Ask Questions
                        </Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-gray-500 hover:text-yellow-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="bg-gray-800 border-yellow-500/50 text-white max-w-xs">
                              <p className="font-semibold mb-1">AI Question Mode</p>
                              <p className="text-xs mb-2"><strong>ON:</strong> AI Manager will ask clarifying questions when information is missing or unclear. Helpful for getting precise results.</p>
                              <p className="text-xs"><strong>OFF:</strong> AI will generate tasks with best guesses from available information. Faster but may need manual correction.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <p className="text-xs text-gray-400">
                        {allowAIQuestions ? "AI will ask questions when clarification is needed" : "AI will proceed with available information"}
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="allow-questions"
                    checked={allowAIQuestions}
                    onCheckedChange={setAllowAIQuestions}
                    className="data-[state=checked]:bg-yellow-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prompt">Your Request</Label>
                  <Textarea
                    id="prompt"
                    placeholder="e.g., Create an image of a dog, Start a company and create a logo, Make 5 flyers..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="min-h-[120px] bg-gray-900 border-gray-700 text-white"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        handlePromptSubmit()
                      }
                    }}
                  />
                </div>
                <Button
                  onClick={handlePromptSubmit}
                  disabled={!prompt.trim() || processingPrompt}
                  className="w-full bg-cyan-600 hover:bg-cyan-700"
                >
                  {processingPrompt ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Tasks
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Questions Display */}
            {pendingQuestions.length > 0 && (
              <Card className="bg-gradient-to-br from-gray-900 to-black border border-yellow-500/30">
                <CardHeader>
                  <CardTitle className="text-yellow-400 flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    Questions for Clarification
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-gray-500 hover:text-yellow-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-800 border-yellow-500/50 text-white max-w-xs">
                          <p className="font-semibold mb-1">Clarifying Questions</p>
                          <p className="text-xs">The AI needs more information to generate accurate tasks. Please answer these questions to proceed. Required questions must be answered before tasks can be generated.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {pendingQuestions.map((question, index) => {
                    // Ensure we have a valid ID - prefer UUID, fallback to index-based key for rendering only
                    const questionId = question.id || `temp-${index}`
                    const currentAnswer = questionAnswers[questionId] || ''
                    
                    // Check if this is a valid UUID (database ID) or temporary ID
                    const isValidUUID = questionId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(questionId)
                    
                    return (
                      <div
                        key={questionId || `question-${index}`}
                        className="p-4 bg-gray-800 rounded-lg border border-gray-700 space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Label className="text-yellow-300 font-medium">
                                {question.question_text}
                              </Label>
                              {question.is_required && (
                                <Badge variant="outline" className="text-red-400 border-red-400">
                                  Required
                                </Badge>
                              )}
                              <Badge variant="outline">{question.question_type}</Badge>
                            </div>
                            {question.status === 'answered' ? (
                              <div className="mt-2 p-2 bg-green-900/30 rounded border border-green-500/50">
                                <p className="text-sm text-green-300">
                                  <strong>Answer:</strong> {question.answer}
                                </p>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <Input
                                  id={`question-answer-${questionId}`}
                                  name={`question-answer-${questionId}`}
                                  placeholder="Your answer..."
                                  value={currentAnswer}
                                  onChange={(e) => {
                                    setQuestionAnswers(prev => {
                                      const updated = { ...prev }
                                      updated[questionId] = e.target.value
                                      return updated
                                    })
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && currentAnswer.trim()) {
                                      handleAnswerQuestion(questionId, currentAnswer)
                                    }
                                  }}
                                  className="flex-1 bg-gray-900 border-gray-700 text-white"
                                  autoComplete="off"
                                />
                                <Button
                                  onClick={() => {
                                    if (!isValidUUID) {
                                      toast({
                                        title: "Error",
                                        description: "Invalid question ID. Please refresh and try again.",
                                        variant: "destructive"
                                      })
                                      return
                                    }
                                    handleAnswerQuestion(questionId, currentAnswer)
                                  }}
                                  disabled={!currentAnswer.trim() || question.status === 'answered' || !isValidUUID}
                                  className="bg-yellow-600 hover:bg-yellow-700"
                                >
                                  <Save className="h-4 w-4 mr-2" />
                                  Submit
                                </Button>
                                {/* Allow skipping all questions, even required ones */}
                                <Button
                                  variant="outline"
                                  onClick={async () => {
                                    if (!isValidUUID) {
                                      toast({
                                        title: "Error",
                                        description: "Invalid question ID. Please refresh and try again.",
                                        variant: "destructive"
                                      })
                                      return
                                    }
                                    
                                    const { data: { session } } = await supabase.auth.getSession()
                                    if (!session?.access_token) return
                                    
                                    const response = await fetch(`/api/ai-manager/questions`, {
                                      method: 'PUT',
                                      headers: {
                                        'Authorization': `Bearer ${session.access_token}`,
                                        'Content-Type': 'application/json'
                                      },
                                      body: JSON.stringify({ id: questionId, status: 'skipped' })
                                    })
                                    
                                    if (response.ok) {
                                      setPendingQuestions(prev => prev.filter(q => q.id !== questionId))
                                      
                                      // If all questions are skipped, regenerate tasks without answers
                                      const updated = pendingQuestions.filter(q => q.id !== questionId)
                                      if (updated.length === 0 && currentIntent) {
                                        const regenerateResponse = await fetch('/api/ai-manager/generate-tasks', {
                                          method: 'POST',
                                          headers: {
                                            'Authorization': `Bearer ${session.access_token}`,
                                            'Content-Type': 'application/json'
                                          },
                                          body: JSON.stringify({ 
                                            intent_id: currentIntent.id,
                                            use_llm: useAIProcessing,
                                            llm_model: selectedLLMModel,
                                            allow_questions: false // Don't ask more questions
                                          })
                                        })
                                        
                                        if (regenerateResponse.ok) {
                                          const regenerateData = await regenerateResponse.json()
                                          setGeneratedTasks(regenerateData.tasks || [])
                                          toast({
                                            title: "Tasks Generated",
                                            description: `Generated ${regenerateData.tasks?.length || 0} tasks (questions skipped)`,
                                          })
                                        }
                                      }
                                    }
                                  }}
                                  className="border-gray-600 hover:bg-gray-700"
                                >
                                  Skip
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )}

            {/* Intent Display */}
            {currentIntent && (
              <Card className="bg-gradient-to-br from-gray-900 to-black border border-purple-500/30">
                <CardHeader>
                  <CardTitle className="text-purple-400 flex items-center gap-2">
                    Detected Intent
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-gray-500 hover:text-purple-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-800 border-purple-500/50 text-white max-w-xs">
                          <p className="font-semibold mb-1">Intent Detection</p>
                          <p className="text-xs">The AI Manager analyzes your prompt and detects what you want to do:</p>
                          <ul className="text-xs list-disc list-inside space-y-1 mt-2">
                            <li><strong>Intent:</strong> What action is needed (generate_image, create_video, etc.)</li>
                            <li><strong>Category:</strong> Type of task (image, video, text, audio, multi_step)</li>
                            <li><strong>Confidence:</strong> How certain the system is (0-100%)</li>
                            <li><strong>Processed Prompt:</strong> Your original prompt after rules are applied</li>
                          </ul>
                          <p className="text-xs mt-2">Higher confidence = better task generation. If confidence is low, try rephrasing your request.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <Label className="text-gray-400">Prompt:</Label>
                    <p className="text-white">{currentIntent.user_prompt}</p>
                  </div>
                  <div className="flex gap-4">
                    <div>
                      <Label className="text-gray-400">Intent:</Label>
                      <Badge className="ml-2">{currentIntent.detected_intent}</Badge>
                    </div>
                    <div>
                      <Label className="text-gray-400">Category:</Label>
                      <Badge variant="outline" className="ml-2">{currentIntent.intent_category}</Badge>
                    </div>
                    <div>
                      <Label className="text-gray-400">Confidence:</Label>
                      <Badge variant="outline" className="ml-2">
                        {(currentIntent.confidence_score * 100).toFixed(0)}%
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Generated Tasks */}
            {generatedTasks.length > 0 && (
              <Card className="bg-gradient-to-br from-gray-900 to-black border border-blue-500/30">
                <CardHeader>
                  <CardTitle className="text-blue-400 flex items-center gap-2">
                    <ListTodo className="h-5 w-5" />
                    Generated Tasks ({generatedTasks.length})
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-gray-500 hover:text-blue-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-800 border-blue-500/50 text-white max-w-xs">
                          <p className="font-semibold mb-1">Generated Tasks</p>
                          <p className="text-xs mb-2">Tasks created from your prompt. Each task includes:</p>
                          <ul className="text-xs list-disc list-inside space-y-1 mb-2">
                            <li><strong>Title:</strong> What needs to be done</li>
                            <li><strong>Type:</strong> Image, video, text, audio generation</li>
                            <li><strong>AI Service/Model:</strong> Which service will handle it</li>
                            <li><strong>Priority:</strong> Execution order (higher = first)</li>
                            <li><strong>Status:</strong> pending, in_progress, completed</li>
                          </ul>
                          <p className="text-xs">Click the circle to mark tasks complete. In the future, tasks will execute automatically in order.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-3">
                      {generatedTasks.map((task, index) => (
                        <div
                          key={task.id || index}
                          className="p-4 bg-gray-800 rounded-lg border border-gray-700 space-y-2"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              <button
                                onClick={() => {
                                  const newStatus = task.status === 'completed' ? 'pending' : 'completed'
                                  handleTaskStatusUpdate(task.id, newStatus)
                                }}
                                className="mt-1"
                              >
                                {task.status === 'completed' ? (
                                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                                ) : (
                                  <Circle className="h-5 w-5 text-gray-400" />
                                )}
                              </button>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-white">{task.task_title}</h4>
                                  <Badge variant="outline">{task.task_type}</Badge>
                                  <Badge variant="outline" className={
                                    task.status === 'completed' ? 'bg-green-900' :
                                    task.status === 'in_progress' ? 'bg-yellow-900' :
                                    'bg-gray-800'
                                  }>
                                    {task.status}
                                  </Badge>
                                </div>
                                {task.task_description && (
                                  <p className="text-sm text-gray-400 mb-2">{task.task_description}</p>
                                )}
                                <div className="flex gap-2 text-xs text-gray-500">
                                  {task.ai_service && (
                                    <span>Service: {task.ai_service}</span>
                                  )}
                                  {task.ai_model && (
                                    <span>Model: {task.ai_model}</span>
                                  )}
                                  {task.priority && (
                                    <span>Priority: {task.priority}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-6">
            <Card className="bg-gradient-to-br from-gray-900 to-black border border-blue-500/30">
              <CardHeader>
                <CardTitle className="text-blue-400 flex items-center gap-2">
                  All Tasks
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-gray-500 hover:text-blue-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="bg-gray-800 border-blue-500/50 text-white max-w-xs">
                        <p className="font-semibold mb-1">Tasks List</p>
                        <p className="text-xs mb-2">Tasks are automatically generated from your prompts. Each task represents a step needed to fulfill your request.</p>
                        <ul className="text-xs list-disc list-inside space-y-1 mb-2">
                          <li>Tasks show what AI service/model will be used</li>
                          <li>Check off tasks as they complete</li>
                          <li>Tasks are ordered by priority and dependencies</li>
                          <li>In the future, tasks will automatically execute</li>
                        </ul>
                        <p className="text-xs">Currently in development - full execution automation coming soon.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardTitle>
                <CardDescription>Manage and track your AI tasks</CardDescription>
              </CardHeader>
              <CardContent>
                {generatedTasks.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">
                    No tasks yet. Generate tasks from the Prompt Test tab.
                  </p>
                ) : (
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-3">
                      {generatedTasks.map((task, index) => (
                        <div
                          key={task.id || index}
                          className="p-4 bg-gray-800 rounded-lg border border-gray-700"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              <button
                                onClick={() => {
                                  const newStatus = task.status === 'completed' ? 'pending' : 'completed'
                                  handleTaskStatusUpdate(task.id, newStatus)
                                }}
                                className="mt-1"
                              >
                                {task.status === 'completed' ? (
                                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                                ) : (
                                  <Circle className="h-5 w-5 text-gray-400" />
                                )}
                              </button>
                              <div className="flex-1">
                                <h4 className="font-semibold text-white mb-1">{task.task_title}</h4>
                                {task.task_description && (
                                  <p className="text-sm text-gray-400 mb-2">{task.task_description}</p>
                                )}
                                <div className="flex gap-2 flex-wrap">
                                  <Badge variant="outline">{task.task_type}</Badge>
                                  <Badge variant="outline">{task.status}</Badge>
                                  {task.ai_service && <Badge variant="outline">{task.ai_service}</Badge>}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rules Tab */}
          <TabsContent value="rules" className="space-y-6">
            <Card className="bg-gradient-to-br from-gray-900 to-black border border-purple-500/30">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex-1">
                  <CardTitle className="text-purple-400 flex items-center gap-2">
                    Rules & Guidelines
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-gray-500 hover:text-purple-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-800 border-purple-500/50 text-white max-w-xs">
                          <p className="font-semibold mb-1">Rules & Guidelines</p>
                          <p className="text-xs mb-2">Create rules that the AI Manager must follow when processing prompts. Examples:</p>
                          <ul className="text-xs list-disc list-inside space-y-1 mb-2">
                            <li>Word replacements: "Don't use 'vato', use 'lovely guy' instead"</li>
                            <li>Style guidelines: "Always use professional language"</li>
                            <li>Constraints: "Never include symbols in text"</li>
                            <li>Exclusions: "Don't use these words: [list]"</li>
                          </ul>
                          <p className="text-xs">Rules are automatically applied to all prompts when generating tasks. Priority determines order of application.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </CardTitle>
                  <CardDescription>Set rules for the AI Manager to follow</CardDescription>
                </div>
                <Button
                  onClick={() => {
                    setEditingRule(null)
                    setRuleForm({
                      rule_name: "",
                      rule_type: "guideline",
                      rule_content: "",
                      description: "",
                      scope: "global",
                      page_path: "",
                      priority: 5,
                      is_active: true,
                      applies_to: ["all"]
                    })
                    setRuleDialogOpen(true)
                  }}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rule
                </Button>
              </CardHeader>
              <CardContent>
                {loadingRules ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-400 mx-auto" />
                  </div>
                ) : rules.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No rules yet. Create your first rule!</p>
                ) : (
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-3">
                      {rules.map((rule) => (
                        <div
                          key={rule.id}
                          className="p-4 bg-gray-800 rounded-lg border border-gray-700"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold text-white">{rule.rule_name}</h4>
                                <Badge variant="outline">{rule.rule_type}</Badge>
                                {!rule.is_active && <Badge variant="outline">Inactive</Badge>}
                                <Badge variant="outline">Priority: {rule.priority}</Badge>
                              </div>
                              <p className="text-sm text-gray-300 mb-2">{rule.rule_content}</p>
                              {rule.description && (
                                <p className="text-xs text-gray-500 mb-2">{rule.description}</p>
                              )}
                              <div className="flex gap-2 text-xs text-gray-500">
                                <span>Scope: {rule.scope}</span>
                                {rule.page_path && <span>Page: {rule.page_path}</span>}
                                <span>Applies to: {rule.applies_to.join(', ')}</span>
                              </div>
                            </div>
                            <div className="flex gap-2 ml-4">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingRule(rule)
                                  setRuleForm({
                                    rule_name: rule.rule_name,
                                    rule_type: rule.rule_type,
                                    rule_content: rule.rule_content,
                                    description: rule.description || "",
                                    scope: rule.scope,
                                    page_path: rule.page_path || "",
                                    priority: rule.priority,
                                    is_active: rule.is_active,
                                    applies_to: rule.applies_to
                                  })
                                  setRuleDialogOpen(true)
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteRule(rule.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-400" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Context Tab */}
          <TabsContent value="context" className="space-y-6">
            <Card className="bg-gradient-to-br from-gray-900 to-black border border-cyan-500/30">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex-1">
                  <CardTitle className="text-cyan-400 flex items-center gap-2">
                    Context & Preferences
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-gray-500 hover:text-cyan-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-800 border-cyan-500/50 text-white max-w-xs">
                          <p className="font-semibold mb-1">Context & Preferences</p>
                          <p className="text-xs mb-2">Store information that helps the AI Manager understand your preferences and requirements:</p>
                          <ul className="text-xs list-disc list-inside space-y-1 mb-2">
                            <li><strong>Preferences:</strong> Style, tone, format requirements (e.g., "comedy, funny, text only no symbols")</li>
                            <li><strong>Memories:</strong> Facts about you or your projects</li>
                            <li><strong>Instructions:</strong> Recurring guidelines</li>
                            <li><strong>Exclusions:</strong> Things to avoid</li>
                          </ul>
                          <p className="text-xs">Context is automatically considered when generating tasks. Higher importance items are prioritized.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </CardTitle>
                  <CardDescription>Store context, preferences, and memories</CardDescription>
                </div>
                <Button
                  onClick={() => {
                    setContextForm({
                      context_key: "",
                      context_value: "",
                      context_type: "preference",
                      scope: "global",
                      importance: 5
                    })
                    setContextDialogOpen(true)
                  }}
                  className="bg-cyan-600 hover:bg-cyan-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Context
                </Button>
              </CardHeader>
              <CardContent>
                {loadingContext ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mx-auto" />
                  </div>
                ) : context.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No context stored yet.</p>
                ) : (
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-3">
                      {context.map((ctx) => (
                        <div
                          key={ctx.id}
                          className="p-4 bg-gray-800 rounded-lg border border-gray-700"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold text-white">{ctx.context_key}</h4>
                                <Badge variant="outline">{ctx.context_type}</Badge>
                                <Badge variant="outline">Importance: {ctx.importance}</Badge>
                              </div>
                              <p className="text-sm text-gray-300">
                                {typeof ctx.context_value === 'string' 
                                  ? ctx.context_value 
                                  : JSON.stringify(ctx.context_value, null, 2)}
                              </p>
                              <div className="flex gap-2 text-xs text-gray-500 mt-2">
                                <span>Scope: {ctx.scope}</span>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={async () => {
                                try {
                                  const { data: { session } } = await supabase.auth.getSession()
                                  if (!session?.access_token) return

                                  const response = await fetch(`/api/ai-manager/context?id=${ctx.id}`, {
                                    method: 'DELETE',
                                    headers: {
                                      'Authorization': `Bearer ${session.access_token}`
                                    }
                                  })

                                  if (response.ok) {
                                    await fetchContext()
                                    toast({
                                      title: "Success",
                                      description: "Context deleted",
                                    })
                                  }
                                } catch (error) {
                                  console.error('Error deleting context:', error)
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-400" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Rule Dialog */}
        <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
          <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRule ? 'Edit Rule' : 'Create New Rule'}</DialogTitle>
              <DialogDescription>
                Define a rule or guideline for the AI Manager to follow
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="rule_name">Rule Name *</Label>
                <Input
                  id="rule_name"
                  value={ruleForm.rule_name}
                  onChange={(e) => setRuleForm({ ...ruleForm, rule_name: e.target.value })}
                  placeholder="e.g., Always use DALL-E 3 for images"
                  className="bg-gray-800 border-gray-700"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rule_type">Rule Type</Label>
                  <Select
                    value={ruleForm.rule_type}
                    onValueChange={(value) => setRuleForm({ ...ruleForm, rule_type: value })}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system">System</SelectItem>
                      <SelectItem value="user_preference">User Preference</SelectItem>
                      <SelectItem value="guideline">Guideline</SelectItem>
                      <SelectItem value="constraint">Constraint</SelectItem>
                      <SelectItem value="exclusion">Exclusion</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scope">Scope</Label>
                  <Select
                    value={ruleForm.scope}
                    onValueChange={(value) => setRuleForm({ ...ruleForm, scope: value })}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">Global</SelectItem>
                      <SelectItem value="page_specific">Page Specific</SelectItem>
                      <SelectItem value="task_specific">Task Specific</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rule_content">Rule Content *</Label>
                <Textarea
                  id="rule_content"
                  value={ruleForm.rule_content}
                  onChange={(e) => setRuleForm({ ...ruleForm, rule_content: e.target.value })}
                  placeholder="The actual rule text..."
                  className="min-h-[100px] bg-gray-800 border-gray-700"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={ruleForm.description}
                  onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })}
                  placeholder="Additional context about this rule..."
                  className="bg-gray-800 border-gray-700"
                />
              </div>
              {ruleForm.scope === 'page_specific' && (
                <div className="space-y-2">
                  <Label htmlFor="page_path">Page Path</Label>
                  <Input
                    id="page_path"
                    value={ruleForm.page_path}
                    onChange={(e) => setRuleForm({ ...ruleForm, page_path: e.target.value })}
                    placeholder="/image-mode, /video-mode, etc."
                    className="bg-gray-800 border-gray-700"
                  />
                </div>
              )}
              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_active"
                    checked={ruleForm.is_active}
                    onCheckedChange={(checked) => setRuleForm({ ...ruleForm, is_active: checked as boolean })}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
                <div className="flex-1 space-y-2">
                  <Label htmlFor="priority">Priority (1-10)</Label>
                  <Input
                    id="priority"
                    type="number"
                    min="1"
                    max="10"
                    value={ruleForm.priority}
                    onChange={(e) => setRuleForm({ ...ruleForm, priority: parseInt(e.target.value) || 5 })}
                    className="bg-gray-800 border-gray-700"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRuleDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveRule} className="bg-purple-600 hover:bg-purple-700">
                <Save className="h-4 w-4 mr-2" />
                Save Rule
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Context Dialog */}
        <Dialog open={contextDialogOpen} onOpenChange={setContextDialogOpen}>
          <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Context</DialogTitle>
              <DialogDescription>
                Store context, preferences, or memories for the AI Manager
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="context_key">Context Key *</Label>
                <Input
                  id="context_key"
                  value={contextForm.context_key}
                  onChange={(e) => setContextForm({ ...contextForm, context_key: e.target.value })}
                  placeholder="e.g., preferred_image_style, company_colors"
                  className="bg-gray-800 border-gray-700"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="context_value">Context Value * (JSON or text)</Label>
                <Textarea
                  id="context_value"
                  value={contextForm.context_value}
                  onChange={(e) => setContextForm({ ...contextForm, context_value: e.target.value })}
                  placeholder='e.g., {"style": "realistic", "colors": ["#FF0000", "#00FF00"]} or just plain text'
                  className="min-h-[100px] bg-gray-800 border-gray-700"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="context_type">Context Type</Label>
                  <Select
                    value={contextForm.context_type}
                    onValueChange={(value) => setContextForm({ ...contextForm, context_type: value })}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="preference">Preference</SelectItem>
                      <SelectItem value="memory">Memory</SelectItem>
                      <SelectItem value="fact">Fact</SelectItem>
                      <SelectItem value="instruction">Instruction</SelectItem>
                      <SelectItem value="exclusion">Exclusion</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="importance">Importance (1-10)</Label>
                  <Input
                    id="importance"
                    type="number"
                    min="1"
                    max="10"
                    value={contextForm.importance}
                    onChange={(e) => setContextForm({ ...contextForm, importance: parseInt(e.target.value) || 5 })}
                    className="bg-gray-800 border-gray-700"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="scope">Scope</Label>
                <Select
                  value={contextForm.scope}
                  onValueChange={(value) => setContextForm({ ...contextForm, scope: value })}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global</SelectItem>
                    <SelectItem value="page_specific">Page Specific</SelectItem>
                    <SelectItem value="task_specific">Task Specific</SelectItem>
                    <SelectItem value="session_specific">Session Specific</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setContextDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveContext} className="bg-cyan-600 hover:bg-cyan-700">
                <Save className="h-4 w-4 mr-2" />
                Save Context
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

