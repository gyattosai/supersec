import { ArrowRight, BookOpen, LockKeyhole, MessageCircleMore } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  return (
    <main className="min-h-screen bg-background px-5 py-6 text-foreground sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">CM</span>
            <span className="font-semibold tracking-[-0.03em]">Class Management</span>
          </div>
          <Link href="/app" className="rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Secretary sign in
          </Link>
        </header>

        <section className="grid min-h-[74vh] items-center gap-12 py-16 lg:grid-cols-[1.08fr_.92fr] lg:py-20">
          <div>
            <p className="text-sm font-semibold text-primary">A shared home for every class</p>
            <h1 className="apple-display mt-4 max-w-3xl">Clear class information, ready to share.</h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              Open a Subject link from Messenger to find published Attendance, Announcements, Resources, and Questions & Answers in one simple place.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/app" className="apple-action inline-flex min-h-11 items-center gap-2 bg-primary px-5 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                Open secretary workspace <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <section className="apple-surface rounded-[30px] p-6 sm:p-7">
            <p className="text-sm font-medium text-muted-foreground">Public class pages</p>
            <div className="mt-6 space-y-4">
              <InfoRow icon={BookOpen} title="Subject information" body="Name, code, professor, Schedule, and No Class notices." />
              <InfoRow icon={MessageCircleMore} title="Shareable updates" body="Published items have simple links that are ready to send in Messenger." />
              <InfoRow icon={LockKeyhole} title="Safe public view" body="Private Zoom input, drafts, and secretary-only work are not shown on shared pages." />
            </div>
            <p className="apple-inset mt-7 rounded-[18px] px-4 py-3 text-sm leading-6 text-muted-foreground">Your secretary shares a Subject link when its class information is ready for your group.</p>
          </section>
        </section>
      </div>
    </main>
  );
}

function InfoRow({ icon: Icon, title, body }: { icon: typeof BookOpen; title: string; body: string }) {
  return (
    <div className="flex gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground"><Icon className="h-4 w-4" /></span>
      <div><h2 className="text-sm font-semibold">{title}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p></div>
    </div>
  );
}
