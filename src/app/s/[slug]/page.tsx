import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { BlockRenderer } from "@/components/builders/block-renderer"
import type { Block } from "@/types/builder"

export default async function PublishedWebsite({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const website = await db.website.findUnique({
    where: { slug },
    include: { pages: { orderBy: { sortOrder: "asc" } } },
  })

  if (!website || !website.published) notFound()

  const homePage = website.pages[0]
  if (!homePage) notFound()

  const blocks: Block[] = JSON.parse(homePage.blocks)

  return (
    <div className="min-h-screen">
      <BlockRenderer blocks={blocks} readOnly />
    </div>
  )
}
