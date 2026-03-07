import type { Metadata } from "next"
import { AuthSessionProvider } from "@/providers/session-provider"
import "./globals.css"

export const metadata: Metadata = {
  title: "FlowStack - Marketing Platform",
  description: "Integral marketing platform adapted to your needs",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  )
}
