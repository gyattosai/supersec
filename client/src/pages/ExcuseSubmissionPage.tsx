import { PublicShell } from "@/pages/PublicPages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatFileSize, isPublicImageMimeType, MAX_PUBLIC_UPLOAD_BYTES, PUBLIC_IMAGE_MIME_TYPES } from "@shared/mediaPolicy";
import { trpc } from "@/lib/trpc";
import { usePageMeta } from "@/lib/meta";
import { formatSocialTitle, formatSocialDescription } from "@shared/socialTitle";
import { ArrowLeft, FileText, LoaderCircle, UploadCloud, AlertCircle, Clock } from "lucide-react";
import { ChangeEvent, FormEvent, useState } from "react";
import { Link, useRoute } from "wouter";

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Unable to read the selected file"));
    reader.onerror = () => reject(new Error("Unable to read the selected file"));
    reader.readAsDataURL(file);
  });
}

type ExcuseOutcome = "submitted_for_review" | "updated" | "already_present" | "needs_review";

export function ExcuseSubmissionPage() {
  const [, params] = useRoute("/attendance/:publicId/excuse");
  const publicId = params?.publicId ?? "";
  const session = trpc.attendanceProof.publicSession.useQuery({ publicId }, { enabled: Boolean(publicId) });
  const submitProof = trpc.attendanceProof.submit.useMutation();

  const subjectCode = session.data?.session?.subject?.code;
  const subjectName = session.data?.session?.subject?.name;
  const socialTitle = formatSocialTitle({
    type: "Excuse",
    subjectCode,
  });
  const socialDesc = formatSocialDescription({
    type: "excuse",
    subjectCode,
    subjectName,
  });

  usePageMeta({
    title: socialTitle,
    description: socialDesc,
    keywords: ["Excuse Letter", "Attendance Excuse", "Medical Certificate", "Class Roll Call"],
    canonicalPath: publicId ? `/attendance/${publicId}/excuse` : undefined,
    ogImage: "/api/og?type=excuse&title=" + encodeURIComponent(socialTitle) + "&subtitle=" + encodeURIComponent("Secretary Review Process"),
    ogImageAlt: socialTitle,
  });

  const [submittedName, setSubmittedName] = useState("");
  const [excuseReason, setExcuseReason] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [outcome, setOutcome] = useState<ExcuseOutcome | null>(null);
  const [matchedName, setMatchedName] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState("");

  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!nextFile) return;
    if (!isPublicImageMimeType(nextFile.type) && nextFile.type !== "application/pdf") {
      setFile(null);
      setFileError("Choose an image (JPG, PNG, WebP) or PDF document.");
      return;
    }
    if (nextFile.size > MAX_PUBLIC_UPLOAD_BYTES) {
      setFile(null);
      setFileError("Choose a file smaller than 8 MB.");
      return;
    }
    setFile(nextFile);
    setFileError("");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!excuseReason.trim()) {
      setSubmissionError("Please explain your reason for absence.");
      return;
    }
    setSubmissionError("");

    try {
      let base64Data: string | undefined = undefined;
      if (file) {
        base64Data = await fileToDataUrl(file);
      }

      const result: any = await submitProof.mutateAsync({
        publicId,
        submissionType: "excuse_letter",
        submittedName: submittedName.trim(),
        excuseReason: excuseReason.trim(),
        fileName: file?.name,
        mimeType: file?.type,
        base64Data,
      });

      setOutcome(result.outcome);
      setMatchedName(result.matchedName || null);
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : "We could not submit your excuse letter. Please try again.");
    }
  };

  if (session.isLoading) return <PublicShell><section className="signal-panel p-6 text-sm text-muted-foreground">Loading…</section></PublicShell>;
  if (!session.data?.available) return <PublicShell><section className="signal-panel border-t-2 border-primary p-6 text-center"><h1 className="signal-heading">Excuse submission is not available</h1><p className="mt-2 text-xs sm:text-sm text-muted-foreground">Use the active attendance link shared by your secretary.</p></section></PublicShell>;
  const details = session.data.session;

  if (outcome) {
    return (
      <PublicShell subject={details.subject}>
        <div className="mx-auto max-w-xl">
          <section className="signal-panel border-t-2 border-t-primary overflow-hidden rounded-2xl shadow-xl">
            <div className="p-8 sm:p-10 text-center">
              {/* Animated check icon */}
              <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-500/10 ring-8 ring-emerald-500/8">
                <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10 text-emerald-600 dark:text-emerald-400 [animation:check-draw_0.5s_ease_forwards]" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>

              <div className="mt-5">
                <span className="glow-badge-emerald inline-flex items-center rounded-full px-3 py-1 text-xs font-bold">
                  Submitted for Review
                </span>
              </div>

              <h1 className="signal-heading mt-4 text-xl sm:text-2xl font-extrabold">
                Excuse Letter Received
              </h1>

              {matchedName ? (
                <p className="mt-2 text-sm font-semibold text-foreground">
                  Student: <span className="text-emerald-700 dark:text-emerald-400 font-bold">{matchedName}</span>
                </p>
              ) : null}

              <p className="mx-auto mt-3 max-w-md text-xs sm:text-sm leading-relaxed text-muted-foreground">
                Your excuse has been sent to the class secretary for review. Your attendance record will be updated within 24 hours of review.
              </p>

              <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href={`/attendance/${publicId}`}
                  className="signal-action inline-flex min-h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-primary px-6 text-xs sm:text-sm font-bold text-primary-foreground shadow-sm shadow-primary/25 active:scale-[0.98]"
                >
                  <ArrowLeft className="size-4" />
                  Back to Attendance
                </Link>
                <button
                  type="button"
                  className="signal-action inline-flex min-h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-border bg-secondary/60 px-6 text-xs sm:text-sm font-semibold text-foreground hover:bg-secondary active:scale-[0.98]"
                  onClick={() => {
                    setOutcome(null);
                    setFile(null);
                    setExcuseReason("");
                    setSubmittedName("");
                  }}
                >
                  Submit Another
                </button>
              </div>
            </div>
          </section>
        </div>
      </PublicShell>
    );
  }


  return (
    <PublicShell subject={details.subject}>
      <div className="mx-auto max-w-xl">
        <Link
          href={`/attendance/${publicId}`}
          className="signal-action inline-flex min-h-10 items-center gap-2 px-2 text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground active:scale-[0.98]"
        >
          <ArrowLeft className="size-4" />
          Back to Attendance
        </Link>

        <section className="signal-card-shell mt-3">
          <div className="signal-record-card p-4 sm:p-7 rounded-2xl border border-sky-500/25 bg-gradient-to-b from-sky-500/8 dark:from-sky-950/20 via-card to-card shadow-xl shadow-sky-500/5">
            {/* Header info */}
            <div className="flex items-center justify-between gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400">
                <FileText className="size-5" />
              </span>
              <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/10 px-3 py-0.5 text-xs font-bold text-primary">
                {details.subject.code}
              </Badge>
            </div>

            <h1 className="signal-title mt-3 text-xl sm:text-2xl font-extrabold tracking-tight">
              Submit Excuse Letter
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Session: <span className="font-semibold text-foreground">{new Date(details.startsAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</span>
            </p>

            <div className="mt-4 rounded-xl border border-sky-500/20 bg-sky-500/8 dark:bg-sky-950/20 p-3.5 text-xs leading-5 text-foreground">
              <div className="flex items-center gap-1.5 font-bold text-sky-700 dark:text-sky-300">
                <Clock className="size-3.5" />
                <span>Secretary Review</span>
              </div>
              <p className="mt-1 text-muted-foreground">
                State your reason for missing class and attach optional medical or excuse proof. The secretary will review and update your record.
              </p>
            </div>

            {/* Form */}
            <form className="mt-5 space-y-4" onSubmit={submit}>
              {/* Student Name */}
              <div>
                <label htmlFor="excuse-name" className="text-xs sm:text-sm font-bold text-foreground">
                  Full Name (as enrolled) *
                </label>
                <Input
                  id="excuse-name"
                  value={submittedName}
                  onChange={event => setSubmittedName(event.target.value)}
                  placeholder="e.g. Dela Cruz, Juan"
                  autoComplete="name"
                  className="mt-1.5 min-h-12 rounded-xl bg-secondary/30 text-xs sm:text-sm"
                  required
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Format: Last Name, First Name
                </p>
              </div>

              {/* Excuse Reason */}
              <div>
                <label htmlFor="excuse-reason" className="text-xs sm:text-sm font-bold text-foreground">
                  Reason for Absence *
                </label>
                <Textarea
                  id="excuse-reason"
                  value={excuseReason}
                  onChange={event => setExcuseReason(event.target.value)}
                  placeholder="Briefly explain why you missed class (e.g. medical illness, doctor's appointment, university event)..."
                  className="mt-1.5 min-h-24 resize-none rounded-xl bg-secondary/30 text-xs sm:text-sm"
                  required
                />
              </div>

              {/* File Attachment */}
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs sm:text-sm font-bold text-foreground">
                    Supporting Document (Optional)
                  </p>
                  {file ? (
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="text-xs font-semibold text-destructive hover:underline p-1"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>

                <label
                  htmlFor="excuse-file"
                  className={`signal-action signal-inset mt-1.5 flex min-h-32 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed p-3 text-center transition-all ${
                    file
                      ? "border-sky-500/60 bg-sky-500/5"
                      : "border-border hover:border-sky-500/60 hover:bg-secondary/40"
                  }`}
                >
                  <UploadCloud className="size-5 text-sky-600 dark:text-sky-400" />
                  <span className="text-xs sm:text-sm font-bold text-foreground">
                    {file ? file.name : "Attach photo or PDF document"}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    JPG, PNG, WebP, or PDF · up to 8 MB
                  </span>
                </label>
                <input
                  id="excuse-file"
                  type="file"
                  accept={`${PUBLIC_IMAGE_MIME_TYPES.join(",")},application/pdf`}
                  className="sr-only"
                  onChange={chooseFile}
                />

                {file ? (
                  <p className="mt-1.5 text-xs font-semibold text-sky-700 dark:text-sky-400">
                    ✓ {formatFileSize(file.size)} ready
                  </p>
                ) : null}
                {fileError ? (
                  <p className="mt-1.5 text-xs font-medium text-destructive" role="alert">
                    {fileError}
                  </p>
                ) : null}
              </div>

              {submissionError ? (
                <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs sm:text-sm text-destructive" role="alert">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{submissionError}</span>
                </div>
              ) : null}

              {/* Submit Button */}
              <Button
                type="submit"
                className="mt-5 min-h-12 w-full rounded-xl text-xs sm:text-sm font-bold shadow-sm shadow-primary/25 active:scale-[0.99]"
                disabled={submitProof.isPending || !excuseReason.trim() || submittedName.trim().length < 2}
              >
                {submitProof.isPending ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <FileText className="size-4" />
                    Submit Excuse Letter
                  </>
                )}
              </Button>

              <div className="pt-2 text-center">
                <Link
                  href={`/attendance/${publicId}/proof`}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Attended Zoom? Submit screenshot for instant AI verification →
                </Link>
              </div>
            </form>

          </div>
        </section>
      </div>
    </PublicShell>
  );
}
