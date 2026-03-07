"use client"

import { UserType } from "@/types/features"
import { Mail } from "lucide-react"

export function EmailStats({ userType: _userType }: { userType: UserType }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="text-sm font-semibold mb-3">Email Performance</h3>
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <Mail className="h-8 w-8 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">No campaigns yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Create your first email campaign
        </p>
      </div>
    </div>
  )
}
