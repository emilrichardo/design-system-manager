// T029 — Validadores de config y manifiesto. División de responsabilidades:
//   - AJV (JSON Schema 2020-12): forma estructural (tipos, requeridos, campos extra).
//   - zod: parseo tipado del límite (unknown → tipos seguros).
//   - dominio: reglas estrictas (slug regex, SemVer, ruta segura) — fuente única de verdad.
// DTCG se delega al validador AJV+refs (T028).
import { z } from "zod";
import type { Issue } from "../../domain/issue.js";
import type { DocumentValidators } from "../../application/ports.js";
import { configSchema } from "../../schemas/config.schema.js";
import { manifestSchema } from "../../schemas/manifest.schema.js";
import { isValidSlug } from "../../domain/identity/slug.js";
import { validateVersion } from "../../domain/identity/version.js";
import { isSafeRelativePosixPath } from "../../domain/plan/safe-path.js";
import { compileSchema, toIssues } from "./json-schema-validator.js";
import { validateDtcgDocument } from "./dtcg-validator.js";

const validateConfigStructure = compileSchema(configSchema);
const validateManifestStructure = compileSchema(manifestSchema);

const configZ = z.object({
  configSchemaVersion: z.string(),
  designSystemDir: z.string(),
  formatVersion: z.string().optional(),
});

const manifestZ = z.object({
  manifestSchemaVersion: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  version: z.string(),
  tokensDir: z.string().optional(),
});

function zodIssues(error: z.ZodError, source: string): Issue[] {
  return error.issues.map((i) => ({
    code: `${source}-shape`,
    message: i.message,
    path: `${source}.${i.path.join(".")}`,
  }));
}

function validateConfig(data: unknown): Issue[] {
  const issues: Issue[] = [];
  if (!validateConfigStructure(data)) issues.push(...toIssues(validateConfigStructure.errors, "config"));
  const parsed = configZ.safeParse(data);
  if (!parsed.success) return [...issues, ...zodIssues(parsed.error, "config")];
  if (!isSafeRelativePosixPath(parsed.data.designSystemDir)) {
    issues.push({
      code: "config-path-unsafe",
      message: "designSystemDir debe ser una ruta relativa segura dentro de la raíz anfitriona.",
      path: "config.designSystemDir",
    });
  }
  return issues;
}

function validateManifest(data: unknown): Issue[] {
  const issues: Issue[] = [];
  if (!validateManifestStructure(data)) issues.push(...toIssues(validateManifestStructure.errors, "manifest"));
  const parsed = manifestZ.safeParse(data);
  if (!parsed.success) return [...issues, ...zodIssues(parsed.error, "manifest")];
  if (parsed.data.name.trim().length === 0) {
    issues.push({ code: "manifest-name-empty", message: "El nombre del manifiesto no puede estar vacío.", path: "manifest.name" });
  }
  if (!isValidSlug(parsed.data.slug)) {
    issues.push({ code: "manifest-slug-invalid", message: `Slug inválido: "${parsed.data.slug}".`, path: "manifest.slug" });
  }
  if (!validateVersion(parsed.data.version).ok) {
    issues.push({ code: "manifest-version-invalid", message: `Versión no SemVer: "${parsed.data.version}".`, path: "manifest.version" });
  }
  return issues;
}

function validateDtcg(data: unknown): Issue[] {
  return validateDtcgDocument(data);
}

export const documentValidators: DocumentValidators = {
  validateConfig,
  validateManifest,
  validateDtcg,
};
