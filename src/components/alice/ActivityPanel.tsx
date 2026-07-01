import { useMemo, useRef, useEffect } from "react";
import {
  CheckCircle,
  Circle,
  RefreshCw,
  Search,
  FileCode,
  Brain,
  Pen,
  AlertCircle,
  Cpu,
} from "lucide-react";
import type { AgentStatus, ActivityStep, MemoryEntry, ProviderConfig, Thread, ToolCall } from "@/lib/alice/types";
import { cn } from "@/lib/utils";

interface ActivityPanelProps {
  steps: ActivityStep[];
  agentStatus: AgentStatus;
  toolCalls: ToolCall[];
  memory: MemoryEntry[];
  thread: Thread | null;
  provider?: ProviderConfig;
  activeModel: string;
}

export function ActivityPanel({
  steps,
  agentStatus,
  toolCalls,
  memory,
  thread,
  provider,
  activeModel,
}: ActivityPanelProps) {
  // Build activity items from steps or show defaults
  const activityItems = useMemo(() => {
    if (steps.length > 0) return steps;
    // Default items when nothing is happening
    return [
      {
        id: "default-1",
        type: "planning" as const,
        label: "Planning",
        status: "done" as const,
        startTime: Date.now() - 5000,
        endTime: Date.now() - 4000,
      },
      {
        id: "default-2",
        type: "tool_call" as const,
        label: "Tool calls",
        status: "done" as const,
        startTime: Date.now() - 4000,
        endTime: Date.now() - 3000,
      },
      {
        id: "default-3",
        type: "done" as const,
        label: "Ready",
        status: "done" as const,
        startTime: Date.now() - 3000,
        endTime: Date.now() - 2000,
      },
    ];
  }, [steps]);

  const getStepIcon = (step: ActivityStep) => {
    switch (step.type) {
      case "planning":
        return <Brain className="h-3.5 w-3.5" />;
      case "searching":
        return <Search className="h-3.5 w-3.5" />;
      case "reading":
        return <FileCode className="h-3.5 w-3.5" />;
      case "tool_call":
        return <Cpu className="h-3.5 w-3.5" />;
      case "reasoning":
        return <Brain className="h-3.5 w-3.5" />;
      case "writing":
        return <Pen className="h-3.5 w-3.5" />;
      case "done":
        return <CheckCircle className="h-3.5 w-3.5" />;
      case "error":
        return <AlertCircle className="h-3.5 w-3.5" />;
      default:
        return <Circle className="h-3.5 w-3.5" />;
    }
  };

  const getStepDotClass = (step: ActivityStep) => {
    if (step.status === "running") return "planning";
    if (step.status === "error") return "error";
    if (step.status === "done") {
      switch (step.type) {
        case "searching": return "searching";
        case "tool_call": return "tool";
        case "writing": return "writing";
        case "done": return "done";
        default: return "planning";
      }
    }
    return "planning";
  };

  const getDuration = (step: ActivityStep) => {
    if (!step.endTime) return "";
    const ms = step.endTime - step.startTime;
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Context usage estimate
  const estimateTokens = (text: string) => Math.ceil(text.length / 4);
  const totalTokens = thread?.messages.reduce((acc, m) => acc + estimateTokens(m.content), 0) ?? 0;
  const maxContext = provider?.contextWindow ?? 32000;
  const usagePercent = Math.min((totalTokens / maxContext) * 100, 100);
  const sessionDuration = thread
    ? Math.floor((Date.now() - (thread.messages[0]?.createdAt ?? Date.now())) / 1000 / 60)
    : 0;

  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const userScrolledUp = useRef(false);

  // Track if user scrolled up manually
  const handleTimelineScroll = () => {
    const el = timelineScrollRef.current;
    if (el) {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
      userScrolledUp.current = !atBottom;
    }
  };

  const prevStepCount = useRef(activityItems.length);

  // Auto-scroll timeline to bottom only if user hasn't scrolled up
  useEffect(() => {
    // Reset scroll lock when steps decrease (new conversation)
    if (activityItems.length < prevStepCount.current) {
      userScrolledUp.current = false;
    }
    prevStepCount.current = activityItems.length;

    const el = timelineScrollRef.current;
    if (el && !userScrolledUp.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [activityItems.length, agentStatus]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)] shrink-0">
        <h3 className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
          Activity
        </h3>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Activity Timeline - scrollable, own box */}
        <div ref={timelineScrollRef} onScroll={handleTimelineScroll} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden border-b border-[var(--border-color)]">
          <div className="p-4">
            <div className="text-[10px] text-[var(--text-muted)] mb-3 uppercase tracking-wider font-semibold">
              Timeline
            </div>
            <div className="space-y-0">
              {activityItems.map((step) => (
                <div key={step.id} className="timeline-item">
                  <div className={cn("timeline-dot", getStepDotClass(step))}>
                    {step.status === "running" ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      getStepIcon(step)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        "text-xs font-medium",
                        step.status === "running" ? "text-[var(--accent-purple)]" : "text-[var(--text-secondary)]"
                      )}>
                        {step.label}
                      </span>
                      {getDuration(step) && (
                        <span className="text-[10px] text-[var(--text-muted)] font-mono">
                          {getDuration(step)}
                        </span>
                      )}
                    </div>
                    {step.detail && (
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5 truncate">
                        {step.detail}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tools Used - fixed, always visible */}
        {toolCalls.length > 0 && (
          <div className="shrink-0 p-4 border-b border-[var(--border-color)]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                Tools Used
              </h3>
              <span className="text-[10px] text-[var(--accent-purple)] font-medium">
                {toolCalls.length}
              </span>
            </div>
            <div className="space-y-1.5">
              {toolCalls.map((tc, idx) => {
                const dur =
                  tc.endedAt && tc.startedAt
                    ? ((tc.endedAt - tc.startedAt) / 1000).toFixed(1) + "s"
                    : "";
                const statusColor =
                  tc.status === "done"
                    ? "text-[var(--success-green)]"
                    : tc.status === "error"
                      ? "text-[var(--red-danger)]"
                      : "text-[var(--blue-info)]";

                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs bg-[var(--bg-panel-alt)] p-2 rounded border border-[var(--border-color)]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={cn("text-[10px]", statusColor)}>
                        {tc.status === "done" ? "✓" : tc.status === "error" ? "✕" : "●"}
                      </span>
                      <span className="text-[var(--text-secondary)] truncate">{tc.name}</span>
                    </div>
                    {dur && (
                      <span className="text-[10px] text-[var(--text-muted)] shrink-0 ml-2">{dur}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Context Usage - fixed, always visible */}
        <div className="shrink-0 p-4 border-b border-[var(--border-color)]">
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-3">
            Context
          </div>
          <div className="bg-[var(--bg-panel-alt)] rounded-lg p-3 border border-[var(--border-color)]">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Model</span>
                <span className="text-[var(--text-secondary)] font-medium">{activeModel || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Provider</span>
                <span className="text-[var(--text-secondary)] font-medium">{provider?.name || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Tokens</span>
                <span className="text-[var(--text-secondary)] font-medium">
                  {(totalTokens / 1000).toFixed(1)}K / {(maxContext / 1000).toFixed(0)}K
                </span>
              </div>
              <div className="context-progress">
                <div
                  className={cn(
                    "context-progress-bar",
                    usagePercent >= 90 ? "danger" : usagePercent >= 70 ? "warning" : "",
                  )}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Session</span>
                <span className="text-[var(--text-secondary)] font-medium">{sessionDuration}m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Messages</span>
                <span className="text-[var(--text-secondary)] font-medium">
                  {thread?.messages.filter((m) => m.role !== "tool").length ?? 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Memory</span>
                <span className="text-[var(--text-secondary)] font-medium">{memory.length} items</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats - fixed, always visible */}
        <div className="shrink-0 p-4">
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-3">
            Stats
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[var(--bg-panel-alt)] rounded-lg p-3 border border-[var(--border-color)] text-center">
              <div className="text-lg font-bold text-[var(--accent-purple)]">
                {toolCalls.length}
              </div>
              <div className="text-[10px] text-[var(--text-muted)]">Tools</div>
            </div>
            <div className="bg-[var(--bg-panel-alt)] rounded-lg p-3 border border-[var(--border-color)] text-center">
              <div className="text-lg font-bold text-[var(--accent-purple)]">
                {steps.length}
              </div>
              <div className="text-[10px] text-[var(--text-muted)]">Steps</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
