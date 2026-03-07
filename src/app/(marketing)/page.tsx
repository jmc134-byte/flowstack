import Link from "next/link"
import {
  Zap,
  Globe,
  Mail,
  BarChart3,
  Users,
  Share2,
  ArrowRight,
  Sparkles,
  Layers,
  Target,
  TrendingUp,
  Check,
} from "lucide-react"

const personas = [
  {
    title: "Freelancers",
    description:
      "Landing pages, email marketing, and contacts — the essentials to grow your personal brand.",
    icon: Sparkles,
    gradient: "from-violet-500 to-purple-600",
    features: ["Landing Pages", "Email", "Contacts"],
  },
  {
    title: "Small Business",
    description:
      "Your website, email campaigns, and customer management — everything to run your business.",
    icon: Layers,
    gradient: "from-blue-500 to-cyan-500",
    features: ["Websites", "Email", "CRM"],
  },
  {
    title: "Agencies",
    description:
      "The full toolkit — websites, funnels, email, prospecting, and social for every client.",
    icon: Target,
    gradient: "from-pink-500 to-rose-500",
    features: ["Full Suite", "Multi-client", "Reports"],
  },
  {
    title: "E-commerce",
    description:
      "Sales funnels, product pages, and email campaigns — drive conversions and revenue.",
    icon: TrendingUp,
    gradient: "from-amber-500 to-orange-500",
    features: ["Funnels", "Products", "Campaigns"],
  },
]

