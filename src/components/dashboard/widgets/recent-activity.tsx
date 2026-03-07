"use client"

import { UserType } from "@/types/features"
import { Clock } from "lucide-react"

export function RecentActivity({ userType: _userType }: { userType: UserType }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="text-sm font-semibold mb-3">Recent Activity</h3>
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Clock className="h-8 w-8 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">
          Your recent activity will appear here
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Start creating to see your history
        </p>
      </div>
    </div>
  )
}
