import type { QueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { trpc } from "@/lib/trpc";

export type HeadMeta = { title: string; description: string; canonicalPath?: string; ogImage?: string; ogImageAlt?: string; ogType?: "website" | "article"; publishedTime?: string; noindex?: boolean; notFound?: boolean };
export type SsrPrefetch = { publicSubject: (publicId: string) => Promise<any>; publicAttendance: (publicId: string) => Promise<any>; publicItem: (input: { kind: "announcement" | "resource" | "question"; publicId: string }) => Promise<any>; publicReport: (publicId: string) => Promise<any> };
const site = "Class Management";
const fallback = "A secure, shareable class workspace for published information.";
const seed = (qc: QueryClient, key: unknown, value: unknown) => qc.setQueryData(key as any, value);

export async function prefetchForPath(url: string, queryClient: QueryClient, caller: SsrPrefetch): Promise<HeadMeta> {
  const path = (url.split("?")[0].replace(/\/+$/, "") || "/");
  if (path === "/") return { title: site, description: fallback, canonicalPath: "/" };
  const subject = path.match(/^\/s\/([^/]+)$/); if (subject) { const data = await caller.publicSubject(subject[1]); await seed(queryClient, getQueryKey(trpc.foundation.publicSubject, { publicId: subject[1] }, "query"), data); return data.available ? { title: `${data.subject.name} · ${site}`, description: `${data.subject.code} · ${data.subject.professorName}`, canonicalPath: path } : { title: site, description: fallback, notFound: true }; }
  const attendance = path.match(/^\/attendance\/([^/]+)$/); if (attendance) { const data = await caller.publicAttendance(attendance[1]); await seed(queryClient, getQueryKey(trpc.foundation.publicAttendance, { publicId: attendance[1] }, "query"), data); return data.available ? { title: `${data.attendance.subject.name} Attendance · ${site}`, description: "Published class-session Attendance. Private Zoom source and review data are not shared.", canonicalPath: path } : { title: site, description: fallback, notFound: true }; }
  const item = path.match(/^\/(a|r|q)\/([^/]+)$/); if (item) { const kind = item[1] === "a" ? "announcement" : item[1] === "r" ? "resource" : "question"; const data = await caller.publicItem({ kind, publicId: item[2] }); await seed(queryClient, getQueryKey(trpc.foundation.publicItem, { kind, publicId: item[2] }, "query"), data); if (!data.available) return { title: site, description: fallback, notFound: true }; const visual = data.item.media ?? data.item.socialPreviewMedia; return { title: `${data.item.title} · ${site}`, description: data.item.body.slice(0, 180), canonicalPath: path, ogType: "article", ogImage: visual?.url, ogImageAlt: visual?.altText ?? data.item.title, publishedTime: data.item.publishedAt ? new Date(data.item.publishedAt).toISOString() : undefined }; }
  const report = path.match(/^\/reports\/([^/]+)$/); if (report) { const data = await caller.publicReport(report[1]); await seed(queryClient, getQueryKey(trpc.foundation.publicReport, { publicId: report[1] }, "query"), data); return data.available ? { title: `${data.report.title} · ${site}`, description: "Published aggregate Attendance report.", canonicalPath: path } : { title: site, description: fallback, notFound: true }; }
  if (path === "/app" || path.startsWith("/app/")) return { title: site, description: fallback, noindex: true };
  return { title: site, description: fallback, notFound: true };
}
