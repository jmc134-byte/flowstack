import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Users, Plus } from "lucide-react"

export default async function EmailContactsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const contacts = await db.contact.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  })

  const statusStyles: Record<string, string> = {
    lead: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    prospect:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    customer:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/email"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Campaigns
          </Link>
          <h1 className="mt-2 text-2xl font-bold">Contacts</h1>
          <p className="text-muted-foreground">
            Manage your email contact list
          </p>
        </div>
        <Link
          href="/dashboard/prospecting"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Contact
        </Link>
      </div>

      {contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border bg-card p-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No contacts yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Add contacts to start building your email list.
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
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Added</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr key={contact.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      {contact.name ?? (
                        <span className="text-muted-foreground">--</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{contact.email}</td>
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
                      {contact.createdAt.toLocaleDateString()}
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
