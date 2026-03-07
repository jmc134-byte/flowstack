export interface BlockDefinition {
  type: string
  label: string
  icon: string
  category: string
}

export const BLOCK_REGISTRY: BlockDefinition[] = [
  { type: "hero", label: "Hero Section", icon: "Sparkles", category: "Layout" },
  { type: "text", label: "Text Block", icon: "Type", category: "Content" },
  { type: "image", label: "Image", icon: "Image", category: "Content" },
  { type: "cta", label: "Call to Action", icon: "MousePointerClick", category: "Conversion" },
  { type: "form", label: "Contact Form", icon: "FileInput", category: "Conversion" },
  { type: "pricing", label: "Pricing Table", icon: "DollarSign", category: "Conversion" },
  { type: "testimonial", label: "Testimonial", icon: "Quote", category: "Social Proof" },
]

export function getBlocksByCategory(): Record<string, BlockDefinition[]> {
  const categories: Record<string, BlockDefinition[]> = {}
  for (const block of BLOCK_REGISTRY) {
    if (!categories[block.category]) {
      categories[block.category] = []
    }
    categories[block.category].push(block)
  }
  return categories
}
