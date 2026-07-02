# 🐇 Alice AI Agent

Alice adalah AI companion pribadi yang belajar dari pengguna, mengingat percakapan, membuat skills, dan menggunakan tools untuk menyelesaikan tugas. Dibangun dengan React, TanStack Start, dan backend server Node.js.

## ✨ Fitur

- **Multi-Provider AI** — OpenAI, OpenRouter, Anthropic, Google Gemini, Groq, DeepSeek, Together AI, Cohere
- **Login & Auth** — Login via email/password, data sync per-user ke Supabase
- **Real Filesystem Access** — Baca, tulis, eksekusi shell langsung di server
- **Code Execution** — Jalankan Python, JavaScript, dan shell script
- **Persistent Memory** — Simpan fakta, preferensi, dan profil pengguna
- **Reusable Skills** — Ciptakan dan gunakan kembali workflow kompleks
- **Scheduled Tasks** — Jadwalkan tugas berulang (cron-like)
- **Cloud Sync** — Sinkronisasi data antar device via Supabase (per-user, RLS protected)
- **Web Search** — Integrasi SearXNG atau DuckDuckGo
- **56+ Tools** — Shell, filesystem, web, memory, skills, code execution
- **Responsive UI** — Mobile-friendly dengan panel yang bisa disembunyikan
- **PWA Support** — Installable di mobile dan desktop
- **Theme System** — 14 built-in themes

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- npm

### Install & Run

```bash
git clone https://github.com/Z-E-D1101/alice-agent.git
cd alice-agent
./setup.sh
```

Setelah setup selesai, jalankan dari mana saja:

```bash
alice
```

### Manual Install

```bash
npm install
npm link
alice
```

### CLI Options

```bash
alice                 # Frontend only (port 8082)
alice --agent         # Frontend + agent server (port 8082 + 3020)
alice -p 5173         # Custom port
alice --no-open       # Tanpa buka browser
alice --help          # Lihat bantuan
```

## 🔑 Login & Auth

Alice mendukung login via email/password menggunakan Supabase Auth.

- **Dengan login**: Data tersync per-user ke Supabase, bisa diakses dari device lain dengan akun yang sama
- **Tanpa login (Skip)**: Data hanya tersimpan di localStorage dan disk lokal
- **Signup**: Buat akun baru langsung dari halaman login

## 🏗️ Arsitektur

### Mode 1: Frontend Only (Default)

```bash
alice
```

| Service | URL | Fungsi |
|---------|-----|--------|
| **Frontend (UI)** | http://localhost:8082 | Chat UI, Settings, Threads |

Tool calls (shell, filesystem, code execution) dijalankan via **TanStack Start SSR** (server functions).

### Mode 2: Dual Port (dengan --agent)

```bash
alice --agent
```

| Service | URL | Fungsi |
|---------|-----|--------|
| **Frontend (UI)** | http://localhost:8082 | Chat UI, Settings, Threads |
| **Agent Server (API)** | http://localhost:3020 | Backend API (shell, filesystem, code exec) |

Diperlukan untuk akses multi-device, process isolation, atau production deployment.

## 🔑 Provider & API Keys

API keys dikonfigurasi melalui **Settings UI** dan disimpan di localStorage. Tidak perlu `.env` untuk API keys.

