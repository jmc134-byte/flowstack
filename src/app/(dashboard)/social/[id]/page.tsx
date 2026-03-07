"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, Save } from "lucide-react"

interface Campaign {
  id: string
  name: string
  platform: string
  content: string | null
  mediaUrl: string | null
  status: string
  scheduledAt: string | null
  createdAt: string
  updatedAt: string
}

const PLATFORMS = ["twitter", "facebook", "instagram", "linkedin", "tiktok"]
const CAMPAIGN_STATUSES = ["draft", "scheduled", "published"]

export default function SocialCampaignDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [platform, setPlatform] = useState("")
  const [content, setContent] = useState("")
  const [status, setStatus] = useState("")
  const [scheduledAt, setScheduledAt] = useState("")

  useEffect(() => {
    fetch(`/api/social/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setCampaign(data)
        setPlatform(data.platform)
        setContent(data.content ?? "")
        setStatus(data.status)
        setScheduledAt(
          data.scheduledAt
            ? new Date(data.scheduledAt).toISOString().slice(0, 16)
            : ""
        )
        setLoading(false)
      })
  }, [id])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/social/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          content,
          status,
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        }),
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
    published:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/social"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Social Campaigns
          </Link>
          <h1 className="mt-2 text-2xl font-bold">{campaign.name}</h1>
        </div>
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

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-lg border bg-card p-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="content" className="text-sm font-medium">
                  Post Content
                </label>
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your social media post..."
                  rows={6}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground">
                  {content.length} characters
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4">
            <h3 className="mb-3 font-semibold">Platform</h3>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm capitalize outline-none focus:ring-2 focus:ring-primary"
            >
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <h3 className="mb-3 font-semibold">Status</h3>
            <div className="flex flex-col gap-1">
              {CAMPAIGN_STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`rounded-lg px-3 py-1.5 text-left text-sm font-medium capitalize transition-colors ${
                    status === s
                      ? statusStyles[s]
                      : "hover:bg-accent"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <h3 className="mb-3 font-semibold">Schedule</h3>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
