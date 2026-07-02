import type {
  AppSettings,
  MemoryEntry,
  ProviderConfig,
  ScheduledTask,
  Skill,
  Thread,
  UserProfile,
  KnowledgeFile,
} from "./types";

const K = {
  threads: "alice.threads",
  activeThread: "alice.activeThread",
  providers: "alice.providers",
  settings: "alice.settings",
  memory: "alice.memory",
  profile: "alice.profile",
  skills: "alice.skills",
  tasks: "alice.tasks",
  vfs: "alice.vfs",
  knowledge: "alice.knowledge",
  sidebarState: "alice.sidebarState",
};

// Sidebar layout state
export interface SidebarState {
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  sidebarWidth: number;
  rightPanelWidth: number;
}
const defaultSidebarState: SidebarState = {
  leftCollapsed: false,
  rightCollapsed: false,
  sidebarWidth: 260,
  rightPanelWidth: 320,
};
export const loadSidebarState = () => read<SidebarState>(K.sidebarState, defaultSidebarState);
export const saveSidebarState = (s: SidebarState) => write(K.sidebarState, s);

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  // Also persist to ~/.alice/data/ via agent server (fire-and-forget)
  syncToDisk(key, value);
}

// Debounced disk sync to avoid flooding the server
const syncQueue = new Map<string, ReturnType<typeof setTimeout>>();

async function syncToDisk(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  // Clear previous pending sync for this key
  const prev = syncQueue.get(key);
  if (prev) clearTimeout(prev);
  // Debounce: wait 500ms after last write before syncing to disk
  syncQueue.set(
    key,
    setTimeout(async () => {
      syncQueue.delete(key);
      try {
        const { configSave } = await import("./server-backend");
        await configSave({ data: { key, value } });
      } catch {
        // SSR not available — silently ignore
      }
    }, 500),
  );
}

/**
 * Keys excluded from disk persistence (ephemeral UI state).
 */
const EXCLUDED_KEYS = new Set([K.sidebarState, K.vfs]);
const PERSISTENT_KEYS = Object.values(K).filter((k) => !EXCLUDED_KEYS.has(k));

/**
 * Load from disk first (via agent server), fall back to localStorage.
 * Called once on app startup to hydrate localStorage from disk.
 * Only loads data keys — not UI state like sidebar layout.
 */
export async function hydrateFromDisk(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const { configLoad } = await import("./server-backend");
    await Promise.allSettled(
      PERSISTENT_KEYS.map(async (key) => {
        const diskValue = await configLoad({ data: { key } });
        if (diskValue !== null && diskValue !== undefined) {
          window.localStorage.setItem(key, JSON.stringify(diskValue));
        }
      }),
    );
  } catch {
    // SSR not available — localStorage still works standalone
  }
}

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

// Threads
export const loadThreads = () => read<Thread[]>(K.threads, []);
export const saveThreads = (t: Thread[]) => write(K.threads, t);
export const loadActiveThreadId = () => read<string | null>(K.activeThread, null);
export const saveActiveThreadId = (id: string | null) => write(K.activeThread, id);

// Providers
const defaultProviders = (): ProviderConfig[] => [
  {
    id: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    apiKey: "",
    models: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini"],
    builtin: true,
  },
  {
    id: "anthropic",
    name: "Anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    apiKey: "",
    models: ["claude-sonnet-4-20250514", "claude-3-5-sonnet-latest"],
    builtin: true,
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKey: "",
    models: [
      "openai/gpt-4o",
      "anthropic/claude-3.5-sonnet",
      "google/gemini-2.0-flash-001",
    ],
    builtin: true,
  },
  {
    id: "groq",
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    apiKey: "",
    models: ["llama-3.3-70b-versatile", "mixtral-8x7b-32768"],
    builtin: true,
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    apiKey: "",
    models: ["deepseek-chat", "deepseek-coder"],
    builtin: true,
  },
  {
    id: "together",
    name: "Together AI",
    baseUrl: "https://api.together.xyz/v1",
    apiKey: "",
    models: ["meta-llama/Llama-3-70b-chat-hf"],
    builtin: true,
  },
  {
    id: "cohere",
    name: "Cohere",
    baseUrl: "https://api.cohere.com/v2",
    apiKey: "",
    models: ["command-r-plus"],
    builtin: true,
  },
  {
    id: "gemini",
    name: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    apiKey: "",
    models: ["gemini-2.0-flash", "gemini-2.5-pro"],
    builtin: true,
  },
  {
    id: "9router",
    name: "9router (Local)",
    baseUrl: "http://localhost:20128/v1",
    apiKey: "dummy",
    models: [],
    builtin: true,
  },
];

