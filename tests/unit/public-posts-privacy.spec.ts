import { describe, it, expect } from 'vitest'
import { projectPublicPostsHub } from '@/lib/posts/public-projection'

describe('Public Posts Hub Zero-Leak Projection', () => {
  const todayDate = '2026-10-06'

  it('excludes draft and archived announcements, sorting active pinned ones to the top', () => {
    const rawAnnouncements = [
      {
        id: 'ann-1',
        title: 'Draft Exam Notice',
        content: 'Should not leak',
        changeNote: 'Internal draft note',
        _status: 'draft',
        archivedAt: null,
        priority: false,
        publishedAt: '2026-10-01T08:00:00.000Z',
      },
      {
        id: 'ann-2',
        title: 'Archived Syllabus Update',
        content: 'Old info',
        changeNote: 'Archived note',
        _status: 'published',
        archivedAt: '2026-10-02T10:00:00.000Z',
        priority: false,
        publishedAt: '2026-10-01T08:00:00.000Z',
      },
      {
        id: 'ann-3',
        title: 'Regular Announcement',
        content: 'Class on Friday will be online.',
        changeNote: 'Initial publish',
        _status: 'published',
        archivedAt: null,
        priority: false,
        publishedAt: '2026-10-05T08:00:00.000Z',
      },
      {
        id: 'ann-4',
        title: 'Urgent Midterm Exam Notice',
        content: 'Room changed to Lab 3.',
        changeNote: 'Room update',
        _status: 'published',
        archivedAt: null,
        priority: true,
        pinnedUntil: '2026-10-10',
        publishedAt: '2026-10-04T08:00:00.000Z',
      },
      {
        id: 'ann-5',
        title: 'Expired Urgent Notice',
        content: 'Expired pin',
        changeNote: 'Pin expired',
        _status: 'published',
        archivedAt: null,
        priority: true,
        pinnedUntil: '2026-10-01', // expired relative to 2026-10-06
        publishedAt: '2026-10-01T08:00:00.000Z',
      },
    ]

    const result = projectPublicPostsHub({
      announcements: rawAnnouncements,
      resources: [],
      questions: [],
      todayDate,
    })

    // Draft and archived must be stripped
    expect(result.announcements.some((a) => a.id === 'ann-1')).toBe(false)
    expect(result.announcements.some((a) => a.id === 'ann-2')).toBe(false)

    // Only ann-3, ann-4, ann-5 are published and unarchived
    expect(result.announcements).toHaveLength(3)

    // Active pinned announcement should be in pinnedAlert and sorted first
    expect(result.pinnedAlert?.id).toBe('ann-4')
    expect(result.announcements[0].id).toBe('ann-4')
    expect(result.announcements[0].isPinned).toBe(true)

    // ann-5 is expired so isPinned is false
    const expiredItem = result.announcements.find((a) => a.id === 'ann-5')
    expect(expiredItem?.isPinned).toBe(false)

    // Zero-leak check: changeNote must not exist on public objects
    for (const ann of result.announcements) {
      expect((ann as any).changeNote).toBeUndefined()
    }
  })

  it('excludes draft and archived resources with zero internal field leakage', () => {
    const rawResources = [
      {
        id: 'res-1',
        title: 'Lecture 1 Slides',
        content: 'Slides for week 1',
        url: 'https://slides.google.com/test',
        category: 'Lecture Notes',
        attachments: [{ id: 'att-1' }, { id: 'att-2' }],
        changeNote: 'Secret note',
        _status: 'published',
        archivedAt: null,
        publishedAt: '2026-10-02T10:00:00.000Z',
      },
      {
        id: 'res-2',
        title: 'Draft Problem Set',
        content: 'Not ready',
        changeNote: 'Draft note',
        _status: 'draft',
        archivedAt: null,
      },
      {
        id: 'res-3',
        title: 'Archived Handout',
        content: 'Old handout',
        changeNote: 'Archived note',
        _status: 'published',
        archivedAt: '2026-10-03T00:00:00.000Z',
      },
    ]

    const result = projectPublicPostsHub({
      announcements: [],
      resources: rawResources,
      questions: [],
      todayDate,
    })

    expect(result.resources).toHaveLength(1)
    expect(result.resources[0].id).toBe('res-1')
    expect(result.resources[0].url).toBe('https://slides.google.com/test')
    expect(result.resources[0].category).toBe('Lecture Notes')
    expect(result.resources[0].attachmentsCount).toBe(2)
    expect((result.resources[0] as any).changeNote).toBeUndefined()
  })

  it('excludes draft and archived questions with zero internal field leakage', () => {
    const rawQuestions = [
      {
        id: 'q-1',
        question: 'Will there be a quiz next meeting?',
        answer: 'Yes, covering Chapters 1 to 3.',
        tags: ['quiz', 'midterm'],
        official: true,
        changeNote: 'Confirmed by Prof',
        _status: 'published',
        archivedAt: null,
        publishedAt: '2026-10-03T10:00:00.000Z',
      },
      {
        id: 'q-2',
        question: 'Unverified rumor draft',
        answer: 'Draft answer',
        _status: 'draft',
        archivedAt: null,
      },
      {
        id: 'q-3',
        question: 'Old syllabus question',
        answer: 'Old answer',
        _status: 'published',
        archivedAt: '2026-10-04T00:00:00.000Z',
      },
    ]

    const result = projectPublicPostsHub({
      announcements: [],
      resources: [],
      questions: rawQuestions,
      todayDate,
    })

    expect(result.questions).toHaveLength(1)
    expect(result.questions[0].id).toBe('q-1')
    expect(result.questions[0].official).toBe(true)
    expect(result.questions[0].tags).toEqual(['quiz', 'midterm'])
    expect((result.questions[0] as any).changeNote).toBeUndefined()
  })
})
