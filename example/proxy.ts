import { gate } from "./access-gate"

export const proxy = gate.proxy

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|gif|svg|webp|avif|ico|txt|woff2?)$).*)",
  ],
}
