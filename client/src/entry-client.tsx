import { trpc } from "@/lib/trpc";
import { COOKIE_NAME, UNAUTHED_ERR_MSG } from "@shared/const";
import { HydrationBoundary, QueryClient, QueryClientProvider, type DehydratedState } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot, hydrateRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { startLogin } from "./const";
import { customTrpcFetch } from "./lib/trpcFetch";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError) || typeof window === "undefined" || error.message !== UNAUTHED_ERR_MSG) return;
  startLogin();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    redirectToLoginIfUnauthorized(event.query.state.error);
    console.error("[API Query Error]", event.query.state.error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    redirectToLoginIfUnauthorized(event.mutation.state.error);
    console.error("[API Mutation Error]", event.mutation.state.error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      headers() {
        try {
          const raw = sessionStorage.getItem("manus-cookie");
          const prefix = `${COOKIE_NAME}=`;
          const pair = raw?.split(";").find(value => value.trim().startsWith(prefix));
          const token = pair?.trim().slice(prefix.length);
          return token ? { Authorization: `Bearer ${token}` } : {};
        } catch {
          return {};
        }
      },
      fetch(input, init) {
        return customTrpcFetch(input, init);
      },
    }),
  ],
});

const rawState = typeof window !== "undefined" ? (window as Window & { __RQ_STATE__?: unknown }).__RQ_STATE__ : undefined;
const dehydratedState = (rawState ? superjson.deserialize(rawState as any) : undefined) as DehydratedState | undefined;

const rootEl = document.getElementById("root");
if (rootEl) {
  const element = (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {dehydratedState ? (
          <HydrationBoundary state={dehydratedState}>
            <App />
          </HydrationBoundary>
        ) : (
          <App />
        )}
      </QueryClientProvider>
    </trpc.Provider>
  );

  const hasPreRendered =
    rootEl.hasChildNodes() &&
    rootEl.innerHTML.replace(/<!--[\s\S]*?-->/g, "").trim().length > 0;

  if (hasPreRendered) {
    try {
      hydrateRoot(rootEl, element);
    } catch (err) {
      console.warn("Hydration failed, fallback to createRoot", err);
      createRoot(rootEl).render(element);
    }
  } else {
    createRoot(rootEl).render(element);
  }
}
