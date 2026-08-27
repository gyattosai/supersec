import { PublicShell } from "@/pages/PublicPages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatFileSize, isPublicImageMimeType, MAX_PUBLIC_UPLOAD_BYTES, PUBLIC_IMAGE_MIME_TYPES } from "@shared/mediaPolicy";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, CheckCircle2, ImagePlus, LoaderCircle, ShieldCheck, UploadCloud } from "lucide-react";
import { ChangeEvent, FormEvent, useState } from "react";
import { Link, useRoute } from "wouter";

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Unable to read the selected screenshot"));
    reader.onerror = () => reject(new Error("Unable to read the selected screenshot"));
    reader.readAsDataURL(file);
  });
}

type ProofOutcome = "updated" | "already_present" | "needs_review";

export function AttendanceProofPage() {
  const [, params] = useRoute("/attendance/:publicId/proof");
  const publicId = params?.publicId ?? "";
  const session = trpc.attendanceProof.publicSession.useQuery({ publicId }, { enabled: Boolean(publicId) });
  const submitProof = trpc.attendanceProof.submit.useMutation();
  const [submittedName, setSubmittedName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [outcome, setOutcome] = useState<ProofOutcome | null>(null);
  const [submissionError, setSubmissionError] = useState("");

  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!nextFile) return;
    if (!isPublicImageMimeType(nextFile.type)) { setFile(null); setFileError("Choose a JPG, PNG, WebP, GIF, or AVIF Zoom screenshot."); return; }
    if (nextFile.size > MAX_PUBLIC_UPLOAD_BYTES) { setFile(null); setFileError("Choose a screenshot smaller than 8 MB."); return; }
    setFile(nextFile);
    setFileError("");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) { setFileError("Choose your Zoom screenshot first."); return; }
    setSubmissionError("");
    try {
      const result = await submitProof.mutateAsync({ publicId, submittedName: submittedName.trim(), fileName: file.name, mimeType: file.type, base64Data: await fileToDataUrl(file) });
      setOutcome(result.outcome);
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : "We could not submit your proof. Please try again.");
    }
  };

  if (session.isLoading) return <PublicShell><section className="signal-panel p-6 text-sm text-muted-foreground">Loading attendance proof…</section></PublicShell>;
  if (!session.data?.available) return <PublicShell><section className="signal-panel border-t-2 border-primary p-6 text-center"><h1 className="signal-heading">Proof submission is not available</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Use the current shared Attendance link from your class secretary.</p></section></PublicShell>;
  const details = session.data.session;

  if (outcome) {
    const accepted = outcome === "updated" || outcome === "already_present";
    return <PublicShell><section className="signal-card-shell"><div className="signal-record-card p-6 text-center sm:p-8"><span className={`mx-auto grid size-12 place-items-center rounded-2xl ${accepted ? "bg-emerald-400/15 text-emerald-500" : "bg-primary/10 text-primary"}`}>{accepted ? <CheckCircle2 className="size-6" /> : <ShieldCheck className="size-6" />}</span><p className="signal-kicker mt-5">Attendance proof</p><h1 className="signal-title mt-2">{outcome === "updated" ? "Attendance updated" : outcome === "already_present" ? "You are already marked Present" : "Proof received"}</h1><p className="mx-auto mt-4 max-w-md text-sm leading-6 text-muted-foreground">{outcome === "updated" ? "Your Zoom screenshot was accepted, and this class session now shows you as Present." : outcome === "already_present" ? "Your submitted Zoom screenshot was accepted. No attendance change was needed." : "Your screenshot was saved for the class secretary to review. You do not need to submit it again."}</p><Link href={`/attendance/${publicId}`} className="signal-action mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"><ArrowLeft className="size-4" />Back to Attendance</Link></div></section></PublicShell>;
  }

  return <PublicShell><div className="mx-auto max-w-2xl"><Link href={`/attendance/${publicId}`} className="signal-action inline-flex min-h-11 items-center gap-2 px-2 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"><ArrowLeft className="size-4" />Back to Attendance</Link><section className="signal-card-shell mt-5"><form className="signal-record-card p-5 sm:p-7" onSubmit={submit}><span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><ImagePlus className="size-5" /></span><p className="signal-kicker mt-5">Attendance proof</p><h1 className="signal-title mt-2">Missing from Attendance?</h1><p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Upload a Zoom screenshot that shows you attended <span className="font-semibold text-foreground">{details.subject.code}</span> on {new Date(details.startsAt).toLocaleDateString()}. A normal Zoom attendance image is enough.</p><div className="signal-inset mt-6 p-4"><p className="text-sm font-semibold">How it works</p><p className="mt-1 text-sm leading-6 text-muted-foreground">We check your name and the class context in the screenshot. Clear proof updates your status to Present; unclear proof goes to the secretary for a quick review.</p></div><div className="mt-6"><label htmlFor="proof-name" className="text-sm font-semibold">Your name</label><Input id="proof-name" value={submittedName} onChange={event => setSubmittedName(event.target.value)} placeholder="Type your class name" autoComplete="name" className="mt-2" required /></div><div className="mt-5"><p className="text-sm font-semibold">Zoom screenshot</p><label htmlFor="attendance-proof-file" className="signal-action signal-inset mt-2 flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 border-dashed px-4 text-center hover:border-primary/60"><UploadCloud className="size-5 text-primary" /><span className="text-sm font-semibold text-foreground">{file ? file.name : "Choose a Zoom screenshot"}</span><span className="text-xs text-muted-foreground">JPG, PNG, WebP, GIF, or AVIF · up to 8 MB</span></label><input id="attendance-proof-file" type="file" accept={PUBLIC_IMAGE_MIME_TYPES.join(",")} className="sr-only" onChange={chooseFile} />{file ? <p className="mt-2 text-xs text-muted-foreground">{formatFileSize(file.size)} ready to review</p> : null}{fileError ? <p className="mt-2 text-xs font-medium text-destructive" role="alert">{fileError}</p> : null}</div>{submissionError ? <p className="mt-4 rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{submissionError}</p> : null}<Button type="submit" className="mt-7 min-h-11 w-full" disabled={submitProof.isPending || !file || submittedName.trim().length < 2}>{submitProof.isPending ? <><LoaderCircle className="size-4 animate-spin" />Checking your proof…</> : <><ShieldCheck className="size-4" />Submit attendance proof</>}</Button><p className="mt-4 text-center text-xs leading-5 text-muted-foreground">Your screenshot is used only for this attendance correction and is not shown on the shared class page.</p></form></section></div></PublicShell>;
}
