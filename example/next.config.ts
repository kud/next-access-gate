import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import type { NextConfig } from "next"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")

const nextConfig: NextConfig = {
  outputFileTracingRoot: root,
  turbopack: { root },
}

export default nextConfig
