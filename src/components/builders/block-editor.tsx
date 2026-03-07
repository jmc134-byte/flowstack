"use client"

import { useEffect, useCallback } from "react"
import { useBuilderStore } from "@/stores/builder-store"
import { BlockRenderer } from "./block-renderer"
import { BlockSidebar } from "./block-sidebar"
import { PropertiesPanel } from "./properties-panel"
import { Undo2, Redo2, Save } from "lucide-react"
import type { Block } from "@/types/builder"

interface BlockEditorProps {
  initialBlocks: Block[]
  onSave: (blocks: Block[]) => Promise<void>
}

export function BlockEditor({ initialBlocks, onSave }: BlockEditorProps) {
  const { blocks, setBlocks, undo, redo, undoStack, redoStack, selectedBlockId } = useBuilderStore()

  useEffect(() => {
    setBlocks(initialBlocks)
  }, [initialBlocks, setBlocks])

  const handleSave = useCallback(async () => {
    await onSave(blocks)
  }, [blocks, onSave])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault()
        if (e.shiftKey) {
          redo()
        } else {
          undo()
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [undo, redo, handleSave])

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0 -m-6">
      <BlockSidebar />

      <div className="flex-1 flex flex-col border-x">
        <div className="flex items-center justify-between border-b px-4 py-2 bg-muted/30">
          <div className="flex items-center gap-1">
            <button
              onClick={undo}
              disabled={undoStack.length === 0}
              className="p-1.5 rounded hover:bg-accent disabled:opacity-30 transition-colors"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              onClick={redo}
              disabled={redoStack.length === 0}
              className="p-1.5 rounded hover:bg-accent disabled:opacity-30 transition-colors"
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo2 className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Save className="h-4 w-4" />
            Save
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-muted/20 p-8">
          <div className="mx-auto max-w-3xl bg-background rounded-lg shadow-sm border min-h-[600px]">
            {blocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <p className="text-lg font-medium text-muted-foreground">
                  Start building
                </p>
                <p className="text-sm text-muted-foreground/60 mt-1">
                  Drag blocks from the sidebar or click to add
                </p>
              </div>
            ) : (
              <BlockRenderer blocks={blocks} />
            )}
          </div>
        </div>
      </div>

      {selectedBlockId && <PropertiesPanel />}
    </div>
  )
}
