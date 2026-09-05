export type MessageTemplateCategory = "attendance" | "proof_excuse" | "announcement" | "general" | "custom";

export interface MessageTemplate {
  id: string;
  title: string;
  category: MessageTemplateCategory;
  template: string;
  description?: string;
  isPreset?: boolean;
  subjectId?: number | string | null;
  subjectCode?: string;
  subjectName?: string;
  tags?: string[];
  displayOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface TemplateContextVariables {
  subject?: string;
  subject_code?: string;
  subject_name?: string;
  date?: string;
  time?: string;
  link?: string;
  version?: string | number;
  present_count?: string | number;
  absent_count?: string | number;
  excused_count?: string | number;
  announcement_title?: string;
  professor?: string;
  custom_note?: string;
}

export const DEFAULT_PRESET_TEMPLATES: MessageTemplate[] = [
  {
    id: "preset-attendance-posted",
    title: "📢 Attendance Record Published",
    category: "attendance",
    isPreset: true,
    description: "Blast to notify the class that roll call has been recorded and is ready for viewing.",
    template: `📢 ATTENDANCE RECORD PUBLISHED

Hello class! Today's official attendance record has been recorded and published on the class portal.

Please check your attendance status, verified Zoom attendees, and excuse slip statuses.

👉 https://supersec.mjbalubar.tech

⚠️ Reminder: If you attended Zoom or need to file an excuse letter, please submit your proof on the portal today. Thank you!`,
  },
  {
    id: "preset-zoom-proof-reminder",
    title: "⚡ Zoom Proof Submission Reminder",
    category: "proof_excuse",
    isPreset: true,
    description: "Reminds students who attended online to upload screenshots for automated AI verification.",
    template: `⚡ ZOOM ATTENDANCE PROOF REMINDER

To all online attendees: If you attended today's Zoom session but were marked absent or pending, please upload your uncropped participant screenshot for instant AI roll-call verification:

👉 https://supersec.mjbalubar.tech

⚡ Verification is automated and instantly updates your status upon name match. Please submit before 11:59 PM today.`,
  },
  {
    id: "preset-excuse-deadline",
    title: "📝 Excuse Letter Submission Deadline",
    category: "proof_excuse",
    isPreset: true,
    description: "Urgent notice for absent students to submit valid excuse documentation before the cutoff.",
    template: `📝 EXCUSE LETTER SUBMISSION CUTOFF

To all absent students: Please submit your excuse slip along with valid proof (medical certificate, official university conflict, or emergency note) before the deadline:

👉 https://supersec.mjbalubar.tech

⚠️ Unfiled absences without valid excuse letters will be permanently marked as unexcused.`,
  },
  {
    id: "preset-announcement-blast",
    title: "📌 Important Class Announcement",
    category: "announcement",
    isPreset: true,
    description: "Alerts students of new announcements, assignments, or instructions posted by the secretary or professor.",
    template: `📌 IMPORTANT CLASS ANNOUNCEMENT

Hello everyone! A new announcement has been posted on our official class bulletin.

Please check the class portal for complete details, instructions, and downloadable materials:
👉 https://supersec.mjbalubar.tech

Please react with 👍 or acknowledge once read. Thank you!`,
  },
  {
    id: "preset-qa-materials-update",
    title: "💡 FAQs & Class Resources Updated",
    category: "general",
    isPreset: true,
    description: "Notifies classmates about verified answers to questions and uploaded study resources.",
    template: `💡 CLASS RESOURCES & FAQ UPDATE

Hello class! New study resources, references, and verified answers to common questions are now available on our class knowledgebase:

👉 https://supersec.mjbalubar.tech

Feel free to browse through the reviewers and past Q&A threads before our next meeting!`,
  },
  {
    id: "preset-attendance-revision",
    title: "⚠️ Attendance Record Revised & Updated",
    category: "attendance",
    isPreset: true,
    description: "Notifies students when attendance has been updated following excuse approvals or Zoom AI matches.",
    template: `⚠️ ATTENDANCE RECORD UPDATED

Hello class! The official attendance roster has been revised with newly verified Zoom proofs and approved excuse letters.

Please review your updated attendance status here:
👉 https://supersec.mjbalubar.tech

Thank you for your cooperation!`,
  },
];

/**
 * Replaces any legacy `{variable}` tokens in a template string with actual context values.
 * If no variables exist in the string, returns the text cleanly as-is.
 */
export function interpolateTemplate(
  template: string,
  vars: TemplateContextVariables = {}
): string {
  if (!template) return "";
  if (!template.includes("{")) return template;

  const rawVersion = vars.version !== undefined && vars.version !== "" ? String(vars.version).replace(/^v/i, "") : "1";
  const versionStr = `v${rawVersion}`;

  const defaults: Record<string, string> = {
    subject: vars.subject_code || vars.subject || "[Subject]",
    subject_code: vars.subject_code || vars.subject || "[Subject Code]",
    subject_name: vars.subject_name || "[Subject Name]",
    date: vars.date || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    time: vars.time || "11:59 PM",
    link: vars.link || "https://supersec.mjbalubar.tech",
    version: versionStr,
    version_number: rawVersion,
    present_count: vars.present_count !== undefined ? String(vars.present_count) : "—",
    absent_count: vars.absent_count !== undefined ? String(vars.absent_count) : "—",
    excused_count: vars.excused_count !== undefined ? String(vars.excused_count) : "—",
    announcement_title: vars.announcement_title || "[Announcement Title]",
    professor: vars.professor || "Professor",
    custom_note: vars.custom_note || "",
  };

  // Prevent double "vv1" if template contains "v{version}"
  let rendered = template.replace(/v\{version\}/gi, versionStr);

  return rendered.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
    if (key in defaults) {
      return defaults[key];
    }
    return match;
  });
}

