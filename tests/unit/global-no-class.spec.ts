import { describe, expect, it, vi } from 'vitest'
import { markGlobalNoClass } from '@/lib/data/sessions'

describe('One-Tap Global No Class for All (Ticket 10)', () => {
  const activeTerm = {
    id: 'term-1',
    name: '1st Semester 2026-2027',
    startDate: '2026-08-01',
    endDate: '2026-12-31',
  }

  const activeSubjects = [
    {
      id: 'subj-1',
      code: 'CS101',
      term: 'term-1',
      schedule: [{ weekday: 'mon', start: '08:00', end: '10:00' }],
    },
    {
      id: 'subj-2',
      code: 'MATH201',
      term: 'term-1',
      schedule: [{ weekday: 'mon', start: '13:00', end: '15:00' }],
    },
    {
      id: 'subj-3',
      code: 'PHYS101',
      term: 'term-1',
      schedule: [{ weekday: 'tue', start: '10:00', end: '12:00' }],
    },
  ]

  it('rejects invalid date formats', async () => {
    const mockPayload: any = {}
    await expect(
      markGlobalNoClass(mockPayload, {
        date: 'invalid-date',
        reason: 'Typhoon',
      }),
    ).rejects.toThrow('Date must be in YYYY-MM-DD format')
  })

  it('rejects empty or whitespace-only reasons', async () => {
    const mockPayload: any = {}
    await expect(
      markGlobalNoClass(mockPayload, {
        date: '2026-10-05',
        reason: '   ',
      }),
    ).rejects.toThrow('A reason is required when marking No Class')
  })

  it('creates published noClass sessions for scheduled subjects on Monday', async () => {
    const createdSessions: any[] = []

    const mockPayload: any = {
      find: vi.fn(async ({ collection, where }: any) => {
        if (collection === 'terms') {
          return { docs: [activeTerm] }
        }
        if (collection === 'subjects') {
          return { docs: activeSubjects }
        }
        if (collection === 'sessions') {
          // No existing sessions
          return { docs: [] }
        }
        return { docs: [] }
      }),
      create: vi.fn(async ({ collection, data }: any) => {
        if (collection === 'sessions') {
          const session = { id: `sess-${createdSessions.length + 1}`, ...data }
          createdSessions.push(session)
          return session
        }
        return data
      }),
    }

    // 2026-10-05 is a Monday
    const result = await markGlobalNoClass(mockPayload, {
      date: '2026-10-05',
      reason: 'Typhoon Suspension Signal No. 2',
    })

    expect(result.success).toBe(true)
    expect(result.affectedSubjectIds).toEqual(['subj-1', 'subj-2'])
    expect(result.createdSessionIds).toHaveLength(2)
    expect(createdSessions).toHaveLength(2)

    for (const sess of createdSessions) {
      expect(sess.kind).toBe('noClass')
      expect(sess.phase).toBe('finished')
      expect(sess.noClassReason).toBe('Typhoon Suspension Signal No. 2')
      expect(sess._status).toBe('published')
      expect(sess.date).toBe('2026-10-05')
    }
  })

  it('is idempotent and skips subjects that already have noClass marked', async () => {
    const createdSessions: any[] = []

    const mockPayload: any = {
      find: vi.fn(async ({ collection, where }: any) => {
        if (collection === 'terms') {
          return { docs: [activeTerm] }
        }
        if (collection === 'subjects') {
          return { docs: activeSubjects }
        }
        if (collection === 'sessions') {
          // subj-1 already has noClass marked
          const subjectId = where?.and?.[0]?.subject?.equals
          if (subjectId === 'subj-1') {
            return {
              docs: [
                {
                  id: 'sess-existing-1',
                  subject: 'subj-1',
                  date: '2026-10-05',
                  kind: 'noClass',
                  _status: 'published',
                },
              ],
            }
          }
          return { docs: [] }
        }
        return { docs: [] }
      }),
      create: vi.fn(async ({ collection, data }: any) => {
        const session = { id: `sess-${createdSessions.length + 1}`, ...data }
        createdSessions.push(session)
        return session
      }),
    }

    const result = await markGlobalNoClass(mockPayload, {
      date: '2026-10-05',
      reason: 'Typhoon Suspension',
    })

    expect(result.success).toBe(true)
    // subj-1 skipped, subj-2 created
    expect(result.skippedSubjectIds).toEqual(['subj-1'])
    expect(result.affectedSubjectIds).toEqual(['subj-2'])
    expect(createdSessions).toHaveLength(1)
  })

  it('marks all active subjects when explicit subjectIds are passed', async () => {
    const createdSessions: any[] = []

    const mockPayload: any = {
      find: vi.fn(async ({ collection }: any) => {
        if (collection === 'sessions') return { docs: [] }
        return { docs: [] }
      }),
      create: vi.fn(async ({ data }: any) => {
        const session = { id: `sess-${createdSessions.length + 1}`, ...data }
        createdSessions.push(session)
        return session
      }),
    }

    const result = await markGlobalNoClass(mockPayload, {
      date: '2026-10-05',
      reason: 'University Holiday',
      subjectIds: ['subj-1', 'subj-2', 'subj-3'],
    })

    expect(result.affectedSubjectIds).toEqual(['subj-1', 'subj-2', 'subj-3'])
    expect(createdSessions).toHaveLength(3)
  })
})
