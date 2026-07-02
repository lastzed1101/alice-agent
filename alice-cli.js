#!/usr/bin/env node

/**
 * Alice AI Agent - CLI Entry Point
 *
 * Usage:
 *   alice              Start Alice (frontend only, single port)
 *   alice --agent      Also start agent server (for extra tools)
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
// Resolve project root (works whether installed globally via npm link
// or run directly from the project directory)
// ============================================================
function findProjectRoot() {
  // 1. If run from project directory (npm run / node alice-cli.js)
  const scriptDir = path.dirname(new URL(import.meta.url).pathname);
  if (fs.existsSync(path.join(scriptDir, "package.json"))) {
    return scriptDir;
  }

  // 2. If installed globally via npm link — follow symlinks
  // npm link creates a symlink in /usr/local/bin/alice → /path/to/alice-cli.js
  // import.meta.url points to the symlink target
  let scriptRealDir;
  try {
    const realScript = fs.realpathSync(new URL(import.meta.url).pathname);
    scriptRealDir = path.dirname(realScript);
  } catch {
    scriptRealDir = path.dirname(new URL(import.meta.url).pathname);
  }
  if (fs.existsSync(path.join(scriptRealDir, "package.json"))) {
    return scriptRealDir;
  }

  // 3. Check if running from within node_modules/.bin/alice
  // Walk up to find the nearest package.json with "name": "alice-agent"
  let dir = scriptRealDir;
  for (let i = 0; i < 10; i++) {
    const pkgPath = path.join(dir, "package.json");
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
        if (pkg.name === "alice-agent" || pkg.name === "@alice/agent") {
          return dir;
        }
      } catch {}
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  // 4. Fallback: use script directory
  return realDir;
}

const PROJECT_ROOT = findProjectRoot();

// ============================================================
// CLI argument parsing
// ============================================================
const args = process.argv.slice(2);
const flags = {
  port: 8082,
  agentPort: 3020,
  agent: false,
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
    case "--agent-port":
      flags.agentPort = Number(args[i + 1]) || 3020;
      i++;
      break;
    case "--agent":
      flags.agent = true;
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
  -p, --port <port>         Port for frontend UI (default: 8082)
  --agent                   Also start agent server (for shell/filesystem tools)
  --agent-port <port>       Port for agent server (default: 3020, with --agent)
  --no-open                 Don't auto-open browser
  -h, --help                Show help

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
  console.error("  Make sure you've cloned the Alice repository and ran npm install.");
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

const FRONTEND_PORT = flags.port;
const AGENT_PORT = flags.agentPort;
const ALLOWED_ORIGINS = `http://localhost:${FRONTEND_PORT},http://localhost:${AGENT_PORT},http://localhost:5173,http://localhost:3000`;

// ─── 1) Start Agent Server (optional, with --agent flag) ───────
let agentChild = null;

if (flags.agent) {
  process.env.ALICE_AGENT_PORT = String(AGENT_PORT);
  process.env.ALICE_ORIGINS = ALLOWED_ORIGINS;
  console.log(`  🐇 Starting agent server on port ${AGENT_PORT}...\n`);

  // Use tsx to run TypeScript files
  const tsxBin = path.join(PROJECT_ROOT, "node_modules", ".bin", "tsx");
  const agentPath = path.join(PROJECT_ROOT, "agent-server.ts");
  agentChild = exec(`"${tsxBin}" "${agentPath}"`, {
    cwd: PROJECT_ROOT,
    env: { ...process.env, ALICE_AGENT_PORT: String(AGENT_PORT), ALICE_ORIGINS: ALLOWED_ORIGINS },
  });
  agentChild.stdout?.pipe(process.stdout);
  agentChild.stderr?.pipe(process.stderr);
}

// ─── 2) Start Frontend Dev Server (Vite) ───────────────────────
console.log(`  🎨 Starting frontend on port ${FRONTEND_PORT}...\n`);

const viteBin = path.join(PROJECT_ROOT, "node_modules", ".bin", "vite");
const frontendChild = exec(`"${viteBin}" dev --port ${FRONTEND_PORT} --host`, {
  cwd: PROJECT_ROOT,
  env: {
    ...process.env,
    PORT: String(FRONTEND_PORT),
    VITE_PORT: String(FRONTEND_PORT),
    VITE_ALICE_AGENT_PORT: flags.agent ? String(AGENT_PORT) : "",
  },
});

frontendChild.stdout?.pipe(process.stdout);
frontendChild.stderr?.pipe(process.stderr);

frontendChild.on("error", (err) => {
  console.error(`  ❌ Frontend failed to start: ${err.message}`);
});
frontendChild.on("exit", (code) => {
  if (code && code !== 0 && code !== null) {
    console.error(`  ❌ Frontend exited with code ${code}`);
  }
});

// ─── 3) Wait for server, then open browser ────────────────────
setTimeout(() => {
  const frontendUrl = `http://localhost:${FRONTEND_PORT}`;

  console.log("\n  ─────────────────────────────────────────");
  console.log(`  🌐 Frontend (UI):  ${frontendUrl}`);
  if (flags.agent) {
    console.log(`  🐇 Agent Server:  http://localhost:${AGENT_PORT}`);
  } else {
    console.log("  🐇 Agent Mode:   SSR (TanStack Start)");
  }
  console.log("  ─────────────────────────────────────────\n");

  if (flags.open) {
    const platform = os.platform();
    const cmd =
      platform === "darwin"
        ? `open "${frontendUrl}"`
        : platform === "win32"
          ? `start "" "${frontendUrl}"`
          : `xdg-open "${frontendUrl}" 2>/dev/null || echo ""`;
    try {
      execSync(cmd, { stdio: "ignore" });
    } catch {
      console.log(`  📌 Open ${frontendUrl} in your browser\n`);
    }
  }

  console.log("  Press Ctrl+C to stop\n");
}, 3000);

// ─── 4) Graceful shutdown on Ctrl+C ────────────────────────────
function shutdown() {
  console.log("\n  Shutting down Alice...");
  try {
    frontendChild.kill("SIGTERM");
  } catch {}
  try {
    agentChild?.kill("SIGTERM");
  } catch {}
  setTimeout(() => process.exit(0), 500);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
