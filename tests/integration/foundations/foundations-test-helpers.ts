import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { expect } from "vitest";
import {
  createBoundAnalyze,
  createFoundationsJsonDependencies,
} from "../../../src/cli/composition.js";
import { runFoundations } from "../../../src/cli/commands/foundations.js";
import { exitCodeForOutcome } from "../../../src/cli/exit-codes.js";
import { buildConfig } from "../../../src/domain/builders/build-config.js";
import { MANAGED_FILES } from "../../../src/domain/plan/managed-files.js";
import { NEURAZ_EXTENSION_NAMESPACE } from "../../../src/domain/foundations/parse-foundation-extension.js";
import { COLOR, VALID_MANIFEST } from "../../helpers/ds-fixtures.js";
import { writeFileIn } from "../../helpers/tmp-project.js";
import { parseJsonStdout, snapshotProject } from "../json-output/json-output-helpers.js";

export const NS = NEURAZ_EXTENSION_NAMESPACE;

export function foundation(level: unknown): Record<string, unknown> {
  return { $extensions: { [NS]: { foundation: { level } } } };
}

export function colorToken(level?: "primitive" | "semantic"): Record<string, unknown> {
  return {
    $type: "color",
    $value: COLOR,
    $description: "d",
    ...(level === undefined ? {} : foundation(level)),
  };
}

export function aliasToken(target: string, level?: "primitive" | "semantic"): Record<string, unknown> {
  return {
    $value: `{${target}}`,
    $description: "d",
    ...(level === undefined ? {} : foundation(level)),
  };
}

export async function seedDesignSystem(root: string, tokens: unknown): Promise<void> {
  await writeFileIn(root, MANAGED_FILES.config, `${JSON.stringify(buildConfig(), null, 2)}\n`);
  await writeFileIn(root, MANAGED_FILES.manifest, `${JSON.stringify(VALID_MANIFEST, null, 2)}\n`);
  await writeFileIn(root, MANAGED_FILES.tokens, `${JSON.stringify(tokens, null, 2)}\n`);
}

export async function seedInvalidUtf8Tokens(root: string): Promise<void> {
  await writeFileIn(root, MANAGED_FILES.config, `${JSON.stringify(buildConfig(), null, 2)}\n`);
  await writeFileIn(root, MANAGED_FILES.manifest, `${JSON.stringify(VALID_MANIFEST, null, 2)}\n`);
  await mkdir(join(root, "design-system", "tokens"), { recursive: true });
  await writeFile(join(root, MANAGED_FILES.tokens), Buffer.from([0x7b, 0xff, 0xfe, 0x7d]));
}

export async function runFoundationsJson(root: string): Promise<{
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly json: Record<string, unknown>;
}> {
  const out: string[] = [];
  const err: string[] = [];
  const io = { out: (text: string) => out.push(text), err: (text: string) => err.push(text) };
  const result = await runFoundations(root, createFoundationsJsonDependencies(io, createBoundAnalyze()));
  const stdout = out.join("");
  const stderr = err.join("");
  return {
    code: exitCodeForOutcome(result.outcome),
    stdout,
    stderr,
    json: parseJsonStdout(stdout),
  };
}

export async function expectReadOnly(root: string, action: () => Promise<unknown>): Promise<void> {
  const before = await snapshotProject(root);
  await action();
  expect(await snapshotProject(root)).toEqual(before);
  expect(before.some((entry) => entry.includes(".neuraz-ds-staging-"))).toBe(false);
}

export function resultOf(json: Record<string, unknown>): Record<string, unknown> {
  expect(json.result).not.toBeNull();
  return json.result as Record<string, unknown>;
}

export function category(json: Record<string, unknown>, id: string): Record<string, unknown> {
  const result = resultOf(json);
  const categories = result.categories as Array<Record<string, unknown>>;
  const found = categories.find((item) => item.id === id);
  expect(found).toBeDefined();
  return found as Record<string, unknown>;
}

export function issueCodes(json: Record<string, unknown>): string[] {
  const result = resultOf(json);
  const validation = result.validation as { errors: Array<{ code: string }>; warnings: Array<{ code: string }> };
  return [...validation.errors, ...validation.warnings].map((issue) => issue.code);
}
