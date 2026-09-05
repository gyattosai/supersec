export type Time12Parts = {
  hour: string;
  minute: string;
  period: "AM" | "PM";
};

function normalizeTime(value: string | null | undefined) {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hour24 = Number(match[1]);
  const minute = Number(match[2]);
  if (hour24 < 0 || hour24 > 23 || minute < 0 || minute > 59) return null;
  return { hour24, minute };
}

export function time24To12Parts(value: string | null | undefined): Time12Parts | null {
  const normalized = normalizeTime(value);
  if (!normalized) return null;
  const period = normalized.hour24 >= 12 ? "PM" : "AM";
  const hour12 = normalized.hour24 % 12 || 12;
  return { hour: String(hour12), minute: String(normalized.minute).padStart(2, "0"), period };
}

export function time12PartsTo24(parts: Partial<Time12Parts>): string {
  if (!parts.hour || !parts.minute || !parts.period) return "";
  const hour12 = Number(parts.hour);
  const minute = Number(parts.minute);
  if (hour12 < 1 || hour12 > 12 || minute < 0 || minute > 59) return "";
  const hour24 = parts.period === "PM" ? (hour12 % 12) + 12 : hour12 % 12;
  return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function formatTime12Hour(value: string | null | undefined): string {
  const parts = time24To12Parts(value);
  return parts ? `${parts.hour}:${parts.minute} ${parts.period}` : "";
}

export function formatTimeRange12Hour(startTime: string | null | undefined, endTime: string | null | undefined): string {
  const start = formatTime12Hour(startTime);
  const end = formatTime12Hour(endTime);
  return start ? ` · ${start}${end ? ` – ${end}` : ""}` : "";
}

export function formatDateTime12Hour(value: Date | string | number): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    hour12: true,
  });
}

export function splitDateTimeLocal(value: string): { date: string; time: string } {
  const [date = "", time = ""] = value.split("T");
  return { date, time: time.slice(0, 5) };
}

export function joinDateTimeLocal(date: string, time: string): string {
  return date && time ? `${date}T${time}` : date ? `${date}T00:00` : "";
}
