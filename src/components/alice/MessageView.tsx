import { useState } from "react";
import { Copy, RefreshCw, ThumbsUp, ThumbsDown, Check, User, Bot, ChevronRight, X, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Message, ToolCall } from "@/lib/alice/types";
import { TOOLS_BY_NAME } from "@/lib/alice/tools";
import { CodeBlock } from "./CodeBlock";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface MessageViewProps {
  msg: Message;
  live?: boolean;
  onCopy?: (msgId: string, content: string) => void;
  onEdit?: (msgId: string, newContent: string) => void;
  onRetry?: (msgId: string) => void;
  onFeedback?: (msgId: string, type: "like" | "dislike") => void;
}

export function MessageView({ msg, live, onCopy, onEdit, onRetry, onFeedback }: MessageViewProps) {
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState(msg.content);
  const [aliceImgError, setAliceImgError] = useState(false);

  if (msg.role === "tool") return null;

  const time = new Date(msg.createdAt);
  const timeStr = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(msg.content);
      toast.success("Copied");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const startEdit = () => {
    setEditContent(msg.content);
    setEditMode(true);
  };
  const saveEdit = () => {
    onEdit?.(msg.id, editContent.trim());
    setEditMode(false);
  };
  const cancelEdit = () => {
    setEditContent(msg.content);
    setEditMode(false);
  };

  // User message
  if (msg.role === "user") {
    return (
      <div className="flex gap-3 max-w-[1100px] mx-auto md:mr-auto group">
        <div className="flex-1 min-w-0 flex flex-col items-end">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-[var(--text-muted)]">{timeStr}</span>
            <span className="text-sm font-semibold text-[var(--text-primary)]">You</span>
          </div>
          {editMode ? (
            <div className="rounded-2xl rounded-tr-sm bg-[var(--bg-panel)] border border-[var(--border-color)] p-3 max-w-full">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full bg-transparent outline-none text-sm text-[var(--text-secondary)] resize-none min-h-[80px]"
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-2">
                <button onClick={cancelEdit} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] px-2 py-1 rounded hover:bg-[var(--bg-hover)]">
                  Cancel
                </button>
                <button onClick={saveEdit} className="text-xs bg-[var(--accent-purple)] text-white px-3 py-1 rounded-lg">
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl rounded-tr-sm bg-[#2f2f2f] text-white px-4 py-2.5 text-sm leading-relaxed shadow-sm border border-white/5 max-w-full">
              {msg.content}
            </div>
          )}
        </div>
        <div className="w-8 h-8 rounded-full bg-[#52525b] flex items-center justify-center shrink-0">
          <User className="h-4 w-4" />
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="flex gap-3 max-w-[1100px] mx-auto md:mr-auto group">
      <div className="w-8 h-8 rounded-full shrink-0 overflow-hidden" style={{ animation: "alice-glow-pulse 3s ease-in-out infinite" }}>
        {!aliceImgError ? (
          <img src="/images/alice-avatar.png" alt="Alice" className="w-8 h-8 rounded-full object-cover" onError={() => setAliceImgError(true)} />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent-purple)] to-purple-500 flex items-center justify-center text-white">
            <Bot className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-[var(--accent-purple)]">Alice</span>
          {live && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--accent-purple)]/20 text-[var(--accent-purple)] animate-pulse">
              Responding
            </span>
          )}
          <span className="text-xs text-[var(--text-muted)] ml-auto">{timeStr}</span>
        </div>

        {/* Thinking inline */}
        {msg.reasoning && <ThinkingInline text={msg.reasoning} live={!!live} />}

        {/* Tool calls */}
        {msg.toolCalls && msg.toolCalls.length > 0 && (
          <div className="space-y-2 my-3">
            {msg.toolCalls.map((tc) => (
              <ToolCardInline key={tc.id} tc={tc} />
            ))}
          </div>
        )}

        {/* Content - Markdown */}
        {msg.content && (
          <div className="text-[var(--text-secondary)] text-sm leading-relaxed">
            <MarkdownRenderer content={msg.content} live={live} />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            title="Copy"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onRetry?.(msg.id)}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            title="Retry"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onFeedback?.(msg.id, "like")}
            className={cn(
              "p-1.5 rounded-lg hover:bg-[var(--bg-hover)]",
              msg.liked ? "text-[var(--success-green)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
            )}
            title="Helpful"
          >
            <ThumbsUp className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onFeedback?.(msg.id, "dislike")}
            className={cn(
              "p-1.5 rounded-lg hover:bg-[var(--bg-hover)]",
              msg.disliked ? "text-[var(--red-danger)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
            )}
            title="Not helpful"
          >
            <ThumbsDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Thinking Inline Component
