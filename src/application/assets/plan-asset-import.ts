// T027–T031 (007) — Caso de uso headless `planAssetImport`. READ-ONLY: construye un `ImportPlan`
// determinista desde fuentes locales (bytes ya leídos). Flujo contractual: probes/validación → MIME/kind
// → hash/dedup → provenance/licencia → ownership/conflictos → plan. NO escribe, NO modifica el manifest,
// NO sanitiza destructivamente el original (la sanitización produce un preview/bytes derivados).
import { isMimeCompatibleWithKind } from "../../domain/assets/asset-mime.js";
import { isSafeAssetPath } from "../../domain/assets/asset-manifest.js";
import { ASSET_LIMITS } from "../../domain/assets/asset-limits.js";
import { declaredLicense, type AssetDimensions, type AssetLicense } from "../../domain/assets/asset-record.js";
import type { AssetIssue, AssetIssueCode } from "../../domain/assets/asset-outcome.js";
import { classifyAssetOwnership } from "./ownership.js";
import type {
  AssetMimeType,
  AssetPlanResult,
  AssetProbesPort,
  AssetStorePort,
  ImportCandidate,
  ImportSource,
  ImportVerdict,
  SvgSanitizationPreview,
} from "./asset-ports.js";

export interface PlanAssetImportInput {
  readonly sources: readonly ImportSource[];
}

export interface PlanAssetImportDependencies {
  readonly store: AssetStorePort;
  readonly probes: AssetProbesPort;
}

function issue(code: AssetIssueCode, path: string | null, message: string, severity: AssetIssue["severity"] = "error"): AssetIssue {
  return Object.freeze({ code, path, severity, message, blocksWrite: severity === "error" });
}

const orderIssues = (issues: AssetIssue[]): readonly AssetIssue[] =>
  Object.freeze([...issues].sort((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : 0)));

export async function planAssetImport(input: PlanAssetImportInput, deps: PlanAssetImportDependencies): Promise<AssetPlanResult> {
  let observation;
  try {
    observation = await deps.store.observe();
  } catch {
    return { outcome: "read-error", plan: null, conflicts: [], error: { code: "read-error", message: "No se pudo leer el asset store.", path: null, details: null } };
  }

  const ownership = classifyAssetOwnership(observation);
  if (ownership.state === "untrusted-asset-manifest") {
    return { outcome: "invalid-asset-store", plan: null, conflicts: ownership.conflicts, error: { code: "invalid-asset-store", message: "El manifest de assets no es confiable.", path: null, details: null } };
  }

  const existing = ownership.manifest?.assets ?? [];
  const hashToPath = new Map(existing.map((a) => [a.contentHash, a.logicalPath]));
  const unknownPaths = new Set(observation.unknownNodes.map((n) => n.relativePath));
  const existingTotalBytes = existing.reduce((sum, a) => sum + a.byteLength, 0);
  const existingCount = existing.length;

  // Primera pasada: clasificar cada fuente (sin presupuesto global todavía).
  const candidates: ImportCandidate[] = input.sources.map((source) => buildCandidate(source, deps.probes, hashToPath, unknownPaths));

  // Segunda pasada: presupuesto global (bytes/cantidad) sobre los candidatos `add`, en orden.
  let runningBytes = existingTotalBytes;
  let runningCount = existingCount;
  const adjusted = candidates.map((c) => {
    if (c.verdict !== "add") return c;
    const overBytes = runningBytes + c.byteLength > ASSET_LIMITS.maxTotalBytes;
    const overCount = runningCount + 1 > ASSET_LIMITS.maxAssets;
    if (overBytes || overCount) {
      const reason = overBytes ? `Presupuesto total de bytes excedido (> ${ASSET_LIMITS.maxTotalBytes}).` : `Cantidad de assets excedida (> ${ASSET_LIMITS.maxAssets}).`;
      const issues = orderIssues([...c.issues, issue("too-large", c.destinationPath, reason)]);
      return { ...c, verdict: "blocked" as ImportVerdict, destinationPath: null, issues };
    }
    runningBytes += c.byteLength;
    runningCount += 1;
    return c;
  });

  const summary = {
    add: adjusted.filter((c) => c.verdict === "add").length,
    duplicate: adjusted.filter((c) => c.verdict === "duplicate").length,
    blocked: adjusted.filter((c) => c.verdict === "blocked").length,
  };

  return { outcome: "planned", plan: { candidates: Object.freeze(adjusted), summary }, conflicts: ownership.conflicts, error: null };
}

