import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const funnels = await db.funnel.findMany({
    where: { userId: session.user.id },
    include: { steps: { select: { id: true } } },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(funnels)
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

  const funnel = await db.funnel.create({
    data: {
      name,
      description: description || null,
      userId: session.user.id,
      steps: {
        create: [
          { name: "Landing", type: "landing", blocks: "[]", sortOrder: 0 },
          { name: "Thank You", type: "thankyou", blocks: "[]", sortOrder: 1 },
        ],
      },
    },
  })

  return NextResponse.json(funnel, { status: 201 })
}
