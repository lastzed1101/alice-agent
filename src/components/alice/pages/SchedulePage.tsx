import { useState } from "react";
import {
  Search,
  Clock,
  Plus,
  Trash2,
  Play,
  Pause,
  RotateCw,
  X,
  Calendar,
  Zap,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import type { ScheduledTask } from "@/lib/alice/types";
import { cn } from "@/lib/utils";
import { uid } from "@/lib/alice/storage";
import { parseSchedule } from "@/lib/alice/tools";

interface SchedulePageProps {
  tasks: ScheduledTask[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onRunNow: (id: string) => void;
  onAdd: (task: ScheduledTask) => void;
}

export function SchedulePage({ tasks, onToggle, onDelete, onRunNow, onAdd }: SchedulePageProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newTask, setNewTask] = useState({ name: "", prompt: "", schedule: "every 60m" });

  const handleCreate = () => {
    if (!newTask.name.trim() || !newTask.prompt.trim()) return;
    const ps = parseSchedule(newTask.schedule);
    onAdd({
      id: uid(),
      name: newTask.name.trim(),
      prompt: newTask.prompt.trim(),
      schedule: newTask.schedule,
      intervalMs: ps.intervalMs,
      dailyAt: ps.dailyAt,
      nextRun: ps.nextRun,
      enabled: true,
    });
    setNewTask({ name: "", prompt: "", schedule: "every 60m" });
    setShowCreate(false);
  };

  const formatTime = (ts: number) => {
    if (!ts) return "—";
    const d = new Date(ts);
    return d.toLocaleString();
  };

  const timeUntil = (ts: number) => {
    const ms = ts - Date.now();
    if (ms <= 0) return "now";
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Scheduled Tasks</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {tasks.length} task{tasks.length !== 1 ? "s" : ""} ·{" "}
            {tasks.filter((t) => t.enabled).length} active
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-purple)] text-white rounded-lg text-sm font-medium hover:bg-[var(--accent-purple-dark)] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Task
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="manager-card mb-6 border-[var(--accent-purple)]">
          <div className="manager-card-header">
            <h3 className="manager-card-title text-[var(--text-primary)]">New Task</h3>
            <button
              onClick={() => setShowCreate(false)}
              className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3 mt-3">
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Task Name *</label>
              <input
                value={newTask.name}
                onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                placeholder="e.g. Daily Summary"
                className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] outline-none focus:border-[var(--accent-purple)]"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">What should Alice do? *</label>
              <textarea
                value={newTask.prompt}
                onChange={(e) => setNewTask({ ...newTask, prompt: e.target.value })}
                placeholder="e.g. Search for trending AI news and summarize the top 5 stories"
                rows={3}
                className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] outline-none focus:border-[var(--accent-purple)] resize-none"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Schedule</label>
              <input
                value={newTask.schedule}
                onChange={(e) => setNewTask({ ...newTask, schedule: e.target.value })}
                placeholder="every 60m, daily 09:00, every 24h"
                className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] outline-none focus:border-[var(--accent-purple)]"
              />
              <p className="text-[10px] text-[var(--text-muted)] mt-1">
                Examples: "every 30m", "every 24h", "daily 09:00", "daily 17:30"
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border-color)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newTask.name.trim() || !newTask.prompt.trim()}
                className="px-3 py-1.5 text-xs rounded-lg bg-[var(--accent-purple)] text-white disabled:opacity-40"
              >
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tasks */}
      {tasks.length === 0 ? (
        <div className="text-center py-16">
          <Calendar className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-3 opacity-50" />
          <p className="text-[var(--text-muted)] text-sm">No scheduled tasks yet</p>
          <p className="text-[10px] text-[var(--text-muted)] mt-1">
            Tasks run while this tab is open
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={cn("manager-card", !task.enabled && "opacity-60")}
            >
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-medium text-[var(--text-primary)]">{task.name}</h3>
                    {!task.enabled && (
                      <span className="text-[10px] text-[var(--yellow-warning)] bg-[var(--yellow-warning)]/10 px-1.5 py-0.5 rounded">
                        Paused
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-muted)] line-clamp-2 mb-2">{task.prompt}</p>
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {task.schedule}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      Next: {task.enabled ? timeUntil(task.nextRun) : "paused"}
                    </span>
                    {task.lastResult && (
                      <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                        {task.lastResult.startsWith("error") ? (
                          <AlertCircle className="h-3 w-3 text-[var(--red-danger)]" />
                        ) : (
                          <CheckCircle className="h-3 w-3 text-[var(--success-green)]" />
                        )}
                        <span className="truncate max-w-[200px]">{task.lastResult}</span>
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onRunNow(task.id)}
                    className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    title="Run now"
                  >
                    <Zap className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onToggle(task.id)}
                    className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    title={task.enabled ? "Pause" : "Resume"}
                  >
                    {task.enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => onDelete(task.id)}
                    className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--red-danger)]"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
