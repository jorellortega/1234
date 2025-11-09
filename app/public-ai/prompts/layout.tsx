"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { href: "/public-ai/prompts/system", label: "System Prompt" },
  { href: "/public-ai/prompts/guidelines", label: "Quick Replies" }
]

interface PublicAIPromptsLayoutProps {
  children: ReactNode
}

export default function PublicAIPromptsLayout({ children }: PublicAIPromptsLayoutProps) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black py-10 text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-white">Public Prompt Builder</h1>
          <p className="text-sm text-slate-400">
            Curate the tone, structure, and reusable snippets the concierge uses with logged-out
            visitors.
          </p>
        </header>
        <nav className="flex gap-2">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full border px-5 py-2 text-sm transition",
                  isActive
                    ? "border-cyan-500/80 bg-cyan-500/15 text-cyan-200"
                    : "border-slate-800 bg-slate-950/70 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-100"
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
        <main>{children}</main>
      </div>
    </div>
  )
}

