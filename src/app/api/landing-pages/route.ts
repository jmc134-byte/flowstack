import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { slugify } from "@/lib/slugify"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const pages = await db.landingPage.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(pages)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { name } = await req.json()
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 })
  }

  const page = await db.landingPage.create({
    data: {
      name,
      slug: slugify(name),
      userId: session.user.id,
    },
  })

  return NextResponse.json(page, { status: 201 })
}
