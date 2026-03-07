"use client"

import { useBuilderStore } from "@/stores/builder-store"
import { getBlocksByCategory } from "./block-registry"
import {
  Sparkles,
  Type,
  Image,
  MousePointerClick,
  FileInput,
  DollarSign,
  Quote,
} from "lucide-react"

const iconMap: Record<string, React.ElementType> = {
  Sparkles,
  Type,
  Image,
  MousePointerClick,
  FileInput,
  DollarSign,
  Quote,
}

export function BlockSidebar() {
  const { addBlock } = useBuilderStore()
  const categories = getBlocksByCategory()

  return (
    <div className="w-56 overflow-y-auto bg-muted/30 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Blocks
      </h3>
      {Object.entries(categories).map(([category, blocks]) => (
        <div key={category} className="mb-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            {category}
          </p>
          <div className="space-y-1">
            {blocks.map((block) => {
              const Icon = iconMap[block.icon] || Type
              return (
                <button
                  key={block.type}
                  onClick={() => addBlock(block.type)}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {block.label}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
