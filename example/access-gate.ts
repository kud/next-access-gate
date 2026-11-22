import { createAccessGate } from "@kud/next-access-gate"

export const gate = createAccessGate({
  codes: process.env.ACCESS_GATE_CODES,
  secret: process.env.ACCESS_GATE_SECRET,
  whenUnset: "closed",
  allow: ["/og", "/api/health"],
  paths: { page: "/access", verify: "/access/verify", logout: "/access/logout" },
})
