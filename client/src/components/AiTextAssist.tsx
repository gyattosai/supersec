import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";
import {
  Sparkles,
  ChevronDown,
  Wand2,
  Share2,
  ListTodo,
  FileText,
  LoaderCircle,
  Undo2,
} from "lucide-react";
import React, { useRef } from "react";
import { toast } from "sonner";
import { AiTextMode, AiTextTarget } from "@shared/aiTextEngine";

export type { AiTextTarget, AiTextMode };

export function AiTextAssist({
  value,
  onApply,
  target,
  context,
  className = "",
}: {
  value?: string;
  onApply: (value: string) => void;
  target: AiTextTarget;
  context?: string;
  className?: string;
}) {
  const previousValueRef = useRef<string | null>(null);

  const improve = trpc.foundation.owner.improveText.useMutation({
    onSuccess: (output, variables) => {
      const resultText = output?.text ?? (output as any)?.improvedText ?? "";
      if (resultText) {
        previousValueRef.current = typeof value === "string" ? value : "";
        onApply(resultText);

        const modeLabel =
          variables.mode === "messenger"
            ? "Messenger Chat formatting"
            : variables.mode === "action_items"
            ? "Action Items checklist"
            : variables.mode === "autofill"
            ? "Auto-draft"
            : "AI Polish & Structure";

        toast.success(`Gemini AI applied: ${modeLabel}`, {
          action: previousValueRef.current
            ? {
                label: "Undo",
                onClick: () => {
                  if (previousValueRef.current !== null) {
                    onApply(previousValueRef.current);
                    toast.info("Reverted to previous draft");
                  }
                },
              }
            : undefined,
        });
      }
    },
    onError: error =>
      toast.error(error.message || "Failed to generate AI suggestion. Try again."),
  });

  const safeValue = typeof value === "string" ? value : "";
  const defaultMode: AiTextMode = safeValue.trim() ? "improve" : "autofill";

  const handleRunAi = (selectedMode: AiTextMode) => {
    improve.mutate({
      target,
      mode: selectedMode,
      text: safeValue,
      context,
    });
  };

  return (
    <div className={`inline-flex items-center rounded-xl border border-primary/30 bg-primary/5 shadow-xs ${className}`}>
      {/* Main 1-Click Action Button */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={improve.isPending}
        onClick={() => handleRunAi(defaultMode)}
        className="h-8 px-2.5 text-xs font-bold text-primary hover:bg-primary/10 rounded-l-xl rounded-r-none gap-1.5"
      >
        {improve.isPending ? (
          <LoaderCircle className="size-3.5 animate-spin text-primary" />
        ) : (
          <Sparkles className="size-3.5 text-primary animate-pulse" />
        )}
        <span>
          {improve.isPending
            ? "Generating with Gemini…"
            : defaultMode === "improve"
            ? "Polish with AI"
            : "Auto-Draft with AI"}
        </span>
      </Button>

      {/* AI Modes Dropdown Trigger */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={improve.isPending}
            className="h-8 px-1.5 text-primary hover:bg-primary/10 rounded-r-xl rounded-l-none border-l border-primary/20"
            title="More AI Generation Modes"
          >
            <ChevronDown className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5 bg-card/95 backdrop-blur-xl border-border/80 shadow-xl">
          <DropdownMenuLabel className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
            Gemini Assistant Modes
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => handleRunAi("improve")}
            className="rounded-xl px-2.5 py-2 text-xs font-semibold cursor-pointer focus:bg-primary/10 focus:text-primary gap-2"
          >
            <Wand2 className="size-3.5 text-primary" />
            <div className="flex flex-col">
              <span>Polish &amp; Format</span>
              <span className="text-[10px] text-muted-foreground">Fix grammar, structure with headings</span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => handleRunAi("messenger")}
            className="rounded-xl px-2.5 py-2 text-xs font-semibold cursor-pointer focus:bg-primary/10 focus:text-primary gap-2"
          >
            <Share2 className="size-3.5 text-primary" />
            <div className="flex flex-col">
              <span>Format for Messenger</span>
              <span className="text-[10px] text-muted-foreground">Clean bulletin with emojis &amp; highlights</span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => handleRunAi("action_items")}
            className="rounded-xl px-2.5 py-2 text-xs font-semibold cursor-pointer focus:bg-primary/10 focus:text-primary gap-2"
          >
            <ListTodo className="size-3.5 text-primary" />
            <div className="flex flex-col">
              <span>Extract Action Items</span>
              <span className="text-[10px] text-muted-foreground">Checklist of deliverables &amp; deadlines</span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => handleRunAi("autofill")}
            className="rounded-xl px-2.5 py-2 text-xs font-semibold cursor-pointer focus:bg-primary/10 focus:text-primary gap-2"
          >
            <FileText className="size-3.5 text-primary" />
            <div className="flex flex-col">
              <span>Auto-Draft Outline</span>
              <span className="text-[10px] text-muted-foreground">Generate draft based on title &amp; subject</span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
