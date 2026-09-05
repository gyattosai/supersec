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
  Menu,
  MessageSquare,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings,
  Sparkles,
  StickyNote,
  ExternalLink,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
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

const primaryMobileItems = [
  { icon: LayoutDashboard, label: "Overview", path: "/app" },
  { icon: BookOpen, label: "Subjects", path: "/app/subjects" },
  { icon: StickyNote, label: "Notes", path: "/app/notes" },
  { icon: MessageSquare, label: "Snippets", path: "/app/templates" },
];

const secondaryMobileItems = [
  { icon: ChartNoAxesCombined, label: "Reports", path: "/app/reports", desc: "Compiled PDF and session analytics" },
  { icon: Archive, label: "Archive", path: "/app/archive", desc: "Archived subjects and old records" },
  { icon: Settings, label: "Settings", path: "/app/settings", desc: "Class secretary profile and preferences" },
];

function NavItems({ onNavigate, collapsed = false }: { onNavigate?: () => void; collapsed?: boolean }) {
  const [location] = useLocation();
  return (
    <nav aria-label="Secretary navigation" className="space-y-1">
      {menuItems.map(item => {
        const active = location === item.path || (item.path !== "/app" && location.startsWith(item.path));
        const Icon = item.icon;
        return (
          <Link
            key={item.path}
            href={item.path}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            aria-label={collapsed ? item.label : undefined}
            aria-current={active ? "page" : undefined}
            className={`signal-action group relative flex min-h-12 items-center rounded-xl text-sm font-semibold transition-all ${
              collapsed
                ? "justify-center px-0 w-12 mx-auto"
                : "gap-3 px-3.5"
            } ${
              active
                ? "bg-secondary text-foreground shadow-sm ring-1 ring-border/50"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            }`}
          >
            {!collapsed && (
              <span
                className={`w-5 font-mono text-[10px] font-bold tracking-wider ${
                  active ? "text-primary" : "text-muted-foreground/50"
                }`}
              >
                {item.cue}
              </span>
            )}
            <Icon
              className={`h-4.5 w-4.5 shrink-0 transition-transform ${
                active ? "text-primary scale-110" : "group-hover:scale-105"
              }`}
              aria-hidden="true"
            />
            {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
            {active ? (
              <span
                className={`absolute bg-primary ${
                  collapsed
                    ? "left-0 top-2 bottom-2 w-1 rounded-r-full"
                    : "inset-y-2 left-0 w-1 rounded-r-full"
                }`}
                aria-hidden="true"
              />
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
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("supersec_sidebar_collapsed") === "true";
    }
    return false;
  });

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("supersec_sidebar_collapsed", String(next));
      }
      return next;
    });
  };

  const subjects = trpc.subjects.list.useQuery(undefined, { enabled: Boolean(user), staleTime: 0, refetchOnMount: "always" });
  const activeSubjects = subjects.data?.filter(s => s.status === "active") ?? [];

  // Lock body scroll when mobile drawers or sheets are active
  useEffect(() => {
    if (mobileDrawerOpen || moreSheetOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [mobileDrawerOpen, moreSheetOpen]);

  // Close modals on route change
  useEffect(() => {
    setMobileDrawerOpen(false);
    setMoreSheetOpen(false);
  }, [location]);

  if (loading) return <div className="min-h-screen bg-background" aria-label="Loading workspace" />;

  if (!user)
    return (
      <main className="grid min-h-screen place-items-center bg-background px-4 sm:px-6 py-8 text-foreground">
        <section className="w-full max-w-lg border-t-2 border-primary bg-card p-6 sm:p-9 shadow-2xl rounded-2xl border border-border/80">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-primary text-sm font-extrabold text-primary-foreground shadow-md shadow-primary/20">
              SS
            </span>
            <div>
              <p className="signal-kicker">Workspace Portal</p>
              <h1 className="text-xl font-bold tracking-tight text-foreground">supersec</h1>
            </div>
          </div>

          <h2 className="signal-title mt-6 text-2xl sm:text-3xl font-extrabold">Manage your class.</h2>
          <p className="mt-3 text-xs sm:text-sm leading-relaxed text-muted-foreground">
            Sign in to manage class records, automated attendance with Zoom AI, announcements, and sharing.
          </p>

          <div className="mt-8 space-y-3">
            <Link href="/login" className="block">
              <Button className="w-full min-h-12 justify-center text-sm font-bold shadow-md shadow-primary/20 rounded-xl">
                Sign In / Register
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => startDevLogin()}
              className="w-full min-h-12 justify-center text-xs sm:text-sm font-semibold rounded-xl"
            >
              <Sparkles className="mr-1.5 size-4 text-primary" />
              1-Click Secretary Quick Access
            </Button>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-xs">
            <Link
              href="/"
              className="signal-action min-h-11 inline-flex items-center gap-1 font-semibold text-primary hover:underline"
            >
              View shared public pages <ExternalLink className="size-3.5" />
            </Link>
            <SimpleThemeToggle />
          </div>
        </section>
      </main>
    );

  const isMoreActive =
    location.startsWith("/app/reports") ||
    location.startsWith("/app/archive") ||
    location.startsWith("/app/settings");

  return (
    <div className="signal-canvas min-h-screen text-foreground overflow-x-hidden">
      {/* Desktop Sidebar */}
      <aside
        className={`signal-sidebar-surface fixed inset-y-0 left-0 hidden flex-col border-r border-sidebar-border lg:flex shadow-sm z-30 transition-[width] duration-200 ${
          isCollapsed ? "w-20" : "w-72"
        }`}
      >
        {/* Sidebar Header */}
        <div
          className={`border-b border-sidebar-border flex items-center min-h-16 transition-all ${
            isCollapsed ? "justify-center p-3" : "justify-between px-5 py-4"
          }`}
        >
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2">
              <Link
                href="/app"
                className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                title="supersec workspace"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-xs font-extrabold text-primary-foreground shadow-md shadow-primary/20 transition-transform group-hover:scale-105">
                  SS
                </span>
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
                title="Expand sidebar"
                aria-label="Expand sidebar"
              >
                <PanelLeftOpen className="size-4" />
              </Button>
            </div>
          ) : (
            <>
              <Link
                href="/app"
                className="flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-12 min-w-0"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-xs font-extrabold text-primary-foreground shadow-md shadow-primary/20 transition-transform group-hover:scale-105">
                  SS
                </span>
                <span className="min-w-0 truncate">
                  <span className="block font-[Manrope] text-base font-extrabold tracking-[-0.04em] text-foreground truncate">
                    supersec
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">Class secretary workspace</span>
                </span>
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="size-8 rounded-lg text-muted-foreground hover:text-foreground shrink-0 ml-1"
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="size-4" />
              </Button>
            </>
          )}
        </div>

        {/* Navigation Menu */}
        <div className={`pb-3 pt-4 ${isCollapsed ? "px-2" : "px-3"}`}>
          {!isCollapsed && <p className="signal-kicker px-3 mb-2">Workspace</p>}
          <NavItems collapsed={isCollapsed} />
        </div>

        {/* Quick Subjects Jump List */}
        {activeSubjects.length > 0 && (
          <div className={`py-3 border-t border-sidebar-border/80 ${isCollapsed ? "px-2" : "px-3"}`}>
            {isCollapsed ? (
              <div className="flex flex-col items-center gap-1.5">
                <Link
                  href="/app/subjects"
                  className="grid size-10 place-items-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-primary transition-colors"
                  title="All Active Desks"
                >
                  <BookOpen className="size-4" />
                </Link>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between px-3 pb-2">
                  <p className="signal-kicker">Active Desks</p>
                  <Link href="/app/subjects/new" className="text-muted-foreground hover:text-primary transition-colors p-1" title="New Subject">
                    <Plus className="size-4" />
                  </Link>
                </div>
                <div className="space-y-0.5 max-h-44 overflow-y-auto hide-scrollbar">
                  {activeSubjects.slice(0, 5).map(s => {
                    const isCurrent = location.includes(`/app/subjects/${s.id}`);
                    return (
                      <Link
                        key={s.id}
                        href={`/app/subjects/${s.id}`}
                        className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all min-h-10 ${
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
              </>
            )}
          </div>
        )}

        {/* Sidebar Footer */}
        <div className={`mt-auto border-t border-sidebar-border bg-sidebar/50 ${
          isCollapsed ? "p-2.5 flex flex-col items-center gap-3" : "px-4 py-4"
        }`}>
          {isCollapsed ? (
            <>
              <SimpleThemeToggle />
              <div
                className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary text-xs font-bold"
                title={user.name || "Class Secretary"}
              >
                {(user.name?.[0] || "S").toUpperCase()}
              </div>
              <Button
                onClick={logout}
                variant="ghost"
                size="icon"
                className="size-9 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="size-4" />
              </Button>
            </>
          ) : (
            <>
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
                    className="size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                    title="Sign out"
                    aria-label="Sign out"
                  >
                    <LogOut className="size-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Mobile Top Header (with Safe Area Inset and Hamburger Drawer Toggle) */}
      <header className="signal-header-surface sticky top-0 z-30 flex min-h-16 items-center justify-between px-3 sm:px-4 backdrop-blur lg:ml-72 lg:hidden border-b border-border pt-[max(0.25rem,env(safe-area-inset-top,0px))]">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="grid size-11 place-items-center rounded-xl text-foreground hover:bg-secondary/70 active:scale-95 transition-all cursor-pointer"
            aria-label="Open workspace menu drawer"
          >
            <Menu className="size-5.5" />
          </button>
          <Link
            href="/app"
            className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-11 px-1"
          >
            <span className="grid size-8 place-items-center rounded-lg bg-primary text-xs font-extrabold text-primary-foreground shadow-sm">
              SS
            </span>
            <span>
              <span className="block text-sm font-extrabold tracking-[-0.04em] leading-tight">supersec</span>
              <span className="block text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground leading-tight">
                Desk
              </span>
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-1.5">
          <SimpleThemeToggle />
          <Button
            onClick={logout}
            variant="ghost"
            size="icon"
            aria-label="Sign out"
            className="size-11 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4.5 w-4.5" />
          </Button>
        </div>
      </header>

      {/* Mobile Sidebar Slide-Over Drawer */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setMobileDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Canvas */}
          <aside className="relative z-50 w-4/5 max-w-xs bg-sidebar border-r border-sidebar-border shadow-2xl flex flex-col h-full overflow-y-auto pt-[max(0.5rem,env(safe-area-inset-top,0px))] pb-[max(1rem,env(safe-area-inset-bottom,0px))] animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-sidebar-border">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-xl bg-primary text-xs font-extrabold text-primary-foreground shadow-sm">
                  SS
                </span>
                <span className="font-[Manrope] text-base font-extrabold tracking-tight">supersec</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="grid size-11 place-items-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground active:scale-95 transition-all cursor-pointer"
                aria-label="Close navigation drawer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Nav Menu */}
            <div className="px-3 py-4">
              <p className="signal-kicker px-3 pb-2">Workspace Navigation</p>
              <NavItems onNavigate={() => setMobileDrawerOpen(false)} />
            </div>

            {/* Active Desks in Mobile Drawer */}
            {activeSubjects.length > 0 && (
              <div className="px-3 py-3 border-t border-sidebar-border">
                <div className="flex items-center justify-between px-3 pb-2">
                  <p className="signal-kicker">Active Desks</p>
                  <Link
                    href="/app/subjects/new"
                    onClick={() => setMobileDrawerOpen(false)}
                    className="text-muted-foreground hover:text-primary transition-colors p-2"
                    title="New Subject"
                  >
                    <Plus className="size-4 text-primary" />
                  </Link>
                </div>
                <div className="space-y-1">
                  {activeSubjects.slice(0, 6).map(s => (
                    <Link
                      key={s.id}
                      href={`/app/subjects/${s.id}`}
                      onClick={() => setMobileDrawerOpen(false)}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground min-h-10 transition-colors"
                    >
                      <span className="truncate">{s.code} · {s.name}</span>
                      <ChevronRight className="size-3.5 shrink-0 opacity-50" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="mt-auto border-t border-sidebar-border px-4 py-4 bg-sidebar/50 space-y-3">
              <div className="flex items-center justify-between gap-2 px-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Appearance</span>
                <ThemeToggle compact />
              </div>

              <div className="rounded-xl border border-border/70 bg-card/60 p-3 shadow-xs">
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
                    className="size-9 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                    title="Sign out"
                  >
                    <LogOut className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <main
        className={`min-h-screen px-3.5 sm:px-6 md:px-8 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] pt-5 sm:pt-7 lg:px-10 lg:pb-16 lg:pt-10 transition-[margin-left] duration-200 ${
          isCollapsed ? "lg:ml-20" : "lg:ml-72"
        }`}
      >
        {children}
      </main>

      {/* Mobile "More" Slide-Up Bottom Sheet */}
      {moreSheetOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setMoreSheetOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-50 rounded-t-3xl border-t border-border bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-200 max-h-[80vh] overflow-y-auto">
            <div className="mx-auto w-12 h-1.5 rounded-full bg-border" />
            <div className="flex items-center justify-between pb-2 border-b border-border/70">
              <div>
                <p className="signal-kicker">Workspace Extensions</p>
                <h3 className="text-base font-extrabold text-foreground">More Tools &amp; Actions</h3>
              </div>
              <button
                type="button"
                onClick={() => setMoreSheetOpen(false)}
                className="grid size-11 place-items-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground active:scale-95 transition-all cursor-pointer"
                aria-label="Close extended menu"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-1.5">
              {secondaryMobileItems.map(item => {
                const Icon = item.icon;
                const active = location.startsWith(item.path);
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setMoreSheetOpen(false)}
                    className={`flex items-center gap-3 p-3 rounded-2xl border transition-all min-h-14 ${
                      active
                        ? "border-primary/50 bg-primary/10 text-primary font-bold shadow-xs"
                        : "border-border/60 bg-secondary/30 text-foreground hover:bg-secondary/70"
                    }`}
                  >
                    <span className="grid size-10 place-items-center rounded-xl bg-card border border-border/80 text-primary shrink-0">
                      <Icon className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">{item.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.desc}</p>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground/60 shrink-0" />
                  </Link>
                );
              })}
            </div>

            <div className="pt-2 border-t border-border/70 flex items-center justify-between gap-3 text-xs">
              <Link
                href="/"
                onClick={() => setMoreSheetOpen(false)}
                className="signal-action min-h-11 inline-flex items-center gap-1.5 font-bold text-primary hover:underline px-2"
              >
                <ExternalLink className="size-4" /> View Public Portal
              </Link>
              <div className="flex items-center gap-2">
                <SimpleThemeToggle />
                <Button
                  onClick={() => { setMoreSheetOpen(false); logout(); }}
                  variant="outline"
                  className="min-h-11 rounded-xl text-xs font-semibold gap-1.5 text-destructive border-destructive/30"
                >
                  <LogOut className="size-4" /> Sign Out
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation (5 Strict 48px Touch Targets with Safe Area Inset) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="signal-header-surface fixed inset-x-0 bottom-0 z-40 border-t border-border px-1.5 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] backdrop-blur-md lg:hidden shadow-xl grid grid-cols-5 gap-1"
      >
        {primaryMobileItems.map(item => {
          const active = location === item.path || (item.path !== "/app" && location.startsWith(item.path));
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              href={item.path}
              aria-current={active ? "page" : undefined}
              className={`signal-action flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl py-1 text-[10px] font-bold transition-all cursor-pointer ${
                active
                  ? "text-primary bg-primary/10 shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              }`}
            >
              <Icon className={`size-5 shrink-0 transition-transform ${active ? "scale-110" : ""}`} aria-hidden="true" />
              <span className="truncate max-w-[62px]">{item.label}</span>
            </Link>
          );
        })}

        {/* 5th Button: More */}
        <button
          type="button"
          onClick={() => setMoreSheetOpen(true)}
          aria-label="Open more tools menu"
          className={`signal-action flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl py-1 text-[10px] font-bold transition-all cursor-pointer ${
            isMoreActive || moreSheetOpen
              ? "text-primary bg-primary/10 shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
          }`}
        >
          <MoreHorizontal className={`size-5 shrink-0 transition-transform ${isMoreActive || moreSheetOpen ? "scale-110" : ""}`} aria-hidden="true" />
          <span className="truncate max-w-[62px]">More</span>
        </button>
      </nav>
    </div>
  );
}
