import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const campaigns = await db.socialCampaign.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(campaigns)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { name, platform, content, scheduledAt } = await req.json()
  if (!name || !platform) {
    return NextResponse.json({ error: "Name and platform are required" }, { status: 400 })
  }

  const campaign = await db.socialCampaign.create({
    data: {
      name,
      platform,
      content: content || null,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      userId: session.user.id,
    },
  })

  return NextResponse.json(campaign, { status: 201 })
}
