import { describe, expect, it } from "vitest";
import {
  DEFAULT_PRESET_TEMPLATES,
  interpolateTemplate,
  type MessageTemplate,
} from "../shared/messageTemplates";

describe("Message Templates & Messenger Snippet Engine", () => {
  it("includes all 6 core secretary presets", () => {
    expect(DEFAULT_PRESET_TEMPLATES.length).toBeGreaterThanOrEqual(6);
    const titles = DEFAULT_PRESET_TEMPLATES.map(t => t.title);
    expect(titles.some(t => t.includes("Attendance"))).toBe(true);
    expect(titles.some(t => t.includes("Zoom"))).toBe(true);
    expect(titles.some(t => t.includes("Excuse"))).toBe(true);
    expect(titles.some(t => t.includes("Announcement"))).toBe(true);
  });

  it("interpolates dynamic placeholders accurately", () => {
    const template = "📢 {subject} ({subject_name}) on {date} - Present: {present_count}, Absent: {absent_count}\n👉 {link}";
    const output = interpolateTemplate(template, {
      subject: "OLCBTQM01",
      subject_name: "Operations Management",
      date: "Sep 1, 2026",
      present_count: 26,
      absent_count: 16,
      link: "https://supersec.mjbalubar.tech/attendance/W1HTNwL2L9y4?v=2",
    });

    expect(output).toContain("📢 OLCBTQM01 (Operations Management) on Sep 1, 2026 - Present: 26, Absent: 16");
    expect(output).toContain("👉 https://supersec.mjbalubar.tech/attendance/W1HTNwL2L9y4?v=2");
  });

  it("provides clean fallback values for missing placeholders", () => {
    const template = "Session: {subject} on {date}. Deadline: {time}. Link: {link}. Counts: {present_count}/{absent_count}";
    const output = interpolateTemplate(template, {});

    expect(output).toContain("Session: [Subject]");
    expect(output).toContain("Deadline: 11:59 PM");
    expect(output).toContain("Link: https://supersec.mjbalubar.tech");
    expect(output).toContain("Counts: —/—");
  });

  it("handles custom templates with custom tags", () => {
    const customTemplate: MessageTemplate = {
      id: "custom-1",
      title: "Quiz Announcement",
      category: "custom",
      template: "🚨 Quiz tomorrow in {subject}! Please bring your IDs.\nCheck materials: {link}",
    };

    const rendered = interpolateTemplate(customTemplate.template, {
      subject: "CS101",
      link: "https://supersec.mjbalubar.tech/s/CS101",
    });

    expect(rendered).toBe("🚨 Quiz tomorrow in CS101! Please bring your IDs.\nCheck materials: https://supersec.mjbalubar.tech/s/CS101");
  });

  it("supports custom note and time variable overrides", () => {
    const template = "📢 Reminder: {subject} assignment due at {time}.\nNote: {custom_note}\nPortal: {link}";
    const output = interpolateTemplate(template, {
      subject: "MATH-202",
      time: "8:00 PM Tomorrow",
      custom_note: "Late submissions receive 10% deduction per day.",
      link: "https://supersec.mjbalubar.tech/s/MATH-202",
    });

    expect(output).toContain("due at 8:00 PM Tomorrow");
    expect(output).toContain("Late submissions receive 10% deduction per day.");
  });

  it("handles snippet deletion and preset filtering", () => {
    const initialList: MessageTemplate[] = [
      ...DEFAULT_PRESET_TEMPLATES,
      { id: "custom-101", title: "Custom Exam Notice", category: "custom", template: "Exam on Friday" },
      { id: "custom-102", title: "Custom Project Due", category: "custom", template: "Project due Monday" },
    ];

    // Delete custom-101
    const afterDelete = initialList.filter(t => t.id !== "custom-101");
    expect(afterDelete.some(t => t.id === "custom-101")).toBe(false);
    expect(afterDelete.some(t => t.id === "custom-102")).toBe(true);

    // Hide preset
    const hiddenPresetIds = ["preset-attendance-posted"];
    const visibleTemplates = afterDelete.filter(t => !hiddenPresetIds.includes(t.id));
    expect(visibleTemplates.some(t => t.id === "preset-attendance-posted")).toBe(false);
    expect(visibleTemplates.some(t => t.id === "preset-zoom-proof-reminder")).toBe(true);
  });
});
