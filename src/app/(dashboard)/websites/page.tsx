import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Globe, Plus } from "lucide-react"

export default async function WebsitesPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const websites = await db.website.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { pages: true } } },
    orderBy: { updatedAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Websites</h1>
          <p className="text-muted-foreground">
            Build and manage your websites
          </p>
        </div>
        <Link
          href="/dashboard/websites/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Website
        </Link>
      </div>

      {websites.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border bg-card p-12 text-center">
          <Globe className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No websites yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Create your first website to establish your online presence.
          </p>
          <Link
            href="/dashboard/websites/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Create Website
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {websites.map((website) => (
            <Link
              key={website.id}
              href={`/dashboard/websites/${website.id}`}
              className="rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="font-semibold">{website.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    /{website.slug}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                    website.published
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                  }`}
                >
                  {website.published ? "Published" : "Draft"}
                </span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {website._count.pages} page{website._count.pages !== 1 ? "s" : ""}{" "}
                &middot; Updated {website.updatedAt.toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
