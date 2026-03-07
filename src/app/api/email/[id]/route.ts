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

  const campaign = await db.emailCampaign.findFirst({
    where: { id, userId: session.user.id },
    include: {
      recipients: {
        include: {
          contact: { select: { id: true, name: true, email: true } },
        },
      },
    },
  })

  if (!campaign) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(campaign)
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

  const existing = await db.emailCampaign.findFirst({
    where: { id, userId: session.user.id },
  })

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const campaign = await db.emailCampaign.update({
    where: { id },
    data: {
      ...(body.subject !== undefined && { subject: body.subject }),
      ...(body.body !== undefined && { body: body.body }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.scheduledAt !== undefined && {
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
      }),
    },
    include: {
      recipients: {
        include: {
          contact: { select: { id: true, name: true, email: true } },
        },
      },
    },
  })

  return NextResponse.json(campaign)
}
