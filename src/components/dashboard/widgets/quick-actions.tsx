"use client"

import Link from "next/link"
import { Plus } from "lucide-react"
import { UserType } from "@/types/features"
import { getFeaturesForUser } from "@/lib/feature-map"

export function QuickActions({ userType }: { userType: UserType }) {
  const features = getFeaturesForUser(userType).filter((f) => f.isPrimary)

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="text-sm font-semibold mb-3">Quick Actions</h3>
      <div className="space-y-2">
        {features.map((feature) => (
          <Link
            key={feature.key}
            href={`${feature.href}/new`}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
          >
            <Plus className="h-4 w-4 text-primary" />
            <span>New {feature.label.replace(/^My\s/, "")}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
