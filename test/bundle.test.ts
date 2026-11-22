import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { beforeAll, describe, expect, it } from "vitest"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const dist = resolve(root, "dist")

const collect = (entry: string, seen = new Set<string>()): Set<string> => {
  if (seen.has(entry)) return seen
  seen.add(entry)
  const source = readFileSync(entry, "utf8")
  for (const match of source.matchAll(/from\s+"(\.\/[^"]+)"/g)) {
    collect(resolve(dirname(entry), match[1]!), seen)
  }
  return seen
}

describe("published client and page entries", () => {
  beforeAll(() => {
    execFileSync("npx", ["tsc", "-p", "tsconfig.build.json"], { cwd: root, stdio: "inherit" })
  }, 60_000)

  it.each(["client.js", "page.js"])("%s and its imports never read access gate env vars", (entry) => {
    for (const file of collect(resolve(dist, entry))) {
      const source = readFileSync(file, "utf8")
      expect(source, file).not.toContain("process.env.ACCESS_GATE")
      expect(source, file).not.toContain("ACCESS_GATE_")
      expect(source, file).not.toMatch(/from "\.\/(gate|crypto|codes|token)\.js"/)
    }
  })

  it("keeps the use client directive on the client entry", () => {
    expect(readFileSync(resolve(dist, "client.js"), "utf8").startsWith('"use client"')).toBe(true)
  })
})
