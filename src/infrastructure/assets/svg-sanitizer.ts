// T013 (007) — Sanitización de SVG por allowlist conservadora. Elimina contenido activo: <script>,
// handlers `on*`, referencias externas (`href`/`xlink:href` no `data:`), <foreignObject>, DOCTYPE y
// entidades. Si no puede reducirse a SVG bien formado y seguro → bloqueado. Puro y determinista; NUNCA
// ejecuta SVG ni resuelve referencias externas/red.
export interface SvgSanitizationReport {
  readonly safe: boolean;
  readonly removed: readonly string[];
  readonly reason: string | null;
}

export interface SvgSanitizationResult {
  readonly safe: boolean;
  readonly bytes: Uint8Array | null;
  readonly report: SvgSanitizationReport;
}

const SCRIPT_RE = /<script\b[\s\S]*?<\/script\s*>/gi;
const SCRIPT_OPEN_RE = /<script\b[^>]*\/?>/gi;
const FOREIGN_RE = /<foreignObject\b[\s\S]*?<\/foreignObject\s*>/gi;
const FOREIGN_OPEN_RE = /<foreignObject\b[^>]*\/?>/gi;
// DOCTYPE con subconjunto interno opcional `[ … ]` (que puede contener `>`).
const DOCTYPE_RE = /<!DOCTYPE[^>[]*(?:\[[\s\S]*?\])?\s*>/gi;
const ENTITY_RE = /<!ENTITY[\s\S]*?>/gi;
const ON_ATTR_RE = /\s+on[a-z0-9_-]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
// href/xlink:href con esquema externo (no data:, no fragmento, no relativo seguro evidente).
const EXTERNAL_HREF_RE = /\s+(?:xlink:)?href\s*=\s*("(?:https?:|file:|ftp:|javascript:|\/\/)[^"]*"|'(?:https?:|file:|ftp:|javascript:|\/\/)[^']*')/gi;

function decode(bytes: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

/** Sanitiza un SVG; devuelve bytes saneados o `null` (bloqueado) con un reporte estable. */
export function sanitizeSvg(input: Uint8Array): SvgSanitizationResult {
  const removed = new Set<string>();
  let text = decode(input);

  if (!/<svg\b/i.test(text)) {
    return { safe: false, bytes: null, report: { safe: false, removed: [], reason: "no contiene un elemento <svg>" } };
  }

  // Detección por reemplazo (evita estado de regex globales). El orden no afecta a la detección.
  const strip = (re: RegExp, code: string): void => {
    const next = text.replace(re, "");
    if (next !== text) removed.add(code);
    text = next;
  };

  if (/<!ENTITY/i.test(text)) removed.add("entity"); // puede estar embebido en el DOCTYPE
  strip(DOCTYPE_RE, "doctype");
  strip(ENTITY_RE, "entity");
  strip(SCRIPT_RE, "script");
  strip(SCRIPT_OPEN_RE, "script");
  strip(FOREIGN_RE, "foreign-object");
  strip(FOREIGN_OPEN_RE, "foreign-object");
  strip(ON_ATTR_RE, "event-handler");
  strip(EXTERNAL_HREF_RE, "external-ref");

  // Re-escaneo: si queda contenido activo, no es saneable de forma confiable → bloquear.
  const stillUnsafe =
    /<script\b/i.test(text) ||
    /<foreignObject\b/i.test(text) ||
    /\son[a-z0-9_-]+\s*=/i.test(text) ||
    /(?:xlink:)?href\s*=\s*["'](?:https?:|file:|ftp:|javascript:|\/\/)/i.test(text) ||
    !/<svg\b/i.test(text);

  if (stillUnsafe) {
    return { safe: false, bytes: null, report: { safe: false, removed: [...removed].sort(), reason: "no se pudo sanear a SVG seguro" } };
  }

  return {
    safe: true,
    bytes: new TextEncoder().encode(text),
    report: { safe: true, removed: [...removed].sort(), reason: null },
  };
}
