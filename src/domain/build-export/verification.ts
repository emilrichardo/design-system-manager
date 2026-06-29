// T004 (006) — Modelo canónico de verificación (input/candidate/post-publication). Solo el modelo; los
// verificadores concretos llegan en el Checkpoint K. Dominio puro: sin bytes completos, sin `Error`,
// sin stack, sin rutas absolutas ni detalles de implementación de filesystem.

export type VerificationStatus = "passed" | "failed" | "skipped";

/** Familia de chequeo, en orden determinista de reporte. */
export type VerificationCheckKind = "source" | "css" | "json" | "typescript" | "build-manifest" | "filesystem";

export const VERIFICATION_CHECK_ORDER: readonly VerificationCheckKind[] = [
  "source",
  "css",
  "json",
  "typescript",
  "build-manifest",
  "filesystem",
] as const;

export interface VerificationCheck {
  readonly kind: VerificationCheckKind;
  readonly status: VerificationStatus;
  /** Código estable o `null` cuando pasa. */
  readonly code: string | null;
  /** Mensaje seguro o `null`. */
  readonly message: string | null;
}

/** Estado por artefacto: hashes esperado/actual y byte lengths, nunca bytes completos. */
export interface VerificationArtifactStatus {
  readonly relativePath: string;
  readonly expectedHash: string | null;
  readonly actualHash: string | null;
  readonly expectedByteLength: number | null;
  readonly actualByteLength: number | null;
  readonly status: VerificationStatus;
}

export interface BuildVerification {
  readonly status: VerificationStatus;
  readonly checks: readonly VerificationCheck[];
  readonly artifacts: readonly VerificationArtifactStatus[];
}

/** Ordena los checks de forma estable según `VERIFICATION_CHECK_ORDER`. */
export function orderVerificationChecks(checks: readonly VerificationCheck[]): readonly VerificationCheck[] {
  const rank = (k: VerificationCheckKind): number => VERIFICATION_CHECK_ORDER.indexOf(k);
  return [...checks].sort((a, b) => rank(a.kind) - rank(b.kind));
}
