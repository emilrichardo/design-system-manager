import { appliedChanges } from "../../domain/changes/application-plan.js";
import type { ApplicationPlan } from "../../domain/changes/application-plan.js";
import type { TokenChange } from "../../domain/changes/token-change.js";
import {
  cloneJsonValue,
  completeMissingDescription,
  insertMissingLogicalPath,
  isJsonRecord,
  serializePresetCandidateValue,
  type JsonRecord,
} from "./preserve-host-document.js";

export type PresetCandidateStatus = "built" | "unchanged" | "blocked" | "invalid-host" | "invalid-change";

export interface BuildPresetCandidateDocumentInput {
  readonly hostDocument: unknown;
  readonly originalBytes: string;
  readonly plan: ApplicationPlan;
}

export interface PresetCandidateDocumentResult {
  readonly status: PresetCandidateStatus;
  readonly document: unknown;
  readonly bytes: string;
  readonly appliedChanges: number;
  readonly reason: string | null;
}

export function buildPresetCandidateDocument(
  input: BuildPresetCandidateDocumentInput,
): PresetCandidateDocumentResult {
  if (!isJsonRecord(input.hostDocument)) {
    return {
      status: "invalid-host",
      document: input.hostDocument,
      bytes: input.originalBytes,
      appliedChanges: 0,
      reason: "host-document-not-object",
    };
  }

  if (!input.plan.writable) return noWrite("blocked", input.hostDocument, input.originalBytes, "plan-not-writable");
  if (!input.plan.summary.wouldWrite) return noWrite("unchanged", input.hostDocument, input.originalBytes, "plan-has-no-writes");

  const candidate = cloneJsonValue(input.hostDocument);
  let count = 0;

  for (const change of appliedChanges(input.plan)) {
    const applied = applyChange(candidate, change);
    if (applied === "invalid") {
      return {
        status: "invalid-change",
        document: cloneJsonValue(input.hostDocument),
        bytes: input.originalBytes,
        appliedChanges: 0,
        reason: `invalid-change:${change.path}`,
      };
    }
    if (applied) count += 1;
  }

  return {
    status: "built",
    document: candidate,
    bytes: serializePresetCandidateValue(candidate),
    appliedChanges: count,
    reason: null,
  };
}

function noWrite(
  status: "unchanged" | "blocked",
  hostDocument: JsonRecord,
  originalBytes: string,
  reason: string,
): PresetCandidateDocumentResult {
  return {
    status,
    document: cloneJsonValue(hostDocument),
    bytes: originalBytes,
    appliedChanges: 0,
    reason,
  };
}

function applyChange(root: JsonRecord, change: TokenChange): boolean | "invalid" {
  switch (change.operation) {
    case "create":
      if (change.nodeKind === "group") return insertMissingLogicalPath(root, change.path, change.proposedToken ?? {});
      if (change.proposedToken === null) return "invalid";
      return insertMissingLogicalPath(root, change.path, change.proposedToken);
    case "update": {
      const description = change.proposedToken?.$description;
      if (typeof description !== "string") return "invalid";
      return completeMissingDescription(root, change.path, description);
    }
    case "unchanged":
    case "conflict":
    case "skip":
      return false;
  }
}
