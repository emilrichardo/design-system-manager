// T027 (009) — `view --json` no abre servidor ni navegador; imprime exactamente un envelope; exit 0 para
// `ready`/`empty`.
import { afterEach, describe, expect, it } from "vitest";
import { runCli } from "../../src/cli/program.js";
import { makeHostProject, type HostProject } from "../helpers/build-host.js";
import { newCallCounts, realViewerDeps } from "../application/viewer/real-deps.js";
import { buildDeps } from "../helpers/in-memory-adapters.js";

function nullIO() {
  const out: string[] = [];
  const err: string[] = [];
  return { io: { out: (t: string) => out.push(t), err: (t: string) => err.push(t) }, out, err };
}

const hosts: HostProject[] = [];
afterEach(async () => {
  await Promise.all(hosts.splice(0).map((h) => h.cleanup()));
});

describe("view --json (T027)", () => {
  it("imprime exactamente un envelope, exit 0 para ready", async () => {
    const p = await makeHostProject();
    hosts.push(p);
    const io = nullIO();
    const code = await runCli({
      argv: ["node", "neuraz-ds", "view", "--json"],
      cwd: p.dir,
      io: io.io,
      deps: buildDeps().deps,
      viewDeps: realViewerDeps(p.dir, newCallCounts()),
      version: "9.9.9",
    });
    expect(code).toBe(0);
    expect(io.err.join("")).toBe("");
    const lines = io.out.join("");
    const envelope = JSON.parse(lines);
    expect(envelope).toMatchObject({ formatVersion: "1.0.0", section: "session", state: "ready" });
  });

  it("exit 0 para empty (sin tokens/assets/presets)", async () => {
    const p = await makeHostProject({ tokens: {} });
    hosts.push(p);
    const io = nullIO();
    const deps = realViewerDeps(p.dir, newCallCounts());
    const emptyDeps = { ...deps, listPresets: async () => ({ outcome: "success" as const, presets: [], validation: null }) };
    const code = await runCli({
      argv: ["node", "neuraz-ds", "view", "--json"],
      cwd: p.dir,
      io: io.io,
      deps: buildDeps().deps,
      viewDeps: emptyDeps,
      version: "9.9.9",
    });
    expect(code).toBe(0);
    const envelope = JSON.parse(io.out.join(""));
    expect(envelope.state).toBe("empty");
  });

  it("no abre servidor: no hay salida de 'listening' en modo --json", async () => {
    const p = await makeHostProject();
    hosts.push(p);
    const io = nullIO();
    await runCli({
      argv: ["node", "neuraz-ds", "view", "--json"],
      cwd: p.dir,
      io: io.io,
      deps: buildDeps().deps,
      viewDeps: realViewerDeps(p.dir, newCallCounts()),
      version: "9.9.9",
    });
    expect(io.out.join("")).not.toContain("listening");
  });

  it("not-found → exit 5, data null", async () => {
    const { mkdtemp, writeFile, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const dir = await mkdtemp(join(tmpdir(), "view-bare-"));
    try {
      await writeFile(join(dir, "package.json"), '{"name":"bare"}\n');
      const io = nullIO();
      const code = await runCli({
        argv: ["node", "neuraz-ds", "view", "--json"],
        cwd: dir,
        io: io.io,
        deps: buildDeps().deps,
        viewDeps: realViewerDeps(dir, newCallCounts()),
        version: "9.9.9",
      });
      expect(code).toBe(5);
      const envelope = JSON.parse(io.out.join(""));
      expect(envelope).toMatchObject({ state: "not-found", data: null });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("rechaza --json global antes del comando (exit 3)", async () => {
    const io = nullIO();
    const code = await runCli({
      argv: ["node", "neuraz-ds", "--json", "view"],
      cwd: "/host",
      io: io.io,
      deps: buildDeps().deps,
      version: "9.9.9",
    });
    expect(code).toBe(3);
  });

  it("view --help documenta --port y --json, sin flags fuera de alcance", async () => {
    const io = nullIO();
    const code = await runCli({
      argv: ["node", "neuraz-ds", "view", "--help"],
      cwd: "/host",
      io: io.io,
      deps: buildDeps().deps,
      version: "9.9.9",
    });
    expect(code).toBe(0);
    const text = io.out.join("") + io.err.join("");
    expect(text).toContain("--port");
    expect(text).toContain("--json");
    expect(text).not.toContain("--force");
  });
});
