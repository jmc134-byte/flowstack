"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Globe,
  FileText,
  GitBranch,
  Mail,
  Users,
  UserCheck,
  Search,
  Share2,
  LayoutDashboard,
  Settings,
} from "lucide-react"
import { getFeaturesForUser } from "@/lib/feature-map"
import { UserType } from "@/types/features"

const iconMap: Record<string, React.ElementType> = {
  Globe,
  FileText,
  GitBranch,
  Mail,
  Users,
  UserCheck,
  Search,
  Share2,
}

interface SidebarProps {
  userType: string
  userName: string
  userEmail: string
}

export function Sidebar({ userType, userName }: SidebarProps) {
  const pathname = usePathname()
  const features = getFeaturesForUser(userType as UserType)

  return (
    <aside className="hidden w-64 flex-col border-r bg-sidebar lg:flex">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
          FS
        </div>
        <span className="text-lg font-bold">FlowStack</span>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        <Link
          href="/dashboard"
          className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            pathname === "/dashboard"
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          }`}
        >
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </Link>

        <div className="pt-4 pb-2">
          <span className="px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            Tools
          </span>
        </div>

        {features.map((feature) => {
          const Icon = iconMap[feature.icon] || FileText
          const isActive = pathname.startsWith(feature.href)

          return (
            <Link
              key={feature.key}
              href={feature.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {feature.label}
              {feature.isPrimary && (
                <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                  ★
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="border-t p-4">
        <Link
          href="/dashboard/settings"
          className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            pathname.startsWith("/dashboard/settings")
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          }`}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
        <div className="mt-3 px-3">
          <p className="text-sm font-medium truncate">{userName}</p>
          <p className="text-xs text-sidebar-foreground/50 capitalize">
            {userType.toLowerCase().replace("_", " ")}
          </p>
        </div>
      </div>
    </aside>
  )
}
