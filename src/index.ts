export { createAccessGate } from "./gate.js"
export type {
  AccessGate,
  AccessGateOptions,
  DeploymentEnvironment,
  GateStatus,
  WhenUnset,
} from "./gate.js"
export { safeNext, isPublicPath, DEFAULT_PATHS, DEFAULT_METADATA_IMAGES } from "./paths.js"
export type { AllowEntry, GatePaths, MetadataImagesOption } from "./paths.js"
export { SECURE_COOKIE_NAME, INSECURE_COOKIE_NAME } from "./cookie.js"
export type { RequestLike } from "./cookie.js"
