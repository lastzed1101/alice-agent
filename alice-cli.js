#!/usr/bin/env node

/**
 * Alice AI Agent - CLI Entry Point
 *
 * Usage:
 *   alice              Start Alice (agent server + browser)
 *   alice --port 3020  Start on custom port
 *   alice --no-open    Don't auto-open browser
 *   alice --help       Show help
 */

import { createServer } from "node:http";
import { execSync, exec, ChildProcess } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import * as readline from "node:readline";

// ============================================================
// Config directory: ~/.alice/
// ============================================================
const ALICE_DIR = path.join(os.homedir(), ".alice");
const CONFIG_FILE = path.join(ALICE_DIR, "config.json");
const DATA_DIR = path.join(ALICE_DIR, "data");

function ensureAliceDir() {
  if (!fs.existsSync(ALICE_DIR)) fs.mkdirSync(ALICE_DIR, { recursive: true });
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadConfig() {
  ensureAliceDir();
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
    }
  } catch {}
  return {};
}

function saveConfig(config) {
  ensureAliceDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

// ============================================================
// CLI argument parsing
// ============================================================
const args = process.argv.slice(2);
const flags = {
  port: 3020,
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
  -p, --port <port>   Port for agent server (default: 3020)
  --no-open           Don't auto-open browser
  -h, --help          Show this help

Config directory: ~/.alice/
  ~/.alice/config.json   Agent server configuration
  ~/.alice/data/         Persistent data storage

Examples:
  alice                 Start with defaults
  alice -p 4000         Start on port 4000
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
// Start Agent Server
// ============================================================
console.log("\n  🐇 Starting Alice AI Agent...\n");

// Build the project first if needed
const distPath = path.join(projectRoot, "dist");
const needsBuild = !fs.existsSync(distPath);

if (needsBuild) {
  console.log("  📦 Building frontend...");
  try {
    execSync("npm run build", { cwd: projectRoot, stdio: "inherit" });
    console.log("  ✅ Build complete\n");
  } catch {
    console.log("  ⚠️  Build failed, continuing with dev mode\n");
  }
}

// Start the agent server inline
const PORT = flags.port;
const ALLOWED_ORIGINS = `http://localhost:${PORT},http://localhost:5173,http://localhost:3000`;

// Import and run the agent server
process.env.ALICE_AGENT_PORT = String(PORT);
process.env.ALICE_ORIGINS = ALLOWED_ORIGINS;

// Dynamic import of the agent server
try {
  await import(path.join(projectRoot, "agent-server.ts"));
} catch {
  // Fallback: start via tsx
  const child = exec(`npx tsx ${path.join(projectRoot, "agent-server.ts")}`, {
    cwd: projectRoot,
    env: { ...process.env, ALICE_AGENT_PORT: String(PORT), ALICE_ORIGINS: ALLOWED_ORIGINS },
  });
  child.stdout?.pipe(process.stdout);
  child.stderr?.pipe(process.stderr);
}

// Wait for server to start, then open browser
setTimeout(() => {
  const url = `http://localhost:${PORT}`;
  console.log(`  🌐 Alice is running at: ${url}\n`);

  if (flags.open) {
    const platform = os.platform();
    const cmd =
      platform === "darwin"
        ? `open "${url}"`
        : platform === "win32"
          ? `start "${url}"`
          : `xdg-open "${url}" 2>/dev/null || echo "Open ${url} in your browser"`;
    try {
      execSync(cmd, { stdio: "ignore" });
    } catch {
      console.log(`  📌 Open ${url} in your browser\n`);
    }
  }

  console.log("  Press Ctrl+C to stop\n");
}, 2000);
