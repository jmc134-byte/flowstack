"use client"

import { UserType } from "@/types/features"
import { GitBranch } from "lucide-react"

export function FunnelPerformance({ userType: _userType }: { userType: UserType }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="text-sm font-semibold mb-3">Funnel Performance</h3>
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <GitBranch className="h-8 w-8 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">No funnels yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Build your first sales funnel
        </p>
      </div>
    </div>
  )
}
