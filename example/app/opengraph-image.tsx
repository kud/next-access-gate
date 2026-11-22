import { ImageResponse } from "next/og"

export const alt = "Acme Orbit"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpengraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 96, background: "#111", color: "#fff" }}>
      Acme Orbit
    </div>,
    size,
  )
}
