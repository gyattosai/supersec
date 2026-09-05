import { invokeLLM } from "./llm";

export type PushNotificationType =
  | "announcement"
  | "resource"
  | "attendance"
  | "qa"
  | "no_class";

export interface GeneratePushParams {
  type: PushNotificationType;
  title: string;
  detail?: string | null;
  subjectName: string;
  subjectCode: string;
  actionUrl: string;
  extraContext?: string | null;
}

export interface GeneratedPushPayload {
  title: string;
  body: string;
  actionUrl: string;
  emoji: string;
}

const TYPE_EMOJIS: Record<PushNotificationType, string> = {
  announcement: "📢",
  no_class: "⚠️",
  attendance: "📋",
  resource: "📚",
  qa: "💡",
};

/**
 * Truncate text cleanly with ellipsis if needed.
 */
function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).trim() + "…";
}

/**
 * Resilient deterministic fallback generator that produces high-quality,
 * formatted push notification titles and summaries without LLM calls.
 */
export function generateFallbackPushPayload(params: GeneratePushParams): GeneratedPushPayload {
  const emoji = TYPE_EMOJIS[params.type] || "🔔";
  const code = params.subjectCode.toUpperCase();

  switch (params.type) {
    case "announcement": {
      const title = truncate(`${emoji} ${code}: ${params.title}`, 48);
      const body = truncate(
        params.detail || "A new official class announcement was published. Tap to view.",
        115
      );
      return { title, body, actionUrl: params.actionUrl, emoji };
    }
    case "no_class": {
      const reason = params.detail ? ` ${params.detail}` : "";
      const title = truncate(`${emoji} ${code}: No Classes Scheduled`, 48);
      const body = truncate(
        `Class is suspended${reason ? `: ${reason}` : ""}. Check schedule for details.`,
        115
      );
      return { title, body, actionUrl: params.actionUrl, emoji };
    }
    case "attendance": {
      const title = truncate(`${emoji} ${code}: Attendance Finalized`, 48);
      const body = truncate(
        `Attendance records for ${params.title} are now verified and published.`,
        115
      );
      return { title, body, actionUrl: params.actionUrl, emoji };
    }
    case "resource": {
      const title = truncate(`${emoji} ${code}: ${params.title}`, 48);
      const body = truncate(
        params.detail || `New lecture resource uploaded for ${params.subjectName}.`,
        115
      );
      return { title, body, actionUrl: params.actionUrl, emoji };
    }
    case "qa": {
      const title = truncate(`${emoji} ${code}: Q&A Updated`, 48);
      const body = truncate(
        params.title ? `Q: ${params.title}` : "A new answer was posted in the class forum.",
        115
      );
      return { title, body, actionUrl: params.actionUrl, emoji };
    }
  }
}

/**
 * Generates an engaging, concise push notification payload using Gemini LLM,
 * with instantaneous deterministic fallback.
 */
export async function generateAiPushNotification(
  params: GeneratePushParams
): Promise<GeneratedPushPayload> {
  const fallback = generateFallbackPushPayload(params);
  const emoji = TYPE_EMOJIS[params.type] || "🔔";

  try {
    const prompt = `You are the push notification copywriter for Supersec, a student class management portal.
Content Type: ${params.type}
Subject: ${params.subjectCode} - ${params.subjectName}
Item Title: ${params.title}
Item Details: ${params.detail || "None"}
Extra Context: ${params.extraContext || "None"}

Write a push notification for students:
1. "title": Must start with the emoji "${emoji} ${params.subjectCode}: " and be UNDER 48 characters total.
2. "body": Clear, compelling 1-sentence summary under 115 characters explaining what's new.
3. Keep it student-friendly, actionable, and informative. No markdown formatting.

Return JSON in this format:
{
  "title": "${emoji} ${params.subjectCode}: ...",
  "body": "..."
}`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You generate concise, strictly bounded JSON push notifications.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message.content;
    if (typeof content === "string") {
      const parsed = JSON.parse(content);
      if (parsed.title && parsed.body) {
        return {
          title: truncate(parsed.title, 48),
          body: truncate(parsed.body, 115),
          actionUrl: params.actionUrl,
          emoji,
        };
      }
    }
  } catch (err) {
    // Graceful fallback to deterministic generator
  }

  return fallback;
}
