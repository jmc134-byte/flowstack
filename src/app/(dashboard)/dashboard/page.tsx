import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { UserType } from "@/types/features"
import { DashboardGrid } from "@/components/dashboard/dashboard-grid"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const userType = (session.user.userType ?? "FREELANCER") as UserType

  const typeLabels: Record<string, string> = {
    FREELANCER: "Freelancer",
    SMALL_BUSINESS: "Business Owner",
    AGENCY: "Agency Manager",
    ECOMMERCE: "E-commerce Seller",
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Welcome back, {session.user.name ?? "there"}
        </h1>
        <p className="text-muted-foreground">
          Your {typeLabels[userType] ?? "marketing"} dashboard
        </p>
      </div>

      <DashboardGrid userType={userType} />
    </div>
  )
}
