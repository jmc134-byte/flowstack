"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

const USER_TYPES = [
  {
    id: "FREELANCER",
    title: "Freelancer / Solopreneur",
    description: "I manage my own brand or work with a few clients",
    icon: "🎨",
    features: ["Landing Pages", "Email Marketing", "Social Campaigns", "Contacts"],
  },
  {
    id: "SMALL_BUSINESS",
    title: "Small Business Owner",
    description: "I run a business and need marketing tools",
    icon: "🏪",
    features: ["My Website", "Email Campaigns", "Customer Management", "Social Media"],
  },
  {
    id: "AGENCY",
    title: "Marketing Agency",
    description: "I manage campaigns for multiple clients",
    icon: "🏢",
    features: ["Websites", "Landing Pages", "Funnels", "Email", "Prospecting", "Social"],
  },
  {
    id: "ECOMMERCE",
    title: "E-commerce Seller",
    description: "I sell products online and need conversion tools",
    icon: "🛒",
    features: ["Sales Funnels", "Product Pages", "Email Campaigns", "Customers"],
  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const { update } = useSession()
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [step, setStep] = useState(1)
  const [businessName, setBusinessName] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleComplete() {
    if (!selectedType) return
    setLoading(true)

    try {
      await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userType: selectedType,
          businessName,
        }),
      })

      await update({ userType: selectedType, onboarded: true })
      router.push("/dashboard")
      router.refresh()
    } catch {
      // Handle error silently for MVP
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-muted/50 flex items-center justify-center px-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              FS
            </div>
          </div>
          <h1 className="text-3xl font-bold">Welcome to FlowStack</h1>
          <p className="text-muted-foreground mt-2">
            {step === 1
              ? "Tell us about yourself so we can customize your experience"
              : "Almost there! Set up your workspace"}
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <div
              className={`h-2 w-16 rounded-full ${
                step >= 1 ? "bg-primary" : "bg-muted"
              }`}
            />
            <div
              className={`h-2 w-16 rounded-full ${
                step >= 2 ? "bg-primary" : "bg-muted"
              }`}
            />
          </div>
        </div>

        {step === 1 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {USER_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`rounded-lg border-2 bg-card p-6 text-left transition-all hover:shadow-md ${
                  selectedType === type.id
                    ? "border-primary shadow-md"
                    : "border-transparent hover:border-muted-foreground/20"
                }`}
              >
                <div className="text-3xl mb-3">{type.icon}</div>
                <h3 className="text-lg font-semibold">{type.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {type.description}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {type.features.map((f) => (
                    <span
                      key={f}
                      className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="mx-auto max-w-md rounded-lg border bg-card p-8">
            <h2 className="text-xl font-semibold mb-4">Set up your workspace</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="businessName" className="text-sm font-medium">
                  Business or Brand Name
                </label>
                <input
                  id="businessName"
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Enter your business name"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                You selected:{" "}
                <span className="font-medium text-foreground">
                  {USER_TYPES.find((t) => t.id === selectedType)?.title}
                </span>
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-center gap-4 mt-8">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="inline-flex h-10 items-center justify-center rounded-md border border-input px-6 text-sm font-medium hover:bg-accent transition-colors"
            >
              Back
            </button>
          )}
          {step === 1 ? (
            <button
              onClick={() => setStep(2)}
              disabled={!selectedType}
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={loading}
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {loading ? "Setting up..." : "Launch My Dashboard"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
