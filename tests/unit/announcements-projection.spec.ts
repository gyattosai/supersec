import { describe, expect, it } from 'vitest'
import { projectSubjectAnnouncementsList } from '@/lib/subjects/subject-home'

describe('Subject Home Announcements Projection (Ticket 03)', () => {
  const todayDate = '2026-10-06'

  it('projects and sorts active pinned priority announcements to the top', () => {
    const rawDocs = [
      {
        id: 'ann-1',
        title: 'Regular Announcement',
        slug: 'regular-ann-1234',
        priority: false,
        publishedAt: '2026-10-05T08:00:00.000Z',
        _status: 'published',
      },
      {
        id: 'ann-2',
        title: 'Active Pinned Announcement',
        slug: 'active-pinned-5678',
        priority: true,
        pinnedUntil: '2026-10-10',
        publishedAt: '2026-10-01T08:00:00.000Z',
        _status: 'published',
      },
      {
        id: 'ann-3',
        title: 'Expired Pinned Announcement',
        slug: 'expired-pinned-9999',
        priority: true,
        pinnedUntil: '2026-10-04',
        publishedAt: '2026-10-02T08:00:00.000Z',
        _status: 'published',
      },
    ]

    const projected = projectSubjectAnnouncementsList(rawDocs, todayDate)

    expect(projected).toHaveLength(3)
    // ann-2 has active pin (pinnedUntil 2026-10-10 >= today 2026-10-06)
    expect(projected[0].id).toBe('ann-2')
    expect(projected[0].isPinned).toBe(true)

    // ann-1 has newer publishedAt than ann-3 and ann-3 is expired
    expect(projected[1].id).toBe('ann-1')
    expect(projected[1].isPinned).toBe(false)

    expect(projected[2].id).toBe('ann-3')
    expect(projected[2].isPinned).toBe(false)
  })

  it('maps draft and archived statuses correctly', () => {
    const rawDocs = [
      {
        id: 'ann-draft',
        title: 'Draft Announcement',
        slug: 'draft-ann-0001',
        _status: 'draft',
      },
      {
        id: 'ann-archived',
        title: 'Archived Announcement',
        slug: 'archived-ann-0002',
        archivedAt: '2026-10-05T12:00:00.000Z',
        _status: 'published',
      },
    ]

    const projected = projectSubjectAnnouncementsList(rawDocs, todayDate)
    expect(projected[0].status).toBe('draft')
    expect(projected[1].status).toBe('archived')
  })
})
