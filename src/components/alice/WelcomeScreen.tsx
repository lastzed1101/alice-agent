import { Brain, Globe, Code, FileText, Zap, Sparkles, Database, Terminal } from "lucide-react";

interface WelcomeScreenProps {
  onAction: (prompt: string) => void;
  disabled?: boolean;
}

const SHORTCUTS = [
  { icon: Brain, label: "Remember Something", prompt: "Remember that " },
  { icon: Globe, label: "Search Web", prompt: "Search the web for " },
  { icon: Code, label: "Write Code", prompt: "Write a Python script that " },
  { icon: FileText, label: "Summarize", prompt: "Summarize this text: " },
  { icon: Terminal, label: "Run Command", prompt: "Run the shell command: " },
  { icon: Sparkles, label: "Create Skill", prompt: "Create a reusable skill for " },
  { icon: Database, label: "Search Files", prompt: "Search files matching " },
  { icon: Zap, label: "Schedule Task", prompt: "Schedule a recurring task to " },
];

export function WelcomeScreen({ onAction, disabled }: WelcomeScreenProps) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center px-4 py-8 sm:py-12 min-h-[40vh] md:min-h-[50vh]"
    >
      <div className="w-20 h-20 rounded-full overflow-hidden shadow-xl shadow-purple-500/30 mb-6 ring-2 ring-purple-500/40 bg-[var(--accent-purple)]">
        <img src="/images/alice-avatar.png" alt="Alice" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
      </div>
      <h1 className="text-3xl font-bold mb-2 text-[var(--text-primary)]">Hi, I'm Alice.</h1>
      <p className="text-[var(--text-muted)] max-w-md mb-8 text-sm">
        Your personal AI assistant with real tools — shell access, file system, web search, memory,
        skills, and more.
      </p>

      {/* Shortcut cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-2xl w-full">
        {SHORTCUTS.map((item) => (
          <button
            key={item.label}
            onClick={() => !disabled && onAction(item.prompt)}
            disabled={disabled}
            className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-panel)] hover:bg-[var(--accent-glow)] hover:border-[var(--accent-purple)]/50 transition-all group text-left disabled:opacity-50"
          >
            <div className="h-8 w-8 rounded-lg bg-[var(--accent-purple)]/20 flex items-center justify-center text-[var(--accent-purple)] shrink-0">
              <item.icon className="h-4 w-4" />
            </div>
            <span className="font-medium text-xs text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
              {item.label}
            </span>
          </button>
        ))}
      </div>

      {disabled && (
        <p className="mt-6 text-xs text-[var(--red-danger)]">
          Pick a provider &amp; model in Settings to get started.
        </p>
      )}
    </div>
  );
}
