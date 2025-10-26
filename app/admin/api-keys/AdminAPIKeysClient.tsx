"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Save, 
  Eye, 
  EyeOff, 
  Key, 
  Brain, 
  Bot, 
  Sparkles, 
  Zap,
  Shield,
  AlertCircle,
  CheckCircle,
  Settings,
  Loader2,
  Home,
  Users,
  Crown,
  Trash2,
  Edit
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { supabase } from "@/lib/supabase-client"

interface APIKey {
  id: string
  name: string
  key: string
  isVisible: boolean
  isActive: boolean
  lastUsed?: string
  createdAt: string
  userId: string
  userEmail?: string
}

interface AIService {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  category: 'llm' | 'vision' | 'audio' | 'multimodal'
  required: boolean
  apiKey?: APIKey
}

interface User {
  id: string
  email: string
  full_name?: string
  role: string
  created_at: string
}

interface AdminAPIKeysClientProps {
  initialUser: any
  initialUserProfile: any
}

export default function AdminAPIKeysClient({ initialUser, initialUserProfile }: AdminAPIKeysClientProps) {
  const { toast } = useToast()
  const [apiKeys, setApiKeys] = useState<APIKey[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({})
  const [isLoading, setIsLoading] = useState(false)
  const [inputValues, setInputValues] = useState<{ [key: string]: string }>({})
  const [selectedUserId, setSelectedUserId] = useState<string>('')

  const aiServices: AIService[] = [
    {
      id: 'openai',
      name: 'OpenAI',
      description: 'GPT-4, GPT-3.5, DALL-E, Whisper',
      icon: <Brain className="h-5 w-5" />,
      category: 'llm',
      required: false
    },
    {
      id: 'anthropic',
      name: 'Anthropic',
      description: 'Claude 3, Claude 2',
      icon: <Bot className="h-5 w-5" />,
      category: 'llm',
      required: false
    },
    {
      id: 'google',
      name: 'Google AI',
      description: 'Gemini Pro, PaLM, Vertex AI',
      icon: <Sparkles className="h-5 w-5" />,
      category: 'llm',
      required: false
    },
    {
      id: 'huggingface',
      name: 'Hugging Face',
      description: 'Open source models and inference',
      icon: <Zap className="h-5 w-5" />,
      category: 'llm',
      required: false
    },
    {
      id: 'replicate',
      name: 'Replicate',
      description: 'Open source model hosting',
      icon: <Settings className="h-5 w-5" />,
      category: 'llm',
      required: false
    },
    {
      id: 'stability',
      name: 'Stability AI',
      description: 'SDXL, Stable Diffusion',
      icon: <Sparkles className="h-5 w-5" />,
      category: 'vision',
      required: false
    },
    {
      id: 'elevenlabs',
      name: 'ElevenLabs',
      description: 'Text-to-speech, voice cloning',
      icon: <Zap className="h-5 w-5" />,
      category: 'audio',
      required: false
    }
  ]

  useEffect(() => {
    loadUsers()
    loadAPIKeys()
    
    // Initialize input values for all services
    const initialInputValues: { [key: string]: string } = {}
    aiServices.forEach(service => {
      initialInputValues[service.id] = ''
    })
    setInputValues(initialInputValues)
  }, [])

  const loadUsers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const loadAPIKeys = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/admin/api-keys', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        const transformedKeys = data.apiKeys.map((dbKey: any) => ({
          id: dbKey.id,
          name: dbKey.service_id,
          key: dbKey.encrypted_key,
          isVisible: dbKey.is_visible,
          isActive: dbKey.is_active,
          lastUsed: dbKey.last_used,
          createdAt: dbKey.created_at,
          userId: dbKey.user_id,
          userEmail: dbKey.user_profiles?.email
        }))
        setApiKeys(transformedKeys)
      }
    } catch (error) {
      console.error('Error loading API keys:', error)
    }
  }

  const handleInputChange = (serviceId: string, value: string) => {
    setInputValues(prev => ({
      ...prev,
      [serviceId]: value
    }))
  }

  const handleKeyPress = (serviceId: string, e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveAPIKey(serviceId)
    }
  }

  const saveAPIKey = async (serviceId: string) => {
    const key = inputValues[serviceId] || ''
    
    if (!key.trim()) {
      toast({
        title: "Error",
        description: "API key cannot be empty",
        variant: "destructive"
      })
      return
    }

    if (!selectedUserId) {
      toast({
        title: "Error",
        description: "Please select a user first",
        variant: "destructive"
      })
      return
    }

    if (key.trim().length < 10) {
      toast({
        title: "Error",
        description: "API key seems too short. Please check and try again.",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          serviceId, 
          key: key.trim(),
          userId: selectedUserId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save API key')
      }

      const result = await response.json()
      
      await loadAPIKeys()
      
      setInputValues(prev => ({
        ...prev,
        [serviceId]: ''
      }))
      
      toast({
        title: "Success",
        description: result.message || `${aiServices.find(s => s.id === serviceId)?.name} API key saved successfully`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save API key",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const toggleKeyVisibility = async (keyId: string) => {
    try {
      const key = apiKeys.find(k => k.id === keyId)
      if (!key) return

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/admin/api-keys/${keyId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ isVisible: !key.isVisible })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update API key')
      }

      setShowKeys(prev => ({
        ...prev,
        [keyId]: !prev[keyId]
      }))

      await loadAPIKeys()
      
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update API key",
        variant: "destructive"
      })
    }
  }

  const toggleKeyActive = async (keyId: string) => {
    try {
      const key = apiKeys.find(k => k.id === keyId)
      if (!key) return

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/admin/api-keys/${keyId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ isActive: !key.isActive })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update API key')
      }

      await loadAPIKeys()
      
      toast({
        title: "Success",
        description: `API key ${!key.isActive ? 'activated' : 'deactivated'} successfully`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update API key",
        variant: "destructive"
      })
    }
  }

  const deleteAPIKey = async (keyId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/admin/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete API key')
      }

      await loadAPIKeys()
      
      toast({
        title: "Success",
        description: "API key deleted successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete API key",
        variant: "destructive"
      })
    }
  }

  const getServiceByKey = (keyName: string) => {
    return aiServices.find(service => service.id === keyName)
  }

  const getCategoryServices = (category: string) => {
    return aiServices.filter(service => service.category === category)
  }

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ role: newRole })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update user role')
      }

      await loadUsers()
      
      toast({
        title: "Success",
        description: `User role updated to ${newRole}`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update user role",
        variant: "destructive"
      })
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Crown className="h-8 w-8 text-yellow-500" />
              Admin API Keys Management
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage API keys for all users and configure system-wide AI services.
            </p>
            <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span>Admin Access Verified: {initialUserProfile.email}</span>
            </div>
          </div>
          <Link 
            href="/" 
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white transition-colors"
          >
            <Home className="h-4 w-4" />
            Home
          </Link>
        </div>
      </div>

      <div className="grid gap-6">
        {/* User Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Management
            </CardTitle>
            <CardDescription>
              Select a user to manage their API keys
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="user-select">Select User</Label>
                <select
                  id="user-select"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full mt-2 p-2 border rounded-md"
                >
                  <option value="">Choose a user...</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.email} {user.full_name && `(${user.full_name})`} - {user.role}
                    </option>
                  ))}
                </select>
              </div>
              
              {selectedUserId && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">
                        {users.find(u => u.id === selectedUserId)?.email}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Role: {users.find(u => u.id === selectedUserId)?.role}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateUserRole(selectedUserId, 'admin')}
                        disabled={users.find(u => u.id === selectedUserId)?.role === 'admin'}
                      >
                        Make Admin
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateUserRole(selectedUserId, 'user')}
                        disabled={users.find(u => u.id === selectedUserId)?.role === 'user'}
                      >
                        Make User
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* API Keys Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              All API Keys Overview
            </CardTitle>
            <CardDescription>
              View and manage API keys for all users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {apiKeys.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No API keys found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {apiKeys.map((apiKey) => {
                    const service = getServiceByKey(apiKey.name)
                    return (
                      <div key={apiKey.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {service?.icon}
                          <div>
                            <p className="font-medium">{service?.name || apiKey.name}</p>
                            <p className="text-sm text-muted-foreground">
                              User: {apiKey.userEmail} • {apiKey.isActive ? 'Active' : 'Inactive'} • Created {new Date(apiKey.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={apiKey.isActive}
                            onCheckedChange={() => toggleKeyActive(apiKey.id)}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleKeyVisibility(apiKey.id)}
                          >
                            {showKeys[apiKey.id] ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteAPIKey(apiKey.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Service Configuration */}
        {selectedUserId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configure AI Services for {users.find(u => u.id === selectedUserId)?.email}
              </CardTitle>
              <CardDescription>
                Add API keys for the selected user
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="llm" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="llm">Language Models</TabsTrigger>
                  <TabsTrigger value="vision">Vision & Image</TabsTrigger>
                  <TabsTrigger value="audio">Audio & Speech</TabsTrigger>
                  <TabsTrigger value="multimodal">Multimodal</TabsTrigger>
                </TabsList>

                {['llm', 'vision', 'audio', 'multimodal'].map((category) => (
                  <TabsContent key={category} value={category} className="mt-6">
                    <div className="grid gap-4">
                      {getCategoryServices(category).map((service) => {
                        const existingKey = apiKeys.find(key => key.name === service.id && key.userId === selectedUserId)
                        return (
                          <div key={service.id} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3">
                                {service.icon}
                                <div>
                                  <h3 className="font-semibold">{service.name}</h3>
                                  <p className="text-sm text-muted-foreground">{service.description}</p>
                                </div>
                              </div>
                              {existingKey && (
                                <Badge variant={existingKey.isActive ? "default" : "secondary"}>
                                  {existingKey.isActive ? "Active" : "Inactive"}
                                </Badge>
                              )}
                            </div>

                            {existingKey ? (
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <Input
                                    type={showKeys[existingKey.id] ? "text" : "password"}
                                    value={existingKey.key}
                                    readOnly
                                    className="font-mono text-sm"
                                  />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => toggleKeyVisibility(existingKey.id)}
                                  >
                                    {showKeys[existingKey.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </Button>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => toggleKeyActive(existingKey.id)}
                                  >
                                    {existingKey.isActive ? "Deactivate" : "Activate"}
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => deleteAPIKey(existingKey.id)}
                                  >
                                    Remove
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <div className="flex gap-2">
                                  <Input
                                    placeholder={`Enter ${service.name} API key for ${users.find(u => u.id === selectedUserId)?.email}`}
                                    type="password"
                                    value={inputValues[service.id] || ''}
                                    onChange={(e) => handleInputChange(service.id, e.target.value)}
                                    onKeyPress={(e) => handleKeyPress(service.id, e)}
                                    className="flex-1"
                                  />
                                  <Button
                                    onClick={() => saveAPIKey(service.id)}
                                    disabled={isLoading}
                                    className="flex items-center gap-2"
                                  >
                                    {isLoading ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Save className="h-4 w-4" />
                                    )}
                                    {isLoading ? 'Saving...' : 'Save'}
                                  </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  API key will be stored securely for the selected user.
                                </p>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Security Notice */}
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <Shield className="h-5 w-5" />
              Admin Security Notice
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-red-700">
              <p className="text-sm">
                <strong>Admin Access:</strong> You have full administrative access to all user API keys.
              </p>
              <ul className="text-sm space-y-1 ml-4">
                <li>• You can view, edit, and delete any user's API keys</li>
                <li>• You can promote/demote users between admin and user roles</li>
                <li>• All actions are logged and auditable</li>
                <li>• Use this power responsibly and only for legitimate administrative purposes</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
