import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Archive, BookOpen, ChartNoAxesCombined, LayoutDashboard, LogOut, Settings } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "./ui/button";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/app" },
  { icon: BookOpen, label: "Subjects", path: "/app/subjects" },
  { icon: ChartNoAxesCombined, label: "Reports", path: "/app/reports" },
  { icon: Archive, label: "Archive", path: "/app/archive" },
  { icon: Settings, label: "Settings", path: "/app/settings" },
];

function NavItems({ mobile = false }: { mobile?: boolean }) {
  const [location] = useLocation();
  return (
    <nav aria-label={mobile ? "Main navigation" : "Secretary navigation"} className={mobile ? "grid grid-cols-5 gap-1 rounded-[22px] bg-sidebar/75 p-1" : "flex flex-col gap-1"}>
      {menuItems.map(item => {
        const active = location === item.path;
        return (
          <Link
            key={item.path}
            href={item.path}
            aria-current={active ? "page" : undefined}
            className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-[background-color,color,transform,box-shadow] duration-300 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              mobile ? "flex-col justify-center gap-1 px-1 text-[10px] tracking-[-0.01em]" : ""
            } ${active ? "bg-primary text-primary-foreground shadow-[0_8px_20px_rgba(0,112,217,0.22)]" : "text-muted-foreground hover:translate-x-0.5 hover:bg-accent hover:text-accent-foreground"}`}
          >
            <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user, logout } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-background" aria-label="Loading workspace" />;
  }

  if (!user) {
    return (
      <main className="grid min-h-screen place-items-center bg-background px-5 text-foreground">
        <section className="w-full max-w-md rounded-[28px] border border-border bg-card p-7 shadow-2xl shadow-black/20">
          <p className="text-sm font-medium text-primary">Class Management</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">Sign in to manage your classes</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Secretary tools are available only to the workspace owner. Shared class pages do not require sign-in.
          </p>
          <Button onClick={() => startLogin()} className="mt-7 min-h-11 w-full rounded-2xl">
            Sign in
          </Button>
          <Link href="/" className="mt-5 block text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            Go to public Home
          </Link>
        </section>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-72 flex-col border-r border-sidebar-border/80 bg-sidebar/95 p-5 lg:flex">
        <div className="rounded-[26px] bg-sidebar-accent/45 p-1 ring-1 ring-sidebar-border/80"><Link href="/app" className="block rounded-[22px] bg-sidebar p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-[background-color,transform] duration-300 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] hover:bg-sidebar-accent/70 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-[0_8px_18px_rgba(0,112,217,0.22)]">CM</span><span><span className="block font-semibold tracking-tight">Class Management</span><span className="mt-0.5 block text-xs text-muted-foreground">Academic operations</span></span></span>
        </Link></div>
        <div className="mt-9"><p className="px-3 text-xs font-semibold uppercase tracking-[0.13em] text-muted-foreground">Workspace</p><div className="mt-3"><NavItems /></div></div>
        <div className="mt-auto rounded-[26px] bg-sidebar-accent/60 p-1 ring-1 ring-sidebar-border/80"><div className="rounded-[22px] bg-sidebar p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.13em] text-muted-foreground">Secretary account</p>
          <p className="truncate text-sm font-medium">{user.name || "Class secretary"}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{user.email || "Workspace owner"}</p>
          <Button onClick={logout} variant="ghost" className="mt-4 min-h-11 w-full justify-start rounded-xl text-muted-foreground transition-[background-color,color,transform] duration-300 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] hover:bg-background/70 hover:text-foreground active:scale-[0.98]">
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div></div>
      </aside>

      <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-border/80 bg-background/92 px-5 backdrop-blur lg:ml-72 lg:hidden">
        <Link href="/app" className="flex items-center gap-2 rounded-xl font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">CM</span>
          <span>Class Management</span>
        </Link>
        <Button onClick={logout} variant="ghost" size="icon" className="min-h-11 min-w-11 rounded-xl" aria-label="Sign out">
          <LogOut className="h-4 w-4" />
        </Button>
      </header>

      <main className="min-h-screen px-5 pb-30 pt-7 lg:ml-72 lg:px-10 lg:pb-12 lg:pt-10">{children}</main>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 px-3 py-2.5 backdrop-blur lg:hidden"><NavItems mobile /></div>
    </div>
  );
}
