// T019 (005) — Lectura inerte y parseo seguro de assets de presets empaquetados (infraestructura).
// Lee SIEMPRE UTF-8 explícito y hace `JSON.parse` de DATOS; NUNCA ejecuta `import()`/`require()`/`eval`
// ni sigue rutas dentro del contenido. Distingue ausente / ilegible / corrupto como resultado tipado
// (sin lanzar `Error` en la superficie pública, sin stack, sin path absoluto, sin contenido completo).
import { readFile } from "node:fs/promises";

/** Resultado de leer+parsear un asset JSON empaquetado. `label` describe el recurso de forma segura. */
export type AssetReadResult =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly reason: "missing" | "unreadable" | "corrupt"; readonly message: string };

interface NodeErrnoLike {
  readonly code?: string;
}

function errorCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null
    ? (error as NodeErrnoLike).code
    : undefined;
}

/**
 * Lee `url` como texto UTF-8 y lo parsea como JSON. `label` (p.ej. `"catalog.json"`) se usa solo para
 * mensajes seguros; nunca se expone la ruta absoluta. No mutación; no ejecución de código.
 */
export async function readJsonAsset(url: URL, label: string): Promise<AssetReadResult> {
  let text: string;
  try {
    text = await readFile(url, "utf8");
  } catch (error) {
    const code = errorCode(error);
    if (code === "ENOENT") {
      return { ok: false, reason: "missing", message: `Preset asset is missing: ${label}.` };
    }
    return { ok: false, reason: "unreadable", message: `Preset asset is unreadable: ${label}.` };
  }

  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, reason: "corrupt", message: `Preset asset is not valid JSON: ${label}.` };
  }
}
