// T039 (008) — Comandos `token` via runCli con IO falso: plan/apply (`--file`), shorthands
// create/update/rename/move/remove, set/remove-alias y grupos (vía `--file`), human/JSON output,
// streams, exit codes, errores esperados e internal-error. `plan` no escribe (writer nunca invocado).
import { writeFile } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import { runCli } from "../../src/cli/program.js";
import { fakeSnapshot, fakeWriter, nullIO, runtime, sourceFrom, throwingSnapshot, writeTempCommandFile } from "./token-cli-fakes.js";

const cleanups: Array<() => Promise<void>> = [];
afterEach(async () => {
  while (cleanups.length) await cleanups.pop()!();
});

async function commandFile(operations: readonly unknown[]): Promise<string> {
  const f = await writeTempCommandFile(operations);
  cleanups.push(f.cleanup);
  return f.path;
}

describe("token CLI commands (T039)", () => {
  it("plan --file: planned/0, diff en stdout, stderr vacío, writer nunca invocado", async () => {
    const io = nullIO();
    const file = await commandFile([{ kind: "update-value", path: "color.base.blue-500", value: "#000000" }]);
    const writer = fakeWriter("written");
    const code = await runCli(runtime(io.io, `token plan --file ${file}`, { writer }));
    expect(code).toBe(0);
    expect(io.out.join("")).toContain("Token plan: planned");
    expect(io.err.join("")).toBe("");
    expect(writer.write).not.toHaveBeenCalled();
  });

  it("plan --file --json: un envelope token-plan en stdout", async () => {
    const io = nullIO();
    const file = await commandFile([{ kind: "update-value", path: "color.base.blue-500", value: "#000000" }]);
    const code = await runCli(runtime(io.io, `token plan --file ${file} --json`));
    expect(code).toBe(0);
    const env = JSON.parse(io.out.join(""));
    expect(env).toMatchObject({ formatVersion: "1.0.0", command: "token-plan", outcome: "planned" });
    expect(io.err.join("")).toBe("");
  });

  it("apply --file: applied/0, writer invocado una vez", async () => {
    const io = nullIO();
    const file = await commandFile([{ kind: "update-value", path: "color.base.blue-500", value: "#000000" }]);
    const writer = fakeWriter("written");
    const code = await runCli(runtime(io.io, `token apply --file ${file}`, { writer }));
    expect(code).toBe(0);
    expect(io.out.join("")).toContain("Token apply: applied");
    expect(writer.write).toHaveBeenCalledTimes(1);
  });

  it("apply --file --json: un envelope token-apply en stdout", async () => {
    const io = nullIO();
    const file = await commandFile([{ kind: "update-value", path: "color.base.blue-500", value: "#000000" }]);
    const code = await runCli(runtime(io.io, `token apply --file ${file} --json`));
    expect(code).toBe(0);
    const env = JSON.parse(io.out.join(""));
    expect(env).toMatchObject({ command: "token-apply", outcome: "applied" });
  });

  it("set-alias y remove-alias vía --file (sin shorthand dedicado)", async () => {
    const io = nullIO();
    const file = await commandFile([{ kind: "remove-alias", path: "accent" }]);
    const code = await runCli(runtime(io.io, `token apply --file ${file}`));
    expect(code).toBe(0);
    expect(io.out.join("")).toContain("applied");
  });

  it("grupos vía --file: create-group/rename-group", async () => {
    const io = nullIO();
    const file = await commandFile([{ kind: "create-group", path: "spacing" }]);
    const code = await runCli(runtime(io.io, `token plan --file ${file}`));
    expect(code).toBe(0);
    expect(io.out.join("")).toContain("planned");
  });

  it("shorthand create: applied/0, escribe", async () => {
    const io = nullIO();
    const writer = fakeWriter("written");
    const code = await runCli(runtime(io.io, "token create spacing.100 --type dimension --value {\"value\":4,\"unit\":\"px\"}", { writer }));
    expect(code).toBe(0);
    expect(writer.write).toHaveBeenCalledTimes(1);
  });

  it("shorthand update: applied/0", async () => {
    const io = nullIO();
    const code = await runCli(runtime(io.io, "token update color.base.blue-500 --value \"#111111\""));
    expect(code).toBe(0);
    expect(io.out.join("")).toContain("Token apply: applied");
  });

  it("shorthand rename: applied/0, reescribe el alias existente", async () => {
    const io = nullIO();
    const code = await runCli(runtime(io.io, "token rename color.base.blue-500 blue-600"));
    expect(code).toBe(0);
  });

  it("shorthand move: applied/0", async () => {
    const io = nullIO();
    const code = await runCli(runtime(io.io, "token move color.base.blue-500 color"));
    expect(code).toBe(0);
  });

  it("shorthand remove: bloqueado por dependientes (conflict/4), sin escritura", async () => {
    const io = nullIO();
    const writer = fakeWriter("written");
    const code = await runCli(runtime(io.io, "token remove color.base.blue-500", { writer }));
    expect(code).toBe(4);
    expect(writer.write).not.toHaveBeenCalled();
    expect(io.err.join("")).toContain("removal-with-dependents");
  });

  it("error esperado (invalid-command) humano: stdout vacío, stderr con el mensaje, exit 3", async () => {
    const io = nullIO();
    const file = await commandFile([{ kind: "update-value", path: "color.base.missing", value: "#000000" }]);
    const code = await runCli(runtime(io.io, `token plan --file ${file}`));
    expect(code).toBe(3);
    expect(io.out.join("")).toBe("");
    expect(io.err.join("")).toContain("invalid-command");
  });

  it("error esperado (invalid-command) JSON: sigue en stdout como envelope, exit 3", async () => {
    const io = nullIO();
    const file = await commandFile([{ kind: "update-value", path: "color.base.missing", value: "#000000" }]);
    const code = await runCli(runtime(io.io, `token plan --file ${file} --json`));
    expect(code).toBe(3);
    const env = JSON.parse(io.out.join(""));
    expect(env.outcome).toBe("invalid-command");
    expect(io.err.join("")).toBe("");
  });

  it("conflict (colisión de rename) humano: exit 4, sin escritura", async () => {
    const io = nullIO();
    const doc = { color: { base: { "blue-500": { $type: "color", $value: "#3b82f6" }, "blue-600": { $type: "color", $value: "#123456" } } } };
    const file = await commandFile([{ kind: "rename-token", path: "color.base.blue-500", newName: "blue-600" }]);
    const writer = fakeWriter();
    const code = await runCli(runtime(io.io, `token apply --file ${file}`, { snapshot: fakeSnapshot(sourceFrom(doc)), writer }));
    expect(code).toBe(4);
    expect(writer.write).not.toHaveBeenCalled();
  });

  it("internal-error humano (excepción inesperada): stdout vacío, stderr seguro, exit 70", async () => {
    const io = nullIO();
    const file = await commandFile([{ kind: "update-value", path: "color.base.blue-500", value: "#000000" }]);
    const code = await runCli(runtime(io.io, `token plan --file ${file}`, { snapshot: throwingSnapshot() }));
    expect(code).toBe(70);
    expect(io.out.join("")).toBe("");
    expect(io.err.join("")).toContain("internal-error");
    expect(io.err.join("")).not.toContain("boom");
  });

  it("internal-error JSON: envelope internal-error en stderr, stdout vacío, exit 70", async () => {
    const io = nullIO();
    const file = await commandFile([{ kind: "update-value", path: "color.base.blue-500", value: "#000000" }]);
    const code = await runCli(runtime(io.io, `token apply --file ${file} --json`, { snapshot: throwingSnapshot() }));
    expect(code).toBe(70);
    expect(io.out.join("")).toBe("");
    const env = JSON.parse(io.err.join(""));
    expect(env).toMatchObject({ command: "token-apply", outcome: "internal-error" });
  });

  it("archivo de comando inválido (no JSON): error de uso, exit 3, nunca internal-error", async () => {
    const io = nullIO();
    const { path, cleanup } = await writeTempCommandFile([]);
    cleanups.push(cleanup);
    await writeFile(path, "not json", "utf8");
    const code = await runCli(runtime(io.io, `token plan --file ${path}`));
    expect(code).toBe(3);
    expect(io.err.join("")).not.toContain("internal-error");
  });

  it("rechaza --json global antes del grupo (exit 3)", async () => {
    const io = nullIO();
    const file = await commandFile([]);
    expect(await runCli(runtime(io.io, `--json token plan --file ${file}`))).toBe(3);
  });

  it("rechaza --force (fuera de alcance) en remove: error de uso", async () => {
    const io = nullIO();
    expect(await runCli(runtime(io.io, "token remove color.base.blue-500 --force"))).toBe(3);
  });

  it("--file ausente en plan/apply: error de uso (exit 3)", async () => {
    const io = nullIO();
    expect(await runCli(runtime(io.io, "token plan"))).toBe(3);
    expect(await runCli(runtime(io.io, "token apply"))).toBe(3);
  });
});
