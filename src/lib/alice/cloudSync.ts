import { getCurrentUserId } from "./auth";
import {
  loadMemory,
  loadProfile,
  loadProviders,
  loadSettings,
  loadSkills,
  loadTasks,
  loadThreads,
  loadActiveThreadId,
  loadVFS,
  loadKnowledge,
  saveMemory,
  saveProfile,
  saveProviders,
  saveSettings,
  saveSkills,
  saveTasks,
  saveThreads,
  saveActiveThreadId,
  saveVFS,
  saveKnowledge,
} from "./storage";

/** Lazy supabase import to avoid crash when env vars are missing */
let _supabasePromise: Promise<typeof import("@/integrations/supabase/client").supabase> | null = null;
function getSupabase() {
  if (!_supabasePromise) _supabasePromise = import("@/integrations/supabase/client").then((m) => m.supabase);
  return _supabasePromise;
}

/** Per-user row ID in app_state table. Falls back to 'anonymous' when not signed in. */
function getRowId(): string {
  return getCurrentUserId();
}

/** Check if cloud sync is enabled in settings */
function isCloudSyncEnabled(): boolean {
  try {
    return loadSettings().cloudSync === true;
  } catch {
    return false;
  }
}

interface CloudBlob {
  memory?: ReturnType<typeof loadMemory>;
  profile?: ReturnType<typeof loadProfile>;
  providers?: ReturnType<typeof loadProviders>;
  settings?: ReturnType<typeof loadSettings>;
  skills?: ReturnType<typeof loadSkills>;
  tasks?: ReturnType<typeof loadTasks>;
  threads?: ReturnType<typeof loadThreads>;
  activeThreadId?: string | null;
  vfs?: ReturnType<typeof loadVFS>;
  knowledge?: ReturnType<typeof loadKnowledge>;
}

function snapshot(): CloudBlob {
  return {
    memory: loadMemory(),
    profile: loadProfile(),
    providers: loadProviders(),
    settings: loadSettings(),
    skills: loadSkills(),
    tasks: loadTasks(),
    threads: loadThreads(),
    activeThreadId: loadActiveThreadId(),
    vfs: loadVFS(),
    knowledge: loadKnowledge(),
  };
}

function applyBlob(b: CloudBlob) {
  // Preserve local cloudSync toggle — don't let cloud disable sync on this device
  const localCloudSync = loadSettings().cloudSync;
  if (b.memory) saveMemory(b.memory);
  if (b.profile) saveProfile(b.profile);
  if (b.providers) saveProviders(b.providers);
  if (b.settings) {
    saveSettings({ ...b.settings, cloudSync: localCloudSync });
  }
  if (b.skills) saveSkills(b.skills);
  if (b.tasks) saveTasks(b.tasks);
  if (b.threads) saveThreads(b.threads);
  if (b.activeThreadId !== undefined) saveActiveThreadId(b.activeThreadId);
  if (b.vfs) saveVFS(b.vfs);
  if (b.knowledge) saveKnowledge(b.knowledge);
}

/**
 * Pulls cloud state into localStorage. If cloud is empty, seeds it with whatever's local.
 * Silently returns if cloud sync is disabled or Supabase is not configured.
 */
export async function pullFromCloud(): Promise<{ source: "cloud" | "local-seed" | "disabled" }> {
  if (!isCloudSyncEnabled()) return { source: "disabled" };
  try {
    const sb = await getSupabase();
    const { data, error } = await sb
      .from("app_state")
      .select("data")
      .eq("id", getRowId())
      .maybeSingle();
    if (error) {
      console.warn("[cloudSync] pull failed:", error.message);
      return { source: "disabled" };
    }

    const cloud = (data?.data ?? {}) as CloudBlob;
    const hasCloud =
      Object.keys(cloud).length > 0 &&
      ((cloud.threads?.length ?? 0) > 0 ||
        (cloud.memory?.length ?? 0) > 0 ||
        (cloud.skills?.length ?? 0) > 0 ||
        (cloud.tasks?.length ?? 0) > 0 ||
        !!cloud.profile?.name ||
        !!cloud.settings);

    if (hasCloud) {
      applyBlob(cloud);
      return { source: "cloud" };
    }
    // Seed cloud with current local state
    await pushToCloud();
    return { source: "local-seed" };
  } catch (e) {
    // Supabase not configured or network error — silently skip
    console.warn("[cloudSync] pull skipped:", (e as Error).message);
    return { source: "disabled" };
  }
}

let pendingTimer: ReturnType<typeof setTimeout> | null = null;
let lastPushAt = 0;

export function schedulePush(debounceMs = 800) {
  if (!isCloudSyncEnabled()) return;
  if (pendingTimer) clearTimeout(pendingTimer);
  pendingTimer = setTimeout(() => {
    pendingTimer = null;
    void pushToCloud();
  }, debounceMs);
}

export async function pushToCloud() {
  if (!isCloudSyncEnabled()) return;
  try {
    const blob = snapshot();
    lastPushAt = Date.now();
    const sb = await getSupabase();
    const userId = getCurrentUserId();
    const { error } = await sb
      .from("app_state")
      .upsert(
        {
          id: userId,
          user_id: userId,
          data: blob as never,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );
    if (error) console.warn("[cloudSync] push failed:", error.message);
  } catch (e) {
    console.warn("[cloudSync] push skipped:", (e as Error).message);
  }
}

export function lastPush() {
  return lastPushAt;
}
