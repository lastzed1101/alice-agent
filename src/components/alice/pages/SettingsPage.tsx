import { useState } from "react";
import {
  Plus,
  Trash2,
  RefreshCw,
  Download,
  Upload,
  Key,
  Globe,
  Server,
  Brain,
  User,
  Database,
  FileJson,
  Check,
} from "lucide-react";
import type { AppSettings, ProviderConfig, UserProfile } from "@/lib/alice/types";
import { discoverModels } from "@/lib/alice/agent";
import { toast } from "sonner";
import { uid, exportAllData, importAllData } from "@/lib/alice/storage";
import { cn } from "@/lib/utils";
import { THEMES, applyTheme } from "@/lib/alice/themes";

interface SettingsPageProps {
  settings: AppSettings;
  providers: ProviderConfig[];
  profile: UserProfile;
  onSave: (s: AppSettings, p: ProviderConfig[], pr: UserProfile) => void;
}

type SettingsTab = "providers" | "general" | "profile" | "data";

const PROVIDER_ICONS: Record<string, string> = {
  openai: "🟢",
  anthropic: "🟠",
  openrouter: "🔀",
  groq: "⚡",
  deepseek: "🔵",
  together: "🤝",
  cohere: "🟣",
  gemini: "💎",
  "9router": "🏠",
};

