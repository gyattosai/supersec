import { SimpleThemeToggle } from "@/components/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FileCheck2,
  GraduationCap,
  LockKeyhole,
  MessageCircleMore,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { usePageMeta } from "@/lib/meta";
import { Link } from "wouter";

export default function Home() {
  usePageMeta({
    title: "supersec — Class Secretary Management System",
    description: "Modern, high-productivity class secretary management system with live roll call, AI Zoom proof intake, official announcements, course resources, and view-only student portals.",
    keywords: ["Class Secretary", "Attendance Tracking", "Student Management", "Zoom Proofs", "Resources", "Announcements", "Class Portal"],
    canonicalPath: "/",
    ogImage: "/api/og?type=subject&title=supersec&subtitle=" + encodeURIComponent("Class Secretary Management System"),
    ogImageAlt: "supersec Class Secretary Management System",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "supersec",
      applicationCategory: "EducationalApplication",
      operatingSystem: "All",
      description: "Modern class secretary management system with live roll call, AI Zoom proof intake, and view-only student portals.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
    },
  });
  return (
    <main className="signal-canvas min-h-[100dvh] text-foreground flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-md px-5 sm:px-8 lg:px-12">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-xs font-extrabold text-primary-foreground shadow-md shadow-primary/20 transition-transform group-hover:scale-105">
              SS
            </span>
            <span>
              <span className="block text-sm font-extrabold tracking-[-0.03em] text-foreground">supersec</span>
              <span className="hidden text-[10px] text-muted-foreground sm:block">Class secretary management</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <SimpleThemeToggle />
            <Link
              href="/login"
              className="signal-action inline-flex min-h-10 items-center rounded-xl border border-border bg-card/60 px-4 text-xs font-bold text-foreground hover:bg-secondary transition-all shadow-sm"
            >
              Secretary Sign In
            </Link>
            <Link
              href="/app"
              className="signal-action inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground hover:opacity-95 shadow-md shadow-primary/25"
            >
              Open Workspace <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="signal-landing-hero mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary shadow-sm mb-6">
            <Sparkles className="size-3.5" />
            <span>Modern Class Secretary System</span>
          </div>

          <h1 className="signal-title text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.08] text-foreground">
            Manage your class. <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-primary via-primary/80 to-amber-500 bg-clip-text text-transparent">
              Share what matters.
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-lg leading-relaxed text-muted-foreground max-w-2xl">
            Supersec empowers class secretaries to organize independent subject desks, run AI-assisted Zoom attendance, publish view-only updates, and export official reports.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
            <Link
              href="/app"
              className="signal-action inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-extrabold text-primary-foreground shadow-xl shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Launch Secretary Workspace <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/login"
              className="signal-action inline-flex min-h-12 items-center gap-2 rounded-xl border border-border bg-card/70 px-5 text-sm font-bold text-foreground hover:bg-secondary transition-all"
            >
              Sign In / Register
            </Link>
          </div>
        </div>

        {/* Live Interactive Mockup Card */}
        <div className="mt-14 max-w-4xl mx-auto">
          <div className="signal-card-shell">
            <div className="signal-record-card p-6 sm:p-8 rounded-2xl border border-primary/20 bg-gradient-to-b from-card via-card/95 to-secondary/30 shadow-2xl">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-border/80">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-primary text-xs font-extrabold text-primary-foreground">
                    RM
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-foreground">Research Methods (RM 101)</h3>
                      <Badge className="rounded-full bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                        Published
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Prof. Anderson · Tue & Fri 9:00 AM - 11:00 AM</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="rounded-lg text-xs font-semibold px-3 py-1">
                    42 Students Enrolled
                  </Badge>
                </div>
              </div>

              {/* Mockup Interactive Grid */}
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="signal-inset p-3.5 rounded-xl text-center">
                  <p className="text-xs font-bold text-muted-foreground">Present</p>
                  <p className="font-[Manrope] text-2xl font-black text-emerald-400 mt-1">38</p>
                </div>
                <div className="signal-inset p-3.5 rounded-xl text-center">
                  <p className="text-xs font-bold text-muted-foreground">Absent</p>
                  <p className="font-[Manrope] text-2xl font-black text-red-400 mt-1">2</p>
                </div>
                <div className="signal-inset p-3.5 rounded-xl text-center">
                  <p className="text-xs font-bold text-muted-foreground">Excused</p>
                  <p className="font-[Manrope] text-2xl font-black text-sky-400 mt-1">2</p>
                </div>
                <div className="signal-inset p-3.5 rounded-xl text-center">
                  <p className="text-xs font-bold text-muted-foreground">Attendance Rate</p>
                  <p className="font-[Manrope] text-2xl font-black text-primary mt-1">95%</p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border/80 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <CheckCircle2 className="size-4" /> Zoom AI match completed (38 of 38 verified)
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  View-only portal: supersec.app/s/RM101-N001
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Grid Features */}
      <section className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8 lg:px-12 border-t border-border">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="signal-kicker">Built for Class Efficiency</p>
          <h2 className="signal-title mt-2 text-2xl sm:text-4xl font-extrabold text-foreground">
            Everything a class secretary needs.
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Save hours each week on attendance, excused absence slips, announcement formatting, and professor reporting.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={BookOpen}
            title="Subject Desks"
            body="Isolate each class with its own master list, weekly rhythm, and view-only section identity."
          />
          <FeatureCard
            icon={Zap}
            title="Zoom AI Attendance"
            body="Paste messy Zoom participant lists. AI parses section codes, fixes reversed names, and matches roster entries."
          />
          <FeatureCard
            icon={Users}
            title="View-Only Portals"
            body="Classmates open a fast, mobile-friendly link in Messenger or Telegram with zero login or password friction."
          />
          <FeatureCard
            icon={FileCheck2}
            title="Official Reports & PDF"
            body="Generate clean PDF reports and 1-click aggregate summaries for professor updates and department records."
          />
          <FeatureCard
            icon={MessageCircleMore}
            title="Announcements & Q&A"
            body="Publish formatted course updates and build a reusable FAQ library to end repetitive chat inquiries."
          />
          <FeatureCard
            icon={LockKeyhole}
            title="Privacy by Design"
            body="Private notes, raw logs, and unconfirmed drafts are strictly protected and never leak to public view-only links."
          />
        </div>
      </section>

      {/* Security Callout */}
      <section className="mx-auto w-full max-w-6xl px-5 pb-20 sm:px-8 lg:px-12">
        <div className="rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-card to-card p-6 sm:p-10 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 text-primary font-bold text-sm">
              <ShieldCheck className="size-5" /> Strict Data Isolation
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-foreground">
              Your secretary notes stay completely private.
            </h3>
            <p className="text-sm text-muted-foreground max-w-xl">
              Public links only expose allowlisted final statuses and published announcements. Unenrolled names, attendance notes, and Zoom inputs remain private to you.
            </p>
          </div>
          <Link
            href="/app"
            className="signal-action shrink-0 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20"
          >
            Get Started Now <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border bg-card/40 py-8 px-5 sm:px-8 lg:px-12 text-center text-xs text-muted-foreground">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground">supersec</span>
            <span>— Class Secretary Management System</span>
          </div>
          <p>© {new Date().getFullYear()} supersec. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({ icon: Icon, title, body }: { icon: typeof BookOpen; title: string; body: string }) {
  return (
    <article className="signal-gradient-tile rounded-2xl border border-border p-6 shadow-sm hover:border-primary/40 hover:shadow-md transition-all">
      <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary mb-4">
        <Icon className="size-5" />
      </span>
      <h3 className="text-lg font-bold tracking-tight text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </article>
  );
}
