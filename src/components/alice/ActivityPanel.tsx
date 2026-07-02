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
  tokenBreakdown?: { totalTokens: number; systemTokens: number; messagesTokens: number } | null;
  conversationCost?: string;
}

/** Auto-scroll hook: tracks user scroll position, auto-scrolls to bottom when deps change */
function useAutoScroll(deps: React.DependencyList) {
  const ref = useRef<HTMLDivElement>(null);
  const userScrolledUp = useRef(false);
  const prevCount = useRef(0);

  const handleScroll = () => {
    const el = ref.current;
    if (el) {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
      userScrolledUp.current = !atBottom;
    }
  };

  // Get the first dep as count for reset detection
  const count = (deps[0] as number) ?? 0;

  useEffect(() => {
    // Reset scroll lock when count decreases (new conversation)
    if (count < prevCount.current) {
      userScrolledUp.current = false;
    }
    prevCount.current = count;

    const el = ref.current;
    if (el && !userScrolledUp.current) {
      requestAnimationFrame(() => {
        el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
      });
    }
  }, deps);

  return { ref, handleScroll };
}

export function ActivityPanel({
  steps,
  agentStatus,
  toolCalls,
  memory,
  thread,
  provider,
  activeModel,
  tokenBreakdown,
  conversationCost,
}: ActivityPanelProps) {
  // Build activity items from steps or show defaults
  const activityItems = useMemo(() => {
    if (steps.length > 0) return steps;
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
      case "planning": return <Brain className="h-3.5 w-3.5" />;
      case "searching": return <Search className="h-3.5 w-3.5" />;
      case "reading": return <FileCode className="h-3.5 w-3.5" />;
      case "tool_call": return <Cpu className="h-3.5 w-3.5" />;
      case "reasoning": return <Brain className="h-3.5 w-3.5" />;
      case "writing": return <Pen className="h-3.5 w-3.5" />;
      case "done": return <CheckCircle className="h-3.5 w-3.5" />;
      case "error": return <AlertCircle className="h-3.5 w-3.5" />;
      default: return <Circle className="h-3.5 w-3.5" />;
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

  // Independent scroll for Timeline section
  const timeline = useAutoScroll([activityItems.length, agentStatus, steps[steps.length - 1]?.endTime]);
  // Independent scroll for Tools Used section
  const toolsUsed = useAutoScroll([toolCalls.length]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header - fixed */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)] shrink-0">
        <h3 className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
          Activity
        </h3>
        {agentStatus === "generating" && (
          <span className="flex items-center gap-1.5 text-[10px] text-[var(--blue-info)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--blue-info)] animate-pulse" />
            Running
          </span>
        )}
      </div>

      {/* Section 1: Timeline - flex-based height, independent scroll */}
      <div className="flex flex-col shrink-0 min-h-[120px] h-[40%] border-b border-[var(--border-color)]">
        <div className="px-4 pt-3 pb-2 shrink-0">
          <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
            Timeline
          </div>
        </div>
        <div ref={timeline.ref} onScroll={timeline.handleScroll} className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-3">
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

            {/* Animated typing indicator when AI is generating */}
            {agentStatus === "generating" && (
              <div className="timeline-item typing-indicator-row">
                <div className="timeline-dot">
                  <Pen className="h-3 w-3" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-[var(--primary)]">
                      Writing response
                    </span>
                    <div className="typing-dots">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section 2: Tools Used - flex-based height, independent scroll */}
      <div className="flex flex-col shrink-0 min-h-[100px] h-[30%] border-b border-[var(--border-color)]">
        <div className="px-4 pt-3 pb-2 shrink-0 flex items-center justify-between">
          <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
            Tools Used
          </div>
          {toolCalls.length > 0 && (
            <span className="text-[10px] text-[var(--accent-purple)] font-medium">
              {toolCalls.length}
            </span>
          )}
        </div>
        <div ref={toolsUsed.ref} onScroll={toolsUsed.handleScroll} className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-3">
          {toolCalls.length === 0 ? (
            <div className="text-[10px] text-[var(--text-muted)] italic">No tools used yet</div>
          ) : (
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
          )}
        </div>
      </div>

      {/* Section 3: Context - fixed, compact, overflow-safe */}
      <div className="shrink-0 px-4 py-3 overflow-y-auto max-h-[240px]">
        <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-2">
          Context
        </div>
        <div className="bg-[var(--bg-panel-alt)] rounded-lg p-2.5 border border-[var(--border-color)]">
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Model</span>
              <span className="text-[var(--text-secondary)] font-medium truncate ml-2">{activeModel || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Provider</span>
              <span className="text-[var(--text-secondary)] font-medium truncate ml-2">{provider?.name || "—"}</span>
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
            {conversationCost && (
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Cost</span>
                <span className="text-[var(--success-green)] font-medium font-mono">{conversationCost}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
