import DashboardLayout from "@/components/DashboardLayout";
import { RecordStatusBadge } from "@/components/RecordStatusBadge";
import { Button } from "@/components/ui/button";
import { resolveLegacyContentWorkspacePath, subjectContentWorkspacePath, subjectContentWorkspaces, type SubjectContentWorkspaceKey } from "@/lib/contentWorkspaces";
import { attendanceWorkspacePath } from "@/lib/attendanceWorkspace";
import { trpc } from "@/lib/trpc";
import { Archive, ArrowLeft, ArrowRight, BookOpen, Clipboard, ClipboardCheck, GraduationCap, Megaphone, Pencil, Users } from "lucide-react";
import { Link, Redirect, useRoute } from "wouter";

type WorkspaceItem = { title: string; description: string; href: string; icon: typeof BookOpen };
const contentWorkspaceIcons: Record<SubjectContentWorkspaceKey, typeof BookOpen> = { announcements: Megaphone, resources: BookOpen, questions: GraduationCap };

export function LegacyContentRedirect() {
  const [, params] = useRoute("/app/content/:subjectId/:kind");
  return <Redirect to={resolveLegacyContentWorkspacePath(Number(params?.subjectId), params?.kind)} />;
}

function WorkspaceListCard({ item }: { item: WorkspaceItem }) {
  const Icon = item.icon;
  return <Link href={item.href} className="signal-action group flex min-h-24 items-center gap-4 rounded-2xl border border-border bg-card/45 p-4 sm:p-5 hover:border-primary/60 hover:bg-secondary/60"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-primary"><Icon className="size-4" /></span><span className="min-w-0 flex-1"><span className="block text-base font-semibold tracking-[-0.02em] text-foreground">{item.title}</span><span className="mt-1 block text-sm leading-5 text-muted-foreground">{item.description}</span></span><ArrowRight className="size-5 shrink-0 text-primary transition-transform duration-150 group-hover:translate-x-0.5" /></Link>;
}

export default function IndependentSubjectWorkspacePage() {
  const [, params] = useRoute("/app/subjects/:subjectId");
  const subjectId = Number(params?.subjectId);
  const subject = trpc.subjects.get.useQuery({ subjectId }, { enabled: Number.isFinite(subjectId) && subjectId > 0 });
  const utils = trpc.useUtils();
  const archive = trpc.subjects.archive.useMutation({ onSuccess: () => { utils.subjects.get.invalidate({ subjectId }); utils.subjects.list.invalidate(); } });
  if (subject.isLoading) return <DashboardLayout><section className="mx-auto max-w-4xl"><div className="signal-inset mt-6 grid min-h-72 place-items-center text-sm text-muted-foreground">Loading Subject workspace…</div></section></DashboardLayout>;
  if (!subject.data) return <DashboardLayout><section className="mx-auto grid min-h-[55vh] max-w-2xl place-items-center"><div className="signal-panel w-full border-t-2 border-primary p-8 text-center"><GraduationCap className="mx-auto size-5 text-muted-foreground" /><h1 className="mt-4 text-xl font-semibold">Subject unavailable</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">This private class record may have been removed or is not available in the current workspace.</p><Button asChild className="mt-6"><Link href="/app/subjects">Back to Subjects</Link></Button></div></section></DashboardLayout>;

  const workspaceItems: WorkspaceItem[] = [
    { title: "Class details", description: "Edit the Subject code, professor, and term.", href: `/app/subjects/${subjectId}/details`, icon: Pencil },
    { title: "Students (Master List)", description: "Add students, private notes, and schedule conflicts.", href: `/app/subjects/${subjectId}/students`, icon: Users },
    { title: "Attendance", description: "Add class dates, mark No Class, and take Attendance.", href: attendanceWorkspacePath(subjectId), icon: ClipboardCheck },
    ...subjectContentWorkspaces.map(workspace => ({ title: workspace.title, description: workspace.description, href: subjectContentWorkspacePath(subjectId, workspace.key), icon: contentWorkspaceIcons[workspace.key] })),
    { title: "Sharing", description: "Manage the view-only Subject page and copy its link.", href: `/app/subjects/${subjectId}/sharing`, icon: Clipboard },
  ];

  return <DashboardLayout><section className="mx-auto max-w-4xl pb-10"><Link href="/app/subjects" className="signal-action inline-flex min-h-11 items-center gap-2 px-2 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"><ArrowLeft className="size-4" />Back to Subjects</Link><header className="mt-5 flex flex-wrap items-start justify-between gap-4"><div><p className="signal-kicker">Subject</p><h1 className="signal-title mt-3">{subject.data.name}</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">{subject.data.code} · {subject.data.professorName}{subject.data.termName ? ` · ${subject.data.termName}` : ""}</p></div><RecordStatusBadge tone={subject.data.publishState === "published" ? "published" : "draft"}>{subject.data.publishState}</RecordStatusBadge></header><div className="mt-6 flex flex-wrap gap-2"><Button asChild><Link href={`/app/subjects/${subjectId}/sharing`}>Manage sharing <ArrowRight className="size-4" /></Link></Button><Button onClick={() => archive.mutate({ subjectId, archive: subject.data.status !== "archived" })} disabled={archive.isPending} variant="ghost" className="text-muted-foreground"><Archive className="size-4" />{subject.data.status === "archived" ? "Restore" : "Archive"}</Button></div><section className="mt-8"><div><p className="signal-kicker">Tasks</p><h2 className="signal-heading mt-2">Choose a task.</h2></div><div className="mt-5 space-y-3">{workspaceItems.map(item => <WorkspaceListCard key={item.href} item={item} />)}</div></section></section></DashboardLayout>;
}
