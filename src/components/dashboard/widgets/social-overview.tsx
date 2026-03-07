"use client"

import { UserType } from "@/types/features"
import { Share2 } from "lucide-react"

export function SocialOverview({ userType: _userType }: { userType: UserType }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="text-sm font-semibold mb-3">Social Media</h3>
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <Share2 className="h-8 w-8 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">No campaigns yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Plan your first social campaign
        </p>
      </div>
    </div>
  )
}
