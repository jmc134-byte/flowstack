import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { FileText, Plus } from "lucide-react"

export default async function LandingPagesPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const landingPages = await db.landingPage.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Landing Pages</h1>
          <p className="text-muted-foreground">
            Create and manage your landing pages
          </p>
        </div>
        <Link
          href="/dashboard/landing-pages/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Landing Page
        </Link>
      </div>

      {landingPages.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border bg-card p-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No landing pages yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Create your first landing page to start converting visitors.
          </p>
          <Link
            href="/dashboard/landing-pages/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Create Landing Page
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {landingPages.map((page) => (
            <Link
              key={page.id}
              href={`/dashboard/landing-pages/${page.id}`}
              className="rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="font-semibold">{page.name}</h3>
                  <p className="text-sm text-muted-foreground">/{page.slug}</p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                    page.published
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                  }`}
                >
                  {page.published ? "Published" : "Draft"}
                </span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Updated {page.updatedAt.toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
