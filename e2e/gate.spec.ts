import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { expect, test } from "@playwright/test"
import { E2E_CODE } from "../playwright.config.js"

test.describe("access gate", () => {
  test("redirects an anonymous visitor to the gate and keeps next", async ({ page }) => {
    const response = await page.goto("/deck?slide=4")
    expect(response?.status()).toBe(200)
    await expect(page).toHaveURL(/\/access\?next=%2Fdeck%3Fslide%3D4$/)
    await expect(page.getByRole("heading", { name: "Acme Orbit, private preview" })).toBeVisible()
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow")
    expect(response?.headers()["x-robots-tag"]).toBe("noindex, nofollow")
  })

  test("shows an error for a wrong code and stays on the gate", async ({ page }) => {
    await page.goto("/deck")
    await page.getByLabel("Access code").fill("not-the-code")
    await page.getByRole("button", { name: "Continue" }).click()
    await expect(page).toHaveURL(/\/access\?error=1&next=%2Fdeck$/)
    await expect(page.getByRole("alert").filter({ hasText: "did not work" })).toBeVisible()
    const cookies = await page.context().cookies()
    expect(cookies.find((cookie) => cookie.name === "access-gate")).toBeUndefined()
  })

  test.describe("without JavaScript", () => {
    test.use({ javaScriptEnabled: false })

    test("lets the right code in and lands on next", async ({ page }) => {
      await page.goto("/deck?slide=7")
      await page.getByLabel("Access code").fill(E2E_CODE.toUpperCase())
      await page.getByRole("button", { name: "Continue" }).click()
      await expect(page).toHaveURL(/\/deck\?slide=7$/)
      await expect(page.getByRole("heading", { name: "Launch deck" })).toBeVisible()
      await expect(page.getByText("Slide 7 of 12")).toBeVisible()
      const cookie = (await page.context().cookies()).find((entry) => entry.name === "access-gate")
      expect(cookie?.httpOnly).toBe(true)
      expect(cookie?.sameSite).toBe("Lax")
      expect(cookie?.value).toMatch(/^v1\./)
    })
  })

  test("logs out and walls the app again", async ({ page }) => {
    await page.goto("/")
    await page.getByLabel("Access code").fill(E2E_CODE)
    await page.getByRole("button", { name: "Continue" }).click()
    await expect(page.getByRole("heading", { name: "Acme Orbit" })).toBeVisible()
    await page.getByRole("button", { name: "Sign out" }).click()
    await expect(page).toHaveURL(/\/access$/)
    await page.goto("/deck")
    await expect(page).toHaveURL(/\/access\?next=%2Fdeck$/)
  })

  test("guards APIs with 401 and leaves allowed paths public", async ({ request }) => {
    const secret = await request.get("/api/secret", { maxRedirects: 0 })
    expect(secret.status()).toBe(401)
    expect(await secret.json()).toEqual({ error: "unauthorised" })
    const health = await request.get("/api/health", { maxRedirects: 0 })
    expect(health.status()).toBe(200)
  })

  test("gates dynamic segments that look like assets and keeps root metadata images public", async ({ request }) => {
    for (const path of ["/files/report.png", "/files/icon", "/files/q3.txt", "/files/opengraph-image"]) {
      const response = await request.get(path, { maxRedirects: 0 })
      expect(response.status(), path).toBe(307)
      expect(response.headers().location, path).toContain("/access?next=")
    }
    const preview = await request.get("/opengraph-image", { maxRedirects: 0 })
    expect(preview.status()).toBe(200)
    expect(preview.headers()["content-type"]).toBe("image/png")
  })

  test("refuses anonymous server action calls on the gate page", async ({ request }) => {
    const action = await request.post("/access", {
      headers: { "Next-Action": "0123456789abcdef0123456789abcdef01234567", "Content-Type": "text/plain;charset=UTF-8" },
      data: "[]",
      maxRedirects: 0,
    })
    expect(action.status()).toBe(403)
    const form = await request.post("/access", { form: { $ACTION_ID_0123: "" }, maxRedirects: 0 })
    expect(form.status()).toBe(403)
    const allowed = await request.post("/api/health", { maxRedirects: 0 })
    expect(allowed.status()).toBe(403)
  })

  test("keeps protected static pages out of shared caches", async ({ request }) => {
    const signIn = await request.post("/access/verify", { form: { code: E2E_CODE, next: "/" }, maxRedirects: 0 })
    expect(signIn.status()).toBe(303)
    const home = await request.get("/", { maxRedirects: 0 })
    expect(home.status()).toBe(200)
    expect(await home.text()).toContain("Acme Orbit")
    const cacheControl = home.headers()["cache-control"] ?? ""
    expect(cacheControl).toContain("private")
    expect(cacheControl).toContain("no-store")
    expect(cacheControl).not.toContain("s-maxage")
    const gatePage = await request.get("/access", { maxRedirects: 0 })
    expect(gatePage.headers()["cache-control"]).toContain("no-store")
  })

  test("rejects an open redirect in next", async ({ request }) => {
    const response = await request.post("/access/verify", {
      form: { code: E2E_CODE, next: "//evil.example/steal" },
      maxRedirects: 0,
    })
    expect(response.status()).toBe(303)
    expect(new URL(response.headers().location!).host).toMatch(/^localhost:/)
    expect(new URL(response.headers().location!).pathname).toBe("/")
  })

  test("never ships the codes or the secret to the browser", () => {
    const staticDir = join(import.meta.dirname, "..", "example", ".next", "static")
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((name) => {
        const path = join(dir, name)
        return statSync(path).isDirectory() ? walk(path) : [path]
      })
    const files = walk(staticDir)
    expect(files.length).toBeGreaterThan(0)
    for (const file of files) {
      const source = readFileSync(file, "utf8")
      expect(source, file).not.toContain(E2E_CODE)
      expect(source, file).not.toContain("ACCESS_GATE_")
      expect(source, file).not.toContain("an-example-secret-used-only-by-the-e2e-suite")
    }
  })
})
