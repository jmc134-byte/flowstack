export enum UserType {
  FREELANCER = "FREELANCER",
  SMALL_BUSINESS = "SMALL_BUSINESS",
  AGENCY = "AGENCY",
  ECOMMERCE = "ECOMMERCE",
}

export enum Feature {
  WEBSITES = "websites",
  LANDING_PAGES = "landing-pages",
  FUNNELS = "funnels",
  EMAIL = "email",
  PROSPECTING = "prospecting",
  SOCIAL = "social",
}

export interface FeatureConfig {
  key: Feature
  label: string
  description: string
  icon: string
  href: string
  priority: number
  isPrimary: boolean
}