export const loadProviders = (): ProviderConfig[] => {
  const stored = read<ProviderConfig[] | null>(K.providers, null);
  if (!stored || stored.length === 0) {
    const d = defaultProviders();
    write(K.providers, d);
    return d;
  }
  const ids = new Set(stored.map((p) => p.id));
  for (const p of defaultProviders()) if (!ids.has(p.id)) stored.push(p);
  // Ensure all providers have a models array (disk data may be missing it)
  return stored.map((p) => ({ ...p, models: p.models || [] }));
};
export const saveProviders = (p: ProviderConfig[]) => write(K.providers, p);

// Settings
export const loadSettings = (): AppSettings => {
  const s = read<AppSettings | null>(K.settings, null);
  if (s) return s;
  const init: AppSettings = {
    activeProviderId: "openrouter",
    activeModel: "openai/gpt-4o-mini",
    systemPrompt: `You are Alice — a personal, self-improving AI companion who learns about the user over time.
You have access to the real filesystem, a real shell, web search via SearXNG, persistent memory, code execution (Python/Node.js), reusable skills you can create, and a scheduler.
Use tools whenever they help. Always think step-by-step. Be warm, concise, and curious.`,
    searxngUrl: "http://localhost:8080",
    temperature: 0.7,
    maxToolSteps: 25,
    autoCompress: true,
    showCostTracking: true,
    theme: "electric-blue",
  };
  write(K.settings, init);
  return init;
};
export const saveSettings = (s: AppSettings) => write(K.settings, s);

// Memory & profile
export const loadMemory = () => read<MemoryEntry[]>(K.memory, []);
export const saveMemory = (m: MemoryEntry[]) => write(K.memory, m);
export const loadProfile = (): UserProfile =>
  read<UserProfile>(K.profile, {
    name: "",
    about: "",
    preferences: "",
    updatedAt: Date.now(),
  });
export const saveProfile = (p: UserProfile) => write(K.profile, p);

// Skills
export const loadSkills = () => read<Skill[]>(K.skills, []);
export const saveSkills = (s: Skill[]) => write(K.skills, s);

// Tasks
export const loadTasks = () => read<ScheduledTask[]>(K.tasks, []);
export const saveTasks = (t: ScheduledTask[]) => write(K.tasks, t);

// Knowledge
export const loadKnowledge = () => read<KnowledgeFile[]>(K.knowledge, []);
export const saveKnowledge = (k: KnowledgeFile[]) => write(K.knowledge, k);

// VFS
export interface VFSEntry {
  path: string;
  content: string;
  updatedAt: number;
}
export const loadVFS = () => read<Record<string, VFSEntry>>(K.vfs, {});
export const saveVFS = (v: Record<string, VFSEntry>) => write(K.vfs, v);

export function exportAllData(): string {
  const blob = {
    threads: loadThreads(),
    activeThreadId: loadActiveThreadId(),
    providers: loadProviders(),
    settings: loadSettings(),
    memory: loadMemory(),
    profile: loadProfile(),
    skills: loadSkills(),
    tasks: loadTasks(),
    knowledge: loadKnowledge(),
    exportedAt: new Date().toISOString(),
    version: "1.0",
  };
  return JSON.stringify(blob, null, 2);
}

export function importAllData(jsonData: string): {
  imported: string[];
  errors: string[];
} {
  try {
    const data = JSON.parse(jsonData) as Record<string, unknown>;
    const errors: string[] = [];
    const imported: string[] = [];

    if (data.threads) {
      saveThreads(data.threads as Thread[]);
      imported.push("threads");
    }
    if (data.activeThreadId !== undefined) {
      saveActiveThreadId(data.activeThreadId as string | null);
      imported.push("activeThreadId");
    }
    if (data.providers) {
      saveProviders(data.providers as ProviderConfig[]);
      imported.push("providers");
    }
    if (data.settings) {
      saveSettings(data.settings as AppSettings);
      imported.push("settings");
    }
    if (data.memory) {
      saveMemory(data.memory as MemoryEntry[]);
      imported.push("memory");
    }
    if (data.profile) {
      saveProfile(data.profile as UserProfile);
      imported.push("profile");
    }
    if (data.skills) {
      saveSkills(data.skills as Skill[]);
      imported.push("skills");
    }
    if (data.tasks) {
      saveTasks(data.tasks as ScheduledTask[]);
      imported.push("tasks");
    }
    if (data.knowledge) {
      saveKnowledge(data.knowledge as KnowledgeFile[]);
      imported.push("knowledge");
    }

    return { imported, errors };
  } catch (e) {
    return {
      imported: [],
      errors: [`Failed to parse JSON: ${e instanceof Error ? e.message : String(e)}`],
    };
  }
}
