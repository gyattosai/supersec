export type NoteColor = "default" | "sky" | "amber" | "emerald" | "purple" | "rose";

export interface NoteAttachment {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  byteSize: number;
  type: "image" | "file";
  uploadedAt: string;
}

export interface SecretaryNote {
  id: string;
  title: string;
  content: string; // Markdown / Rich Text
  subjectId?: number | string | null;
  subjectCode?: string;
  subjectName?: string;
  tags: string[];
  isPinned: boolean;
  color: NoteColor;
  attachments: NoteAttachment[];
  displayOrder?: number;
  createdAt: string;
  updatedAt: string;
}

export const NOTE_COLOR_STYLES: Record<
  NoteColor,
  {
    badge: string;
    cardBg: string;
    border: string;
    label: string;
    glow: string;
  }
> = {
  default: {
    badge: "bg-secondary text-foreground border-border",
    cardBg: "bg-card/90",
    border: "border-border/80 hover:border-primary/50",
    label: "Default",
    glow: "shadow-primary/5",
  },
  sky: {
    badge: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    cardBg: "bg-sky-950/20",
    border: "border-sky-500/30 hover:border-sky-500/60",
    label: "Sky Blue",
    glow: "shadow-sky-500/10",
  },
  amber: {
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    cardBg: "bg-amber-950/20",
    border: "border-amber-500/30 hover:border-amber-500/60",
    label: "Amber Gold",
    glow: "shadow-amber-500/10",
  },
  emerald: {
    badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    cardBg: "bg-emerald-950/20",
    border: "border-emerald-500/30 hover:border-emerald-500/60",
    label: "Emerald Green",
    glow: "shadow-emerald-500/10",
  },
  purple: {
    badge: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    cardBg: "bg-purple-950/20",
    border: "border-purple-500/30 hover:border-purple-500/60",
    label: "Purple Violet",
    glow: "shadow-purple-500/10",
  },
  rose: {
    badge: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    cardBg: "bg-rose-950/20",
    border: "border-rose-500/30 hover:border-rose-500/60",
    label: "Rose Red",
    glow: "shadow-rose-500/10",
  },
};

