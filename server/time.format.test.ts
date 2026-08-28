import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AttendanceProofTimestamp } from "../client/src/components/AttendanceProofTimestamp";
import { Time12HourInput, DateTime12HourInput } from "../client/src/components/TimeInputs";
import { formatReportTimestamp } from "../client/src/lib/reportPdf";
import { describe, expect, it } from "vitest";
import { formatDateTime12Hour, formatTime12Hour, formatTimeRange12Hour, time12PartsTo24, time24To12Parts } from "../client/src/lib/time";

describe("12-hour time formatting", () => {
  it("converts midnight and noon without losing their period", () => {
    expect(time24To12Parts("00:00")).toEqual({ hour: "12", minute: "00", period: "AM" });
    expect(time24To12Parts("12:00")).toEqual({ hour: "12", minute: "00", period: "PM" });
    expect(formatTime12Hour("00:05")).toBe("12:05 AM");
    expect(formatTime12Hour("23:45")).toBe("11:45 PM");
  });

  it("round-trips 12-hour values into the stored HH:mm contract", () => {
    expect(time12PartsTo24({ hour: "12", minute: "00", period: "AM" })).toBe("00:00");
    expect(time12PartsTo24({ hour: "12", minute: "30", period: "PM" })).toBe("12:30");
    expect(time12PartsTo24({ hour: "9", minute: "07", period: "PM" })).toBe("21:07");
    expect(formatTimeRange12Hour("09:07", "17:20")).toBe(" · 9:07 AM–5:20 PM");
  });

  it("uses an explicit 12-hour clock for date-time displays", () => {
    const formatted = formatDateTime12Hour(new Date(2026, 0, 15, 0, 5));
    expect(formatted).toMatch(/12:05\sAM/);
    expect(formatted).not.toMatch(/00:05/);
    expect(formatReportTimestamp(new Date(2026, 0, 15, 12, 30))).toMatch(/12:30\sPM/);
  });

  it("renders the reusable controls with 12-hour options and a date-time group", () => {
    const timeMarkup = renderToStaticMarkup(createElement(Time12HourInput, { ariaLabel: "Start time", value: "23:59", onChange: () => undefined }));
    expect(timeMarkup).toContain('aria-label="Start time"');
    expect(timeMarkup).toContain('value="23:59"');
    expect(timeMarkup).toContain("11:59 PM");
    expect(timeMarkup).not.toContain(">23:59<");

    const dateTimeMarkup = renderToStaticMarkup(createElement(DateTime12HourInput, { id: "class-at", value: "2026-08-28T07:05", onChange: () => undefined, ariaLabel: "Class date and time" }));
    expect(dateTimeMarkup).toContain('role="group"');
    expect(dateTimeMarkup).toContain('type="date"');
    expect(dateTimeMarkup).toContain("7:05 AM");

    const proofMarkup = renderToStaticMarkup(createElement(AttendanceProofTimestamp, { createdAt: new Date("2026-01-15T12:30:00.000Z") }));
    expect(proofMarkup).toContain('dateTime="2026-01-15T12:30:00.000Z"');
    expect(proofMarkup).toContain("12:30 PM");
  });
});