function ThinkingInline({ text, live }: { text: string; live: boolean }) {
  const [open, setOpen] = useState(live);

  return (
    <div className="bg-[var(--bg-panel)] border border-[var(--border-color)]/60 border-l-3 border-l-[var(--accent-purple)] rounded-lg overflow-hidden mb-3 shadow-sm">
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className={cn("text-[10px] text-[var(--accent-purple)]", live && "animate-pulse")}>
          ●
        </span>
        <span className="text-xs text-[var(--text-secondary)]">Thinking…</span>
        <span className="ml-auto text-[10px] text-[var(--text-muted)]">{text.length} chars</span>
        <ChevronRight
          className={cn(
            "h-3 w-3 text-[var(--text-muted)] transition-transform",
            open && "rotate-90",
          )}
        />
      </div>
      {open && (
        <div className="px-3 py-2 border-t border-[var(--border-color)]/60 bg-[var(--code-bg)]">
          <pre className="text-xs text-[var(--text-secondary)] whitespace-pre-wrap font-mono leading-relaxed max-h-48 overflow-auto">
            {text}
          </pre>
        </div>
      )}
    </div>
  );
}

// Tool Card Inline - Claude-style
function ToolCardInline({ tc }: { tc: ToolCall }) {
  const [open, setOpen] = useState(false);
  const def = TOOLS_BY_NAME[tc.name];
  const emoji = def?.emoji || "🔧";
  const dur =
    tc.endedAt && tc.startedAt ? ((tc.endedAt - tc.startedAt) / 1000).toFixed(1) + "s" : "";

  const statusLabel =
    tc.status === "done" ? "✓ Completed" : tc.status === "error" ? "✕ Error" : "● Running";
  const statusColor =
    tc.status === "done"
      ? "text-[var(--success-green)]"
      : tc.status === "error"
        ? "text-[var(--red-danger)]"
        : "text-[var(--blue-info)] animate-pulse";

  // Short description based on tool name
  const getDescription = () => {
    if (tc.name.includes("search")) return "Searching…";
    if (tc.name.startsWith("read")) return "Reading file…";
    if (tc.name.startsWith("write")) return "Writing file…";
    if (tc.name === "run_shell" || tc.name === "terminal") return "Running command…";
    if (tc.name === "remember") return "Saving to memory…";
    return `${tc.name}…`;
  };

  return (
    <div className="tool-card">
      <div className="tool-card-header" onClick={() => setOpen(!open)}>
        <span className="text-sm">{emoji}</span>
        <span className="text-xs font-medium text-[var(--text-secondary)]">
          {getDescription()}
        </span>
        {dur && <span className="text-[10px] text-[var(--text-muted)] ml-auto">{dur}</span>}
        <span className={cn("text-[10px] font-medium", statusColor)}>{statusLabel}</span>
        <ChevronRight
          className={cn(
            "h-3 w-3 text-[var(--text-muted)] transition-transform shrink-0",
            open && "rotate-90",
          )}
        />
      </div>
      {open && (
        <div className="tool-card-body">
          {tc.args && (
            <div className="mb-2">
              <div className="text-[10px] text-[var(--text-muted)] mb-1 font-medium">Input</div>
              <pre className="text-xs text-[var(--text-secondary)] whitespace-pre-wrap font-mono max-h-40 overflow-auto rounded bg-[var(--bg-panel)] p-2 border border-[var(--border-color)]">
                {(() => {
                  try {
                    return JSON.stringify(JSON.parse(tc.args), null, 2);
                  } catch {
                    return tc.args;
                  }
                })()}
              </pre>
            </div>
          )}
          {tc.result && (
            <div>
              <div className="text-[10px] text-[var(--text-muted)] mb-1 font-medium">Output</div>
              <pre className="text-xs text-[var(--text-secondary)] whitespace-pre-wrap font-mono max-h-60 overflow-auto rounded bg-[var(--bg-panel)] p-2 border border-[var(--border-color)]">
                {tc.result}
              </pre>
            </div>
          )}
          <div className="flex items-center gap-4 mt-2 text-[10px] text-[var(--text-muted)]">
            {tc.startedAt && <span>Started: {new Date(tc.startedAt).toLocaleTimeString()}</span>}
            {dur && <span>Duration: {dur}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
