import { appliedChanges, applicationPlan } from "../../domain/changes/application-plan.js";
import { PRESET_APPLICATION_TARGET_FILE } from "../../domain/presets/preset-application-plan.js";
import type { PresetApplyResult } from "../../domain/presets/preset-apply-result.js";
import type { PresetApplicationPlan, PresetApplicationSummary } from "../../domain/presets/preset-application-plan.js";
import type { PresetEnvelope, PresetMetadata } from "../../domain/presets/preset-envelope.js";
import { presetConflict } from "../../domain/presets/preset-conflict.js";
import { presetSupportDocuments } from "../../domain/presets/preset-support-documents.js";
import type { ManagedNode } from "../../domain/changes/equivalence.js";
import { projectFoundationMetadata } from "../foundations/metadata-pass.js";
import { buildPresetCandidateDocument } from "./build-preset-candidate-document.js";
import { planPresetDiff } from "./plan-preset-diff.js";
import { projectManagedNodes, type ManagedNodeFacts } from "./project-managed-nodes.js";
import type { ApplyPreset } from "./preset-ports.js";
import { validatePreset } from "./validate-preset.js";
import { verifyPresetApplication } from "./verify-preset-application.js";
import { verifyPresetCandidate } from "./verify-preset-candidate.js";

const EMPTY_SUMMARY: PresetApplicationSummary = {
  create: 0,
  update: 0,
  unchanged: 0,
  conflict: 0,
  skip: 0,
  total: 0,
  blockingConflicts: 0,
  wouldWrite: false,
};

function metadata(envelope: PresetEnvelope): PresetMetadata {
  return {
    id: envelope.id,
    name: envelope.name,
    description: envelope.description,
    version: envelope.version,
    includedCategories: [...envelope.includedCategories],
  };
}

function baseResult(overrides: Partial<PresetApplyResult>): PresetApplyResult {
  return {
    outcome: "read-error",
    preset: null,
    targetFile: null,
    plan: null,
    summary: EMPTY_SUMMARY,
    wrote: false,
    verification: null,
    notFoundResource: null,
    backup: null,
    error: null,
    ...overrides,
  };
}

