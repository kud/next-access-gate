export const SECURE_COOKIE_NAME = "__Host-access-gate"
export const INSECURE_COOKIE_NAME = "access-gate"

export const isSecureRequest = (request: Request): boolean => {
  const forwarded = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim()
  if (forwarded) return forwarded === "https"
  return new URL(request.url).protocol === "https:"
}

export const cookieNameFor = (request: Request): string =>
  isSecureRequest(request) ? SECURE_COOKIE_NAME : INSECURE_COOKIE_NAME

export const readCookie = (request: Request, name: string): string | undefined => {
  const header = request.headers.get("cookie")
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
