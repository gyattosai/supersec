import { Input } from "@/components/ui/input";
import { AnnouncementEditor } from "@/components/AnnouncementEditor";
import { Loader2, Sparkles } from "lucide-react";

type QuestionAnswerControlsProps = {
  question?: string;
  answer: string;
  onAnswerChange: (value: string) => void;
  tagsText: string;
  onTagsTextChange: (value: string) => void;
  isOfficial: boolean;
  onOfficialChange: (value: boolean) => void;
  changeSummary: string;
  onChangeSummaryChange: (value: string) => void;
  showChangeSummary: boolean;
  onAutoDraft?: () => void;
  isDrafting?: boolean;
};

export function QuestionAnswerControls({
  question,
  answer,
  onAnswerChange,
  tagsText,
  onTagsTextChange,
  isOfficial,
  onOfficialChange,
  changeSummary,
  onChangeSummaryChange,
  showChangeSummary,
  onAutoDraft,
  isDrafting,
}: QuestionAnswerControlsProps) {
  const contextDescription = question
    ? `Question: ${question}${tagsText ? ` · Topics: ${tagsText}` : ""}`
    : tagsText
    ? `Topics: ${tagsText}`
    : "Answer a repeated class question clearly and respectfully.";

  return (
    <div className="mt-3 space-y-3">
      <div>
        <AnnouncementEditor
          id="question-answer"
          label="Answer"
          required
          value={answer}
          onChange={onAnswerChange}
          aiTarget="question_answer"
          aiContext={contextDescription}
          placeholder="Write the answer classmates need."
          helperText="Use formatting to make the answer easy to scan."
          minHeightClassName="min-h-48"
        />
      </div>
      <div>
        <label htmlFor="question-tags" className="text-sm font-medium text-foreground">Tags <span className="text-muted-foreground">(optional)</span></label>
        <Input id="question-tags" value={tagsText} onChange={event => onTagsTextChange(event.target.value)} className="mt-2" placeholder="For example, deadline, enrollment, Zoom" />
        <p className="mt-1 text-xs leading-5 text-muted-foreground">Use commas to separate topics.</p>
      </div>
      <div className="rounded-2xl border border-border bg-secondary/40 p-3">
        <label htmlFor="question-official" className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium text-foreground">
          <input
            id="question-official"
            type="checkbox"
            checked={isOfficial}
            onChange={event => onOfficialChange(event.target.checked)}
            className="h-4 w-4 rounded border-input accent-primary"
          />
          Mark as an official answer
        </label>
        <p id="question-official-help" className="mt-1 pl-7 text-xs leading-5 text-muted-foreground">Shown on the shared page.</p>
        {showChangeSummary ? (
          <div className="mt-3">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="question-change-summary" className="text-sm font-medium text-foreground">Public change summary</label>
              {onAutoDraft ? (
                <button
                  type="button"
                  onClick={onAutoDraft}
                  disabled={isDrafting}
                  className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline disabled:opacity-50 cursor-pointer"
                >
                  {isDrafting ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                  {isDrafting ? "Drafting..." : "Auto-Draft with AI"}
                </button>
              ) : null}
            </div>
            <Input
              id="question-change-summary"
              value={changeSummary}
              onChange={event => onChangeSummaryChange(event.target.value)}
              className="mt-2"
              placeholder="For example, clarified the deadline"
            />
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Shown in public History. Leave blank for AI to auto-draft on save.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
