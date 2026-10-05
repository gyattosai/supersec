import type { GoogleGenAI } from '@google/genai'
import { GEMINI_MODEL } from './gemini-client'

export type AttendanceMark = 'P' | 'A' | 'E' | null

export interface AttendanceDelta {
  studentName: string
  oldAttendance?: AttendanceMark
  newAttendance?: AttendanceMark
  recitationsDelta?: number
}

export function computeSessionDeltas(
  previousEntries: any[],
  currentEntries: any[],
  studentNamesMap: Map<string, string>,
): AttendanceDelta[] {
  const deltas: AttendanceDelta[] = []

  const prevMap = new Map<string, { attendance: AttendanceMark; recitations: number }>()
  for (const entry of previousEntries) {
    const sId = typeof entry.student === 'object' && entry.student !== null ? entry.student.id : entry.student
    prevMap.set(sId, {
      attendance: entry.attendance ?? null,
      recitations: entry.recitations || 0,
    })
  }

  for (const curr of currentEntries) {
    const sId = typeof curr.student === 'object' && curr.student !== null ? curr.student.id : curr.student
    const studentName = studentNamesMap.get(sId) || 'Unknown Student'

    const prev = prevMap.get(sId) || { attendance: null, recitations: 0 }
    const currAtt: AttendanceMark = curr.attendance ?? null
    const currRec: number = curr.recitations || 0

    const attChanged = prev.attendance !== currAtt
    const recDelta = currRec - prev.recitations

    if (attChanged || recDelta !== 0) {
      const delta: AttendanceDelta = {
        studentName,
      }
      if (attChanged) {
        delta.oldAttendance = prev.attendance
        delta.newAttendance = currAtt
      }
      if (recDelta !== 0) {
        delta.recitationsDelta = recDelta
      }
      deltas.push(delta)
    }
  }

  return deltas
}

const ATTENDANCE_LABELS: Record<string, string> = {
  P: 'Present',
  A: 'Absent',
  E: 'Excused',
}

export function formatRuleBasedChangeNote(deltas: AttendanceDelta[]): string {
  if (deltas.length === 0) {
    return 'Re-published session with no attendance changes.'
  }

  const parts = deltas.map((d) => {
    const items: string[] = []
    if (d.oldAttendance !== undefined || d.newAttendance !== undefined) {
      items.push(`${d.oldAttendance ?? '–'} -> ${d.newAttendance ?? '–'}`)
    }
    if (d.recitationsDelta) {
      const sign = d.recitationsDelta > 0 ? `+${d.recitationsDelta}` : `${d.recitationsDelta}`
      items.push(`${sign} recitations`)
    }
    return `${d.studentName} (${items.join(', ')})`
  })

  return `Updated attendance: ${parts.join('; ')}.`
}

export function buildChangeNotePrompt(deltas: AttendanceDelta[]): string {
  const lines = deltas.map((d) => {
    const changes: string[] = []
    if (d.oldAttendance !== undefined || d.newAttendance !== undefined) {
      const fromLabel = d.oldAttendance ? ATTENDANCE_LABELS[d.oldAttendance] || d.oldAttendance : 'Unset'
      const toLabel = d.newAttendance ? ATTENDANCE_LABELS[d.newAttendance] || d.newAttendance : 'Unset'
      changes.push(`attendance changed from ${fromLabel} to ${toLabel}`)
    }
    if (d.recitationsDelta) {
      const action = d.recitationsDelta > 0 ? `added ${d.recitationsDelta}` : `deducted ${Math.abs(d.recitationsDelta)}`
      changes.push(`${action} recitation(s)`)
    }
    return `- ${d.studentName}: ${changes.join(', ')}`
  })

  return `You are an automated assistant for a college class secretary.
Summarize the following class roll call changes in 1 concise, factual sentence suitable for an attendance change log.
Do not add assumptions, explanations, or conversational filler. Output only the single summary sentence.

Roll call modifications:
${lines.join('\n')}`
}

export async function generateChangeNote(
  deltas: AttendanceDelta[],
  client?: GoogleGenAI | null,
): Promise<string> {
  if (deltas.length === 0) {
    return 'Re-published session with no attendance changes.'
  }

  if (!client) {
    return formatRuleBasedChangeNote(deltas)
  }

  try {
    const prompt = buildChangeNotePrompt(deltas)
    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    })

    const note = response.text?.trim()
    if (note && note.length > 0) {
      return note
    }
  } catch {
    // Graceful fallback on API error or quota limit
  }

  return formatRuleBasedChangeNote(deltas)
}
