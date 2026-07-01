/**
 * Alice Agent Server — standalone backend for local AI agent.
 * Provides HTTP API for shell execution, filesystem ops, code execution, etc.
 * Runs alongside the frontend dev server.
 *
 * Usage:
 *   npx tsx agent-server.ts
 *   # or:
 *   node --import tsx agent-server.ts
 */

/* eslint-disable @typescript-eslint/no-explicit-any, no-case-declarations */

import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { execSync, exec, ChildProcess } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import * as dns from "node:dns/promises";

const PORT = Number(process.env.ALICE_AGENT_PORT) || 3020;
const ALLOWED_ORIGINS =
  process.env.ALICE_ORIGINS || "http://localhost:3000,http://localhost:5173,http://localhost:8080";

// ~/.alice/ config directory for persistent storage
const ALICE_DIR = path.join(os.homedir(), ".alice");
const ALICE_DATA_DIR = path.join(ALICE_DIR, "data");

function ensureAliceDir() {
  if (!fs.existsSync(ALICE_DIR)) fs.mkdirSync(ALICE_DIR, { recursive: true });
  if (!fs.existsSync(ALICE_DATA_DIR)) fs.mkdirSync(ALICE_DATA_DIR, { recursive: true });
}

// Secure: Prevent path traversal attacks by resolving to absolute and checking within CWD or root
function securePath(userPath: string, allowAbsolute = false): string {
  const normalized = path.normalize(userPath);

  // Reject paths that try to escape using ..
  if (normalized.includes("..")) {
    throw new Error("Invalid path: '..' not allowed");
  }

  // If absolute paths not allowed, reject them
  if (!allowAbsolute && path.isAbsolute(normalized)) {
    throw new Error("Absolute paths not allowed");
  }

  // Resolve to absolute based on CWD
  const cwd = process.cwd();
  const resolved = path.resolve(cwd, normalized);

  // If absolute paths allowed and result is absolute, trust it
  if (allowAbsolute && path.isAbsolute(resolved)) {
    return resolved;
  }

  // Ensure resolved path is still within CWD (or subdirectory)
  if (!resolved.startsWith(cwd + path.sep) && resolved !== cwd) {
    throw new Error("Path traversal attempt detected");
  }

  return resolved;
}

interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

function runShellCmd(command: string, timeout = 30000, cwd?: string): ExecResult {
  try {
    const output = execSync(command, {
      encoding: "utf-8",
      timeout,
      cwd,
      maxBuffer: 10 * 1024 * 1024,
    });
    return { stdout: output, stderr: "", exitCode: 0 };
  } catch (e: any) {
    return {
      stdout: e.stdout?.toString() || "",
      stderr: e.stderr?.toString() || e.message || String(e),
      exitCode: e.status ?? 1,
    };
  }
}

// Running processes (for process management)
const runningProcesses = new Map<string, ChildProcess>();

// ===== Routes =====

async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  const origin = req.headers.origin || "";
  const corsOrigin = ALLOWED_ORIGINS.split(",").find((o) => origin.startsWith(o.trim())) || origin;

  res.setHeader("Access-Control-Allow-Origin", corsOrigin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Parse URL
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const parts = url.pathname.split("/").filter(Boolean);

  // Read body for POST
  const body = await readBody(req);

  try {
    if (parts[0] === "api") {
      const route = parts.slice(1).join("/");
      await handleRoute(route, req.method || "GET", body, url, res);
    } else {
      // Health check
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", agent: "alice", pid: process.pid }));
    }
  } catch (e: any) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: e.message }));
  }
}

