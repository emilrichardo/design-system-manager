// T027/T028 — Recorrido iterativo y determinista del árbol DTCG (ADR-0010). Sin filesystem, sin CLI.
// Detecta grupos/tokens, construye el índice tokenPath→token en una pasada, resuelve el tipo efectivo
// (precedencia C1 vía dominio), analiza aliases/ciclos, calcula estadísticas y aplica los límites de
// análisis (ADR-0009). Reutiliza las reglas puras del dominio (no las duplica).
import type { AnalysisIssue } from "../../domain/analysis/analysis-issue.js";
import { analysisError, analysisWarning } from "../../domain/analysis/analysis-issue.js";
import type { TokenNodeSummary, AliasState } from "../../domain/analysis/token-node-summary.js";
import type { InspectionStatistics } from "../../domain/analysis/inspection-statistics.js";
import { computeStatistics } from "../../domain/analysis/inspection-statistics.js";
import type { AnalysisLimitsResult, AnalysisLimitHit } from "../../domain/traversal/limits.js";
import { ANALYSIS_LIMITS, analysisLimitsResult } from "../../domain/traversal/limits.js";
import { resolveEffectiveType } from "../../domain/traversal/effective-type.js";
import { tokenPath } from "../../domain/traversal/token-path.js";
import { isRecognizedType, isDeeplySupportedType } from "../../domain/dtcg/recognized-types.js";
import { validateDeepDtcgValue } from "./dtcg-deep-validator.js";

/** Resultado del recorrido (consumible por T029 para construir DesignSystemAnalysis). */
export interface DtcgTraversalResult {
  readonly valid: boolean;
  readonly nodes: readonly TokenNodeSummary[];
  readonly statistics: InspectionStatistics;
  readonly errors: readonly AnalysisIssue[];
  readonly warnings: readonly AnalysisIssue[];
  readonly limits: AnalysisLimitsResult;
}

/** Límites del recorrido (inyectables en tests; por defecto ANALYSIS_LIMITS). Solo lectura. */
export interface TraversalLimits {
  readonly maxDepth: number;
  readonly maxNodes: number;
  readonly maxPathLength: number;
  readonly maxAliasLength: number;
  readonly maxIssues: number;
}

const ALIAS_RE = /^\{([^{}]+)\}$/;

const RESERVED = new Set(["$value", "$type", "$description", "$deprecated", "$extensions", "$extends"]);

interface GroupType {
  readonly type: string;
  readonly path: string;
}

