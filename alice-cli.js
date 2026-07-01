#!/usr/bin/env node

/**
 * Alice AI Agent - CLI Entry Point
 *
 * Usage:
 *   alice              Start Alice (agent server + frontend + browser)
 *   alice --port 3020  Start agent server on custom port
 *   alice --no-open    Don't auto-open browser
 *   alice --help       Show help
 *
 * Architecture:
 *   - Agent Server (backend API): port 3020 (or --port)
 *   - Frontend (Vite dev server):  port 8082
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
  port: 3020,
  frontendPort: 8082,
  open: true,
  help: false,
};

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case "--port":
    case "-p":
      flags.port = Number(args[i + 1]) || 3020;
      i++;
      break;
    case "--frontend-port":
    case "-f":
      flags.frontendPort = Number(args[i + 1]) || 8082;
      i++;
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
  -p, --port <port>           Port for agent server (default: 3020)
  -f, --frontend-port <port>  Port for frontend UI (default: 8082)
  --no-open                   Don't auto-open browser
  -h, --help                  Show help

Config directory: ~/.alice/
  ~/.alice/config.json   Agent server configuration
  ~/.alice/data/         Persistent data storage

Architecture:
  Agent Server (API):  http://localhost:<port>       (default: 3020)
  Frontend (UI):       http://localhost:<frontend>   (default: 8082)
  Browser opens to:    http://localhost:<frontend>   (default: 8082)

Examples:
  alice                 Start with defaults
  alice -p 4000         Start agent server on port 4000
  alice -f 5173         Start frontend on port 5173
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

const AGENT_PORT = flags.port;
const FRONTEND_PORT = flags.frontendPort;
const ALLOWED_ORIGINS = `http://localhost:${AGENT_PORT},http://localhost:${FRONTEND_PORT},http://localhost:5173,http://localhost:3000`;

// ─── 1) Start Agent Server (backend API on port 3020) ──────────
process.env.ALICE_AGENT_PORT = String(AGENT_PORT);
process.env.ALICE_ORIGINS = ALLOWED_ORIGINS;

let agentChild = null;

// Dynamic import of the agent server
try {
  await import(path.join(projectRoot, "agent-server.ts"));
} catch {
  // Fallback: start via tsx
  agentChild = exec(`npx tsx ${path.join(projectRoot, "agent-server.ts")}`, {
    cwd: projectRoot,
    env: { ...process.env, ALICE_AGENT_PORT: String(AGENT_PORT), ALICE_ORIGINS: ALLOWED_ORIGINS },
  });
  agentChild.stdout?.pipe(process.stdout);
  agentChild.stderr?.pipe(process.stderr);
}

// ─── 2) Start Frontend Dev Server (Vite on port 8082) ──────────
console.log(`  🎨 Starting frontend on port ${FRONTEND_PORT}...\n`);

const frontendChild = exec(`npx vite dev --port ${FRONTEND_PORT} --host`, {
  cwd: projectRoot,
  env: {
    ...process.env,
    PORT: String(FRONTEND_PORT),
    VITE_PORT: String(FRONTEND_PORT),
    VITE_ALICE_AGENT_PORT: String(AGENT_PORT),
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
  const agentUrl = `http://localhost:${AGENT_PORT}`;

  console.log("\n  ─────────────────────────────────────────");
  console.log(`  🌐 Frontend (UI):  ${frontendUrl}`);
  console.log(`  🐇 Agent Server:  ${agentUrl}`);
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
