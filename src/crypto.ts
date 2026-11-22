const encoder = new TextEncoder()

export const encode = (value: string): Uint8Array<ArrayBuffer> => encoder.encode(value)

export const toBase64Url = (bytes: Uint8Array): string => {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

export const timingSafeEqual = (a: Uint8Array, b: Uint8Array): boolean => {
  const length = Math.max(a.length, b.length)
  let diff = a.length ^ b.length
  for (let index = 0; index < length; index++) {
    diff |= (a[index] ?? 0) ^ (b[index] ?? 0)
  }
  return diff === 0
}

export const timingSafeEqualString = (a: string, b: string): boolean =>
  timingSafeEqual(encode(a), encode(b))

export const deriveHmacKey = async (
  material: string,
  info: string,
): Promise<CryptoKey> => {
  const base = await crypto.subtle.importKey("raw", encode(material), "HKDF", false, [
    "deriveKey",
  ])
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: encode("next-access-gate"),
      info: encode(info),
    },
    base,
    { name: "HMAC", hash: "SHA-256", length: 256 },
    false,
    ["sign"],
  )
}

export const hmac = async (key: CryptoKey, message: string): Promise<Uint8Array> =>
  new Uint8Array(await crypto.subtle.sign("HMAC", key, encode(message)))
