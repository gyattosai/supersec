/**
 * Centralized Social Share URL Generator for Meta / Facebook / Messenger Link Previews
 * 
 * In Approach 1 (Appwrite Function Router), shared URLs route to an endpoint that
 * generates raw HTML with absolute Open Graph tags for social crawlers before
 * redirecting human visitors to the static frontend application.
 */

export interface ShareUrlOptions {
  /** Include cache-busting timestamp and version query parameters to force Meta edge cache invalidation */
  fastCacheBust?: boolean;
  /** Version number or identifier for the content item */
  version?: string | number;
  /** Target origin if running outside browser context */
  origin?: string;
  /** Explicit router base endpoint override */
  routerBaseUrl?: string;
}

export const DEFAULT_CANONICAL_ORIGIN = "https://supersec.mjbalubar.tech";

/**
 * Returns the configured share router base URL.
 * Checks VITE_SHARE_ROUTER_URL, then CANONICAL_ORIGIN, and falls back to DEFAULT_CANONICAL_ORIGIN.
 */
export function getShareRouterBaseUrl(explicitOrigin?: string): string {
  // Check Vite client-side environment variable
  if (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_SHARE_ROUTER_URL) {
    return (import.meta as any).env.VITE_SHARE_ROUTER_URL.replace(/\/+$/, "");
  }

  // Check Node environment variable
  if (typeof process !== "undefined" && process.env?.VITE_SHARE_ROUTER_URL) {
    return process.env.VITE_SHARE_ROUTER_URL.replace(/\/+$/, "");
  }

  if (explicitOrigin) {
    return explicitOrigin.replace(/\/+$/, "");
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, "");
  }

  return DEFAULT_CANONICAL_ORIGIN;
}

/**
 * Normalizes a path to ensure a single leading slash and no trailing slash.
 */
export function normalizeSharePath(path: string): string {
  if (!path) return "/";
  let clean = path.trim();
  // Strip any full origin if accidentally passed
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
 * Generates an absolute share link targeting the Appwrite Function Router.
 * 
 * Examples:
 *   getSocialShareUrl('/a/k39df2')
 *   -> 'https://supersec.mjbalubar.tech/share?target=%2Fa%2Fk39df2'
 * 
 *   getSocialShareUrl('/a/k39df2', { fastCacheBust: true, version: 2 })
 *   -> 'https://supersec.mjbalubar.tech/share?target=%2Fa%2Fk39df2&v=2&t=l3a9x'
 */
export function getSocialShareUrl(path: string, options: ShareUrlOptions = {}): string {
  const normPath = normalizeSharePath(path);
  const routerBase = getShareRouterBaseUrl(options.origin || options.routerBaseUrl);

  // If the router base is a dedicated function domain (e.g. *.appwrite.global or subdomain)
  const isDedicatedFunctionDomain =
    routerBase.includes(".appwrite.global") ||
    routerBase.includes("/functions/") ||
    routerBase.endsWith("/share");

  let shareUrl: string;
  if (isDedicatedFunctionDomain) {
    shareUrl = `${routerBase}${normPath}`;
  } else {
    // Default site routing: route through /share with target param
    shareUrl = `${routerBase}/share?target=${encodeURIComponent(normPath)}`;
  }

  // Add cache-busting parameters if requested
  if (options.fastCacheBust) {
    const separator = shareUrl.includes("?") ? "&" : "?";
    const ts = Math.floor(Date.now() / 1000).toString(36);
    const ver = options.version !== undefined ? `&v=${encodeURIComponent(String(options.version))}` : "";
    shareUrl = `${shareUrl}${separator}t=${ts}${ver}`;
  } else if (options.version !== undefined) {
    const separator = shareUrl.includes("?") ? "&" : "?";
    shareUrl = `${shareUrl}${separator}v=${encodeURIComponent(String(options.version))}`;
  }

  return shareUrl;
}
