import { describe, expect, it } from "vitest";
import { EMPTY_DIFF } from "../../../src/domain/token-mutations/diff.js";
import { issue } from "../../../src/domain/token-mutations/outcome.js";
import type { TokenMutationResultV1 } from "../../../src/domain/token-mutations/result.js";
import type { ViewerSessionV1 } from "../../../src/application/viewer/session.js";
import {
  canStartEditorDraft,
  createEditorApplyResult,
  createEditorCommandDraft,
  createEditorDiffView,
  createEditorDraftForOperation,
  createEditorPlanView,
  createEditorReview,
  createEditorSession,
  EDITOR_WORKFLOW_STATES,
  transitionEditorState,
} from "../../../src/application/editor/index.js";

const viewerSession: ViewerSessionV1 = Object.freeze({
  state: "ready",
  host: Object.freeze({ initialized: true }),
  overview: null,
  navigation: null,
});

const plannedResult: TokenMutationResultV1 = Object.freeze({
  outcome: "planned",
  wrote: false,
  plan: Object.freeze({
    operations: Object.freeze([{ kind: "update-value", path: "color.brand.primary", value: "#1166ff" }]),
    diff: EMPTY_DIFF,
    candidateHash: "sha256:candidate",
    source: Object.freeze({ logicalPath: "design-system/tokens/base.tokens.json", contentHash: "sha256:source" }),
    writable: true,
  }),
  diff: EMPTY_DIFF,
  conflicts: Object.freeze([]),
  recovery: null,
  source: Object.freeze({ logicalPath: "design-system/tokens/base.tokens.json", contentHash: "sha256:source" }),
  error: null,
});

describe("editor contract shapes (010 Checkpoint A)", () => {
  it("declara todos los estados explícitos requeridos para el workflow visual", () => {
    expect(EDITOR_WORKFLOW_STATES).toEqual([
      "idle",
      "drafting",
      "planning",
      "plan-ready",
      "blocked",
      "approval-required",
      "applying",
      "applied",
      "unchanged",
      "conflict",
      "verification-error",
      "recovery-required",
    ]);
  });

  it("crea sesiones editoriales sin copiar ni mutar la sesión Viewer", () => {
    const draft = createEditorCommandDraft();
    const session = createEditorSession(viewerSession, { state: "drafting", draft });

    expect(session.viewer).toBe(viewerSession);
    expect(session.mode).toBe("edit");
    expect(session.draft).toBe(draft);
    expect(canStartEditorDraft(viewerSession)).toBe(true);
  });

  it("envuelve operaciones 008 como drafts visuales sin duplicar el contrato de comando", () => {
    const draft = createEditorDraftForOperation(
      { kind: "update-description", path: "color.brand.primary", description: "Primary brand color" },
      { selectedTokenPath: "color.brand.primary" },
    );

    expect(draft.state).toBe("dirty");
    expect(draft.command.formatVersion).toBe("1.0.0");
    expect(draft.command.operations).toEqual([{ kind: "update-description", path: "color.brand.primary", description: "Primary brand color" }]);
    expect(draft.visualOperation).toBe("update-description");
  });

  it("proyecta plan/diff/issues públicos para revisión visual", () => {
    const blocked = issue("alias-cycle", "color.brand.primary", "Alias cycle", { dependents: ["color.brand.secondary"] });
    const view = createEditorPlanView({ ...plannedResult, conflicts: Object.freeze([blocked]) });
    const expired = createEditorReview(plannedResult, { expiredPlan: true });

    expect(view.outcome).toBe("planned");
    expect(view.writable).toBe(false);
    expect(view.canRequestApproval).toBe(false);
    expect(view.issues[0]).toMatchObject({ code: "alias-cycle", blocksApply: true });
    expect(createEditorDiffView(EMPTY_DIFF).isEmpty).toBe(true);
    expect(expired).toMatchObject({ state: "expired", canApprove: false, expiredPlan: true });
  });

  it("representa resultados de apply/recovery sin Error, stack ni rutas absolutas", () => {
    const result = createEditorApplyResult({
      ...plannedResult,
      outcome: "verification-error",
      recovery: Object.freeze({ sourceAvailable: true, backupRelativePath: ".backups/base.tokens.json", recoveryRequired: true }),
    });

    expect(result.state).toBe("recovery-required");
    expect(JSON.stringify(result)).not.toContain("Error");
    expect(JSON.stringify(result)).not.toContain("/Volumes/");
  });

  it("mantiene transiciones explícitas sin saltar directo a apply desde draft", () => {
    expect(transitionEditorState("idle", "start-draft")).toBe("drafting");
    expect(transitionEditorState("drafting", "start-apply")).toBe("drafting");
    expect(transitionEditorState("approval-required", "start-apply")).toBe("applying");
  });
});
