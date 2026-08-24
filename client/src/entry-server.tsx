import { dehydrate, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { renderToString } from "react-dom/server";
import superjson from "superjson";
import { Router } from "wouter";
import App from "./App";
import { trpc } from "./lib/trpc";
import { prefetchForPath, type HeadMeta, type SsrPrefetch } from "./ssr/prefetch";

export async function render(url: string, prefetch: SsrPrefetch): Promise<{ html: string; dehydratedState: unknown; head: HeadMeta }> { const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }); const head = await prefetchForPath(url, queryClient, prefetch); const index = url.indexOf("?"); const path = index === -1 ? url : url.slice(0, index); const search = index === -1 ? "" : url.slice(index + 1); const client = trpc.createClient({ links: [httpBatchLink({ url: "/api/trpc", transformer: superjson })] }); const html = renderToString(<trpc.Provider client={client} queryClient={queryClient}><QueryClientProvider client={queryClient}><Router ssrPath={path} ssrSearch={search}><App /></Router></QueryClientProvider></trpc.Provider>); return { html, dehydratedState: dehydrate(queryClient), head }; }
