// T037/T038/T039 — Caso de uso headless `initializeDesignSystem`. Orquesta el flujo
// resolve → inspect/classify → (identity) → plan → validate → confirm → commit → report
// mediante puertos inyectados. Sin Node, sin filesystem directo, sin Commander/Clack, sin
// console, sin process.exit, sin exit codes. Devuelve un InitializationResult estructurado.
import type { Issue } from "../domain/issue.js";
import type { InitializationResult } from "../domain/result/initialization-result.js";
import { cancelled, conflict, created, failed, unchanged } from "../domain/result/initialization-result.js";
import { createIdentity } from "../domain/identity/design-system-identity.js";
import { deriveSlug } from "../domain/identity/slugify.js";
import { DEFAULT_VERSION } from "../domain/identity/version.js";
import { createInitializationPlan } from "../domain/plan/initialization-plan.js";
import { EXPECTED_FILES, MANAGED_FILES } from "../domain/plan/managed-files.js";
import { noneState } from "../domain/state/previous-state.js";
import type {
  InitializationSummary,
  InitializeDependencies,
  InitializeInput,
  PreparedFile,
  TransactionResult,
} from "./ports.js";
import { validatePlan, type PlannedDocuments } from "./validate-plan.js";

/** El reporter es un colaborador de presentación: nunca altera el resultado del dominio. */
async function safeReport(fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
  } catch {
    /* un fallo de presentación no convierte el resultado en error */
  }
}

function parseDocuments(prepared: readonly PreparedFile[]): PlannedDocuments {
  const byRel = new Map(prepared.map((p) => [p.relativePath, p.content]));
  const parse = (rel: string): unknown => {
    try {
      return JSON.parse(byRel.get(rel) ?? "");
    } catch {
      return undefined;
    }
  };
  return {
    config: parse(MANAGED_FILES.config),
    manifest: parse(MANAGED_FILES.manifest),
    tokens: parse(MANAGED_FILES.tokens),
  };
}

function mapTransaction(tx: TransactionResult): InitializationResult {
  switch (tx.status) {
    case "committed":
      return created(tx.files);
    case "conflict":
      return conflict(tx.conflicts);
    case "failed":
      return failed(
        tx.category,
        tx.rollbackErrors !== undefined && tx.rollbackErrors.length > 0
          ? [...tx.errors, ...tx.rollbackErrors]
          : tx.errors,
      );
  }
}

export async function initializeDesignSystem(
  input: InitializeInput,
  deps: InitializeDependencies,
): Promise<InitializationResult> {
  const { resolver, classifier, prompter, reporter, preparer, validators, writer } = deps;

  const finish = async (result: InitializationResult): Promise<InitializationResult> => {
    await safeReport(() => reporter.completed(result));
    return result;
  };

  // A. Resolve.
  const resolution = resolver.resolve(input.executionDir);
  if (!resolution.ok) {
    const issue: Issue = {
      code: `host-${resolution.error.code}`,
      message: resolution.error.message,
      ...(resolution.error.path !== undefined ? { path: resolution.error.path } : {}),
    };
    return finish(failed("host", [issue]));
  }
  const host = resolution.hostRoot;
  await safeReport(() => reporter.hostResolved(host));

  // B. Inspect + classify.
  const state = await classifier.classify(host.rootDir);
  await safeReport(() => reporter.previousStateDetected(state));
  switch (state.kind) {
    case "complete-valid":
      return finish(unchanged(state.designSystemDir));
    case "partial":
      return finish(conflict(state.present));
    case "complete-invalid":
      return finish(failed("validation", state.errors));
    case "none":
      break;
  }

  // C. Identidad (solo estado `none`).
  const outcome = await prompter.requestIdentity({
    defaultVersion: DEFAULT_VERSION,
    suggestSlug: (name) => {
      const d = deriveSlug(name);
      return d.ok ? d.value.value : "";
    },
  });
  if (outcome.kind === "cancelled") return finish(cancelled());

  const answers = outcome.value;
  const identityResult = createIdentity({
    name: answers.name,
    slug: answers.slug,
    version: answers.version,
    ...(answers.description !== undefined ? { description: answers.description } : {}),
  });
  if (!identityResult.ok) {
    return finish(failed("validation", [{ code: identityResult.error.code, message: identityResult.error.message }]));
  }
  const identity = identityResult.value;

  // D. Preparar documentos y plan (sin escribir).
  const prepared = preparer.prepare(identity);
  const documents = parseDocuments(prepared);
  const planResult = createInitializationPlan({
    identity,
    hostRootId: host.rootDir,
    filesToCreate: [...EXPECTED_FILES],
    previousState: noneState,
  });
  if (!planResult.ok) {
    return finish(failed("validation", [{ code: planResult.error.code, message: planResult.error.message }]));
  }

  // E. Validar plan + documentos.
  const validation = validatePlan(planResult.value, documents, validators);
  if (!validation.ok) return finish(failed("validation", validation.errors));

  const summary: InitializationSummary = {
    hostRoot: host,
    identity: {
      name: identity.name.value,
      slug: identity.slug.value,
      version: identity.version.value,
      ...(identity.description !== undefined ? { description: identity.description } : {}),
    },
    files: EXPECTED_FILES,
    conflicts: [],
  };
  await safeReport(() => reporter.planPrepared(summary));

  // F. Confirmar (única puerta a la escritura persistente).
  const confirmation = await prompter.confirm(summary);
  if (confirmation.kind === "cancelled" || confirmation.value === false) {
    return finish(cancelled());
  }

  // G. Transacción + mapeo a InitializationResult.
  const tx = await writer.commit(host.rootDir, prepared);
  return finish(mapTransaction(tx));
}
