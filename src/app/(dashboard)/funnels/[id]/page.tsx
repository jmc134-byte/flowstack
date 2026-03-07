import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Plus } from "lucide-react"

export default async function FunnelDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { id } = await params

  const funnel = await db.funnel.findFirst({
    where: { id, userId: session.user.id },
    include: {
      steps: { orderBy: { sortOrder: "asc" } },
    },
  })

  if (!funnel) notFound()

  const stepTypeLabels: Record<string, string> = {
    landing: "Landing Page",
    email: "Email",
    checkout: "Checkout",
    upsell: "Upsell",
    downsell: "Downsell",
    thankyou: "Thank You",
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/funnels"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Funnels
          </Link>
          <h1 className="mt-2 text-2xl font-bold">{funnel.name}</h1>
          {funnel.description && (
            <p className="text-sm text-muted-foreground">
              {funnel.description}
            </p>
          )}
        </div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
            funnel.published
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
          }`}
        >
          {funnel.published ? "Published" : "Draft"}
        </span>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Funnel Steps</h2>
          <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            Add Step
          </button>
        </div>

        {funnel.steps.length === 0 ? (
          <div className="mt-6 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No steps yet. Add your first step to build the funnel pipeline.
            </p>
          </div>
        ) : (
          <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-4">
            {funnel.steps.map((step, index) => (
              <div key={step.id} className="flex items-center gap-2">
                <div className="min-w-[180px] rounded-lg border bg-background p-4 text-center">
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Step {index + 1}
                  </p>
                  <p className="mt-1 font-semibold">{step.name}</p>
                  <span className="mt-2 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs">
                    {stepTypeLabels[step.type] ?? step.type}
                  </span>
                </div>
                {index < funnel.steps.length - 1 && (
                  <ArrowRight className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
