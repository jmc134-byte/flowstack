import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      userType: string
      onboarded: boolean
    } & DefaultSession["user"]
  }

  interface User {
    userType: string
    onboarded: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    userType: string
    onboarded: boolean
  }
}
