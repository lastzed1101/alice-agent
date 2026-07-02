/**
 * Alice Auth — lightweight wrapper around Supabase Auth.
 *
 * Provides:
 *  - useAuth() hook (reactive session + user)
 *  - signIn(email, password)
 *  - signUp(email, password)
 *  - signOut()
 *  - userId — stable string used as Supabase row key
 */
import { useState, useEffect, useCallback } from "react";
import type { Session, User } from "@supabase/supabase-js";

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  configured: boolean;
}

const _state: AuthState = { session: null, user: null, loading: true, configured: true };
let _listeners: Array<() => void> = [];
const notify = () => _listeners.forEach((fn) => fn());

// Lazy supabase import — only loaded when Supabase is configured
let _supabaseReady = false;
async function getSupabase() {
  if (!_supabaseReady) {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      // Test that it's actually configured by checking env vars
      const url = import.meta.env.VITE_SUPABASE_URL;
      if (!url) {
        _state.configured = false;
        _state.loading = false;
        _supabaseReady = true;
        notify();
        return null;
      }
      _supabaseReady = true;
      return supabase;
    } catch {
      _state.configured = false;
      _state.loading = false;
      _supabaseReady = true;
      notify();
      return null;
    }
  }
  // Already initialized — return the client
  const { supabase } = await import("@/integrations/supabase/client");
  return supabase;
}

// Start listening once
let _started = false;
function ensureListener() {
  if (_started) return;
  _started = true;
  (async () => {
    const sb = await getSupabase();
    if (!sb) return; // Supabase not configured
    try {
      const { data: { session } } = await sb.auth.getSession();
      _state.session = session;
      _state.user = session?.user ?? null;
      _state.loading = false;
      notify();
    } catch (e) {
      console.warn("[auth] Failed to get session:", (e as Error).message);
      _state.loading = false;
      notify();
    }
    sb.auth.onAuthStateChange((_event, session) => {
      _state.session = session;
      _state.user = session?.user ?? null;
      _state.loading = false;
      notify();
    });
  })();
}

/**
 * React hook that re-renders on auth state changes.
 */
export function useAuth(): AuthState & {
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string; confirmationNeeded?: boolean }>;
  signOut: () => Promise<void>;
  userId: string;
} {
  ensureListener();
  // Force re-render on state change
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((n) => n + 1);
    _listeners.push(fn);
    return () => {
      _listeners = _listeners.filter((f) => f !== fn);
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const sb = await getSupabase();
    if (!sb) return { error: "Supabase not configured" };
    const { error } = await sb.auth.signInWithPassword({ email, password });
    return { error: error?.message };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const sb = await getSupabase();
    if (!sb) return { error: "Supabase not configured" };
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) return { error: error.message };
    const confirmationNeeded = !data.session;
    return { confirmationNeeded };
  }, []);

  const signOut = useCallback(async () => {
    const sb = await getSupabase();
    if (!sb) return;
    await sb.auth.signOut();
  }, []);

  const userId = _state.user?.id ?? "anonymous";

  return { ..._state, signIn, signUp, signOut, userId };
}

/**
 * Get the current user ID without React (for cloudSync etc.)
 */
export function getCurrentUserId(): string {
  return _state.user?.id ?? "anonymous";
}

/**
 * Check if user is authenticated.
 */
export function isAuthenticated(): boolean {
  return !!_state.user;
}

/**
 * Check if Supabase is configured.
 */
export function isSupabaseConfigured(): boolean {
  return _state.configured;
}
