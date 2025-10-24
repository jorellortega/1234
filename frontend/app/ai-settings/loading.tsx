import { Settings, Loader2 } from "lucide-react"

export default function AISettingsLoading() {
  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">AI Settings</h1>
        <p className="text-muted-foreground mt-2">
          Loading AI service configuration...
        </p>
      </div>
      
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Settings className="h-16 w-16 mx-auto mb-4 text-muted-foreground animate-pulse" />
          <Loader2 className="h-8 w-8 mx-auto animate-spin text-cyan-400" />
          <p className="mt-4 text-muted-foreground">Loading AI Settings...</p>
        </div>
      </div>
    </div>
  )
}
