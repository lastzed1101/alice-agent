# 🐇 Alice AI Agent

Alice adalah AI companion pribadi yang belajar dari pengguna, mengingat percakapan, membuat skills, dan menggunakan tools untuk menyelesaikan tugas. Dibangun dengan React, TanStack Start, dan backend server Node.js.

## ✨ Fitur

- **Multi-Provider AI** - Mendukung OpenAI, OpenRouter, Anthropic, dan provider custom lainnya
- **Real Filesystem Access** - Baca, tulis, eksekusi shell langsung di server
- **Code Execution** - Jalankan Python, JavaScript, dan shell script
- **Persistent Memory** - Simpan fakta, preferensi, dan profil pengguna
- **Reusable Skills** - Ciptakan dan gunakan kembali workflow kompleks
- **Scheduled Tasks** - Jadwalkan tugas berulang (cron-like)
- **Cloud Sync** - Sinkronisasi otomatis via Supabase (opsional)
- **Web Search** - Integrasi SearXNG atau DuckDuckGo
- **Responsive UI** - Mobile-friendly dengan panel yang bisa disembunyikan

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- npm atau Bun
- Python3 (untuk eksekusi kode Python)
- Docker (opsional, untuk SearXNG web search)

### Instalasi (Global)

Install Alice secara global agar bisa dijalankan dari mana saja:

```bash
# Clone dan install globally
git clone https://github.com/Z-E-D1101/alice-agent.git
cd alice-agent
npm install
npm link                    # Membuat command 'alice' tersedia global

# Setup environment
cp .env.example .env
# Edit .env — tambahkan minimal 1 API key provider

# Jalankan Alice dari mana saja
alice
```

### Instalasi (Development)

```bash
git clone https://github.com/Z-E-D1101/alice-agent.git
cd alice-agent
npm install
cp .env.example .env       # Edit .env sesuai kebutuhan
npm run dev:all              # Frontend + Agent server (parallel)
```

### Perintah CLI

```bash
alice                        # Jalankan Alice (buka browser otomatis)
alice -p 4000                # Jalankan di port custom
alice --no-open              # Tanpa buka browser
alice --help                 # Lihat bantuan
```

### Config Directory

Semua konfigurasi tersimpan di `~/.alice/`:

```
~/.alice/
├── config.json              # Konfigurasi agent server
└── data/                    # Data persisten (threads, memory, skills, dll)
```

Browser-side data (providers, settings) tersimpan di **localStorage** browser dan otomatis persist reload.

Aplikasi akan berjalan di:
- **Frontend**: http://localhost:5173
- **Agent Server**: http://localhost:3020

### Konfigurasi (.env)

```env
# === Provider AI (pilih salah satu) ===
OPENAI_API_KEY=sk-...
OPENROUTER_API_KEY=sk-or-...
ANTHROPIC_API_KEY=sk-ant-...

# === Agent Server ===
ALICE_AGENT_PORT=3020
ALICE_ORIGINS=http://localhost:5173,http://localhost:3000

# === Cloud Sync (opsional) ===
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=eyJ...
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY=$SUPABASE_PUBLISHABLE_KEY
```

### Production Build

```bash
# Build frontend
npm run build

# Jalankan agent server
npm run agent
# atau
node --import tsx agent-server.ts
```

Agent server berjalan di `http://localhost:3020` dengan health check di `/api/health`.

## 🛠️ Tools yang Tersedia

Alice memiliki 50+ tools yang dikelompokkan menjadi kategori:

### Shell & Process

- `run_shell` / `terminal` - Jalankan command shell
- `execute_python` - Eksekusi kode Python
- `execute_js` - Eksekusi JavaScript (Node.js)
- `list_processes` - Lihat proses yang berjalan
- `get_cwd` - Current working directory
- `get_env` - Baca environment variable
- `which` - Cari executable di PATH

### Filesystem

- `read_file`, `write_file`, `append_file`, `delete_file`
- `list_dir`, `file_exists`, `file_stat`
- `move_file`, `copy_file`, `make_directory`
- `search_files`, `glob`, `disk_usage`
- `head`, `tail`, `tree`, `wc`

### Web & HTTP

- `web_search` - SearXNG atau DuckDuckGo
- `web_search_news` - Search berita
- `fetch_url`, `fetch_json` - ambil konten web
- `extract_text` - Strip HTML tags
- `http_request` - HTTP request dari server

### Memory & Profile

- `remember`, `recall`, `list_memories`, `forget`
- `update_profile`, `get_profile`
- `summarize`

### Skills & Tasks

- `save_skill`, `list_skills`, `run_skill`, `delete_skill`, `export_skill`, `import_skill`
- `create_task`, `list_tasks`, `cancel_task`, `run_task_now`

### Utilities

- `calculate` - Evaluasi ekspresi matematika
- `get_time` - Waktu saat ini
- `generate_uuid`

## 🏗️ Project Structure

