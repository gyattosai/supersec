import type { QueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { trpc } from "@/lib/trpc";
import {
  formatSocialTitle,
  formatSocialDescription,
  formatShorthandDate,
} from "@shared/socialTitle";

export {
  formatSocialTitle,
  formatSocialDescription,
  formatShorthandDate,
} from "@shared/socialTitle";

export type HeadMeta = {
  title: string;
  description: string;
  canonicalPath?: string;
  publishedTime?: string;
  noindex?: boolean;
  notFound?: boolean;
};

export type SsrPrefetch = {
  publicSubject: (publicId: string) => Promise<any>;
  publicAttendance: (publicId: string) => Promise<any>;
  publicItem: (input: { kind: "announcement" | "resource" | "question"; publicId: string }) => Promise<any>;
  publicReport: (publicId: string) => Promise<any>;
};

const site = "supersec";
const fallback = "A class secretary management system for private class operations and published class updates.";
const seed = (qc: QueryClient, key: unknown, value: unknown) => qc.setQueryData(key as any, value);

export async function prefetchForPath(url: string, queryClient: QueryClient, caller: SsrPrefetch): Promise<HeadMeta> {
  const path = url.split("?")[0].replace(/\/+$/, "") || "/";
  if (path === "/") {
    return {
      title: `${site} — Class Management System`,
      description: fallback,
      canonicalPath: "/",
    };
  }

  // Subject Q&A Knowledgebase Route
  const subjectQuestions = path.match(/^\/s\/([^/]+)\/questions$/);
  if (subjectQuestions) {
    const data = await caller.publicSubject(subjectQuestions[1]);
    if (!data.available) return { title: site, description: fallback, notFound: true };
    const sub = data.subject;
    const socialTitle = formatSocialTitle({
      type: "Q&A",
      numberOrDate: "Knowledgebase",
      version: 1,
      subjectCode: sub.code,
    });
    const description = formatSocialDescription({
      type: "qa_hub",
      subjectCode: sub.code,
      subjectName: sub.name,
      contentTitle: "Knowledgebase",
    });
    return {
      title: socialTitle,
      description,
      canonicalPath: path,
    };
  }

  // Main Subject Public Portal Route
  const subject = path.match(/^\/s\/([^/]+)$/);
  if (subject) {
    const data = await caller.publicSubject(subject[1]);
    await seed(queryClient, getQueryKey(trpc.foundation.publicSubject, { publicId: subject[1] }, "query"), data);
    if (!data.available) return { title: site, description: fallback, notFound: true };
    const sub = data.subject;
    const socialTitle = formatSocialTitle({
      type: "Subject",
      numberOrDate: sub.code,
      version: 1,
    });
    const description = formatSocialDescription({
      type: "subject",
      subjectCode: sub.code,
      subjectName: sub.name,
      professorName: sub.professorName,
    });
    return {
      title: socialTitle,
      description,
      canonicalPath: path,
    };
  }

  // Attendance Session Route
  const attendance = path.match(/^\/attendance\/([^/]+)$/);
  if (attendance) {
    const data = await caller.publicAttendance(attendance[1]);
    await seed(queryClient, getQueryKey(trpc.foundation.publicAttendance, { publicId: attendance[1] }, "query"), data);
    if (!data.available) return { title: site, description: fallback, notFound: true };
    const att = data.attendance;
    const totals = att.records
      ? att.records.reduce(
          (acc: any, r: any) => {
            if (r.status === "PRESENT") acc.present++;
            else if (r.status === "ABSENT") acc.absent++;
            else if (r.status === "EXCUSED") acc.excused++;
            else if (r.status === "CONFLICT") acc.conflict++;
            else acc.notSet++;
            return acc;
          },
          { present: 0, absent: 0, excused: 0, conflict: 0, notSet: 0 }
        )
      : { present: 0, absent: 0, excused: 0, conflict: 0, notSet: 0 };
    const dateShorthand = formatShorthandDate(att.startsAt) || "Session";
    const socialTitle = formatSocialTitle({
      type: "Attendance",
      numberOrDate: dateShorthand,
      version: att.version,
      subjectCode: att.subject.code,
    });
    const description = formatSocialDescription({
      type: "attendance",
      subjectCode: att.subject.code,
      subjectName: att.subject.name,
      date: att.startsAt,
      totals,
    });
    return {
      title: socialTitle,
      description,
      canonicalPath: path,
    };
  }

  // Attendance Proof Submission
  const proof = path.match(/^\/attendance\/([^/]+)\/proof$/);
  if (proof) {
    const socialTitle = formatSocialTitle({
      type: "Proof",
      numberOrDate: "Zoom",
      version: 1,
    });
    return {
      title: socialTitle,
      description: formatSocialDescription({ type: "proof" }),
      canonicalPath: path,
    };
  }

  // Attendance Excuse Submission
  const excuse = path.match(/^\/attendance\/([^/]+)\/excuse$/);
  if (excuse) {
    const socialTitle = formatSocialTitle({
      type: "Excuse",
      numberOrDate: "Submission",
      version: 1,
    });
    return {
      title: socialTitle,
      description: formatSocialDescription({ type: "excuse" }),
      canonicalPath: path,
    };
  }

  // Content Items (Announcement, Resource, Question)
  const item = path.match(/^\/(a|r|q)\/([^/]+)$/);
  if (item) {
    const kind = item[1] === "a" ? "announcement" : item[1] === "r" ? "resource" : "question";
    const data = await caller.publicItem({ kind, publicId: item[2] });
    await seed(queryClient, getQueryKey(trpc.foundation.publicItem, { kind, publicId: item[2] }, "query"), data);
    if (!data.available) return { title: site, description: fallback, notFound: true };
    const itm = data.item;
    const dateShorthand = formatShorthandDate(itm.publishedAt) || `#${itm.version}`;
    const socialTitle = formatSocialTitle({
      type: kind,
      numberOrDate: dateShorthand,
      version: itm.version,
      subjectCode: itm.subject?.code,
    });
    const description = formatSocialDescription({
      type: kind,
      subjectCode: itm.subject?.code,
      subjectName: itm.subject?.name,
      contentTitle: itm.title,
      contentBody: itm.body,
      category: itm.category,
      fallbackDescription: fallback,
    });
    return {
      title: socialTitle,
      description,
      canonicalPath: path,
      publishedTime: itm.publishedAt ? new Date(itm.publishedAt).toISOString() : undefined,
    };
  }

  // Summary Report
  const report = path.match(/^\/reports\/([^/]+)$/);
  if (report) {
    const data = await caller.publicReport(report[1]);
    await seed(queryClient, getQueryKey(trpc.foundation.publicReport, { publicId: report[1] }, "query"), data);
    if (!data.available) return { title: site, description: fallback, notFound: true };
    const rep = data.report;
    const dateShorthand = formatShorthandDate(rep.startsAt) || `#${rep.version}`;
    const socialTitle = formatSocialTitle({
      type: "Report",
      numberOrDate: dateShorthand,
      version: rep.version,
    });
    const description = formatSocialDescription({
      type: "report",
      contentTitle: rep.title,
      date: rep.startsAt,
    });
    return {
      title: socialTitle,
      description,
      canonicalPath: path,
    };
  }

  if (path === "/app" || path.startsWith("/app/")) return { title: site, description: fallback, noindex: true };
  return { title: site, description: fallback, notFound: true };
}
