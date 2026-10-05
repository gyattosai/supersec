import { describe, expect, it } from 'vitest'
import { getNavigationTabs, checkConsoleAuth } from '@/lib/navigation'

describe('Secretary Shell & Navigation (Ticket 02)', () => {
  describe('Navigation Tabs Spec', () => {
    it('defines the 4 canonical secretary console tabs', () => {
      const tabs = getNavigationTabs('/console/dashboard')
      expect(tabs).toHaveLength(4)

      const ids = tabs.map((t) => t.id)
      expect(ids).toEqual(['dashboard', 'subjects', 'requests', 'settings'])
    })

    it('marks the active tab based on current pathname', () => {
      const dashboardTabs = getNavigationTabs('/console/dashboard')
      expect(dashboardTabs.find((t) => t.id === 'dashboard')?.isActive).toBe(true)
      expect(dashboardTabs.find((t) => t.id === 'subjects')?.isActive).toBe(false)

      const subjectsTabs = getNavigationTabs('/console/subjects')
      expect(subjectsTabs.find((t) => t.id === 'subjects')?.isActive).toBe(true)
      expect(subjectsTabs.find((t) => t.id === 'dashboard')?.isActive).toBe(false)

      const subRouteTabs = getNavigationTabs('/console/session/sess-123')
      // Sub-route of subjects/dashboard defaults gracefully
      expect(subRouteTabs).toBeDefined()
    })

    it('enforces min 44px touch target on navigation links', () => {
      const tabs = getNavigationTabs('/console/dashboard')
      for (const tab of tabs) {
        expect(tab.minTouchTargetPx).toBeGreaterThanOrEqual(44)
      }
    })
  })

  describe('Server Auth Guard Logic', () => {
    it('returns shouldRedirect true when payload-token cookie is missing', () => {
      const auth = checkConsoleAuth(undefined, '/console/dashboard')
      expect(auth.authenticated).toBe(false)
      expect(auth.shouldRedirect).toBe(true)
      expect(auth.redirectTo).toBe('/console/login?redirect=%2Fconsole%2Fdashboard')
    })

    it('returns shouldRedirect false when payload-token cookie is present', () => {
      const auth = checkConsoleAuth('jwt-valid-token-string', '/console/dashboard')
      expect(auth.authenticated).toBe(true)
      expect(auth.shouldRedirect).toBe(false)
      expect(auth.redirectTo).toBeUndefined()
    })

    it('redirects authenticated users away from login page to dashboard', () => {
      const auth = checkConsoleAuth('jwt-valid-token-string', '/console/login')
      expect(auth.authenticated).toBe(true)
      expect(auth.shouldRedirect).toBe(true)
      expect(auth.redirectTo).toBe('/console/dashboard')
    })
  })
})