export function SettingsPage({ settings, providers, profile, onSave }: SettingsPageProps) {
  const [tab, setTab] = useState<SettingsTab>("providers");
  const [s, setS] = useState(settings);
  const [provs, setProvs] = useState(providers);
  const [prof, setProf] = useState(profile);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);

  const tabs = [
    { id: "providers" as const, label: "Providers", icon: Server },
    { id: "general" as const, label: "General", icon: Globe },
    { id: "profile" as const, label: "Profile", icon: User },
    { id: "data" as const, label: "Data", icon: Database },
  ];

  const refresh = async (p: ProviderConfig) => {
    setBusyId(p.id);
    try {
      const m = await discoverModels(p.baseUrl, p.apiKey);
      setProvs((ps) => ps.map((x) => (x.id === p.id ? { ...x, models: m } : x)));
      toast.success(`${p.name}: ${m.length} models discovered`);
    } catch (e) {
      toast.error(`${p.name}: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusyId(null);
    }
  };

  const addCustom = () => {
    const id = uid();
    setProvs((ps) => [
      ...ps,
      {
        id,
        name: "Custom Provider",
        baseUrl: "http://localhost:8000/v1",
        apiKey: "",
        models: [],
      },
    ]);
    setExpandedProvider(id);
  };

  const removeProvider = (id: string) => setProvs((ps) => ps.filter((p) => p.id !== id));

  const updateProvider = (id: string, patch: Partial<ProviderConfig>) =>
    setProvs((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const save = () => {
    onSave(s, provs, { ...prof, updatedAt: Date.now() });
    toast.success("Settings saved");
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Settings</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Manage providers, models, and preferences
          </p>
        </div>
        <button
          onClick={save}
          className="px-4 py-2 bg-[var(--accent-purple)] text-white rounded-lg text-sm font-medium hover:bg-[var(--accent-purple-dark)] transition-colors"
        >
          Save Changes
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs mb-6">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              className={cn("tab flex items-center gap-1.5", tab === t.id && "active")}
              onClick={() => setTab(t.id)}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Providers Tab */}
      {tab === "providers" && (
        <div className="space-y-4">
          {/* Provider Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {provs.map((p) => {
              const isExpanded = expandedProvider === p.id;
              const isActive = s.activeProviderId === p.id;
              return (
                <div
                  key={p.id}
                  className={cn(
                    "manager-card cursor-pointer transition-all",
                    isActive && "border-[var(--accent-purple)] ring-1 ring-[var(--accent-purple)]/20",
                    isExpanded && "md:col-span-2",
                  )}
                  onClick={() => {
                    setExpandedProvider(isExpanded ? null : p.id);
                    // Set as active provider
                    setS({ ...s, activeProviderId: p.id });
                    if ((p.models?.length || 0) > 0 && !s.activeModel) {
                      setS({ ...s, activeProviderId: p.id, activeModel: p.models[0] });
                    }
                  }}
                >
                  <div className="manager-card-header">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{PROVIDER_ICONS[p.id] || "🔧"}</span>
                      <div>
                        <h3 className="manager-card-title text-[var(--text-primary)] text-sm">
                          {p.name}
                        </h3>
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {(p.models?.length || 0)} model{(p.models?.length || 0) !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {isActive && (
                        <span className="text-[10px] bg-[var(--accent-purple)]/10 text-[var(--accent-purple)] px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void refresh(p);
                        }}
                        className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)]"
                        title="Discover models"
                      >
                        <RefreshCw className={cn("h-3.5 w-3.5", busyId === p.id && "animate-spin")} />
                      </button>
                      {!p.builtin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeProvider(p.id);
                          }}
                          className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--red-danger)]"
                          title="Remove"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="mt-3 space-y-3" onClick={(e) => e.stopPropagation()}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-[var(--text-muted)] mb-1 block">Name</label>
                          <input
                            value={p.name}
                            onChange={(e) => updateProvider(p.id, { name: e.target.value })}
                            className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] outline-none focus:border-[var(--accent-purple)]"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-[var(--text-muted)] mb-1 block">Base URL</label>
                          <input
                            value={p.baseUrl}
                            onChange={(e) => updateProvider(p.id, { baseUrl: e.target.value })}
                            className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] outline-none focus:border-[var(--accent-purple)]"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-[var(--text-muted)] mb-1 block flex items-center gap-1">
                            <Key className="h-3 w-3" /> API Key
                          </label>
                          <input
                            type="password"
                            value={p.apiKey}
                            onChange={(e) => updateProvider(p.id, { apiKey: e.target.value })}
                            placeholder="sk-…"
                            className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] outline-none focus:border-[var(--accent-purple)]"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-[var(--text-muted)] mb-1 block">Context Window</label>
                          <input
                            type="number"
                            value={p.contextWindow || ""}
                            onChange={(e) =>
                              updateProvider(p.id, { contextWindow: Number(e.target.value) || undefined })
                            }
                            placeholder="e.g. 128000"
                            className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] outline-none focus:border-[var(--accent-purple)]"
                          />
                        </div>
                      </div>

                      {/* Model selection */}
                      {p.models?.length > 0 && (
                        <div>
                          <label className="text-xs text-[var(--text-muted)] mb-1 block">
                            Models ({p.models?.length || 0})
                          </label>
                          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-auto p-2 bg-[var(--bg-panel-alt)] rounded-lg border border-[var(--border-color)]">
                            {p.models.map((m) => (
                              <button
                                key={m}
                                onClick={() => setS({ ...s, activeProviderId: p.id, activeModel: m })}
                                className={cn(
                                  "text-[10px] px-2 py-1 rounded-lg border transition-all",
                                  s.activeProviderId === p.id && s.activeModel === m
                                    ? "bg-[var(--accent-purple)] text-white border-[var(--accent-purple)]"
                                    : "bg-[var(--bg-panel)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--accent-purple)]",
                                )}
                              >
                                {m}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={addCustom}
            className="flex items-center gap-2 px-4 py-2 border border-dashed border-[var(--border-color)] rounded-lg text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent-purple)] transition-all w-full justify-center"
          >
            <Plus className="h-4 w-4" />
            Add Custom Provider
          </button>

          <p className="text-xs text-[var(--text-muted)]">
            Most cloud providers block direct browser calls via CORS.{" "}
            <strong>OpenRouter</strong> and local providers (like <strong>9router</strong>) allow it.
          </p>
        </div>
      )}

      {/* General Tab */}
      {tab === "general" && (
        <div className="space-y-4 max-w-2xl">
          <div className="manager-card">
            <h3 className="manager-card-title text-[var(--text-primary)] mb-3">System Prompt</h3>
            <textarea
              rows={8}
              value={s.systemPrompt}
              onChange={(e) => setS({ ...s, systemPrompt: e.target.value })}
              className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] outline-none focus:border-[var(--accent-purple)] resize-none font-mono"
            />
          </div>

          <div className="manager-card">
            <h3 className="manager-card-title text-[var(--text-primary)] mb-3">Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[var(--text-muted)] mb-1 block">SearXNG URL</label>
                <input
                  value={s.searxngUrl}
                  onChange={(e) => setS({ ...s, searxngUrl: e.target.value })}
                  placeholder="http://localhost:8080"
                  className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] outline-none focus:border-[var(--accent-purple)]"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)] mb-1 block">Temperature</label>
                <input
                  type="number"
                  min={0}
                  max={2}
                  step={0.1}
                  value={s.temperature}
                  onChange={(e) => setS({ ...s, temperature: Number(e.target.value) })}
                  className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] outline-none focus:border-[var(--accent-purple)]"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)] mb-1 block">Max Tool Steps</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={s.maxToolSteps}
                  onChange={(e) => setS({ ...s, maxToolSteps: Number(e.target.value) })}
                  className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] outline-none focus:border-[var(--accent-purple)]"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)] mb-1 block">Active Model</label>
                <div className="text-sm text-[var(--text-secondary)] bg-[var(--bg-panel-alt)] border border-[var(--border-color)] rounded-lg px-3 py-2">
                  {s.activeModel || "None selected"}
                </div>
              </div>
            </div>
          </div>

          <div className="manager-card">
            <h3 className="manager-card-title text-[var(--text-primary)] mb-3">Appearance</h3>
            <p className="text-xs text-[var(--text-muted)] mb-3">Choose a color theme for Alice</p>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {THEMES.map((t) => {
                const isActive = (s.theme || "electric-blue") === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      setS({ ...s, theme: t.id });
                      applyTheme(t.id);
                    }}
                    className={cn(
                      "relative flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-all hover:scale-105",
                      isActive
                        ? "border-[var(--primary)] ring-1 ring-[var(--primary)]/30 bg-[var(--primary)]/10"
                        : "border-[var(--border-color)] hover:border-[var(--primary)]/50",
                    )}
                  >
                    <div className="flex gap-0.5">
                      <div className="w-3 h-3 rounded-full" style={{ background: t.preview.primary }} />
                      <div className="w-3 h-3 rounded-full" style={{ background: t.preview.accent }} />
                      <div className="w-3 h-3 rounded-full border border-white/10" style={{ background: t.preview.bg }} />
                    </div>
                    <span className="text-[10px] text-[var(--text-secondary)] font-medium">{t.name}</span>
                    {isActive && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--primary)] flex items-center justify-center">
                        <Check className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="manager-card">
            <h3 className="manager-card-title text-[var(--text-primary)] mb-3">Advanced</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm text-[var(--text-secondary)] block">Auto Compress Context</label>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                    Automatically compress old messages when context window is near limit
                  </p>
                </div>
                <button
                  onClick={() => setS({ ...s, autoCompress: s.autoCompress === false ? true : false })}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    s.autoCompress !== false ? "bg-[var(--accent-purple)]" : "bg-[var(--bg-panel-alt)]",
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      s.autoCompress !== false ? "translate-x-6" : "translate-x-1",
                    )}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm text-[var(--text-secondary)] block">Cost Tracking</label>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                    Show estimated cost per conversation based on token usage
                  </p>
                </div>
                <button
                  onClick={() => setS({ ...s, showCostTracking: s.showCostTracking === false ? true : false })}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    s.showCostTracking !== false ? "bg-[var(--accent-purple)]" : "bg-[var(--bg-panel-alt)]",
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      s.showCostTracking !== false ? "translate-x-6" : "translate-x-1",
                    )}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Tab */}
      {tab === "profile" && (
        <div className="space-y-4 max-w-2xl">
          <div className="manager-card">
            <h3 className="manager-card-title text-[var(--text-primary)] mb-3">About You</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[var(--text-muted)] mb-1 block">Name</label>
                <input
                  value={prof.name}
                  onChange={(e) => setProf({ ...prof, name: e.target.value })}
                  placeholder="Your name"
                  className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] outline-none focus:border-[var(--accent-purple)]"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)] mb-1 block">About</label>
                <textarea
                  rows={4}
                  value={prof.about}
                  onChange={(e) => setProf({ ...prof, about: e.target.value })}
                  placeholder="Tell Alice about yourself…"
                  className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] outline-none focus:border-[var(--accent-purple)] resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)] mb-1 block">Preferences</label>
                <textarea
                  rows={4}
                  value={prof.preferences}
                  onChange={(e) => setProf({ ...prof, preferences: e.target.value })}
                  placeholder="How should Alice help you?"
                  className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] outline-none focus:border-[var(--accent-purple)] resize-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data Tab */}
      {tab === "data" && (
        <div className="space-y-4 max-w-2xl">
          <div className="manager-card">
            <div className="flex items-center gap-2 mb-2">
              <Download className="h-4 w-4 text-[var(--accent-purple)]" />
              <h3 className="manager-card-title text-[var(--text-primary)]">Export Data</h3>
            </div>
            <p className="manager-card-desc">
              Download a complete backup of all Alice data (threads, memory, skills, tasks, settings,
              profile, providers).
            </p>
            <button
              onClick={() => {
                const blob = new Blob([exportAllData()], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `alice-backup-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
                toast.success("Data exported");
              }}
              className="mt-3 flex items-center gap-2 px-4 py-2 border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              <FileJson className="h-4 w-4" />
              Export backup (JSON)
            </button>
          </div>

          <div className="manager-card">
            <div className="flex items-center gap-2 mb-2">
              <Upload className="h-4 w-4 text-[var(--yellow-warning)]" />
              <h3 className="manager-card-title text-[var(--text-primary)]">Import Data</h3>
            </div>
            <p className="text-xs text-[var(--red-danger)] font-medium mb-2">
              Warning: This will replace all current data!
            </p>
            <p className="manager-card-desc">
              Upload a previously exported backup file.
            </p>
            <input
              type="file"
              accept=".json"
              className="mt-3 block w-full text-sm text-[var(--text-muted)] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-[var(--bg-panel-alt)] file:text-[var(--text-secondary)] hover:file:bg-[var(--bg-hover)]"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                  const content = ev.target?.result as string;
                  const result = importAllData(content);
                  if (result.errors.length) {
                    toast.error("Import failed: " + result.errors.join(", "));
                  } else {
                    onSave(s, provs, prof);
                    toast.success(`Imported: ${result.imported.join(", ")}`);
                  }
                };
                reader.readAsText(file);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
