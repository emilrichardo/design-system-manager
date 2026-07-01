// T003/T004 (010) — Proyección de plan y diff para revisión visual. Reusa 008 como fuente de verdad.
import type { TokenMutationDiffEntry, TokenMutationDiffSummary, TokenMutationDiffV1 } from "../../domain/token-mutations/diff.js";
import type { MutationIssue } from "../../domain/token-mutations/outcome.js";
import type { TokenMutationPlanV1, TokenMutationResultV1 } from "../../domain/token-mutations/result.js";

export interface EditorIssueV1 {
  readonly code: MutationIssue["code"];
  readonly path: string | null;
  readonly severity: MutationIssue["severity"];
  readonly message: string;
  readonly blocksApply: boolean;
  readonly dependents: readonly string[];
}

export interface EditorDiffViewV1 {
  readonly entries: readonly TokenMutationDiffEntry[];
  readonly summary: TokenMutationDiffSummary;
  readonly isEmpty: boolean;
}

export interface EditorPlanViewV1 {
  readonly outcome: TokenMutationResultV1["outcome"];
  readonly writable: boolean;
  readonly operationsCount: number;
  readonly candidateHash: string | null;
  readonly source: TokenMutationPlanV1["source"] | null;
  readonly diff: EditorDiffViewV1 | null;
  readonly issues: readonly EditorIssueV1[];
  readonly canRequestApproval: boolean;
}

export interface EditorReviewV1 {
  readonly state: "ready" | "blocked" | "expired";
  readonly plan: EditorPlanViewV1;
  readonly diff: EditorDiffViewV1 | null;
  readonly canApprove: boolean;
  readonly expiredPlan: boolean;
}

export function mapEditorIssue(issue: MutationIssue): EditorIssueV1 {
  return Object.freeze({
    code: issue.code,
    path: issue.path,
    severity: issue.severity,
    message: issue.message,
    blocksApply: issue.blocksApply,
    dependents: Object.freeze([...issue.dependents]),
  });
}

export function createEditorDiffView(diff: TokenMutationDiffV1): EditorDiffViewV1 {
  return Object.freeze({
    entries: Object.freeze(diff.entries.map((entry) => Object.freeze({ ...entry, references: Object.freeze([...entry.references]) }))),
    summary: Object.freeze({ ...diff.summary }),
    isEmpty: diff.entries.length === 0,
  });
}

export function createEditorPlanView(result: TokenMutationResultV1): EditorPlanViewV1 {
  const plan = result.plan;
  const diff = result.diff ?? plan?.diff ?? null;
  const issues = Object.freeze(result.conflicts.map(mapEditorIssue));
  const writable = plan?.writable === true && issues.every((issue) => !issue.blocksApply);
  return Object.freeze({
    outcome: result.outcome,
    writable,
    operationsCount: plan?.operations.length ?? 0,
    candidateHash: plan?.candidateHash ?? null,
    source: plan?.source ?? result.source ?? null,
    diff: diff === null ? null : createEditorDiffView(diff),
    issues,
    canRequestApproval: result.outcome === "planned" && writable,
  });
}

export function createEditorReview(result: TokenMutationResultV1, options: { readonly expiredPlan?: boolean } = {}): EditorReviewV1 {
  const plan = createEditorPlanView(result);
  const expiredPlan = options.expiredPlan === true;
  const canApprove = plan.canRequestApproval && !expiredPlan;
  return Object.freeze({
    state: expiredPlan ? "expired" : canApprove ? "ready" : "blocked",
    plan,
    diff: plan.diff,
    canApprove,
    expiredPlan,
  });
}
