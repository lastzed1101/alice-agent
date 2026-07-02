import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Toaster, toast } from "sonner";
import { Sidebar } from "@/components/alice/Sidebar";
import { SettingsDialog } from "@/components/alice/SettingsDialog";
import { Composer } from "@/components/alice/Composer";
import { MessageView } from "@/components/alice/MessageView";
import { ThinkingSpinner } from "@/components/alice/Spinner";
import { ActivityPanel } from "@/components/alice/ActivityPanel";
import { WelcomeScreen } from "@/components/alice/WelcomeScreen";
import { ThreadsPage } from "@/components/alice/pages/ThreadsPage";
import { ToolsPage } from "@/components/alice/pages/ToolsPage";
import { KnowledgePage } from "@/components/alice/pages/KnowledgePage";
import { SkillsPage } from "@/components/alice/pages/SkillsPage";
import { SchedulePage } from "@/components/alice/pages/SchedulePage";
import { SettingsPage } from "@/components/alice/pages/SettingsPage";
import {
  loadActiveThreadId,
  loadMemory,
  loadProfile,
  loadProviders,
  loadSettings,
  loadSkills,
  loadTasks,
  loadThreads,
  loadKnowledge,
  saveActiveThreadId,
  saveMemory,
  saveProfile,
  saveProviders,
  saveSettings,
  saveSkills,
  saveTasks,
  saveThreads,
  saveKnowledge,
  loadSidebarState,
  saveSidebarState,
  hydrateFromDisk,
  uid,
} from "@/lib/alice/storage";
import type {
  AppSettings,
  MemoryEntry,
  ProviderConfig,
  ScheduledTask,
  Skill,
  Thread,
  UserProfile,
  KnowledgeFile,
  AgentStatus,
  ActivityStep,
} from "@/lib/alice/types";
import { runAgent } from "@/lib/alice/agent";
import { TOOLS_BY_NAME } from "@/lib/alice/tools";
import { startScheduler } from "@/lib/alice/scheduler";
import { pullFromCloud, schedulePush } from "@/lib/alice/cloudSync";
import { applyTheme } from "@/lib/alice/themes";
import { PWAInstallBanner } from "@/components/alice/PWAInstallBanner";
import { useAuth } from "@/lib/alice/auth";
import { AuthPage } from "@/components/alice/AuthPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Alice — your personal AI" },
      {
        name: "description",
        content:
          "A self-improving, multi-provider AI companion with memory, learned skills, tool use, and a scheduler.",
      },
    ],
  }),
  component: AlicePage,
});

type PanelId =
  | "chats"
  | "threads"
  | "skills"
  | "schedule"
  | "knowledge"
  | "tools"
  | "settings";

function AlicePage() {
  const auth = useAuth();

  // Show auth page if Supabase is configured and not logged in
  if (!auth.loading && auth.configured && !auth.session) {
    return <AuthPage />;
  }

  // Show loading while checking auth state
  if (auth.loading) {
    return (
      <div className="grid h-dvh place-items-center text-[var(--text-muted)] text-sm">
        Loading Alice…
      </div>
    );
  }

  const handleLogout = async () => {
    await auth.signOut();
  };

  return (
    <AliceApp
      userEmail={auth.user?.email ?? null}
      onLogout={handleLogout}
    />
  );
}

