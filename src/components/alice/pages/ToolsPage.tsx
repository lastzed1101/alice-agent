import { useState } from "react";
import { Search, Wrench, Terminal, FileText, Globe, Brain, Code, Image, Volume2, Cpu, Database, MessageSquare, Settings, Power, PowerOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { TOOLS } from "@/lib/alice/tools";

interface ToolInfo {
  name: string;
  emoji: string;
  description: string;
  category: string;
  enabled: boolean;
  usageCount: number;
}

const CATEGORIES = [
  { id: "all", label: "All Tools", icon: Wrench },
  { id: "fs", label: "File Operations", icon: FileText },
  { id: "shell", label: "Development", icon: Terminal },
  { id: "web", label: "Web", icon: Globe },
  { id: "memory", label: "Memory", icon: Brain },
  { id: "skills", label: "Skills", icon: Code },
  { id: "tasks", label: "Scheduled Tasks", icon: Settings },
  { id: "system", label: "System", icon: Cpu },
];

// Mock usage counts for display
const usageCounts: Record<string, number> = {};
for (const t of TOOLS) {
  usageCounts[t.name] = Math.floor(Math.random() * 50);
}

export function ToolsPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [toolStates, setToolStates] = useState<Record<string, boolean>>(
    Object.fromEntries(TOOLS.map((t) => [t.name, true])),
  );

  const tools: ToolInfo[] = TOOLS.map((t) => ({
    name: t.name,
    emoji: t.emoji,
    description: t.description,
    category: t.category,
    enabled: toolStates[t.name] ?? true,
    usageCount: usageCounts[t.name] ?? 0,
  }));

  const filtered = tools.filter((t) => {
    const matchesCategory = activeCategory === "all" || t.category === activeCategory;
    const matchesSearch =
      !search.trim() ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleTool = (name: string) => {
    setToolStates((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const enableAll = () => {
    setToolStates(Object.fromEntries(TOOLS.map((t) => [t.name, true])));
  };

  const disableAll = () => {
    setToolStates(Object.fromEntries(TOOLS.map((t) => [t.name, false])));
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Tools</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {TOOLS.length} tools available · {Object.values(toolStates).filter(Boolean).length} enabled
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={enableAll}
            className="px-3 py-1.5 text-xs rounded-lg bg-[var(--bg-panel)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            Enable All
          </button>
          <button
            onClick={disableAll}
            className="px-3 py-1.5 text-xs rounded-lg bg-[var(--bg-panel)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            Disable All
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-lg px-3 py-2 mb-4">
        <Search className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
        <input
          type="text"
          placeholder="Search tools…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent outline-none text-sm text-[var(--text-secondary)] w-full"
        />
      </div>

      {/* Category tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const count = cat.id === "all" ? TOOLS.length : TOOLS.filter((t) => t.category === cat.id).length;
          return (
            <button
              key={cat.id}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border",
                activeCategory === cat.id
                  ? "bg-[var(--accent-purple)]/10 border-[var(--accent-purple)] text-[var(--accent-purple)]"
                  : "bg-[var(--bg-panel)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
              )}
              onClick={() => setActiveCategory(cat.id)}
            >
              <Icon className="h-3.5 w-3.5" />
              {cat.label}
              <span className="text-[10px] opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((tool) => (
          <div
            key={tool.name}
            className={cn(
              "manager-card group",
              !tool.enabled && "opacity-60",
            )}
          >
            <div className="manager-card-header">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg">{tool.emoji}</span>
                <h3 className="manager-card-title text-[var(--text-primary)] truncate text-sm">
                  {tool.name}
                </h3>
              </div>
              <button
                onClick={() => toggleTool(tool.name)}
                className={cn("toggle-switch shrink-0", tool.enabled && "active")}
                title={tool.enabled ? "Disable tool" : "Enable tool"}
              />
            </div>
            <p className="manager-card-desc line-clamp-2">{tool.description}</p>
            <div className="manager-card-meta">
              <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-panel-alt)] px-1.5 py-0.5 rounded">
                {tool.category}
              </span>
              <span className="text-[10px] text-[var(--text-muted)]">
                {tool.usageCount} uses
              </span>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Wrench className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-3 opacity-50" />
          <p className="text-[var(--text-muted)] text-sm">No tools match your search</p>
        </div>
      )}
    </div>
  );
}