```
src/
├── lib/
│   └── alice/
│       ├── agent.ts       # Core agent loop (runAgent)
│       ├── agent-backend.ts # Backend API client
│       ├── tools.ts       # 50+ tool definitions
│       ├── types.ts       # TypeScript interfaces
│       ├── storage.ts     # localStorage persistence
│       ├── cloudSync.ts   # Supabase sync
│       ├── scheduler.ts   # Task scheduler
│       └── vfs.ts         # Virtual filesystem fallback
├── routes/
│   ├── __root.tsx         # App shell
│   └── index.tsx          # Main chat page
├── components/
│   └── alice/             # UI components
├── integrations/
│   └── supabase/          # Supabase client
```

## 🔧 Backend API (agent-server.ts)

Agent server menyediakan endpoints untuk tools:

- `POST /api/shell/run` - Execute shell command
- `POST /api/shell/exec` - Alias untuk run
- `POST /api/shell/spawn` - Spawn long-running process
- `GET /api/shell/processes` - List processes
- `POST /api/fs/read`, `/write`, `/append`, `/delete`, `/list`, `/exists`, `/stat`, `/move`, `/copy`, `/mkdir`, `/grep`, `/glob`, `/disk-usage`
- `POST /api/code/python`, `/node`, `/bash`
- `GET /api/system/info`, `/network`
- `POST /api/system/dns`, `/env`, `/cwd`
- `POST /api/http/fetch` - HTTP proxy (bypass CORS)
- `GET /api/health` - Health check

Semua endpoint butuh authentication via header (bisa dikonfigurasi).

## 🔒 Security Notes

⚠️ **Agent server berjalan dengan权限 sistem** - bisa baca/tulis/menghapus file apa pun, jalankan shell, dll.  
⚠️ Hanya gunakan di environment development atau dengan firewall yang ketat.  
⚠️ Pastikan `ALICE_ORIGINS` hanya mengizinkan origin yang dipercaya.

## ☁️ Cloud Sync (Supabase)

1. Buat project Supabase
2. Jalankan migration:

```bash
supabase db push
```

3. Atau manual:

```sql
CREATE TABLE public.app_state (
  id text PRIMARY KEY DEFAULT 'default',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- + RLS policies
```

Data yang disimpan: threads, memory, skills, tasks, profile, providers, settings, active thread.

## 📦 API Providers

### OpenAI

```json
{
  "id": "openai",
  "name": "OpenAI",
  "baseUrl": "https://api.openai.com/v1",
  "apiKey": "sk-...",
  "models": ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini"]
}
```

### OpenRouter

```json
{
  "id": "openrouter",
  "name": "OpenRouter",
  "baseUrl": "https://openrouter.ai/api/v1",
  "apiKey": "sk-or-...",
  "models": ["openai/gpt-4o-mini", "anthropic/claude-3.5-sonnet", "google/gemini-2.0-flash-001"]
}
```

### Anthropic (direct)

```json
{
  "id": "anthropic",
  "name": "Anthropic",
  "baseUrl": "https://api.anthropic.com/v1",
  "apiKey": "sk-ant-...",
  "models": ["claude-3-5-sonnet-latest"]
}
```

### Custom Provider

Tambahkan config custom melalui UI Settings.

## 🔍 Web Search

Alice menggunakan SearXNG sebagai search engine utama. Start dengan Docker:

```bash
docker run -d -p 8080:8080 searxng/searxng
```

Jika SearXNG tidak tersedia, fallback ke DuckDuckGo (lebih terbatas).

Atau set `searxngUrl` kosong di Settings untuk nonaktifkan.

## 📖 System Prompt Default

Alice adalah AI yang:

- Selalu gunakan tools ketika membantu
- Simpan fakta dengan `remember()`
- Ciptakan `save_skill()` setelah tugas kompleks
- Tanya pengguna jika kurang jelas
- Ramah, singkat, dan ingin tahu

Customizable di Settings.

## 🧰 Development

### Scripts

```bash
npm run dev          # Frontend dev server (http://localhost:5173)
npm run dev:agent    # Agent backend server (http://localhost:3020)
npm run dev:all      # Frontend + Agent server (parallel)
npm run build        # Build production
npm run lint         # ESLint
npm run format       # Prettier
```

### Architecture

```
Frontend (React + TanStack Start)
        ↕
  localStorage + Cloud Sync (Supabase)
        ↕
  Agent Server (Node.js HTTP API)
        ↕
  AI Providers (OpenAI / OpenRouter / Anthropic)
```

Agent loop:
1. Build context (profile, memory, skills)
2. Call LLM dengan tools
3. Stream response & tool calls
4. Execute tools sequential
5. Loop hingga finish atau max steps

## 📁 File Structure

```
public/images/           # Static assets (avatar, etc.)
src/
├── lib/alice/           # Core logic
│   ├── agent.ts         # Agent loop (runAgent)
│   ├── agent-backend.ts # Backend API client
│   ├── tools.ts         # 56+ tool definitions
│   ├── types.ts         # TypeScript interfaces
│   ├── storage.ts       # localStorage persistence
│   ├── cloudSync.ts     # Supabase sync
│   ├── scheduler.ts     # Task scheduler
│   └── vfs.ts           # Virtual filesystem
├── routes/              # TanStack routes
├── components/alice/    # UI components
└── integrations/supabase/
agent-server.ts          # Backend HTTP server
```

## 📝 License

MIT

## 🐛 Issues & Contributing

Report issues di GitHub. Contributions welcome!

---

**Alice** — Your personal, self-improving AI companion 🐇
