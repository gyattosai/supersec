import { describe, it, expect, vi } from 'vitest'
import {
  parseZoomTextRuleBased,
  buildZoomMatchPrompt,
  matchZoomAttendees,
  type ZoomMatchInputStudent,
} from '@/lib/ai/zoom-match'

describe('Zoom Match AI & Parser', () => {
  const mockRoster: ZoomMatchInputStudent[] = [
    { id: 'stu-1', name: 'Juan Dela Cruz' },
    { id: 'stu-2', name: 'Maria Santos' },
    { id: 'stu-3', name: 'Pedro Penduko' },
    { id: 'stu-4', name: 'Juan Miguel Reyes' },
  ]

  it('extracts participant names from raw Zoom chat logs with timestamps and sender headers', () => {
    const rawChat = `
10:01:23 From Juan Dela Cruz to Everyone: Present po sir!
10:02:15 From Maria Santos (she/her) to Everyone: Good morning!
10:05:00 From Unknown Guest 123 to Everyone: hello
    `

    const extracted = parseZoomTextRuleBased(rawChat, mockRoster)
    expect(extracted.matched).toHaveLength(2)

    const juan = extracted.matched.find((m) => m.studentId === 'stu-1')
    expect(juan).toBeDefined()
    expect(juan?.studentName).toBe('Juan Dela Cruz')

    const maria = extracted.matched.find((m) => m.studentId === 'stu-2')
    expect(maria).toBeDefined()
    expect(maria?.studentName).toBe('Maria Santos')

    expect(extracted.unmatched).toContain('Unknown Guest 123')
  })

  it('handles Zoom participant list exports with status suffixes (Co-host, Host, Me)', () => {
    const rawList = `
Juan Dela Cruz (Host, me)
Pedro Penduko (Co-host)
Random Attendee
    `

    const extracted = parseZoomTextRuleBased(rawList, mockRoster)
    expect(extracted.matched).toHaveLength(2)

    const pedro = extracted.matched.find((m) => m.studentId === 'stu-3')
    expect(pedro).toBeDefined()
    expect(pedro?.studentName).toBe('Pedro Penduko')
  })

  it('flags ambiguous names when multiple students share a common name token', () => {
    const rawText = `Juan`
    const extracted = parseZoomTextRuleBased(rawText, mockRoster)
    expect(extracted.ambiguous.length).toBeGreaterThan(0)
    expect(extracted.ambiguous[0].candidates.length).toBeGreaterThanOrEqual(2)
  })

  it('constructs prompt with sanitized student list and raw text', () => {
    const prompt = buildZoomMatchPrompt('Some raw text', mockRoster)
    expect(prompt).toContain('Juan Dela Cruz')
    expect(prompt).toContain('Maria Santos')
    expect(prompt).toContain('Some raw text')
    expect(prompt).toContain('JSON')
  })

  it('uses Gemini when available and parses structured JSON output', async () => {
    const mockClient = {
      models: {
        generateContent: vi.fn().mockResolvedValue({
          text: JSON.stringify({
            matched: [
              {
                studentId: 'stu-1',
                studentName: 'Juan Dela Cruz',
                rawName: 'Juan D. Cruz (he/him)',
                confidence: 0.95,
              },
            ],
            ambiguous: [],
            unmatched: ['iphone_user_99'],
          }),
        }),
      },
    }

    const res = await matchZoomAttendees('Juan D. Cruz (he/him)\niphone_user_99', mockRoster, mockClient as any)
    expect(res.matched).toHaveLength(1)
    expect(res.matched[0].studentId).toBe('stu-1')
    expect(res.unmatched).toContain('iphone_user_99')
  })

  it('falls back to rule-based parser if Gemini fails or returns malformed response', async () => {
    const mockClient = {
      models: {
        generateContent: vi.fn().mockRejectedValue(new Error('Network error')),
      },
    }

    const res = await matchZoomAttendees(
      '10:00:00 From Pedro Penduko to Everyone: here',
      mockRoster,
      mockClient as any,
    )
    expect(res.matched).toHaveLength(1)
    expect(res.matched[0].studentId).toBe('stu-3')
  })
})
