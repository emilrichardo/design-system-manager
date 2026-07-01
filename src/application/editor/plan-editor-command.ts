// T010 (010) — Adapter de aplicación: comando editorial estructurado -> planner 008 -> review visual.
import type { TokenMutationCommandV1 } from "../../domain/token-mutations/command.js";
import type { TokenMutationResultV1 } from "../../domain/token-mutations/result.js";
import { planTokenMutation, type PlanTokenMutationDependencies } from "../token-mutations/plan-token-mutation.js";
import { createEditorReview, type EditorReviewV1 } from "./review.js";

export interface PlanEditorCommandResultV1 {
  readonly mutation: TokenMutationResultV1;
  readonly review: EditorReviewV1;
}

export async function planEditorCommand(
  input: { readonly executionDir: string },
  command: TokenMutationCommandV1,
  deps: PlanTokenMutationDependencies,
): Promise<PlanEditorCommandResultV1> {
  const mutation = await planTokenMutation(input, command, deps);
  return Object.freeze({ mutation, review: createEditorReview(mutation) });
}
