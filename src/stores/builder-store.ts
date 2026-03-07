"use client"

import { create } from "zustand"
import { type Block } from "@/types/builder"

function generateId() {
  return Math.random().toString(36).substring(2, 11)
}

interface BuilderState {
  blocks: Block[]
  selectedBlockId: string | null
  undoStack: Block[][]
  redoStack: Block[][]

  setBlocks: (blocks: Block[]) => void
  addBlock: (type: string, props?: Record<string, unknown>) => void
  updateBlock: (id: string, props: Record<string, unknown>) => void
  removeBlock: (id: string) => void
  moveBlock: (fromIndex: number, toIndex: number) => void
  selectBlock: (id: string | null) => void
  undo: () => void
  redo: () => void
}

export const useBuilderStore = create<BuilderState>((set, get) => ({
  blocks: [],
  selectedBlockId: null,
  undoStack: [],
  redoStack: [],

  setBlocks: (blocks) => set({ blocks }),

  addBlock: (type, props = {}) => {
    const state = get()
    const defaultProps = getDefaultProps(type)
    const newBlock: Block = {
      id: generateId(),
      type,
      props: { ...defaultProps, ...props },
    }
    set({
      undoStack: [...state.undoStack, state.blocks],
      redoStack: [],
      blocks: [...state.blocks, newBlock],
      selectedBlockId: newBlock.id,
    })
  },

  updateBlock: (id, props) => {
    const state = get()
    set({
      undoStack: [...state.undoStack, state.blocks],
      redoStack: [],
      blocks: state.blocks.map((b) =>
        b.id === id ? { ...b, props: { ...b.props, ...props } } : b
      ),
    })
  },

  removeBlock: (id) => {
    const state = get()
    set({
      undoStack: [...state.undoStack, state.blocks],
      redoStack: [],
      blocks: state.blocks.filter((b) => b.id !== id),
      selectedBlockId: state.selectedBlockId === id ? null : state.selectedBlockId,
    })
  },

  moveBlock: (fromIndex, toIndex) => {
    const state = get()
    const blocks = [...state.blocks]
    const [moved] = blocks.splice(fromIndex, 1)
    blocks.splice(toIndex, 0, moved)
    set({
      undoStack: [...state.undoStack, state.blocks],
      redoStack: [],
      blocks,
    })
  },

  selectBlock: (id) => set({ selectedBlockId: id }),

  undo: () => {
    const state = get()
    if (state.undoStack.length === 0) return
    const previous = state.undoStack[state.undoStack.length - 1]
    set({
      blocks: previous,
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, state.blocks],
    })
  },

  redo: () => {
    const state = get()
    if (state.redoStack.length === 0) return
    const next = state.redoStack[state.redoStack.length - 1]
    set({
      blocks: next,
      redoStack: state.redoStack.slice(0, -1),
      undoStack: [...state.undoStack, state.blocks],
    })
  },
}))

function getDefaultProps(type: string): Record<string, unknown> {
  switch (type) {
    case "hero":
      return {
        title: "Your Amazing Headline",
        subtitle: "A compelling subtitle that explains your value proposition",
        buttonText: "Get Started",
        buttonUrl: "#",
        alignment: "center",
        bgColor: "#f8fafc",
      }
    case "text":
      return {
        content: "Add your text content here. Click to edit.",
        alignment: "left",
      }
    case "image":
      return {
        src: "",
        alt: "Image description",
        width: "100%",
      }
    case "cta":
      return {
        title: "Ready to get started?",
        description: "Take the next step and join today.",
        buttonText: "Sign Up Now",
        buttonUrl: "#",
        variant: "primary",
      }
    case "form":
      return {
        title: "Get in Touch",
        fields: ["name", "email", "message"],
        buttonText: "Submit",
      }
    case "pricing":
      return {
        title: "Simple Pricing",
        plans: [
          { name: "Starter", price: "$9", features: ["Feature 1", "Feature 2"] },
          { name: "Pro", price: "$29", features: ["Feature 1", "Feature 2", "Feature 3"] },
        ],
      }
    case "testimonial":
      return {
        quote: "This product changed my life!",
        author: "John Doe",
        role: "CEO at Company",
      }
    default:
      return {}
  }
}
