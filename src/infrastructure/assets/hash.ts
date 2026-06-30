// T009 (007) — Hashing canónico de assets: SHA-256 hex en minúsculas sobre bytes exactos. No hashea
// objetos, no depende de locale, no incluye timestamp ni salt. Independiente del hashing de build.
import { createHash } from "node:crypto";

/** SHA-256 de `bytes` en hexadecimal minúsculas (64 caracteres `[0-9a-f]`). */
export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
