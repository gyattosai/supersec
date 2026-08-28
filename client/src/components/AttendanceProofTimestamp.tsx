import { formatDateTime12Hour } from "@/lib/time";

type AttendanceProofTimestampProps = { createdAt: Date | string | number };

export function AttendanceProofTimestamp({ createdAt }: AttendanceProofTimestampProps) {
  const date = new Date(createdAt);
  return <time dateTime={Number.isNaN(date.getTime()) ? undefined : date.toISOString()}>{formatDateTime12Hour(createdAt)}</time>;
}
