import { describe, expect, it } from "vitest"
import { DEFAULT_PATHS, isPublicPath, safeNext } from "../src/paths.js"

describe("safeNext", () => {
  it.each([
    ["/dashboard", "/dashboard"],
    ["/deck?slide=3#notes", "/deck?slide=3#notes"],
    ["/", "/"],
    ["/a/../b", "/b"],
  ])("keeps the same-site path %s", (input, expected) => {
    expect(safeNext(input)).toBe(expected)
  })

  it.each([
    "//evil.example",
    "/\\evil.example",
    "\\\\evil.example",
    "https://evil.example/",
    "http:/evil.example",
    "javascript:alert(1)",
    "evil.example",
    "",
    "/\tevil",
    "/%0d%0aSet-Cookie:x",
    undefined,
    null,
    42,
    ["/dashboard"],
  ])("rejects %j", (input) => {
    const result = safeNext(input)
    expect(result.startsWith("/")).toBe(true)
    expect(result.startsWith("//")).toBe(false)
    if (input !== "/%0d%0aSet-Cookie:x") expect(result).toBe("/")
  })

  it("never redirects back into the gate itself", () => {
    expect(safeNext("/access/verify")).toBe("/")
    expect(safeNext("/access/logout")).toBe("/")
    expect(safeNext("/access")).toBe("/")
  })

  it("supports a custom fallback", () => {
    expect(safeNext("//evil", DEFAULT_PATHS, "/home")).toBe("/home")
  })
})

describe("isPublicPath", () => {
  const options = { paths: DEFAULT_PATHS, allow: ["/og", "/api/health", /^\/press\//], publicMetadataImages: true }

  it.each([
    "/_next/static/chunk.js",
    "/access",
    "/access/",
    "/access/verify",
    "/access/logout",
    "/favicon.ico",
    "/robots.txt",
    "/opengraph-image",
    "/opengraph-image.png",
    "/blog/opengraph-image-1a2b3c",
    "/twitter-image",
    "/icon",
    "/icon.svg",
    "/icon1.png",
    "/apple-icon.png",
    "/icon/small",
    "/og",
    "/og/cover",
    "/api/health",
    "/press/kit",
  ])("treats %s as public", (path) => {
    expect(isPublicPath(path, options)).toBe(true)
  })

  it.each([
    "/",
    "/dashboard",
    "/access-denied",
    "/access/other",
    "/ogre",
    "/api/healthy",
    "/api/secret",
    "/iconography",
    "/press",
    "/_nextish",
    "/%5Fnext/static/x.js",
  ])("gates %s", (path) => {
    expect(isPublicPath(path, options)).toBe(false)
  })

  it("can keep metadata images behind the wall", () => {
    expect(isPublicPath("/opengraph-image", { ...options, publicMetadataImages: false })).toBe(false)
    expect(isPublicPath("/icon.png", { ...options, publicMetadataImages: false })).toBe(false)
  })

  it("treats an allow entry of / as the home page only", () => {
    const home = { ...options, allow: ["/"] }
    expect(isPublicPath("/", home)).toBe(true)
    expect(isPublicPath("/dashboard", home)).toBe(false)
  })
})
