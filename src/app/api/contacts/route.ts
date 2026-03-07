import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const contacts = await db.contact.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(contacts)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { email, name, company, phone, status, source } = await req.json()
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 })
  }

  const contact = await db.contact.create({
    data: {
      email,
      name: name || null,
      company: company || null,
      phone: phone || null,
      status: status || "lead",
      source: source || "manual",
      userId: session.user.id,
    },
  })

  return NextResponse.json(contact, { status: 201 })
}
