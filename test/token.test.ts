import { describe, expect, it } from "vitest"
import { keyId, matchCode, parseCodes } from "../src/codes.js"
import { deriveHmacKey } from "../src/crypto.js"
import { createToken, verifyToken } from "../src/token.js"

const now = 1_800_000_000

const setup = async (codes = ["velvet-harbour-lantern", "quiet-orchard-signal"]) => {
  const key = await deriveHmacKey("a-demo-secret-that-is-long-enough-123", "v1:secret")
  const kids = await Promise.all(codes.map((code) => keyId(key, code)))
  return { key, kids, codes }
}

describe("token", () => {
  it("round-trips a valid token", async () => {
    const { key, kids } = await setup()
    const token = await createToken(key, kids[0]!, now + 60)
    expect(token).toMatch(/^v1\.[A-Za-z0-9_-]{11}\.\d+\.[A-Za-z0-9_-]{43}$/)
    expect(await verifyToken(key, token, kids, now)).toBe(true)
  })

  it("rejects an expired token", async () => {
    const { key, kids } = await setup()
    const token = await createToken(key, kids[0]!, now - 1)
    expect(await verifyToken(key, token, kids, now)).toBe(false)
    const boundary = await createToken(key, kids[0]!, now)
    expect(await verifyToken(key, boundary, kids, now)).toBe(false)
  })

  it("rejects a tampered expiry, kid or signature", async () => {
    const { key, kids } = await setup()
    const token = await createToken(key, kids[0]!, now + 60)
    const [version, kid, exp, sig] = token.split(".") as [string, string, string, string]
    expect(await verifyToken(key, [version, kid, String(Number(exp) + 1000), sig].join("."), kids, now)).toBe(false)
    expect(await verifyToken(key, [version, kids[1], exp, sig].join("."), kids, now)).toBe(false)
    const flipped = sig.slice(0, -1) + (sig.endsWith("A") ? "B" : "A")
    expect(await verifyToken(key, [version, kid, exp, flipped].join("."), kids, now)).toBe(false)
    expect(await verifyToken(key, [version, kid, `0${exp}`, sig].join("."), kids, now)).toBe(false)
  })

  it("rejects another version or a malformed token", async () => {
    const { key, kids } = await setup()
    const token = await createToken(key, kids[0]!, now + 60)
    expect(await verifyToken(key, token.replace(/^v1/, "v2"), kids, now)).toBe(false)
    expect(await verifyToken(key, undefined, kids, now)).toBe(false)
    expect(await verifyToken(key, "", kids, now)).toBe(false)
    expect(await verifyToken(key, "v1.a.b", kids, now)).toBe(false)
    expect(await verifyToken(key, `${token}.extra`, kids, now)).toBe(false)
  })

  it("rejects a token signed with another key", async () => {
    const { key, kids } = await setup()
    const other = await deriveHmacKey("another-demo-secret-that-is-long-enough", "v1:secret")
    const token = await createToken(other, kids[0]!, now + 60)
    expect(await verifyToken(key, token, kids, now)).toBe(false)
  })

  it("revokes exactly the sessions of a removed code", async () => {
    const { key, kids } = await setup()
    const first = await createToken(key, kids[0]!, now + 60)
    const second = await createToken(key, kids[1]!, now + 60)
    const remaining = [kids[1]!]
    expect(await verifyToken(key, first, remaining, now)).toBe(false)
    expect(await verifyToken(key, second, remaining, now)).toBe(true)
  })
})

describe("codes", () => {
  it("parses a comma-separated list, trimming and dropping empties", () => {
    expect(parseCodes(" Alpha-One , ,beta-two,, alpha-one ", false)).toEqual(["alpha-one", "beta-two"])
    expect(parseCodes(" Alpha-One , ,beta-two,, alpha-one ", true)).toEqual(["Alpha-One", "beta-two", "alpha-one"])
    expect(parseCodes(undefined, false)).toEqual([])
    expect(parseCodes("", false)).toEqual([])
    expect(parseCodes(["a", " b "], false)).toEqual(["a", "b"])
  })

  it("matches any of several codes", async () => {
    const { key, codes } = await setup()
    expect(await matchCode(key, "velvet-harbour-lantern", codes, false)).toBe("velvet-harbour-lantern")
    expect(await matchCode(key, "quiet-orchard-signal", codes, false)).toBe("quiet-orchard-signal")
    expect(await matchCode(key, "nope", codes, false)).toBeNull()
    expect(await matchCode(key, "", codes, false)).toBeNull()
  })

  it("folds case by default and honours caseSensitive", async () => {
    const key = await deriveHmacKey("a-demo-secret-that-is-long-enough-123", "v1:secret")
    const insensitive = parseCodes("Velvet-Harbour-Lantern", false)
    expect(await matchCode(key, "  VELVET-harbour-LANTERN ", insensitive, false)).toBe("velvet-harbour-lantern")
    const sensitive = parseCodes("Velvet-Harbour-Lantern", true)
    expect(await matchCode(key, "velvet-harbour-lantern", sensitive, true)).toBeNull()
    expect(await matchCode(key, "Velvet-Harbour-Lantern", sensitive, true)).toBe("Velvet-Harbour-Lantern")
  })

  it("derives distinct, stable key ids per code", async () => {
    const { key, kids } = await setup()
    expect(kids[0]).not.toEqual(kids[1])
    expect(await keyId(key, "velvet-harbour-lantern")).toEqual(kids[0])
  })
})
