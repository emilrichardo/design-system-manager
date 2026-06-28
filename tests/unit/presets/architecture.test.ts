import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = new URL("../../..", import.meta.url).pathname;

function tsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) out.push(...tsFiles(full));
    else if (entry.endsWith(".ts")) out.push(full);
  }
  return out;
}

describe("preset architecture boundary", () => {
  it("domain preset/change modules do not import filesystem, CLI, JSON serializers, streams, prompts, or exit-code modules", () => {
    const files = [
      ...tsFiles(join(ROOT, "src/domain/presets")),
      ...tsFiles(join(ROOT, "src/domain/changes")),
    ];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      expect(text).not.toMatch(/from\s+["'](node:)?fs/);
      expect(text).not.toMatch(/from\s+["'](node:)?path/);
      expect(text).not.toMatch(/from\s+["']commander["']/);
      expect(text).not.toMatch(/from\s+["']@clack\/prompts["']/);
      expect(text).not.toMatch(/from\s+["'][^"']*cli\//);
      expect(text).not.toMatch(/from\s+["'][^"']*reporter/);
      expect(text).not.toMatch(/from\s+["'][^"']*json/);
      expect(text).not.toMatch(/exitCode|stdout|stderr|process\.exit/);
    }
  });
});
