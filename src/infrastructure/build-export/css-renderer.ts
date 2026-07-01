// T032/T033/T034/T035/T036 (006) — Renderer CSS puro y determinista. Consume exclusivamente un
// `NormalizedTokenSet` (no toca filesystem, ni Commander, ni mtime, ni stdout/stderr). All-or-nothing:
// si cualquier token falla validación de nombre/colisión/tipo/valor/alias-target, retorna
// `unsupported-value` con errores tipados y CERO bytes CSS.
//
// Política de tipos según `research.md`:
//   SUPPORTED:               number
//   CONDITIONALLY_SUPPORTED: color (hex+alpha 1), dimension (px/rem/em/%), duration (ms/s),
//                            fontWeight (1..1000 entero o normal/bold), fontFamily (string|string[]),
//                            cubicBezier ([x1,y1,x2,y2] con x1/x2 ∈ [0,1]), shadow, string
//   UNSUPPORTED_IN_CSS_V1:   boolean, strokeStyle, border, transition, gradient, typography
import type { BuildArtifact } from "../../domain/build-export/artifact.js";
import { artifactContentType, artifactFilename, type BuildFormat } from "../../domain/build-export/build-format.js";
import { createBuildArtifact } from "../../domain/build-export/artifact.js";
import type { NormalizedBuildToken, NormalizedTokenSet } from "../../domain/build-export/normalized-token.js";
import { buildCssNameMap, validateCssCustomPropertyName } from "../../domain/build-export/css-name.js";
import { sha256Hex } from "./hash.js";
import { cssDoubleQuotedString } from "./css-string.js";

// ── Errores del renderer (públicos y seguros: sin Error/stack/rutas absolutas) ───────────────────
export type CssErrorCode =
  | "css-name-invalid"
  | "css-name-collision"
  | "css-number-invalid"
  | "css-color-unsupported-shape"
  | "css-dimension-unsupported-shape"
  | "css-duration-unsupported-shape"
  | "css-font-family-unsupported-shape"
  | "css-font-weight-unsupported-shape"
  | "css-cubic-bezier-unsupported-shape"
  | "css-shadow-unsupported-shape"
  | "css-string-unsupported-type"
  | "css-boolean-unsupported"
  | "css-type-unsupported"
  | "css-alias-target-unrenderable";

export interface CssRenderError {
  readonly format: BuildFormat;
  readonly code: CssErrorCode;
  readonly tokenPath: string | null;
  readonly type: string | null;
  readonly message: string;
}

export type CssRenderResult =
  | { readonly outcome: "rendered"; readonly artifact: BuildArtifact }
  | { readonly outcome: "unsupported-value"; readonly errors: readonly CssRenderError[] };

function fmtError(code: CssErrorCode, tokenPath: string | null, type: string | null, message: string): CssRenderError {
  return { format: "css", code, tokenPath, type, message };
}

// ── Serializers de valor por tipo. Cada uno retorna `string` (bytes CSS) o `CssRenderError`. ─────

const FINITE_RE = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;

/** Serializa un número finito como decimal canónico: `-0`→`0`, sin notación científica, sin locale. */
function serializeNumber(value: unknown, tokenPath: string): string | CssRenderError {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fmtError("css-number-invalid", tokenPath, "number", `Número no finito en ${tokenPath}.`);
  }
  const normalized = Object.is(value, -0) ? 0 : value;
  // `toString()` en V8/SpiderMonkey no usa locale y para finitos pequeños/normales no emite notación
  // científica; defensa adicional con una regex.
  const text = String(normalized);
  if (!FINITE_RE.test(text)) {
    return fmtError("css-number-invalid", tokenPath, "number", `Número no representable de forma estable en ${tokenPath}.`);
  }
  return text;
}

function serializeColor(value: unknown, tokenPath: string): string | CssRenderError {
  if (value === null || typeof value !== "object") {
    return fmtError("css-color-unsupported-shape", tokenPath, "color", `Color no es un objeto en ${tokenPath}.`);
  }
  const obj = value as Record<string, unknown>;
  if (obj.colorSpace !== "srgb") {
    return fmtError("css-color-unsupported-shape", tokenPath, "color", `colorSpace distinto de srgb en ${tokenPath}.`);
  }
  if (typeof obj.hex !== "string") {
    return fmtError("css-color-unsupported-shape", tokenPath, "color", `Color sin hex en ${tokenPath}.`);
  }
  const alpha = obj.alpha;
  if (alpha !== undefined && alpha !== 1) {
    return fmtError("css-color-unsupported-shape", tokenPath, "color", `Alpha distinta de 1 en ${tokenPath}.`);
  }
  const hex = obj.hex;
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
    return fmtError("css-color-unsupported-shape", tokenPath, "color", `Hex inválido en ${tokenPath}.`);
  }
  return hex.toLowerCase();
}

