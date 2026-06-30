// Helpers de git para el supervisor. Sin shell: execFileSync con argumentos como array (evita inyección).
// `createGit(cwd)` permite operar sobre repos temporales en tests sin tocar el repo real.
import { execFileSync } from "node:child_process";
import { REPO_ROOT, AgentError } from "./repo.mjs";

/** @param {string} cwd */
export function createGit(cwd = REPO_ROOT) {
  /** @param {string[]} args */
  function git(args, { allowFail = false } = {}) {
    try {
      return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trimEnd();
    } catch (e) {
      if (allowFail) return "";
      throw new AgentError(`git ${args.join(" ")} falló`, { stderr: String(e?.stderr ?? "").slice(0, 500) });
    }
  }

  function shortHead() {
    return git(["rev-parse", "--short", "HEAD"], { allowFail: true }) || "(sin commits)";
  }

  /** Parsea `git status --porcelain` en categorías. `-uall` evita colapsar dirs untracked. */
  function status() {
    const out = git(["status", "--porcelain", "--untracked-files=all"], { allowFail: true });
    const staged = [];
    const modified = [];
    const untracked = [];
    for (const line of out.split("\n")) {
      if (line.length === 0) continue;
      const x = line[0];
      const y = line[1];
      const path = line.slice(3);
      if (x === "?" && y === "?") {
        untracked.push(path);
        continue;
      }
      if (x !== " " && x !== "?") staged.push(path);
      if (y !== " " && y !== "?") modified.push(path);
    }
    return { staged, modified, untracked };
  }

  /** ¿Tracked tree limpio? (ignora untracked). */
  function isTrackedClean() {
    const s = status();
    return s.staged.length === 0 && s.modified.length === 0;
  }

  /** @param {string[]} files */
  function addExplicit(files) {
    if (files.length === 0) return;
    git(["add", "--", ...files]);
  }

  /** @param {string} message */
  function commit(message) {
    git(["commit", "-m", message]);
  }

  return { cwd, git, shortHead, status, isTrackedClean, addExplicit, commit };
}
