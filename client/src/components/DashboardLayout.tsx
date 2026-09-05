import { useAuth } from "@/_core/hooks/useAuth";
import { startDevLogin } from "@/const";
import { ThemeToggle, SimpleThemeToggle } from "@/components/ThemeToggle";
import { trpc } from "@/lib/trpc";
import {
  Archive,
  BookOpen,
  ChartNoAxesCombined,
  ChevronRight,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Plus,
  Settings,
  Sparkles,
  StickyNote,
  ExternalLink,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "./ui/button";

const menuItems = [
  { icon: LayoutDashboard, label: "Overview", path: "/app", cue: "01" },
  { icon: BookOpen, label: "Subjects", path: "/app/subjects", cue: "02" },
  { icon: MessageSquare, label: "Snippets", path: "/app/templates", cue: "03" },
  { icon: StickyNote, label: "Notes", path: "/app/notes", cue: "04" },
  { icon: ChartNoAxesCombined, label: "Reports", path: "/app/reports", cue: "05" },
  { icon: Archive, label: "Archive", path: "/app/archive", cue: "06" },
  { icon: Settings, label: "Settings", path: "/app/settings", cue: "07" },
];

function NavItems({ mobile = false }: { mobile?: boolean }) {
  const [location] = useLocation();
  return (
    <nav
      aria-label={mobile ? "Main navigation" : "Secretary navigation"}
      className={mobile ? "grid grid-cols-7" : "space-y-1"}
    >
      {menuItems.map(item => {
        const active = location === item.path || (item.path !== "/app" && location.startsWith(item.path));
        const Icon = item.icon;
        return (
          <Link
            key={item.path}
            href={item.path}
            aria-current={active ? "page" : undefined}
            className={
              mobile
                ? `signal-action flex min-h-12 flex-col items-center justify-center gap-1 px-1 text-[10px] font-semibold transition-all ${
                    active ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                  }`
                : `signal-action group relative flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-semibold transition-all ${
                    active
                      ? "bg-secondary text-foreground shadow-sm ring-1 ring-border/50"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                  }`
            }
          >
            {!mobile ? (
              <span
                className={`w-5 font-mono text-[10px] font-bold tracking-wider ${
                  active ? "text-primary" : "text-muted-foreground/50"
                }`}
              >
                {item.cue}
              </span>
            ) : null}
            <Icon
              className={`h-4 w-4 shrink-0 transition-transform ${
                active ? "text-primary scale-110" : "group-hover:scale-105"
              }`}
              aria-hidden="true"
            />
            <span className="flex-1 truncate">{item.label}</span>
            {!mobile && active ? (
              <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-primary" aria-hidden="true" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user, logout } = useAuth();
  const [location] = useLocation();
  const subjects = trpc.subjects.list.useQuery(undefined, { enabled: Boolean(user), staleTime: 0, refetchOnMount: "always" });
  const activeSubjects = subjects.data?.filter(s => s.status === "active") ?? [];

  if (loading) return <div className="min-h-screen bg-background" aria-label="Loading workspace" />;

  if (!user)
    return (
      <main className="grid min-h-screen place-items-center bg-background px-5 text-foreground">
        <section className="w-full max-w-lg border-t-2 border-primary bg-card p-7 sm:p-9 shadow-2xl rounded-2xl border border-border/80">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-primary text-sm font-extrabold text-primary-foreground shadow-md shadow-primary/20">
              SS
            </span>
            <div>
              <p className="signal-kicker">Workspace Portal</p>
              <h1 className="text-xl font-bold tracking-tight text-foreground">supersec</h1>
            </div>
          </div>

          <h2 className="signal-title mt-6 text-2xl sm:text-3xl font-extrabold">Manage your class.</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Sign in to manage class records, automated attendance with Zoom AI, announcements, and sharing.
          </p>

          <div className="mt-8 space-y-3">
            <Link href="/login" className="block">
              <Button className="w-full justify-center text-sm font-bold shadow-md shadow-primary/20">
                Sign In / Register
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => startDevLogin()}
              className="w-full justify-center text-xs font-semibold"
            >
              <Sparkles className="mr-1.5 size-3.5 text-primary" />
              1-Click Secretary Quick Access
            </Button>
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-xs">
            <Link
              href="/"
              className="signal-action font-semibold text-primary hover:underline inline-flex items-center gap-1"
            >
              View shared public pages <ExternalLink className="size-3" />
            </Link>
            <SimpleThemeToggle />
          </div>
        </section>
      </main>
    );

  return (
    <div className="signal-canvas min-h-screen text-foreground">
      {/* Desktop Sidebar */}
      <aside className="signal-sidebar-surface fixed inset-y-0 left-0 hidden w-72 flex-col border-r border-sidebar-border lg:flex shadow-sm">
        {/* Sidebar Header */}
        <div className="border-b border-sidebar-border px-5 py-4">
          <Link
            href="/app"
            className="flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-xs font-extrabold text-primary-foreground shadow-md shadow-primary/20 transition-transform group-hover:scale-105">
              SS
            </span>
            <span className="min-w-0">
              <span className="block font-[Manrope] text-base font-extrabold tracking-[-0.04em] text-foreground">
                supersec
              </span>
              <span className="block truncate text-xs text-muted-foreground">Class secretary workspace</span>
            </span>
          </Link>
        </div>

        {/* Navigation Menu */}
        <div className="px-3 pb-3 pt-5">
          <p className="signal-kicker px-3">Workspace</p>
          <div className="mt-2.5">
            <NavItems />
          </div>
        </div>

        {/* Quick Subjects Jump List */}
        {activeSubjects.length > 0 && (
          <div className="px-3 py-3 border-t border-sidebar-border/80">
            <div className="flex items-center justify-between px-3 pb-2">
              <p className="signal-kicker">Active Desks</p>
              <Link href="/app/subjects/new" className="text-muted-foreground hover:text-primary transition-colors" title="New Subject">
                <Plus className="size-3.5" />
              </Link>
            </div>
            <div className="space-y-0.5 max-h-44 overflow-y-auto hide-scrollbar">
              {activeSubjects.slice(0, 5).map(s => {
                const isCurrent = location.includes(`/app/subjects/${s.id}`);
                return (
                  <Link
                    key={s.id}
                    href={`/app/subjects/${s.id}`}
                    className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isCurrent
                        ? "bg-primary/10 text-primary font-bold"
                        : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="size-1.5 rounded-full bg-primary/70 shrink-0" />
                      <span className="truncate">{s.code}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground/70 font-mono truncate max-w-20">
                      {s.professorName.split(" ").pop()}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Sidebar Footer */}
        <div className="mt-auto border-t border-sidebar-border px-4 py-4 bg-sidebar/50">
          <div className="flex items-center justify-between gap-2 mb-3 px-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Appearance</span>
            <ThemeToggle compact />
          </div>

          <div className="rounded-xl border border-border/70 bg-card/60 p-3 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary text-xs font-bold">
                {(user.name?.[0] || "S").toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-foreground">{user.name || "Class Secretary"}</p>
                <p className="truncate text-[11px] text-muted-foreground">{user.email || "Secretary account"}</p>
              </div>
              <Button
                onClick={logout}
                variant="ghost"
                size="icon"
                className="size-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                title="Sign out"
              >
                <LogOut className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="signal-header-surface sticky top-0 z-30 flex min-h-16 items-center justify-between px-4 backdrop-blur lg:ml-72 lg:hidden border-b border-border">
        <Link
          href="/app"
          className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-xs font-extrabold text-primary-foreground shadow-sm">
            SS
          </span>
          <span>
            <span className="block text-sm font-extrabold tracking-[-0.04em]">supersec</span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Secretary Desk
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <SimpleThemeToggle />
          <Button onClick={logout} variant="ghost" size="icon" aria-label="Sign out" className="size-9 rounded-xl">
            <LogOut className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="min-h-screen px-4 pb-28 pt-7 lg:ml-72 lg:px-10 lg:pb-16 lg:pt-10">{children}</main>

      {/* Mobile Bottom Navigation */}
      <div className="signal-header-surface fixed inset-x-0 bottom-0 z-40 border-t border-border px-2 py-1.5 backdrop-blur lg:hidden shadow-lg">
        <NavItems mobile />
      </div>
    </div>
  );
}
