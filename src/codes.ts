import { hmac, timingSafeEqual, toBase64Url } from "./crypto.js"

export type CodesInput = string | readonly string[] | undefined | null

export const normaliseCode = (code: string, caseSensitive: boolean): string => {
  const trimmed = code.normalize("NFC").trim()
  return caseSensitive ? trimmed : trimmed.toLowerCase()
}

export const parseCodes = (input: CodesInput, caseSensitive: boolean): string[] => {
  const raw = typeof input === "string" ? input.split(",") : (input ?? [])
  const codes = raw
    .map((code) => normaliseCode(code, caseSensitive))
    .filter((code) => code.length > 0)
  return [...new Set(codes)]
}

export const keyId = async (key: CryptoKey, code: string): Promise<string> =>
  toBase64Url((await hmac(key, `kid:${code}`)).slice(0, 8))

export const matchCode = async (
  key: CryptoKey,
  submitted: string,
  codes: readonly string[],
  caseSensitive: boolean,
): Promise<string | null> => {
  const candidate = await hmac(key, `code:${normaliseCode(submitted, caseSensitive)}`)
  const digests = await Promise.all(codes.map((code) => hmac(key, `code:${code}`)))
  let matched: string | null = null
  for (let index = 0; index < codes.length; index++) {
    const equal = timingSafeEqual(candidate, digests[index]!)
    matched = equal && matched === null ? codes[index]! : matched
  }
  return matched
}