export const applyPreset: ApplyPreset = async (input, deps) => {
  const envelope = await deps.catalog.get(input.id);
  if (envelope === null) return baseResult({ outcome: "not-found", notFoundResource: "preset" });

  const presetAnalysis = deps.analyzeTokens(envelope.tokens);
  const validation = validatePreset(envelope, presetAnalysis);
  if (!validation.valid) return baseResult({ outcome: "invalid-preset", preset: metadata(envelope) });

  const host = await deps.analyzeHost({ executionDir: input.executionDir });
  if (host.structuralState === "not-initialized") {
    return baseResult({ outcome: "not-found", preset: metadata(envelope), notFoundResource: "design-system" });
  }
  const parsed = host.documents[PRESET_APPLICATION_TARGET_FILE]?.parsed;
  if (parsed === undefined) {
    return baseResult({ outcome: "read-error", preset: metadata(envelope), targetFile: PRESET_APPLICATION_TARGET_FILE });
  }

  const target = await deps.targetReader.read({ rootDir: host.host.root, relativePath: PRESET_APPLICATION_TARGET_FILE });
  if (target.outcome === "not-found") {
    return baseResult({ outcome: "not-found", preset: metadata(envelope), targetFile: PRESET_APPLICATION_TARGET_FILE, notFoundResource: "design-system" });
  }
  if (target.outcome === "read-error") {
    return baseResult({ outcome: "read-error", preset: metadata(envelope), targetFile: PRESET_APPLICATION_TARGET_FILE });
  }
  const originalContent = target.content;
  if (originalContent === null) {
    return baseResult({ outcome: "read-error", preset: metadata(envelope), targetFile: PRESET_APPLICATION_TARGET_FILE });
  }

  const supportDocuments = presetSupportDocuments(input.id);
  const missingSupportDocuments: Array<(typeof supportDocuments)[number]> = [];
  let conflictingSupportDocument: { readonly relativePath: string } | null = null;
  for (const supportDocument of supportDocuments) {
    const current = await deps.targetReader.read({ rootDir: host.host.root, relativePath: supportDocument.relativePath });
    if (current.outcome === "read-error") {
      return baseResult({ outcome: "read-error", preset: metadata(envelope), targetFile: PRESET_APPLICATION_TARGET_FILE });
    }
    if (current.outcome === "not-found") {
      missingSupportDocuments.push(supportDocument);
      continue;
    }
    if (current.content !== supportDocument.content) {
      conflictingSupportDocument = { relativePath: supportDocument.relativePath };
      break;
    }
  }

  const hostLevels = projectFoundationMetadata(parsed).levels;
  const hostFacts = new Map<string, ManagedNodeFacts>();
  for (const node of host.nodes) {
    hostFacts.set(node.path, { effectiveType: node.effectiveType, level: hostLevels.get(node.path)?.level ?? "unclassified" });
  }
  const hostMap = new Map<string, ManagedNode>(projectManagedNodes(parsed, hostFacts).map((node) => [node.path, node]));

  const presetFacts = new Map<string, ManagedNodeFacts>();
  for (const node of presetAnalysis.nodes) presetFacts.set(node.path, { effectiveType: node.effectiveType, level: node.level });
  const { plan } = planPresetDiff({ candidates: projectManagedNodes(envelope.tokens, presetFacts), host: hostMap });
  const wrapped: PresetApplicationPlan = {
    preset: metadata(envelope),
    targetFile: PRESET_APPLICATION_TARGET_FILE,
    plan,
    hostState: host.structuralState,
    notFoundResource: null,
  };

  if (conflictingSupportDocument !== null) {
    const conflict = presetConflict(
      "preset-concurrent-modification",
      conflictingSupportDocument.relativePath,
    );
    const blockedPlan = applicationPlan(plan.changeSet.changes, [...plan.conflicts, conflict]);
    return baseResult({
      outcome: "conflict",
      preset: metadata(envelope),
      targetFile: PRESET_APPLICATION_TARGET_FILE,
      plan: { ...wrapped, plan: blockedPlan },
      summary: blockedPlan.summary,
      error: {
        code: "preset-support-document-conflict",
        message: `Support document already exists with different content: ${conflictingSupportDocument.relativePath}.`,
      },
    });
  }

  if (!plan.writable) return baseResult({ outcome: "conflict", preset: metadata(envelope), targetFile: PRESET_APPLICATION_TARGET_FILE, plan: wrapped, summary: plan.summary });
  if (!plan.summary.wouldWrite && missingSupportDocuments.length === 0) {
    return baseResult({ outcome: "unchanged", preset: metadata(envelope), targetFile: PRESET_APPLICATION_TARGET_FILE, plan: wrapped, summary: plan.summary });
  }

  const createdSupportDocuments: string[] = [];
  for (const supportDocument of missingSupportDocuments) {
    const writeSupport = await deps.writer.write({
      rootDir: host.host.root,
      relativePath: supportDocument.relativePath,
      content: supportDocument.content,
      expectedContent: "",
      createBackup: false,
      allowCreate: true,
    });
    if (writeSupport.outcome !== "written") {
      for (const created of createdSupportDocuments.reverse()) {
        await deps.writer.removeFile(host.host.root, created);
      }
      return baseResult({
        outcome: writeSupport.outcome === "concurrent-modification" ? "conflict" : "write-error",
        preset: metadata(envelope),
        targetFile: PRESET_APPLICATION_TARGET_FILE,
        plan: wrapped,
        summary: plan.summary,
        error: writeSupport.error,
      });
    }
    createdSupportDocuments.push(supportDocument.relativePath);
  }

  if (!plan.summary.wouldWrite) {
    return baseResult({
      outcome: "applied",
      preset: metadata(envelope),
      targetFile: PRESET_APPLICATION_TARGET_FILE,
      plan: wrapped,
      summary: plan.summary,
      wrote: true,
    });
  }

  const candidate = buildPresetCandidateDocument({ hostDocument: parsed, originalBytes: originalContent, plan });
  if (candidate.status !== "built") {
    for (const created of createdSupportDocuments.reverse()) {
      await deps.writer.removeFile(host.host.root, created);
    }
    return baseResult({
      outcome: "write-error",
      preset: metadata(envelope),
      targetFile: PRESET_APPLICATION_TARGET_FILE,
      plan: wrapped,
      summary: plan.summary,
      error: { code: candidate.status, message: candidate.reason ?? "Candidate could not be built." },
    });
  }

  const intended = appliedChanges(plan);
  const prewrite = verifyPresetCandidate({ candidateDocument: candidate.document, intendedChanges: intended, analyzeTokens: deps.analyzeTokens });
  if (!prewrite.valid) {
    for (const created of createdSupportDocuments.reverse()) {
      await deps.writer.removeFile(host.host.root, created);
    }
    return baseResult({
      outcome: "write-error",
      preset: metadata(envelope),
      targetFile: PRESET_APPLICATION_TARGET_FILE,
      plan: wrapped,
      summary: plan.summary,
      verification: prewrite,
      error: { code: "preset-candidate-invalid", message: "Preset candidate failed pre-write verification." },
    });
  }

  const write = await deps.writer.write({
    rootDir: host.host.root,
    relativePath: PRESET_APPLICATION_TARGET_FILE,
    content: candidate.bytes,
    expectedContent: originalContent,
    createBackup: true,
  });
  if (write.outcome === "concurrent-modification") {
    for (const created of createdSupportDocuments.reverse()) {
      await deps.writer.removeFile(host.host.root, created);
    }
    const conflict = presetConflict("preset-concurrent-modification", PRESET_APPLICATION_TARGET_FILE);
    const blockedPlan = applicationPlan(plan.changeSet.changes, [...plan.conflicts, conflict]);
    return baseResult({
      outcome: "conflict",
      preset: metadata(envelope),
      targetFile: PRESET_APPLICATION_TARGET_FILE,
      plan: { ...wrapped, plan: blockedPlan },
      summary: blockedPlan.summary,
      error: write.error,
    });
  }
  if (write.outcome !== "written") {
    for (const created of createdSupportDocuments.reverse()) {
      await deps.writer.removeFile(host.host.root, created);
    }
    return baseResult({
      outcome: "write-error",
      preset: metadata(envelope),
      targetFile: PRESET_APPLICATION_TARGET_FILE,
      plan: wrapped,
      summary: plan.summary,
      error: write.error,
    });
  }

  const post = await verifyPresetApplication({ executionDir: input.executionDir, intendedChanges: intended, analyzeHost: deps.analyzeHost });
  if (!post.valid) {
    return baseResult({
      outcome: "verification-error",
      preset: metadata(envelope),
      targetFile: PRESET_APPLICATION_TARGET_FILE,
      plan: wrapped,
      summary: plan.summary,
      wrote: true,
      verification: post,
      backup: write.backupRelativePath === null ? null : { relativePath: write.backupRelativePath },
      error: { code: "preset-verification-error", message: "Preset application failed post-write verification." },
    });
  }

  if (write.backupRelativePath !== null) await deps.writer.cleanupBackup(host.host.root, write.backupRelativePath);
  return baseResult({
    outcome: "applied",
    preset: metadata(envelope),
    targetFile: PRESET_APPLICATION_TARGET_FILE,
    plan: wrapped,
    summary: plan.summary,
    wrote: true,
    verification: post,
  });
};