export const INITIAL_SECRETARY_NOTES: SecretaryNote[] = [
  {
    id: "note-starter-sop",
    title: "📌 Class Secretary SOP & Attendance Guidelines",
    content: `### Standard Operating Procedure for Class Secretary

1. **Zoom Attendance Verification**:
   - Remind students to upload their uncropped Zoom participant list screenshots within the class hour.
   - Use the **Instant AI Verification** tool to auto-match participant names with the enrolled masterlist.
   
2. **Excuse Letter Policy**:
   - Valid reasons: Medical illness (with med cert), university official event, or verifiable technical outage.
   - Review and approve pending slips before publishing session **v2** or **v3**.

3. **Messenger Blasts**:
   - Use the *Messenger Snippets* tool to copy cache-busting links for fast thumbnail previews in group chats.`,
    subjectCode: "GENERAL",
    subjectName: "Secretary Guidelines",
    tags: ["SOP", "Guidelines", "Important"],
    isPinned: true,
    color: "emerald",
    attachments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "note-starter-reviewer",
    title: "📚 Exam Coverage & Reviewer References",
    content: `### Midterm Exam Preparation Checklist

- **Module 1**: Total Quality Management & Six Sigma Principles
- **Module 2**: Statistical Process Control (SPC) and Control Charts (X-bar, R charts)
- **Module 3**: Process Capability Index ($C_p$ and $C_{pk}$)
- **Formula Sheet**: See attached reference guide below.

> *Note: Bring non-programmable scientific calculators during the exam day.*`,
    subjectCode: "OLCBTQM01",
    subjectName: "Operations Management",
    tags: ["Reviewer", "Midterms", "Formula"],
    isPinned: true,
    color: "sky",
    attachments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function createDefaultNote(overrides: Partial<SecretaryNote> = {}): SecretaryNote {
  const now = new Date().toISOString();
  return {
    id: overrides.id || `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: overrides.title || "Untitled Note",
    content: overrides.content || "",
    subjectId: overrides.subjectId || null,
    subjectCode: overrides.subjectCode || undefined,
    subjectName: overrides.subjectName || undefined,
    tags: overrides.tags || [],
    isPinned: overrides.isPinned ?? false,
    color: overrides.color || "default",
    attachments: overrides.attachments || [],
    createdAt: overrides.createdAt || now,
    updatedAt: now,
  };
}

export function filterNotes(
  notes: SecretaryNote[],
  options: {
    searchQuery?: string;
    subjectId?: number | string | null;
    tag?: string;
    onlyPinned?: boolean;
  }
): SecretaryNote[] {
  const query = (options.searchQuery || "").toLowerCase().trim();
  const targetSubject = options.subjectId;
  const targetTag = options.tag?.toLowerCase();

  return notes
    .filter(note => {
      // Search text match
      if (query) {
        const inTitle = note.title.toLowerCase().includes(query);
        const inContent = note.content.toLowerCase().includes(query);
        const inTags = note.tags.some(t => t.toLowerCase().includes(query));
        const inSubject = (note.subjectCode || "").toLowerCase().includes(query);
        if (!inTitle && !inContent && !inTags && !inSubject) return false;
      }

      // Subject filter
      if (targetSubject !== undefined && targetSubject !== "all") {
        if (targetSubject === "general" || targetSubject === null) {
          if (note.subjectId !== null && note.subjectId !== undefined && note.subjectCode !== "GENERAL") return false;
        } else if (
          String(note.subjectId ?? "") !== String(targetSubject) &&
          note.subjectCode !== targetSubject
        ) {
          return false;
        }
      }

      // Tag filter
      if (targetTag && targetTag !== "all") {
        if (!note.tags.some(t => t.toLowerCase() === targetTag)) return false;
      }

      // Pinned filter
      if (options.onlyPinned && !note.isPinned) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      // Pinned notes come first
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      // Then display order if set
      if (a.displayOrder !== undefined && b.displayOrder !== undefined) {
        return a.displayOrder - b.displayOrder;
      }
      // Then newest updated notes
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
}

export function moveNoteSubject(
  notes: SecretaryNote[],
  noteId: string,
  target: { id: number | string | null; code?: string; name?: string }
): SecretaryNote[] {
  const now = new Date().toISOString();
  return notes.map(note => {
    if (note.id !== noteId) return note;
    const isGeneral = target.id === null || target.id === "general" || target.code === "GENERAL";
    return {
      ...note,
      subjectId: isGeneral ? null : target.id,
      subjectCode: isGeneral ? "GENERAL" : (target.code || note.subjectCode),
      subjectName: isGeneral ? "General Notes" : (target.name || note.subjectName),
      updatedAt: now,
    };
  });
}

export function reorderNotes(notes: SecretaryNote[], orderedIds: string[]): SecretaryNote[] {
  const map = new Map<string, number>();
  orderedIds.forEach((id, idx) => map.set(id, idx));
  return [...notes].sort((a, b) => {
    const aOrder = map.get(a.id);
    const bOrder = map.get(b.id);
    if (aOrder !== undefined && bOrder !== undefined) return aOrder - bOrder;
    if (aOrder !== undefined) return -1;
    if (bOrder !== undefined) return 1;
    return 0;
  });
}

export function formatNoteForMessenger(note: SecretaryNote): string {
  const header = note.subjectCode ? `[${note.subjectCode}] ${note.title}` : note.title;
  const tagsStr = note.tags.length > 0 ? note.tags.map(t => `#${t}`).join(" ") : "";
  
  const attachmentsInfo =
    note.attachments.length > 0
      ? `\n\n📎 Attached Files (${note.attachments.length}):\n` +
        note.attachments.map(a => `• ${a.name}: ${a.url}`).join("\n")
      : "";

  return `📝 ${header}\n\n${note.content}${attachmentsInfo}${tagsStr ? `\n\n${tagsStr}` : ""}`;
}
