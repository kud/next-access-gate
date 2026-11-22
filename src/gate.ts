import { NextResponse, type NextRequest } from "next/server.js"
import { matchCode, keyId, parseCodes, type CodesInput } from "./codes.js"
import { cookieNameFor, readCookie, serialiseCookie, type RequestLike } from "./cookie.js"
import { deriveHmacKey } from "./crypto.js"
import {
  DEFAULT_PATHS,
  isPublicPath,
  normalisePath,
  resolveMetadataImages,
  safeNext,
  type AllowEntry,
  type GatePaths,
  type MetadataImagesOption,
} from "./paths.js"
import { createToken, verifyToken } from "./token.js"
import { unconfiguredHtml } from "./unconfigured.js"

export type WhenUnset = "closed" | "open"
export type DeploymentEnvironment = "production" | "preview" | "development"
export type GateStatus = "active" | "open" | "unconfigured" | "disabled"

export interface AccessGateOptions {
  codes: CodesInput
  secret?: string | undefined
  whenUnset?: WhenUnset
  enabledIn?: readonly DeploymentEnvironment[]
  allow?: readonly AllowEntry[]
  paths?: Partial<GatePaths>
  caseSensitive?: boolean
  maxAge?: number
  publicMetadataImages?: MetadataImagesOption
  failureDelayMs?: number
}

export interface AccessGate {
  readonly paths: Readonly<GatePaths>
  readonly status: GateStatus
  proxy: (request: NextRequest) => Promise<Response>
  verify: (request: Request) => Promise<Response>
  logout: (request: Request) => Promise<Response>
  isAuthenticated: (request: RequestLike) => Promise<boolean>
}

const DAY_SECONDS = 24 * 60 * 60
const MIN_SECRET_LENGTH = 32
const MIN_CODE_LENGTH = 10
const MAX_CODE_LENGTH = 512
const NOINDEX = "noindex, nofollow"
const NO_STORE = "private, no-store"
const SAFE_METHODS = new Set(["GET", "HEAD"])

const warned = new Set<string>()
const warnOnce = (message: string): void => {
  if (warned.has(message)) return
  warned.add(message)
  console.warn(`[next-access-gate] ${message}`)
}

const currentEnvironment = (): DeploymentEnvironment => {
  const vercel = process.env.VERCEL_ENV
  if (vercel === "production" || vercel === "preview" || vercel === "development") return vercel
  return process.env.NODE_ENV === "production" ? "production" : "development"
}

const resolveStatus = (
  codes: readonly string[],
  options: AccessGateOptions,
): GateStatus => {
  if (options.enabledIn && !options.enabledIn.includes(currentEnvironment())) return "disabled"
  if (codes.length > 0) return "active"
  const fallback: WhenUnset = process.env.NODE_ENV === "development" ? "open" : "closed"
  return (options.whenUnset ?? fallback) === "open" ? "open" : "unconfigured"
}

const protectHeaders = (headers: Headers): Headers => {
  headers.set("Cache-Control", NO_STORE)
  headers.set("X-Robots-Tag", NOINDEX)
  return headers
}

const sleep = (ms: number): Promise<void> =>
  ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve()

const redirect = (location: URL, status: 303 | 307, extra?: HeadersInit): Response => {
  const headers = protectHeaders(new Headers(extra))
  headers.set("Location", location.toString())
  return new Response(null, { status, headers })
}

const json = (body: unknown, status: number, extra?: HeadersInit): Response => {
  const headers = protectHeaders(new Headers(extra))
  headers.set("Content-Type", "application/json; charset=utf-8")
  return new Response(JSON.stringify(body), { status, headers })
}

const isApiPath = (pathname: string): boolean =>
  pathname === "/api" || pathname.startsWith("/api/")

interface Submission {
  kind: "form" | "json"
  code: string
  next: unknown
}

const readSubmission = async (request: Request): Promise<Submission | null> => {
  const type = request.headers.get("content-type")?.toLowerCase() ?? ""
  try {
    if (type.includes("application/json")) {
      const body = (await request.json()) as { code?: unknown; next?: unknown } | null
      const code = typeof body?.code === "string" ? body.code : ""
      return { kind: "json", code, next: body?.next }
    }
    if (type.includes("application/x-www-form-urlencoded") || type.includes("multipart/form-data")) {
      const form = await request.formData()
      const code = form.get("code")
      return { kind: "form", code: typeof code === "string" ? code : "", next: form.get("next") }
    }
  } catch {
    return { kind: type.includes("json") ? "json" : "form", code: "", next: undefined }
  }
  return null
}

