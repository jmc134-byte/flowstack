"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, Save } from "lucide-react"

interface Contact {
  id: string
  email: string
  name: string | null
  company: string | null
  phone: string | null
  status: string
  source: string | null
  notes: string | null
  tags: string | null
  createdAt: string
  updatedAt: string
}

const STATUSES = ["lead", "prospect", "customer"]

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState("")
  const [notes, setNotes] = useState("")
  const [tags, setTags] = useState("")

  useEffect(() => {
    fetch(`/api/contacts/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setContact(data)
        setStatus(data.status)
        setNotes(data.notes ?? "")
        setTags(data.tags ?? "")
        setLoading(false)
      })
  }, [id])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/contacts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes, tags }),
      })
      const data = await res.json()
      setContact(data)
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

  if (!contact) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        Contact not found.
      </div>
    )
  }

  const statusStyles: Record<string, string> = {
    lead: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    prospect:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    customer:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/prospecting"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Contacts
          </Link>
          <h1 className="mt-2 text-2xl font-bold">
            {contact.name ?? contact.email}
          </h1>
          <p className="text-sm text-muted-foreground">{contact.email}</p>
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
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold">Status</h2>
            <div className="flex gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors ${
                    status === s
                      ? statusStyles[s]
                      : "border hover:bg-accent"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold">Notes</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this contact..."
              rows={6}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold">Tags</h2>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. vip, newsletter, enterprise (comma-separated)"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
            {tags && (
              <div className="mt-2 flex flex-wrap gap-1">
                {tags.split(",").map(
                  (tag, i) =>
                    tag.trim() && (
                      <span
                        key={i}
                        className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs"
                      >
                        {tag.trim()}
                      </span>
                    )
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4">
            <h3 className="font-semibold">Details</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Company</dt>
                <dd>{contact.company ?? "--"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Phone</dt>
                <dd>{contact.phone ?? "--"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Source</dt>
                <dd>{contact.source ?? "--"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Added</dt>
                <dd>{new Date(contact.createdAt).toLocaleDateString()}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
