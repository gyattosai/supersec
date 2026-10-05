import { isAnnouncementPinned } from './lifecycle'

export interface PublicAnnouncementItem {
  id: string
  title: string
  content?: string
  priority: boolean
  pinnedUntil?: string
  isPinned: boolean
  publishedAt?: string
}

export interface PublicResourceItem {
  id: string
  title: string
  content?: string
  url?: string
  category?: string
  attachmentsCount?: number
  publishedAt?: string
}

export interface PublicQuestionItem {
  id: string
  question: string
  answer?: string
  tags: string[]
  official: boolean
  publishedAt?: string
}

export interface PublicPostsHub {
  pinnedAlert: PublicAnnouncementItem | null
  announcements: PublicAnnouncementItem[]
  resources: PublicResourceItem[]
  questions: PublicQuestionItem[]
}

export interface ProjectPublicPostsHubOptions {
  announcements: any[]
  resources: any[]
  questions: any[]
  todayDate: string
}

/**
 * Pure projection for public classmate portal.
 * Guarantees Zero-Leak by strictly excluding drafts, archived records,
 * and stripping secretary notes and internal IDs.
 */
export function projectPublicPostsHub({
  announcements,
  resources,
  questions,
  todayDate,
}: ProjectPublicPostsHubOptions): PublicPostsHub {
  // Filter announcements: published & not archived
  const activeAnnouncements = (announcements || []).filter(
    (a) => (a._status === 'published' || a.status === 'published') && !a.archivedAt,
  )

  const projectedAnnouncements: PublicAnnouncementItem[] = activeAnnouncements.map((a) => {
    const isPinned = !!a.priority && isAnnouncementPinned(a.pinnedUntil, todayDate)
    return {
      id: String(a.id),
      title: a.title || 'Untitled Announcement',
      content: a.content || undefined,
      priority: !!a.priority,
      pinnedUntil: a.pinnedUntil || undefined,
      isPinned,
      publishedAt: a.publishedAt || a.createdAt || undefined,
    }
  })

  // Sort announcements: pinned items first, then descending by publishedAt
  projectedAnnouncements.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1
    if (!a.isPinned && b.isPinned) return 1
    const dateA = a.publishedAt || ''
    const dateB = b.publishedAt || ''
    return dateB.localeCompare(dateA)
  })

  // First active pinned announcement surfaces in the top banner
  const pinnedAlert = projectedAnnouncements.find((a) => a.isPinned) || null

  // Filter resources: published & not archived
  const activeResources = (resources || []).filter(
    (r) => (r._status === 'published' || r.status === 'published') && !r.archivedAt,
  )

  const projectedResources: PublicResourceItem[] = activeResources.map((r) => ({
    id: String(r.id),
    title: r.title || 'Untitled Resource',
    content: r.content || undefined,
    url: r.url || undefined,
    category: r.category || undefined,
    attachmentsCount: Array.isArray(r.attachments) ? r.attachments.length : undefined,
    publishedAt: r.publishedAt || r.createdAt || undefined,
  }))

  projectedResources.sort((a, b) => {
    const dateA = a.publishedAt || ''
    const dateB = b.publishedAt || ''
    return dateB.localeCompare(dateA)
  })

  // Filter questions: published & not archived
  const activeQuestions = (questions || []).filter(
    (q) => (q._status === 'published' || q.status === 'published') && !q.archivedAt,
  )

  const projectedQuestions: PublicQuestionItem[] = activeQuestions.map((q) => ({
    id: String(q.id),
    question: q.question || 'Untitled Question',
    answer: q.answer || undefined,
    tags: Array.isArray(q.tags) ? q.tags : [],
    official: !!q.official,
    publishedAt: q.publishedAt || q.createdAt || undefined,
  }))

  projectedQuestions.sort((a, b) => {
    if (a.official && !b.official) return -1
    if (!a.official && b.official) return 1
    const dateA = a.publishedAt || ''
    const dateB = b.publishedAt || ''
    return dateB.localeCompare(dateA)
  })

  return {
    pinnedAlert,
    announcements: projectedAnnouncements,
    resources: projectedResources,
    questions: projectedQuestions,
  }
}
