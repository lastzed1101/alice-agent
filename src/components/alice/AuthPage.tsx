import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/alice/auth";
import { Bot, Mail, Lock, ArrowRight, Loader2, UserPlus } from "lucide-react";

export function AuthPage() {
  const { signIn, signUp, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  if (authLoading) {
    return (
      <div className="grid h-dvh place-items-center bg-[var(--bg-dark)]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 text-[var(--accent-purple)] animate-spin" />
          <span className="text-sm text-[var(--text-muted)]">Loading…</span>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error: signInError } = await signIn(email, password);
        if (signInError) setError(signInError);
      } else {
        const { error: signUpError, confirmationNeeded } = await signUp(email, password);
        if (signUpError) {
          setError(signUpError);
        } else if (confirmationNeeded) {
          setSuccess("Check your email for a confirmation link!");
        }
        // If no confirmation needed, user is auto-signed-in
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === "signin" ? "signup" : "signin");
    setError("");
    setSuccess("");
  };

  return (
    <div className="grid h-dvh place-items-center bg-[var(--bg-dark)] px-4">
      <div className="w-full max-w-sm">
        {/* Logo & Title */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center mb-4 shadow-lg"
            style={{ animation: "alice-glow-pulse 3s ease-in-out infinite" }}
          >
            <Bot className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Welcome to Alice</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {mode === "signin" ? "Sign in to sync your data across devices" : "Create an account to get started"}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl p-6 shadow-xl">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Email */}
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)] mb-1.5 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent-purple)] focus:ring-1 focus:ring-[var(--accent-purple)] transition-colors"
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)] mb-1.5 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent-purple)] focus:ring-1 focus:ring-[var(--accent-purple)] transition-colors"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="text-xs text-green-400 bg-green-400/10 border border-green-400/20 rounded-lg px-3 py-2">
                {success}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-[var(--accent-purple)] hover:bg-[var(--accent-purple-dark)] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-colors"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : mode === "signin" ? (
                <>
                  Sign In <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  Create Account <UserPlus className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle mode */}
          <div className="mt-4 text-center">
            <button
              onClick={toggleMode}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--accent-purple)] transition-colors"
            >
              {mode === "signin" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>

        {/* Skip */}
        <div className="mt-4 text-center">
          <button
            onClick={() => {
              // Skip auth — use local-only mode
              // We'll dispatch a custom event that the app listens for
              window.dispatchEvent(new CustomEvent("alice-skip-auth"));
            }}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          >
            Skip for now →
          </button>
        </div>
      </div>
    </div>
  );
}
