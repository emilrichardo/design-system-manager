// T040 — Adapters en memoria para ejecutar el caso de uso sin terminal ni FS real.
import type {
  DocumentPreparer,
  FileSystem,
  HostRoot,
  HostRootResolution,
  HostRootResolver,
  IdentityAnswers,
  IdentityPromptInput,
  InitializationResult,
  InitializationSummary,
  InitializeDependencies,
  ManagedFileKind,
  PreparedFile,
  PromptOutcome,
  Prompter,
  Reporter,
  StateClassifier,
  TransactionResult,
  TransactionalWriter,
} from "../../src/application/ports.js";
import type { PreviousState } from "../../src/domain/state/previous-state.js";
import { documentPreparer, documentValidators } from "../../src/infrastructure/initialize-adapters.js";

export function validHostRoot(rootDir = "/host"): HostRoot {
  return {
    executionDir: rootDir,
    rootDir,
    packageJsonPath: `${rootDir}/package.json`,
    gitRootDir: null,
    writeBoundary: rootDir,
    isMonorepoChild: false,
  };
}

export class FakeHostRootResolver implements HostRootResolver {
  calls = 0;
  lastExecutionDir: string | undefined;
  constructor(
    private readonly resolution: HostRootResolution,
    private readonly trace?: string[],
  ) {}
  resolve(executionDir: string): HostRootResolution {
    this.calls += 1;
    this.lastExecutionDir = executionDir;
    this.trace?.push("resolve");
    return this.resolution;
  }
}

export class FakeClassifier implements StateClassifier {
  calls = 0;
  constructor(
    private readonly state: PreviousState,
    private readonly trace?: string[],
  ) {}
  classify(): PreviousState {
    this.calls += 1;
    this.trace?.push("classify");
    return this.state;
  }
}

export class ScriptedPrompter implements Prompter {
  requestIdentityCalls = 0;
  confirmCalls = 0;
  lastSuggestedSlug: string | undefined;
  constructor(
    private readonly identityScript: PromptOutcome<IdentityAnswers>,
    private readonly confirmScript: PromptOutcome<boolean>,
    private readonly trace?: string[],
  ) {}
  async requestIdentity(input: IdentityPromptInput): Promise<PromptOutcome<IdentityAnswers>> {
    this.requestIdentityCalls += 1;
    this.trace?.push("prompt:identity");
    if (this.identityScript.kind === "answered") {
      this.lastSuggestedSlug = input.suggestSlug(this.identityScript.value.name);
    }
    return this.identityScript;
  }
  async confirm(): Promise<PromptOutcome<boolean>> {
    this.confirmCalls += 1;
    this.trace?.push("prompt:confirm");
    return this.confirmScript;
  }
}

export class RecordingReporter implements Reporter {
  events: string[] = [];
  host: HostRoot | undefined;
  state: PreviousState | undefined;
  summary: InitializationSummary | undefined;
  result: InitializationResult | undefined;
  constructor(
    private readonly trace?: string[],
    private readonly throwOnCompleted = false,
  ) {}
  hostResolved(host: HostRoot): void {
    this.events.push("hostResolved");
    this.trace?.push("report:host");
    this.host = host;
  }
  previousStateDetected(state: PreviousState): void {
    this.events.push("previousStateDetected");
    this.state = state;
  }
  planPrepared(summary: InitializationSummary): void {
    this.events.push("planPrepared");
    this.summary = summary;
  }
  completed(result: InitializationResult): void {
    this.events.push("completed");
    this.trace?.push("report:completed");
    this.result = result;
    if (this.throwOnCompleted) throw new Error("reporter falló");
  }
}

export class FakeTransactionalWriter implements TransactionalWriter {
  commitCalls = 0;
  constructor(
    private readonly result: TransactionResult,
    private readonly trace?: string[],
  ) {}
  async commit(): Promise<TransactionResult> {
    this.commitCalls += 1;
    this.trace?.push("commit");
    return this.result;
  }
}

