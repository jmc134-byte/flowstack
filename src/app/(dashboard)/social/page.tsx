import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Share2, Plus } from "lucide-react"

export default async function SocialCampaignsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const campaigns = await db.socialCampaign.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
  })

  const platformStyles: Record<string, string> = {
    twitter: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
    facebook:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    instagram:
      "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
    linkedin:
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
    tiktok:
      "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
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
          <h1 className="text-2xl font-bold">Social Campaigns</h1>
          <p className="text-muted-foreground">
            Plan and schedule social media posts
          </p>
        </div>
        <Link
          href="/dashboard/social/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Campaign
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border bg-card p-12 text-center">
          <Share2 className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No social campaigns yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Create your first social media campaign to grow your presence.
          </p>
          <Link
            href="/dashboard/social/new"
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
              href={`/dashboard/social/${campaign.id}`}
              className="rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="font-semibold">{campaign.name}</h3>
                  {campaign.content && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {campaign.content}
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
              <div className="mt-3 flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                    platformStyles[campaign.platform] ??
                    "bg-muted text-muted-foreground"
                  }`}
                >
                  {campaign.platform}
                </span>
                <span className="text-xs text-muted-foreground">
                  Updated {campaign.updatedAt.toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
