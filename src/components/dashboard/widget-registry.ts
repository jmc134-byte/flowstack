import { UserType } from "@/types/features"

export interface WidgetConfig {
  id: string
  title: string
  component: string
  size: "small" | "medium" | "large"
}

export const WIDGET_REGISTRY: Record<UserType, WidgetConfig[]> = {
  [UserType.FREELANCER]: [
    { id: "stats", title: "Overview", component: "StatsOverview", size: "large" },
    { id: "quick-actions", title: "Quick Actions", component: "QuickActions", size: "medium" },
    { id: "recent", title: "Recent Activity", component: "RecentActivity", size: "medium" },
    { id: "email-stats", title: "Email Performance", component: "EmailStats", size: "small" },
  ],
  [UserType.SMALL_BUSINESS]: [
    { id: "stats", title: "Overview", component: "StatsOverview", size: "large" },
    { id: "quick-actions", title: "Quick Actions", component: "QuickActions", size: "medium" },
    { id: "leads", title: "Customer Pipeline", component: "LeadsPipeline", size: "medium" },
    { id: "recent", title: "Recent Activity", component: "RecentActivity", size: "small" },
  ],
  [UserType.AGENCY]: [
    { id: "stats", title: "Overview", component: "StatsOverview", size: "large" },
    { id: "quick-actions", title: "Quick Actions", component: "QuickActions", size: "medium" },
    { id: "funnel-perf", title: "Funnel Performance", component: "FunnelPerformance", size: "medium" },
    { id: "leads", title: "Prospecting Pipeline", component: "LeadsPipeline", size: "small" },
    { id: "recent", title: "Recent Activity", component: "RecentActivity", size: "small" },
  ],
  [UserType.ECOMMERCE]: [
    { id: "stats", title: "Overview", component: "StatsOverview", size: "large" },
    { id: "quick-actions", title: "Quick Actions", component: "QuickActions", size: "medium" },
    { id: "funnel-perf", title: "Funnel Performance", component: "FunnelPerformance", size: "medium" },
    { id: "email-stats", title: "Email Performance", component: "EmailStats", size: "small" },
    { id: "recent", title: "Recent Activity", component: "RecentActivity", size: "small" },
  ],
}
