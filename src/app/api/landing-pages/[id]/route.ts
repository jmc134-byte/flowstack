import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const page = await db.landingPage.findFirst({
    where: { id, userId: session.user.id },
  })

  if (!page) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(page)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()

  const existing = await db.landingPage.findFirst({
    where: { id, userId: session.user.id },
  })

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const page = await db.landingPage.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.published !== undefined && { published: body.published }),
      ...(body.blocks !== undefined && { blocks: body.blocks }),
    },
  })

  return NextResponse.json(page)
}
