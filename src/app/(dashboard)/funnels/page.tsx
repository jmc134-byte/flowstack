import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { GitBranch, Plus } from "lucide-react"

export default async function FunnelsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const funnels = await db.funnel.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { steps: true } } },
    orderBy: { updatedAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sales Funnels</h1>
          <p className="text-muted-foreground">
            Design multi-step sales funnels
          </p>
        </div>
        <Link
          href="/dashboard/funnels/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Funnel
        </Link>
      </div>

      {funnels.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border bg-card p-12 text-center">
          <GitBranch className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No funnels yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Create your first funnel to guide visitors through your sales
            process.
          </p>
          <Link
            href="/dashboard/funnels/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Create Funnel
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {funnels.map((funnel) => (
            <Link
              key={funnel.id}
              href={`/dashboard/funnels/${funnel.id}`}
              className="rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="font-semibold">{funnel.name}</h3>
                  {funnel.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {funnel.description}
                    </p>
                  )}
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                    funnel.published
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                  }`}
                >
                  {funnel.published ? "Published" : "Draft"}
                </span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {funnel._count.steps} step{funnel._count.steps !== 1 ? "s" : ""}{" "}
                &middot; Updated {funnel.updatedAt.toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
