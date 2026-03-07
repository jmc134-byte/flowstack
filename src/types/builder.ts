export interface Block {
  id: string
  type: string
  props: Record<string, unknown>
  children?: Block[]
}

export interface Template {
  id: string
  name: string
  description: string
  thumbnail: string
  blocks: Block[]
  userTypes: string[]
  category: string
}
