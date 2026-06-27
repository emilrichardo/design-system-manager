import { lstat, readFile, readdir, readlink, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { expect } from "vitest";
import {
  createBoundAnalyze,
  createInspectDependencies,
  createInspectJsonDependencies,
  createValidateDependencies,
  createValidateJsonDependencies,
} from "../../../src/cli/composition.js";
import { runInspect } from "../../../src/cli/commands/inspect.js";
import { runValidate } from "../../../src/cli/commands/validate.js";
import { exitCodeForOutcome } from "../../../src/cli/exit-codes.js";
import type {
  InspectDesignSystemResult,
  ValidateDesignSystemResult,
} from "../../../src/application/analysis-ports.js";

export interface CapturedIO {
  readonly io: { out: (text: string) => void; err: (text: string) => void };
  stdout(): string;
  stderr(): string;
}

export function captureIO(): CapturedIO {
  const out: string[] = [];
  const err: string[] = [];
  return {
    io: { out: (text) => out.push(text), err: (text) => err.push(text) },
    stdout: () => out.join(""),
    stderr: () => err.join(""),
  };
}

export function parseJsonStdout(stdout: string): Record<string, unknown> {
  expect(stdout).toMatch(/\n$/);
  expect(stdout).not.toMatch(/\u001b\[/u);
  return JSON.parse(stdout) as Record<string, unknown>;
}

export async function runValidateJson(root: string): Promise<{
  readonly result: ValidateDesignSystemResult;
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly json: Record<string, unknown>;
}> {
  const captured = captureIO();
  const result = await runValidate(root, createValidateJsonDependencies(captured.io, createBoundAnalyze()));
  return {
    result,
    code: exitCodeForOutcome(result.outcome),
    stdout: captured.stdout(),
    stderr: captured.stderr(),
    json: parseJsonStdout(captured.stdout()),
  };
}

export async function runInspectJson(root: string): Promise<{
  readonly result: InspectDesignSystemResult;
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly json: Record<string, unknown>;
}> {
  const captured = captureIO();
  const result = await runInspect(root, createInspectJsonDependencies(captured.io, createBoundAnalyze()));
  return {
    result,
    code: exitCodeForOutcome(result.outcome),
    stdout: captured.stdout(),
    stderr: captured.stderr(),
    json: parseJsonStdout(captured.stdout()),
  };
}

export async function runValidateHuman(root: string): Promise<{
  readonly result: ValidateDesignSystemResult;
  readonly code: number;
  readonly text: string;
}> {
  const captured = captureIO();
  const result = await runValidate(root, createValidateDependencies(captured.io, createBoundAnalyze()));
  return { result, code: exitCodeForOutcome(result.outcome), text: `${captured.stdout()}${captured.stderr()}` };
}

export async function runInspectHuman(root: string): Promise<{
  readonly result: InspectDesignSystemResult;
  readonly code: number;
  readonly text: string;
}> {
  const captured = captureIO();
  const result = await runInspect(root, createInspectDependencies(captured.io, createBoundAnalyze()));
  return { result, code: exitCodeForOutcome(result.outcome), text: `${captured.stdout()}${captured.stderr()}` };
}

export async function snapshotProject(root: string): Promise<readonly string[]> {
  const entries: string[] = [];
  async function walk(dir: string): Promise<void> {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const abs = join(dir, entry.name);
      const rel = relative(root, abs);
      const st = await lstat(abs);
      if (st.isDirectory()) {
        entries.push(`${rel}/`);
        await walk(abs);
      } else if (st.isSymbolicLink()) {
        entries.push(`${rel}:symlink:${await readlink(abs)}`);
      } else {
        const fileStat = await stat(abs);
        const bytes = await readFile(abs);
        entries.push(`${rel}:file:${fileStat.mode}:${bytes.toString("base64")}`);
      }
    }
  }
  await walk(root);
  return entries.sort();
}

export function expectEnvelope(
  json: Record<string, unknown>,
  command: "validate" | "inspect",
  outcome: string,
): void {
  expect(json.formatVersion).toBe("1.0.0");
  expect(json.command).toBe(command);
  expect(json.outcome).toBe(outcome);
  expect(Object.prototype.hasOwnProperty.call(json, "result")).toBe(true);
  if (outcome === "not-found") {
    expect(json.result).toBeNull();
    expect(json.error).toBeNull();
  } else {
    expect(json.result).not.toBeNull();
    expect(Object.prototype.hasOwnProperty.call(json, "error")).toBe(false);
  }
}