const DIMENSION_UNITS = new Set(["px", "rem", "em", "%"]);
function serializeDimension(value: unknown, tokenPath: string): string | CssRenderError {
  if (value === null || typeof value !== "object") {
    return fmtError("css-dimension-unsupported-shape", tokenPath, "dimension", `Dimension no es un objeto en ${tokenPath}.`);
  }
  const obj = value as Record<string, unknown>;
  if (typeof obj.value !== "number" || !Number.isFinite(obj.value)) {
    return fmtError("css-dimension-unsupported-shape", tokenPath, "dimension", `value no finito en ${tokenPath}.`);
  }
  if (typeof obj.unit !== "string" || !DIMENSION_UNITS.has(obj.unit)) {
    return fmtError("css-dimension-unsupported-shape", tokenPath, "dimension", `unit inválida en ${tokenPath}.`);
  }
  const num = serializeNumber(obj.value, tokenPath);
  if (typeof num !== "string") return num;
  return `${num}${obj.unit}`;
}

const DURATION_UNITS = new Set(["ms", "s"]);
function serializeDuration(value: unknown, tokenPath: string): string | CssRenderError {
  if (value === null || typeof value !== "object") {
    return fmtError("css-duration-unsupported-shape", tokenPath, "duration", `Duration no es un objeto en ${tokenPath}.`);
  }
  const obj = value as Record<string, unknown>;
  if (typeof obj.value !== "number" || !Number.isFinite(obj.value)) {
    return fmtError("css-duration-unsupported-shape", tokenPath, "duration", `value no finito en ${tokenPath}.`);
  }
  if (typeof obj.unit !== "string" || !DURATION_UNITS.has(obj.unit)) {
    return fmtError("css-duration-unsupported-shape", tokenPath, "duration", `unit inválida en ${tokenPath}.`);
  }
  const num = serializeNumber(obj.value, tokenPath);
  if (typeof num !== "string") return num;
  return `${num}${obj.unit}`;
}

function serializeFontWeight(value: unknown, tokenPath: string): string | CssRenderError {
  if (value === "normal" || value === "bold") return value;
  if (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 1000) {
    return String(value);
  }
  return fmtError("css-font-weight-unsupported-shape", tokenPath, "fontWeight", `fontWeight inválido en ${tokenPath}.`);
}

const GENERIC_FAMILIES = new Set(["serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui"]);
function serializeOneFamily(family: string): string {
  if (GENERIC_FAMILIES.has(family)) return family;
  return cssDoubleQuotedString(family);
}
function serializeFontFamily(value: unknown, tokenPath: string): string | CssRenderError {
  if (typeof value === "string") {
    if (value.length === 0) {
      return fmtError("css-font-family-unsupported-shape", tokenPath, "fontFamily", `fontFamily vacío en ${tokenPath}.`);
    }
    return serializeOneFamily(value);
  }
  if (Array.isArray(value) && value.length > 0 && value.every((f) => typeof f === "string" && f.length > 0)) {
    return (value as string[]).map(serializeOneFamily).join(", ");
  }
  return fmtError("css-font-family-unsupported-shape", tokenPath, "fontFamily", `fontFamily inválido en ${tokenPath}.`);
}

function serializeCubicBezier(value: unknown, tokenPath: string): string | CssRenderError {
  if (!Array.isArray(value) || value.length !== 4 || !value.every((n) => typeof n === "number" && Number.isFinite(n))) {
    return fmtError("css-cubic-bezier-unsupported-shape", tokenPath, "cubicBezier", `cubicBezier inválido en ${tokenPath}.`);
  }
  const [x1, y1, x2, y2] = value as [number, number, number, number];
  if (x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1) {
    return fmtError("css-cubic-bezier-unsupported-shape", tokenPath, "cubicBezier", `cubicBezier x1/x2 fuera de [0,1] en ${tokenPath}.`);
  }
  const parts = [x1, y1, x2, y2].map((n) => serializeNumber(n, tokenPath));
  for (const p of parts) if (typeof p !== "string") return p;
  return `cubic-bezier(${parts.join(", ")})`;
}

function serializeString(value: unknown, tokenPath: string): string | CssRenderError {
  if (typeof value !== "string") {
    return fmtError("css-string-unsupported-type", tokenPath, "string", `string no es string en ${tokenPath}.`);
  }
  return cssDoubleQuotedString(value);
}

