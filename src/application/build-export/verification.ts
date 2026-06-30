// T132–T135 (006) — Verificación de build en tres niveles, pura y sin filesystem:
//   • input  (T132): el Design System es válido (aliases/tipos/foundations/límites) antes de renderizar;
//                     si falla, bloquea el render.
//   • candidate (T133): el conjunto recién renderizado (antes de publicar) — presencia, paths, hashes,
//                     byte lengths y estructura por formato (selector/declaraciones CSS, exports TS y
//                     ausencia de imports en runtime, JSON parseable, build manifest válido).
//   • post-publication (T134): re-lectura del conjunto publicado con las mismas comprobaciones.
// Produce el modelo de dominio `BuildVerification`. Nunca expone bytes completos, `Error`, stack ni rutas
// absolutas. La semántica de `verification-error` (T135) se confirma con `verificationErrorSemanticsHold`.
import { artifactFilename, BUILD_FORMATS, type BuildFormat } from "../../domain/build-export/build-format.js";
import { BUILD_MANIFEST_FILENAME, isSafeRelativePath, validateBuildManifestV1 } from "../../domain/build-export/build-manifest.js";
import type { BuildArtifact } from "../../domain/build-export/artifact.js";
import type { BuildVerification, VerificationArtifactStatus, VerificationCheck, VerificationStatus } from "../../domain/build-export/verification.js";
import { orderVerificationChecks } from "../../domain/build-export/verification.js";
import type { ArtifactSetWriteResult } from "./build-ports.js";

const decode = (bytes: Uint8Array): string => new TextDecoder("utf-8", { fatal: false }).decode(bytes);

// ── Input verification (T132) ────────────────────────────────────────────────────────────────────

export interface InputVerificationInput {
  /** El análisis `002` clasifica la fuente como un Design System estructuralmente válido. */
  readonly designSystemValid: boolean;
  /** Cantidad de aliases con error (rotos/ciclos/a-grupo) que impiden un render confiable. */
  readonly aliasErrors: number;
  /** Cantidad de tokens sin `$type` efectivo resoluble. */
  readonly typeErrors: number;
  /** Cantidad de problemas de foundations que invalidan el build. */
  readonly foundationErrors: number;
  /** Algún límite de análisis fue alcanzado (resultado potencialmente truncado). */
  readonly limitsHit: boolean;
}

export interface InputVerification {
  readonly verification: BuildVerification;
  /** `true` si el render debe bloquearse. */
  readonly blocksRender: boolean;
}

/** Verifica las precondiciones del input; si falla, el render se bloquea. */
export function verifyInput(input: InputVerificationInput): InputVerification {
  const ok =
    input.designSystemValid && input.aliasErrors === 0 && input.typeErrors === 0 && input.foundationErrors === 0 && !input.limitsHit;
  const status: VerificationStatus = ok ? "passed" : "failed";
  const reason = !input.designSystemValid
    ? "El Design System no es válido."
    : input.aliasErrors > 0
      ? "Existen aliases inválidos."
      : input.typeErrors > 0
        ? "Existen tipos no resolubles."
        : input.foundationErrors > 0
          ? "Existen foundations inválidas."
          : input.limitsHit
            ? "Se alcanzó un límite de análisis."
            : null;
  const check: VerificationCheck = {
    kind: "source",
    status,
    code: ok ? null : "input-verification-failed",
    message: ok ? null : reason,
  };
  return { verification: Object.freeze({ status, checks: Object.freeze([check]), artifacts: [] }), blocksRender: !ok };
}

// ── Verificación estructural del conjunto (candidate / post-publication, T133/T134) ────────────────

export interface ArtifactSetVerificationInput {
  readonly artifacts: readonly BuildArtifact[];
  readonly manifest: { readonly relativePath: string; readonly bytes: Uint8Array; readonly contentHash: string; readonly byteLength: number };
  readonly expected: {
    readonly artifacts: Readonly<Record<string, { readonly contentHash: string; readonly byteLength: number }>>;
    readonly manifest: { readonly contentHash: string; readonly byteLength: number };
  };
}

const CHECK_KIND: Record<BuildFormat, "css" | "json" | "typescript"> = { css: "css", json: "json", typescript: "typescript" };

