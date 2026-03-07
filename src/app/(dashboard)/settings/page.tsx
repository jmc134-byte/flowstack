import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Settings, User } from "lucide-react"

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const typeLabels: Record<string, string> = {
    FREELANCER: "Freelancer",
    SMALL_BUSINESS: "Small Business",
    AGENCY: "Agency",
    ECOMMERCE: "E-commerce",
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/dashboard/settings/profile"
          className="rounded-lg border bg-card p-6 transition-colors hover:bg-accent"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Profile</h3>
              <p className="text-sm text-muted-foreground">
                Update your profile and user type
              </p>
            </div>
          </div>
        </Link>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">General</h3>
              <p className="text-sm text-muted-foreground">
                App preferences and configuration
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold">Account Info</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between border-b pb-2">
            <dt className="text-muted-foreground">Name</dt>
            <dd className="font-medium">{session.user.name ?? "--"}</dd>
          </div>
          <div className="flex justify-between border-b pb-2">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="font-medium">{session.user.email ?? "--"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">User Type</dt>
            <dd className="font-medium">
              {typeLabels[session.user.userType as string] ??
                session.user.userType}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
