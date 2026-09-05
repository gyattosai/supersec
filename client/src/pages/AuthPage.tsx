import { useState } from "react";
import { appwriteAccount, ID } from "@/lib/appwrite";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { Lock, Mail, User as UserIcon, Sparkles, ArrowRight, Eye, EyeOff, BookOpen, Users, FileDown } from "lucide-react";

export default function AuthPage({ initialMode = "login" }: { initialMode?: "login" | "register" }) {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const utils = trpc.useUtils();

  const handleRegister = async () => {
    setIsPending(true);
    setErrorMsg(null);
    try {
      const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID;
      if (projectId) {
        try {
          await appwriteAccount.create(ID.unique(), email.trim(), password, name.trim());
        } catch (err: any) {
          if (!err?.message?.toLowerCase().includes("already exists")) {
            throw err;
          }
        }
        try {
          await appwriteAccount.deleteSession("current");
        } catch {}
        await appwriteAccount.createEmailPasswordSession(email.trim(), password);
      } else {
        const res = await fetch("/api/trpc/auth.register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
        });
        if (!res.ok) {
          throw new Error("Registration failed on server.");
        }
      }

      toast.success(`Account created! Welcome, ${name.trim() || "Secretary"}!`);
      await utils.auth.me.invalidate();
      window.location.href = "/app";
    } catch (err: any) {
      const msg = err?.message || "Failed to create account. Please try again.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsPending(false);
    }
  };

  const handleLogin = async () => {
    setIsPending(true);
    setErrorMsg(null);
    try {
      const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID;
      if (projectId) {
        try {
          await appwriteAccount.deleteSession("current");
        } catch {}
        await appwriteAccount.createEmailPasswordSession(email.trim(), password);
      } else {
        const res = await fetch("/api/trpc/auth.login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), password }),
        });
        if (!res.ok) {
          throw new Error("Invalid email or password.");
        }
      }

      toast.success("Welcome back, Secretary!");
      await utils.auth.me.invalidate();
      window.location.href = "/app";
    } catch (err: any) {
      const msg = err?.message || "Invalid email or password.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsPending(false);
    }
  };

  const handleQuickAccess = async () => {
    setIsPending(true);
    setErrorMsg(null);
    try {
      const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID;
      if (projectId) {
        try {
          await appwriteAccount.deleteSession("current");
        } catch {}
        await appwriteAccount.createAnonymousSession();
      } else {
        const res = await fetch("/api/trpc/auth.devLogin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (!res.ok) {
          throw new Error("Demo login failed on server.");
        }
      }

      toast.success("Signed in as Class Secretary!");
      await utils.auth.me.invalidate();
      window.location.href = "/app";
    } catch (err: any) {
      const msg = err?.message || "Quick access failed.";
      toast.error(msg);
    } finally {
      setIsPending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim() || !email.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    if (!password || password.length < 8) {
      setErrorMsg("Password must be at least 8 characters long.");
      return;
    }

    if (mode === "register") {
      if (!name.trim()) {
        setErrorMsg("Please enter your name.");
        return;
      }
      handleRegister();
    } else {
      handleLogin();
    }
  };

  return (
    <main className="signal-canvas flex min-h-screen flex-col text-foreground">
      {/* Top Navigation */}
      <header className="glass-header sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border/70 px-5 sm:px-8">
        <Link href="/" className="flex min-h-11 items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-primary text-[10px] font-extrabold text-primary-foreground shadow-sm shadow-primary/30">
            SS
          </span>
          <span className="font-[Manrope] text-sm font-extrabold tracking-[-0.04em]">supersec</span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/" className="signal-action inline-flex min-h-11 min-w-11 items-center justify-center px-2 text-xs font-semibold text-muted-foreground hover:text-foreground">
            Home
          </Link>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 items-stretch">
        {/* Left branding panel â€” hidden on mobile */}
        <aside className="signal-hero-surface hidden w-[42%] max-w-sm flex-col justify-between border-r border-border/60 px-10 py-12 lg:flex xl:max-w-md">
          <div>
            <span className="signal-kicker block">Class Secretary Portal</span>
            <h2 className="signal-title mt-4 text-3xl">Manage attendance, subjects &amp; class records â€” from one desk.</h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              supersec gives class secretaries a private workspace to track attendance, share approved updates with students, and generate end-of-term reports.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                { icon: BookOpen, label: "Shared subject pages", sub: "Students get a view-only portal â€” no account needed" },
                { icon: Users, label: "Zoom attendance matching", sub: "AI reconciles display names to your master list" },
                { icon: FileDown, label: "PDF & CSV export", sub: "One-click reports for exams and university submission" },
              ].map(({ icon: Icon, label, sub }) => (
                <li key={label} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{sub}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Â© {new Date().getFullYear()} supersec Â· Class Secretary Management System
          </p>
        </aside>

        {/* Right form panel */}
        <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
          <div className="w-full max-w-md">
            {/* Card */}
            <div className="signal-panel border-t-2 border-t-primary p-6 sm:p-8 shadow-2xl">
              {/* Header */}
              <div>
                <p className="signal-kicker">Secretary Access</p>
                <h1 className="signal-heading mt-2 text-2xl sm:text-3xl font-extrabold">
                  {mode === "login" ? "Sign in to your desk" : "Create secretary account"}
                </h1>
                <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
                  {mode === "login"
                    ? "Enter your credentials to manage attendance and class records."
                    : "Register to manage students, sessions, and shared class pages."}
                </p>
              </div>

              {/* Mode switcher */}
              <div className="signal-inset mt-5 flex p-1">
                {(["login", "register"] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setMode(m); setErrorMsg(null); }}
                    className={`signal-action min-h-11 sm:min-h-9 flex-1 rounded-[10px] text-xs font-semibold transition-colors ${
                      mode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {m === "login" ? "Sign In" : "Register"}
                  </button>
                ))}
              </div>

              {/* Error */}
              {errorMsg && (
                <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  {errorMsg}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                {mode === "register" && (
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">Your Name</label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Alex Rivera"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="signal-action w-full rounded-xl border border-input bg-secondary/40 py-2.5 pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <input
                      type="email"
                      required
                      placeholder="secretary@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="signal-action w-full rounded-xl border border-input bg-secondary/40 py-2.5 pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="signal-action w-full rounded-xl border border-input bg-secondary/40 py-2.5 pl-10 pr-11 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-0 top-1/2 -translate-y-1/2 size-11 flex items-center justify-center text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {mode === "register" && (
                    <p className="mt-1 text-[11px] text-muted-foreground">Must be at least 8 characters long.</p>
                  )}
                </div>

                <Button type="submit" disabled={isPending} className="w-full justify-center gap-2 text-sm font-semibold mt-2 min-h-11">
                  {isPending ? "Processingâ€¦" : mode === "login" ? "Sign In" : "Create Account"}
                  {!isPending && <ArrowRight className="size-4" />}
                </Button>
              </form>

              {/* Divider */}
              <div className="relative my-5 text-center">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <span className="relative bg-card px-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Or
                </span>
              </div>

              {/* Quick demo access */}
              <Button type="button" variant="outline" disabled={isPending} onClick={handleQuickAccess}
                className="w-full justify-center gap-2 text-xs font-semibold min-h-11 border-primary/30 hover:bg-primary/5 hover:border-primary"
              >
                <Sparkles className="size-3.5 text-primary" />
                1-Click Secretary Demo Access
              </Button>

              {/* Trust signals */}
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                {["Encrypted session", "View-only public links", "CSV & PDF export"].map(label => (
                  <span key={label} className="signal-feature-chip">{label}</span>
                ))}
              </div>
            </div>

            <p className="mt-4 text-center text-[11px] text-muted-foreground px-4">
              By continuing you confirm you are the class secretary of record for the subjects you manage.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