/** Validación estructural mínima por formato (sin ejecutar nada, sin resolver imports). */
function structuralProblem(format: BuildFormat, text: string): string | null {
  switch (format) {
    case "css":
      if (!text.startsWith(":root {")) return "CSS sin selector `:root`.";
      if (!text.includes("}")) return "CSS sin cierre de bloque.";
      if (/@import\b/.test(text)) return "CSS con `@import` (import en runtime).";
      if (/\bvar\(\s*(?!--)/.test(text)) return "CSS con referencia `var()` mal formada.";
      return null;
    case "typescript":
      if (!/\bexport\b/.test(text)) return "TypeScript sin exports.";
      if (/^\s*import\b/m.test(text)) return "TypeScript con import en runtime.";
      if (/\brequire\s*\(/.test(text)) return "TypeScript con require en runtime.";
      return null;
    case "json": {
      try {
        JSON.parse(text);
      } catch {
        return "JSON no parseable.";
      }
      return null;
    }
    default: {
      const _exhaustive: never = format;
      return `formato desconocido: ${String(_exhaustive)}`;
    }
  }
}

/** Verifica presencia, paths, hashes, byte lengths y estructura de todo el conjunto. */
export function verifyArtifactSet(input: ArtifactSetVerificationInput): BuildVerification {
  const byFormat = new Map(input.artifacts.map((a) => [a.format, a]));
  const checks: VerificationCheck[] = [];
  const statuses: VerificationArtifactStatus[] = [];

  for (const format of BUILD_FORMATS) {
    const expectedPath = artifactFilename(format);
    const artifact = byFormat.get(format);
    const expected = input.expected.artifacts[expectedPath] ?? null;
    let status: VerificationStatus = "passed";
    let code: string | null = null;
    let message: string | null = null;
    let actualHash: string | null = null;
    let actualByteLength: number | null = null;

    if (artifact === undefined) {
      status = "failed";
      code = "artifact-missing";
      message = `Falta el artifact ${expectedPath}.`;
    } else {
      actualHash = artifact.contentHash;
      actualByteLength = artifact.bytes.byteLength;
      if (!isSafeRelativePath(artifact.relativePath) || artifact.relativePath !== expectedPath) {
        status = "failed";
        code = "artifact-path-invalid";
        message = `Path de artifact inválido para ${format}.`;
      } else if (artifact.byteLength !== artifact.bytes.byteLength) {
        status = "failed";
        code = "artifact-bytelength-mismatch";
        message = `Byte length incoherente en ${expectedPath}.`;
      } else if (expected && (expected.contentHash !== actualHash || expected.byteLength !== actualByteLength)) {
        status = "failed";
        code = "artifact-hash-mismatch";
        message = `Hash o tamaño inesperado en ${expectedPath}.`;
      } else {
        const problem = structuralProblem(format, decode(artifact.bytes));
        if (problem) {
          status = "failed";
          code = "artifact-structure-invalid";
          message = problem;
        }
      }
    }

    checks.push({ kind: CHECK_KIND[format], status, code, message });
    statuses.push({
      relativePath: expectedPath,
      expectedHash: expected?.contentHash ?? null,
      actualHash,
      expectedByteLength: expected?.byteLength ?? null,
      actualByteLength,
      status,
    });
  }

  // Build manifest: parse + validación de contrato + hash/byteLength.
  let manifestStatus: VerificationStatus = "passed";
  let manifestCode: string | null = null;
  let manifestMessage: string | null = null;
  const manifestText = decode(input.manifest.bytes);
  let parsed: unknown;
  try {
    parsed = JSON.parse(manifestText);
  } catch {
    parsed = undefined;
  }
  if (parsed === undefined) {
    manifestStatus = "failed";
    manifestCode = "build-manifest-unparseable";
    manifestMessage = "Build manifest no parseable.";
  } else if (validateBuildManifestV1(parsed).ok !== true) {
    manifestStatus = "failed";
    manifestCode = "build-manifest-invalid";
    manifestMessage = "Build manifest no cumple el contrato v1.";
  } else if (
    input.manifest.contentHash !== input.expected.manifest.contentHash ||
    input.manifest.byteLength !== input.expected.manifest.byteLength ||
    input.manifest.byteLength !== input.manifest.bytes.byteLength
  ) {
    manifestStatus = "failed";
    manifestCode = "build-manifest-hash-mismatch";
    manifestMessage = "Hash o tamaño inesperado en el build manifest.";
  }
  checks.push({ kind: "build-manifest", status: manifestStatus, code: manifestCode, message: manifestMessage });
  statuses.push({
    relativePath: BUILD_MANIFEST_FILENAME,
    expectedHash: input.expected.manifest.contentHash,
    actualHash: input.manifest.contentHash,
    expectedByteLength: input.expected.manifest.byteLength,
    actualByteLength: input.manifest.byteLength,
    status: manifestStatus,
  });

  const orderedChecks = orderVerificationChecks(checks);
  const status: VerificationStatus = orderedChecks.every((c) => c.status === "passed") ? "passed" : "failed";
  return Object.freeze({ status, checks: orderedChecks, artifacts: Object.freeze(statuses) });
}

/** Verificación del candidato (antes de publicar). Misma comprobación estructural del conjunto. */
export function verifyCandidate(input: ArtifactSetVerificationInput): BuildVerification {
  return verifyArtifactSet(input);
}

/** Verificación posterior a la publicación (re-lectura del conjunto publicado). */
export function verifyPostPublication(input: ArtifactSetVerificationInput): BuildVerification {
  return verifyArtifactSet(input);
}

// ── Semántica de verification-error (T135) ─────────────────────────────────────────────────────────

/**
 * Confirma la semántica de `verification-error`: posterior al commit point ⇒ `wrote:true`, output
 * disponible, backup retenido y `recoveryRequired:true` (sin rollback automático).
 */
export function verificationErrorSemanticsHold(result: ArtifactSetWriteResult): boolean {
  if (result.outcome !== "verification-error") return true;
  return (
    result.wrote === true &&
    result.outputAvailable === true &&
    result.backupRelativePath !== null &&
    result.recoveryRequired === true
  );
}
