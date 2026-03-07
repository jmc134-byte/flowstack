"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

interface SheetContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const SheetContext = React.createContext<SheetContextValue>({
  open: false,
  setOpen: () => {},
})

interface SheetProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

function Sheet({ open: controlledOpen, onOpenChange, children }: SheetProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen

  const setOpen = React.useCallback(
    (value: boolean) => {
      if (!isControlled) setUncontrolledOpen(value)
      onOpenChange?.(value)
    },
    [isControlled, onOpenChange]
  )

  return (
    <SheetContext.Provider value={{ open, setOpen }}>
      {children}
    </SheetContext.Provider>
  )
}

function SheetTrigger({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { setOpen } = React.useContext(SheetContext)
  return (
    <button
      type="button"
      className={className}
      onClick={() => setOpen(true)}
      {...props}
    >
      {children}
    </button>
  )
}

function SheetClose({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { setOpen } = React.useContext(SheetContext)
  return (
    <button
      type="button"
      className={className}
      onClick={() => setOpen(false)}
      {...props}
    >
      {children}
    </button>
  )
}

type SheetSide = "top" | "right" | "bottom" | "left"

interface SheetContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: SheetSide
}

const sideStyles: Record<SheetSide, { base: string; open: string; closed: string }> = {
  top: {
    base: "inset-x-0 top-0 border-b",
    open: "translate-y-0",
    closed: "-translate-y-full",
  },
  bottom: {
    base: "inset-x-0 bottom-0 border-t",
    open: "translate-y-0",
    closed: "translate-y-full",
  },
  left: {
    base: "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
    open: "translate-x-0",
    closed: "-translate-x-full",
  },
  right: {
    base: "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
    open: "translate-x-0",
    closed: "translate-x-full",
  },
}

function SheetContent({
  side = "right",
  className,
  children,
  ...props
}: SheetContentProps) {
  const { open, setOpen } = React.useContext(SheetContext)
  const [mounted, setMounted] = React.useState(false)
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    if (open) {
      // Small delay to trigger CSS transition
      requestAnimationFrame(() => setVisible(true))
      document.body.style.overflow = "hidden"
    } else {
      setVisible(false)
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    if (open) document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [open, setOpen])

  if (!mounted || !open) return null

  const styles = sideStyles[side]

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        className={cn(
          "fixed inset-0 bg-black/80 transition-opacity duration-300",
          visible ? "opacity-100" : "opacity-0"
        )}
        onClick={() => setOpen(false)}
      />
      <div
        className={cn(
          "fixed z-50 gap-4 bg-background p-6 shadow-lg transition-transform duration-300 ease-in-out",
          styles.base,
          visible ? styles.open : styles.closed,
          className
        )}
        {...props}
      >
        {children}
        <button
          type="button"
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          onClick={() => setOpen(false)}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
      </div>
    </div>,
    document.body
  )
}

function SheetHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col space-y-2 text-center sm:text-left",
        className
      )}
      {...props}
    />
  )
}

function SheetFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
        className
      )}
      {...props}
    />
  )
}

function SheetTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("text-lg font-semibold text-foreground", className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
