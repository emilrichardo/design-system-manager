// T003 (011) — Validador puro de `transition` (contracts/dtcg-type-support.md). Sin I/O.
import type { Issue } from "../../issue.js";
import { isAliasReference, issueAt } from "./shape-utils.js";
import { parseDuration, type DurationValue } from "./duration.js";
import { parseCubicBezier, type CubicBezierValue } from "./cubic-bezier.js";

export interface TransitionValue {
  readonly duration: DurationValue | string;
  readonly delay: DurationValue | string;
  readonly timingFunction: CubicBezierValue | string;
}

export type TransitionParseResult =
  | { readonly ok: true; readonly value: TransitionValue }
  | { readonly ok: false; readonly issue: Issue };

export function parseTransition(value: unknown, path: string): TransitionParseResult {
  if (value === null || typeof value !== "object") {
    return { ok: false, issue: issueAt("transition-shape-invalid", path, `Transition no es un objeto en "${path}".`) };
  }
  const obj = value as Record<string, unknown>;
  const duration = isAliasReference(obj.duration) ? { ok: true as const, value: obj.duration } : parseDuration(obj.duration, path);
  if (!duration.ok) return { ok: false, issue: duration.issue };
  const delayValue = obj.delay ?? { value: 0, unit: "ms" };
  const delay = isAliasReference(delayValue) ? { ok: true as const, value: delayValue } : parseDuration(delayValue, path);
  if (!delay.ok) return { ok: false, issue: delay.issue };
  const timingFunction = isAliasReference(obj.timingFunction)
    ? { ok: true as const, value: obj.timingFunction }
    : parseCubicBezier(obj.timingFunction, path);
  if (!timingFunction.ok) return { ok: false, issue: timingFunction.issue };
  return { ok: true, value: { duration: duration.value, delay: delay.value, timingFunction: timingFunction.value } };
}
