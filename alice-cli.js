#!/usr/bin/env node

/**
 * Alice AI Agent - CLI Entry Point
 *
 * Usage:
 *   alice              Build & start Alice (single port, like Odysseus)
 *   alice --dev        Start with Vite dev server (hot reload)
 *   alice --port 3000  Custom port (default: 8082)
 *   alice --no-open    Don't auto-open browser
 *   alice --help       Show help
 *
 * Install globally:
 *   cd /path/to/alice-agent && npm link
 *   Then run: alice
 */

import { execSync, exec } from "node:child_process";
import * as path from "node:path";
import * as fs from "node:fs";
import * as os from "node:os";

// ============================================================
// Resolve project root
// ============================================================
function findProjectRoot() {
  const scriptDir = path.dirname(new URL(import.meta.url).pathname);
  if (fs.existsSync(path.join(scriptDir, "package.json"))) return scriptDir;

  let scriptRealDir;
  try {
    const realScript = fs.realpathSync(new URL(import.meta.url).pathname);
    scriptRealDir = path.dirname(realScript);
  } catch {
    scriptRealDir = path.dirname(new URL(import.meta.url).pathname);
  }
  if (fs.existsSync(path.join(scriptRealDir, "package.json"))) return scriptRealDir;

  let dir = scriptRealDir;
  for (let i = 0; i < 10; i++) {
    const pkgPath = path.join(dir, "package.json");
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
        if (pkg.name === "alice-agent" || pkg.name === "@alice/agent") return dir;
      } catch {}
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return scriptRealDir;
}

const PROJECT_ROOT = findProjectRoot();

// ─── Load .env file (simple dotenv) ─────────────────────────
function loadDotEnv() {
  const envPath = path.join(PROJECT_ROOT, ".env");
  try {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx <= 0) continue;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {}
}
loadDotEnv();

// ============================================================
// CLI argument parsing
// ============================================================
const args = process.argv.slice(2);
const flags = {
  port: 8082,
  dev: false,
  open: true,
  help: false,
};

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case "--port":
    case "-p":
      flags.port = Number(args[i + 1]) || 8082;
      i++;
      break;
    case "--dev":
      flags.dev = true;
      break;
    case "--no-open":
      flags.open = false;
      break;
    case "--help":
    case "-h":
      flags.help = true;
      break;
  }
}

if (flags.help) {
  console.log(`
╔══════════════════════════════════════════╗
║  🐇 Alice AI Agent                      ║
║  Personal AI with memory, tools & skills ║
╚══════════════════════════════════════════╝

Usage:
  alice [options]

Options:
  -p, --port <port>    Port (default: 8082)
  --dev                Dev mode with Vite hot reload
  --no-open            Don't auto-open browser
  -h, --help           Show help

Install globally:
  cd /path/to/alice-agent
  npm install
  npm link

  Then run: alice

Project directory: ${PROJECT_ROOT}
`);
  process.exit(0);
}

// ============================================================
// Pre-flight checks
// ============================================================
if (!fs.existsSync(path.join(PROJECT_ROOT, "package.json"))) {
  console.error("  ❌ Could not find Alice project directory.");
  console.error(`  Looked in: ${PROJECT_ROOT}`);
  process.exit(1);
}

if (!fs.existsSync(path.join(PROJECT_ROOT, "node_modules"))) {
  console.log("  📦 Installing dependencies...\n");
  try {
    execSync("npm install", { cwd: PROJECT_ROOT, stdio: "inherit" });
  } catch {
    console.error("  ❌ npm install failed. Try running: npm install");
    process.exit(1);
  }
}

// ============================================================
// Start
// ============================================================
console.log("\n  🐇 Starting Alice AI Agent...\n");

const PORT = flags.port;
let serverChild = null;

let devAgentChild = null;
let devFrontendChild = null;

