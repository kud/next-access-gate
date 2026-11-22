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

const withExtensions = (base: string, extensions: readonly string[]): string[] => [
  base,
  ...extensions.map((extension) => `${base}.${extension}`),
]

export const DEFAULT_METADATA_IMAGES: readonly string[] = Object.freeze([
  ...withExtensions("/opengraph-image", ["png", "jpg", "jpeg", "gif"]),
  ...withExtensions("/twitter-image", ["png", "jpg", "jpeg", "gif"]),
  ...withExtensions("/icon", ["ico", "png", "jpg", "jpeg", "svg"]),
  ...withExtensions("/apple-icon", ["png", "jpg", "jpeg"]),
])

export type MetadataImagesOption = boolean | readonly string[]

export const resolveMetadataImages = (option: MetadataImagesOption | undefined): string[] => {
  if (option === false) return []
  if (option === undefined || option === true) return [...DEFAULT_METADATA_IMAGES]
  return option.map(normalisePath)
}

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

export interface PublicPathOptions {
  paths: GatePaths
  allow: readonly AllowEntry[]
  /** `true` (default) for root-level metadata images, `false` for none, or exact paths. */
  publicMetadataImages?: MetadataImagesOption
}

export const isPublicPath = (rawPathname: string, options: PublicPathOptions): boolean => {
  const pathname = stripTrailingSlash(rawPathname)
  if (pathname.startsWith("/_next/")) return true
  if (pathname === "/favicon.ico" || pathname === "/robots.txt") return true
  const { page, verify, logout } = options.paths
  if (pathname === page || pathname === verify || pathname === logout) return true
  if (resolveMetadataImages(options.publicMetadataImages).includes(pathname)) return true
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
