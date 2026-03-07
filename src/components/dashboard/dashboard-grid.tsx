"use client"

import { UserType } from "@/types/features"
import { WIDGET_REGISTRY } from "./widget-registry"
import { StatsOverview } from "./widgets/stats-overview"
import { QuickActions } from "./widgets/quick-actions"
import { RecentActivity } from "./widgets/recent-activity"
import { EmailStats } from "./widgets/email-stats"
import { FunnelPerformance } from "./widgets/funnel-performance"
import { LeadsPipeline } from "./widgets/leads-pipeline"

const COMPONENT_MAP: Record<string, React.ComponentType<{ userType: UserType }>> = {
  StatsOverview,
  QuickActions,
  RecentActivity,
  EmailStats,
  FunnelPerformance,
  LeadsPipeline,
}

interface DashboardGridProps {
  userType: UserType
}

export function DashboardGrid({ userType }: DashboardGridProps) {
  const widgets = WIDGET_REGISTRY[userType]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {widgets.map((widget) => {
        const Component = COMPONENT_MAP[widget.component]
        if (!Component) return null

        const colSpan =
          widget.size === "large"
            ? "sm:col-span-2 lg:col-span-3"
            : widget.size === "medium"
              ? "sm:col-span-1 lg:col-span-1"
              : ""

        return (
          <div key={widget.id} className={colSpan}>
            <Component userType={userType} />
          </div>
        )
      })}
    </div>
  )
}
