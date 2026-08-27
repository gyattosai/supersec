import { Input } from "@/components/ui/input";
import { AnnouncementEditor } from "@/components/AnnouncementEditor";

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
        <label className="text-sm font-medium text-foreground">Answer</label>
        <AnnouncementEditor
          id="question-answer"
          label="Answer"
          required
          value={answer}
          onChange={onAnswerChange}
          aiTarget="question_answer"
          aiContext={tagsText ? `Suggested topics: ${tagsText}` : "Answer a repeated class question clearly and respectfully."}
          placeholder="Write a clear answer classmates can reuse."
          helperText="Use headings, emphasis, lists, quotes, and links to make the answer easy to reuse. Shared pages render this formatting safely."
          minHeightClassName="min-h-48"
        />
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
