import { describe, expect, it } from 'vitest'
import { projectSubjectResourcesList } from '@/lib/subjects/subject-home'

describe('Subject Home Resources Projection (Ticket 05)', () => {
  const rawDocs = [
    {
      id: 'res-1',
      title: 'Course Syllabus v2',
      slug: 'course-syllabus-v2-1234',
      url: 'https://drive.google.com/syllabus',
      category: 'Syllabus',
      attachments: [{ name: 'syllabus.pdf', fileUrl: '/files/syllabus.pdf', size: '1.2 MB' }],
      publishedAt: '2026-10-01T08:00:00.000Z',
      _status: 'published',
    },
    {
      id: 'res-2',
      title: 'Module 1 Slide Deck',
      slug: 'module-1-slide-deck-5678',
      url: 'https://slides.com/module1',
      category: 'Slides',
      attachments: [],
      publishedAt: '2026-10-03T08:00:00.000Z',
      _status: 'published',
    },
    {
      id: 'res-3',
      title: 'Practice Problem Set 1',
      slug: 'practice-problem-set-1-9999',
      category: 'Problem Sets',
      attachments: [{ name: 'problems.pdf', fileUrl: '/files/problems.pdf' }],
      publishedAt: '2026-10-04T08:00:00.000Z',
      _status: 'published',
    },
  ]

  it('projects and sorts resources in reverse chronological order', () => {
    const list = projectSubjectResourcesList(rawDocs)
    expect(list).toHaveLength(3)
    expect(list[0].id).toBe('res-3')
    expect(list[1].id).toBe('res-2')
    expect(list[2].id).toBe('res-1')
  })

  it('filters resources by category', () => {
    const syllabusOnly = projectSubjectResourcesList(rawDocs, 'Syllabus')
    expect(syllabusOnly).toHaveLength(1)
    expect(syllabusOnly[0].id).toBe('res-1')
    expect(syllabusOnly[0].category).toBe('Syllabus')

    const slidesOnly = projectSubjectResourcesList(rawDocs, 'Slides')
    expect(slidesOnly).toHaveLength(1)
    expect(slidesOnly[0].id).toBe('res-2')
  })

  it('returns empty array when no resources match the category', () => {
    const none = projectSubjectResourcesList(rawDocs, 'Exams')
    expect(none).toHaveLength(0)
  })
})
