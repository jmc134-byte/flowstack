import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import MarketingHomePage from "./(marketing)/page"

export default async function RootPage() {
  const session = await auth()

  if (session?.user) {
    redirect("/dashboard")
  }

  return <MarketingHomePage />
}
