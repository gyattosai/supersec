import type { GoogleGenAI } from '@google/genai'
import { GEMINI_MODEL } from './gemini-client'

export interface CleanedStudentRecord {
  rawLine: string
  lastName: string
  firstName: string
  middleName?: string
  studentNumber?: string
  isDuplicate?: boolean
  duplicateReason?: string
}

export interface RosterCleanResult {
  students: CleanedStudentRecord[]
  duplicateCount: number
  totalProcessed: number
}

// Particles that are capitalized in specific ways in Philippine names
const PARTICLES = new Set(['de', 'del', 'dela', 'de la', 'de los', 'san', 'santa', 'von', 'van'])

export function toTitleCase(str: string): string {
  if (!str) return ''
  const words = str.toLowerCase().split(/\s+/)

  return words
    .map((word, i) => {
      // Honorific suffix like "jr." or "sr." or roman numerals "iii", "iv"
      if (word === 'jr.' || word === 'sr.' || word === 'jr' || word === 'sr') {
        return word.charAt(0).toUpperCase() + word.slice(1)
      }
      if (/^(?:ii|iii|iv|v|vi)$/i.test(word)) {
        return word.toUpperCase()
      }
      if (i > 0 && PARTICLES.has(word)) {
        // Keep particles in standard casing (e.g. Dela, Del, De)
        return word.charAt(0).toUpperCase() + word.slice(1)
      }
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}

export function cleanRosterRuleBased(rawText: string): RosterCleanResult {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  const students: CleanedStudentRecord[] = []
  const seenNames = new Map<string, number>()
  let duplicateCount = 0

  for (const rawLine of lines) {
    let text = rawLine
      // 1. Strip leading numbering like "1.", "1)", "#1"
      .replace(/^\s*(?:#?\d+[\.\)\-]?|\*|\-)\s*/, '')
      // 2. Strip section prefixes like "BSCS-2A", "Section 1", "BSCS 2-A"
      .replace(/^(?:[A-Z]{2,6}[-\s]?[0-9][A-Z0-9]?|Section\s+[A-Z0-9]+)\s+/i, '')
      // 3. Strip honorifics
      .replace(/\b(?:Mr\.|Ms\.|Mrs\.|Mx\.|Prof\.|Dr\.)\s*/gi, '')
      .trim()

    // 4. Extract student number if present like (2023-10294) or - 2023-10294
    let studentNumber: string | undefined
    const snMatch = text.match(/(?:[\(\[\-]\s*)?(\b\d{4}[-\s]?\d{4,6}\b)(?:\s*[\)\]])?/)
    if (snMatch) {
      studentNumber = snMatch[1].replace(/\s+/g, '-')
      text = text.replace(snMatch[0], '').trim()
    }

    // 5. Strip trailing parentheticals (e.g. course tags like (BSIT))
    text = text.replace(/\s*\([^\)]*\)\s*$/g, '').trim()

    // 6. Parse Name format
    let lastName = ''
    let firstName = ''
    let middleName: string | undefined

    if (text.includes(',')) {
      // Format: "LASTNAME, FIRSTNAME M."
      const parts = text.split(',').map((p) => p.trim())
      lastName = toTitleCase(parts[0])
      const rest = parts.slice(1).join(' ').trim()

      const restParts = rest.split(/\s+/)
      if (restParts.length > 1 && restParts[restParts.length - 1].length <= 2) {
        middleName = restParts.pop()!.toUpperCase()
        firstName = toTitleCase(restParts.join(' '))
      } else {
        firstName = toTitleCase(rest)
      }
    } else {
      // Format: "FIRSTNAME LASTNAME"
      const parts = text.split(/\s+/)
      if (parts.length === 1) {
        lastName = toTitleCase(parts[0])
      } else {
        // Check for compound last names like "Dela Cruz"
        if (parts.length >= 3 && parts[parts.length - 2].toLowerCase() === 'dela') {
          lastName = toTitleCase(parts.slice(-2).join(' '))
          firstName = toTitleCase(parts.slice(0, -2).join(' '))
        } else {
          lastName = toTitleCase(parts.pop()!)
          firstName = toTitleCase(parts.join(' '))
        }
      }
    }

    // 7. Duplicate checking
    const fullNormalized = `${lastName.toLowerCase()}, ${firstName.toLowerCase()}`
    let isDuplicate = false
    let duplicateReason: string | undefined

    if (seenNames.has(fullNormalized)) {
      isDuplicate = true
      duplicateCount++
      duplicateReason = `Duplicate of record #${seenNames.get(fullNormalized)! + 1}`
    } else {
      seenNames.set(fullNormalized, students.length)
    }

    students.push({
      rawLine,
      lastName,
      firstName,
      middleName,
      studentNumber,
      isDuplicate,
      duplicateReason,
    })
  }

  return {
    students,
    duplicateCount,
    totalProcessed: students.length,
  }
}

export function buildRosterCleanPrompt(rawText: string): string {
  return `You are an automated assistant for a college class secretary.
Normalize and standardize the following raw, pasted student roster into clean JSON records.

Raw pasted roster:
${rawText}

Return a valid JSON object with EXACTLY this structure:
{
  "students": [
    {
      "rawLine": "...",
      "lastName": "Dela Cruz",
      "firstName": "Juan Miguel",
      "studentNumber": "2023-0001",
      "isDuplicate": false
    }
  ],
  "duplicateCount": 0,
  "totalProcessed": 1
}

Guidelines:
- Strip list numbering, section prefixes (e.g. BSCS-2A), honorifics (Mr./Ms.), and nickname quotes.
- Convert names to proper Title Case, properly capitalizing Filipino compound surnames (e.g. Dela Cruz, Del Rosario, San Jose) and suffixes (Jr., III).
- Separate lastName and firstName cleanly.
- Extract student identification numbers if present.
- Detect duplicates by comparing full names and flag subsequent occurrences with "isDuplicate": true.
- Output ONLY the JSON object without markdown or code fences.`
}

export async function cleanRosterWithAi(
  rawText: string,
  client?: GoogleGenAI | null,
): Promise<RosterCleanResult> {
  if (!rawText.trim()) {
    return { students: [], duplicateCount: 0, totalProcessed: 0 }
  }

  if (!client) {
    return cleanRosterRuleBased(rawText)
  }

  try {
    const prompt = buildRosterCleanPrompt(rawText)
    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    })

    const text = response.text?.trim() || ''
    const cleanedJson = text.replace(/^```json\s*/, '').replace(/```$/, '').trim()
    const parsed = JSON.parse(cleanedJson)

    if (Array.isArray(parsed.students)) {
      return {
        students: parsed.students || [],
        duplicateCount: parsed.duplicateCount || 0,
        totalProcessed: parsed.students.length,
      }
    }
  } catch {
    // Fall back to rule-based parser on any network or parsing error
  }

  return cleanRosterRuleBased(rawText)
}
