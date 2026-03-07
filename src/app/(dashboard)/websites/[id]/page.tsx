import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, FileText, Plus } from "lucide-react"

export default async function WebsiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { id } = await params

  const website = await db.website.findFirst({
    where: { id, userId: session.user.id },
    include: {
      pages: { orderBy: { sortOrder: "asc" } },
    },
  })

  if (!website) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/websites"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Websites
          </Link>
          <h1 className="mt-2 text-2xl font-bold">{website.name}</h1>
          <p className="text-sm text-muted-foreground">/{website.slug}</p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
            website.published
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
          }`}
        >
          {website.published ? "Published" : "Draft"}
        </span>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Pages</h2>
          <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            Add Page
          </button>
        </div>

        {website.pages.length === 0 ? (
          <div className="mt-6 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 text-center">
            <FileText className="h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              No pages yet. Add your first page to get started.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {website.pages.map((page) => (
              <div
                key={page.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">{page.title}</p>
                  <p className="text-sm text-muted-foreground">/{page.slug}</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  Order: {page.sortOrder}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
