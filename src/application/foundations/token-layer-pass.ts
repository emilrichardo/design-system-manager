import { analysisError, analysisWarning, type AnalysisIssue } from "../../domain/analysis/analysis-issue.js";
import {
  emptyTokenLayer,
  evaluateAliasLayerTransition,
  isTokenLayer,
  unclassifiedLayerWarning,
  validateTokenLayerShape,
  type TokenLayerV1,
  type TokenProvenanceV1,
} from "../../domain/token-mutations/token-layer.js";
import type { TokenNodeSummary } from "../../domain/analysis/token-node-summary.js";
import { tokenPath } from "../../domain/traversal/token-path.js";
import { isProvenanceStatus } from "../../domain/provenance.js";

const TOKEN_LAYER_NAMESPACE = "ar.neuraz.design-system";

interface Frame {
  readonly node: Record<string, unknown>;
  readonly segments: readonly string[];
}

interface TokenLayerProjection {
  readonly layers: ReadonlyMap<string, TokenLayerV1 | null>;
  readonly issues: readonly AnalysisIssue[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function issueToAnalysis(issue: { readonly code: string; readonly message: string; readonly path?: string }): AnalysisIssue {
  return issue.code === "token-layer-unclassified" ||
    issue.code === "component-token-bypasses-semantic" ||
    issue.code === "brand-token-bypasses-semantic"
    ? analysisWarning(issue.code, issue.message, { document: "tokens", ...(issue.path !== undefined ? { path: issue.path } : {}) })
    : analysisError(issue.code, issue.message, { document: "tokens", ...(issue.path !== undefined ? { path: issue.path } : {}) });
}

function readNullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readProvenance(value: unknown): TokenProvenanceV1 | null {
  if (!isRecord(value)) return null;
  const status = isProvenanceStatus(value.status) ? value.status : null;
  const confidence = typeof value.confidence === "number" ? value.confidence : null;
  if (status === null) return null;
  return Object.freeze({ status, confidence });
}

function normalizeLayerExtension(value: unknown): TokenLayerV1 | null {
  if (!isRecord(value)) return null;
  return Object.freeze({
    ...emptyTokenLayer(),
    layer: isTokenLayer(value.layer) ? value.layer : null,
    brandRole: value.brandRole === "brand" ? "brand" : null,
    component: readNullableString(value.component),
    part: readNullableString(value.part),
    variant: readNullableString(value.variant),
    state: readNullableString(value.state),
    size: readNullableString(value.size),
    mode: readNullableString(value.mode),
    responsiveCondition: readNullableString(value.responsiveCondition),
    property: readNullableString(value.property),
    provenance: readProvenance(value.provenance),
  });
}

function tokenLayerExtension(node: Record<string, unknown>): unknown {
  const extensions = node.$extensions;
  if (!isRecord(extensions)) return undefined;
  return extensions[TOKEN_LAYER_NAMESPACE];
}

function pushChildren(node: Record<string, unknown>, segments: readonly string[], stack: Frame[]): void {
  const children: Frame[] = [];
  for (const key of Object.keys(node)) {
    if (key.startsWith("$")) continue;
    const value = node[key];
    if (!isRecord(value)) continue;
    children.push({ node: value, segments: [...segments, key] });
  }
  for (let index = children.length - 1; index >= 0; index -= 1) {
    stack.push(children[index] as Frame);
  }
}

export function projectTokenLayers(parsed: unknown, nodes: readonly TokenNodeSummary[]): TokenLayerProjection {
  const layers = new Map<string, TokenLayerV1 | null>();
  const issues: AnalysisIssue[] = [];
  if (!isRecord(parsed)) return { layers, issues };

  let hasDeclaredNamespace = false;
  const stack: Frame[] = [];
  pushChildren(parsed, [], stack);

  while (stack.length > 0) {
    const frame = stack.pop() as Frame;
    const path = tokenPath(frame.segments);
    const extension = tokenLayerExtension(frame.node);
    if (extension !== undefined) hasDeclaredNamespace = true;

    if ("$value" in frame.node) {
      const normalized = normalizeLayerExtension(extension);
      layers.set(path, normalized);
      for (const shapeIssue of validateTokenLayerShape(isRecord(extension) ? (extension as Partial<TokenLayerV1>) : null, path)) {
        issues.push(issueToAnalysis(shapeIssue));
      }
      continue;
    }

    pushChildren(frame.node, frame.segments, stack);
  }

  if (!hasDeclaredNamespace) return { layers, issues };

  for (const node of nodes) {
    const layer = layers.get(node.path) ?? null;
    const unclassified = unclassifiedLayerWarning(layer, node.path);
    if (unclassified !== null) issues.push(issueToAnalysis(unclassified));
  }

  for (const node of nodes) {
    if (node.kind !== "alias" || node.aliasState !== "valid" || node.aliasTarget === null) continue;
    const transition = evaluateAliasLayerTransition(
      node.path,
      layers.get(node.path) ?? null,
      layers.get(node.aliasTarget) ?? null,
    );
    if (transition !== null) issues.push(issueToAnalysis(transition));
  }

  return { layers, issues };
}
