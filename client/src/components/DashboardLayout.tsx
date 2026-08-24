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
    <nav aria-label={mobile ? "Main navigation" : "Secretary navigation"} className={mobile ? "grid grid-cols-5 gap-1" : "space-y-1"}>
      {menuItems.map(item => {
        const active = location === item.path;
        return (
          <Link
            key={item.path}
            href={item.path}
            className={`flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              mobile ? "flex-col justify-center gap-1 px-1 text-[11px]" : ""
            } ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}
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
      <aside className="fixed inset-y-0 left-0 hidden w-72 flex-col border-r border-border bg-sidebar p-4 lg:flex">
        <Link href="/app" className="flex min-h-11 items-center gap-3 rounded-2xl px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">CM</span>
          <span className="font-semibold tracking-tight">Class Management</span>
        </Link>
        <div className="mt-8"><NavItems /></div>
        <div className="mt-auto rounded-2xl bg-sidebar-accent p-3">
          <p className="truncate text-sm font-medium">{user.name || "Class secretary"}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{user.email || "Workspace owner"}</p>
          <Button onClick={logout} variant="ghost" className="mt-3 min-h-11 w-full justify-start rounded-xl text-muted-foreground hover:text-foreground">
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-border bg-background/92 px-5 backdrop-blur lg:ml-72 lg:hidden">
        <Link href="/app" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">CM</span>
          <span>Class Management</span>
        </Link>
        <Button onClick={logout} variant="ghost" size="icon" className="min-h-11 min-w-11 rounded-xl" aria-label="Sign out">
          <LogOut className="h-4 w-4" />
        </Button>
      </header>

      <main className="min-h-screen px-5 pb-28 pt-7 lg:ml-72 lg:px-10 lg:pb-10">{children}</main>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-2 backdrop-blur lg:hidden"><NavItems mobile /></div>
    </div>
  );
}
