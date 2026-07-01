import { useState, useMemo } from "react";
import {
  Search,
  MessageSquare,
  Trash2,
  Star,
  Pin,
  Clock,
  MessageCircle,
  Download,
  Edit2,
} from "lucide-react";
import type { Thread } from "@/lib/alice/types";
import { cn } from "@/lib/utils";

interface ThreadsPageProps {
  threads: Thread[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
}

type SortMode = "newest" | "oldest" | "mostMessages";
type FilterMode = "all" | "favorites" | "pinned";

export function ThreadsPage({
  threads,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onRename,
}: ThreadsPageProps) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortMode>("newest");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const filtered = useMemo(() => {
    let result = [...threads];

    // Filter
    if (filter === "favorites") result = result.filter((t) => t.favorite);
    if (filter === "pinned") result = result.filter((t) => t.pinned);

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.messages.some((m) => m.content.toLowerCase().includes(q)),
      );
    }

    // Sort
    switch (sort) {
      case "newest":
        result.sort((a, b) => b.updatedAt - a.updatedAt);
        break;
      case "oldest":
        result.sort((a, b) => a.updatedAt - b.updatedAt);
        break;
      case "mostMessages":
        result.sort((a, b) => b.messages.length - a.messages.length);
        break;
    }

    return result;
  }, [threads, search, sort, filter]);

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Threads</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {threads.length} conversation{threads.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={onNew}
          className="px-4 py-2 bg-[var(--accent-purple)] text-white rounded-lg text-sm font-medium hover:bg-[var(--accent-purple-dark)] transition-colors"
        >
          + New Chat
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-lg px-3 py-2 flex-1 min-w-[200px]">
          <Search className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
          <input
            type="text"
            placeholder="Search conversations…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent outline-none text-sm text-[var(--text-secondary)] w-full"
          />
        </div>

        <div className="tabs">
          {(["all", "favorites", "pinned"] as FilterMode[]).map((f) => (
            <button
              key={f}
              className={cn("tab", filter === f && "active")}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortMode)}
          className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] outline-none"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="mostMessages">Most messages</option>
        </select>
      </div>

      {/* Thread Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <MessageSquare className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-3 opacity-50" />
          <p className="text-[var(--text-muted)] text-sm">
            {search ? "No conversations match your search" : "No conversations yet"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((t) => (
            <div
              key={t.id}
              className={cn(
                "manager-card cursor-pointer group",
                activeId === t.id && "border-[var(--accent-purple)]",
              )}
              onClick={() => onSelect(t.id)}
            >
              <div className="manager-card-header">
                {editingId === t.id ? (
                  <input
                    autoFocus
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onBlur={() => {
                      if (editingTitle.trim()) onRename(t.id, editingTitle.trim());
                      setEditingId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        if (editingTitle.trim()) onRename(t.id, editingTitle.trim());
                        setEditingId(null);
                      }
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="bg-transparent outline-none text-sm text-[var(--text-primary)] border-b border-[var(--accent-purple)] flex-1 min-w-0"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <h3 className="manager-card-title text-[var(--text-primary)] truncate">{t.title}</h3>
                )}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  {t.pinned && <Pin className="h-3 w-3 text-[var(--blue-info)] fill-[var(--blue-info)]" />}
                  {t.favorite && <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(t.id);
                      setEditingTitle(t.title);
                    }}
                    className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)]"
                  >
                    <Edit2 className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(t.id);
                    }}
                    className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--red-danger)]"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Preview */}
              {t.messages.length > 0 && (
                <p className="manager-card-desc line-clamp-2">
                  {t.messages
                    .slice(-1)
                    .map((m) => m.content)
                    .join("")
                    .slice(0, 150)}
                </p>
              )}

              {/* Meta */}
              <div className="manager-card-meta">
                <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                  <Clock className="h-3 w-3" />
                  {formatDate(t.updatedAt)}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                  <MessageCircle className="h-3 w-3" />
                  {t.messages.length}
                </span>
                {t.model && (
                  <span className="text-[10px] text-[var(--accent-purple)] bg-[var(--accent-purple)]/10 px-1.5 py-0.5 rounded">
                    {t.model}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
