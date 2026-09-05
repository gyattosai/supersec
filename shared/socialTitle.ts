export interface FormatSocialTitleParams {
  type: "Subject" | "Attendance" | "Announcement" | "Resource" | "Question" | "Report" | "Proof" | "Excuse" | string;
  numberOrDate?: string | number;
  version?: string | number;
  subjectCode?: string;
  subjectName?: string;
  contentTitle?: string;
  fallbackTitle?: string;
  isNoClass?: boolean;
  noClassReason?: string | null;
}

export interface FormatSocialDescriptionParams {
  type: "Subject" | "Attendance" | "Announcement" | "Resource" | "Question" | "Report" | "Proof" | "Excuse" | "Home" | "qa_hub" | string;
  subjectCode?: string;
  subjectName?: string;
  professorName?: string;
  date?: string | Date | number | null;
  totals?: {
    total?: number;
    present?: number;
    absent?: number;
    excused?: number;
    conflict?: number;
    notSet?: number;
  };
  contentTitle?: string;
  contentBody?: string;
  category?: string;
  version?: string | number;
  fallbackDescription?: string;
  isNoClass?: boolean;
  noClassReason?: string | null;
}

export function formatShorthandDate(dateInput?: string | Date | number | null): string {
  if (!dateInput) return "";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export function formatFullDate(dateInput?: string | Date | number | null): string {
  if (!dateInput) return "";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

/**
 * Strips markdown, HTML, raw URLs, and excess whitespace from body text
 * to produce clean, legible, human-friendly snippets for social meta tags.
 */
export function sanitizeSocialSnippet(text?: string | null, maxLength = 160): string {
  if (!text || typeof text !== "string") return "";
  const clean = text
    // Strip markdown links [label](url) -> label
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Strip markdown images ![alt](url) -> alt
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    // Strip headers #, ##, ###
    .replace(/^#+\s+/gm, "")
    // Strip bold/italic formatting
    .replace(/[*_]{1,3}(.*?)[*_]{1,3}/g, "$1")
    // Strip blockquotes
    .replace(/^>\s*/gm, "")
    // Strip inline code `code` -> code
    .replace(/`([^`]+)`/g, "$1")
    // Strip HTML tags
    .replace(/<\/?[^>]+(>|$)/g, "")
    // Strip bare URLs if long
    .replace(/https?:\/\/[^\s]+/g, "")
    // Normalize newlines and excess whitespace
    .replace(/\s+/g, " ")
    .trim();

  if (clean.length <= maxLength) return clean;
  // Trim cleanly at a word boundary
  const truncated = clean.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace > maxLength * 0.7) {
    return `${truncated.slice(0, lastSpace)}…`;
  }
  return `${truncated.trimEnd()}…`;
}

export function formatSocialTitle({
  type,
  numberOrDate,
  version,
  subjectCode,
  subjectName,
  contentTitle,
  fallbackTitle,
  isNoClass,
  noClassReason,
}: FormatSocialTitleParams): string {
  let normalizedType = (type || "Subject").trim();
  const lower = normalizedType.toLowerCase();
  if (lower === "q&a" || lower === "question" || lower === "q") {
    normalizedType = "Q&A";
  } else if (lower === "announcement" || lower === "a") {
    normalizedType = "Announcement";
  } else if (lower === "resource" || lower === "r") {
    normalizedType = "Resource";
  } else if (lower === "attendance") {
    normalizedType = "Attendance";
  } else if (lower === "report" || lower === "reports") {
    normalizedType = "Report";
  } else if (lower === "subject" || lower === "s") {
    normalizedType = "Subject";
  } else if (lower === "proof") {
    normalizedType = "Proof";
  } else if (lower === "excuse") {
    normalizedType = "Excuse";
  } else {
    normalizedType = normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1);
  }

  const cleanSubjectCode = subjectCode?.trim();
  const codePrefix = cleanSubjectCode ? `[${cleanSubjectCode}] ` : "";
  const cleanContentTitle = contentTitle
    ? contentTitle
        .replace(/^\[[^\]]+\]\s*/, "")
        .replace(/^(Official|Unofficial)\s*answer\s*—\s*/i, "")
        .trim()
    : "";

  if (isNoClass) {
    const reason = noClassReason?.trim() || cleanContentTitle;
    const dateStr = numberOrDate !== undefined && numberOrDate !== "" ? String(numberOrDate).trim() : "";
    if (reason && dateStr) {
      return `${codePrefix}No Class: ${reason} · ${dateStr}`;
    }
    if (reason) {
      return `${codePrefix}No Class: ${reason}`;
    }
    if (dateStr) {
      return `${codePrefix}No Class Notice · ${dateStr}`;
    }
    return `${codePrefix}No Class Notice`;
  }

  // When a descriptive contentTitle is provided, format a rich, human-readable title
  if (cleanContentTitle) {
    if (normalizedType === "Announcement") {
      return `${codePrefix}Announcement: ${cleanContentTitle}`;
    }
    if (normalizedType === "Resource") {
      return `${codePrefix}Resource: ${cleanContentTitle}`;
    }
    if (normalizedType === "Q&A") {
      if (cleanContentTitle.toLowerCase() === "knowledgebase") {
        return `${codePrefix}Q&A Knowledgebase · Verified Class FAQs`;
      }
      return `${codePrefix}Q&A: ${cleanContentTitle}`;
    }
    if (normalizedType === "Subject") {
      return `${codePrefix}${cleanContentTitle} · Student Portal`;
    }
    if (normalizedType === "Report") {
      return `${codePrefix}Report: ${cleanContentTitle}`;
    }
  }

  // Specialized action routes when contentTitle is not passed
  if (normalizedType === "Proof") {
    return `${codePrefix}Submit Zoom Attendance Proof · Instant AI Verification`;
  }
  if (normalizedType === "Excuse") {
    return `${codePrefix}Submit Absence Excuse Letter · Secretary Desk`;
  }

  // Shorthand format (default and backward compatible):
  // Format: [Code] Type Descriptor - Version
  const versionNum = version !== undefined && version !== "" ? String(version).replace(/^v/i, "") : "1";
  const versionStr = `v${versionNum}`;

  let descriptor = "";
  if (numberOrDate !== undefined && numberOrDate !== "") {
    descriptor = String(numberOrDate).trim();
  } else if (cleanSubjectCode && normalizedType === "Subject") {
    descriptor = cleanSubjectCode;
  }

  const descriptorPart = descriptor ? ` ${descriptor}` : "";
  const shorthandCodePrefix = cleanSubjectCode && normalizedType !== "Subject" ? `[${cleanSubjectCode}] ` : "";

  return `${shorthandCodePrefix}${normalizedType}${descriptorPart} - ${versionStr}`;
}

export function formatSocialDescription({
  type,
  subjectCode,
  subjectName,
  professorName,
  date,
  totals,
  contentTitle,
  contentBody,
  category,
  fallbackDescription,
  isNoClass,
  noClassReason,
}: FormatSocialDescriptionParams): string {
  const normType = (type || "").toLowerCase().trim();
  const code = subjectCode?.trim() || "";
  const name = subjectName?.trim() || "";
  const prof = professorName?.trim() || "";
  const codeLabel = code || "Class";
  const subjectLabel = code && name ? `${code} (${name})` : code || name || "Class";
  const cleanSnippet = sanitizeSocialSnippet(contentBody, 130);
  const formattedDate = date ? (formatFullDate(date) || formatShorthandDate(date)) : "";

  if (isNoClass) {
    const datePart = formattedDate ? ` on ${formattedDate}` : "";
    const reason = noClassReason?.trim() || cleanSnippet;
    const reasonPart = reason ? `: ${reason}` : "";
    return `Official No Class notice for ${subjectLabel}${datePart}${reasonPart}. Regular roll call is suspended.`;
  }

  if (normType === "subject" || normType === "s") {
    const profPart = prof ? ` with Professor ${prof}` : "";
    return `Official student portal for ${subjectLabel}${profPart}. Real-time roll call, announcements, resources, and verified Q&A.`;
  }

  if (normType === "attendance") {
    const datePart = formattedDate ? ` · ${formattedDate}` : "";
    if (totals) {
      const parts = [
        `Present: ${totals.present ?? 0}`,
        `Absent: ${totals.absent ?? 0}`,
        `Excused: ${totals.excused ?? 0}`,
      ];
      if (totals.conflict) {
        parts.push(`Conflict: ${totals.conflict}`);
      }
      return `Class Attendance for ${subjectLabel}${datePart}. ${parts.join(", ")}. Verified secretary roll call records.`;
    }
    return `Official verified attendance roll call for ${subjectLabel}${datePart}. Verified class session records.`;
  }

  if (normType === "announcement" || normType === "a") {
    if (cleanSnippet) {
      return `Official announcement for ${codeLabel}: "${cleanSnippet}"`;
    }
    return `Official class announcement and urgent notice for ${subjectLabel}. Verified secretary bulletin.`;
  }

  if (normType === "resource" || normType === "r") {
    if (cleanSnippet) {
      return `Resource for ${codeLabel}: "${cleanSnippet}"`;
    }
    const catPart = category ? `${category} · ` : "";
    return `Official resources for ${subjectLabel}. ${catPart}Access verified downloads, links, and study files.`;
  }

  if (normType === "question" || normType === "q&a" || normType === "q") {
    if (contentTitle?.toLowerCase() === "knowledgebase" || contentBody?.toLowerCase() === "knowledgebase") {
      return `Search verified class questions, instructor clarifications, and FAQs for ${subjectLabel}.`;
    }
    if (cleanSnippet) {
      return `Verified answer for ${codeLabel}: "${cleanSnippet}"`;
    }
    return `Verified class question and instructor answer for ${subjectLabel}.`;
  }

  if (normType === "qa_hub") {
    return `Search verified class questions, instructor clarifications, and FAQs for ${subjectLabel}.`;
  }

  if (normType === "proof") {
    return `Submit your Zoom meeting participant screenshot for ${subjectLabel} attendance verification. Instant automated AI verification.`;
  }

  if (normType === "excuse") {
    return `Submit official absence excuse letter and supporting medical or event documents for ${subjectLabel}. Secretary review and verified status.`;
  }

  if (normType === "report" || normType === "reports") {
    const datePart = formattedDate ? ` · ${formattedDate}` : "";
    return `Official certified attendance and performance report for ${subjectLabel}${datePart}. Executive summary and audit sign-offs.`;
  }

  if (normType === "home") {
    return `Modern class secretary management system with live roll call, AI Zoom proof intake, official announcements, resources, and view-only student portals.`;
  }

  if (fallbackDescription) {
    return fallbackDescription;
  }

  return `Official class updates, attendance roll call, and resources for ${subjectLabel}.`;
}
