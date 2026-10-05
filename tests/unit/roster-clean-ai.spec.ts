import { describe, it, expect, vi } from 'vitest'
import {
  cleanRosterRuleBased,
  buildRosterCleanPrompt,
  cleanRosterWithAi,
  toTitleCase,
} from '@/lib/ai/roster-cleaner'

describe('AI Roster Cleaner & Normalizer', () => {
  it('converts all-caps and lowercase strings to proper Title Case preserving particles', () => {
    expect(toTitleCase('JUAN DELA CRUZ')).toBe('Juan Dela Cruz')
    expect(toTitleCase('MARIA CLARA DE LOS SANTOS')).toBe('Maria Clara De Los Santos')
    expect(toTitleCase('pedro penduko jr.')).toBe('Pedro Penduko Jr.')
  })

  it('strips honorifics, section prefixes, and leading list numbering in rule-based mode', () => {
    const rawText = `
1. BSCS-2A DELA CRUZ, Juan Miguel
2) Ms. Maria Clara Santos - 2023-10294
3. Mr. Pedro Penduko (BSIT)
    `

    const res = cleanRosterRuleBased(rawText)
    expect(res.students).toHaveLength(3)

    const juan = res.students[0]
    expect(juan.lastName).toBe('Dela Cruz')
    expect(juan.firstName).toBe('Juan Miguel')

    const maria = res.students[1]
    expect(maria.lastName).toBe('Santos')
    expect(maria.firstName).toBe('Maria Clara')
    expect(maria.studentNumber).toBe('2023-10294')

    const pedro = res.students[2]
    expect(pedro.lastName).toBe('Penduko')
    expect(pedro.firstName).toBe('Pedro')
  })

  it('detects and flags duplicate student names in the pasted text', () => {
    const rawText = `
Juan Dela Cruz
Maria Santos
JUAN DELA CRUZ
    `

    const res = cleanRosterRuleBased(rawText)
    expect(res.students).toHaveLength(3)
    expect(res.duplicateCount).toBe(1)
    expect(res.students[2].isDuplicate).toBe(true)
  })

  it('builds structured prompt for Gemini Flash-Lite with JSON instructions', () => {
    const prompt = buildRosterCleanPrompt('Juan Dela Cruz\nMaria Santos')
    expect(prompt).toContain('Juan Dela Cruz')
    expect(prompt).toContain('JSON')
    expect(prompt).toContain('lastName')
    expect(prompt).toContain('firstName')
  })

  it('uses Gemini when available and parses structured JSON output', async () => {
    const mockClient = {
      models: {
        generateContent: vi.fn().mockResolvedValue({
          text: JSON.stringify({
            students: [
              {
                rawLine: '1. BSCS-2A DELA CRUZ, Juan Miguel (2023-0001)',
                lastName: 'Dela Cruz',
                firstName: 'Juan Miguel',
                studentNumber: '2023-0001',
                isDuplicate: false,
              },
            ],
            duplicateCount: 0,
            totalProcessed: 1,
          }),
        }),
      },
    }

    const res = await cleanRosterWithAi('1. BSCS-2A DELA CRUZ, Juan Miguel (2023-0001)', mockClient as any)
    expect(res.students).toHaveLength(1)
    expect(res.students[0].lastName).toBe('Dela Cruz')
    expect(res.students[0].firstName).toBe('Juan Miguel')
    expect(res.students[0].studentNumber).toBe('2023-0001')
  })

  it('falls back to rule-based cleaner when Gemini fails or returns error', async () => {
    const mockClient = {
      models: {
        generateContent: vi.fn().mockRejectedValue(new Error('API quota limit')),
      },
    }

    const res = await cleanRosterWithAi('Santos, Maria Clara', mockClient as any)
    expect(res.students).toHaveLength(1)
    expect(res.students[0].lastName).toBe('Santos')
    expect(res.students[0].firstName).toBe('Maria Clara')
  })
})
