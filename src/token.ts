import { hmac, timingSafeEqualString, toBase64Url } from "./crypto.js"

export const TOKEN_VERSION = "v1"

const signature = async (key: CryptoKey, kid: string, exp: string): Promise<string> =>
  toBase64Url(await hmac(key, `${TOKEN_VERSION}.${kid}.${exp}`))

export const createToken = async (
  key: CryptoKey,
  kid: string,
  exp: number,
): Promise<string> => `${TOKEN_VERSION}.${kid}.${exp}.${await signature(key, kid, String(exp))}`

export const verifyToken = async (
  key: CryptoKey,
  token: string | undefined,
  kids: readonly string[],
  nowSeconds: number,
): Promise<boolean> => {
  if (!token) return false
  const parts = token.split(".")
  if (parts.length !== 4) return false
  const [version, kid, expRaw, sig] = parts as [string, string, string, string]
  if (version !== TOKEN_VERSION) return false
  if (!/^[A-Za-z0-9_-]{11}$/.test(kid) || !/^[1-9]\d{0,11}$/.test(expRaw)) return false
  const expected = await signature(key, kid, expRaw)
  const validSignature = timingSafeEqualString(sig, expected)
  let knownKid = false
  for (const current of kids) knownKid = timingSafeEqualString(kid, current) || knownKid
  return validSignature && knownKid && Number(expRaw) > nowSeconds
}
