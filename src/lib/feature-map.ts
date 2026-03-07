import { UserType, Feature, type FeatureConfig } from "@/types/features"

export const USER_FEATURE_MAP: Record<UserType, FeatureConfig[]> = {
  [UserType.FREELANCER]: [
    {
      key: Feature.LANDING_PAGES,
      label: "Landing Pages",
      description: "Create high-converting landing pages",
      icon: "FileText",
      href: "/dashboard/landing-pages",
      priority: 1,
      isPrimary: true,
    },
    {
      key: Feature.EMAIL,
      label: "Email Marketing",
      description: "Send campaigns to your audience",
      icon: "Mail",
      href: "/dashboard/email",
      priority: 2,
      isPrimary: true,
    },
    {
      key: Feature.SOCIAL,
      label: "Social Campaigns",
      description: "Plan and schedule social posts",
      icon: "Share2",
      href: "/dashboard/social",
      priority: 3,
      isPrimary: false,
    },
    {
      key: Feature.PROSPECTING,
      label: "Contacts",
      description: "Manage your contact list",
      icon: "Users",
      href: "/dashboard/prospecting",
      priority: 4,
      isPrimary: false,
    },
  ],
  [UserType.SMALL_BUSINESS]: [
    {
      key: Feature.WEBSITES,
      label: "My Website",
      description: "Build and manage your business website",
      icon: "Globe",
      href: "/dashboard/websites",
      priority: 1,
      isPrimary: true,
    },
    {
      key: Feature.EMAIL,
      label: "Email Campaigns",
      description: "Reach your customers via email",
      icon: "Mail",
      href: "/dashboard/email",
      priority: 2,
      isPrimary: true,
    },
    {
      key: Feature.PROSPECTING,
      label: "My Customers",
      description: "Track and manage your customers",
      icon: "UserCheck",
      href: "/dashboard/prospecting",
      priority: 3,
      isPrimary: true,
    },
    {
      key: Feature.SOCIAL,
      label: "Social Media",
      description: "Manage your social presence",
      icon: "Share2",
      href: "/dashboard/social",
      priority: 4,
      isPrimary: false,
    },
  ],
  [UserType.AGENCY]: [
    {
      key: Feature.WEBSITES,
      label: "Websites",
      description: "Build websites for your clients",
      icon: "Globe",
      href: "/dashboard/websites",
      priority: 1,
      isPrimary: true,
    },
    {
      key: Feature.LANDING_PAGES,
      label: "Landing Pages",
      description: "Create campaign landing pages",
      icon: "FileText",
      href: "/dashboard/landing-pages",
      priority: 2,
      isPrimary: true,
    },
    {
      key: Feature.FUNNELS,
      label: "Sales Funnels",
      description: "Design multi-step sales funnels",
      icon: "GitBranch",
      href: "/dashboard/funnels",
      priority: 3,
      isPrimary: true,
    },
    {
      key: Feature.EMAIL,
      label: "Email Marketing",
      description: "Run email campaigns at scale",
      icon: "Mail",
      href: "/dashboard/email",
      priority: 4,
      isPrimary: false,
    },
    {
      key: Feature.PROSPECTING,
      label: "Prospecting",
      description: "Find and manage leads",
      icon: "Search",
      href: "/dashboard/prospecting",
      priority: 5,
      isPrimary: false,
    },
    {
      key: Feature.SOCIAL,
      label: "Social Campaigns",
      description: "Manage social media campaigns",
      icon: "Share2",
      href: "/dashboard/social",
      priority: 6,
      isPrimary: false,
    },
  ],
  [UserType.ECOMMERCE]: [
    {
      key: Feature.FUNNELS,
      label: "Sales Funnels",
      description: "Build conversion funnels for your products",
      icon: "GitBranch",
      href: "/dashboard/funnels",
      priority: 1,
      isPrimary: true,
    },
    {
      key: Feature.LANDING_PAGES,
      label: "Product Pages",
      description: "Create product landing pages",
      icon: "FileText",
      href: "/dashboard/landing-pages",
      priority: 2,
      isPrimary: true,
    },
    {
      key: Feature.EMAIL,
      label: "Email Campaigns",
      description: "Drive sales with email",
      icon: "Mail",
      href: "/dashboard/email",
      priority: 3,
      isPrimary: true,
    },
    {
      key: Feature.PROSPECTING,
      label: "Customers",
      description: "Manage your customer base",
      icon: "Users",
      href: "/dashboard/prospecting",
      priority: 4,
      isPrimary: false,
    },
  ],
}

export function getFeaturesForUser(userType: UserType): FeatureConfig[] {
  return USER_FEATURE_MAP[userType].sort((a, b) => a.priority - b.priority)
}

export function hasFeature(userType: UserType, feature: Feature): boolean {
  return USER_FEATURE_MAP[userType].some((f) => f.key === feature)
}

export function getFeatureRoute(feature: Feature): string {
  return `/dashboard/${feature}`
}
