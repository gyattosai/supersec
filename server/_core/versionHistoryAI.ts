import { invokeLLM } from "./llm";

export type ContentKind = "announcement" | "resource" | "question";

export interface GenerateVersionHistoryParams {
  kind: ContentKind;
  title: string;
  body: string;
  previousTitle?: string | null;
  previousBody?: string | null;
  version?: number | null;
  action?: string | null;
  category?: string | null;
  attachmentsCount?: number | null;
}

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).trim() + "…";
}

/**
 * Intelligent deterministic fallback generator for version history details.
 * Analyzes differences between versions or summarizes the content cleanly without LLM.
 */
export function generateFallbackVersionHistorySummary(
  params: GenerateVersionHistoryParams
): string {
  const version = params.version ?? 1;
  const isInitial = version <= 1 || params.action === "published";

  if (isInitial) {
    if (params.kind === "resource") {
      const attachInfo =
        params.attachmentsCount && params.attachmentsCount > 0
          ? ` with ${params.attachmentsCount} attachment${params.attachmentsCount > 1 ? "s" : ""}`
          : "";
      const catInfo = params.category ? ` [${params.category}]` : "";
      return truncate(`Initial publication of course resource${catInfo}${attachInfo}.`, 200);
    }
    if (params.kind === "question") {
      return truncate("Initial publication of official question & answer entry.", 200);
    }
    return truncate(`Initial publication: ${params.title}`, 200);
  }

  // Update diff analysis
  const notes: string[] = [];
  if (params.previousTitle && params.previousTitle.trim() !== params.title.trim()) {
    notes.push(`Updated title to "${truncate(params.title, 40)}"`);
  }

  if (params.previousBody) {
    const prevLen = params.previousBody.length;
    const newLen = params.body.length;
    const diff = newLen - prevLen;
    if (Math.abs(diff) > 40) {
      notes.push(diff > 0 ? "Expanded content details" : "Refined and condensed content");
    } else {
      notes.push("Revised content text");
    }
  } else {
    notes.push("Updated content text");
  }

  if (params.attachmentsCount !== undefined && params.attachmentsCount !== null) {
    notes.push(
      `Resource attachments updated (${params.attachmentsCount} file${params.attachmentsCount === 1 ? "" : "s"})`
    );
  }

  const combined = notes.join("; ");
  return truncate(`v${version}: ${combined || `Updated ${params.title}`}`, 200);
}

/**
 * Generates an intelligent, human-readable version history changelog note
 * using Gemini LLM with instant deterministic fallback.
 */
export async function generateVersionHistorySummary(
  params: GenerateVersionHistoryParams
): Promise<string> {
  const fallback = generateFallbackVersionHistorySummary(params);
  const version = params.version ?? 1;

  try {
    const prompt = `You are the version history copywriter for Supersec, an academic course management portal.
Content Kind: ${params.kind}
Current Version: v${version}
Action: ${params.action || (version <= 1 ? "published" : "updated")}
Title: ${params.title}
Body: ${params.body.slice(0, 1000)}
${params.previousTitle ? `Previous Title: ${params.previousTitle}` : ""}
${params.previousBody ? `Previous Body: ${params.previousBody.slice(0, 1000)}` : ""}
${params.category ? `Category: ${params.category}` : ""}
${params.attachmentsCount ? `Attachments: ${params.attachmentsCount} files` : ""}

Write a concise, professional version change log note:
- Exactly 1 sentence (under 140 characters, maximum 200 characters).
- Focus on what specifically changed or was delivered in this version (e.g. "Updated midterm schedule with room assignment and calculator rules" or "Initial publication with lecture slides and syllabus").
- No bullet points, no markdown, no quotation marks wrapping the whole sentence.

Return JSON in this format:
{
  "summary": "..."
}`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You generate concise, professional 1-sentence version history change log notes in JSON format.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message.content;
    if (typeof content === "string") {
      const parsed = JSON.parse(content);
      if (parsed.summary && typeof parsed.summary === "string") {
        return truncate(parsed.summary.trim(), 200);
      }
    }
  } catch {
    // Graceful fallback to deterministic generator
  }

  return fallback;
}
