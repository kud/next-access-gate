"use client"

import { useCallback, useState, type FormEvent, type ReactNode } from "react"

export interface UseAccessGateOptions {
  verifyPath?: string
}

export type AccessGateError = "invalid_code" | "network_error" | "unexpected_response"

export interface UseAccessGateResult {
  submit: (code: string, next?: string) => Promise<boolean>
  pending: boolean
  error: AccessGateError | null
}

export const useAccessGate = ({
  verifyPath = "/access/verify",
}: UseAccessGateOptions = {}): UseAccessGateResult => {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AccessGateError | null>(null)

  const submit = useCallback(
    async (code: string, next?: string): Promise<boolean> => {
      setPending(true)
      setError(null)
      try {
        const response = await fetch(verifyPath, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ code, next }),
          credentials: "same-origin",
        })
        const body = (await response.json().catch(() => null)) as
          | { ok?: boolean; next?: string }
          | null
        if (response.ok && body?.ok && typeof body.next === "string") {
          window.location.assign(body.next)
          return true
        }
        setError(response.status === 401 ? "invalid_code" : "unexpected_response")
        return false
      } catch {
        setError("network_error")
        return false
      } finally {
        setPending(false)
      }
    },
    [verifyPath],
  )

  return { submit, pending, error }
}

export interface AccessGateFormProps {
  verifyPath?: string
  next?: string
  label?: ReactNode
  submitLabel?: ReactNode
  pendingLabel?: ReactNode
  errorText?: ReactNode
  placeholder?: string
  className?: string
}

export const AccessGateForm = ({
  verifyPath = "/access/verify",
  next = "/",
  label = "Access code",
  submitLabel = "Continue",
  pendingLabel,
  errorText = "That code did not work.",
  placeholder,
  className,
}: AccessGateFormProps) => {
  const { submit, pending, error } = useAccessGate({ verifyPath })

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const code = new FormData(event.currentTarget).get("code")
    void submit(typeof code === "string" ? code : "", next)
  }

  return (
    <form className={className} method="post" action={verifyPath} onSubmit={onSubmit} data-pending={pending || undefined}>
      <input type="hidden" name="next" value={next} />
      <label htmlFor="access-gate-code">{label}</label>
      <input
        id="access-gate-code"
        name="code"
        type="password"
        required
        autoComplete="current-password"
        autoCapitalize="none"
        spellCheck={false}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "access-gate-error" : undefined}
      />
      <button type="submit" disabled={pending}>
        {pending && pendingLabel ? pendingLabel : submitLabel}
      </button>
      {error ? (
        <p id="access-gate-error" role="alert">
          {errorText}
        </p>
      ) : null}
    </form>
  )
}
