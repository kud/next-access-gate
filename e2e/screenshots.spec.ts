import { join } from "node:path"
import { test } from "@playwright/test"

const outputDir = join(import.meta.dirname, "..", "docs")

test.describe("screenshots", () => {
  test.skip(!process.env.SCREENSHOTS, "set SCREENSHOTS=1 to regenerate the README images")

  for (const colorScheme of ["light", "dark"] as const) {
    test.describe(colorScheme, () => {
      test.use({ colorScheme, deviceScaleFactor: 2, viewport: { width: 960, height: 640 } })

      test(`gate page in ${colorScheme}`, async ({ page }) => {
        await page.goto("/deck")
        await page.locator(".nag-input").blur()
        await page.screenshot({ path: join(outputDir, `gate-${colorScheme}.png`) })
      })
    })
  }
})
