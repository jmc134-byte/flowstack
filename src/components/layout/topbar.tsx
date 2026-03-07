"use client"

import { signOut } from "next-auth/react"
import { LogOut, Menu } from "lucide-react"
import { useState } from "react"

interface TopbarProps {
  userName: string
}

export function Topbar({ userName }: TopbarProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <button className="lg:hidden" aria-label="Toggle menu">
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden lg:block" />

      <div className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm hover:bg-accent transition-colors"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
            {userName.charAt(0).toUpperCase()}
          </div>
          <span className="hidden sm:inline">{userName}</span>
        </button>

        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 z-50 mt-2 w-48 rounded-md border bg-popover p-1 shadow-md">
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
