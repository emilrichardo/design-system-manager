// T002 (011) — Metadata de capa de token (`TokenLayerV1`) y reglas puras R1-R5 de
// `contracts/token-layer-policy.md`. Vive bajo `$extensions["ar.neuraz.design-system"]` (Neuraz
// extension versionada sobre DTCG); nunca reemplaza ni reinterpreta `$type`/`$value` DTCG. Dominio
// puro: sin filesystem, sin Commander, sin dependencia de foundations/viewer/asset-manager concretos.
import type { Issue } from "../issue.js";
import { isValidConfidence, isProvenanceStatus, type ProvenanceV1 } from "../provenance.js";

/** Jerarquía de referencia preferida: `primitive/brand → semantic → component` (ADR-0029). */
export const TOKEN_LAYERS = ["primitive", "semantic", "component"] as const;
export type TokenLayer = (typeof TOKEN_LAYERS)[number];

const LAYER_SET: ReadonlySet<string> = new Set(TOKEN_LAYERS);

export function isTokenLayer(value: unknown): value is TokenLayer {
  return typeof value === "string" && LAYER_SET.has(value);
}

/** Alias de `ProvenanceV1` con el nombre público del contrato (`TokenProvenanceV1`). */
export type TokenProvenanceV1 = ProvenanceV1;

/**
 * Metadata Neuraz de capa por token (R3: nunca se infiere del path; solo existe si está declarada
 * explícitamente vía `$extensions`). `component`/`part`/`variant`/`state`/`size`/`mode`/
 * `responsiveCondition`/`property` solo se leen cuando `layer === "component"` (R5).
 */
export interface TokenLayerV1 {
  readonly schemaVersion: 1;
  readonly layer: TokenLayer | null;
  /** Rol adicional sobre `primitive`; nunca coexiste con `layer` distinto de `"primitive"`/`null` (R1). */
  readonly brandRole: "brand" | null;
  readonly component: string | null;
  readonly part: string | null;
  readonly variant: string | null;
  readonly state: string | null;
  readonly size: string | null;
  readonly mode: string | null;
  readonly responsiveCondition: string | null;
  readonly property: string | null;
  readonly provenance: TokenProvenanceV1 | null;
}

export function emptyTokenLayer(): TokenLayerV1 {
  return Object.freeze({
    schemaVersion: 1,
    layer: null,
    brandRole: null,
    component: null,
    part: null,
    variant: null,
    state: null,
    size: null,
    mode: null,
    responsiveCondition: null,
    property: null,
    provenance: null,
  });
}

const LAYER_ISSUE_CODES = {
  invalidLayer: "token-layer-invalid",
  unclassified: "token-layer-unclassified",
  brandRoleConflict: "token-layer-brand-role-conflict",
  componentBypassesSemantic: "component-token-bypasses-semantic",
  brandBypassesSemantic: "brand-token-bypasses-semantic",
} as const;

/**
 * R1 + validación de forma: valida los campos escalares de `TokenLayerV1` (sin resolver aliases).
 * `path` es el path lógico del token, para reportes localizables.
 */
export function validateTokenLayerShape(value: Partial<TokenLayerV1> | null, path: string): readonly Issue[] {
  if (value === null) return [];
  const issues: Issue[] = [];

  if (value.layer !== null && value.layer !== undefined && !isTokenLayer(value.layer)) {
    issues.push({ code: LAYER_ISSUE_CODES.invalidLayer, message: `layer inválida en "${path}": debe ser una de ${TOKEN_LAYERS.join(", ")}.`, path });
  }

  // R1 — brandRole solo tiene sentido sobre primitive (o layer ausente, que se trata como primitive implícito).
  if (value.brandRole === "brand" && value.layer !== undefined && value.layer !== null && value.layer !== "primitive") {
    issues.push({
      code: LAYER_ISSUE_CODES.brandRoleConflict,
      message: `brandRole:"brand" es incompatible con layer:"${String(value.layer)}" en "${path}"; brandRole solo aplica sobre primitive.`,
      path,
    });
  }

  if (value.provenance !== null && value.provenance !== undefined) {
    if (!isProvenanceStatus(value.provenance.status)) {
      issues.push({ code: LAYER_ISSUE_CODES.invalidLayer, message: `provenance.status inválido en "${path}".`, path });
    }
    if (!isValidConfidence(value.provenance.confidence)) {
      issues.push({ code: LAYER_ISSUE_CODES.invalidLayer, message: `provenance.confidence fuera de [0,1] en "${path}".`, path });
    }
  }

  return issues;
}

/** R4 — ausencia de metadata de capa nunca invalida; solo advierte. */
export function unclassifiedLayerWarning(value: TokenLayerV1 | null, path: string): Issue | null {
  if (value === null || value.layer === null) {
    return { code: LAYER_ISSUE_CODES.unclassified, message: `Token sin metadata de capa (\`layer\`) declarada en "${path}".`, path };
  }
  return null;
}

/**
 * R2 — un token `component` nunca debe aliasar directo a un `primitive` (debe pasar por `semantic`).
 * Pura: recibe la capa del token origen (alias) y la capa del token destino (resuelto), sin resolver
 * la cadena completa (eso es responsabilidad de la capa de aplicación que sí tiene el grafo de aliases).
 */
export function evaluateAliasLayerTransition(
  fromPath: string,
  fromLayer: TokenLayerV1 | null,
  toLayer: TokenLayerV1 | null,
): Issue | null {
  const from = fromLayer?.layer ?? null;
  const to = toLayer?.layer ?? null;
  if (from !== "component") return null;
  if (to === "semantic" || to === "component") return null;
  // to === "primitive" o null (sin metadata, tratado como primitive implícito) => bypass.
  if (toLayer?.brandRole === "brand") {
    return { code: LAYER_ISSUE_CODES.brandBypassesSemantic, message: `"${fromPath}" (component) alias directo a un brand primitive sin pasar por semantic.`, path: fromPath };
  }
  return { code: LAYER_ISSUE_CODES.componentBypassesSemantic, message: `"${fromPath}" (component) alias directo a un primitive sin pasar por semantic.`, path: fromPath };
}

export const TOKEN_LAYER_ISSUE_CODES = LAYER_ISSUE_CODES;