function AliceApp({
  userEmail,
  onLogout,
}: {
  userEmail: string | null;
  onLogout: () => void;
}) {
  const [hydrated, setHydrated] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [memory, setMemory] = useState<MemoryEntry[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeFile[]>([]);
  const [panel, setPanel] = useState<PanelId>("chats");
  const [busy, setBusy] = useState(false);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>("idle");
  const [tick, setTick] = useState(0);
  const [activitySteps, setActivitySteps] = useState<ActivityStep[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileActivityOpen, setMobileActivityOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [composerText, setComposerText] = useState("");
  const [tokenBreakdown, setTokenBreakdown] = useState<null | { totalTokens: number; systemTokens: number; messagesTokens: number }>(null);
  const [conversationCost, setConversationCost] = useState("");
  const [providerMenuOpen, setProviderMenuOpen] = useState(false);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const providerMenuRef = useRef<HTMLDivElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);
  const sidebarInit = loadSidebarState();
  const [sidebarWidth, setSidebarWidth] = useState(sidebarInit.sidebarWidth);
  const [rightPanelWidth, setRightPanelWidth] = useState(sidebarInit.rightPanelWidth);
  const [leftCollapsed, setLeftCollapsed] = useState(sidebarInit.leftCollapsed);
  const [rightCollapsed, setRightCollapsed] = useState(sidebarInit.rightCollapsed);

  const sidebarDragRef = useRef<{ startX: number; startW: number } | null>(null);
  const rightDragRef = useRef<{ startX: number; startW: number } | null>(null);

  // Resize handlers
  const toggleLeftSidebar = useCallback(() => {
    setLeftCollapsed((prev) => !prev);
  }, []);

  const toggleRightPanel = useCallback(() => {
    setRightCollapsed((prev) => !prev);
  }, []);

  const onSidebarDragStart = useCallback(
    (e: React.MouseEvent) => {
      if (leftCollapsed) return;
      e.preventDefault();
      sidebarDragRef.current = { startX: e.clientX, startW: sidebarWidth };
      const onMove = (ev: MouseEvent) => {
        if (!sidebarDragRef.current) return;
        const delta = ev.clientX - sidebarDragRef.current.startX;
        setSidebarWidth(Math.max(200, Math.min(400, sidebarDragRef.current.startW + delta)));
      };
      const onUp = () => {
        sidebarDragRef.current = null;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [sidebarWidth, leftCollapsed],
  );

  const onRightDragStart = useCallback(
    (e: React.MouseEvent) => {
      if (rightCollapsed) return;
      e.preventDefault();
      rightDragRef.current = { startX: e.clientX, startW: rightPanelWidth };
      const onMove = (ev: MouseEvent) => {
        if (!rightDragRef.current) return;
        const delta = rightDragRef.current.startX - ev.clientX;
        setRightPanelWidth(Math.max(240, Math.min(500, rightDragRef.current.startW + delta)));
      };
      const onUp = () => {
        rightDragRef.current = null;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [rightPanelWidth, rightCollapsed],
  );

  // Thread handlers
  const handleRename = (id: string, newTitle: string) => {
    setThreads((prev) =>
      prev.map((t) => (t.id === id ? { ...t, title: newTitle, updatedAt: Date.now() } : t)),
    );
    toast.success("Thread renamed");
  };

  const handleTogglePin = (id: string) => {
    setThreads((prev) =>
      prev.map((t) => (t.id === id ? { ...t, pinned: !t.pinned, updatedAt: Date.now() } : t)),
    );
  };

  // Hydrate
  useEffect(() => {
    (async () => {
      // First: load from localStorage (instant)
      const t = loadThreads();
      let aid = loadActiveThreadId();
      if (!t.find((x) => x.id === aid)) aid = t[0]?.id ?? null;
      setThreads(t);
      setActiveId(aid);
      setProviders(loadProviders());
      setSettings(loadSettings());
      setMemory(loadMemory());
      setProfile(loadProfile());
      setSkills(loadSkills());
      setTasks(loadTasks());
      setKnowledge(loadKnowledge());
      setHydrated(true);
      startScheduler();
      // Apply theme from settings
      const loadedSettings = loadSettings();
      applyTheme(loadedSettings.theme || "default");

      // Second: pull latest from disk (~/.alice/data/) and re-hydrate
      try {
        await hydrateFromDisk();
        setProviders(loadProviders());
        setSettings(loadSettings());
        setThreads(loadThreads());
        setMemory(loadMemory());
        setProfile(loadProfile());
        setSkills(loadSkills());
        setTasks(loadTasks());
        setKnowledge(loadKnowledge());
      } catch {
        // Agent server not running — localStorage is enough
      }

      // Third: pull from cloud (Supabase) if cloud sync is enabled in settings
      const currentSettings = loadSettings();
      if (currentSettings.cloudSync) {
        try {
          const r = await pullFromCloud();
          if (r.source === "cloud") {
            setProviders(loadProviders());
            setSettings(loadSettings());
            setThreads(loadThreads());
            setMemory(loadMemory());
            setProfile(loadProfile());
            setSkills(loadSkills());
            setTasks(loadTasks());
            setKnowledge(loadKnowledge());
            toast.success("Synced from cloud");
          } else if (r.source === "local-seed") {
            toast.info("Cloud seeded with local data");
          }
        } catch (e) {
          console.warn("[cloudSync] startup pull failed:", (e as Error).message);
        }
      }
    })();
  }, []);

  // Periodic refresh
  useEffect(() => {
    const i = setInterval(() => {
      setMemory(loadMemory());
      setSkills(loadSkills());
      setTasks(loadTasks());
      setKnowledge(loadKnowledge());
    }, 2000);
    return () => clearInterval(i);
  }, []);

  // Persist
  useEffect(() => {
    if (hydrated) {
      saveThreads(threads);
      schedulePush();
    }
  }, [threads, hydrated]);
  useEffect(() => {
    if (hydrated) {
      saveActiveThreadId(activeId);
      schedulePush();
    }
  }, [activeId, hydrated]);
  useEffect(() => {
    if (hydrated) {
      saveProviders(providers);
      schedulePush();
    }
  }, [providers, hydrated]);
  useEffect(() => {
    if (hydrated && settings) {
      saveSettings(settings);
      schedulePush();
    }
  }, [settings, hydrated]);
  useEffect(() => {
    if (hydrated) {
      saveMemory(memory);
      schedulePush();
    }
  }, [memory, hydrated]);
  useEffect(() => {
    if (hydrated && profile) {
      saveProfile(profile);
      schedulePush();
    }
  }, [profile, hydrated]);
  useEffect(() => {
    if (hydrated) {
      saveSkills(skills);
      schedulePush();
    }
  }, [skills, hydrated]);
  useEffect(() => {
    if (hydrated) {
      saveTasks(tasks);
      schedulePush();
    }
  }, [tasks, hydrated]);

  // Persist sidebar layout state
  useEffect(() => {
    if (hydrated) {
      saveSidebarState({ leftCollapsed, rightCollapsed, sidebarWidth, rightPanelWidth });
    }
  }, [leftCollapsed, rightCollapsed, sidebarWidth, rightPanelWidth, hydrated]);

  // Apply theme when settings change
  useEffect(() => {
    if (settings) {
      applyTheme(settings.theme || "default");
    }
  }, [settings?.theme]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (providerMenuRef.current && !providerMenuRef.current.contains(e.target as Node)) {
        setProviderMenuOpen(false);
      }
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) {
        setModelMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Auto-scroll
  const active = useMemo(
    () => threads.find((t) => t.id === activeId) ?? null,
    [threads, activeId],
  );
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [active?.messages.length, tick]);

  const newChat = useCallback(() => {
    const t: Thread = {
      id: uid(),
      title: "New chat",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
      providerId: settings?.activeProviderId,
      model: settings?.activeModel,
    };
    setThreads((cur) => [t, ...cur]);
    setActiveId(t.id);
    setPanel("chats");
  }, [settings]);

  const deleteThread = (id: string) => {
    setThreads((cur) => {
      const next = cur.filter((t) => t.id !== id);
      if (activeId === id) setActiveId(next[0]?.id ?? null);
      return next;
    });
  };

  const ensureActive = useCallback((): Thread => {
    if (active) return active;
    const t: Thread = {
      id: uid(),
      title: "New chat",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
      providerId: settings?.activeProviderId,
      model: settings?.activeModel,
    };
    setThreads((cur) => [t, ...cur]);
    setActiveId(t.id);
    return t;
  }, [active, settings]);

  // Helper to add activity step
  const addActivityStep = useCallback(
    (step: Omit<ActivityStep, "id" | "startTime">) => {
      setActivitySteps((prev) => [
        ...prev,
        { ...step, id: uid(), startTime: Date.now() },
      ]);
    },
    [],
  );

  const updateLastActivity = useCallback((patch: Partial<ActivityStep>) => {
    setActivitySteps((prev) => {
      const next = [...prev];
      if (next.length > 0) {
        const last = next[next.length - 1];
        next[next.length - 1] = { ...last, ...patch, endTime: Date.now() };
      }
      return next;
    });
  }, []);

  // BUG FIX #5: Send message reuses conversation_id
  const sendMessage = useCallback(
    async (text: string) => {
      if (!settings) return;
      // Always use the global provider/model from the header dropdown
      const thread = ensureActive();
      const providerId = settings.activeProviderId;
      const model = settings.activeModel;
      const provider = providers.find((p) => p.id === providerId);
      if (!provider) {
        toast.error("Pick a provider in Settings");
        return;
      }
      if (!model) {
        toast.error("Pick a model");
        return;
      }

      // Store current provider/model on thread for display purposes
      thread.providerId = providerId;
      thread.model = model;

      if (thread.messages.length === 0) {
        thread.title = text.slice(0, 60);
      }

      setBusy(true);
      setAgentStatus("thinking");
      setActivitySteps([]);
      addActivityStep({ type: "planning", label: "Planning", status: "running" });
      const ac = new AbortController();
      abortRef.current = ac;

      try {
        await runAgent({
          thread,
          userText: text,
          provider,
          model,
          systemPrompt: settings.systemPrompt,
          searxngUrl: settings.searxngUrl,
          temperature: settings.temperature,
          maxToolSteps: settings.maxToolSteps,
          signal: ac.signal,
          autoCompress: settings.autoCompress !== false,
          onCompress: (stats) => {
            toast.info(`Context compressed: ${stats.originalCount} → ${stats.compressedCount} messages`);
          },
          onTokenUpdate: (breakdown, cost) => {
            setTokenBreakdown(breakdown);
            setConversationCost(cost);
          },
          onDelta: (d) => {
            switch (d.type) {
              case "tool_call_start":
              case "tool_call_run": {
                const toolName = d.toolName || "";
                const isSearch = toolName.toLowerCase().includes("search");
                setAgentStatus(isSearch ? "searching" : "calling");
                updateLastActivity({ status: "done", endTime: Date.now() });
                addActivityStep({
                  type: isSearch ? "searching" : "tool_call",
                  label: isSearch ? `Searching: ${toolName}` : `Tool: ${toolName}`,
                  detail: d.args ? d.args.slice(0, 200) : undefined,
                  status: "running",
                });
                break;
              }
              case "text":
              case "reasoning":
                if (d.text && d.text.length > 0) {
                  setAgentStatus("generating");
                  updateLastActivity({ status: "done", endTime: Date.now() });
                  addActivityStep({
                    type: d.type === "reasoning" ? "reasoning" : "writing",
                    label: d.type === "reasoning" ? "Reasoning" : "Writing response",
                    status: "running",
                  });
                }
                break;
              case "tool_call_done":
              case "tool_call_error":
                updateLastActivity({
                  status: d.type === "tool_call_error" ? "error" : "done",
                  endTime: Date.now(),
                });
                break;
              case "assistant_done":
                updateLastActivity({ status: "done", endTime: Date.now() });
                addActivityStep({ type: "done", label: "Completed", status: "done" });
                setAgentStatus("completed");
                break;
              case "error":
                updateLastActivity({ status: "error", endTime: Date.now() });
                setAgentStatus("error");
                break;
              default:
                break;
            }
            setTick((n) => n + 1);
          },
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.toLowerCase().includes("abort")) {
          const last = thread.messages[thread.messages.length - 1];
          if (last?.role === "assistant")
            last.content = (last.content || "") + "\n\n_…stopped._";
        } else {
          toast.error(msg);
          thread.messages.push({
            id: uid(),
            role: "assistant",
            content: `**Error:** ${msg}`,
            createdAt: Date.now(),
          });
        }
      } finally {
        thread.updatedAt = Date.now();
        setThreads((cur) => [...cur]);
        setBusy(false);
        setAgentStatus("idle");
        abortRef.current = null;
      }
    },
    [providers, settings, ensureActive, addActivityStep, updateLastActivity],
  );

  const onAbort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleCopy = (msgId: string, content: string) => {
    navigator.clipboard
      .writeText(content)
      .then(() => toast.success("Copied"))
      .catch(() => toast.error("Failed to copy"));
  };

  const handleEdit = (msgId: string, newContent: string) => {
    if (!active) return;
    setThreads((prev) =>
      prev.map((t) =>
        t.id === activeId
          ? {
              ...t,
              messages: t.messages.map((m) =>
                m.id === msgId ? { ...m, content: newContent, edited: true } : m,
              ),
            }
          : t,
      ),
    );
    toast.success("Message edited");
  };

  const handleRetry = async (msgId: string) => {
    if (!active || !settings) return;
    const idx = active.messages.findIndex((m) => m.id === msgId);
    if (idx === -1) return;
    const preceding = active.messages[idx - 1];
    if (!preceding || preceding.role !== "user") {
      toast.error("Cannot retry: no preceding user message");
      return;
    }
    active.messages = active.messages.slice(0, idx);
    setThreads((prev) => [...prev]);

    const providerId = settings.activeProviderId;
    const model = settings.activeModel;
    const provider = providers.find((p) => p.id === providerId);
    if (!provider) {
      toast.error("Pick a provider");
      return;
    }

    setBusy(true);
    setAgentStatus("thinking");
    setActivitySteps([]);
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      await runAgent({
        thread: active,
        userText: preceding.content,
        provider,
        model,
        systemPrompt: settings.systemPrompt,
        searxngUrl: settings.searxngUrl,
        temperature: settings.temperature,
        maxToolSteps: settings.maxToolSteps,
        signal: ac.signal,
        skipUserAppend: true,
        onDelta: (d) => {
          switch (d.type) {
            case "tool_call_start":
            case "tool_call_run":
              setAgentStatus(
                (d.toolName || "").toLowerCase().includes("search") ? "searching" : "calling",
              );
              break;
            case "text":
            case "reasoning":
              if (d.text && d.text.length > 0) setAgentStatus("generating");
              break;
            case "assistant_done":
              setAgentStatus("completed");
              break;
            case "error":
              setAgentStatus("error");
              break;
          }
          setTick((n) => n + 1);
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.toLowerCase().includes("abort")) {
        const last = active.messages[active.messages.length - 1];
        if (last?.role === "assistant")
          last.content = (last.content || "") + "\n\n_…stopped._";
      } else {
        toast.error(msg);
      }
    } finally {
      active.updatedAt = Date.now();
      setThreads((cur) => [...cur]);
      setBusy(false);
      setAgentStatus("idle");
      abortRef.current = null;
    }
  };

  const handleFork = useCallback((msgId: string) => {
    if (!active) return;
    const idx = active.messages.findIndex((m) => m.id === msgId);
    if (idx === -1) return;
    // Create a new thread with messages up to and including the fork point
    const forkedMessages = active.messages.slice(0, idx + 1).map((m) => ({
      ...m,
      id: uid(),
      toolCalls: m.toolCalls?.map((tc) => ({ ...tc })),
    }));
    const t: Thread = {
      id: uid(),
      title: `${active.title} (fork)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: forkedMessages,
      providerId: active.providerId,
      model: active.model,
    };
    setThreads((cur) => [t, ...cur]);
    setActiveId(t.id);
    setPanel("chats");
    toast.success("Thread forked");
  }, [active]);

  const handleFeedback = (msgId: string, type: "like" | "dislike") => {
    if (!active) return;
    setThreads((prev) =>
      prev.map((t) =>
        t.id === activeId
          ? {
              ...t,
              messages: t.messages.map((m) => {
                if (m.id !== msgId) return m;
                return type === "like"
                  ? { ...m, liked: !m.liked, disliked: false }
                  : { ...m, liked: false, disliked: !m.disliked };
              }),
            }
          : t,
      ),
    );
  };

  if (!hydrated || !settings || !profile) {
    return (
      <div className="grid h-dvh place-items-center text-[var(--text-muted)] text-sm">
        Loading Alice…
      </div>
    );
  }

  // Always use global provider/model from header dropdown
  const activeProviderId = settings.activeProviderId;
  const activeModel = settings.activeModel;
  const provider = providers.find((p) => p.id === activeProviderId);
  const ready = !!provider && !!activeModel;

  const showLiveSpinner =
    busy &&
    active &&
    (() => {
      const last = active.messages[active.messages.length - 1];
      return (
        !last ||
        last.role === "user" ||
        (last.role === "assistant" && !last.content && !last.toolCalls?.length)
      );
    })();

  // Render workspace content based on active panel
  const renderWorkspace = () => {
    switch (panel) {
      case "threads":
        return (
          <ThreadsPage
            threads={threads}
            activeId={activeId}
            onSelect={(id) => {
              setActiveId(id);
              setPanel("chats");
            }}
            onNew={newChat}
            onDelete={deleteThread}
            onRename={handleRename}
          />
        );
      case "tools":
        return <ToolsPage />;
      case "knowledge":
        return (
          <KnowledgePage
            files={knowledge}
            onUpload={(f) => {
              const n = [...knowledge, f];
              setKnowledge(n);
              saveKnowledge(n);
            }}
            onDelete={(id) => {
              const n = knowledge.filter((f) => f.id !== id);
              setKnowledge(n);
              saveKnowledge(n);
            }}
          />
        );
      case "skills":
        return (
          <SkillsPage
            skills={skills}
            onToggle={(id) => {
              const n = skills.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s));
              setSkills(n);
              saveSkills(n);
            }}
            onDelete={(id) => {
              const n = skills.filter((s) => s.id !== id);
              setSkills(n);
              saveSkills(n);
            }}
            onCreate={(s) => {
              const n = [...skills, s];
              setSkills(n);
              saveSkills(n);
            }}
          />
        );
      case "schedule":
        return (
          <SchedulePage
            tasks={tasks}
            onToggle={(id) => {
              const n = tasks.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t));
              setTasks(n);
              saveTasks(n);
            }}
            onDelete={(id) => {
              const n = tasks.filter((t) => t.id !== id);
              setTasks(n);
              saveTasks(n);
            }}
            onRunNow={(id) => {
              const n = tasks.map((t) => (t.id === id ? { ...t, nextRun: Date.now() } : t));
              setTasks(n);
              saveTasks(n);
            }}
            onAdd={(t) => {
              const n = [...tasks, t];
              setTasks(n);
              saveTasks(n);
            }}
          />
        );
      case "settings":
        return (
          <SettingsPage
            settings={settings}
            providers={providers}
            profile={profile}
            onSave={(s, p, pr) => {
              setSettings(s);
              setProviders(p);
              setProfile(pr);
              saveProviders(p);
              saveSettings(s);
              saveProfile(pr);
            }}
          />
        );
      default:
        // "chats" - show chat workspace
        return (
          <>
            {/* CHAT MESSAGES */}
            <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-[var(--bg-chat)]">
              <div className="mx-auto w-full px-3 sm:px-4 md:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6" style={{ maxWidth: leftCollapsed && rightCollapsed ? 760 : 960 }}>
                {!active || active.messages.length === 0 ? (
                  <WelcomeScreen onAction={(prompt) => setComposerText(prompt)} disabled={!ready} />
                ) : (
                  active.messages.map((m, i) => (
                    <MessageView
                      key={m.id}
                      msg={m}
                      live={busy && i === active.messages.length - 1}
                      onCopy={handleCopy}
                      onEdit={handleEdit}
                      onRetry={handleRetry}
                      onFeedback={handleFeedback}
                      onFork={handleFork}
                    />
                  ))
                )}
                {showLiveSpinner && <ThinkingSpinner />}
              </div>
            </div>

            {/* COMPOSER */}
            <div className="shrink-0 bg-[var(--bg-dark)] px-3 sm:px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] sm:py-3 border-t border-[var(--border-color)]/30">
              <div className="mx-auto" style={{ maxWidth: leftCollapsed && rightCollapsed ? 760 : 960 }}>
                <Composer
                  value={composerText}
                  onChange={setComposerText}
                  onSend={sendMessage}
                  onAbort={onAbort}
                  busy={busy}
                  disabled={!ready}
                />
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="app-layout">
      {/* LEFT SIDEBAR - desktop only */}
      <div
        className="app-sidebar hidden md:flex"
        style={{ width: leftCollapsed ? 72 : sidebarWidth, minWidth: leftCollapsed ? 72 : 200, overflow: 'hidden' }}
      >
        <Sidebar
          threads={threads}
          activeId={activeId}
          onSelect={(id) => {
            setActiveId(id);
            setPanel("chats");
            setActivitySteps([]);
          }}
          onNew={newChat}
          onDelete={deleteThread}
          onRename={handleRename}
          onTogglePin={handleTogglePin}
          panel={panel}
          onPanel={(p) => setPanel(p as PanelId)}
          collapsed={leftCollapsed}
          onToggleCollapse={toggleLeftSidebar}
          settings={settings}
          provider={provider}
          busy={busy}
          agentStatus={agentStatus}
          userEmail={userEmail}
          onLogout={onLogout}
        />
      </div>

      {/* RESIZE HANDLE - Sidebar (desktop only) */}
      <div
        className="resize-handle hidden md:block"
        onMouseDown={onSidebarDragStart}
        style={{ pointerEvents: leftCollapsed ? 'none' : undefined, opacity: leftCollapsed ? 0 : 1 }}
      />

      {/* MAIN WORKSPACE */}
      <div className="app-workspace min-h-0">
        {/* TOP BAR */}
        <header className="flex items-center justify-between px-2 sm:px-4 py-2 border-b border-[var(--border-color)] bg-[var(--bg-panel)] shrink-0 min-h-11 sm:min-h-12 relative z-30">
          <div className="flex items-center gap-2">
            {/* Mobile hamburger */}
            <button
              className="md:hidden text-[var(--text-muted)] hover:text-[var(--text-primary)] p-2 -ml-1 rounded-lg active:bg-[var(--bg-hover)]"
              onClick={() => setSidebarOpen(true)}
              style={{ minWidth: 44, minHeight: 44 }}
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
            <div className="flex items-center gap-2">
              {/* Provider selector */}
              <div className="relative" ref={providerMenuRef}>
                <button
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-[var(--bg-hover)] transition-colors text-xs"
                  onClick={() => { setProviderMenuOpen(!providerMenuOpen); setModelMenuOpen(false); }}
                >
                  <div className="h-5 w-5 rounded bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold">
                    {provider?.name?.charAt(0) || 'A'}
                  </div>
                  <span className="text-[var(--text-secondary)] font-medium max-w-[100px] truncate">
                    {provider?.name || 'No provider'}
                  </span>
                  <svg className="h-3 w-3 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {providerMenuOpen && (
                  <div className="absolute top-full left-0 mt-1 w-56 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-lg shadow-xl z-50 py-1 alice-scale-in">
                    {providers.map((p) => (
                      <button
                        key={p.id}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[var(--bg-hover)] transition-colors ${p.id === activeProviderId ? 'text-[var(--accent-purple)]' : 'text-[var(--text-secondary)]'}`}
                        onClick={() => {
                          if (p.models.length > 0) {
                            setSettings((s) => s ? { ...s, activeProviderId: p.id, activeModel: p.models[0] } : s);
                          } else {
                            setSettings((s) => s ? { ...s, activeProviderId: p.id } : s);
                          }
                          setProviderMenuOpen(false);
                        }}
                      >
                        <div className="h-5 w-5 rounded bg-gradient-to-br from-purple-500/50 to-purple-600/50 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                          {p.name.charAt(0)}
                        </div>
                        <span className="truncate font-medium">{p.name}</span>
                        {p.id === activeProviderId && (
                          <svg className="h-3.5 w-3.5 ml-auto text-[var(--accent-purple)]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                          </svg>
                        )}
                      </button>
                    ))}
                    <div className="border-t border-[var(--border-color)] mt-1 pt-1">
                      <button
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)] transition-colors"
                        onClick={() => { setProviderMenuOpen(false); setSettingsOpen(true); }}
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Manage providers…
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Model selector */}
              <div className="relative" ref={modelMenuRef}>
                <button
                  className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-[var(--bg-hover)] transition-colors text-xs"
                  onClick={() => { setModelMenuOpen(!modelMenuOpen); setProviderMenuOpen(false); }}
                >
                  <span className="text-[var(--text-primary)] font-medium max-w-[140px] truncate">
                    {activeModel || 'No model'}
                  </span>
                  <svg className="h-3 w-3 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {modelMenuOpen && (
                  <div className="absolute top-full left-0 mt-1 w-64 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-lg shadow-xl z-50 py-1 alice-scale-in">
                    <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                      {provider?.name || 'Select provider first'}
                    </div>
                    {provider?.models.map((m) => (
                      <button
                        key={m}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[var(--bg-hover)] transition-colors ${m === activeModel ? 'text-[var(--accent-purple)]' : 'text-[var(--text-secondary)]'}`}
                        onClick={() => {
                          setSettings((s) => s ? { ...s, activeModel: m } : s);
                          setModelMenuOpen(false);
                        }}
                      >
                        <span className="truncate font-medium font-mono">{m}</span>
                        {m === activeModel && (
                          <svg className="h-3.5 w-3.5 ml-auto text-[var(--accent-purple)]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                          </svg>
                        )}
                      </button>
                    ))}
                    {(!provider || provider.models.length === 0) && (
                      <div className="px-3 py-3 text-xs text-[var(--text-muted)]">
                        No models loaded. Go to Settings to discover models.
                      </div>
                    )}
                  </div>
                )}
              </div>
          </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1 text-xs text-[var(--text-muted)] bg-[var(--bg-panel-alt)] border border-[var(--border-color)] rounded-md px-2 py-1">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search…"
                className="bg-transparent border-none outline-none w-24 text-[var(--text-secondary)]"
              />
            </div>
            {/* Right panel toggle - desktop */}
            <button
              className="hidden md:flex text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] p-1.5 rounded-md transition-colors"
              onClick={toggleRightPanel}
              title={rightCollapsed ? 'Show activity panel' : 'Hide activity panel'}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={rightCollapsed ? 'M11 19l-7-7 7-7M19 19l-7-7 7-7' : 'M13 5l7 7-7 7M5 5l7 7-7 7'} />
              </svg>
            </button>
            {/* Activity toggle - mobile */}
            <button
              className="md:hidden text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] p-1.5 rounded-md transition-colors"
              onClick={() => setMobileActivityOpen(!mobileActivityOpen)}
              title="Activity"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <div className="flex items-center gap-1">
              <div className={`status-dot ${agentStatus}`} />
              <span className="text-xs text-[var(--text-muted)] hidden xl:inline capitalize">
                {agentStatus}
              </span>
            </div>
          </div>
        </header>

        {/* WORKSPACE CONTENT */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">{renderWorkspace()}</div>
      </div>

      {/* RESIZE HANDLE - Right Panel (desktop only) */}
      <div
        className="resize-handle hidden md:block"
        onMouseDown={onRightDragStart}
        style={{ pointerEvents: rightCollapsed ? 'none' : undefined, opacity: rightCollapsed ? 0 : 1 }}
      />

      {/* RIGHT PANEL - Activity (desktop only) */}
      <div
        className="app-right-panel hidden md:flex"
        style={{ width: rightCollapsed ? 0 : rightPanelWidth, minWidth: rightCollapsed ? 0 : 240, overflow: rightCollapsed ? 'hidden' : undefined, borderLeft: rightCollapsed ? 'none' : undefined }}
      >
        <ActivityPanel
          steps={activitySteps}
          agentStatus={agentStatus}
          toolCalls={active?.messages?.slice().reverse().find((m) => m.role === "assistant")?.toolCalls || []}
          memory={memory}
          thread={active}
          provider={provider}
          activeModel={activeModel}
          tokenBreakdown={tokenBreakdown}
          conversationCost={conversationCost}
        />
      </div>

      {/* MOBILE ACTIVITY PANEL - slide-over from right */}
      {mobileActivityOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-sm" onClick={() => setMobileActivityOpen(false)} />
          <aside className="absolute right-0 top-0 h-full w-[85vw] max-w-[320px] flex flex-col bg-[var(--sidebar-right-bg)] border-l border-[var(--border-color)] shadow-2xl z-20">
            <div className="flex-1 overflow-hidden">
              <ActivityPanel
                steps={activitySteps}
                agentStatus={agentStatus}
                toolCalls={active?.messages?.slice().reverse().find((m) => m.role === "assistant")?.toolCalls || []}
                memory={memory}
                thread={active}
                provider={provider}
                activeModel={activeModel}
                tokenBreakdown={tokenBreakdown}
                conversationCost={conversationCost}
              />
            </div>
          </aside>
        </div>
      )}

      {/* MOBILE SIDEBAR OVERLAY - outside app-sidebar so it's not hidden by display:none */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-[80vw] max-w-[300px] flex flex-col bg-[var(--bg-panel)] border-r border-[var(--border-color)] shadow-2xl z-20">
            <Sidebar
              threads={threads}
              activeId={activeId}
              onSelect={(id) => {
                setActiveId(id);
                setPanel("chats");
                setSidebarOpen(false);
              }}
              onNew={newChat}
              onDelete={deleteThread}
              onRename={handleRename}
              onTogglePin={handleTogglePin}
              panel={panel}
              onPanel={(p) => {
                setPanel(p as PanelId);
                setSidebarOpen(false);
              }}
              settings={settings}
              provider={provider}
              busy={busy}
              agentStatus={agentStatus}
              userEmail={userEmail}
              onLogout={onLogout}
            />
          </aside>
        </div>
      )}

      {/* SETTINGS DIALOG (legacy, kept for backward compat) */}
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        providers={providers}
        profile={profile!}
        onSave={(s, p, pr) => {
          setSettings(s);
          setProviders(p);
          setProfile(pr);
          saveProfile(pr);
        }}
      />

      <Toaster theme="dark" position="top-center" />
      <PWAInstallBanner />
    </div>
  );
}
