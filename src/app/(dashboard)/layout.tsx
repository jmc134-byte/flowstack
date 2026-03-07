import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  if (!session.user.onboarded) {
    redirect("/onboarding")
  }

  const userType = session.user.userType ?? "FREELANCER"

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userType={userType} userName={session.user.name ?? "User"} userEmail={session.user.email ?? ""} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar userName={session.user.name ?? "User"} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
