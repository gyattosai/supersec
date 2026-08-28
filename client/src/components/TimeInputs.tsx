import { Input } from "@/components/ui/input";
import { joinDateTimeLocal, splitDateTimeLocal } from "@/lib/time";

type Time12HourInputProps = {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
};

const timeInputClassName = "min-h-11 min-w-0 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55";

/**
 * Uses the browser's native time control. The control presents the user's local
 * 12-hour or 24-hour clock preference while keeping the HTML time value in the
 * existing HH:mm format used by the database and server procedures.
 */
export function Time12HourInput({ value, onChange, ariaLabel }: Time12HourInputProps) {
  return <Input type="time" step={60} aria-label={ariaLabel} value={value || ""} onChange={event => onChange(event.target.value)} className={timeInputClassName} />;
}

type DateTime12HourInputProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
};

export function DateTime12HourInput({ id, value, onChange, ariaLabel }: DateTime12HourInputProps) {
  const { date, time } = splitDateTimeLocal(value);
  const updateDate = (nextDate: string) => onChange(nextDate ? joinDateTimeLocal(nextDate, time || "00:00") : "");
  const updateTime = (nextTime: string) => onChange(date && nextTime ? joinDateTimeLocal(date, nextTime) : "");

  return (
    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]" role="group" aria-label={ariaLabel}>
      <Input id={id} type="date" required value={date} onChange={event => updateDate(event.target.value)} aria-label={`${ariaLabel} date`} />
      <Time12HourInput value={time} onChange={updateTime} ariaLabel={`${ariaLabel} time`} />
    </div>
  );
}