export const createAccessGate = (options: AccessGateOptions): AccessGate => {
  const caseSensitive = options.caseSensitive ?? false
  const codes = parseCodes(options.codes, caseSensitive)
  const paths: GatePaths = {
    page: normalisePath(options.paths?.page ?? DEFAULT_PATHS.page),
    verify: normalisePath(options.paths?.verify ?? DEFAULT_PATHS.verify),
    logout: normalisePath(options.paths?.logout ?? DEFAULT_PATHS.logout),
  }
  const allow = options.allow ?? []
  const maxAge = Math.max(60, Math.floor(options.maxAge ?? 30 * DAY_SECONDS))
  const publicMetadataImages = resolveMetadataImages(options.publicMetadataImages)
  const failureDelayMs = options.failureDelayMs ?? 400
  const secret = options.secret?.trim() || undefined
  const status = resolveStatus(codes, options)

  if (status === "active") {
    if (secret !== undefined && secret.length < MIN_SECRET_LENGTH) {
      warnOnce(`ACCESS_GATE_SECRET is shorter than ${MIN_SECRET_LENGTH} characters.`)
    }
    if (codes.some((code) => [...code].length < MIN_CODE_LENGTH)) {
      warnOnce(
        `at least one access code is shorter than ${MIN_CODE_LENGTH} characters; three random words are recommended.`,
      )
    }
  }

  let keyMaterial: Promise<{ key: CryptoKey; kids: string[] }> | undefined
  const material = () => {
    keyMaterial ??= (async () => {
      const key = secret
        ? await deriveHmacKey(secret, "v1:secret")
        : await deriveHmacKey([...codes].sort().join("\n"), "v1:codes")
      const kids = await Promise.all(codes.map((code) => keyId(key, code)))
      return { key, kids }
    })()
    return keyMaterial
  }

  const isAuthenticated = async (request: RequestLike): Promise<boolean> => {
    if (status !== "active") return status === "open" || status === "disabled"
    const { key, kids } = await material()
    const token = readCookie(request, cookieNameFor(request))
    return verifyToken(key, token, kids, Math.floor(Date.now() / 1000))
  }

  const pageUrl = (request: Request, params: Record<string, string>): URL => {
    const url = new URL(paths.page, request.url)
    for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value)
    return url
  }

  const unconfigured = (request: Request): Response => {
    const pathname = new URL(request.url).pathname
    if (isApiPath(pathname) || request.headers.get("accept")?.includes("application/json")) {
      return json({ error: "access_gate_not_configured" }, 503)
    }
    const headers = protectHeaders(new Headers({ "Content-Type": "text/html; charset=utf-8" }))
    return new Response(unconfiguredHtml, { status: 503, headers })
  }

  const forbidden = (request: Request): Response => {
    const pathname = new URL(request.url).pathname
    if (isApiPath(pathname) || request.headers.get("accept")?.includes("application/json")) {
      return json({ error: "forbidden" }, 403)
    }
    const headers = protectHeaders(new Headers({ "Content-Type": "text/plain; charset=utf-8" }))
    return new Response("Forbidden", { status: 403, headers })
  }

  /**
   * Paths that skip the cookie check are for reading only. A server action is a
   * POST to whatever page imports it, carrying its id either in a `Next-Action`
   * header or, without JavaScript, in the form body; any page reachable without
   * a cookie (the gate page above all, since it shares the root layout) would
   * otherwise run it anonymously. So anonymous requests to those paths must be
   * GET or HEAD without `Next-Action`, apart from the gate's own two POSTs.
   */
  const runsServerCode = (request: NextRequest, path: string, internal: boolean): boolean => {
    if (request.headers.has("next-action")) return true
    if (internal || SAFE_METHODS.has(request.method)) return false
    return !(request.method === "POST" && (path === paths.verify || path === paths.logout))
  }

  const proxy = async (request: NextRequest): Promise<Response> => {
    if (status === "disabled" || status === "open") return NextResponse.next()
    const { pathname, search } = request.nextUrl
    const internal = pathname.startsWith("/_next/")
    if (status === "unconfigured") return internal ? NextResponse.next() : unconfigured(request)

    const path = normalisePath(pathname)
    const gatePath = path === paths.page || path === paths.verify || path === paths.logout
    const publicPath = internal || gatePath || isPublicPath(path, { paths, allow, publicMetadataImages })
    if (publicPath) {
      if (runsServerCode(request, path, internal) && !(await isAuthenticated(request))) {
        return forbidden(request)
      }
      return gatePath ? NextResponse.next({ headers: protectHeaders(new Headers()) }) : NextResponse.next()
    }

    if (await isAuthenticated(request)) {
      return NextResponse.next({ headers: protectHeaders(new Headers()) })
    }
    if (isApiPath(pathname)) return json({ error: "unauthorised" }, 401)
    return redirect(pageUrl(request, { next: `${pathname}${search}` }), 307)
  }

  const verify = async (request: Request): Promise<Response> => {
    if (status === "unconfigured") return unconfigured(request)
    const submission = await readSubmission(request)
    if (!submission) return json({ ok: false, error: "unsupported_media_type" }, 415)
    const next = safeNext(submission.next, paths)

    if (status !== "active") {
      return submission.kind === "json"
        ? json({ ok: true, next }, 200)
        : redirect(new URL(next, request.url), 303)
    }

    const { key, kids } = await material()
    const matched =
      submission.code.length > 0 && submission.code.length <= MAX_CODE_LENGTH
        ? await matchCode(key, submission.code, codes, caseSensitive)
        : null

    if (matched === null) {
      await sleep(failureDelayMs)
      return submission.kind === "json"
        ? json({ ok: false, error: "invalid_code" }, 401)
        : redirect(pageUrl(request, { error: "1", next }), 303)
    }

    const kid = kids[codes.indexOf(matched)]!
    const exp = Math.floor(Date.now() / 1000) + maxAge
    const cookie = serialiseCookie(request, await createToken(key, kid, exp), maxAge)
    return submission.kind === "json"
      ? json({ ok: true, next }, 200, { "Set-Cookie": cookie })
      : redirect(new URL(next, request.url), 303, { "Set-Cookie": cookie })
  }

  const logout = async (request: Request): Promise<Response> =>
    redirect(pageUrl(request, {}), 303, { "Set-Cookie": serialiseCookie(request, "", 0) })

  return { paths, status, proxy, verify, logout, isAuthenticated }
}
