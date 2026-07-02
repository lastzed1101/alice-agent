import { createServerFn } from "@tanstack/react-start";

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

function validate<T>(d: T): T {
  return d;
}

// ===== Shell =====
// Load shell env from login shell for proper PATH and env vars
let cachedShellEnv: NodeJS.ProcessEnv | null = null;

async function getShellEnv(): Promise<NodeJS.ProcessEnv> {
  if (cachedShellEnv) return cachedShellEnv;
  try {
    const { exec } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execAsync = promisify(exec);
    const { stdout } = await execAsync("bash -l -c 'env -0'", {
      encoding: "utf-8",
      timeout: 5000,
      maxBuffer: 1024 * 1024,
    });
    const env: NodeJS.ProcessEnv = { ...process.env };
    const pairs = stdout.split("\0").filter(Boolean);
    for (const pair of pairs) {
      const idx = pair.indexOf("=");
      if (idx > 0) {
        env[pair.slice(0, idx)] = pair.slice(idx + 1);
      }
    }
    cachedShellEnv = env;
    return env;
  } catch {
    cachedShellEnv = process.env;
    return process.env;
  }
}

export const runShell = createServerFn({ method: "POST" })
  .validator((d: { command: string; timeout?: number; cwd?: string }) => d)
  .handler(async ({ data }) => {
    const { exec } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execAsync = promisify(exec);
    const env = await getShellEnv();
    try {
      const { stdout, stderr } = await execAsync(data.command, {
        encoding: "utf-8",
        timeout: data.timeout ?? 30000,
        cwd: data.cwd,
        maxBuffer: 10 * 1024 * 1024,
        env,
      });
      return { stdout: stdout || "", stderr: stderr || "", exitCode: 0 } satisfies ExecResult;
    } catch (e: any) {
      return {
        stdout: e.stdout?.toString() || "",
        stderr: e.stderr?.toString() || e.message || String(e),
        exitCode: e.status ?? 1,
      } satisfies ExecResult;
    }
  });

// ===== Filesystem =====
export const readTextFile = createServerFn({ method: "POST" })
  .validator((d: { path: string }) => d)
  .handler(async ({ data }) => {
    const fs = await import("node:fs");
    return fs.readFileSync(data.path, "utf-8");
  });

export const writeTextFile = createServerFn({ method: "POST" })
  .validator((d: { path: string; content: string }) => d)
  .handler(async ({ data }) => {
    const fs = await import("node:fs");
    fs.writeFileSync(data.path, data.content, "utf-8");
  });

export const appendTextFile = createServerFn({ method: "POST" })
  .validator((d: { path: string; content: string }) => d)
  .handler(async ({ data }) => {
    const fs = await import("node:fs");
    fs.appendFileSync(data.path, data.content, "utf-8");
  });

export const deleteFile = createServerFn({ method: "POST" })
  .validator((d: { path: string }) => d)
  .handler(async ({ data }) => {
    const fs = await import("node:fs");
    fs.unlinkSync(data.path);
  });

export const listDirectory = createServerFn({ method: "POST" })
  .validator((d: { path: string }) => d)
  .handler(async ({ data }) => {
    const fs = await import("node:fs");
    return fs.readdirSync(data.path);
  });

export const fileExists = createServerFn({ method: "POST" })
  .validator((d: { path: string }) => d)
  .handler(async ({ data }) => {
    const fs = await import("node:fs");
    return fs.existsSync(data.path);
  });

export const fileStat = createServerFn({ method: "POST" })
  .validator((d: { path: string }) => d)
  .handler(async ({ data }) => {
    const fs = await import("node:fs");
    const stat = fs.statSync(data.path);
    return {
      path: data.path,
      size: stat.size,
      isFile: stat.isFile(),
      isDir: stat.isDirectory(),
      mtimeMs: stat.mtimeMs,
    };
  });

export const moveFile = createServerFn({ method: "POST" })
  .validator((d: { from: string; to: string }) => d)
  .handler(async ({ data }) => {
    const fs = await import("node:fs");
    fs.renameSync(data.from, data.to);
  });

export const copyFile = createServerFn({ method: "POST" })
  .validator((d: { from: string; to: string }) => d)
  .handler(async ({ data }) => {
    const fs = await import("node:fs");
    fs.copyFileSync(data.from, data.to);
  });

export const makeDirectory = createServerFn({ method: "POST" })
  .validator((d: { path: string; recursive?: boolean }) => d)
  .handler(async ({ data }) => {
    const fs = await import("node:fs");
    fs.mkdirSync(data.path, { recursive: data.recursive ?? false });
  });

