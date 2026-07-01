/**
 * @vitest-environment node
 */
import { describe, it, expect } from "vitest";
import { parseSchedule } from "../src/lib/alice/tools";

describe("parseSchedule", () => {
  it("parses 'every Xm' correctly", () => {
    const result = parseSchedule("every 60m");
    expect(result.intervalMs).toBe(60 * 60_000);
    expect(result.nextRun).toBeGreaterThanOrEqual(Date.now());
  });

  it("parses 'every Xh' correctly", () => {
    const result = parseSchedule("every 24h");
    expect(result.intervalMs).toBe(24 * 3600_000);
  });

  it("parses 'every Xs' correctly", () => {
    const result = parseSchedule("every 30s");
    expect(result.intervalMs).toBe(30_000);
  });

  it("parses 'daily HH:MM' correctly", () => {
    const now = new Date();
    const result = parseSchedule("daily 09:30");
    expect(result.dailyAt).toBe("09:30");
    expect(result.nextRun).toBeGreaterThan(now.getTime());
  });

  it("falls back to 1 hour for invalid input", () => {
    const result = parseSchedule("invalid schedule");
    expect(result.intervalMs).toBe(3600_000);
  });
});
