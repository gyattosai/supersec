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
    <nav aria-label={mobile ? "Main navigation" : "Secretary navigation"} className={mobile ? "linear-subnav grid grid-cols-5 gap-1 rounded-lg p-1" : "flex flex-col gap-1"}>
      {menuItems.map(item => {
        const active = location === item.path;
        return (
          <Link
            key={item.path}
            href={item.path}
            aria-current={active ? "page" : undefined}
            className={`group flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-[background-color,color,border-color] duration-150 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              mobile ? "flex-col justify-center gap-1 px-1 text-[10px] tracking-[-0.01em]" : ""
            } ${active ? "border border-border bg-sidebar-accent text-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}
          >
            <item.icon className={`h-4 w-4 shrink-0 ${active ? "text-primary" : ""}`} aria-hidden="true" />
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
        <section className="linear-panel w-full max-w-md p-6">
          <p className="linear-label text-primary">Class Management</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">Sign in to manage your classes</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Secretary tools are available only to the workspace owner. Shared class pages do not require sign-in.
          </p>
          <Button onClick={() => startLogin()} className="mt-7 min-h-11 w-full">
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
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar px-3 py-4 lg:flex">
        <Link href="/app" className="linear-action flex items-center gap-3 px-2 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">CM</span><span><span className="block text-sm font-semibold tracking-[-0.03em]">Class Management</span><span className="mt-0.5 block text-xs text-muted-foreground">Secretary workspace</span></span>
        </Link>
        <div className="mt-8"><p className="linear-label px-3 text-muted-foreground">Workspace</p><div className="mt-2"><NavItems /></div></div>
        <div className="mt-auto border-t border-sidebar-border px-3 pt-4">
          <p className="linear-label text-muted-foreground">Secretary account</p>
          <p className="truncate text-sm font-medium">{user.name || "Class secretary"}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{user.email || "Workspace owner"}</p>
          <Button onClick={logout} variant="ghost" className="mt-4 min-h-11 w-full justify-start text-muted-foreground hover:text-foreground">
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between border-b border-border bg-background px-4 lg:ml-64 lg:hidden">
        <Link href="/app" className="flex items-center gap-2 rounded-md text-sm font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">CM</span>
          <span>Class Management</span>
        </Link>
        <Button onClick={logout} variant="ghost" size="icon" className="min-h-11 min-w-11" aria-label="Sign out">
          <LogOut className="h-4 w-4" />
        </Button>
      </header>

      <main className="min-h-screen px-4 pb-28 pt-6 lg:ml-64 lg:px-8 lg:pb-10 lg:pt-8">{children}</main>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-sidebar px-3 py-2 lg:hidden"><NavItems mobile /></div>
    </div>
  );
}
