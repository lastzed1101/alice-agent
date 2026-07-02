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
 * Architecture:
 *   - Frontend (Vite dev server):  port 8082 (or --port)
 *   - Agent Server (optional):     port 3020 (via --agent flag)
 *   - Browser opens to:           http://localhost:8082
 */

import { execSync, exec } from "node:child_process";
import * as path from "node:path";
import * as os from "node:os";

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

Config directory: ~/.alice/
  ~/.alice/data/         Persistent data storage

Architecture (single-port mode):
  Frontend (UI):       http://localhost:<port>   (default: 8082)
  Browser opens to:    http://localhost:<port>   (default: 8082)
  Agent Server:        Not started (SSR mode via TanStack Start)

Architecture (with --agent):
  Frontend (UI):       http://localhost:<port>   (default: 8082)
  Agent Server (API):  http://localhost:<agent>  (default: 3020)
  Browser opens to:    http://localhost:<port>   (default: 8082)

Examples:
  alice                 Start frontend only (recommended)
  alice --agent         Start with agent server for extra tools
  alice -p 5173         Start frontend on port 5173
  alice --no-open       Start without opening browser
`);
  process.exit(0);
}

// ============================================================
// Resolve paths
// ============================================================
const scriptDir = path.dirname(new URL(import.meta.url).pathname);
const projectRoot = scriptDir;

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

  try {
    await import(path.join(projectRoot, "agent-server.ts"));
  } catch {
    agentChild = exec(`npx tsx ${path.join(projectRoot, "agent-server.ts")}`, {
      cwd: projectRoot,
      env: { ...process.env, ALICE_AGENT_PORT: String(AGENT_PORT), ALICE_ORIGINS: ALLOWED_ORIGINS },
    });
    agentChild.stdout?.pipe(process.stdout);
    agentChild.stderr?.pipe(process.stderr);
  }
}

// ─── 2) Start Frontend Dev Server (Vite) ───────────────────────
console.log(`  🎨 Starting frontend on port ${FRONTEND_PORT}...\n`);

const frontendChild = exec(`npx vite dev --port ${FRONTEND_PORT} --host`, {
  cwd: projectRoot,
  env: {
    ...process.env,
    PORT: String(FRONTEND_PORT),
    VITE_PORT: String(FRONTEND_PORT),
    VITE_ALICE_AGENT_PORT: flags.agent ? String(AGENT_PORT) : "",  // Empty = SSR mode
  },
});

// Pipe frontend output so the user sees Vite status + errors
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

// ─── 3) Wait for both servers, then open browser ───────────────
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
          ? `start "${frontendUrl}"`
          : `xdg-open "${frontendUrl}" 2>/dev/null || echo "Open ${frontendUrl} in your browser"`;
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
