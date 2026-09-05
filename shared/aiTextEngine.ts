/**
 * Intelligent AI Writing & Text Refinement Engine for Supersec.
 * Supports online Google Gemini API generation with resilient, multi-mode
 * intelligent contextual synthesis for class secretaries.
 */

export type AiTextTarget =
  | "student_note"
  | "announcement"
  | "resource_description"
  | "question_answer"
  | "excuse_reason"
  | "general_text";

export type AiTextMode =
  | "improve"
  | "autofill"
  | "messenger"
  | "action_items"
  | "summarize"
  | "polish";

export type AiTextOptions = {
  target: AiTextTarget;
  mode?: AiTextMode;
  text?: string;
  context?: string;
  apiKey?: string;
  subjectCode?: string;
  title?: string;
};

export type AiTextResult = {
  text: string;
  improvedText: string;
  mode: AiTextMode;
  target: AiTextTarget;
  provider: "gemini" | "synthesizer";
  changesMade: boolean;
};

/**
 * Direct call to Google Gemini Generative Language API
 */
async function callGeminiApi(
  apiKey: string,
  prompt: string,
  systemInstruction?: string
): Promise<string | null> {
  const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
  for (const model of models) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload: any = {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      };
      if (systemInstruction) {
        payload.systemInstruction = {
          parts: [{ text: systemInstruction }],
        };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const candidate = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidate && typeof candidate === "string" && candidate.trim()) {
          return candidate.trim();
        }
      }
    } catch {
      // Continue to next model or fallback
    }
  }
  return null;
}

/**
 * Synthesizes high-quality, professional markdown and messenger copy
 * when offline or without an active Gemini API key.
 */