function serializeShadowColor(value: unknown, tokenPath: string): string | CssRenderError {
  if (value === null || typeof value !== "object") {
    return fmtError("css-shadow-unsupported-shape", tokenPath, "shadow", `Shadow color inválido en ${tokenPath}.`);
  }
  const obj = value as Record<string, unknown>;
  if (obj.colorSpace !== "srgb" || typeof obj.hex !== "string" || !/^#[0-9a-fA-F]{6}$/.test(obj.hex)) {
    return fmtError("css-shadow-unsupported-shape", tokenPath, "shadow", `Shadow color no representable en ${tokenPath}.`);
  }
  const alpha = obj.alpha === undefined ? 1 : obj.alpha;
  if (typeof alpha !== "number" || !Number.isFinite(alpha) || alpha < 0 || alpha > 1) {
    return fmtError("css-shadow-unsupported-shape", tokenPath, "shadow", `Shadow alpha inválida en ${tokenPath}.`);
  }
  const hex = obj.hex;
  if (alpha === 1) return hex.toLowerCase();
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return `rgb(${r} ${g} ${b} / ${alpha})`;
}

function serializeOneShadow(value: unknown, tokenPath: string): string | CssRenderError {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return fmtError("css-shadow-unsupported-shape", tokenPath, "shadow", `Shadow no es un objeto en ${tokenPath}.`);
  }
  const obj = value as Record<string, unknown>;
  const offsetX = serializeDimension(obj.offsetX, tokenPath);
  const offsetY = serializeDimension(obj.offsetY, tokenPath);
  const blur = serializeDimension(obj.blur ?? { value: 0, unit: "px" }, tokenPath);
  const spread = serializeDimension(obj.spread ?? { value: 0, unit: "px" }, tokenPath);
  const color = serializeShadowColor(obj.color, tokenPath);
  for (const part of [offsetX, offsetY, blur, spread, color]) {
    if (typeof part !== "string") return fmtError("css-shadow-unsupported-shape", tokenPath, "shadow", `Shadow no representable en ${tokenPath}.`);
  }
  const inset = obj.inset === true ? " inset" : "";
  return `${offsetX} ${offsetY} ${blur} ${spread} ${color}${inset}`;
}

function serializeShadow(value: unknown, tokenPath: string): string | CssRenderError {
  if (Array.isArray(value)) {
    if (value.length === 0) return fmtError("css-shadow-unsupported-shape", tokenPath, "shadow", `Shadow array vacío en ${tokenPath}.`);
    const parts = value.map((entry) => serializeOneShadow(entry, tokenPath));
    for (const part of parts) {
      if (typeof part !== "string") return part;
    }
    return parts.join(", ");
  }
  return serializeOneShadow(value, tokenPath);
}

// ── Despacho por tipo efectivo ──────────────────────────────────────────────────────────────────
const UNSUPPORTED_TYPES = new Set(["strokeStyle", "border", "transition", "gradient", "typography"]);

function serializeConcreteValue(token: NormalizedBuildToken): string | CssRenderError {
  const type = token.effectiveType;
  const value = token.resolvedValue;
  switch (type) {
    case "number":
      return serializeNumber(value, token.path);
    case "color":
      return serializeColor(value, token.path);
    case "dimension":
      return serializeDimension(value, token.path);
    case "duration":
      return serializeDuration(value, token.path);
    case "fontWeight":
      return serializeFontWeight(value, token.path);
    case "fontFamily":
      return serializeFontFamily(value, token.path);
    case "cubicBezier":
      return serializeCubicBezier(value, token.path);
    case "shadow":
      return serializeShadow(value, token.path);
    case "string":
      return serializeString(value, token.path);
    case "boolean":
      return fmtError("css-boolean-unsupported", token.path, "boolean", `boolean no soportado en CSS v1 en ${token.path}.`);
    default:
      if (UNSUPPORTED_TYPES.has(type)) {
        return fmtError("css-type-unsupported", token.path, type, `Tipo "${type}" no soportado en CSS v1 en ${token.path}.`);
      }
      return fmtError("css-type-unsupported", token.path, type, `Tipo desconocido "${type}" en ${token.path}.`);
  }
}

function hasDuplicate(values: readonly string[]): boolean {
  return new Set(values).size !== values.length;
}

function validateAliasChain(token: NormalizedBuildToken): CssRenderError | null {
  if (token.aliasOf === null) return null;
  if (token.aliasOf === token.path) {
    return fmtError(
      "css-alias-target-unrenderable",
      token.path,
      token.effectiveType,
      `Alias target "${token.aliasOf}" forma un ciclo trivial en ${token.path}.`,
    );
  }
  if (token.aliasChain.includes(token.path)) {
    return fmtError(
      "css-alias-target-unrenderable",
      token.path,
      token.effectiveType,
      `Alias chain cíclica en ${token.path}.`,
    );
  }
  if (hasDuplicate(token.aliasChain)) {
    return fmtError(
      "css-alias-target-unrenderable",
      token.path,
      token.effectiveType,
      `Alias chain con nodos repetidos en ${token.path}.`,
    );
  }
  if (token.aliasChain.length > 0 && token.aliasChain[0] !== token.aliasOf) {
    return fmtError(
      "css-alias-target-unrenderable",
      token.path,
      token.effectiveType,
      `Alias chain inconsistente en ${token.path}.`,
    );
  }
  return null;
}

