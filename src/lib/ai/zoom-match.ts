import type { GoogleGenAI } from '@google/genai'
import { GEMINI_MODEL } from './gemini-client'

export interface ZoomMatchInputStudent {
  id: string
  name: string
}

export interface ZoomMatchedStudent {
  studentId: string
  studentName: string
  rawName: string
  confidence: number
}

export interface ZoomAmbiguousCandidate {
  studentId: string
  studentName: string
}

export interface ZoomAmbiguousMatch {
  rawName: string
  candidates: ZoomAmbiguousCandidate[]
}

export interface ZoomMatchResult {
  matched: ZoomMatchedStudent[]
  ambiguous: ZoomAmbiguousMatch[]
  unmatched: string[]
}

// Cleans common Zoom artifacts like "(Host, me)", "(she/her)", timestamps
export function cleanZoomAttendeeString(raw: string): string {
  let cleaned = raw
    // Strip chat timestamp prefix: "10:01:23 From Name to Everyone: msg"
    .replace(/^\s*\d{1,2}:\d{2}(?::\d{2})?\s+From\s+/i, '')
    .replace(/\s+to\s+.*$/i, '')
    // Strip parenthetical suffixes
    .replace(/\s*\((?:he\/him|she\/her|they\/them|host|co-host|me|guest)[^)]*\)/gi, '')
    // Strip extra symbols
    .replace(/[:\-]/g, ' ')
    .trim()

  return cleaned
}

export function parseZoomTextRuleBased(
  rawText: string,
  roster: ZoomMatchInputStudent[],
): ZoomMatchResult {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  const extractedRawNames = new Set<string>()

  for (const line of lines) {
    const cleaned = cleanZoomAttendeeString(line)
    if (cleaned.length >= 2) {
      extractedRawNames.add(cleaned)
    }
  }

  const matched: ZoomMatchedStudent[] = []
  const ambiguous: ZoomAmbiguousMatch[] = []
  const unmatched: string[] = []
  const matchedStudentIds = new Set<string>()

  for (const rawName of Array.from(extractedRawNames)) {
    const rawLower = rawName.toLowerCase()

    // 1. Exact match against roster
    const exact = roster.find((s) => s.name.toLowerCase() === rawLower)
    if (exact) {
      if (!matchedStudentIds.has(exact.id)) {
        matched.push({
          studentId: exact.id,
          studentName: exact.name,
          rawName,
          confidence: 1.0,
        })
        matchedStudentIds.add(exact.id)
      }
      continue
    }

    // 2. Token overlap fuzzy matching
    const rawTokens = rawLower.split(/\s+/).filter((t) => t.length > 1)

    const candidates = roster.filter((s) => {
      const sTokens = s.name.toLowerCase().split(/\s+/)
      // Check if all rawTokens appear in sTokens or vice versa
      const matchedTokens = rawTokens.filter((rt) =>
        sTokens.some((st) => st.includes(rt) || rt.includes(st)),
      )
      return matchedTokens.length >= 1
    })

    if (candidates.length === 1) {
      const cand = candidates[0]
      if (!matchedStudentIds.has(cand.id)) {
        matched.push({
          studentId: cand.id,
          studentName: cand.name,
          rawName,
          confidence: 0.85,
        })
        matchedStudentIds.add(cand.id)
      }
    } else if (candidates.length > 1) {
      ambiguous.push({
        rawName,
        candidates: candidates.map((c) => ({
          studentId: c.id,
          studentName: c.name,
        })),
      })
    } else {
      unmatched.push(rawName)
    }
  }

  return { matched, ambiguous, unmatched }
}

export function buildZoomMatchPrompt(
  rawText: string,
  roster: ZoomMatchInputStudent[],
): string {
  const rosterJson = JSON.stringify(roster.map((r) => ({ id: r.id, name: r.name })))

  return `You are an automated assistant for a college class secretary.
Analyze the following raw Zoom chat or attendee log text and match participants against the class roster.

Roster:
${rosterJson}

Raw Zoom Text:
${rawText}

Return a valid JSON object with EXACTLY this structure:
{
  "matched": [
    { "studentId": "...", "studentName": "...", "rawName": "...", "confidence": 0.95 }
  ],
  "ambiguous": [
    { "rawName": "...", "candidates": [{ "studentId": "...", "studentName": "..." }] }
  ],
  "unmatched": ["string"]
}

Guidelines:
- Strip timestamps, chat message bodies (e.g. "present po"), pronouns, and "(Host/Co-host)".
- Handle common Filipino name variations and nicknames (e.g. Juan D. Cruz -> Juan Dela Cruz).
- If a name is clearly unique in the roster, place in "matched" with confidence between 0.8 and 1.0.
- If multiple candidates match a short name (e.g. "Juan"), place in "ambiguous".
- If a name does not correspond to any student in the roster, place in "unmatched".
- Return ONLY the JSON object without markdown or code fences.`
}

export async function matchZoomAttendees(
  rawText: string,
  roster: ZoomMatchInputStudent[],
  client?: GoogleGenAI | null,
): Promise<ZoomMatchResult> {
  if (!rawText.trim() || roster.length === 0) {
    return { matched: [], ambiguous: [], unmatched: [] }
  }

  if (!client) {
    return parseZoomTextRuleBased(rawText, roster)
  }

  try {
    const prompt = buildZoomMatchPrompt(rawText, roster)
    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    })

    const text = response.text?.trim() || ''
    // Strip markdown code fences if model enclosed JSON
    const cleanedJson = text.replace(/^```json\s*/, '').replace(/```$/, '').trim()
    const parsed = JSON.parse(cleanedJson)

    if (Array.isArray(parsed.matched)) {
      return {
        matched: parsed.matched || [],
        ambiguous: parsed.ambiguous || [],
        unmatched: parsed.unmatched || [],
      }
    }
  } catch {
    // Fall back cleanly to rule-based parser
  }

  return parseZoomTextRuleBased(rawText, roster)
}