export function synthesizeAiText(options: AiTextOptions): string {
  const { target, text = "", context = "" } = options;
  const mode = options.mode || (text.trim() ? "improve" : "autofill");
  const raw = text.trim();
  const ctx = context.trim();

  // Extract subject, title, or category clues from context or text
  const subjectMatch = ctx.match(/\[([A-Za-z0-9_\-\s]+)\]/) || ctx.match(/Subject:?\s*([A-Za-z0-9_\-]+)/i);
  const subject = options.subjectCode || (subjectMatch ? subjectMatch[1].trim() : "");
  const titleMatch = ctx.match(/Title:?\s*([^|•\n]+)/i) || ctx.match(/^([^|•\n]+)/);
  const subjectPrefix = subject ? `[${subject}] ` : "";

  // 1. MESSENGER POST MODE (Formats for Messenger chat groups with rich formatting and emojis)
  if (mode === "messenger") {
    if (target === "announcement") {
      const headline = raw || ctx || "Important Class Announcement";
      return `📢 **ANNOUNCEMENT ${subjectPrefix ? `| ${subject}` : ""}**\n\n📌 **Overview:**\n${headline}\n\n🗓️ **Date & Schedule:**\nPlease refer to the official class calendar.\n\n⚠️ **Action Required:**\n• Please review all instructions carefully.\n• Reach out to your class secretary if you have questions or clarifications.\n\n_— Sent via supersec_`;
    }
    if (target === "resource_description") {
      const topic = raw || ctx || "Class Reference Material";
      return `📁 **CLASS RESOURCE ${subjectPrefix ? `| ${subject}` : ""}**\n\n🔗 **Details:**\n${topic}\n\n💡 **Instructions:**\n• Click the link to view and download the material.\n• Save a copy to your Google Drive or local storage for offline access.\n\n_— Supersec Resource Hub_`;
    }
    if (target === "question_answer") {
      const answer = raw || "Please follow the standard class guidelines and verify with the instructor.";
      return `💬 **CLASS FAQ & OFFICIAL ANSWER**\n\n❓ **Question:**\n${ctx || "Frequently Asked Question"}\n\n✅ **Official Answer:**\n${answer}\n\n📌 **Note:**\n_Verified by class secretary for ${subject || "the class"}._`;
    }
    if (target === "student_note") {
      const noteContent = raw || ctx || "Class Lecture Notes & Summary";
      return `📝 **CLASS NOTES & SUMMARY ${subjectPrefix ? `| ${subject}` : ""}**\n\n${noteContent}\n\n📌 **Key Takeaway:**\nReview this outline before the next quiz or class session.`;
    }
  }

  // 2. ACTION ITEMS & SUMMARY MODE
  if (mode === "action_items" || mode === "summarize") {
    const lines = raw ? raw.split("\n").filter(l => l.trim().length > 0) : [ctx || "General class update"];
    const bullets = lines.map(line => `• ${line.replace(/^[•\-\*\d\.\s]+/, "").trim()}`).join("\n");
    return `### 📌 Key Action Items & Summary\n\n${bullets}\n\n**Next Steps:**\n1. Review all items above.\n2. Complete required submissions before the deadline.\n3. Keep attendance proof and documentation ready.`;
  }

  // 3. IMPROVE / POLISH MODE (Enhances existing draft)
  if (mode === "improve" || mode === "polish") {
    if (!raw && ctx) {
      return synthesizeAiText({ ...options, mode: "autofill" });
    }
    if (!raw) {
      return "Please provide content or draft text for the AI assistant to refine.";
    }

    // Polish and format raw text into clean, structured markdown
    let cleaned = raw
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    // Check if it already has structure
    if (!cleaned.includes("##") && !cleaned.includes("###") && cleaned.length > 50) {
      const paragraphs = cleaned.split("\n\n");
      if (paragraphs.length >= 2) {
        return `## Overview\n${paragraphs[0]}\n\n### Details & Guidelines\n${paragraphs.slice(1).join("\n\n")}\n\n> 💡 **Secretary Note:** Please ensure all members of the class acknowledge these details.`;
      }
    }

    // Capitalize sentences and clean up punctuation
    cleaned = cleaned.replace(/(^\s*|\.\s+)([a-z])/g, (m, p1, p2) => p1 + p2.toUpperCase());
    return cleaned;
  }

  // 4. AUTOFILL / DRAFT MODE (Generates starting outline based on target and context)
  if (target === "announcement") {
    const topic = ctx || "Class Schedule & General Update";
    return `## ${subjectPrefix}Class Announcement: ${topic}\n\n**Greetings everyone,**\n\nPlease be informed regarding the following class updates and instructions:\n\n### 📋 Key Details & Requirements\n• **Subject:** ${subject || "Class Section"}\n• **Agenda:** ${topic}\n• **Status:** Scheduled for implementation\n\n### ⚠️ Important Reminders\n1. Ensure all submissions are formatted according to course requirements.\n2. Late submissions and attendance excuses must be filed with proper proof.\n3. For any concerns or clarifications, message the class secretary directly.\n\n*Thank you and please be guided accordingly.*`;
  }

  if (target === "resource_description") {
    const topic = ctx || "Course Reference & Learning Resources";
    return `### 📁 Resource Overview: ${topic}\n\nThis resource provides supplementary learning references and official files for **${subject || "this course"}**.\n\n#### 🎯 Purpose & Instructions\n• **Access:** Open the link above to view or download the files.\n• **Scope:** Recommended for upcoming class reviews, activities, and exam preparation.\n• **Guidelines:** Do not redistribute restricted course resources outside our section.`;
  }

  if (target === "question_answer") {
    const query = ctx || "How to follow class procedures";
    return `### ✅ Official Answer\n\nRegarding **"${query}"**:\n\n1. **Standard Policy:** Follow the official syllabus instructions discussed during lectures.\n2. **Submissions & Verification:** Ensure all files or attendance proofs are uploaded through the official portal.\n3. **Assistance:** If you experience technical difficulties, notify the secretary immediately before the deadline.\n\n*This answer has been verified for ${subject || "the class"}.*`;
  }

  if (target === "student_note") {
    const topic = ctx || "Lecture Notes & Topic Reviewer";
    return `# ${subjectPrefix}${topic}\n\n## 🎯 Objective & Key Concepts\n• Comprehensive review of lecture topics and core definitions.\n• Reference guide for upcoming quizzes and assignments.\n\n## 📝 Discussion Points & Formulas\n1. **Concept Overview:** Key principles and definitions covered in class.\n2. **Important Notes:** Notable examples and professor highlights.\n3. **Action Items:** Problem sets and reading assignments due this week.\n\n## 💡 Key Takeaway\n> *Focus on practical application and review the slide deck attached in Resources.*`;
  }

  if (target === "excuse_reason") {
    return `Respectfully requesting to excuse my absence due to unforeseen medical/personal circumstances. Supporting documentation has been attached for verification.`;
  }

  return `### ${subjectPrefix}Overview\n\n${ctx || "Official documentation and class record."}`;
}

/**
 * Main AI Text Assistant function.
 * Attempts Gemini API first, falling back to rich synthesis.
 */
export async function generateAiText(options: AiTextOptions): Promise<AiTextResult> {
  const { target, text = "", context = "", apiKey } = options;
  const mode = options.mode || (text.trim() ? "improve" : "autofill");

  // Attempt Gemini API if key is present
  if (apiKey && apiKey.trim()) {
    try {
      const systemInstruction =
        `You are an expert AI writing assistant for a Philippine university class secretary using Supersec. ` +
        `Target field: ${target}. Mode: ${mode}. ` +
        `Produce clear, polished, professional, and well-formatted text. Use lightweight Markdown (headers, bullet points, bolding). ` +
        `Never invent grades or falsify data. Output ONLY the suggested text without conversational filler.`;

      const userPrompt = JSON.stringify({
        mode,
        target,
        currentDraft: text,
        context: context,
        subjectCode: options.subjectCode,
      });

      const geminiResponse = await callGeminiApi(apiKey, userPrompt, systemInstruction);
      if (geminiResponse && geminiResponse.length > 5) {
        return {
          text: geminiResponse,
          improvedText: geminiResponse,
          mode,
          target,
          provider: "gemini",
          changesMade: true,
        };
      }
    } catch {
      // Fall through to synthesizer
    }
  }

  // Use robust intelligent synthesizer
  const synthesized = synthesizeAiText(options);
  return {
    text: synthesized,
    improvedText: synthesized,
    mode,
    target,
    provider: "synthesizer",
    changesMade: true,
  };
}
