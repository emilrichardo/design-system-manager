// T003 (011) — Validador puro de `transition` (contracts/dtcg-type-support.md). Sin I/O.
import type { Issue } from "../../issue.js";
import { issueAt } from "./shape-utils.js";
import { parseDuration, type DurationValue } from "./duration.js";
import { parseCubicBezier, type CubicBezierValue } from "./cubic-bezier.js";

export interface TransitionValue {
  readonly duration: DurationValue;
  readonly delay: DurationValue;
  readonly timingFunction: CubicBezierValue;
}

export type TransitionParseResult =
  | { readonly ok: true; readonly value: TransitionValue }
  | { readonly ok: false; readonly issue: Issue };

export function parseTransition(value: unknown, path: string): TransitionParseResult {
  if (value === null || typeof value !== "object") {
    return { ok: false, issue: issueAt("transition-shape-invalid", path, `Transition no es un objeto en "${path}".`) };
  }
  const obj = value as Record<string, unknown>;
  const duration = parseDuration(obj.duration, path);
  if (!duration.ok) return { ok: false, issue: duration.issue };
  const delay = parseDuration(obj.delay ?? { value: 0, unit: "ms" }, path);
  if (!delay.ok) return { ok: false, issue: delay.issue };
  const timingFunction = parseCubicBezier(obj.timingFunction, path);
  if (!timingFunction.ok) return { ok: false, issue: timingFunction.issue };
  return { ok: true, value: { duration: duration.value, delay: delay.value, timingFunction: timingFunction.value } };
}
