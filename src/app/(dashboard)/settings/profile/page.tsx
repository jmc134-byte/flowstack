"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, Save } from "lucide-react"

const USER_TYPES = [
  {
    id: "FREELANCER",
    label: "Freelancer",
    description: "Landing pages, email, social, contacts",
  },
  {
    id: "SMALL_BUSINESS",
    label: "Small Business",
    description: "Website, email, customers, social",
  },
  {
    id: "AGENCY",
    label: "Agency",
    description: "Websites, landing pages, funnels, email, prospecting, social",
  },
  {
    id: "ECOMMERCE",
    label: "E-commerce",
    description: "Funnels, product pages, email, customers",
  },
]

export default function ProfileSettingsPage() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [selectedType, setSelectedType] = useState(
    session?.user?.userType ?? "FREELANCER"
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userType: selectedType,
          businessName: session?.user?.name,
        }),
      })
      await update({ userType: selectedType })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      router.refresh()
    } catch {
      // Handle error silently
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Settings
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Profile</h1>
        <p className="text-muted-foreground">
          Update your profile and change your user type to customize your
          dashboard.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold">Account Details</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Name</dt>
            <dd className="font-medium">{session?.user?.name ?? "--"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="font-medium">{session?.user?.email ?? "--"}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold">User Type</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your user type determines which features appear in your dashboard.
        </p>

        <div className="mt-4 space-y-2">
          {USER_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={`w-full rounded-lg border p-4 text-left transition-colors ${
                selectedType === type.id
                  ? "border-primary bg-primary/5"
                  : "hover:bg-accent"
              }`}
            >
              <p className="font-medium">{type.label}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {type.description}
              </p>
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={
              saving || selectedType === (session?.user?.userType as string)
            }
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Saving..." : "Save Changes"}
          </button>
          {saved && (
            <span className="text-sm text-green-600 dark:text-green-400">
              Saved successfully!
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
