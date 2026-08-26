import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AiTextAssist } from "@/components/AiTextAssist";

type QuestionAnswerControlsProps = {
  answer: string;
  onAnswerChange: (value: string) => void;
  tagsText: string;
  onTagsTextChange: (value: string) => void;
  isOfficial: boolean;
  onOfficialChange: (value: boolean) => void;
  changeSummary: string;
  onChangeSummaryChange: (value: string) => void;
  showChangeSummary: boolean;
};

export function QuestionAnswerControls({ answer, onAnswerChange, tagsText, onTagsTextChange, isOfficial, onOfficialChange, changeSummary, onChangeSummaryChange, showChangeSummary }: QuestionAnswerControlsProps) {
  return (
    <div className="mt-3 space-y-3">
      <div>
        <label htmlFor="question-answer" className="text-sm font-medium text-foreground">Answer</label>
        <Textarea
          id="question-answer"
          required
          className="mt-2 min-h-48"
          value={answer}
          onChange={event => onAnswerChange(event.target.value)}
          placeholder="Write a clear answer classmates can reuse."
        />
        <div className="mt-2 flex items-center justify-between gap-3"><p className="text-xs leading-5 text-muted-foreground">AI suggestions stay private until you review, edit, and save this answer.</p><AiTextAssist value={answer} onApply={onAnswerChange} target="question_answer" context={tagsText ? `Suggested topics: ${tagsText}` : "Answer a repeated class question clearly and respectfully."} /></div>
      </div>
      <div>
        <label htmlFor="question-tags" className="text-sm font-medium text-foreground">Tags <span className="text-muted-foreground">(optional)</span></label>
        <Input id="question-tags" value={tagsText} onChange={event => onTagsTextChange(event.target.value)} className="mt-2" placeholder="For example, deadline, enrollment, Zoom" />
        <p className="mt-1 text-xs leading-5 text-muted-foreground">Separate tags with commas. They help classmates recognize the topic on the shared answer.</p>
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
        <p id="question-official-help" className="mt-1 pl-7 text-xs leading-5 text-muted-foreground">This public status is shown on the individual share page.</p>
        {showChangeSummary ? (
          <div className="mt-3">
            <label htmlFor="question-change-summary" className="text-sm font-medium text-foreground">Public change summary</label>
            <Input
              id="question-change-summary"
              value={changeSummary}
              onChange={event => onChangeSummaryChange(event.target.value)}
              className="mt-2"
              placeholder="For example, clarified the deadline"
            />
            <p className="mt-1 text-xs leading-5 text-muted-foreground">This appears in the public version History. Leave blank to use the standard update summary.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
