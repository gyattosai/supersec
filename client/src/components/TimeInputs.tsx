import { Input } from "@/components/ui/input";
import { formatTime12Hour, joinDateTimeLocal, splitDateTimeLocal } from "@/lib/time";

const timeOptions = Array.from({ length: 24 * 60 }, (_, index) => {
  const hour24 = Math.floor(index / 60);
  const minute = index % 60;
  const value = `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  return { value, label: formatTime12Hour(value) };
});

const selectClassName = "min-h-11 min-w-0 w-full rounded-xl border border-input bg-card px-2.5 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55";

type Time12HourInputProps = {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
};

export function Time12HourInput({ value, onChange, ariaLabel }: Time12HourInputProps) {
  return (
    <select aria-label={ariaLabel} value={value || ""} onChange={event => onChange(event.target.value)} className={selectClassName}>
      <option value="">Select time</option>
      {timeOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  );
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
