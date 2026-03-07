"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, Save } from "lucide-react"

interface Campaign {
  id: string
  name: string
  subject: string | null
  body: string | null
  status: string
  scheduledAt: string | null
  recipients: { id: string; contact: { id: string; name: string | null; email: string } }[]
}

export default function EmailCampaignDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/email/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setCampaign(data)
        setSubject(data.subject ?? "")
        setBody(data.body ?? "")
        setLoading(false)
      })
  }, [id])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/email/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body }),
      })
      const data = await res.json()
      setCampaign(data)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        Campaign not found.
      </div>
    )
  }

  const statusStyles: Record<string, string> = {
    draft:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    scheduled:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    sent: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/email"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Campaigns
          </Link>
          <h1 className="mt-2 text-2xl font-bold">{campaign.name}</h1>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium capitalize ${
              statusStyles[campaign.status] ?? statusStyles.draft
            }`}
          >
            {campaign.status}
          </span>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-lg border bg-card p-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="subject" className="text-sm font-medium">
                  Subject Line
                </label>
                <input
                  id="subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter email subject..."
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="body" className="text-sm font-medium">
                  Email Body
                </label>
                <textarea
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your email content here..."
                  rows={12}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4">
            <h3 className="font-semibold">Recipients</h3>
            {campaign.recipients.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                No recipients added yet. Add contacts from your{" "}
                <Link
                  href="/dashboard/email/contacts"
                  className="text-primary underline"
                >
                  contact list
                </Link>
                .
              </p>
            ) : (
              <div className="mt-2 space-y-1">
                {campaign.recipients.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded px-2 py-1 text-sm"
                  >
                    <span>{r.contact.name ?? r.contact.email}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