if (flags.dev) {
  // ─── Dev mode: Vite dev server + agent server (2 ports) ───
  console.log("  🛠️  Dev mode: Vite + Agent server (2 ports)\n");

  // Start agent server on port 3020
  const tsxBin = path.join(PROJECT_ROOT, "node_modules", ".bin", "tsx");
  const agentPath = path.join(PROJECT_ROOT, "agent-server.ts");
  process.env.ALICE_AGENT_PORT = "3020";
  process.env.ALICE_PROJECT_ROOT = PROJECT_ROOT;
  process.env.ALICE_ORIGINS = `http://localhost:${PORT},http://localhost:3020,http://localhost:5173`;

  devAgentChild = exec(`"${tsxBin}" "${agentPath}"`, {
    cwd: PROJECT_ROOT,
    env: { ...process.env },
  });
  devAgentChild.stdout?.pipe(process.stdout);
  devAgentChild.stderr?.pipe(process.stderr);

  // Start Vite dev server on main port
  const viteBin = path.join(PROJECT_ROOT, "node_modules", ".bin", "vite");
  devFrontendChild = exec(`"${viteBin}" dev --port ${PORT} --host`, {
    cwd: PROJECT_ROOT,
    env: {
      ...process.env,
      PORT: String(PORT),
      VITE_PORT: String(PORT),
      VITE_ALICE_AGENT_PORT: "3020",
    },
  });
  devFrontendChild.stdout?.pipe(process.stdout);
  devFrontendChild.stderr?.pipe(process.stderr);
  devFrontendChild.on("error", (err) => console.error(`  ❌ Vite failed: ${err.message}`));

  serverChild = devFrontendChild; // track for shutdown
} else {
  // ─── Production mode: single port (like Odysseus) ──────────

  // 1) Build frontend if dist/ doesn't exist or is stale
  const distIndex = path.join(PROJECT_ROOT, "dist", "index.html");
  const needsBuild = !fs.existsSync(distIndex);

  if (needsBuild) {
    console.log("  📦 Building frontend...\n");
    try {
      const viteBin = path.join(PROJECT_ROOT, "node_modules", ".bin", "vite");
      execSync(`"${viteBin}" build`, { cwd: PROJECT_ROOT, stdio: "inherit" });
      console.log("  ✅ Build complete\n");
    } catch {
      console.error("  ❌ Build failed. Try: npm run build");
      process.exit(1);
    }
  } else {
    console.log("  ✅ Frontend already built (dist/index.html exists)\n");
  }

  // 2) Start agent server (serves API + static files on one port)
  const tsxBin = path.join(PROJECT_ROOT, "node_modules", ".bin", "tsx");
  const agentPath = path.join(PROJECT_ROOT, "agent-server.ts");
  process.env.ALICE_AGENT_PORT = String(PORT);
  process.env.ALICE_PROJECT_ROOT = PROJECT_ROOT;
  process.env.ALICE_ORIGINS = `http://localhost:${PORT}`;

  console.log(`  🐇 Starting Alice on port ${PORT} (single-port mode)...\n`);

  serverChild = exec(`"${tsxBin}" "${agentPath}"`, {
    cwd: PROJECT_ROOT,
    env: { ...process.env },
  });
  serverChild.stdout?.pipe(process.stdout);
  serverChild.stderr?.pipe(process.stderr);
}

serverChild?.on("error", (err) => {
  console.error(`  ❌ Server failed to start: ${err.message}`);
});

// ─── Wait for server, then open browser ────────────────────
setTimeout(() => {
  const url = `http://localhost:${PORT}`;

  console.log("\n  ─────────────────────────────────────────");
  console.log(`  🌐 Alice:         ${url}`);
  if (flags.dev) {
    console.log(`  🔧 Agent Server:  http://localhost:3020`);
  }
  console.log("  ─────────────────────────────────────────\n");

  if (flags.open) {
    const platform = os.platform();
    const cmd =
      platform === "darwin"
        ? `open "${url}"`
        : platform === "win32"
          ? `start "" "${url}"`
          : `xdg-open "${url}" 2>/dev/null || echo ""`;
    try {
      execSync(cmd, { stdio: "ignore" });
    } catch {
      console.log(`  📌 Open ${url} in your browser\n`);
    }
  }

  console.log("  Press Ctrl+C to stop\n");
}, 3000);

// ─── Graceful shutdown ─────────────────────────────────────
function shutdown() {
  console.log("\n  Shutting down Alice...");
  try { serverChild?.kill("SIGTERM"); } catch {}
  try { devAgentChild?.kill("SIGTERM"); } catch {}
  try { devFrontendChild?.kill("SIGTERM"); } catch {}
  setTimeout(() => process.exit(0), 500);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
