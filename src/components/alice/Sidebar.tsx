import { useEffect, useState, useRef, useCallback } from "react";
import {
  MessageSquarePlus,
  MessageSquare,
  Trash2,
  Pin,
  Edit2,
  Bot,
  MessageCircle,
  Calendar,
  Database,
  Wrench,
  Settings,
  MoreHorizontal,
  Sparkles,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentStatus, AppSettings, ProviderConfig, Thread } from "@/lib/alice/types";
import { format, subDays, startOfDay } from "date-fns";

interface SidebarProps {
  threads: Thread[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename?: (id: string, newTitle: string) => void;
  onTogglePin?: (id: string) => void;
  panel: string;
  onPanel: (p: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  settings?: AppSettings;
  provider?: ProviderConfig;
  busy?: boolean;
  agentStatus?: AgentStatus;
}

export function Sidebar({
  threads,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onRename,
  onTogglePin,
  panel,
  onPanel,
  collapsed,
  onToggleCollapse,
  settings,
  provider,
  busy,
  agentStatus,
}: SidebarProps) {
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [contextMenu, setContextMenu] = useState<{
    threadId: string;
    x: number;
    y: number;
  } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const { pinned, grouped } = useGroupThreads(threads);

  // Close context menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    if (contextMenu) {
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }
  }, [contextMenu]);



  const navItems = [
    { id: "chats", icon: MessageSquare, label: "Chats" },
    { id: "threads", icon: MessageCircle, label: "Threads" },
    { id: "skills", icon: Sparkles, label: "Skills" },
    { id: "schedule", icon: Calendar, label: "Schedule" },
    { id: "knowledge", icon: Database, label: "Knowledge" },
    { id: "tools", icon: Wrench, label: "Tools", badge: "56+" },
    { id: "settings", icon: Settings, label: "Settings" },
  ];

  const formatTime = (date: number) => {
    const now = Date.now();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d`;
  };

  const startRename = (t: Thread, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingThreadId(t.id);
    setEditingTitle(t.title);
  };

  const saveRename = (id: string) => {
    if (editingTitle.trim() && onRename) {
      onRename(id, editingTitle.trim());
    }
    setEditingThreadId(null);
  };

  const openContextMenu = useCallback((threadId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ threadId, x: e.clientX, y: e.clientY });
  }, []);

  const closeContextMenu = () => setContextMenu(null);

  const [avatarImgError, setAvatarImgError] = useState(false);

  const isCollapsed = !!collapsed;

  const content = (
    <>
      {/* Brand Header with toggle inside sidebar */}
      <div className="sidebar-fixed flex items-center gap-3 px-4 py-3 border-b border-[var(--border-color)]">
        {isCollapsed ? (
          <button
            onClick={onToggleCollapse}
            className="w-8 h-8 rounded-lg shrink-0 relative cursor-pointer overflow-hidden"
            title="Expand sidebar"
            style={{ animation: "alice-glow-pulse 3s ease-in-out infinite" }}
          >
            {!avatarImgError ? (
              <img src="/images/alice-avatar.png" alt="Alice" className="w-8 h-8 rounded-lg object-cover" onError={() => setAvatarImgError(true)} />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                <Bot className="h-4 w-4" />
              </div>
            )}
          </button>
        ) : (
          <>
            <div className="w-8 h-8 rounded-lg shrink-0 relative overflow-hidden" style={{ animation: "alice-glow-pulse 3s ease-in-out infinite" }}>
              {!avatarImgError ? (
                <img src="/images/alice-avatar.png" alt="Alice" className="w-8 h-8 rounded-lg object-cover" onError={() => setAvatarImgError(true)} />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                  <Bot className="h-4 w-4" />
                </div>
              )}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <h1 className="text-sm font-semibold text-[var(--text-primary)]">Alice</h1>
              <div className="flex items-center gap-1">
                <div className={`status-dot ${agentStatus || "idle"}`} />
                <span className="text-[10px] text-[var(--text-muted)] capitalize">
                  {busy ? "Working" : "Ready"}
                </span>
              </div>
            </div>
            <button
              onClick={onToggleCollapse}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] p-1 rounded-md transition-colors shrink-0"
              title="Collapse sidebar"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* New Chat Button */}
      <div className="sidebar-fixed px-3 py-2">
        <button
          onClick={() => onNew()}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-2 px-3 bg-[var(--accent-purple-dark)] hover:bg-[var(--accent-purple)] text-white rounded-lg font-medium transition-all text-sm",
            isCollapsed && "px-0",
          )}
          title="New Chat"
        >
          <MessageSquarePlus className="h-4 w-4 shrink-0" />
          {!isCollapsed && <span>New Chat</span>}
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-fixed px-2 py-1">
        <ul className="flex flex-col gap-0.5">
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onPanel(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition-colors",
                  isCollapsed && "justify-center px-0",
                  panel === item.id
                    ? "bg-[var(--accent-glow)] text-[var(--accent-purple)] font-medium"
                    : "text-[var(--text-secondary)] hover:bg-[var(--accent-glow)] hover:text-[var(--accent-purple)]",
                )}
                title={item.label}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
                {!isCollapsed && item.badge && (
                  <span className="ml-auto text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full text-[var(--text-muted)]">
                    {item.badge}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Divider */}
      <div className="sidebar-fixed border-t border-[var(--border-color)] mx-3" />

      {/* Recent Chats - only in expanded mode */}
      {!isCollapsed && (
        <>
          <div className="sidebar-fixed px-3 pt-2">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-1 px-1">
              Recent Chats
            </div>
          </div>
          <div className="sidebar-scroll px-2 pb-2">
            {pinned.length === 0 && Object.values(grouped).flat().length === 0 ? (
              <div className="text-xs text-[var(--text-muted)] px-3 py-4 text-center">
                No conversations yet
              </div>
            ) : (
              <>
                {pinned.length > 0 && (
                  <div className="mb-1">
                    {pinned.map((t) => (
                      <ThreadRow
                        key={t.id}
                        thread={t}
                        activeId={activeId}
                        onSelect={() => onSelect(t.id)}
                        onDelete={() => onDelete(t.id)}
                        onRenameStart={startRename}
                        onRenameSave={saveRename}
                        onContextMenu={openContextMenu}
                        editingThreadId={editingThreadId}
                        editingTitle={editingTitle}
                        setEditingTitle={setEditingTitle}
                        setEditingThreadId={setEditingThreadId}
                        formatTime={formatTime}
                      />
                    ))}
                  </div>
                )}
                {Object.entries(grouped).map(([label, items]) => (
                  <div key={label} className="mb-1">
                    <div className="text-[10px] text-[var(--text-muted)] px-3 py-1">{label}</div>
                    {items.map((t) => (
                      <ThreadRow
                        key={t.id}
                        thread={t}
                        activeId={activeId}
                        onSelect={() => onSelect(t.id)}
                        onDelete={() => onDelete(t.id)}
                        onRenameStart={startRename}
                        onRenameSave={saveRename}
                        onContextMenu={openContextMenu}
                        editingThreadId={editingThreadId}
                        editingTitle={editingTitle}
                        setEditingTitle={setEditingTitle}
                        setEditingThreadId={setEditingThreadId}
                        formatTime={formatTime}
                      />
                    ))}
                  </div>
                ))}
              </>
            )}
          </div>
        </>
      )}

      {/* User Profile */}
      <div className="sidebar-fixed px-3 py-2 border-t border-[var(--border-color)] mt-auto">
        <div className={cn("flex items-center gap-3", isCollapsed && "justify-center")}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-purple-600 flex items-center justify-center text-white font-medium text-xs shrink-0">
            {settings ? "U" : "A"}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                Alice User
              </div>
              <div className="text-[10px] text-[var(--text-muted)]">Free Plan</div>
            </div>
          )}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="dropdown-menu"
          style={{ position: "fixed", left: contextMenu.x, top: contextMenu.y, zIndex: 100 }}
        >
          <button
            className="dropdown-menu-item"
            onClick={() => {
              const t = threads.find((x) => x.id === contextMenu.threadId);
              if (t) startRename(t, { stopPropagation: () => {} } as React.MouseEvent);
              closeContextMenu();
            }}
          >
            <Edit2 className="h-3.5 w-3.5" /> Rename
          </button>
          {onTogglePin && (
            <button
              className="dropdown-menu-item"
              onClick={() => {
                onTogglePin(contextMenu.threadId);
                closeContextMenu();
              }}
            >
              <Pin className="h-3.5 w-3.5" /> Pin
            </button>
          )}
          <button
            className="dropdown-menu-item"
            onClick={() => {
              const t = threads.find((x) => x.id === contextMenu.threadId);
              if (t) {
                const blob = new Blob([JSON.stringify(t, null, 2)], {
                  type: "application/json",
                });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = `${t.title.replace(/\s+/g, "-")}.json`;
                a.click();
              }
              closeContextMenu();
            }}
          >
            <Download className="h-3.5 w-3.5" /> Export
          </button>
          <div className="dropdown-separator" />
          <button
            className="dropdown-menu-item danger"
            onClick={() => {
              onDelete(contextMenu.threadId);
              closeContextMenu();
            }}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </div>
      )}
    </>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {content}
    </div>
  );
}

function ThreadRow({
  thread,
  activeId,
  onSelect,
  onDelete,
  onRenameStart,
  onRenameSave,
  onContextMenu,
  editingThreadId,
  editingTitle,
  setEditingTitle,
  setEditingThreadId,
  formatTime,
}: {
  thread: Thread;
  activeId: string | null;
  onSelect: () => void;
  onDelete: () => void;
  onRenameStart: (t: Thread, e: React.MouseEvent) => void;
  onRenameSave: (id: string) => void;
  onContextMenu: (threadId: string, e: React.MouseEvent) => void;
  editingThreadId: string | null;
  editingTitle: string;
  setEditingTitle: (v: string) => void;
  setEditingThreadId: (id: string | null) => void;
  formatTime: (date: number) => string;
}) {
  const isActive = activeId === thread.id;
  const isEditing = editingThreadId === thread.id;

  return (
    <div
      className={cn(
        "thread-row",
        isActive && "active",
      )}
      onClick={onSelect}
      onContextMenu={(e) => onContextMenu(thread.id, e)}
    >
      <MessageSquare className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0 opacity-70" />
      {isEditing ? (
        <input
          autoFocus
          value={editingTitle}
          onChange={(e) => setEditingTitle(e.target.value)}
          onBlur={() => onRenameSave(thread.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onRenameSave(thread.id);
            if (e.key === "Escape") setEditingThreadId(null);
          }}
          className="flex-1 bg-transparent outline-none text-sm px-1 border border-[var(--border-color)] rounded min-w-0"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="flex-1 truncate text-sm text-[var(--text-secondary)] min-w-0">
          {thread.title}
        </span>
      )}
      <span className="text-[10px] text-[var(--text-muted)] shrink-0">
        {formatTime(thread.updatedAt)}
      </span>
      {/* ⋮ Menu button - appears on hover */}
      <button
        className="thread-menu-btn shrink-0"
        onClick={(e) => onContextMenu(thread.id, e)}
        title="More options"
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function useGroupThreads(threads: Thread[]) {
  const sorted = [...threads].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.updatedAt - a.updatedAt;
  });

  const now = new Date();
  const today = startOfDay(now);
  const yesterday = startOfDay(subDays(now, 1));

  const pinned: Thread[] = [];
  const grouped: Record<string, Thread[]> = {};

  for (const t of sorted) {
    if (t.pinned) {
      pinned.push(t);
      continue;
    }
    const date = new Date(t.updatedAt);
    if (date >= today) {
      (grouped["Today"] ??= []).push(t);
    } else if (date >= yesterday) {
      (grouped["Yesterday"] ??= []).push(t);
    } else {
      (grouped["Older"] ??= []).push(t);
    }
  }

  // Remove empty groups
  for (const k of Object.keys(grouped)) {
    if (grouped[k].length === 0) delete grouped[k];
  }

  return { pinned, grouped };
}