interface TokenRecord {
  readonly path: string;
  readonly depth: number;
  readonly declaredType: string | null;
  readonly rawValue: unknown;
  readonly isAlias: boolean;
  readonly aliasTarget: string | null;
  readonly aliasMalformed: boolean;
  readonly aliasTooLong: boolean;
  readonly description: string | null;
  readonly ancestorGroupType: GroupType | null;
  readonly pathTooLong: boolean;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

interface Frame {
  readonly node: Record<string, unknown>;
  readonly segments: readonly string[];
  readonly depth: number;
  readonly ancestorGroupType: GroupType | null;
  readonly isRoot: boolean;
}

/**
 * Recorre un documento DTCG ya parseado. Iterativo (stack explícito, sin recursión), orden de
 * inserción del JSON (pre-orden), índice de una pasada. No lanza por contenido inválido esperado.
 */
export function traverseDtcgTree(
  document: unknown,
  limits: TraversalLimits = ANALYSIS_LIMITS,
): DtcgTraversalResult {
  const errors: AnalysisIssue[] = [];
  const warnings: AnalysisIssue[] = [];
  const hits: AnalysisLimitHit[] = [];
  const hitKinds = new Set<string>();
  let issuesCapped = false;

  function recordHit(limit: AnalysisLimitHit["limit"], detail: string): void {
    if (!hitKinds.has(limit)) {
      hitKinds.add(limit);
      hits.push({ limit, detail });
    }
  }
  function total(): number {
    return errors.length + warnings.length;
  }
  function addError(issue: AnalysisIssue): void {
    if (issuesCapped) return;
    if (total() >= limits.maxIssues - 1) {
      errors.push(analysisError("limit-issues-exceeded", `Se alcanzó el máximo de ${limits.maxIssues} issues.`, { document: "tokens" }));
      recordHit("issues", `> ${limits.maxIssues}`);
      issuesCapped = true;
      return;
    }
    errors.push(issue);
  }
  function addWarning(issue: AnalysisIssue): void {
    if (issuesCapped) return;
    if (total() >= limits.maxIssues - 1) {
      errors.push(analysisError("limit-issues-exceeded", `Se alcanzó el máximo de ${limits.maxIssues} issues.`, { document: "tokens" }));
      recordHit("issues", `> ${limits.maxIssues}`);
      issuesCapped = true;
      return;
    }
    warnings.push(issue);
  }

  if (!isPlainObject(document)) {
    addError(analysisError("dtcg-document-invalid", "El documento de tokens debe ser un objeto JSON.", { document: "tokens" }));
    return {
      valid: false,
      nodes: [],
      statistics: computeStatistics([], 0),
      errors,
      warnings,
      limits: analysisLimitsResult(hits),
    };
  }

  const records: TokenRecord[] = [];
  const index = new Map<string, TokenRecord>();
  const groups = new Set<string>();
  let nodeCount = 0;

  const rootGroupType: GroupType | null =
    typeof document.$type === "string" ? { type: document.$type, path: "" } : null;

  const stack: Frame[] = [{ node: document, segments: [], depth: 0, ancestorGroupType: rootGroupType, isRoot: true }];

  while (stack.length > 0) {
    const frame = stack.pop() as Frame;

    if (frame.depth > limits.maxDepth) {
      recordHit("depth", `> ${limits.maxDepth}`);
      addError(analysisError("limit-depth-exceeded", `Profundidad máxima superada (> ${limits.maxDepth}).`, { document: "tokens", path: tokenPath(frame.segments) }));
      continue; // no descender
    }

    // Hijos en orden de inserción; reservadas separadas (no son hijos del árbol).
    const childEntries: Array<[string, unknown]> = [];
    for (const [key, value] of Object.entries(frame.node)) {
      if (RESERVED.has(key) || key.startsWith("$")) continue; // $extensions/$* no son hijos
      childEntries.push([key, value]);
    }

    // Clasificar el nodo actual (no la raíz) como token o grupo.
    if (!frame.isRoot) {
      if (nodeCount >= limits.maxNodes) {
        recordHit("nodes", `> ${limits.maxNodes}`);
        addError(analysisError("limit-nodes-exceeded", `Número máximo de nodos superado (> ${limits.maxNodes}).`, { document: "tokens" }));
        break; // detener el recorrido
      }
      nodeCount += 1;

      const path = tokenPath(frame.segments);
      const pathTooLong = path.length > limits.maxPathLength;
      if (pathTooLong) {
        recordHit("path-len", `> ${limits.maxPathLength}`);
        addError(analysisError("limit-path-len-exceeded", `Ruta de token demasiado larga en "${path}".`, { document: "tokens", path }));
      }
      const description = typeof frame.node.$description === "string" ? frame.node.$description : null;

      if ("$value" in frame.node) {
        // Token.
        const declaredType = typeof frame.node.$type === "string" ? frame.node.$type : null;
        const rawValue = frame.node.$value;
        let isAlias = false;
        let aliasTarget: string | null = null;
        let aliasMalformed = false;
        let aliasTooLong = false;
        if (typeof rawValue === "string" && (rawValue.includes("{") || rawValue.includes("}"))) {
          isAlias = true;
          const m = ALIAS_RE.exec(rawValue);
          if (m === null) {
            aliasMalformed = true;
          } else {
            const target = m[1] as string;
            if (target.length > limits.maxAliasLength) {
              aliasTooLong = true;
              recordHit("alias-len", `> ${limits.maxAliasLength}`); // límite duro (ADR-0009) → partial
            } else {
              aliasTarget = target;
            }
          }
        }
        const rec: TokenRecord = {
          path,
          depth: frame.segments.length,
          declaredType,
          rawValue,
          isAlias,
          aliasTarget,
          aliasMalformed,
          aliasTooLong,
          description,
          ancestorGroupType: frame.ancestorGroupType,
          pathTooLong,
        };
        records.push(rec);
        index.set(path, rec);
        // los tokens no descienden a hijos-nodo
        continue;
      }

      // Grupo.
      groups.add(path);
      if (childEntries.length === 0) {
        addWarning(analysisWarning("dtcg-empty-group", `Grupo vacío en "${path}".`, { document: "tokens", path }));
      }
    }

    // Empujar hijos: si el nodo es la raíz o un grupo. Reverso para que el pop preserve inserción.
    const groupType: GroupType | null =
      frame.isRoot
        ? frame.ancestorGroupType
        : typeof frame.node.$type === "string"
          ? { type: frame.node.$type, path: tokenPath(frame.segments) }
          : frame.ancestorGroupType;

    for (let i = childEntries.length - 1; i >= 0; i -= 1) {
      const [key, value] = childEntries[i] as [string, unknown];
      const segments = [...frame.segments, key];
      if (!isPlainObject(value)) {
        addError(analysisError("dtcg-node-invalid", `Nodo inválido en "${tokenPath(segments)}": debe ser un grupo o token.`, { document: "tokens", path: tokenPath(segments) }));
        continue;
      }
      stack.push({ node: value, segments, depth: frame.depth + 1, ancestorGroupType: groupType, isRoot: false });
    }
  }

  // ── Fase 2: resolución de tipo efectivo, aliases/ciclos, issues por token. ───────────────────
  const cyclic = detectCycles(records, index, groups);
  const typeMemo = new Map<string, string | null>();
  const inProgress = new Set<string>();

  function resolvedTypeOf(path: string): string | null {
    if (typeMemo.has(path)) return typeMemo.get(path) as string | null;
    const rec = index.get(path);
    if (rec === undefined) return null; // destino no es token
    if (inProgress.has(path)) return null; // ciclo
    inProgress.add(path);
    let result: string | null;
    if (rec.declaredType !== null) result = rec.declaredType;
    else if (rec.isAlias) result = rec.aliasTarget !== null ? resolvedTypeOf(rec.aliasTarget) : null;
    else result = rec.ancestorGroupType?.type ?? null;
    inProgress.delete(path);
    typeMemo.set(path, result);
    return result;
  }

  const nodes: TokenNodeSummary[] = records.map((rec) => {
    const aliasState = aliasStateOf(rec, index, groups, cyclic);
    const eff = resolveEffectiveType(
      { declaredType: rec.declaredType, isAlias: rec.isAlias, aliasTarget: rec.aliasTarget },
      {
        resolveAliasType: (target) => resolvedTypeOf(target),
        nearestGroupType: () => rec.ancestorGroupType,
      },
    );
    const trust = classifyAndReport(rec, eff.effectiveType, aliasState, addError, addWarning);
    return {
      path: rec.path,
      declaredType: rec.declaredType,
      effectiveType: eff.effectiveType,
      typeOrigin: eff.typeOrigin,
      typeSourcePath: eff.typeSourcePath,
      kind: rec.isAlias ? "alias" : "concrete",
      aliasTarget: rec.aliasTarget,
      aliasState,
      description: rec.description,
      depth: rec.depth,
      trust,
    } satisfies TokenNodeSummary;
  });

  const statistics = computeStatistics(nodes, groups.size);
  const limitsResult = analysisLimitsResult(hits);
  const valid = errors.length === 0 && !limitsResult.partial;
  return { valid, nodes, statistics, errors, warnings, limits: limitsResult };
}

function aliasStateOf(
  rec: TokenRecord,
  index: ReadonlyMap<string, TokenRecord>,
  groups: ReadonlySet<string>,
  cyclic: ReadonlySet<string>,
): AliasState {
  if (!rec.isAlias) return "n/a";
  if (rec.aliasMalformed || rec.aliasTooLong) return "malformed";
  if (rec.aliasTarget === null) return "malformed";
  if (cyclic.has(rec.path)) return "cyclic";
  if (index.has(rec.aliasTarget)) return "valid";
  if (groups.has(rec.aliasTarget)) return "to-group";
  return "missing";
}

function classifyAndReport(
  rec: TokenRecord,
  effectiveType: string | null,
  aliasState: AliasState,
  addError: (i: AnalysisIssue) => void,
  addWarning: (i: AnalysisIssue) => void,
): TokenNodeSummary["trust"] {
  const path = rec.path;
  if (rec.description === null) {
    addWarning(analysisWarning("dtcg-description-missing", `Token sin $description en "${path}".`, { document: "tokens", path }));
  }

  // Aliases problemáticos.
  if (rec.isAlias) {
    switch (aliasState) {
      case "malformed":
        if (rec.aliasTooLong) addError(analysisError("alias-too-long", `Referencia de alias demasiado larga en "${path}".`, { document: "tokens", path }));
        else addError(analysisError("alias-malformed", `Alias malformado en "${path}".`, { document: "tokens", path }));
        return "untrusted";
      case "missing":
        addError(analysisError("alias-missing", `Referencia inexistente en "${path}".`, { document: "tokens", path }));
        return "untrusted";
      case "to-group":
        addError(analysisError("alias-to-group", `La referencia en "${path}" apunta a un grupo, no a un token.`, { document: "tokens", path }));
        return "untrusted";
      case "cyclic":
        addError(analysisError("alias-cyclic", `Ciclo de alias en "${path}".`, { document: "tokens", path }));
        return "untrusted";
      default:
        break;
    }
  }

  // Tipo efectivo.
  if (effectiveType === null) {
    addError(analysisError("dtcg-type-undeterminable", `No se pudo determinar el $type efectivo de "${path}".`, { document: "tokens", path }));
    return "untrusted";
  }
  if (!isRecognizedType(effectiveType)) {
    addError(analysisError("dtcg-type-unrecognized", `$type no reconocido "${effectiveType}" en "${path}".`, { document: "tokens", path }));
    return "untrusted";
  }
  if (isDeeplySupportedType(effectiveType)) {
    if (!rec.isAlias) {
      const validationIssue = validateDeepDtcgValue(effectiveType, rec.rawValue, path);
      if (validationIssue !== null) {
        addError(validationIssue);
        return "untrusted";
      }
    }
    return "valid";
  }
  addWarning(analysisWarning("dtcg-type-not-deeply-inspected", `Tipo "${effectiveType}" reconocido pero sin inspección profunda en "${path}".`, { document: "tokens", path }));
  return "valid";
}

/** Detecta los tokens que participan en un ciclo de aliases (directos o indirectos). */
function detectCycles(
  records: readonly TokenRecord[],
  index: ReadonlyMap<string, TokenRecord>,
  groups: ReadonlySet<string>,
): ReadonlySet<string> {
  const edges = new Map<string, string>();
  for (const rec of records) {
    if (rec.isAlias && rec.aliasTarget !== null && index.has(rec.aliasTarget) && !groups.has(rec.aliasTarget)) {
      edges.set(rec.path, rec.aliasTarget);
    }
  }
  const cyclic = new Set<string>();
  for (const start of edges.keys()) {
    if (cyclic.has(start)) continue;
    const chain: string[] = [];
    const seen = new Set<string>();
    let cur: string | undefined = start;
    while (cur !== undefined && edges.has(cur)) {
      if (seen.has(cur)) {
        // marcar el ciclo a partir de la primera aparición de `cur`.
        const from = chain.indexOf(cur);
        for (const p of chain.slice(from)) cyclic.add(p);
        break;
      }
      seen.add(cur);
      chain.push(cur);
      cur = edges.get(cur);
    }
  }
  return cyclic;
}
