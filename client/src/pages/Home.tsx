import { ArrowRight, BookOpen, LockKeyhole, MessageCircleMore } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  return (
    <main className="min-h-[100dvh] bg-background text-foreground">
      <header className="border-b border-border px-5 sm:px-8 lg:px-12"><div className="mx-auto flex min-h-14 max-w-7xl items-center justify-between"><div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">CM</span><span className="text-sm font-semibold tracking-[-0.03em]">Class Management</span></div><Link href="/app" className="linear-action inline-flex min-h-11 items-center px-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Secretary sign in</Link></div></header>
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 sm:px-8 lg:min-h-[calc(100dvh-3.5rem)] lg:grid-cols-[minmax(0,1fr)_minmax(22rem,.86fr)] lg:px-12 lg:py-20">
        <div className="max-w-2xl"><p className="linear-label text-primary">A shared home for every class</p><h1 className="linear-display mt-4">Clear class information, ready to share.</h1><p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">Open a Subject link from Messenger to find published Attendance, Announcements, Resources, and Questions & Answers in one simple place.</p><div className="mt-8"><Link href="/app" className="linear-action inline-flex min-h-11 items-center gap-2 bg-primary px-4 text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Open secretary workspace <ArrowRight className="h-4 w-4" /></Link></div></div>
        <section className="linear-panel p-5 sm:p-6"><div className="flex items-center justify-between gap-3 border-b border-border pb-4"><div><p className="linear-label text-muted-foreground">Public class pages</p><p className="mt-1 text-sm text-muted-foreground">View-only, ready to share.</p></div><span className="rounded-full border border-primary/35 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">Safe sharing</span></div><div className="divide-y divide-border"><InfoRow icon={BookOpen} title="Subject information" body="Name, code, professor, Schedule, and No Class notices." /><InfoRow icon={MessageCircleMore} title="Shareable updates" body="Published items have simple links that are ready to send in Messenger." /><InfoRow icon={LockKeyhole} title="Safe public view" body="Private Zoom input, drafts, and secretary-only work are not shown on shared pages." /></div><p className="linear-panel-raised mt-5 rounded-md px-4 py-3 text-sm leading-6 text-muted-foreground">Your secretary shares a Subject link when its class information is ready for your group.</p></section>
      </section>
    </main>
  );
}

function InfoRow({ icon: Icon, title, body }: { icon: typeof BookOpen; title: string; body: string }) {
  return <div className="flex gap-3 py-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-border bg-secondary text-primary"><Icon className="h-4 w-4" /></span><div><h2 className="text-sm font-medium">{title}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p></div></div>;
}
