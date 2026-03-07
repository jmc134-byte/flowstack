import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Mail, Plus } from "lucide-react"

export default async function EmailCampaignsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const campaigns = await db.emailCampaign.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { recipients: true } } },
    orderBy: { updatedAt: "desc" },
  })

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
          <h1 className="text-2xl font-bold">Email Campaigns</h1>
          <p className="text-muted-foreground">
            Create and send email campaigns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/email/contacts"
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Contacts
          </Link>
          <Link
            href="/dashboard/email/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Campaign
          </Link>
        </div>
      </div>

      {campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border bg-card p-12 text-center">
          <Mail className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No campaigns yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Create your first email campaign to reach your audience.
          </p>
          <Link
            href="/dashboard/email/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Create Campaign
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <Link
              key={campaign.id}
              href={`/dashboard/email/${campaign.id}`}
              className="rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="font-semibold">{campaign.name}</h3>
                  {campaign.subject && (
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      Subject: {campaign.subject}
                    </p>
                  )}
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium capitalize ${
                    statusStyles[campaign.status] ?? statusStyles.draft
                  }`}
                >
                  {campaign.status}
                </span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {campaign._count.recipients} recipient
                {campaign._count.recipients !== 1 ? "s" : ""} &middot; Updated{" "}
                {campaign.updatedAt.toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
