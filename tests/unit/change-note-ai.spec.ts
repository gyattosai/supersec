import { describe, it, expect, vi } from 'vitest'
import {
  computeSessionDeltas,
  buildChangeNotePrompt,
  formatRuleBasedChangeNote,
  generateChangeNote,
  type AttendanceDelta,
} from '@/lib/ai/change-note'

describe('Change Note AI & Delta Calculations', () => {
  const rosterMap = new Map([
    ['stu-1', 'Juan Dela Cruz'],
    ['stu-2', 'Maria Santos'],
    ['stu-3', 'Pedro Penduko'],
  ])

  it('accurately computes attendance and recitation deltas between session versions', () => {
    const prev = [
      { student: 'stu-1', attendance: 'A' as const, recitations: 0 },
      { student: 'stu-2', attendance: 'P' as const, recitations: 1 },
      { student: 'stu-3', attendance: 'P' as const, recitations: 0 },
    ]

    const curr = [
      { student: 'stu-1', attendance: 'E' as const, recitations: 0 }, // Changed A -> E
      { student: 'stu-2', attendance: 'P' as const, recitations: 3 }, // Recitations +2
      { student: 'stu-3', attendance: 'P' as const, recitations: 0 }, // Unchanged
    ]

    const deltas = computeSessionDeltas(prev, curr, rosterMap)

    expect(deltas).toHaveLength(2)

    const juanDelta = deltas.find((d) => d.studentName === 'Juan Dela Cruz')
    expect(juanDelta).toBeDefined()
    expect(juanDelta?.oldAttendance).toBe('A')
    expect(juanDelta?.newAttendance).toBe('E')

    const mariaDelta = deltas.find((d) => d.studentName === 'Maria Santos')
    expect(mariaDelta).toBeDefined()
    expect(mariaDelta?.recitationsDelta).toBe(2)
  })

  it('guarantees zero leakage: strips 🔒 private notes and medical excuses from deltas', () => {
    const prev = [
      {
        student: 'stu-1',
        attendance: 'A' as const,
        recitations: 0,
        internalNote: 'Top secret personal note',
        excuseReason: 'Flu diagnosis',
      },
    ]

    const curr = [
      {
        student: 'stu-1',
        attendance: 'E' as const,
        recitations: 0,
        internalNote: 'Top secret personal note',
        excuseReason: 'Flu diagnosis with medical certificate',
      },
    ]

    const deltas = computeSessionDeltas(prev, curr, rosterMap)
    expect(deltas).toHaveLength(1)
    const d = deltas[0] as any
    expect(d.internalNote).toBeUndefined()
    expect(d.excuseReason).toBeUndefined()
    expect(d.proofUrl).toBeUndefined()
  })

  it('produces a factual fallback change note when offline or without Gemini key', () => {
    const deltas: AttendanceDelta[] = [
      { studentName: 'Juan Dela Cruz', oldAttendance: 'A', newAttendance: 'E' },
      { studentName: 'Maria Santos', recitationsDelta: 1 },
    ]

    const fallback = formatRuleBasedChangeNote(deltas)
    expect(fallback).toContain('Juan Dela Cruz (A -> E)')
    expect(fallback).toContain('Maria Santos (+1 recitations)')
  })

  it('constructs prompt containing strictly factual deltas and instructions', () => {
    const deltas: AttendanceDelta[] = [
      { studentName: 'Juan Dela Cruz', oldAttendance: 'A', newAttendance: 'E' },
    ]

    const prompt = buildChangeNotePrompt(deltas)
    expect(prompt).toContain('Juan Dela Cruz')
    expect(prompt).toContain('Absent to Excused')
    expect(prompt).toContain('1 concise, factual sentence')
  })

  it('calls Gemini client when available and returns generated text', async () => {
    const mockClient = {
      models: {
        generateContent: vi.fn().mockResolvedValue({
          text: 'Marked Juan Dela Cruz as Excused.',
        }),
      },
    }

    const deltas: AttendanceDelta[] = [
      { studentName: 'Juan Dela Cruz', oldAttendance: 'A', newAttendance: 'E' },
    ]

    const result = await generateChangeNote(deltas, mockClient as any)
    expect(result).toBe('Marked Juan Dela Cruz as Excused.')
    expect(mockClient.models.generateContent).toHaveBeenCalled()
  })

  it('falls back cleanly if Gemini throws an error or rate limit occurs', async () => {
    const mockClient = {
      models: {
        generateContent: vi.fn().mockRejectedValue(new Error('Quota exceeded')),
      },
    }

    const deltas: AttendanceDelta[] = [
      { studentName: 'Juan Dela Cruz', oldAttendance: 'A', newAttendance: 'E' },
    ]

    const result = await generateChangeNote(deltas, mockClient as any)
    expect(result).toBe('Updated attendance: Juan Dela Cruz (A -> E).')
  })
})
