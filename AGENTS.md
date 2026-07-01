# Alice AI Agent

Local AI agent with real shell/filesystem access, 56+ tools, persistent memory, learned skills, scheduler, and cloud sync.

## Capabilities

- **Multi-provider AI**: OpenAI, OpenRouter, Anthropic, custom endpoints
- **Shell & filesystem**: Execute commands, read/write files, directory operations
- **Code execution**: Python, JavaScript (Node.js), Bash scripts
- **Web tools**: Search (SearXNG/DDG), fetch URLs, HTTP requests
- **Memory & profile**: Long-term facts, user preferences
- **Skills**: Create reusable workflows (save/run/export/import)
- **Scheduler**: Recurring tasks with flexible schedules
- **Cloud sync**: Optional Supabase backup and cross-device sync
- **Security**: Path traversal protection, CORS controls, retry logic

## Development

- Frontend: React + TanStack Start + Tailwind CSS
- Backend: Node.js agent server (HTTP API)
- Persistence: localStorage + optional Supabase

## Quick Start

```bash
npm install
cp .env.example .env   # configure provider API keys
npm run dev:all        # start frontend + agent server
```

See README.md for full documentation.
