import Link from "next/link"

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              FS
            </div>
            <span className="text-xl font-bold">FlowStack</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-7xl px-4 py-24 text-center">
          <div className="mx-auto max-w-3xl space-y-6">
            <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
              Marketing tools built{" "}
              <span className="text-primary">for you</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Stop drowning in features you don&apos;t need. FlowStack adapts to
              who you are — showing only the tools that matter for your business.
            </p>
            <div className="flex items-center justify-center gap-4 pt-4">
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-base font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Start Free
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-md border border-input px-8 text-base font-medium hover:bg-accent transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        </section>

        <section className="border-t bg-muted/50 py-20">
          <div className="mx-auto max-w-7xl px-4">
            <h2 className="text-center text-3xl font-bold mb-12">
              One platform, tailored to you
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  title: "Freelancers",
                  description:
                    "Landing pages, email marketing, and contacts — the essentials to grow your personal brand.",
                  icon: "🎨",
                },
                {
                  title: "Small Business",
                  description:
                    "Your website, email campaigns, and customer management — everything to run your business.",
                  icon: "🏪",
                },
                {
                  title: "Agencies",
                  description:
                    "The full toolkit — websites, funnels, email, prospecting, and social for every client.",
                  icon: "🏢",
                },
                {
                  title: "E-commerce",
                  description:
                    "Sales funnels, product pages, and email campaigns — drive conversions and revenue.",
                  icon: "🛒",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-lg border bg-card p-6 space-y-3"
                >
                  <div className="text-3xl">{item.icon}</div>
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto max-w-7xl px-4">
            <h2 className="text-center text-3xl font-bold mb-12">
              Everything you need, nothing you don&apos;t
            </h2>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: "Website Builder",
                  description: "Build professional websites with drag-and-drop blocks.",
                },
                {
                  title: "Landing Pages",
                  description: "Create high-converting landing pages in minutes.",
                },
                {
                  title: "Sales Funnels",
                  description: "Design multi-step funnels that convert visitors to customers.",
                },
                {
                  title: "Email Marketing",
                  description: "Send targeted campaigns and grow your audience.",
                },
                {
                  title: "Prospecting",
                  description: "Manage leads and customers with a built-in CRM.",
                },
                {
                  title: "Social Campaigns",
                  description: "Plan and manage your social media presence.",
                },
              ].map((feature) => (
                <div key={feature.title} className="space-y-2">
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} FlowStack. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
