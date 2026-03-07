"use client"

import { useBuilderStore } from "@/stores/builder-store"
import { Trash2, GripVertical } from "lucide-react"
import type { Block } from "@/types/builder"

interface BlockRendererProps {
  blocks: Block[]
  readOnly?: boolean
}

export function BlockRenderer({ blocks, readOnly = false }: BlockRendererProps) {
  const { selectedBlockId, selectBlock, removeBlock } = useBuilderStore()

  return (
    <div className="space-y-0">
      {blocks.map((block) => (
        <div
          key={block.id}
          className={`group relative ${
            !readOnly ? "cursor-pointer" : ""
          } ${
            selectedBlockId === block.id && !readOnly
              ? "ring-2 ring-primary ring-offset-2"
              : ""
          }`}
          onClick={() => !readOnly && selectBlock(block.id)}
        >
          {!readOnly && (
            <div className="absolute -left-0 top-2 z-10 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="p-1 rounded bg-background border shadow-sm hover:bg-accent">
                <GripVertical className="h-3 w-3 text-muted-foreground" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  removeBlock(block.id)
                }}
                className="p-1 rounded bg-background border shadow-sm hover:bg-destructive hover:text-destructive-foreground"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          )}
          <RenderBlock block={block} />
        </div>
      ))}
    </div>
  )
}

function RenderBlock({ block }: { block: Block }) {
  switch (block.type) {
    case "hero":
      return <HeroBlock props={block.props} />
    case "text":
      return <TextBlock props={block.props} />
    case "image":
      return <ImageBlock props={block.props} />
    case "cta":
      return <CTABlock props={block.props} />
    case "form":
      return <FormBlock props={block.props} />
    case "pricing":
      return <PricingBlock props={block.props} />
    case "testimonial":
      return <TestimonialBlock props={block.props} />
    default:
      return (
        <div className="p-4 border-b text-sm text-muted-foreground">
          Unknown block type: {block.type}
        </div>
      )
  }
}

function HeroBlock({ props }: { props: Record<string, unknown> }) {
  const alignment = (props.alignment as string) || "center"
  const bgColor = (props.bgColor as string) || "#f8fafc"

  return (
    <section
      className="px-8 py-16"
      style={{ backgroundColor: bgColor, textAlign: alignment as "center" | "left" | "right" }}
    >
      <h1 className="text-4xl font-bold mb-4">
        {props.title as string}
      </h1>
      <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
        {props.subtitle as string}
      </p>
      <button className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground">
        {props.buttonText as string}
      </button>
    </section>
  )
}

function TextBlock({ props }: { props: Record<string, unknown> }) {
  return (
    <div className="px-8 py-6" style={{ textAlign: (props.alignment as "left") || "left" }}>
      <p className="text-base leading-relaxed">{props.content as string}</p>
    </div>
  )
}

function ImageBlock({ props }: { props: Record<string, unknown> }) {
  const src = props.src as string
  return (
    <div className="px-8 py-4">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={(props.alt as string) || ""}
          className="w-full rounded-lg"
          style={{ width: (props.width as string) || "100%" }}
        />
      ) : (
        <div className="flex items-center justify-center h-48 bg-muted rounded-lg border-2 border-dashed">
          <span className="text-sm text-muted-foreground">Click to add an image URL</span>
        </div>
      )}
    </div>
  )
}

function CTABlock({ props }: { props: Record<string, unknown> }) {
  return (
    <section className="px-8 py-12 text-center bg-primary/5">
      <h2 className="text-2xl font-bold mb-2">{props.title as string}</h2>
      <p className="text-muted-foreground mb-6">{props.description as string}</p>
      <button className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground">
        {props.buttonText as string}
      </button>
    </section>
  )
}

function FormBlock({ props }: { props: Record<string, unknown> }) {
  const fields = (props.fields as string[]) || ["name", "email"]
  return (
    <section className="px-8 py-8">
      <h3 className="text-xl font-semibold mb-4">{props.title as string}</h3>
      <div className="max-w-md space-y-3">
        {fields.map((field) => (
          <input
            key={field}
            type={field === "email" ? "email" : "text"}
            placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            readOnly
          />
        ))}
        <button className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground">
          {props.buttonText as string}
        </button>
      </div>
    </section>
  )
}

function PricingBlock({ props }: { props: Record<string, unknown> }) {
  const plans = (props.plans as { name: string; price: string; features: string[] }[]) || []
  return (
    <section className="px-8 py-12">
      <h2 className="text-2xl font-bold text-center mb-8">{props.title as string}</h2>
      <div className="grid gap-6 md:grid-cols-2 max-w-2xl mx-auto">
        {plans.map((plan, i) => (
          <div key={i} className="rounded-lg border p-6 text-center">
            <h3 className="text-lg font-semibold">{plan.name}</h3>
            <p className="text-3xl font-bold mt-2 mb-4">{plan.price}<span className="text-sm text-muted-foreground">/mo</span></p>
            <ul className="space-y-2 text-sm text-muted-foreground mb-6">
              {plan.features.map((f, j) => (
                <li key={j}>{f}</li>
              ))}
            </ul>
            <button className="inline-flex h-9 w-full items-center justify-center rounded-md border text-sm font-medium hover:bg-accent">
              Choose Plan
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}

function TestimonialBlock({ props }: { props: Record<string, unknown> }) {
  return (
    <section className="px-8 py-8">
      <blockquote className="max-w-xl mx-auto text-center">
        <p className="text-lg italic mb-4">&ldquo;{props.quote as string}&rdquo;</p>
        <footer>
          <p className="font-semibold">{props.author as string}</p>
          <p className="text-sm text-muted-foreground">{props.role as string}</p>
        </footer>
      </blockquote>
    </section>
  )
}
