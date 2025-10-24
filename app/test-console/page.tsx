"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

export default function TestConsolePage() {
  const [testResults, setTestResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [projectId, setProjectId] = useState("6df95dd5-9dab-4445-90ec-473f446f00ff")

  const testDatabaseConnection = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/memories')
      const data = await response.json()
      setTestResults({
        status: response.status,
        ok: response.ok,
        data: data
      })
    } catch (error) {
      setTestResults({
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  const testFirstProject = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/generations')
      const data = await response.json()
      setTestResults({
        status: response.status,
        ok: response.ok,
        data: data
      })
    } catch (error) {
      setTestResults({
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-cyan-400 mb-8">Database Test Console</h1>
        
        <div className="grid gap-6">
          {/* Database Connection Test */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-cyan-400">Database Connection Test</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button 
                  onClick={testDatabaseConnection}
                  disabled={loading}
                  className="bg-cyan-600 hover:bg-cyan-700"
                >
                  Test Specific Project
                </Button>
                <Button 
                  onClick={testFirstProject}
                  disabled={loading}
                  variant="outline"
                  className="border-cyan-500/30 text-cyan-400"
                >
                  Test First Project
                </Button>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm text-gray-300">Project ID to test:</label>
                <Input
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  placeholder="Enter project ID"
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
            </CardContent>
          </Card>

          {/* Test Results */}
          {testResults && (
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-cyan-400">Test Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {testResults.status && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-300">Status:</span>
                      <Badge variant={testResults.ok ? "default" : "destructive"}>
                        {testResults.status}
                      </Badge>
                    </div>
                  )}
                  
                  {testResults.error ? (
                    <div className="p-4 bg-red-900/20 border border-red-500/30 rounded">
                      <p className="text-red-400 font-mono text-sm">{testResults.error}</p>
                    </div>
                  ) : (
                    <div className="p-4 bg-green-900/20 border border-green-500/30 rounded">
                      <pre className="text-green-400 font-mono text-sm overflow-auto">
                        {JSON.stringify(testResults.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
