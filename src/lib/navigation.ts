export interface NavTab {
  id: 'dashboard' | 'subjects' | 'requests' | 'settings'
  label: string
  href: string
  isActive: boolean
  minTouchTargetPx: number
}

export function getNavigationTabs(currentPathname: string): NavTab[] {
  const tabs = [
    {
      id: 'dashboard' as const,
      label: 'Dashboard',
      href: '/console/dashboard',
    },
    {
      id: 'subjects' as const,
      label: 'Subjects',
      href: '/console/subjects',
    },
    {
      id: 'requests' as const,
      label: 'Requests',
      href: '/console/requests',
    },
    {
      id: 'settings' as const,
      label: 'Settings',
      href: '/console/settings',
    },
  ]

  return tabs.map((tab) => {
    const isActive =
      currentPathname === tab.href ||
      (tab.id !== 'dashboard' && currentPathname.startsWith(tab.href))
    return {
      ...tab,
      isActive,
      minTouchTargetPx: 44,
    }
  })
}

export interface AuthCheckResult {
  authenticated: boolean
  shouldRedirect: boolean
  redirectTo?: string
}

export function checkConsoleAuth(
  tokenCookie: string | undefined,
  currentPath: string,
): AuthCheckResult {
  const hasToken = Boolean(tokenCookie && tokenCookie.trim().length > 0)
  const isLoginPage = currentPath.startsWith('/console/login')

  if (!hasToken) {
    if (isLoginPage) {
      return { authenticated: false, shouldRedirect: false }
    }
    const redirectParam = encodeURIComponent(currentPath)
    return {
      authenticated: false,
      shouldRedirect: true,
      redirectTo: `/console/login?redirect=${redirectParam}`,
    }
  }

  // User is authenticated
  if (isLoginPage) {
    return {
      authenticated: true,
      shouldRedirect: true,
      redirectTo: '/console/dashboard',
    }
  }

  return {
    authenticated: true,
    shouldRedirect: false,
  }
}
