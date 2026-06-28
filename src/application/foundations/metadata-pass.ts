// T011 (004) — Pasada de metadata O(nodes) (capa de aplicación, ADR-0016). Recibe el documento de
// tokens YA parseado (`analysis.documents[<tokens>].parsed`) y produce, en UNA visita, el índice
// `path → FoundationLevelResolution` + un issue `foundation-level-invalid` por declaración inválida
// (NO por descendiente). NO lee fs, NO hace `JSON.parse`, NO llama al analyzer, NO resuelve
// alias/tipos/estadísticas, NO crea `FoundationTokenInspection`, NO resuelve categorías, NO muta el
// documento. Reglas estructurales DTCG idénticas a 002 (token = nodo con `$value`; hijos = claves sin
// `$`; props reservadas no se recorren). Paths vía `tokenPath` (idénticos a `TokenNodeSummary.path`).
import { tokenPath } from "../../domain/traversal/token-path.js";
import { analysisError } from "../../domain/analysis/analysis-issue.js";
import type { FoundationIssue } from "../../domain/foundations/foundation-issue.js";
import { FOUNDATION_ISSUE_CODES } from "../../domain/foundations/foundation-issue.js";
import type { FoundationLevelResolution } from "../../domain/foundations/foundation-level.js";
import {
  parseFoundationExtension,
  type FoundationDeclarationInvalidReason,
} from "../../domain/foundations/parse-foundation-extension.js";
import {
  resolveFoundationLevel,
  type DeclaringAncestor,
} from "../../domain/foundations/resolve-foundation-level.js";

/** Proyección de metadata foundation por token path (sin tipos/alias/estadísticas). */
export interface FoundationMetadataProjection {
  /** Resolución de nivel por path de token (orden de documento; nuevo Map, no compartido). */
  readonly levels: ReadonlyMap<string, FoundationLevelResolution>;
  /** Un `foundation-level-invalid` por declaración inválida (token o grupo). */
  readonly issues: readonly FoundationIssue[];
}

interface Frame {
  readonly node: Record<string, unknown>;
  readonly segments: readonly string[];
  readonly ancestor: DeclaringAncestor | null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function invalidIssue(path: string, reason: FoundationDeclarationInvalidReason): FoundationIssue {
  return analysisError(
    FOUNDATION_ISSUE_CODES.levelInvalid,
    `Metadata foundation inválida (${reason}).`,
    { document: "tokens", path },
  );
}

/** Apila los hijos-objeto (claves sin `$`) en orden de documento (reverso para pop ordenado). */
function pushChildren(
  node: Record<string, unknown>,
  segments: readonly string[],
  ancestor: DeclaringAncestor | null,
  stack: Frame[],
): void {
  const children: Frame[] = [];
  for (const key of Object.keys(node)) {
    if (key.startsWith("$")) continue; // props reservadas / `$extensions` no son hijos
    const value = node[key];
    if (!isRecord(value)) continue; // no es token ni grupo
    children.push({ node: value, segments: [...segments, key], ancestor });
  }
  for (let i = children.length - 1; i >= 0; i -= 1) stack.push(children[i] as Frame);
}

/**
 * Proyecta la metadata foundation del documento de tokens parseado. Comportamiento explícito y seguro
 * cuando `parsed` está ausente/`null`/no es objeto: proyección vacía (no lanza, no convierte el
 * resultado global en read-error/partial — eso es del caso de uso).
 */
export function projectFoundationMetadata(parsed: unknown): FoundationMetadataProjection {
  const levels = new Map<string, FoundationLevelResolution>();
  const issues: FoundationIssue[] = [];
  if (!isRecord(parsed)) return { levels, issues };

  // Raíz tratada como grupo contenedor (no token); su declaración puede aplicar por herencia.
  const rootDecl = parseFoundationExtension(parsed);
  if (rootDecl.kind === "invalid") issues.push(invalidIssue("", rootDecl.reason));
  const rootAncestor: DeclaringAncestor | null =
    rootDecl.kind === "absent" ? null : { declaration: rootDecl, path: "" };

  const stack: Frame[] = [];
  pushChildren(parsed, [], rootAncestor, stack);

  while (stack.length > 0) {
    const frame = stack.pop() as Frame;
    const path = tokenPath(frame.segments);
    const own = parseFoundationExtension(frame.node);

    if ("$value" in frame.node) {
      // Token (hoja): resuelve nivel; un token con declaración propia inválida emite su propio issue.
      levels.set(path, resolveFoundationLevel(own, path, frame.ancestor));
      if (own.kind === "invalid") issues.push(invalidIssue(path, own.reason));
      continue;
    }

    // Grupo: una declaración inválida del grupo emite UN issue (no por descendiente).
    if (own.kind === "invalid") issues.push(invalidIssue(path, own.reason));
    const childAncestor: DeclaringAncestor | null =
      own.kind === "absent" ? frame.ancestor : { declaration: own, path };
    pushChildren(frame.node, frame.segments, childAncestor, stack);
  }

  return { levels, issues };
}