/** Implementación mínima del puerto FileSystem en memoria (T040), sin Node. */
export class InMemoryFileSystem implements FileSystem {
  private files = new Map<string, string>();
  private dirs = new Set<string>();
  private counter = 0;
  async lstatKind(path: string): Promise<ManagedFileKind> {
    if (this.files.has(path)) return "file";
    if (this.dirs.has(path)) return "directory";
    return "absent";
  }
  async mkdir(path: string): Promise<void> {
    this.dirs.add(path);
  }
  async mkdtemp(prefix: string): Promise<string> {
    const dir = `${prefix}${(this.counter += 1)}`;
    this.dirs.add(dir);
    return dir;
  }
  async readFile(path: string): Promise<string> {
    const c = this.files.get(path);
    if (c === undefined) throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
    return c;
  }
  async byteSize(path: string): Promise<number> {
    const c = this.files.get(path);
    if (c === undefined) throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
    return new TextEncoder().encode(c).length; // bytes UTF-8, no caracteres
  }
  async writeFileExclusive(path: string, content: string): Promise<void> {
    if (this.files.has(path)) throw Object.assign(new Error("EEXIST"), { code: "EEXIST" });
    this.files.set(path, content);
  }
  async rename(from: string, to: string): Promise<void> {
    const c = this.files.get(from);
    if (c === undefined) throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
    this.files.delete(from);
    this.files.set(to, c);
  }
  async removeFile(path: string): Promise<void> {
    this.files.delete(path);
  }
  async removeDir(path: string): Promise<void> {
    this.dirs.delete(path);
  }
  async removeTree(path: string): Promise<void> {
    this.dirs.delete(path);
    for (const f of [...this.files.keys()]) if (f.startsWith(`${path}/`)) this.files.delete(f);
  }
  async realpath(path: string): Promise<string> {
    return path;
  }
}

export const sampleAnswers: IdentityAnswers = {
  name: "Acme Design System",
  slug: "acme-design-system",
  description: "DS de Acme",
  version: "0.1.0",
};

export interface BuildDepsOverrides {
  resolution?: HostRootResolution;
  state?: PreviousState;
  identity?: PromptOutcome<IdentityAnswers>;
  confirm?: PromptOutcome<boolean>;
  tx?: TransactionResult;
  trace?: string[];
  reporterThrows?: boolean;
  reporter?: Reporter;
}

export interface BuiltDeps {
  deps: InitializeDependencies;
  resolver: FakeHostRootResolver;
  classifier: FakeClassifier;
  prompter: ScriptedPrompter;
  reporter: RecordingReporter;
  writer: FakeTransactionalWriter;
}

/** Construye dependencias con fakes configurables + preparador/validadores reales (sin FS real). */
export function buildDeps(overrides: BuildDepsOverrides = {}): BuiltDeps {
  const trace = overrides.trace;
  const resolver = new FakeHostRootResolver(
    overrides.resolution ?? { ok: true, hostRoot: validHostRoot() },
    trace,
  );
  const classifier = new FakeClassifier(overrides.state ?? { kind: "none" }, trace);
  const prompter = new ScriptedPrompter(
    overrides.identity ?? { kind: "answered", value: sampleAnswers },
    overrides.confirm ?? { kind: "answered", value: true },
    trace,
  );
  const reporter = new RecordingReporter(trace, overrides.reporterThrows ?? false);
  const writer = new FakeTransactionalWriter(
    overrides.tx ?? { status: "committed", files: ["neuraz-ds.config.json"] },
    trace,
  );
  const preparer: DocumentPreparer = documentPreparer;
  const deps: InitializeDependencies = {
    resolver,
    classifier,
    prompter,
    reporter: overrides.reporter ?? reporter,
    preparer,
    validators: documentValidators,
    writer,
  };
  return { deps, resolver, classifier, prompter, reporter, writer };
}

export type { PreparedFile };
