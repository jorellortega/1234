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
  Home
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
}

interface UserProfile {
  id: string
  email: string
  has_subscription: boolean
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

export default function AISettingsPage() {
  const { toast } = useToast()
  const [apiKeys, setApiKeys] = useState<APIKey[]>([])
  const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({})
  const [isLoading, setIsLoading] = useState(false)
  const [inputValues, setInputValues] = useState<{ [key: string]: string }>({})
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [hasSubscription, setHasSubscription] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  // Fetch user profile and subscription status
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile, error } = await supabase
            .from('user_profiles')
            .select('id, email, has_subscription')
            .eq('id', user.id)
            .single()

          if (profile && !error) {
            setUserProfile(profile)
            setHasSubscription(profile.has_subscription)
          }
        }
      } catch (error) {
        console.error('Error fetching user profile:', error)
      }
    }

    fetchUserProfile()
  }, [])

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
    // Load API keys
    loadAPIKeys()
    
    // Initialize input values for all services
    const initialInputValues: { [key: string]: string } = {}
    aiServices.forEach(service => {
      initialInputValues[service.id] = ''
    })
    setInputValues(initialInputValues)
  }, [])

  const loadAPIKeys = async () => {
    try {
      // Get the current session token for authentication
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.log('No active session for API keys')
        return
      }
      
      const response = await fetch('/api/ai-settings', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      console.log('API Response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error response:', errorText)
        throw new Error(`Failed to fetch API keys: ${response.status} ${errorText}`)
      }
      
      const data = await response.json()
      console.log('API Response data:', data)
      
      if (data.apiKeys) {
        // Transform database data to match our interface
        const transformedKeys = data.apiKeys.map((dbKey: any) => ({
          id: dbKey.id,
          name: dbKey.service_id,
          key: dbKey.encrypted_key,
          isVisible: dbKey.is_visible,
          isActive: dbKey.is_active,
          lastUsed: dbKey.last_used,
          createdAt: dbKey.created_at
        }))
        setApiKeys(transformedKeys)
      }
    } catch (error) {
      console.error('Error loading API keys:', error)
      // Don't show error toast for empty state - this is normal
      if (apiKeys.length > 0) {
        toast({
          title: "Error",
          description: "Failed to load API keys",
          variant: "destructive"
        })
      }
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

    // Basic validation - API keys are usually long strings
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
      // Get the current session token for authentication
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast({
          title: "Error",
          description: "Authentication required. Please log in.",
          variant: "destructive"
        })
        return
      }

      const response = await fetch('/api/ai-settings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ serviceId, key: key.trim() })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save API key')
      }

      const result = await response.json()
      
      // Reload API keys from database
      await loadAPIKeys()
      
      // Clear the input after successful save
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

      const response = await fetch(`/api/ai-settings/${keyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVisible: !key.isVisible })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update API key')
      }

      // Update local state for immediate UI feedback
      setShowKeys(prev => ({
        ...prev,
        [keyId]: !prev[keyId]
      }))

      // Reload API keys from database to sync
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

      const response = await fetch(`/api/ai-settings/${keyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !key.isActive })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update API key')
      }

      // Reload API keys from database
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
      const response = await fetch(`/api/ai-settings/${keyId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete API key')
      }

      // Reload API keys from database
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

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">⚡ Developer Portal</h1>
            <p className="text-muted-foreground mt-2">
              Configure your developer credentials and service integrations for AI platforms.
            </p>
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

      {/* Subscription Warning - Only show if user doesn't have subscription */}
      {!hasSubscription && (
        <Card className="mb-6 border-red-500/30 bg-red-50/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <div>
                <h3 className="font-semibold text-red-400">Subscription Required</h3>
                <p className="text-sm text-red-300 mt-1">
                  You must have an active subscription to access the developer portal. Please upgrade your account to configure service integrations.
                </p>
                <div className="mt-3">
                  <Button 
                    onClick={() => setShowUpgradeModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    <Shield className="h-4 w-4" />
                    Upgrade Account
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content - Only show if user has subscription */}
      {hasSubscription ? (
        <div className="grid gap-6">
          {/* Service Integrations Overview */}
          <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Service Integrations Overview
            </CardTitle>
            <CardDescription>
              Configure your developer credentials for various AI platforms to unlock additional features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {apiKeys.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No service integrations configured yet</p>
                  <p className="text-sm">Add your first developer credential below to get started</p>
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
                              {apiKey.isActive ? 'Active' : 'Inactive'} • Created {new Date(apiKey.createdAt).toLocaleDateString()}
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
                            Delete
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              ⚙️ AI Platform Integrations
            </CardTitle>
            <CardDescription>
              Configure your personal developer credentials for AI platforms. These will override any system-wide defaults.
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
                      const existingKey = apiKeys.find(key => key.name === service.id)
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
                                  placeholder={`Enter your ${service.name} developer key`}
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
                                Your developer credentials are stored locally and encrypted. Never share your credentials publicly.
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

        {/* Security Notice */}
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <Shield className="h-5 w-5" />
              Security Notice
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-orange-700">
              <p className="text-sm">
                <strong>Important:</strong> API keys are sensitive credentials that provide access to AI services.
              </p>
              <ul className="text-sm space-y-1 ml-4">
                <li>• Store your API keys securely and never share them publicly</li>
                <li>• Monitor your API usage to avoid unexpected charges</li>
                <li>• Rotate your keys regularly for enhanced security</li>
                <li>• Keys are stored locally in your browser's localStorage</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
      ) : (
        /* Disabled State - Show when user doesn't have subscription */
        <Card className="border-gray-500/30 bg-gray-50/5">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-400 mb-2">Developer Portal Disabled</h3>
              <p className="text-gray-500 mb-4">
                This developer portal is only available to users with an active subscription.
              </p>
              <Button 
                onClick={() => setShowUpgradeModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
              >
                <Shield className="h-4 w-4" />
                Unlock Developer Portal
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="bg-black/90 backdrop-blur-md border-cyan-500/30 shadow-2xl shadow-cyan-500/20 max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full flex items-center justify-center">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-cyan-400">Coming Soon!</CardTitle>
              <CardDescription className="text-cyan-300">
                Developer subscriptions are coming in INFINITO version 2
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="space-y-2 text-sm text-gray-300">
                <p>🚀 Enhanced developer portal features</p>
                <p>⚡ Advanced AI platform integrations</p>
                <p>🔒 Enterprise-grade security</p>
                <p>📊 Advanced analytics and monitoring</p>
              </div>
              <div className="pt-4">
                <Button 
                  onClick={() => setShowUpgradeModal(false)}
                  className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:brightness-110 text-white font-bold"
                >
                  Got It!
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
