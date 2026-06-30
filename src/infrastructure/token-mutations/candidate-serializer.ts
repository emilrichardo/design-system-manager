// T011 (008) — Serialización canónica del documento candidato de tokens: `JSON.stringify(doc,null,2)+"\n"`,
// UTF-8, sin BOM, LF final único (igual que el write path de tokens de `init`/`005`). Hash SHA-256 de los
// bytes exactos. Determinista; no toca filesystem.
import { createHash } from "node:crypto";

export interface SerializedCandidate {
  readonly text: string;
  readonly contentHash: string;
  readonly byteLength: number;
}

export function serializeCandidate(document: unknown): SerializedCandidate {
  const text = `${JSON.stringify(document, null, 2)}\n`;
  const bytes = new TextEncoder().encode(text);
  return { text, contentHash: createHash("sha256").update(bytes).digest("hex"), byteLength: bytes.byteLength };
}
