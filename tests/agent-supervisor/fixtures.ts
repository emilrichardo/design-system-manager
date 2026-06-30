// Fixtures aisladas para el supervisor de agentes: repos git temporales fuera del repo real.
// Nunca operan sobre el repositorio real.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

export interface TempRepo {
  dir: string;
  feature: string;
  cleanup: () => void;
  write: (rel: string, content: string) => void;
  git: (args: string[]) => string;
}

const SAMPLE_TASKS = `# Tasks: 007-sample

## Checkpoint A — Modelos

- [X] T001 [US1] Primera tarea.
- [X] T002 Segunda tarea.

## Checkpoint B — Lógica

- [ ] T003 Tercera tarea.
- [ ] T004 Cuarta tarea.
- [ ] T005 Quinta tarea.

## Checkpoint C — Cierre

- [ ] T006 Sexta tarea.
`;

export interface MakeRepoOptions {
  feature?: string;
  tasks?: string;
  config?: object;
  packageJson?: object;
  initialCommit?: boolean;
}

/** Crea un repo git temporal con specs/<feature>/tasks.md. */
export function makeTempRepo(options: MakeRepoOptions = {}): TempRepo {
  const feature = options.feature ?? "007-sample";
  const dir = mkdtempSync(join(tmpdir(), "agent-sup-"));
  const git = (args: string[]): string =>
    execFileSync("git", args, { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trimEnd();
  const write = (rel: string, content: string): void => {
    const abs = join(dir, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content, "utf8");
  };

  git(["init", "-q"]);
  git(["config", "user.email", "test@example.com"]);
  git(["config", "user.name", "Test"]);
  git(["config", "commit.gpgsign", "false"]);

  write("package.json", `${JSON.stringify(options.packageJson ?? { name: "host", version: "0.0.0" }, null, 2)}\n`);
  write(`specs/${feature}/tasks.md`, options.tasks ?? SAMPLE_TASKS);
  if (options.config) write(".agent-supervisor.json", `${JSON.stringify(options.config, null, 2)}\n`);

  if (options.initialCommit !== false) {
    git(["add", "--", "package.json", `specs/${feature}/tasks.md`]);
    git(["commit", "-q", "-m", "chore: initial"]);
  }

  return { dir, feature, cleanup: () => rmSync(dir, { recursive: true, force: true }), write, git };
}

export { SAMPLE_TASKS };
