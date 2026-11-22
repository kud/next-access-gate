export const SECURE_COOKIE_NAME = "__Host-access-gate"
export const INSECURE_COOKIE_NAME = "access-gate"

/** A request, or the bare headers a server action or server component receives. */
export type RequestLike = Request | Headers

const isRequest = (input: RequestLike): input is Request =>
  typeof (input as Partial<Request>).url === "string" && "headers" in input

const headersOf = (input: RequestLike): Headers => (isRequest(input) ? input.headers : input)

/**
 * Bare headers carry no URL, so they rely on `x-forwarded-proto`, which Next.js
 * always sets on incoming requests; without it they count as HTTPS so that the
 * `__Host-` cookie is the one looked up.
 */
export const isSecureRequest = (input: RequestLike): boolean => {
  const forwarded = headersOf(input).get("x-forwarded-proto")?.split(",")[0]?.trim()
  if (forwarded) return forwarded === "https"
  return isRequest(input) ? new URL(input.url).protocol === "https:" : true
}

export const cookieNameFor = (input: RequestLike): string =>
  isSecureRequest(input) ? SECURE_COOKIE_NAME : INSECURE_COOKIE_NAME

export const readCookie = (input: RequestLike, name: string): string | undefined => {
  const header = headersOf(input).get("cookie")
  if (!header) return undefined
  for (const pair of header.split(";")) {
    const separator = pair.indexOf("=")
    if (separator === -1) continue
    if (pair.slice(0, separator).trim() === name) return pair.slice(separator + 1).trim()
  }
  return undefined
}

export const serialiseCookie = (
  request: Request,
  value: string,
  maxAgeSeconds: number,
): string => {
  const secure = isSecureRequest(request)
  const name = secure ? SECURE_COOKIE_NAME : INSECURE_COOKIE_NAME
  const attributes = [
    `${name}=${value}`,
    "Path=/",
    `Max-Age=${maxAgeSeconds}`,
    "HttpOnly",
    "SameSite=Lax",
  ]
  if (secure) attributes.push("Secure")
  return attributes.join("; ")
}