function buildCandidate(source: ImportSource, probes: AssetProbesPort, hashToPath: ReadonlyMap<string, string>, unknownPaths: ReadonlySet<string>): ImportCandidate {
  const issues: AssetIssue[] = [];
  const license: AssetLicense = declaredLicense(source.license ?? {});
  let mime: AssetMimeType | null = null;
  let kind = source.kind;
  let effectiveBytes = source.bytes;
  let sanitization: SvgSanitizationPreview | null = null;
  let validation = { ok: true, code: null as string | null, message: null as string | null };

  // Path seguro.
  const pathSafe = isSafeAssetPath(source.destinationPath) && source.destinationPath.length <= ASSET_LIMITS.maxPathLength;
  if (!pathSafe) issues.push(issue("path-unsafe", null, "Path lógico de destino inseguro o demasiado largo."));

  // MIME por firma.
  mime = probes.detectMime(source.bytes);
  if (mime === null) {
    issues.push(issue("unsupported-mime", source.destinationPath, "Tipo MIME no soportado o desconocido."));
  } else if (!isMimeCompatibleWithKind(source.kind, mime)) {
    issues.push(issue("unsupported-mime", source.destinationPath, `MIME ${mime} incompatible con kind ${source.kind}.`));
  }

  // Tamaño por archivo.
  if (source.bytes.byteLength > ASSET_LIMITS.maxFileBytes) {
    issues.push(issue("too-large", source.destinationPath, `Archivo demasiado grande (> ${ASSET_LIMITS.maxFileBytes} bytes).`));
  }

  // Validación de fuente.
  if (mime !== null && (mime === "font/woff2" || mime === "font/woff" || mime === "font/ttf" || mime === "font/otf")) {
    const fv = probes.validateFont(source.bytes, mime);
    validation = { ok: fv.ok, code: fv.code, message: fv.message };
    if (!fv.ok) issues.push(issue("font-invalid", source.destinationPath, fv.message ?? "Fuente inválida."));
  }

  // Sanitización SVG (preview; los bytes a escribir serían los saneados).
  if (mime === "image/svg+xml") {
    const result = probes.sanitizeSvg(source.bytes);
    sanitization = result.report;
    if (!result.safe || result.bytes === null) {
      issues.push(issue("svg-unsafe", source.destinationPath, result.report.reason ?? "SVG no saneable."));
    } else {
      effectiveBytes = result.bytes;
    }
  }

  // Colisión con contenido desconocido en el destino.
  if (pathSafe && unknownPaths.has(source.destinationPath)) {
    issues.push(issue("owned-by-unknown", source.destinationPath, "El destino está ocupado por contenido desconocido."));
  }

  // Licencia: requisito (no bloqueante) cuando no se suministró explícitamente.
  if (license.status === "unspecified") {
    issues.push(issue("license-required", source.destinationPath, "Falta metadata de licencia explícita.", "warning"));
  }

  // Hash/dimensiones sobre los bytes efectivos (saneados para SVG).
  const contentHash = probes.hash(effectiveBytes);
  const byteLength = effectiveBytes.byteLength;
  const dimensions: AssetDimensions | null = mime !== null ? probes.readDimensions(effectiveBytes, mime) : null;
  if (mime === null) kind = source.kind; // se mantiene el solicitado; el bloqueo ya está registrado

  // Veredicto: blocked si hay algún issue de error; si no, duplicate por hash existente; si no, add.
  const hasBlocking = issues.some((i) => i.blocksWrite);
  let verdict: ImportVerdict;
  let duplicateOf: string | null = null;
  let destinationPath: string | null = source.destinationPath;
  if (hasBlocking) {
    verdict = "blocked";
    destinationPath = null;
  } else if (hashToPath.has(contentHash)) {
    verdict = "duplicate";
    duplicateOf = hashToPath.get(contentHash) ?? null;
  } else {
    verdict = "add";
  }

  return {
    sourceRef: source.sourceRef,
    kind: mime === null ? null : kind,
    destinationPath,
    mimeType: mime,
    byteLength,
    contentHash,
    dimensions,
    verdict,
    duplicateOf,
    license,
    validation,
    sanitization,
    issues: orderIssues(issues),
  };
}
