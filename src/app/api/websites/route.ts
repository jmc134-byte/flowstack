import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { slugify } from "@/lib/slugify"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const websites = await db.website.findMany({
    where: { userId: session.user.id },
    include: { pages: { select: { id: true } } },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(websites)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { name, description } = await req.json()
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 })
  }

  const website = await db.website.create({
    data: {
      name,
      slug: slugify(name),
      description: description || null,
      userId: session.user.id,
      pages: {
        create: {
          title: "Home",
          slug: "home",
          blocks: "[]",
          sortOrder: 0,
        },
      },
    },
  })

  return NextResponse.json(website, { status: 201 })
}
