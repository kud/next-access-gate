import { NextRequest } from "next/server.js"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createAccessGate, type AccessGateOptions } from "../src/index.js"

const CODE = "velvet-harbour-lantern"
const SECRET = "a-demo-secret-that-is-long-enough-123"
const ORIGIN = "https://demo.acme.test"

const gateWith = (overrides: Partial<AccessGateOptions> = {}) =>
  createAccessGate({
    codes: `${CODE}, quiet-orchard-signal`,
    secret: SECRET,
    allow: ["/og", "/api/health"],
    failureDelayMs: 0,
    ...overrides,
  })

const get = (path: string, init: { cookie?: string; origin?: string } = {}) =>
  new NextRequest(`${init.origin ?? ORIGIN}${path}`, {
    headers: init.cookie ? { cookie: init.cookie } : {},
  })

const postForm = (fields: Record<string, string>, origin = ORIGIN) =>
  new Request(`${origin}/access/verify`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields).toString(),
  })

const postJson = (body: unknown, origin = ORIGIN) =>
  new Request(`${origin}/access/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })

const cookiePair = (response: Response): string => {
  const header = response.headers.get("set-cookie")
  if (!header) throw new Error("no cookie set")
  return header.split(";")[0]!
}

const isNext = (response: Response) => response.headers.get("x-middleware-next") === "1"

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe("proxy", () => {
  it("redirects an anonymous page request to the gate with next", async () => {
    const response = await gateWith().proxy(get("/deck?slide=3"))
    expect(response.status).toBe(307)
    const location = new URL(response.headers.get("location")!)
    expect(location.pathname).toBe("/access")
    expect(location.searchParams.get("next")).toBe("/deck?slide=3")
    expect(response.headers.get("cache-control")).toBe("no-store")
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow")
  })

  it("answers anonymous API requests with 401 JSON", async () => {
    const response = await gateWith().proxy(get("/api/secret"))
    expect(response.status).toBe(401)
    expect(response.headers.get("content-type")).toContain("application/json")
    expect(await response.json()).toEqual({ error: "unauthorised" })
  })

  it("lets public and allowed paths through", async () => {
    const gate = gateWith()
    for (const path of ["/_next/static/a.js", "/favicon.ico", "/robots.txt", "/opengraph-image", "/og", "/api/health"]) {
      expect(isNext(await gate.proxy(get(path))), path).toBe(true)
    }
  })

  it("marks the gate's own routes noindex and no-store", async () => {
    const response = await gateWith().proxy(get("/access"))
    expect(isNext(response)).toBe(true)
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow")
    expect(response.headers.get("cache-control")).toBe("no-store")
  })

  it("rejects a forged cookie", async () => {
    const response = await gateWith().proxy(get("/", { cookie: "__Host-access-gate=v1.AAAAAAAAAAA.9999999999.forged" }))
    expect(response.status).toBe(307)
  })
})

describe("verify and cookie round-trip", () => {
  it("accepts a form post, sets a __Host- cookie and 303s to next", async () => {
    const gate = gateWith()
    const response = await gate.verify(postForm({ code: CODE, next: "/deck?slide=3" }))
    expect(response.status).toBe(303)
    expect(response.headers.get("location")).toBe(`${ORIGIN}/deck?slide=3`)
    const cookie = response.headers.get("set-cookie")!
    expect(cookie).toMatch(/^__Host-access-gate=v1\./)
    expect(cookie).toContain("Path=/")
    expect(cookie).toContain("HttpOnly")
    expect(cookie).toContain("SameSite=Lax")
    expect(cookie).toContain("Secure")
    expect(cookie).toContain(`Max-Age=${30 * 24 * 60 * 60}`)
    expect(cookie).not.toContain("Domain")
    expect(response.headers.get("cache-control")).toBe("no-store")

    const through = await gate.proxy(get("/deck", { cookie: cookiePair(response) }))
    expect(isNext(through)).toBe(true)
    expect(through.headers.get("x-robots-tag")).toBe("noindex, nofollow")
    expect(await gate.isAuthenticated(get("/deck", { cookie: cookiePair(response) }))).toBe(true)
  })

  it("uses a non-prefixed, non-secure cookie on http://localhost", async () => {
    const gate = gateWith()
    const response = await gate.verify(postForm({ code: CODE, next: "/" }, "http://localhost:3000"))
    const cookie = response.headers.get("set-cookie")!
    expect(cookie).toMatch(/^access-gate=v1\./)
    expect(cookie).not.toContain("Secure")
    const through = await gate.proxy(get("/", { cookie: cookiePair(response), origin: "http://localhost:3000" }))
    expect(isNext(through)).toBe(true)
  })

  it("sends a wrong form code back to the page with error and next", async () => {
    const response = await gateWith().verify(postForm({ code: "wrong", next: "/deck" }))
    expect(response.status).toBe(303)
    const location = new URL(response.headers.get("location")!)
    expect(location.pathname).toBe("/access")
    expect(location.searchParams.get("error")).toBe("1")
    expect(location.searchParams.get("next")).toBe("/deck")
    expect(response.headers.get("set-cookie")).toBeNull()
  })

  it("sanitises an unsafe next", async () => {
    const response = await gateWith().verify(postForm({ code: CODE, next: "//evil.example/x" }))
    expect(response.headers.get("location")).toBe(`${ORIGIN}/`)
  })

  it("speaks JSON", async () => {
    const gate = gateWith()
    const ok = await gate.verify(postJson({ code: "QUIET-orchard-signal", next: "/deck" }))
    expect(ok.status).toBe(200)
    expect(await ok.json()).toEqual({ ok: true, next: "/deck" })
    expect(isNext(await gate.proxy(get("/deck", { cookie: cookiePair(ok) })))).toBe(true)

    const bad = await gate.verify(postJson({ code: "nope" }))
    expect(bad.status).toBe(401)
    expect(await bad.json()).toEqual({ ok: false, error: "invalid_code" })

    const malformed = await gate.verify(
      new Request(`${ORIGIN}/access/verify`, { method: "POST", headers: { "content-type": "application/json" }, body: "{" }),
    )
    expect(malformed.status).toBe(401)
  })

  it("refuses other content types", async () => {
    const response = await gateWith().verify(
      new Request(`${ORIGIN}/access/verify`, { method: "POST", headers: { "content-type": "text/plain" }, body: CODE }),
    )
    expect(response.status).toBe(415)
  })

  it("waits a fixed delay on a wrong code", async () => {
    const gate = gateWith({ failureDelayMs: 400 })
    const started = performance.now()
    await gate.verify(postJson({ code: "nope" }))
    expect(performance.now() - started).toBeGreaterThanOrEqual(390)
  })

  it("revokes sessions of a removed code only", async () => {
    const before = gateWith()
    const first = cookiePair(await before.verify(postForm({ code: CODE })))
    const second = cookiePair(await before.verify(postForm({ code: "quiet-orchard-signal" })))
    const after = gateWith({ codes: "quiet-orchard-signal" })
    expect((await after.proxy(get("/", { cookie: first }))).status).toBe(307)
    expect(isNext(await after.proxy(get("/", { cookie: second })))).toBe(true)
  })

  it("logs out by clearing the cookie", async () => {
    const response = await gateWith().logout(new Request(`${ORIGIN}/access/logout`, { method: "POST" }))
    expect(response.status).toBe(303)
    expect(new URL(response.headers.get("location")!).pathname).toBe("/access")
    expect(response.headers.get("set-cookie")).toMatch(/^__Host-access-gate=; .*Max-Age=0/)
    expect(response.headers.get("cache-control")).toBe("no-store")
  })
})

describe("keys", () => {
  it("keeps sessions across instances with the same secret", async () => {
    const cookie = cookiePair(await gateWith().verify(postForm({ code: CODE })))
    expect(isNext(await gateWith().proxy(get("/", { cookie })))).toBe(true)
  })

  it("invalidates sessions when the secret changes", async () => {
    const cookie = cookiePair(await gateWith().verify(postForm({ code: CODE })))
    const rotated = gateWith({ secret: "another-demo-secret-that-is-long-enough" })
    expect((await rotated.proxy(get("/", { cookie }))).status).toBe(307)
  })

  it("derives a key from the codes when no secret is set", async () => {
    const derived = gateWith({ secret: undefined })
    const cookie = cookiePair(await derived.verify(postForm({ code: CODE })))
    expect(isNext(await gateWith({ secret: undefined }).proxy(get("/", { cookie })))).toBe(true)
    expect((await gateWith().proxy(get("/", { cookie }))).status).toBe(307)
    const changed = gateWith({ secret: undefined, codes: `${CODE}, a-brand-new-code` })
    expect((await changed.proxy(get("/", { cookie }))).status).toBe(307)
  })

  it("warns about a short secret and short codes", () => {
    const warn = vi.mocked(console.warn)
    createAccessGate({ codes: "shorty", secret: "short-secret" })
    const messages = warn.mock.calls.map((call) => String(call[0])).join("\n")
    expect(messages).toContain("ACCESS_GATE_SECRET is shorter")
    expect(messages).toContain("shorter than 10 characters")
    expect(messages).not.toContain("shorty")
  })
})

describe("when unset", () => {
  it("closes by default outside development", async () => {
    vi.stubEnv("NODE_ENV", "production")
    const gate = createAccessGate({ codes: undefined })
    expect(gate.status).toBe("unconfigured")
    const page = await gate.proxy(get("/"))
    expect(page.status).toBe(503)
    expect(await page.text()).toContain("Access gate not configured")
    expect(page.headers.get("x-robots-tag")).toBe("noindex, nofollow")
    expect((await gate.proxy(get("/access"))).status).toBe(503)
    expect((await gate.proxy(get("/api/x"))).status).toBe(503)
    expect(isNext(await gate.proxy(get("/_next/static/a.js")))).toBe(true)
    expect((await gate.verify(postForm({ code: "anything" }))).status).toBe(503)
  })

  it("opens by default in development", async () => {
    vi.stubEnv("NODE_ENV", "development")
    const gate = createAccessGate({ codes: " , " })
    expect(gate.status).toBe("open")
    expect(isNext(await gate.proxy(get("/")))).toBe(true)
  })

  it("honours an explicit whenUnset in both directions", async () => {
    vi.stubEnv("NODE_ENV", "development")
    expect(createAccessGate({ codes: "", whenUnset: "closed" }).status).toBe("unconfigured")
    vi.stubEnv("NODE_ENV", "production")
    const open = createAccessGate({ codes: "", whenUnset: "open" })
    expect(open.status).toBe("open")
    expect(isNext(await open.proxy(get("/dashboard")))).toBe(true)
  })

  it("is disabled outside enabledIn environments", async () => {
    vi.stubEnv("VERCEL_ENV", "preview")
    const gate = gateWith({ enabledIn: ["production"] })
    expect(gate.status).toBe("disabled")
    expect(isNext(await gate.proxy(get("/")))).toBe(true)
    vi.stubEnv("VERCEL_ENV", "production")
    expect(gateWith({ enabledIn: ["production"] }).status).toBe("active")
  })
})
