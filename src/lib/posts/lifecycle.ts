/**
 * Post Domain Lifecycle & Slug Engine
 *
 * Implements:
 * - Auto-slugification with 4-character random entropy
 * - Announcement priority pin evaluation against Manila calendar dates
 * - Publish validation enforcing mandatory change notes
 */

/**
 * Generate a URL-safe lowercase slug from a post title with 4 random alphanumeric characters.
 */
export function slugifyPostTitle(title: string): string {
  const normalized = (title || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // replace non-alphanumeric with hyphen
    .replace(/^-+|-+$/g, '') // trim leading/trailing hyphens

  const base = normalized.length > 0 ? normalized : 'post'

  // Generate 4-character random alphanumeric suffix
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let suffix = ''
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  return `${base}-${suffix}`
}

/**
 * Check if an announcement priority pin is currently active.
 * A pin is active if pinnedUntil >= todayDate (YYYY-MM-DD Manila timezone).
 */
export function isAnnouncementPinned(
  pinnedUntil: string | undefined | null,
  todayDate: string,
): boolean {
  if (!pinnedUntil || typeof pinnedUntil !== 'string') {
    return false
  }
  const cleanPinnedUntil = pinnedUntil.trim()
  if (!cleanPinnedUntil) {
    return false
  }

  // Compare YYYY-MM-DD lexicographically
  return cleanPinnedUntil >= todayDate
}

export interface ValidatePublishInputOptions {
  changeNote?: string
  priority?: boolean
  pinnedUntil?: string
  todayDate: string
}

export interface ValidatePublishResult {
  valid: boolean
  error?: string
}

/**
 * Validate input before publishing a post.
 * Enforces:
 * 1. Non-blank change note (PRD-1 requirement)
 * 2. If priority is checked, pinnedUntil must be a valid future or today date
 */
export function validatePublishInput(
  options: ValidatePublishInputOptions,
): ValidatePublishResult {
  const { changeNote, priority, pinnedUntil, todayDate } = options

  if (!changeNote || typeof changeNote !== 'string' || !changeNote.trim()) {
    return {
      valid: false,
      error: 'A change note is required to publish this post.',
    }
  }

  if (priority) {
    if (!pinnedUntil || typeof pinnedUntil !== 'string' || !pinnedUntil.trim()) {
      return {
        valid: false,
        error: 'A pin expiration date is required when Priority is enabled.',
      }
    }

    if (pinnedUntil.trim() < todayDate) {
      return {
        valid: false,
        error: 'Pin expiration date cannot be in the past.',
      }
    }
  }

  return { valid: true }
}