export interface MessageTemplateFilters {
  searchQuery?: string;
  category?: MessageTemplateCategory | "all";
  subjectId?: number | string | "all" | "general" | null;
  tag?: string;
}

export function filterMessageTemplates(
  templates: MessageTemplate[],
  filters: MessageTemplateFilters
): MessageTemplate[] {
  const query = filters.searchQuery?.trim().toLowerCase();

  return templates
    .filter((tmpl) => {
      // Category filter
      if (filters.category && filters.category !== "all" && tmpl.category !== filters.category) {
        return false;
      }

      // Subject filter (supports both numeric and string/Appwrite IDs safely)
      if (filters.subjectId !== undefined && filters.subjectId !== "all" && filters.subjectId !== "") {
        if (filters.subjectId === "general" || filters.subjectId === null) {
          if (tmpl.subjectId !== null && tmpl.subjectId !== undefined && tmpl.subjectId !== "general") {
            return false;
          }
        } else {
          // Compare as string to be type-safe across number and string IDs
          const targetStr = String(filters.subjectId);
          const tmplStr = tmpl.subjectId !== null && tmpl.subjectId !== undefined ? String(tmpl.subjectId) : null;
          if (tmplStr && tmplStr !== targetStr && (!tmpl.subjectCode || tmpl.subjectCode !== targetStr)) {
            return false;
          }
        }
      }

      // Tag filter
      if (filters.tag && filters.tag !== "all") {
        if (!tmpl.tags || !tmpl.tags.some((t) => t.toLowerCase() === filters.tag?.toLowerCase())) {
          return false;
        }
      }

      // Search query filter
      if (query) {
        const titleMatch = tmpl.title.toLowerCase().includes(query);
        const bodyMatch = tmpl.template.toLowerCase().includes(query);
        const descMatch = tmpl.description?.toLowerCase().includes(query) ?? false;
        const tagMatch = tmpl.tags?.some((t) => t.toLowerCase().includes(query)) ?? false;
        const codeMatch = tmpl.subjectCode?.toLowerCase().includes(query) ?? false;
        if (!titleMatch && !bodyMatch && !descMatch && !tagMatch && !codeMatch) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      // Presets or displayOrder first if specified
      if (a.displayOrder !== undefined && b.displayOrder !== undefined) {
        return a.displayOrder - b.displayOrder;
      }
      if (a.displayOrder !== undefined) return -1;
      if (b.displayOrder !== undefined) return 1;
      return a.title.localeCompare(b.title);
    });
}

export function moveSnippetCategoryOrSubject(
  templates: MessageTemplate[],
  templateId: string,
  target: {
    category?: MessageTemplateCategory;
    subjectId?: number | string | null;
    subjectCode?: string;
    subjectName?: string;
  }
): MessageTemplate[] {
  const now = new Date().toISOString();
  return templates.map((tmpl) => {
    if (tmpl.id !== templateId) return tmpl;
    const isGeneral = target.subjectId === null || target.subjectId === "general" || target.subjectCode === "GENERAL";
    return {
      ...tmpl,
      category: target.category || tmpl.category,
      subjectId: target.subjectId !== undefined ? (isGeneral ? null : target.subjectId) : tmpl.subjectId,
      subjectCode: target.subjectId !== undefined ? (isGeneral ? "GENERAL" : (target.subjectCode || tmpl.subjectCode)) : tmpl.subjectCode,
      subjectName: target.subjectId !== undefined ? (isGeneral ? "General Snippets" : (target.subjectName || tmpl.subjectName)) : tmpl.subjectName,
      updatedAt: now,
    };
  });
}

export function reorderSnippets(templates: MessageTemplate[], orderedIds: string[]): MessageTemplate[] {
  const map = new Map<string, number>();
  orderedIds.forEach((id, idx) => map.set(id, idx));
  return [...templates].sort((a, b) => {
    const aOrder = map.get(a.id);
    const bOrder = map.get(b.id);
    if (aOrder !== undefined && bOrder !== undefined) return aOrder - bOrder;
    if (aOrder !== undefined) return -1;
    if (bOrder !== undefined) return 1;
    return 0;
  });
}


