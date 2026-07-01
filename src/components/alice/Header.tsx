import { useState } from "react";
import {
  ChevronDown,
  Settings,
  Cpu,
  HardDrive,
  Brain,
  MessageSquare,
  Wifi,
  WifiOff,
  Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { ModelPicker } from "./ModelPicker";
import { cn } from "@/lib/utils";
import { TOOLS } from "@/lib/alice/tools";
import type { AppSettings, Thread, ProviderConfig, MemoryEntry, Skill } from "@/lib/alice/types";

interface HeaderProps {
  providers: ProviderConfig[];
  settings: AppSettings;
  onSettingsClick: () => void;
  onProviderChange: (providerId: string, model: string) => void;
  onProviderRefresh: (providerId: string, models: string[]) => void;
  threads: Thread[];
  activeThread: Thread | null;
  memory: MemoryEntry[];
  skills: Skill[];
  busy: boolean;
  status?: AgentStatus;
}

// Agent status enum
type AgentStatus =
  "idle" | "thinking" | "calling" | "searching" | "generating" | "completed" | "error";

export function Header({
  providers,
  settings,
  onSettingsClick,
  onProviderChange,
  onProviderRefresh,
  threads,
  activeThread,
  memory,
  skills,
  busy,
  status,
}: HeaderProps) {
  // Use external status if provided, otherwise simple fallback
  const agentStatus = status ?? ((busy ? "thinking" : "idle") as AgentStatus);

  // Calculate context usage (approximate - 1 token ≈ 4 chars)
  const estimateTokens = (text: string) => Math.ceil(text.length / 4);
  const totalTokens =
    activeThread?.messages.reduce((acc, m) => acc + estimateTokens(m.content), 0) ?? 0;
  const maxContext =
    providers.find((p) => p.id === settings.activeProviderId)?.contextWindow ?? 32000;
  const usagePercent = Math.min((totalTokens / maxContext) * 100, 100);

  // Determine progress color
  const getProgressColor = (percent: number) => {
    if (percent >= 90) return "bg-red-500";
    if (percent >= 70) return "bg-yellow-500";
    return "bg-emerald-500";
  };

  // Projects dropdown items (stub - to be implemented later)
  const projects = [
    { id: "personal", name: "Personal Assistant", description: "General AI assistant" },
    { id: "work", name: "Work Projects", description: "Development tasks" },
  ];

  return (
    <header className="flex items-center gap-2 border-b border-border bg-[#0d0d0f] px-3 py-2 shrink-0">
      {/* Mobile menu button */}
      <button
        onClick={() => {
          /* open mobile sidebar */
        }}
        className="md:hidden text-muted-foreground hover:text-foreground p-1 -ml-1"
        aria-label="Open menu"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Agent Logo/Brand */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-emerald-500/20">
          A
        </div>
        <span className="font-semibold text-base tracking-tight hidden sm:inline">Alice</span>
      </div>

      {/* Project Selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <HardDrive className="h-3.5 w-3.5" />
            <span className="max-w-[100px] truncate">{projects[0].name}</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {projects.map((proj) => (
            <DropdownMenuItem key={proj.id} className="flex flex-col items-start py-2">
              <span className="font-medium">{proj.name}</span>
              <span className="text-xs text-muted-foreground">{proj.description}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-primary">+ New Workspace</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Divider */}
      <div className="h-6 w-px bg-border mx-1" />

      {/* Model Picker */}
      <div className="shrink-0">
        <ModelPicker
          providers={providers}
          activeProviderId={settings.activeProviderId}
          activeModel={settings.activeModel}
          onChange={onProviderChange}
          onRefresh={onProviderRefresh}
        />
      </div>

      {/* Context Indicator */}
      <div
        className="hidden lg:flex flex-col shrink-0 w-32 group cursor-help"
        title={`${totalTokens.toLocaleString()} / ${maxContext.toLocaleString()} tokens`}
      >
        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
          <span>Context</span>
          <span className="font-mono">
            {(totalTokens / 1000).toFixed(1)}K / {(maxContext / 1000).toFixed(0)}K
          </span>
        </div>
        <Progress value={usagePercent} className={cn("h-1.5", getProgressColor(usagePercent))} />
      </div>

      {/* Live Status Indicator */}
      <div className="flex items-center gap-1 shrink-0 ml-auto">
        <div className={cn("status-dot", agentStatus, busy && "animate-pulse")} />
        <span className="text-xs text-muted-foreground hidden xl:inline capitalize">
          {agentStatus === "idle" ? "Idle" : agentStatus}
        </span>
      </div>

      {/* Stats */}
      <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground shrink-0">
        <span className="stat-badge" title="Tools">
          <Cpu className="h-3 w-3" />
          {TOOLS.length}
        </span>
        <span className="stat-badge" title="Skills">
          <Brain className="h-3 w-3" />
          {skills.length}
        </span>
        <span className="stat-badge" title="Memories">
          <HardDrive className="h-3 w-3" />
          {memory.length}
        </span>
      </div>

      {/* Settings */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onSettingsClick}
        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
        aria-label="Settings"
      >
        <Settings className="h-4 w-4" />
      </Button>
    </header>
  );
}
