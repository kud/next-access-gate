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
