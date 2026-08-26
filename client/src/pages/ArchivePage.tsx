import DashboardLayout from "@/components/DashboardLayout";
import { WorkspacePageHeader } from "@/components/WorkspacePageHeader";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ArchiveRestore, BookOpen, FileArchive, Megaphone, MessageCircleQuestion } from "lucide-react";
import { toast } from "sonner";

type ArchiveCardProps = { icon: typeof FileArchive; title: string; detail: string; version?: number; onRestore: () => void; busy: boolean };

function ArchiveCard({ icon: Icon, title, detail, version, onRestore, busy }: ArchiveCardProps) {
  return <article className="signal-inset p-4"><div className="flex gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl border border-primary/40 bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="signal-kicker">Retained record</p><h3 className="mt-1 truncate font-semibold">{title}</h3><p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">{detail}</p>{version ? <p className="mt-2 text-xs text-muted-foreground">Version {version}</p> : null}</div></div><div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3"><p className="text-xs text-muted-foreground">Restores as a private draft</p><Button type="button" variant="outline" disabled={busy} onClick={onRestore}><ArchiveRestore className="mr-2 h-4 w-4" />Restore</Button></div></article>;
}

export default function ArchivePage() {
  const utils = trpc.useUtils();
  const subjects = trpc.subjects.list.useQuery();
  const reports = trpc.reports.list.useQuery();
  const content = trpc.content.archiveList.useQuery();
  const refresh = async () => Promise.all([utils.subjects.list.invalidate(), utils.reports.list.invalidate(), utils.content.archiveList.invalidate()]);
  const restoreSubject = trpc.subjects.archive.useMutation({ onSuccess: async () => { await refresh(); toast.success("Subject restored"); }, onError: error => toast.error(error.message) });
  const restoreReport = trpc.reports.restore.useMutation({ onSuccess: async () => { await refresh(); toast.success("Report restored as draft"); }, onError: error => toast.error(error.message) });
  const restoreAnnouncement = trpc.content.announcements.restore.useMutation({ onSuccess: async () => { await refresh(); toast.success("Announcement restored as draft"); }, onError: error => toast.error(error.message) });
  const restoreResource = trpc.content.resources.restore.useMutation({ onSuccess: async () => { await refresh(); toast.success("Resource restored as draft"); }, onError: error => toast.error(error.message) });
  const restoreQuestion = trpc.content.questions.restore.useMutation({ onSuccess: async () => { await refresh(); toast.success("Question & Answer restored as draft"); }, onError: error => toast.error(error.message) });
  const busy = restoreSubject.isPending || restoreReport.isPending || restoreAnnouncement.isPending || restoreResource.isPending || restoreQuestion.isPending;
  const archivedSubjects = subjects.data?.filter(subject => subject.status === "archived") ?? [];
  const archivedReports = reports.data?.filter(report => report.publishState === "archived") ?? [];
  const archivedContentCount = (content.data?.announcements.length ?? 0) + (content.data?.resources.length ?? 0) + (content.data?.questions.length ?? 0);

  return <DashboardLayout><section className="mx-auto max-w-5xl"><WorkspacePageHeader eyebrow="Retained records" title="Archive" description="Archived records stay available here. Restore any record as a draft; nothing is permanently deleted from this page." /><div className="mt-6 grid gap-3 sm:grid-cols-3"><ArchiveMetric label="Subjects" value={archivedSubjects.length} /><ArchiveMetric label="Reports" value={archivedReports.length} /><ArchiveMetric label="Content" value={archivedContentCount} /></div><section className="mt-6 border-t border-border pt-5"><ArchiveSection icon={FileArchive} label="Subjects">{archivedSubjects.map(subject => <ArchiveCard key={subject.id} icon={BookOpen} title={subject.name} detail={`${subject.code} · ${subject.professorName}`} onRestore={() => restoreSubject.mutate({ subjectId: subject.id, archive: false })} busy={busy} />)}{!archivedSubjects.length ? <EmptyArchive label="No archived Subjects." /> : null}</ArchiveSection></section><section className="mt-8 border-t border-border pt-5"><ArchiveSection icon={ArchiveRestore} label="Reports">{archivedReports.map(report => <ArchiveCard key={report.id} icon={FileArchive} title={report.reportType === "class_attendance" ? "Class Attendance" : "All Subject Attendance"} detail={report.reportType === "class_attendance" ? `${report.subjectCode ?? "Subject"}${report.subjectName ? ` · ${report.subjectName}` : ""}${report.sessionStartsAt ? ` · ${new Date(report.sessionStartsAt).toLocaleString()}` : ""}` : `All active Subjects · Generated ${new Date(report.generatedAt).toLocaleDateString()}`} version={report.version} onRestore={() => restoreReport.mutate({ id: report.id })} busy={busy} />)}{!archivedReports.length ? <EmptyArchive label="No archived reports." /> : null}</ArchiveSection></section><section className="mt-8 border-t border-border pt-5"><ArchiveSection icon={Megaphone} label="Content">{content.data?.announcements.map(item => <ArchiveCard key={`a-${item.id}`} icon={Megaphone} title={item.title} detail={`Announcement · ${item.subjectName}`} version={item.version} onRestore={() => restoreAnnouncement.mutate({ id: item.id })} busy={busy} />)}{content.data?.resources.map(item => <ArchiveCard key={`r-${item.id}`} icon={BookOpen} title={item.title} detail={`Resource · ${item.subjectName}`} version={item.version} onRestore={() => restoreResource.mutate({ id: item.id })} busy={busy} />)}{content.data?.questions.map(item => <ArchiveCard key={`q-${item.id}`} icon={MessageCircleQuestion} title={item.title} detail={`Question & Answer · ${item.subjectName}`} version={item.version} onRestore={() => restoreQuestion.mutate({ id: item.id })} busy={busy} />)}{!archivedContentCount ? <EmptyArchive label="No archived announcements, resources, or Questions & Answers." /> : null}</ArchiveSection></section></section></DashboardLayout>;
}

function ArchiveSection({ icon: Icon, label, children }: { icon: typeof FileArchive; label: string; children: React.ReactNode }) { return <><div className="flex items-center gap-2"><Icon className="h-4 w-4 text-primary" /><h2 className="font-semibold">{label}</h2></div><div className="mt-4 grid gap-3 md:grid-cols-2">{children}</div></>; }
function ArchiveMetric({ label, value }: { label: string; value: number }) { return <section className="signal-inset p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p></section>; }
function EmptyArchive({ label }: { label: string }) { return <p className="signal-inset p-4 text-sm text-muted-foreground">{label}</p>; }
