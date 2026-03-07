"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export function PublishToggle({
  pageId,
  published,
}: {
  pageId: string
  published: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    try {
      await fetch(`/api/landing-pages/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !published }),
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${
        published
          ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400"
          : "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
      } disabled:opacity-50`}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {published ? "Unpublish" : "Publish"}
    </button>
  )
}
