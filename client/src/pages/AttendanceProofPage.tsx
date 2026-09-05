import { PublicShell } from "@/pages/PublicPages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatFileSize, isPublicImageMimeType, MAX_PUBLIC_UPLOAD_BYTES, PUBLIC_IMAGE_MIME_TYPES } from "@shared/mediaPolicy";
import { trpc } from "@/lib/trpc";
import { usePageMeta } from "@/lib/meta";
import { formatSocialTitle, formatSocialDescription } from "@shared/socialTitle";
import { ArrowLeft, CheckCircle2, ImagePlus, LoaderCircle, ShieldCheck, Sparkles, UploadCloud, AlertCircle, Clock } from "lucide-react";
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

type ProofOutcome = "updated" | "already_present" | "needs_review";

export function AttendanceProofPage() {
  const [, params] = useRoute("/attendance/:publicId/proof");
  const publicId = params?.publicId ?? "";
  const session = trpc.attendanceProof.publicSession.useQuery({ publicId }, { enabled: Boolean(publicId) });
  const submitProof = trpc.attendanceProof.submit.useMutation();

  const subjectCode = session.data?.session?.subject?.code;
  const subjectName = session.data?.session?.subject?.name;
  const socialTitle = formatSocialTitle({
    type: "Proof",
    subjectCode,
  });
  const socialDesc = formatSocialDescription({
    type: "proof",
    subjectCode,
    subjectName,
  });

  usePageMeta({
    title: socialTitle,
    description: socialDesc,
    keywords: ["Zoom Attendance", "Attendance Proof", "AI Verification", "Class Roll Call"],
    canonicalPath: publicId ? `/attendance/${publicId}/proof` : undefined,
    ogImage: "/api/og?type=proof&title=" + encodeURIComponent(socialTitle) + "&subtitle=" + encodeURIComponent("Instant AI Verification"),
    ogImageAlt: socialTitle,
  });

  const [submittedName, setSubmittedName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [outcome, setOutcome] = useState<ProofOutcome | null>(null);
  const [matchedName, setMatchedName] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState("");

  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!nextFile) return;
    if (!isPublicImageMimeType(nextFile.type)) {
      setFile(null);
      setFileError("Choose a JPG, PNG, WebP, GIF, or AVIF Zoom screenshot.");
      return;
    }
    if (nextFile.size > MAX_PUBLIC_UPLOAD_BYTES) {
      setFile(null);
      setFileError("Choose a screenshot smaller than 8 MB.");
      return;
    }
    setFile(nextFile);
    setFileError("");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) {
      setFileError("Please attach your Zoom screenshot first.");
      return;
    }
    setSubmissionError("");

    try {
      const base64Data = await fileToDataUrl(file);
      const result: any = await submitProof.mutateAsync({
        publicId,
        submissionType: "zoom_proof",
        submittedName: submittedName.trim(),
        fileName: file.name,
        mimeType: file.type,
        base64Data,
      });

      setOutcome(result.outcome);
      setMatchedName(result.matchedName || null);
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : "We could not submit your proof. Please try again.");
    }
  };

  if (session.isLoading) return <PublicShell><section className="signal-panel p-6 text-sm text-muted-foreground">Loading…</section></PublicShell>;
  if (!session.data?.available) return <PublicShell><section className="signal-panel border-t-2 border-primary p-6 text-center"><h1 className="signal-heading">Proof submission is not available</h1><p className="mt-2 text-xs sm:text-sm text-muted-foreground">Use the active attendance link shared by your secretary.</p></section></PublicShell>;
  const details = session.data.session;

  if (outcome) {
    const isAutoApproved = outcome === "updated" || outcome === "already_present";

    return (
      <PublicShell subject={details.subject}>
        <div className="mx-auto max-w-xl">
          <section className="signal-panel border-t-2 border-t-primary p-8 sm:p-10 text-center rounded-2xl shadow-xl space-y-4">
            <span
              className={`mx-auto flex h-20 w-20 items-center justify-center rounded-2xl ${
                isAutoApproved
                  ? "bg-emerald-500/10 ring-8 ring-emerald-500/8 text-emerald-400"
                  : "bg-amber-500/10 ring-8 ring-amber-500/8 text-amber-400"
              }`}
            >
              {isAutoApproved ? (
                <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10 text-emerald-400 [animation:check-draw_0.5s_ease_forwards]" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <Clock className="size-10" />
              )}
            </span>

            <div className="pt-2">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
                  isAutoApproved ? "glow-badge-emerald" : "glow-badge-amber"
                }`}
              >
                {isAutoApproved ? "Instant AI Verified" : "Queued for Secretary Review"}
              </span>
            </div>

            <h1 className="signal-heading text-xl sm:text-2xl font-black text-foreground">
              {outcome === "updated"
                ? "Marked Present! 🎉"
                : outcome === "already_present"
                ? "Already Recorded Present"
                : "Proof Received"}
            </h1>

            {matchedName ? (
              <p className="text-sm font-semibold text-foreground">
                Verified Student: <span className="text-emerald-400 font-bold">{matchedName}</span>
              </p>
            ) : null}

            <p className="mx-auto max-w-md text-xs sm:text-sm leading-relaxed text-muted-foreground">
              {outcome === "updated"
                ? "Your Zoom participant screenshot was verified by AI and your attendance record has been updated to PRESENT."
                : outcome === "already_present"
                ? "Your Zoom participant screenshot was verified. You were already recorded as Present for this class session."
                : "Your screenshot is queued for secretary review. Check back later for verification updates."}
            </p>

            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href={`/attendance/${publicId}`}
                className="signal-action inline-flex min-h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-primary px-6 text-xs sm:text-sm font-bold text-primary-foreground shadow-sm shadow-primary/25 active:scale-[0.98]"
              >
                <ArrowLeft className="size-4" />
                Back to Attendance
              </Link>
              <Button
                variant="outline"
                className="w-full sm:w-auto min-h-12 rounded-xl text-xs sm:text-sm font-semibold"
                onClick={() => {
                  setOutcome(null);
                  setFile(null);
                  setSubmittedName("");
                }}
              >
                Submit Another
              </Button>
            </div>
          </section>
        </div>
      </PublicShell>
    );
  }

  return (
    <PublicShell subject={details.subject}>
      <div className="mx-auto max-w-xl pb-12">
        <Link
          href={`/attendance/${publicId}`}
          className="signal-action inline-flex min-h-10 items-center gap-2 px-2 text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground active:scale-[0.98]"
        >
          <ArrowLeft className="size-4" />
          Back to Attendance
        </Link>

        <section className="signal-panel mt-3 p-6 sm:p-8 rounded-2xl shadow-xl space-y-5">
          {/* Header info */}
          <div className="flex items-center justify-between gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-emerald-500/15 text-emerald-400">
              <Sparkles className="size-5" />
            </span>
            <Badge className="rounded-full bg-primary px-3 py-0.5 text-xs font-bold text-primary-foreground shadow-sm">
              {details.subject.code}
            </Badge>
          </div>

          <div>
            <h1 className="signal-title text-xl sm:text-2xl font-black tracking-tight text-foreground">
              Zoom Proof of Attendance
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground font-medium">
              Session: <span className="font-semibold text-foreground">{new Date(details.startsAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</span>
            </p>
          </div>

          {/* 3-Step Guide */}
          <div className="signal-inset p-4 rounded-xl space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-xs text-primary uppercase tracking-wider">
              <Sparkles className="size-3.5" />
              <span>Instant AI Attendance Verification</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Upload your Zoom meeting participant screenshot. The AI parser will instantly match your name against the official student roster and record your attendance.
            </p>
          </div>

          {/* Form */}
          <form className="space-y-4 pt-1" onSubmit={submit}>
            {/* Student Name */}
            <div>
              <label htmlFor="proof-name" className="text-xs sm:text-sm font-bold text-foreground">
                Full Enrolled Name *
              </label>
              <Input
                id="proof-name"
                value={submittedName}
                onChange={event => setSubmittedName(event.target.value)}
                placeholder="e.g. Dela Cruz, Juan"
                autoComplete="name"
                className="mt-1.5 min-h-12 rounded-xl bg-secondary/30 text-xs sm:text-sm"
                required
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Format: Last Name, First Name (as listed on class roster)
              </p>
            </div>

            {/* File Attachment */}
            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs sm:text-sm font-bold text-foreground">
                  Zoom Participant Screenshot *
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
                htmlFor="attendance-proof-file"
                className={`signal-action signal-inset mt-1.5 flex min-h-36 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed p-4 text-center transition-all ${
                  file
                    ? "border-emerald-500/60 bg-emerald-500/5"
                    : "border-border hover:border-emerald-500/60 hover:bg-secondary/40"
                }`}
              >
                <UploadCloud className="size-6 text-emerald-400" />
                <span className="text-xs sm:text-sm font-bold text-foreground">
                  {file ? file.name : "Tap or drag your Zoom screenshot"}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  JPG, PNG, WebP · up to 8 MB
                </span>
              </label>
              <input
                id="attendance-proof-file"
                type="file"
                accept={PUBLIC_IMAGE_MIME_TYPES.join(",")}
                className="sr-only"
                onChange={chooseFile}
              />

              {file ? (
                <p className="mt-1.5 text-xs font-semibold text-emerald-400">
                  ✓ {formatFileSize(file.size)} selected and ready
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
              disabled={submitProof.isPending || !file || submittedName.trim().length < 2}
            >
              {submitProof.isPending ? (
                <>
                  <LoaderCircle className="size-4 animate-spin mr-2" />
                  Verifying with AI Matcher…
                </>
              ) : (
                <>
                  <Sparkles className="size-4 mr-2 text-amber-300" />
                  Verify with AI &amp; Mark Present
                </>
              )}
            </Button>

            <div className="pt-2 text-center">
              <Link
                href={`/attendance/${publicId}/excuse`}
                className="text-xs font-medium text-primary hover:underline"
              >
                Need to submit a Written Excuse Letter instead? Click here →
              </Link>
            </div>
          </form>
        </section>
      </div>
    </PublicShell>
  );
}
