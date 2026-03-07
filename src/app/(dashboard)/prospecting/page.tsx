"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Users, Plus, Loader2 } from "lucide-react"

interface Contact {
  id: string
  email: string
  name: string | null
  company: string | null
  status: string
  createdAt: string
}

const STATUSES = ["all", "lead", "prospect", "customer"] as const

export default function ProspectingPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string>("all")
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    company: "",
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch("/api/contacts")
      .then((res) => res.json())
      .then((data) => {
        setContacts(data)
        setLoading(false)
      })
  }, [])

  const filtered =
    activeTab === "all"
      ? contacts
      : contacts.filter((c) => c.status === activeTab)

  async function handleAddContact(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.email.trim()) return

    setSubmitting(true)
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email.trim(),
          name: formData.name.trim() || undefined,
          company: formData.company.trim() || undefined,
        }),
      })

      if (res.ok) {
        const contact = await res.json()
        setContacts((prev) => [contact, ...prev])
        setFormData({ email: "", name: "", company: "" })
        setShowForm(false)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const statusStyles: Record<string, string> = {
    lead: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    prospect:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    customer:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Prospecting</h1>
          <p className="text-muted-foreground">
            Manage your contacts and sales pipeline
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Contact
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleAddContact}
          className="rounded-lg border bg-card p-4"
        >
          <h3 className="mb-3 font-semibold">New Contact</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              placeholder="Email *"
              className="rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              required
            />
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Name"
              className="rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="text"
              value={formData.company}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, company: e.target.value }))
              }
              placeholder="Company"
              className="rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Add
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border px-3 py-1.5 text-sm hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="flex gap-1 rounded-lg border bg-card p-1">
        {STATUSES.map((status) => (
          <button
            key={status}
            onClick={() => setActiveTab(status)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
              activeTab === status
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent"
            }`}
          >
            {status === "all" ? "All" : status}
            <span className="ml-1.5 text-xs opacity-75">
              (
              {status === "all"
                ? contacts.length
                : contacts.filter((c) => c.status === status).length}
              )
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border bg-card p-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No contacts found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {activeTab === "all"
              ? "Add your first contact to start prospecting."
              : `No contacts with "${activeTab}" status.`}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Added</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((contact) => (
                  <tr key={contact.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/prospecting/${contact.id}`}
                        className="font-medium hover:underline"
                      >
                        {contact.name ?? (
                          <span className="text-muted-foreground">--</span>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{contact.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {contact.company ?? "--"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                          statusStyles[contact.status] ?? statusStyles.lead
                        }`}
                      >
                        {contact.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(contact.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
