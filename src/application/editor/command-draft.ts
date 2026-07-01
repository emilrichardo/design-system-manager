// T002 (010) — Draft visual de comando. El draft referencia el contrato 008 sin duplicar operaciones,
// comandos ni semántica de conflictos.
import { createTokenMutationCommand, TOKEN_MUTATION_FORMAT_VERSION, type TokenMutationCommandV1 } from "../../domain/token-mutations/command.js";
import { isTokenMutationOperationKind, type TokenMutationOperationKind, type TokenMutationOperationV1 } from "../../domain/token-mutations/operation.js";

export type EditorVisualOperationKindV1 = TokenMutationOperationKind;

export type EditorDraftStateV1 = "empty" | "dirty" | "invalid";

export interface EditorControlErrorV1 {
  readonly field: string;
  readonly code: string;
  readonly message: string;
}

export interface EditorCommandDraftV1 {
  readonly formatVersion: "1.0.0";
  readonly state: EditorDraftStateV1;
  readonly selectedTokenPath: string | null;
  readonly visualOperation: EditorVisualOperationKindV1 | null;
  readonly command: TokenMutationCommandV1;
  readonly controlErrors: readonly EditorControlErrorV1[];
}

export interface CreateEditorCommandDraftOptions {
  readonly selectedTokenPath?: string | null;
  readonly visualOperation?: EditorVisualOperationKindV1 | null;
  readonly controlErrors?: readonly EditorControlErrorV1[];
}

export function createEditorCommandDraft(
  operations: readonly TokenMutationOperationV1[] = [],
  options: CreateEditorCommandDraftOptions = {},
): EditorCommandDraftV1 {
  const controlErrors = Object.freeze([...(options.controlErrors ?? [])].map((error) => Object.freeze({ ...error })));
  const state: EditorDraftStateV1 = controlErrors.length > 0 ? "invalid" : operations.length > 0 ? "dirty" : "empty";

  return Object.freeze({
    formatVersion: "1.0.0",
    state,
    selectedTokenPath: options.selectedTokenPath ?? null,
    visualOperation: options.visualOperation ?? (operations[0]?.kind ?? null),
    command: createTokenMutationCommand(operations),
    controlErrors,
  });
}

export function createEditorDraftForOperation(
  operation: TokenMutationOperationV1,
  options: Omit<CreateEditorCommandDraftOptions, "visualOperation"> = {},
): EditorCommandDraftV1 {
  return createEditorCommandDraft([operation], { ...options, visualOperation: operation.kind });
}

export function isEditorVisualOperationKind(value: unknown): value is EditorVisualOperationKindV1 {
  return isTokenMutationOperationKind(value);
}

export function isEditorCommandDraft(value: unknown): value is EditorCommandDraftV1 {
  if (typeof value !== "object" || value === null) return false;
  const draft = value as Partial<EditorCommandDraftV1>;
  return (
    draft.formatVersion === "1.0.0" &&
    (draft.state === "empty" || draft.state === "dirty" || draft.state === "invalid") &&
    typeof draft.command === "object" &&
    draft.command !== null &&
    draft.command.formatVersion === TOKEN_MUTATION_FORMAT_VERSION &&
    Array.isArray(draft.command.operations)
  );
}
