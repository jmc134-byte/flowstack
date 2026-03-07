import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

const publicRoutes = ["/", "/login", "/register"]
const publicPrefixes = ["/p/", "/s/", "/api/auth/"]
const settingsRoutes = ["settings"]

const FEATURE_ROUTES: Record<string, string[]> = {
  FREELANCER: ["landing-pages", "email", "social", "prospecting"],
  SMALL_BUSINESS: ["websites", "email", "prospecting", "social"],
  AGENCY: ["websites", "landing-pages", "funnels", "email", "prospecting", "social"],
  ECOMMERCE: ["funnels", "landing-pages", "email", "prospecting"],
}

function isPublicRoute(pathname: string): boolean {
  if (publicRoutes.includes(pathname)) return true
  return publicPrefixes.some((prefix) => pathname.startsWith(prefix))
}

function getDashboardFeatureSegment(pathname: string): string | null {
  const match = pathname.match(/^\/dashboard\/([^/]+)/)
  return match ? match[1] : null
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (isPublicRoute(pathname)) {
    const token = await getToken({ req, secret: process.env.AUTH_SECRET })
    if (token && (pathname === "/login" || pathname === "/register")) {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }
    return NextResponse.next()
  }

  const token = await getToken({ req, secret: process.env.AUTH_SECRET })

  if (!token) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (!token.onboarded && pathname !== "/onboarding") {
    return NextResponse.redirect(new URL("/onboarding", req.url))
  }

  if (token.onboarded && pathname === "/onboarding") {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  if (pathname.startsWith("/dashboard/")) {
    const featureSegment = getDashboardFeatureSegment(pathname)
    if (featureSegment && !settingsRoutes.includes(featureSegment) && featureSegment !== "dashboard") {
      const userType = (token.userType as string) || "FREELANCER"
      const allowedRoutes = FEATURE_ROUTES[userType] || []
      if (!allowedRoutes.includes(featureSegment)) {
        return NextResponse.redirect(new URL("/dashboard", req.url))
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
