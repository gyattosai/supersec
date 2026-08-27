import DashboardLayout from "@/components/DashboardLayout";
import { RecordStatusBadge } from "@/components/RecordStatusBadge";
import { Button } from "@/components/ui/button";
import { resolveLegacyContentWorkspacePath, subjectContentWorkspacePath, subjectContentWorkspaces, type SubjectContentWorkspaceKey } from "@/lib/contentWorkspaces";
import { trpc } from "@/lib/trpc";
import { Archive, ArrowLeft, ArrowRight, BookOpen, CalendarDays, Clipboard, GraduationCap, Megaphone, Pencil, Users } from "lucide-react";
import { Link, Redirect, useRoute } from "wouter";

type WorkspaceLink = { label: string; href: string; icon: typeof BookOpen };
const contentWorkspaceIcons: Record<SubjectContentWorkspaceKey, typeof BookOpen> = { announcements: Megaphone, resources: BookOpen, questions: GraduationCap };

export function LegacyContentRedirect() {
  const [, params] = useRoute("/app/content/:subjectId/:kind");
  const subjectId = Number(params?.subjectId);
  const kind = params?.kind;
  return <Redirect to={resolveLegacyContentWorkspacePath(subjectId, kind)} />;
}

function WorkspaceCard({ title, description, links }: { title: string; description: string; links: WorkspaceLink[] }) {
  return <section className="signal-panel p-5 sm:p-6"><h2 className="text-xl font-bold tracking-[-0.04em]">{title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p><div className="mt-5 flex flex-wrap gap-2">{links.map(link => { const Icon = link.icon; return <Link key={link.href} href={link.href} className="signal-action inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-secondary/45 px-3 text-sm font-semibold text-foreground hover:border-primary/65 hover:bg-secondary"><Icon className="size-4 text-primary" />{link.label}<ArrowRight className="size-4 text-primary" /></Link>; })}</div></section>;
}

export default function IndependentSubjectWorkspacePage() {
  const [, params] = useRoute("/app/subjects/:subjectId");
  const subjectId = Number(params?.subjectId);
  const subject = trpc.subjects.get.useQuery({ subjectId }, { enabled: Number.isFinite(subjectId) && subjectId > 0 });
  const utils = trpc.useUtils();
  const archive = trpc.subjects.archive.useMutation({ onSuccess: () => { utils.subjects.get.invalidate({ subjectId }); utils.subjects.list.invalidate(); } });

  if (subject.isLoading) return <DashboardLayout><section className="mx-auto max-w-4xl"><div className="signal-inset mt-6 grid min-h-72 place-items-center text-sm text-muted-foreground">Loading Subject workspace…</div></section></DashboardLayout>;
  if (!subject.data) return <DashboardLayout><section className="mx-auto grid min-h-[55vh] max-w-2xl place-items-center"><div className="signal-panel w-full border-t-2 border-primary p-8 text-center"><GraduationCap className="mx-auto size-5 text-muted-foreground" /><h1 className="mt-4 text-xl font-semibold">Subject unavailable</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">This private class record may have been removed or is not available in the current workspace.</p><Button asChild className="mt-6"><Link href="/app/subjects">Back to Subjects</Link></Button></div></section></DashboardLayout>;

  const contentWorkspaces: Array<{ title: string; description: string; links: WorkspaceLink[] }> = subjectContentWorkspaces.map(workspace => ({ ...workspace, links: [{ label: workspace.action, href: subjectContentWorkspacePath(subjectId, workspace.key), icon: contentWorkspaceIcons[workspace.key] }] }));
  const workspaces: Array<{ title: string; description: string; links: WorkspaceLink[] }> = [
    { title: "Class setup", description: "Manage the independent roster and class schedule for this Subject.", links: [{ label: "Students", href: `/app/subjects/${subjectId}/students`, icon: Users }, { label: "Schedule & No Class", href: `/app/subjects/${subjectId}/schedule`, icon: CalendarDays }] },
    ...contentWorkspaces,
    { title: "Sharing", description: "Manage the view-only Subject page and its Messenger-ready link.", links: [{ label: "Manage sharing", href: `/app/subjects/${subjectId}/sharing`, icon: Clipboard }] },
  ];

  return <DashboardLayout><section className="mx-auto max-w-4xl pb-10"><Link href="/app/subjects" className="signal-action inline-flex min-h-11 items-center gap-2 px-2 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"><ArrowLeft className="size-4" />Back to Subjects</Link><header className="mt-5 flex flex-wrap items-start justify-between gap-4"><div><p className="signal-kicker">Subject workspace</p><h1 className="signal-title mt-3">{subject.data.name}</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">{subject.data.code} · {subject.data.professorName}{subject.data.termName ? ` · ${subject.data.termName}` : ""}</p></div><RecordStatusBadge tone={subject.data.publishState === "published" ? "published" : "draft"}>{subject.data.publishState}</RecordStatusBadge></header><div className="mt-6 flex flex-wrap gap-2"><Button asChild variant="outline"><Link href={`/app/subjects/${subjectId}/details`}><Pencil className="size-4" />Class details</Link></Button><Button asChild><Link href={`/app/subjects/${subjectId}/sharing`}>Prepare sharing <ArrowRight className="size-4" /></Link></Button><Button onClick={() => archive.mutate({ subjectId, archive: subject.data.status !== "archived" })} disabled={archive.isPending} variant="ghost" className="text-muted-foreground"><Archive className="size-4" />{subject.data.status === "archived" ? "Restore" : "Archive"}</Button></div><div className="mt-8 space-y-4"><div><p className="signal-kicker">Class workspaces</p><h2 className="signal-heading mt-2">Open the desk you need.</h2></div>{workspaces.map(workspace => <WorkspaceCard key={workspace.title} {...workspace} />)}</div></section></DashboardLayout>;
}
