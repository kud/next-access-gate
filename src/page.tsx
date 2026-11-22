import type { ReactNode } from "react"
import { COPY, type AccessGateCopy, type Locale } from "./copy.js"
import { DEFAULT_PATHS, safeNext, type GatePaths } from "./paths.js"
import { css, themeToStyle, type AccessGateTheme } from "./styles.js"

export type { AccessGateCopy, Locale } from "./copy.js"
export type { AccessGateTheme } from "./styles.js"

type SearchParams = Record<string, string | string[] | undefined>

export interface AccessGatePageProps {
  gate: { readonly paths: Readonly<GatePaths> }
  searchParams?: Promise<SearchParams> | SearchParams
  locale?: Locale
  copy?: Partial<AccessGateCopy>
  title?: ReactNode
  description?: ReactNode
  logo?: ReactNode
  label?: ReactNode
  placeholder?: string
  submitLabel?: ReactNode
  errorText?: ReactNode
  theme?: Partial<AccessGateTheme>
  className?: string
}

const first = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value

const LockMark = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    <path d="M12 14.5v2" />
  </svg>
)

export const AccessGatePage = async ({
  gate,
  searchParams,
  locale = "en",
  copy,
  title,
  description,
  logo,
  label,
  placeholder,
  submitLabel,
  errorText,
  theme,
  className,
}: AccessGatePageProps) => {
  const params: SearchParams = (await searchParams) ?? {}
  const paths = gate.paths ?? DEFAULT_PATHS
  const next = safeNext(first(params.next), paths)
  const hasError = first(params.error) === "1"
  const text: AccessGateCopy = { ...COPY[locale], ...copy }
  const resolvedPlaceholder = placeholder ?? text.placeholder

  return (
    <div className={className ? `nag-root ${className}` : "nag-root"} style={themeToStyle(theme)} lang={locale}>
      <meta name="robots" content="noindex, nofollow" />
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <main className="nag-main">
        <div className="nag-mark">{logo ?? <LockMark />}</div>
        <h1 className="nag-title">{title ?? text.title}</h1>
        <p className="nag-description">{description ?? text.description}</p>
        <form className="nag-form" method="post" action={paths.verify}>
          <input type="hidden" name="next" value={next} />
          <label className="nag-label" htmlFor="nag-code">
            {label ?? text.label}
          </label>
          <input
            className="nag-input"
            id="nag-code"
            name="code"
            type="password"
            required
            autoFocus
            autoComplete="current-password"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={512}
            placeholder={resolvedPlaceholder || undefined}
            aria-invalid={hasError ? true : undefined}
            aria-describedby={hasError ? "nag-error" : undefined}
          />
          <button className="nag-button" type="submit">
            {submitLabel ?? text.submitLabel}
          </button>
          {hasError ? (
            <p className="nag-error" id="nag-error" role="alert">
              {errorText ?? text.errorText}
            </p>
          ) : null}
        </form>
      </main>
    </div>
  )
}

export default AccessGatePage