const features = [
  {
    title: "Website Builder",
    description:
      "Build professional websites with our intuitive drag-and-drop editor. No code required.",
    icon: Globe,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    title: "Landing Pages",
    description:
      "Create high-converting landing pages in minutes with proven templates.",
    icon: Zap,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  {
    title: "Sales Funnels",
    description:
      "Design multi-step funnels that guide visitors from discovery to conversion.",
    icon: BarChart3,
    color: "text-pink-500",
    bg: "bg-pink-500/10",
  },
  {
    title: "Email Marketing",
    description:
      "Send targeted campaigns with beautiful templates and smart segmentation.",
    icon: Mail,
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
  },
  {
    title: "Prospecting",
    description:
      "Manage leads and customers with a powerful built-in CRM pipeline.",
    icon: Users,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    title: "Social Campaigns",
    description:
      "Plan, schedule, and analyze your social media from one dashboard.",
    icon: Share2,
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
]

const stats = [
  { value: "10x", label: "Faster Launch" },
  { value: "50%", label: "Cost Savings" },
  { value: "99.9%", label: "Uptime" },
  { value: "24/7", label: "Support" },
]

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col overflow-hidden">
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 text-white font-bold text-sm shadow-lg shadow-violet-500/25">
              FS
            </div>
            <span className="text-xl font-bold tracking-tight">FlowStack</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#personas" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Solutions
            </a>
            <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="inline-flex h-9 items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 text-sm font-medium text-white hover:opacity-90 transition-all shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 md:pt-44 md:pb-32 grid-pattern">
          {/* Background orbs */}
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-violet-400/20 rounded-full blur-3xl animate-pulse-glow pointer-events-none" />
          <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-pink-400/15 rounded-full blur-3xl animate-pulse-glow animation-delay-1000 pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative mx-auto max-w-7xl px-6">
            <div className="mx-auto max-w-4xl text-center">
              {/* Badge */}
              <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5 text-sm text-violet-700 mb-8">
                <Sparkles className="h-3.5 w-3.5" />
                <span className="font-medium">Adaptive Marketing Platform</span>
              </div>

              <h1 className="animate-fade-up animation-delay-200 text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1]">
                Marketing tools{" "}
                <span className="gradient-text">built for you</span>
              </h1>

              <p className="animate-fade-up animation-delay-400 mt-6 text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                Stop drowning in features you don&apos;t need. FlowStack adapts to
                who you are — showing only the tools that matter for your business.
              </p>

              <div className="animate-fade-up animation-delay-600 flex flex-col sm:flex-row items-center justify-center gap-4 pt-10">
                <Link
                  href="/register"
                  className="group inline-flex h-13 items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-8 text-base font-semibold text-white hover:opacity-90 transition-all shadow-xl shadow-violet-500/25 hover:shadow-violet-500/40 hover:-translate-y-0.5"
                >
                  Start Free
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-13 items-center justify-center rounded-xl border border-border bg-background/80 backdrop-blur px-8 text-base font-semibold hover:bg-accent transition-all hover:-translate-y-0.5"
                >
                  Sign In
                </Link>
              </div>
            </div>

            {/* Stats bar */}
            <div className="animate-fade-up animation-delay-800 mt-20 mx-auto max-w-3xl">
              <div className="glass rounded-2xl px-6 py-5 shadow-xl shadow-black/5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {stats.map((stat) => (
                    <div key={stat.label} className="text-center">
                      <div className="text-2xl sm:text-3xl font-bold gradient-text">
                        {stat.value}
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Personas Section */}
        <section id="personas" className="relative py-24 md:py-32">
          <div className="mx-auto max-w-7xl px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <div className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm text-muted-foreground mb-6">
                <Target className="h-3.5 w-3.5" />
                <span className="font-medium">Tailored Experience</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                One platform,{" "}
                <span className="gradient-text">tailored to you</span>
              </h2>
              <p className="mt-4 text-muted-foreground text-lg">
                Tell us about your business and we&apos;ll show you exactly the tools you need.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {personas.map((item, i) => (
                <div
                  key={item.title}
                  className={`animate-fade-up animation-delay-${(i + 1) * 200} group relative rounded-2xl border bg-card p-6 space-y-4 hover:shadow-xl hover:shadow-black/5 transition-all duration-300 hover:-translate-y-1 overflow-hidden`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-5 transition-opacity duration-300 from-violet-500 to-purple-500" />
                  <div className={`relative inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${item.gradient} text-white shadow-lg`}>
                    <item.icon className="h-6 w-6" />
                  </div>
                  <h3 className="relative text-lg font-semibold">{item.title}</h3>
                  <p className="relative text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                  <div className="relative flex flex-wrap gap-2 pt-1">
                    {item.features.map((f) => (
                      <span
                        key={f}
                        className="inline-flex items-center rounded-lg bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="relative py-24 md:py-32 bg-muted/30">
          <div className="mx-auto max-w-7xl px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <div className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm text-muted-foreground mb-6">
                <Layers className="h-3.5 w-3.5" />
                <span className="font-medium">Full Suite</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Everything you need,{" "}
                <span className="gradient-text">nothing you don&apos;t</span>
              </h2>
              <p className="mt-4 text-muted-foreground text-lg">
                Powerful tools that work together seamlessly to grow your business.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, i) => (
                <div
                  key={feature.title}
                  className={`animate-fade-up animation-delay-${(i + 1) * 200} group rounded-2xl border bg-card p-7 hover:shadow-xl hover:shadow-black/5 transition-all duration-300 hover:-translate-y-1`}
                >
                  <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${feature.bg} ${feature.color} mb-4`}>
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section id="pricing" className="relative py-24 md:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-600 to-pink-600" />
          <div className="absolute inset-0 grid-pattern opacity-10" />

          {/* Floating orbs */}
          <div className="absolute top-10 left-10 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-10 right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl animate-float animation-delay-1000" />

          <div className="relative mx-auto max-w-3xl px-6 text-center text-white">
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight">
              Ready to grow your business?
            </h2>
            <p className="mt-6 text-lg text-white/80 leading-relaxed max-w-xl mx-auto">
              Join thousands of businesses using FlowStack to streamline their marketing and drive results.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="group inline-flex h-13 items-center justify-center rounded-xl bg-white px-8 text-base font-semibold text-violet-700 hover:bg-white/90 transition-all shadow-xl hover:-translate-y-0.5"
              >
                Start Free Today
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <div className="flex items-center gap-4 text-sm text-white/70">
                <span className="flex items-center gap-1.5">
                  <Check className="h-4 w-4" /> No credit card
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="h-4 w-4" /> Free forever plan
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-12 bg-card">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 text-white font-bold text-xs">
                FS
              </div>
              <span className="text-lg font-bold tracking-tight">FlowStack</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#features" className="hover:text-foreground transition-colors">Features</a>
              <a href="#personas" className="hover:text-foreground transition-colors">Solutions</a>
              <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
              <Link href="/login" className="hover:text-foreground transition-colors">Sign In</Link>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} FlowStack. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
