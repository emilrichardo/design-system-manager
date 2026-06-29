// T007 (006) — Utilidad canónica de hashing para build/export. SHA-256 en hexadecimal minúsculas sobre
// bytes exactos. No hashea objetos JS, no depende de locale, no incluye timestamp ni salt. Reutilizable
// para sourceHash, artifact contentHash, concurrencia y verificación.
import { createHash } from "node:crypto";

/** SHA-256 de `bytes` en hexadecimal minúsculas (64 caracteres `[0-9a-f]`). */
export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
