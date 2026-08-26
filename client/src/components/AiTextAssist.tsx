import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

type AiTextTarget = "student_note" | "announcement" | "resource_description" | "question_answer" | "excuse_reason";

export function AiTextAssist({ value, onApply, target, context, className = "" }: { value: string; onApply: (value: string) => void; target: AiTextTarget; context?: string; className?: string }) {
  const improve = trpc.foundation.owner.improveText.useMutation({
    onSuccess: output => { onApply(output.text); toast.success("AI suggestion placed in the field for your review"); },
    onError: error => toast.error(error.message),
  });
  const mode = value.trim() ? "improve" : "autofill";
  return <Button type="button" variant="outline" size="sm" disabled={improve.isPending} onClick={() => improve.mutate({ target, mode, text: value, context })} className={`min-h-10 rounded-xl border-primary/30 text-primary hover:border-primary hover:bg-primary/10 ${className}`}><Sparkles data-icon="inline-start" />{improve.isPending ? "Preparing…" : mode === "improve" ? "Improve with AI" : "Autofill with AI"}</Button>;
}