**Default provider: OpenRouter** — registrasi gratis di [openrouter.ai](https://openrouter.ai)

Cara setup:
1. Buka Alice → Settings → Providers
2. Pilih provider → masukkan API key
3. Klik **Discover Models** → pilih model

| Provider | Model Contoh |
|----------|-------------|
| **OpenRouter** | `openai/gpt-4o-mini`, `anthropic/claude-3.5-sonnet` |
| **OpenAI** | `gpt-4o-mini`, `gpt-4o`, `gpt-4.1-mini` |
| **Anthropic** | `claude-sonnet-4-20250514`, `claude-3-5-sonnet-latest` |
| **Google Gemini** | `gemini-2.0-flash`, `gemini-2.5-pro` |
| **Groq** | `llama-3.3-70b-versatile` |
| **DeepSeek** | `deepseek-chat` |
| **Together AI** | `meta-llama/Llama-3-70b-chat-hf` |
| **Cohere** | `command-r-plus` |

## ☁️ Cloud Sync (Supabase)

Cloud sync mengirim semua data (providers, settings, memory, threads, skills, tasks, knowledge) ke Supabase per-user.

### Setup

1. Buat project di [Supabase](https://supabase.com)
2. Jalankan SQL migration di Supabase SQL Editor (lihat `supabase/migrations/`)
3. Tambahkan env vars di `.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY=$SUPABASE_PUBLISHABLE_KEY
```

4. Buka Alice → Settings → Data → Aktifkan **Cloud Sync**
5. Login atau signup untuk mulai sync

### Data yang Disync

Providers, Settings, Threads, Memory, Skills, Tasks, Profile, Knowledge — semua otomatis sync setiap ada perubahan.

## 🛠️ Tools (56+)

### Shell & Process
`run_shell`, `execute_python`, `execute_js`, `list_processes`, `get_cwd`, `get_env`, `which`

### Filesystem
`read_file`, `write_file`, `append_file`, `delete_file`, `list_dir`, `file_exists`, `move_file`, `copy_file`, `make_directory`, `search_files`, `glob`, `disk_usage`

### Web & HTTP
`web_search`, `web_search_news`, `fetch_url`, `fetch_json`, `extract_text`, `http_request`

### Memory & Profile
`remember`, `recall`, `list_memories`, `forget`, `update_profile`, `get_profile`

### Skills & Tasks
`save_skill`, `list_skills`, `run_skill`, `delete_skill`, `create_task`, `list_tasks`, `cancel_task`

### Utilities
`calculate`, `get_time`, `generate_uuid`

## 📁 Project Structure

```
alice-agent/
├── alice-cli.js              # CLI entry point (jalankan: alice)
├── setup.sh                  # One-command setup script
├── agent-server.ts           # Agent HTTP server (opsional)
├── src/
│   ├── lib/alice/
│   │   ├── agent.ts          # Core agent loop
│   │   ├── storage.ts        # localStorage + disk persistence
│   │   ├── cloudSync.ts      # Per-user Supabase cloud sync
│   │   ├── auth.ts           # Supabase Auth wrapper
│   │   ├── tools.ts          # 56+ tool definitions
│   │   └── ...
│   ├── routes/index.tsx      # Main chat page + auth gate
│   ├── components/alice/     # UI components
│   │   ├── AuthPage.tsx      # Login/signup page
│   │   ├── Sidebar.tsx       # Navigation + thread list
│   │   └── ...
│   └── integrations/supabase/
├── supabase/migrations/      # Database migrations (per-user RLS)
├── public/                   # PWA assets
└── tests/                    # Unit tests
```

## 🔒 Security

- **API keys** — Disimpan di localStorage, tidak di `.env` atau source code
- **Per-user data isolation** — Supabase RLS policies memastikan user hanya bisa akses data sendiri
- **Path traversal protection** — File operations hanya diizinkan dalam direktori yang aman
- **Service Worker** — Tidak cache HTML, hanya static assets (JS/CSS/images)

⚠️ Agent server berjalan dengan permission sistem. Hanya gunakan di development environment.

## 🧰 Development

```bash
# CLI
alice                       # Frontend only
alice --agent               # Frontend + agent server

# npm scripts
npm run dev          # Frontend only
npm run dev:agent    # Agent backend only
npm run dev:all      # Frontend + Agent server
npm run build        # Build production
npm run lint         # ESLint
npm run test         # Vitest
```

### Environment Variables

```env
# Cloud Sync (opsional)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY=$SUPABASE_PUBLISHABLE_KEY

# Agent Server (opsional, dengan --agent)
ALICE_AGENT_PORT=3020
ALICE_ORIGINS=http://localhost:8082,http://localhost:3020
```

## 🗑️ Uninstall

```bash
npm unlink -g alice          # Hapus command global
rm -rf ~/.alice              # Hapus data persisten
```

## 📝 License

MIT

---

**Alice** — Your personal, self-improving AI companion 🐇