// ===== Code execution =====
export const executePython = createServerFn({ method: "POST" })
  .validator((d: { code: string; timeout?: number }) => d)
  .handler(async ({ data }) => {
    const { exec } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execAsync = promisify(exec);
    const fs = await import("node:fs");
    const env = await getShellEnv();
    const tmpFile = `/tmp/alice_py_${Date.now()}.py`;
    try {
      fs.writeFileSync(tmpFile, data.code, "utf-8");
      const { stdout } = await execAsync(`python3 ${tmpFile}`, {
        encoding: "utf-8",
        timeout: data.timeout ?? 30000,
        maxBuffer: 5 * 1024 * 1024,
        env,
      });
      return { stdout: stdout || "", stderr: "", exitCode: 0 } satisfies ExecResult;
    } catch (e: any) {
      return {
        stdout: e.stdout?.toString() || "",
        stderr: e.stderr?.toString() || e.message || String(e),
        exitCode: e.status ?? 1,
      } satisfies ExecResult;
    } finally {
      try {
        fs.unlinkSync(tmpFile);
      } catch {}
    }
  });

export const executeNode = createServerFn({ method: "POST" })
  .validator((d: { code: string; timeout?: number }) => d)
  .handler(async ({ data }) => {
    const { exec } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execAsync = promisify(exec);
    const fs = await import("node:fs");
    const env = await getShellEnv();
    const tmpFile = `/tmp/alice_js_${Date.now()}.mjs`;
    try {
      fs.writeFileSync(tmpFile, data.code, "utf-8");
      const { stdout } = await execAsync(`node ${tmpFile}`, {
        encoding: "utf-8",
        timeout: data.timeout ?? 30000,
        maxBuffer: 5 * 1024 * 1024,
        env,
      });
      return { stdout: stdout || "", stderr: "", exitCode: 0 } satisfies ExecResult;
    } catch (e: any) {
      return {
        stdout: e.stdout?.toString() || "",
        stderr: e.stderr?.toString() || e.message || String(e),
        exitCode: e.status ?? 1,
      } satisfies ExecResult;
    } finally {
      try {
        fs.unlinkSync(tmpFile);
      } catch {}
    }
  });

// ===== System =====
export const getCwd = createServerFn({ method: "GET" }).handler(async () => {
  return process.cwd();
});

export const getEnv = createServerFn({ method: "POST" })
  .validator((d: { key: string }) => d)
  .handler(async ({ data }) => {
    return process.env[data.key] ?? null;
  });

export const whichBin = createServerFn({ method: "POST" })
  .validator((d: { name: string }) => d)
  .handler(async ({ data }) => {
    const { exec } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execAsync = promisify(exec);
    const env = await getShellEnv();
    try {
      const { stdout } = await execAsync(
        `which ${data.name} 2>/dev/null || command -v ${data.name} 2>/dev/null`,
        {
          encoding: "utf-8",
          timeout: 5000,
          env,
        },
      );
      return stdout.trim();
    } catch {
      return null;
    }
  });

export const listProcesses = createServerFn({ method: "GET" }).handler(async () => {
  const { exec } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execAsync = promisify(exec);
  const env = await getShellEnv();
  try {
    const { stdout } = await execAsync("ps aux --sort=-%mem | head -50", { encoding: "utf-8", timeout: 5000, env });
    return stdout;
  } catch {
    try {
      const { stdout } = await execAsync("ps aux | head -50", { encoding: "utf-8", timeout: 5000, env });
      return stdout;
    } catch (e: any) {
      return `ERROR: ${e.message}`;
    }
  }
});

export const getSystemInfo = createServerFn({ method: "GET" }).handler(async () => {
  const os = await import("node:os");
  const parts: string[] = [
    `Platform: ${os.platform()} ${os.release()}`,
    `Hostname: ${os.hostname()}`,
    `Arch: ${os.arch()}`,
    `CPUs: ${os.cpus().length}`,
    `Memory: ${Math.round((os.totalmem() / 1024 / 1024 / 1024) * 10) / 10} GB total, ${Math.round((os.freemem() / 1024 / 1024 / 1024) * 10) / 10} GB free`,
    `Uptime: ${Math.round(os.uptime() / 3600)}h`,
  ];
  return parts.join("\n");
});

export const getNetworkInfo = createServerFn({ method: "GET" }).handler(async () => {
  const os = await import("node:os");
  const ifaces = os.networkInterfaces();
  const parts: string[] = [];
  for (const [name, addrs] of Object.entries(ifaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      if (addr.family === "IPv4" && !addr.internal) {
        parts.push(`${name}: ${addr.address}`);
      }
    }
  }
  return parts.join("\n") || "No non-internal IPv4 addresses found";
});

export const dnsResolve = createServerFn({ method: "POST" })
  .validator((d: { hostname: string }) => d)
  .handler(async ({ data }) => {
    const dns = await import("node:dns/promises");
    try {
      const addrs = await dns.resolve4(data.hostname);
      return addrs.join("\n");
    } catch {
      try {
        const addrs = await dns.resolve6(data.hostname);
        return addrs.join("\n");
      } catch (e: any) {
        return `ERROR: ${e.message}`;
      }
    }
  });

