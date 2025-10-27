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
  Edit,
  Video
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
  category: 'llm' | 'vision' | 'audio' | 'video' | 'multimodal'
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

export default function AdminAPIKeysPage() {
  const { toast } = useToast()
  const [apiKeys, setApiKeys] = useState<APIKey[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({})
  const [isLoading, setIsLoading] = useState(false)
  const [inputValues, setInputValues] = useState<{ [key: string]: string }>({})
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [showAllUsers, setShowAllUsers] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)

  const aiServices: AIService[] = [
    {
      id: 'runwayml',
      name: 'Runway ML',
      description: 'Video generation AI',
      icon: <Video className="h-5 w-5" />,
      category: 'video',
      required: false
    },
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
    checkAdminStatus()
  }, [])

  useEffect(() => {
    if (isAdmin) {
      loadUsers()
      
      // Initialize input values for all services
      const initialInputValues: { [key: string]: string } = {}
      aiServices.forEach(service => {
        initialInputValues[service.id] = ''
      })
      setInputValues(initialInputValues)
    }
  }, [isAdmin])

  // Load API keys after users are loaded
  useEffect(() => {
    if (isAdmin && users.length > 0) {
      loadAPIKeys()
    }
  }, [isAdmin, users])

  const checkAdminStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setIsAdmin(false)
        setIsCheckingAuth(false)
        return
      }

      setCurrentUser(session.user)

      const response = await fetch('/api/admin/check-role', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setIsAdmin(data.isAdmin)
        console.log('Admin check result:', data)
      } else {
        setIsAdmin(false)
        console.log('Admin check failed:', response.status)
      }
    } catch (error) {
      console.error('Error checking admin status:', error)
      setIsAdmin(false)
    } finally {
      setIsCheckingAuth(false)
    }
  }

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
        const transformedKeys = data.apiKeys.map((dbKey: any) => {
          // Find user info from the users array
          const userInfo = users.find(u => u.id === dbKey.user_id)
          return {
            id: dbKey.id,
            name: dbKey.service_id,
            key: dbKey.encrypted_key,
            isVisible: dbKey.is_visible,
            isActive: dbKey.is_active,
            lastUsed: dbKey.last_used,
            createdAt: dbKey.created_at,
            userId: dbKey.user_id,
            userEmail: userInfo?.email || (dbKey.user_id ? 'Unknown User' : 'System Default')
          }
        })
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

  const saveSystemAPIKey = async (serviceId: string) => {
    const key = inputValues[serviceId] || ''
    
    if (!key.trim()) {
      toast({
        title: "Error",
        description: "API key cannot be empty",
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
          userId: null // System-wide key
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save system API key')
      }

      const result = await response.json()
      
      await loadAPIKeys()
      
      setInputValues(prev => ({
        ...prev,
        [serviceId]: ''
      }))
      
      toast({
        title: "Success",
        description: result.message || `${aiServices.find(s => s.id === serviceId)?.name} system API key saved successfully`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save system API key",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
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

  if (isCheckingAuth) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Checking admin access...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Shield className="h-16 w-16 mx-auto mb-4 text-red-500" />
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-muted-foreground mb-4">
              This page is restricted to administrators only.
            </p>
            {currentUser && (
              <div className="bg-yellow-100 p-4 rounded-lg mb-4">
                <p className="text-yellow-800">
                  <strong>Current User:</strong> {currentUser.email}
                </p>
                <p className="text-yellow-600 text-sm">
                  If you believe you should have admin access, please contact support.
                </p>
              </div>
            )}
            <Link 
              href="/" 
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white transition-colors mx-auto w-fit"
            >
              <Home className="h-4 w-4" />
              Return Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Crown className="h-8 w-8 text-yellow-500" />
              System-Wide API Keys Management
            </h1>
            <p className="text-muted-foreground mt-2">
              Configure default API keys that work for all users. Users can override these with their own personal keys.
            </p>
            <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span>Admin Access Verified: {currentUser?.email}</span>
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
        {/* System-Wide API Keys */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              System-Wide Default API Keys
            </CardTitle>
            <CardDescription>
              These keys will be used by all users unless they set their own personal keys
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="video" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="video">Video AI</TabsTrigger>
                <TabsTrigger value="llm">Language Models</TabsTrigger>
                <TabsTrigger value="vision">Vision & Image</TabsTrigger>
                <TabsTrigger value="audio">Audio & Speech</TabsTrigger>
                <TabsTrigger value="multimodal">Multimodal</TabsTrigger>
              </TabsList>

              {['video', 'llm', 'vision', 'audio', 'multimodal'].map((category) => (
                <TabsContent key={category} value={category} className="mt-6">
                  <div className="grid gap-4">
                    {getCategoryServices(category).map((service) => {
                      // Look for system-wide keys (no specific user)
                      const systemKey = apiKeys.find(key => key.name === service.id && !key.userId)
                      return (
                        <div key={service.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              {service.icon}
                              <div>
                                <h3 className="font-semibold">{service.name}</h3>
                                <p className="text-sm text-muted-foreground">{service.description}</p>
                                <Badge variant="outline" className="mt-1">
                                  System Default
                                </Badge>
                              </div>
                            </div>
                            {systemKey && (
                              <Badge variant={systemKey.isActive ? "default" : "secondary"}>
                                {systemKey.isActive ? "Active" : "Inactive"}
                              </Badge>
                            )}
                          </div>

                          {systemKey ? (
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <Input
                                  type={showKeys[systemKey.id] ? "text" : "password"}
                                  value={systemKey.key}
                                  readOnly
                                  className="font-mono text-sm"
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => toggleKeyVisibility(systemKey.id)}
                                >
                                  {showKeys[systemKey.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => toggleKeyActive(systemKey.id)}
                                >
                                  {systemKey.isActive ? "Deactivate" : "Activate"}
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => deleteAPIKey(systemKey.id)}
                                >
                                  Remove System Key
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                This key is used by all users who haven't set their own {service.name} key.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="flex gap-2">
                                <Input
                                  placeholder={`Enter system-wide ${service.name} API key`}
                                  type="password"
                                  value={inputValues[service.id] || ''}
                                  onChange={(e) => handleInputChange(service.id, e.target.value)}
                                  onKeyPress={(e) => handleKeyPress(service.id, e)}
                                  className="flex-1"
                                />
                                <Button
                                  onClick={() => saveSystemAPIKey(service.id)}
                                  disabled={isLoading}
                                  className="flex items-center gap-2"
                                >
                                  {isLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Save className="h-4 w-4" />
                                  )}
                                  {isLoading ? 'Saving...' : 'Set System Key'}
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                This will be the default {service.name} key for all users.
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

        {/* User Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Management
            </CardTitle>
            <CardDescription>
              Manage user roles and view individual user API keys
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4 mb-4">
                <Button
                  variant={showAllUsers ? "default" : "outline"}
                  onClick={() => setShowAllUsers(true)}
                >
                  Show All Users
                </Button>
                <Button
                  variant={!showAllUsers ? "default" : "outline"}
                  onClick={() => setShowAllUsers(false)}
                >
                  Focus on Single User
                </Button>
              </div>

              {showAllUsers ? (
                <div className="space-y-3">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h3 className="font-semibold">{user.email}</h3>
                        <p className="text-sm text-muted-foreground">
                          {user.full_name && `${user.full_name} • `}Role: {user.role} • Joined: {new Date(user.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={user.role === 'admin' ? "default" : "secondary"}>
                          {user.role}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateUserRole(user.id, user.role === 'admin' ? 'user' : 'admin')}
                        >
                          {user.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="user-select">Select User for Detailed Management</Label>
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
              )}
            </div>
          </CardContent>
        </Card>

        {/* Individual User API Keys */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Individual User API Keys
            </CardTitle>
            <CardDescription>
              View API keys that users have set for themselves (overrides system defaults)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {apiKeys.filter(key => key.userId).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No individual user API keys found</p>
                  <p className="text-sm">Users are using system defaults</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Group API keys by user */}
                  {users.map((user) => {
                    const userApiKeys = apiKeys.filter(key => key.userId === user.id)
                    if (userApiKeys.length === 0) return null
                    
                    return (
                      <div key={user.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-lg">{user.email}</h3>
                          <Badge variant={user.role === 'admin' ? "default" : "secondary"}>
                            {user.role}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          {userApiKeys.map((apiKey) => {
                            const service = getServiceByKey(apiKey.name)
                            return (
                              <div key={apiKey.id} className="flex items-center justify-between p-2 border rounded bg-gray-50">
                                <div className="flex items-center gap-3">
                                  {service?.icon}
                                  <div>
                                    <p className="font-medium text-sm">{service?.name || apiKey.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {apiKey.isActive ? 'Active' : 'Inactive'} • Created {new Date(apiKey.createdAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={apiKey.isActive}
                                    onCheckedChange={() => toggleKeyActive(apiKey.id)}
                                    size="sm"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleKeyVisibility(apiKey.id)}
                                  >
                                    {showKeys[apiKey.id] ? (
                                      <EyeOff className="h-3 w-3" />
                                    ) : (
                                      <Eye className="h-3 w-3" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => deleteAPIKey(apiKey.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

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