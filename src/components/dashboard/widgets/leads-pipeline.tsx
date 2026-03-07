"use client"

import { UserType } from "@/types/features"
import { Users } from "lucide-react"

export function LeadsPipeline({ userType: _userType }: { userType: UserType }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="text-sm font-semibold mb-3">Pipeline</h3>
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <Users className="h-8 w-8 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">No contacts yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Add your first contact
        </p>
      </div>
    </div>
  )
}
