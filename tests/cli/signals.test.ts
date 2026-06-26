import { describe, expect, it } from "vitest";
import { installSignalHandlers, type SignalTarget } from "../../src/cli/signals.js";

class FakeSignalTarget implements SignalTarget {
  listeners = new Map<string, Set<() => void>>();
  once(event: string, listener: () => void): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener);
  }
  off(event: string, listener: () => void): void {
    this.listeners.get(event)?.delete(listener);
  }
  emit(event: string): void {
    for (const l of this.listeners.get(event) ?? []) l();
  }
  count(event: string): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}

describe("installSignalHandlers (T045)", () => {
  it("registra SIGINT/SIGTERM y dispara onSignal (sin process.exit)", () => {
    const target = new FakeSignalTarget();
    let cancelled = 0;
    const cleanup = installSignalHandlers(target, () => (cancelled += 1));
    expect(target.count("SIGINT")).toBe(1);
    expect(target.count("SIGTERM")).toBe(1);
    target.emit("SIGINT");
    expect(cancelled).toBe(1);
    cleanup();
  });

  it("el limpiador elimina los listeners (no se acumulan)", () => {
    const target = new FakeSignalTarget();
    const cleanup = installSignalHandlers(target, () => {});
    cleanup();
    expect(target.count("SIGINT")).toBe(0);
    expect(target.count("SIGTERM")).toBe(0);
  });
});
