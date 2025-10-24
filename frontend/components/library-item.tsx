import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Download, Trash2, Eye } from "lucide-react"
import type { LucideIcon } from "lucide-react"

type LibraryItemProps = {
  item: {
    id: number
    name: string
    type: string
    date: string
    preview?: string
    icon?: LucideIcon
  }
}

export function LibraryItem({ item }: LibraryItemProps) {
  const Icon = item.icon

  return (
    <div className="aztec-panel backdrop-blur-sm group transition-all hover:border-cyan-400 hover:shadow-2xl hover:shadow-cyan-500/20">
      <div className="aspect-video bg-black/30 flex items-center justify-center p-4 border-b border-cyan-500/30">
        {item.preview ? (
          <Image
            src={item.preview || "/placeholder.svg"}
            alt={item.name}
            width={300}
            height={200}
            className="object-cover w-full h-full rounded-sm"
          />
        ) : (
          Icon && <Icon className="h-16 w-16 text-cyan-700 group-hover:text-cyan-400 transition-colors" />
        )}
      </div>
      <div className="p-4">
        <h4 className="text-sm font-bold text-white truncate">{item.name}</h4>
        <p className="text-xs text-cyan-400">{item.type}</p>
        <p className="text-xs text-gray-500 mt-1">{item.date}</p>
        <div className="flex justify-end gap-1 mt-4">
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white h-8 w-8">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white h-8 w-8">
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-red-500/70 hover:text-red-500 hover:bg-red-500/10 h-8 w-8"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
