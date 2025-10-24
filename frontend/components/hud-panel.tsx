import type React from "react"
import { cn } from "@/lib/utils"

type HudPanelProps = {
  title: string
  children: React.ReactNode
  className?: string
}

export function HudPanel({ title, children, className }: HudPanelProps) {
  return (
    <div className={cn("aztec-panel p-4 backdrop-blur-sm", className)}>
      <h3 className="text-cyan-400 text-sm font-bold tracking-widest uppercase mb-3 border-b border-cyan-400/20 pb-2">
        // {title}
      </h3>
      <div className="text-sm text-gray-400 space-y-2">{children}</div>
    </div>
  )
}
