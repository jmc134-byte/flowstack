import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { BlockRenderer } from "@/components/builders/block-renderer"
import type { Block } from "@/types/builder"

export default async function PublishedLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const page = await db.landingPage.findUnique({
    where: { slug },
  })

  if (!page || !page.published) notFound()

  const blocks: Block[] = JSON.parse(page.blocks)

  return (
    <div className="min-h-screen">
      <BlockRenderer blocks={blocks} readOnly />
    </div>
  )
}