export const grepSearch = createServerFn({ method: "POST" })
  .validator((d: { pattern: string; path?: string; include?: string; maxResults?: number }) => d)
  .handler(async ({ data }) => {
    const { exec } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execAsync = promisify(exec);
    const env = await getShellEnv();
    const dir = data.path || ".";
    const include = data.include ? `--include="${data.include}"` : "";
    try {
      const { stdout: result } = await execAsync(
        `rg -n --no-heading ${include} "${data.pattern}" ${dir} 2>/dev/null || grep -rn ${include} "${data.pattern}" ${dir} 2>/dev/null`,
        { encoding: "utf-8", timeout: 15000, maxBuffer: 2 * 1024 * 1024, env },
      );
      const max = data.maxResults ?? 200;
      return result
        .trim()
        .split("\n")
        .filter(Boolean)
        .slice(0, max)
        .map((line) => {
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
    } catch {
      return [];
    }
  });

export const httpRequest = createServerFn({ method: "POST" })
  .validator(
    (d: { url: string; method?: string; headers?: Record<string, string>; body?: string }) => d,
  )
  .handler(async ({ data }) => {
    const resp = await fetch(data.url, {
      method: data.method || "GET",
      headers: data.headers,
      body: data.body,
    });
    const body = await resp.text();
    const headers: Record<string, string> = {};
    resp.headers.forEach((v, k) => {
      headers[k] = v;
    });
    return { status: resp.status, body, headers };
  });

// ===== Config Persistence (disk) =====
import * as os from "node:os";
import * as path from "node:path";

const ALICE_DATA_DIR = path.join(os.homedir(), ".alice", "data");

function ensureAliceDirSync() {
  const fs = require("node:fs") as typeof import("node:fs");
  if (!fs.existsSync(ALICE_DATA_DIR)) fs.mkdirSync(ALICE_DATA_DIR, { recursive: true });
}

export const configSave = createServerFn({ method: "POST" })
  .validator((d: { key: string; value: unknown }) => d)
  .handler(async ({ data }) => {
    const fs = await import("node:fs");
    const key = data.key;
    if (!key || !/^[a-zA-Z0-9._-]+$/.test(key)) throw new Error("Invalid key");
    ensureAliceDirSync();
    const filePath = path.join(ALICE_DATA_DIR, `${key}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data.value, null, 2), "utf-8");
    return { key, bytes: fs.statSync(filePath).size };
  });

export const configLoad = createServerFn({ method: "POST" })
  .validator((d: { key: string }) => d)
  .handler(async ({ data }) => {
    const fs = await import("node:fs");
    const key = data.key;
    if (!key || !/^[a-zA-Z0-9._-]+$/.test(key)) throw new Error("Invalid key");
    const filePath = path.join(ALICE_DATA_DIR, `${key}.json`);
    if (!fs.existsSync(filePath)) return null;
    try {
      return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    } catch {
      return null;
    }
  });

export const configDelete = createServerFn({ method: "POST" })
  .validator((d: { key: string }) => d)
  .handler(async ({ data }) => {
    const fs = await import("node:fs");
    const key = data.key;
    if (!key || !/^[a-zA-Z0-9._-]+$/.test(key)) throw new Error("Invalid key");
    const filePath = path.join(ALICE_DATA_DIR, `${key}.json`);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return { deleted: key };
  });

export const configList = createServerFn({ method: "GET" })
  .handler(async () => {
    const fs = await import("node:fs");
    ensureAliceDirSync();
    return fs.readdirSync(ALICE_DATA_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => ({ key: f.replace(".json", ""), size: fs.statSync(path.join(ALICE_DATA_DIR, f)).size }));
  });

// ===== AI Chat Completions Proxy (hides API keys from browser) =====
export const proxyChatCompletion = createServerFn({ method: "POST" })
  .validator((d: { providerId: string; requestBody: Record<string, unknown> }) => d)
  .handler(async ({ data }) => {
    const fs = await import("node:fs");
    // Load provider config from disk to get API key
    const providersPath = path.join(ALICE_DATA_DIR, "alice.providers.json");
    let providers: Array<{ id: string; baseUrl: string; apiKey: string; name: string }> = [];
    try {
      if (fs.existsSync(providersPath)) {
        providers = JSON.parse(fs.readFileSync(providersPath, "utf-8"));
      }
    } catch { /* ignore */ }
    const provider = providers.find((p) => p.id === data.providerId);
    if (!provider) throw new Error(`Provider ${data.providerId} not found on disk`);
    // Forward request to AI provider with API key from server-side storage
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${provider.apiKey || "dummy"}`,
    };
    if (data.providerId === "openrouter") {
      headers["HTTP-Referer"] = "http://localhost:8082";
      headers["X-Title"] = "Alice";
    }
    const resp = await fetch(
      `${provider.baseUrl.replace(/\/$/, "")}/chat/completions`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(data.requestBody),
      },
    );
    const body = await resp.text();
    const respHeaders: Record<string, string> = {};
    resp.headers.forEach((v, k) => { respHeaders[k] = v; });
    return { status: resp.status, body, headers: respHeaders };
  });
