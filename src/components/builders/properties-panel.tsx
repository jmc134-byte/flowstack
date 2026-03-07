"use client"

import { useBuilderStore } from "@/stores/builder-store"
import { X } from "lucide-react"

export function PropertiesPanel() {
  const { blocks, selectedBlockId, updateBlock, selectBlock } = useBuilderStore()
  const block = blocks.find((b) => b.id === selectedBlockId)

  if (!block) return null

  return (
    <div className="w-72 overflow-y-auto border-l bg-background p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold capitalize">{block.type} Properties</h3>
        <button
          onClick={() => selectBlock(null)}
          className="p-1 rounded hover:bg-accent transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4">
        {Object.entries(block.props).map(([key, value]) => {
          if (typeof value === "string") {
            return (
              <div key={key} className="space-y-1.5">
                <label className="text-xs font-medium capitalize text-muted-foreground">
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </label>
                {value.length > 80 ? (
                  <textarea
                    value={value}
                    onChange={(e) => updateBlock(block.id, { [key]: e.target.value })}
                    rows={3}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                  />
                ) : (
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => updateBlock(block.id, { [key]: e.target.value })}
                    className="flex h-8 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                )}
              </div>
            )
          }
          return null
        })}
      </div>
    </div>
  )
}
