import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { PublishToggle } from "./publish-toggle"

export default async function LandingPageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { id } = await params

  const page = await db.landingPage.findFirst({
    where: { id, userId: session.user.id },
  })

  if (!page) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/landing-pages"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Landing Pages
          </Link>
          <h1 className="mt-2 text-2xl font-bold">{page.name}</h1>
          <p className="text-sm text-muted-foreground">/{page.slug}</p>
        </div>
        <PublishToggle pageId={page.id} published={page.published} />
      </div>

      <div className="rounded-lg border bg-card p-6">
        <div className="flex min-h-[400px] items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25">
          <div className="text-center">
            <p className="text-lg font-medium text-muted-foreground">
              Block Editor
            </p>
            <p className="mt-1 text-sm text-muted-foreground/75">
              The drag-and-drop block editor will be built here.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
