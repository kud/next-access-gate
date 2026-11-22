import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { AccessGatePage, type AccessGatePageProps } from "../src/page.js"
import { DEFAULT_PATHS } from "../src/paths.js"

const render = async (props: Partial<AccessGatePageProps> = {}) =>
  renderToStaticMarkup(await AccessGatePage({ gate: { paths: DEFAULT_PATHS }, ...props }))

describe("AccessGatePage", () => {
  it("renders a plain form posting to verify with a hidden next", async () => {
    const html = await render({ searchParams: Promise.resolve({ next: "/deck?slide=2" }) })
    expect(html).toMatch(/<form class="nag-form"[^>]*action="\/access\/verify"/)
    expect(html).toMatch(/<form[^>]*method="post"/)
    expect(html).toContain('<input type="hidden" name="next" value="/deck?slide=2"/>')
    expect(html).toContain('name="code"')
    expect(html).toContain('<meta name="robots" content="noindex, nofollow"/>')
    expect(html).toContain("<style>")
    expect(html).not.toContain("<script")
    expect(html).not.toContain('role="alert"')
  })

  it("sanitises next from the query string", async () => {
    const html = await render({ searchParams: Promise.resolve({ next: "//evil.example" }) })
    expect(html).toContain('name="next" value="/"')
  })

  it("shows the error state", async () => {
    const html = await render({ searchParams: { error: "1" } })
    expect(html).toContain('role="alert"')
    expect(html).toContain('aria-invalid="true"')
  })

  it("supports French copy and per-string overrides", async () => {
    const html = await render({ locale: "fr", copy: { submitLabel: "Entrer" }, title: "Démo Acme" })
    expect(html).toContain("Démo Acme")
    expect(html).toContain("Code d’accès")
    expect(html).toContain("Entrer")
    expect(html).toContain('lang="fr"')
  })

  it("maps theme tokens to CSS custom properties", async () => {
    const html = await render({ theme: { accent: "#0a7", radius: "4px" } })
    expect(html).toContain("--nag-accent:#0a7")
    expect(html).toContain("--nag-radius:4px")
  })

  it("follows custom paths", async () => {
    const html = await render({ gate: { paths: { page: "/enter", verify: "/enter/check", logout: "/enter/out" } } })
    expect(html).toContain('action="/enter/check"')
  })
})
