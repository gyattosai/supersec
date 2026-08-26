import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Archive, BookOpen, ChartNoAxesCombined, LayoutDashboard, LogOut, Settings } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "./ui/button";

const menuItems = [
  { icon: LayoutDashboard, label: "Overview", path: "/app", cue: "01" },
  { icon: BookOpen, label: "Subjects", path: "/app/subjects", cue: "02" },
  { icon: ChartNoAxesCombined, label: "Reports", path: "/app/reports", cue: "03" },
  { icon: Archive, label: "Archive", path: "/app/archive", cue: "04" },
  { icon: Settings, label: "Settings", path: "/app/settings", cue: "05" },
];

function NavItems({ mobile = false }: { mobile?: boolean }) {
  const [location] = useLocation();
  return <nav aria-label={mobile ? "Main navigation" : "Secretary navigation"} className={mobile ? "grid grid-cols-5" : "space-y-1"}>{menuItems.map(item => {
    const active = location === item.path;
    const Icon = item.icon;
    return <Link key={item.path} href={item.path} aria-current={active ? "page" : undefined} className={mobile ? `signal-action flex min-h-12 flex-col items-center justify-center gap-1 px-1 text-[10px] font-semibold ${active ? "text-primary" : "text-muted-foreground"}` : `signal-action group relative flex min-h-12 items-center gap-3 px-3 text-sm font-semibold ${active ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/65 hover:text-foreground"}`}>
      {!mobile ? <span className={`w-5 text-[10px] font-bold tracking-[0.08em] ${active ? "text-primary" : "text-muted-foreground/60"}`}>{item.cue}</span> : null}
      <Icon className={`h-4 w-4 shrink-0 ${active ? "text-primary" : ""}`} aria-hidden="true" />
      <span>{item.label}</span>
      {!mobile && active ? <span className="absolute inset-y-3 left-0 w-0.5 rounded-full bg-primary" aria-hidden="true" /> : null}
    </Link>;
  })}</nav>;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user, logout } = useAuth();
  if (loading) return <div className="min-h-screen bg-background" aria-label="Loading workspace" />;

  if (!user) return <main className="grid min-h-screen place-items-center bg-background px-5 text-foreground"><section className="w-full max-w-lg border-t-2 border-primary bg-card p-7 sm:p-9"><p className="signal-kicker">Private class control</p><h1 className="signal-title mt-3 text-3xl">Run the class record with confidence.</h1><p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">Secretary tools are available only to the workspace owner. Shared class pages remain separate and require no sign-in.</p><Button onClick={() => startLogin()} className="mt-8 w-full">Sign in to the workspace</Button><Link href="/" className="signal-action mt-5 block text-center text-sm font-semibold text-primary hover:underline">View the public class board</Link></section></main>;

  return <div className="min-h-screen bg-background text-foreground"><aside className="fixed inset-y-0 left-0 hidden w-72 flex-col border-r border-sidebar-border bg-sidebar lg:flex"><Link href="/app" className="flex items-center gap-3 border-b border-sidebar-border px-6 py-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="grid h-10 w-10 place-items-center rounded-[14px] bg-primary text-xs font-extrabold text-primary-foreground">CM</span><span><span className="block font-[Manrope] text-base font-extrabold tracking-[-0.05em]">Class Management</span><span className="mt-0.5 block text-xs text-muted-foreground">Secretary control room</span></span></Link><div className="px-4 pb-3 pt-7"><p className="signal-kicker px-3">Work areas</p><div className="mt-3"><NavItems /></div></div><div className="mt-auto border-t border-sidebar-border px-6 py-5"><p className="signal-kicker">Signed in</p><p className="mt-2 truncate text-sm font-semibold">{user.name || "Class secretary"}</p><p className="mt-1 truncate text-xs text-muted-foreground">{user.email || "Workspace owner"}</p><Button onClick={logout} variant="ghost" className="mt-4 w-full justify-start px-2 text-muted-foreground hover:text-foreground"><LogOut className="h-4 w-4" />Sign out</Button></div></aside>
    <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between bg-background/95 px-4 backdrop-blur lg:ml-72 lg:hidden"><Link href="/app" className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-xs font-extrabold text-primary-foreground">CM</span><span><span className="block text-sm font-extrabold tracking-[-0.04em]">Class Management</span><span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Control room</span></span></Link><Button onClick={logout} variant="ghost" size="icon" aria-label="Sign out"><LogOut className="h-4 w-4" /></Button></header>
    <main className="min-h-screen px-4 pb-28 pt-7 lg:ml-72 lg:px-10 lg:pb-12 lg:pt-10">{children}</main>
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-sidebar/95 px-2 py-1.5 backdrop-blur lg:hidden"><NavItems mobile /></div>
  </div>;
}
