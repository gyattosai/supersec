import { describe, expect, it } from 'vitest'
import { projectSubjectQuestionsList } from '@/lib/subjects/subject-home'

describe('Subject Home Questions Projection (Ticket 07)', () => {
  const rawDocs = [
    {
      id: 'q-1',
      question: 'Is attendance required for the online lab session?',
      slug: 'is-attendance-required-online-lab-1234',
      official: true,
      tags: ['attendance', 'lab'],
      publishedAt: '2026-10-01T08:00:00.000Z',
      _status: 'published',
    },
    {
      id: 'q-2',
      question: 'When is the deadline for Case Study 1?',
      slug: 'when-is-deadline-case-study-1-5678',
      official: false,
      tags: ['deadlines', 'project'],
      publishedAt: '2026-10-03T08:00:00.000Z',
      _status: 'published',
    },
    {
      id: 'q-3',
      question: 'Will there be a curve on the midterm exam?',
      slug: 'will-there-be-curve-midterm-9999',
      official: true,
      tags: ['exams', 'grading'],
      publishedAt: '2026-10-04T08:00:00.000Z',
      _status: 'published',
    },
  ]

  it('projects and sorts questions in reverse chronological order', () => {
    const list = projectSubjectQuestionsList(rawDocs)
    expect(list).toHaveLength(3)
    expect(list[0].id).toBe('q-3')
    expect(list[1].id).toBe('q-2')
    expect(list[2].id).toBe('q-1')
  })

  it('preserves official badge on confirmed questions', () => {
    const list = projectSubjectQuestionsList(rawDocs)
    expect(list[0].official).toBe(true)
    expect(list[1].official).toBe(false)
    expect(list[2].official).toBe(true)
  })

  it('filters questions by tag', () => {
    const labQuestions = projectSubjectQuestionsList(rawDocs, 'lab')
    expect(labQuestions).toHaveLength(1)
    expect(labQuestions[0].id).toBe('q-1')

    const examQuestions = projectSubjectQuestionsList(rawDocs, 'exams')
    expect(examQuestions).toHaveLength(1)
    expect(examQuestions[0].id).toBe('q-3')
  })

  it('filters questions by official badge only', () => {
    const officialOnly = projectSubjectQuestionsList(rawDocs, undefined, true)
    expect(officialOnly).toHaveLength(2)
    expect(officialOnly.map((q) => q.id)).toEqual(['q-3', 'q-1'])
  })
})
