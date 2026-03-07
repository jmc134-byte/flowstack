"use client"

import { UserType } from "@/types/features"
import { Eye, Users, MousePointerClick, TrendingUp } from "lucide-react"

const STATS_BY_TYPE: Record<UserType, { label: string; value: string; change: string; icon: React.ElementType }[]> = {
  [UserType.FREELANCER]: [
    { label: "Page Views", value: "1,234", change: "+12%", icon: Eye },
    { label: "Subscribers", value: "456", change: "+8%", icon: Users },
    { label: "Click Rate", value: "3.2%", change: "+0.5%", icon: MousePointerClick },
    { label: "Conversions", value: "23", change: "+15%", icon: TrendingUp },
  ],
  [UserType.SMALL_BUSINESS]: [
    { label: "Website Visits", value: "2,847", change: "+18%", icon: Eye },
    { label: "Customers", value: "189", change: "+5%", icon: Users },
    { label: "Email Opens", value: "42%", change: "+3%", icon: MousePointerClick },
    { label: "Growth", value: "+12%", change: "+2%", icon: TrendingUp },
  ],
  [UserType.AGENCY]: [
    { label: "Total Views", value: "45,678", change: "+22%", icon: Eye },
    { label: "Active Leads", value: "342", change: "+15%", icon: Users },
    { label: "Avg CTR", value: "4.8%", change: "+0.8%", icon: MousePointerClick },
    { label: "Revenue", value: "$12.4k", change: "+18%", icon: TrendingUp },
  ],
  [UserType.ECOMMERCE]: [
    { label: "Funnel Views", value: "8,932", change: "+25%", icon: Eye },
    { label: "Customers", value: "567", change: "+12%", icon: Users },
    { label: "Conversion Rate", value: "5.2%", change: "+1.1%", icon: MousePointerClick },
    { label: "Revenue", value: "$24.8k", change: "+20%", icon: TrendingUp },
  ],
}

export function StatsOverview({ userType }: { userType: UserType }) {
  const stats = STATS_BY_TYPE[userType]

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <div key={stat.label} className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{stat.label}</span>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold">{stat.value}</span>
              <span className="ml-2 text-xs text-green-600">{stat.change}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
