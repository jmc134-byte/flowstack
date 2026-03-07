import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { userType, businessName } = await req.json()

    const validTypes = ["FREELANCER", "SMALL_BUSINESS", "AGENCY", "ECOMMERCE"]
    if (!validTypes.includes(userType)) {
      return NextResponse.json({ error: "Invalid user type" }, { status: 400 })
    }

    await db.user.update({
      where: { id: session.user.id },
      data: {
        userType,
        name: businessName || session.user.name,
        onboarded: true,
      },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: "Failed to complete onboarding" },
      { status: 500 }
    )
  }
}
