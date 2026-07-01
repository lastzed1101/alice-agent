export type Role = "system" | "user" | "assistant" | "tool";

export interface ToolCall {
  id: string;
  name: string;
  args: string;
  status: "preparing" | "running" | "done" | "error";
  result?: string;
  startedAt?: number;
  endedAt?: number;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  reasoning?: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
  toolName?: string;
  createdAt: number;
  liked?: boolean;
  disliked?: boolean;
  edited?: boolean;
}

export interface Thread {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  pinned?: boolean;
  favorite?: boolean;
  providerId?: string;
  model?: string;
}

export interface ProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  models: string[];
  builtin?: boolean;
  contextWindow?: number;
}

export interface AppSettings {
  activeProviderId: string;
  activeModel: string;
  systemPrompt: string;
  searxngUrl: string;
  temperature: number;
  maxToolSteps: number;
}

export interface MemoryEntry {
  id: string;
  key: string;
  value: string;
  createdAt: number;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  trigger: string;
  steps: string;
  category?: string;
  enabled?: boolean;
  createdAt: number;
}

export interface ScheduledTask {
  id: string;
  name: string;
  prompt: string;
  schedule: string;
  intervalMs?: number;
  dailyAt?: string;
  nextRun: number;
  lastRun?: number;
  enabled: boolean;
  lastResult?: string;
}

export interface UserProfile {
  name: string;
  about: string;
  preferences: string;
  updatedAt: number;
}

export interface KnowledgeFile {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string;
  tags: string[];
  chunkCount: number;
  indexedAt?: number;
  createdAt: number;
}

export type AgentStatus = "idle" | "thinking" | "calling" | "searching" | "generating" | "completed" | "error";

export interface ActivityStep {
  id: string;
  type: "planning" | "searching" | "reading" | "tool_call" | "reasoning" | "writing" | "done" | "error";
  label: string;
  detail?: string;
  startTime: number;
  endTime?: number;
  status: "running" | "done" | "error";
}