async function handleRoute(
  route: string,
  method: string,
  body: any,
  url: URL,
  res: ServerResponse,
) {
  let result: any;

  switch (route) {
    // ===== Shell =====
    case "shell/run":
      result = runShellCmd(body.command, body.timeout, body.cwd);
      break;

    case "shell/exec":
      result = runShellCmd(body.command, body.timeout, body.cwd);
      break;

    case "shell/spawn": {
      const id = `proc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const proc = exec(body.command, {
        cwd: body.cwd,
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024,
      });
      const pid = proc.pid;
      runningProcesses.set(id, proc);
      let stdout = "",
        stderr = "";
      proc.stdout?.on("data", (d: string) => {
        stdout += d;
      });
      proc.stderr?.on("data", (d: string) => {
        stderr += d;
      });
      proc.on("exit", (code) => {
        result = { id, pid, exitCode: code, stdout, stderr };
      });
      result = { id, pid, status: "running" };
      break;
    }

    case "shell/processes":
      result = runShellCmd("ps aux --sort=-%mem | head -50", 5000);
      break;

    case "shell/which":
      result = runShellCmd(
        `which ${body.name} 2>/dev/null || command -v ${body.name} 2>/dev/null`,
        5000,
      );
      break;

    // ===== Filesystem =====
    case "fs/read": {
      const safeReadPath = securePath(body.path);
      result = fs.readFileSync(safeReadPath, "utf-8");
      break;
    }

    case "fs/write": {
      const safeWritePath = securePath(body.path);
      fs.mkdirSync(path.dirname(safeWritePath), { recursive: true });
      fs.writeFileSync(safeWritePath, body.content, "utf-8");
      result = { path: safeWritePath, bytes: body.content.length };
      break;
    }

    case "fs/append": {
      const safeAppendPath = securePath(body.path);
      fs.appendFileSync(safeAppendPath, body.content, "utf-8");
      result = { path: safeAppendPath };
      break;
    }

    case "fs/delete": {
      const safeDeletePath = securePath(body.path);
      fs.unlinkSync(safeDeletePath);
      result = { deleted: safeDeletePath };
      break;
    }

    case "fs/list": {
      const safeListPath = securePath(body.path || ".");
      const entries = fs.readdirSync(safeListPath, { withFileTypes: true });
      result = entries.map((e) => ({
        name: e.name,
        isFile: e.isFile(),
        isDir: e.isDirectory(),
        isSymlink: e.isSymbolicLink(),
      }));
      break;
    }

    case "fs/exists":
      const safeExistsPath = securePath(body.path);
      result = fs.existsSync(safeExistsPath);
      break;

    case "fs/stat": {
      const safeStatPath = securePath(body.path);
      const s = fs.statSync(safeStatPath);
      result = {
        path: safeStatPath,
        size: s.size,
        isFile: s.isFile(),
        isDir: s.isDirectory(),
        mtimeMs: s.mtimeMs,
        birthtimeMs: s.birthtimeMs,
        mode: s.mode,
      };
      break;
    }

    case "fs/move": {
      const safeFrom = securePath(body.from);
      const safeTo = securePath(body.to);
      fs.renameSync(safeFrom, safeTo);
      result = { from: safeFrom, to: safeTo };
      break;
    }

    case "fs/copy": {
      const safeCopyFrom = securePath(body.from);
      const safeCopyTo = securePath(body.to);
      fs.cpSync(safeCopyFrom, safeCopyTo, { recursive: true });
      result = { from: safeCopyFrom, to: safeCopyTo };
      break;
    }

    case "fs/mkdir": {
      const safeMkdirPath = securePath(body.path);
      fs.mkdirSync(safeMkdirPath, { recursive: body.recursive ?? true });
      result = { path: safeMkdirPath };
      break;
    }

    case "fs/grep": {
      const safeGrepDir = securePath(body.path || ".");
      const include = body.include ? `--include="${body.include}"` : "";
      const grepResult = runShellCmd(
        `rg -n --no-heading ${include} "${body.pattern}" "${safeGrepDir}" 2>/dev/null || grep -rn ${include} "${body.pattern}" "${safeGrepDir}" 2>/dev/null`,
        15000,
      );
      if (grepResult.exitCode !== 0) {
        result = [];
        break;
      }
      const max = body.maxResults ?? 200;
      result = grepResult.stdout
        .trim()
        .split("\n")
        .filter(Boolean)
        .slice(0, max)
        .map((line: string) => {
          const idx = line.indexOf(":");
          if (idx > 0) {
            const rest = line.slice(idx + 1);
            const restIdx = rest.indexOf(":");
            if (restIdx > 0) {
              return {
                path: line.slice(0, idx),
                line: Number(rest.slice(0, restIdx)) || 0,
                text: rest.slice(restIdx + 1),
              };
            }
          }
          return { path: line, line: 0, text: "" };
        });
      break;
    }

    case "fs/glob": {
      const baseDir = securePath(body.cwd || ".");
      const findResult = runShellCmd(`find "${baseDir}" -type f 2>/dev/null | head -5000`, 15000);
      if (findResult.exitCode !== 0) {
        result = [];
        break;
      }
      const files = findResult.stdout.trim().split("\n").filter(Boolean);
      const re = new RegExp(
        "^" +
          String(body.pattern).replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*").replace(/\?/g, ".") +
          "$",
      );
      result = files
        .filter((f) => {
          const rel = f.startsWith(baseDir) ? f.slice(baseDir.length + 1) : f;
          return re.test(rel);
        })
        .slice(0, 200);
      break;
    }

    case "fs/disk-usage": {
      const safeDiskPath = securePath(body.path || ".");
      result = runShellCmd(
        `du -sh "${safeDiskPath}" 2>/dev/null; echo "---"; df -h "${safeDiskPath}" 2>/dev/null`,
        10000,
      );
      break;
    }

    // ===== Code execution =====
    case "code/python": {
      const tmpPy = `/tmp/alice_py_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.py`;
      try {
        fs.writeFileSync(tmpPy, body.code, "utf-8");
        result = runShellCmd(`python3 "${tmpPy}"`, body.timeout || 30000);
      } finally {
        try {
          fs.unlinkSync(tmpPy);
        } catch (e) {
          /* ignore cleanup error */
        }
      }
      break;
    }

    case "code/node": {
      const tmpJs = `/tmp/alice_js_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.mjs`;
      try {
        fs.writeFileSync(tmpJs, body.code, "utf-8");
        result = runShellCmd(`node "${tmpJs}"`, body.timeout || 30000);
      } finally {
        try {
          fs.unlinkSync(tmpJs);
        } catch (e) {
          /* ignore cleanup error */
        }
      }
      break;
    }

    case "code/bash": {
      const tmpSh = `/tmp/alice_sh_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.sh`;
      try {
        fs.writeFileSync(tmpSh, body.code, "utf-8");
        fs.chmodSync(tmpSh, 0o755);
        result = runShellCmd(`bash "${tmpSh}"`, body.timeout || 30000);
      } finally {
        try {
          fs.unlinkSync(tmpSh);
        } catch (e) {
          /* ignore cleanup error */
        }
      }
      break;
    }

    // ===== System =====
    case "system/info":
      result = {
        platform: os.platform(),
        release: os.release(),
        hostname: os.hostname(),
        arch: os.arch(),
        cpus: os.cpus().length,
        memoryTotal: os.totalmem(),
        memoryFree: os.freemem(),
        uptime: os.uptime(),
        homedir: os.homedir(),
        tmpdir: os.tmpdir(),
        loadavg: os.loadavg(),
      };
      break;

    case "system/network": {
      const ifaces = os.networkInterfaces();
      result = {};
      for (const [name, addrs] of Object.entries(ifaces)) {
        if (!addrs) continue;
        result[name] = addrs.filter((a) => a.family === "IPv4").map((a) => a.address);
      }
      break;
    }

    case "system/dns": {
      try {
        result = await dns.resolve4(body.hostname);
      } catch {
        try {
          result = await dns.resolve6(body.hostname);
        } catch (e: any) {
          result = `ERROR: ${e.message}`;
        }
      }
      break;
    }

    case "system/env":
      result = body.key ? (process.env[body.key] ?? null) : undefined;
      break;

    case "system/cwd":
      result = process.cwd();
      break;

    // ===== HTTP Proxy =====
    case "http/fetch": {
      const resp = await fetch(body.url, {
        method: body.method || "GET",
        headers: body.headers,
        body: body.body,
      });
      const text = await resp.text();
      const headers: Record<string, string> = {};
      resp.headers.forEach((v, k) => {
        headers[k] = v;
      });
      result = { status: resp.status, body: text, headers };
      break;
    }

    // ===== Config (filesystem persistence in ~/.alice/data/) =====
    case "config/load": {
      const key = body.key;
      if (!key || !/^[a-zA-Z0-9._-]+$/.test(key)) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid key" }));
        return;
      }
      const filePath = path.join(ALICE_DATA_DIR, `${key}.json`);
      if (fs.existsSync(filePath)) {
        try {
          result = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        } catch {
          result = null; // Malformed JSON on disk — ignore
        }
      } else {
        result = null;
      }
      break;
    }

    case "config/save": {
      const saveKey = body.key;
      if (!saveKey || !/^[a-zA-Z0-9._-]+$/.test(saveKey)) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid key" }));
        return;
      }
      ensureAliceDir();
      const savePath = path.join(ALICE_DATA_DIR, `${saveKey}.json`);
      fs.writeFileSync(savePath, JSON.stringify(body.value, null, 2), "utf-8");
      result = { key: saveKey, bytes: fs.statSync(savePath).size };
      break;
    }

    case "config/delete": {
      const delKey = body.key;
      if (!delKey || !/^[a-zA-Z0-9._-]+$/.test(delKey)) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid key" }));
        return;
      }
      const delPath = path.join(ALICE_DATA_DIR, `${delKey}.json`);
      if (fs.existsSync(delPath)) {
        fs.unlinkSync(delPath);
        result = { deleted: delKey };
      } else {
        result = { deleted: null };
      }
      break;
    }

    case "config/list": {
      ensureAliceDir();
      const files = fs.readdirSync(ALICE_DATA_DIR)
        .filter((f) => f.endsWith(".json"))
        .map((f) => ({ key: f.replace(".json", ""), size: fs.statSync(path.join(ALICE_DATA_DIR, f)).size }));
      result = files;
      break;
    }

    // ===== Health =====
    case "health":
      result = { status: "ok", pid: process.pid, uptime: process.uptime() };
      break;

    default:
      res.writeHead(404);
      res.end(JSON.stringify({ error: `Unknown route: ${route}` }));
      return;
  }

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(result));
}

function readBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    if (req.method === "GET") {
      resolve({});
      return;
    }
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf-8");
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({ raw });
      }
    });
  });
}

// Start server
ensureAliceDir();
const server = createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`\n  🐇 Alice Agent Server running on http://localhost:${PORT}`);
  console.log(`  API: http://localhost:${PORT}/api/<route>`);
  console.log(`  Health: http://localhost:${PORT}/api/health`);
  console.log(`  Config: ~/.alice/\n`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n  Shutting down Alice Agent Server...");
  for (const proc of runningProcesses.values()) {
    try {
      proc.kill();
    } catch (e) {
      /* ignore kill errors */
    }
  }
  server.close(() => process.exit(0));
});

process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
});
