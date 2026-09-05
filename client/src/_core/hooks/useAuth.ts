import { startLogin } from "@/const";
import { appwriteAccount } from "@/lib/appwrite";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo, useState } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export type AppUser = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: "admin" | "user";
  createdAt?: Date;
  updatedAt?: Date;
  lastSignedIn?: Date;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath } = options ?? {};
  const utils = typeof trpc?.useUtils === "function" ? trpc.useUtils() : (undefined as any);
  const [appwriteUser, setAppwriteUser] = useState<AppUser | null>(null);
  const [checkingAppwrite, setCheckingAppwrite] = useState(true);

  // Check Appwrite Client SDK session
  useEffect(() => {
    let mounted = true;
    const checkAppwrite = async () => {
      try {
        const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID;
        if (!projectId) {
          if (mounted) setCheckingAppwrite(false);
          return;
        }
        const acc = await appwriteAccount.get();
        if (mounted && acc) {
          setAppwriteUser({
            id: 1,
            openId: acc.$id,
            name: acc.name || "Class Secretary",
            email: acc.email || "secretary@example.com",
            loginMethod: "appwrite",
            role: "admin",
          });
        }
      } catch {
        if (mounted) setAppwriteUser(null);
      } finally {
        if (mounted) setCheckingAppwrite(false);
      }
    };
    checkAppwrite();
    return () => {
      mounted = false;
    };
  }, []);

  const meQuery = (trpc as any).auth?.me?.useQuery
    ? (trpc as any).auth.me.useQuery(undefined, {
        retry: false,
        refetchOnWindowFocus: false,
        enabled: !appwriteUser,
      })
    : { data: null, isLoading: false, error: null };

  const logoutMutation = (trpc as any).auth?.logout?.useMutation
    ? (trpc as any).auth.logout.useMutation({
        onSuccess: () => {
          utils?.auth?.me?.setData?.(undefined, null);
        },
      })
    : ({} as any);

  const logout = useCallback(async () => {
    try {
      await appwriteAccount.deleteSession("current");
    } catch {}
    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        // already unauthenticated
      }
    } finally {
      setAppwriteUser(null);
      try {
        sessionStorage.removeItem("manus-cookie");
        localStorage.removeItem("manus-runtime-user-info");
      } catch {}
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
      window.location.href = "/login";
    }
  }, [logoutMutation, utils]);

  const activeUser: AppUser | null = appwriteUser ?? (meQuery.data as AppUser | null) ?? null;
  const isLoading = checkingAppwrite || (Boolean(!appwriteUser) && meQuery.isLoading) || logoutMutation.isPending;

  const state = useMemo(
    () => ({
      user: activeUser,
      loading: isLoading,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(activeUser),
    }),
    [activeUser, isLoading, meQuery.error, logoutMutation.error]
  );

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (isLoading) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (redirectPath && window.location.pathname === redirectPath) return;

    if (redirectPath) {
      window.location.href = redirectPath;
    } else {
      startLogin();
    }
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    isLoading,
    state.user,
  ]);

  return {
    ...state,
    refresh: async () => {
      try {
        const acc = await appwriteAccount.get();
        if (acc) {
          setAppwriteUser({
            id: 1,
            openId: acc.$id,
            name: acc.name || "Class Secretary",
            email: acc.email || "secretary@example.com",
            loginMethod: "appwrite",
            role: "admin",
          });
          return;
        }
      } catch {}
      return meQuery.refetch();
    },
    logout,
  };
}