// ── Renderer principal ──────────────────────────────────────────────────────────────────────────

interface Declaration {
  readonly name: string;
  readonly value: string;
}

function serializeTokenAsDeclaration(
  token: NormalizedBuildToken,
  cssName: string,
  nameByPath: ReadonlyMap<string, string>,
  tokensByPath: ReadonlyMap<string, NormalizedBuildToken>,
): Declaration | CssRenderError {
  // Si el token es un alias inmediato, emitir var(--<target>) — sin fallback al valor final.
  if (token.aliasOf !== null) {
    const aliasChainError = validateAliasChain(token);
    if (aliasChainError !== null) return aliasChainError;
    const target = tokensByPath.get(token.aliasOf);
    const targetName = nameByPath.get(token.aliasOf);
    if (target === undefined || targetName === undefined) {
      return fmtError(
        "css-alias-target-unrenderable",
        token.path,
        token.effectiveType,
        `Alias target "${token.aliasOf}" no es un token renderizable en CSS en ${token.path}.`,
      );
    }
    // El target debe ser representable en CSS (todos los tokens del set son representables en este
    // checkpoint; la salvaguarda extra confirma que su tipo no sea unsupported).
    const probe = serializeConcreteValue(target);
    if (typeof probe !== "string") {
      return fmtError(
        "css-alias-target-unrenderable",
        token.path,
        token.effectiveType,
        `Alias target "${token.aliasOf}" no es representable en CSS (${probe.code}).`,
      );
    }
    return { name: cssName, value: `var(${targetName})` };
  }
  const serialized = serializeConcreteValue(token);
  if (typeof serialized !== "string") return serialized;
  return { name: cssName, value: serialized };
}

/**
 * Renderer puro: convierte `NormalizedTokenSet` en `BuildArtifact` CSS o devuelve `unsupported-value`
 * con todos los errores tipados detectados. NO escribe nada en filesystem.
 */
export function renderCssArtifact(set: NormalizedTokenSet): CssRenderResult {
  // Fase 1: validar todos los nombres y detectar colisiones globalmente (antes de cualquier byte).
  const nameMap = buildCssNameMap(set.tokens.map((t) => t.path));
  if (!nameMap.ok) {
    const errors: CssRenderError[] = [];
    for (const invalid of nameMap.invalidNames) {
      errors.push(fmtError("css-name-invalid", invalid.tokenPath, null, `Nombre CSS inválido para ${invalid.tokenPath} (${invalid.reason}).`));
    }
    for (const collision of nameMap.collisions) {
      errors.push(
        fmtError(
          "css-name-collision",
          null,
          null,
          `Colisión CSS en ${collision.name}: ${collision.tokenPaths.join(", ")}.`,
        ),
      );
    }
    return { outcome: "unsupported-value", errors: Object.freeze(errors) };
  }

  // Fase 2: serializar todos los tokens; recolectar TODOS los errores antes de devolver.
  const declarations: Declaration[] = [];
  const errors: CssRenderError[] = [];
  for (const token of set.tokens) {
    const name = nameMap.byPath.get(token.path);
    if (name === undefined) {
      // Defensa: el mapa fue construido sobre los mismos paths; no debería ocurrir.
      errors.push(fmtError("css-name-invalid", token.path, token.effectiveType, `Nombre CSS no encontrado para ${token.path}.`));
      continue;
    }
    const result = serializeTokenAsDeclaration(token, name, nameMap.byPath, set.byPath);
    if ("code" in result) errors.push(result);
    else declarations.push(result);
  }

  if (errors.length > 0) {
    return { outcome: "unsupported-value", errors: Object.freeze(errors) };
  }

  // Fase 3: ensamblar bytes finales (orden ya canónico vía NormalizedTokenSet).
  const lines = declarations.map((d) => `  ${d.name}: ${d.value};`);
  const text = `:root {\n${lines.join("\n")}\n}\n`;
  const bytes = new TextEncoder().encode(text);
  const artifact = createBuildArtifact({
    format: "css",
    relativePath: artifactFilename("css"),
    contentType: artifactContentType("css"),
    bytes,
    contentHash: sha256Hex(bytes),
  });
  return { outcome: "rendered", artifact };
}

/** Re-export del validador de nombre (consumido también por aliases/tests). */
export { validateCssCustomPropertyName };
export { tokenPathToCssCustomPropertyName } from "../../domain/build-export/css-name.js";
