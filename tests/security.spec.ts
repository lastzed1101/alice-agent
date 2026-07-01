/**
 * @vitest-environment node
 */
import { describe, it, expect } from "vitest";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

// Simulate the securePath function from agent-server.ts
function securePath(userPath: string, allowAbsolute = false): string {
  const normalized = path.normalize(userPath);
  if (normalized.includes("..")) {
    throw new Error("Invalid path: '..' not allowed");
  }
  if (!allowAbsolute && path.isAbsolute(normalized)) {
    throw new Error("Absolute paths not allowed");
  }
  const cwd = process.cwd();
  const resolved = path.resolve(cwd, normalized);
  // If absolute allowed and result is absolute, skip cwd check
  if (allowAbsolute && path.isAbsolute(resolved)) {
    return resolved;
  }
  if (!resolved.startsWith(cwd + path.sep) && resolved !== cwd) {
    throw new Error("Path traversal attempt detected");
  }
  return resolved;
}

describe("securePath (Path Traversal Protection)", () => {
  it("allows normal relative paths", () => {
    const result = securePath("src/index.ts");
    expect(result).toContain("src" + path.sep + "index.ts");
  });

  it("blocks paths with ..", () => {
    expect(() => securePath("../etc/passwd")).toThrow("..' not allowed");
    expect(() => securePath("src/../../secret")).toThrow("..' not allowed");
  });

  it("blocks attempts to escape CWD", () => {
    expect(() => securePath("../../../etc/passwd")).toThrow("..' not allowed");
  });

  it("blocks absolute paths when not allowed", () => {
    expect(() => securePath("/etc/passwd")).toThrow("Absolute paths not allowed");
  });

  it("allows absolute paths when explicitly permitted", () => {
    const result = securePath("/tmp", true);
    expect(result).toBe("/tmp");
  });

  it("resolves . and ./ correctly", () => {
    const result = securePath(".");
    expect(result).toBe(process.cwd());
  });
});
