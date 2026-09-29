/**
 * Direct Page URL Generator
 */

export interface ShareUrlOptions {
  /** Target origin if running outside browser context */
  origin?: string;
  /** Explicit router base endpoint override */
  routerBaseUrl?: string;
  version?: string | number;
  fastCacheBust?: boolean;
}

export const DEFAULT_CANONICAL_ORIGIN = "https://supersec.mjbalubar.tech";

export function getShareRouterBaseUrl(explicitOrigin?: string): string {
  if (explicitOrigin) {
    return explicitOrigin.replace(/\/+$/, "");
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, "");
  }

  return DEFAULT_CANONICAL_ORIGIN;
}

export function normalizeSharePath(path: string): string {
  if (!path) return "/";
  let clean = path.trim();
  if (/^https?:\/\/[^/]+/i.test(clean)) {
    try {
      clean = new URL(clean).pathname;
    } catch {}
  }
  if (!clean.startsWith("/")) clean = `/${clean}`;
  if (clean.length > 1 && clean.endsWith("/")) clean = clean.slice(0, -1);
  return clean;
}

/**
 * Returns the direct canonical link to the public resource.
 */
export function getSocialShareUrl(path: string, options: ShareUrlOptions = {}): string {
  const normPath = normalizeSharePath(path);
  const base = getShareRouterBaseUrl(options.origin || options.routerBaseUrl);
  return `${base}${normPath}`;
}
