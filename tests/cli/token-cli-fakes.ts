// Fakes compartidos por las pruebas de CLI de `token` (008, Checkpoint E). Construyen un `CliRuntime`
// con `tokenDeps` cuyo snapshot/writer son inyectables (sin filesystem), para forzar cada outcome sin
// depender de un host real. La lectura de `--file` SÍ usa filesystem real (es responsabilidad de la
// CLI, no del caso de uso) — usar `writeTempCommandFile` para ese flag en los tests.
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { vi } from "vitest";
import type { CliRuntime } from "../../src/cli/program.js";
import type { TokenCliDependencies } from "../../src/cli/composition.js";
import { TokenMutationTerminalReporter } from "../../src/infrastructure/reporter/token-mutation-terminal-reporter.js";
import { TokenMutationJsonReporter } from "../../src/infrastructure/reporter/token-mutation-json-reporter.js";
import { analyzedTokenSource } from "../../src/application/token-mutations/analyze-source.js";
import { serializeCandidate } from "../../src/infrastructure/token-mutations/candidate-serializer.js";
import type {
  AnalyzedTokenSource,
  SourceSnapshotPort,
  SourceSnapshotResult,
  TokenSourceWriteResult,
  TokenSourceWriterPort,
} from "../../src/application/token-mutations/ports.js";
import { buildDeps } from "../helpers/in-memory-adapters.js";

export function nullIO() {
  const out: string[] = [];
  const err: string[] = [];
  return { io: { out: (t: string) => out.push(t), err: (t: string) => err.push(t) }, out, err };
}

/** Documento por defecto: un token concreto + un alias que lo referencia. */
export function defaultDoc(): unknown {
  return {
    color: { base: { "blue-500": { $type: "color", $value: "#3b82f6" } } },
    accent: { $type: "color", $value: "{color.base.blue-500}" },
  };
}

export function sourceFrom(document: unknown = defaultDoc(), contentHash = "a".repeat(64)): AnalyzedTokenSource {
  return analyzedTokenSource(document, { logicalPath: "design-system/tokens/base.tokens.json", contentHash });
}

export function fakeSnapshot(source: AnalyzedTokenSource = sourceFrom(), rootDir = "/host"): SourceSnapshotPort {
  return { read: vi.fn(async (): Promise<SourceSnapshotResult> => ({ outcome: "ready", source, rootDir })) };
}

export function throwingSnapshot(): SourceSnapshotPort {
  return {
    read: vi.fn(async () => {
      throw new Error("boom");
    }),
  };
}

export function fakeWriter(outcome: TokenSourceWriteResult["outcome"] = "written"): TokenSourceWriterPort & { readonly write: ReturnType<typeof vi.fn> } {
  return {
    write: vi.fn(
      async (): Promise<TokenSourceWriteResult> => ({
        outcome,
        wrote: outcome === "written",
        sourceAvailable: true,
        backupRelativePath: null,
        recoveryRequired: false,
        error: outcome === "written" ? null : { code: outcome, message: `simulated ${outcome}` },
      }),
    ),
  };
}

export interface TokenRuntimeParts {
  readonly snapshot?: SourceSnapshotPort;
  readonly writer?: TokenSourceWriterPort;
}

export function tokenDeps(io: CliRuntime["io"], parts: TokenRuntimeParts = {}): TokenCliDependencies {
  const snapshot = parts.snapshot ?? fakeSnapshot();
  const writer = parts.writer ?? fakeWriter();
  return {
    plan: { snapshot, serialize: serializeCandidate },
    apply: { snapshot, serialize: serializeCandidate, createWriter: () => writer },
    terminal: new TokenMutationTerminalReporter(io),
    json: new TokenMutationJsonReporter(io),
  };
}

export function runtime(io: CliRuntime["io"], argv: string, parts: TokenRuntimeParts = {}): CliRuntime {
  return {
    argv: ["node", "neuraz-ds", ...argv.split(" ").filter(Boolean)],
    cwd: "/host",
    io,
    deps: buildDeps().deps,
    tokenDeps: tokenDeps(io, parts),
    version: "9.9.9",
  };
}

/** Escribe un `TokenMutationCommandV1` a un archivo temporal real; devuelve el path absoluto + cleanup. */
export async function writeTempCommandFile(operations: readonly unknown[]): Promise<{ path: string; cleanup: () => Promise<void> }> {
  const dir = await mkdtemp(join(tmpdir(), "neuraz-ds-token-cmd-"));
  const path = join(dir, "mutation.json");
  await writeFile(path, `${JSON.stringify({ formatVersion: "1.0.0", operations }, null, 2)}\n`, "utf8");
  return { path, cleanup: () => rm(dir, { recursive: true, force: true }) };
}
