export type AllowEntry = string | RegExp

export interface GatePaths {
  page: string
  verify: string
  logout: string
}

export const DEFAULT_PATHS: GatePaths = {
  page: "/access",
  verify: "/access/verify",
  logout: "/access/logout",
}

const METADATA_IMAGE_SEGMENT =
  /^(?:opengraph-image|twitter-image|icon|apple-icon)\d*(?:-[A-Za-z0-9_]+)?(?:\.[A-Za-z0-9]+)?$/

const stripTrailingSlash = (path: string): string =>
  path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path

export const normalisePath = (path: string): string => {
  const withSlash = path.startsWith("/") ? path : `/${path}`
  return stripTrailingSlash(withSlash)
}

const matchesEntry = (pathname: string, entry: AllowEntry): boolean => {
  if (entry instanceof RegExp) return entry.test(pathname)
  const base = normalisePath(entry)
  if (base === "/") return pathname === "/"
  return pathname === base || pathname.startsWith(`${base}/`)
}

export const isMetadataImagePath = (pathname: string): boolean => {
  const segments = pathname.split("/").filter(Boolean)
  const last = segments.at(-1)
  const previous = segments.at(-2)
  if (last && METADATA_IMAGE_SEGMENT.test(last)) return true
  return previous !== undefined && METADATA_IMAGE_SEGMENT.test(previous)
}

export interface PublicPathOptions {
  paths: GatePaths
  allow: readonly AllowEntry[]
  publicMetadataImages: boolean
}

export const isPublicPath = (rawPathname: string, options: PublicPathOptions): boolean => {
  const pathname = stripTrailingSlash(rawPathname)
  if (pathname.startsWith("/_next/")) return true
  if (pathname === "/favicon.ico" || pathname === "/robots.txt") return true
  const { page, verify, logout } = options.paths
  if (pathname === page || pathname === verify || pathname === logout) return true
  if (options.publicMetadataImages && isMetadataImagePath(pathname)) return true
  return options.allow.some((entry) => matchesEntry(pathname, entry))
}

const PLACEHOLDER_ORIGIN = "http://next-access-gate.invalid"

export const safeNext = (
  value: unknown,
  paths: GatePaths = DEFAULT_PATHS,
  fallback = "/",
): string => {
  if (typeof value !== "string" || value.length === 0 || value.length > 2048) return fallback
  if (!value.startsWith("/") || value.startsWith("//")) return fallback
  if (value.includes("\\")) return fallback
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback
  let url: URL
  try {
    url = new URL(value, PLACEHOLDER_ORIGIN)
  } catch {
    return fallback
  }
  if (url.origin !== PLACEHOLDER_ORIGIN) return fallback
  const pathname = stripTrailingSlash(url.pathname)
  if (pathname === paths.verify || pathname === paths.logout || pathname === paths.page) {
    return fallback
  }
  return `${url.pathname}${url.search}${url.hash}`
}
