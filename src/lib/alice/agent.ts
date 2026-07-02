import type { Message, ProviderConfig, Thread } from "./types";
import { TOOLS_BY_NAME, toolsForApi } from "./tools";
import { loadMemory, loadProfile, loadProviders, loadSkills, uid } from "./storage";
import { estimateMessagesTokens, computeTokenBreakdown, type TokenBreakdown } from "./tokens";
import { compressMessages, getContextWindow } from "./context";
import { calculateCost, formatCost } from "./cost";

export interface AgentDelta {
  type:
    | "text"
    | "reasoning"
    | "tool_call_start"
    | "tool_call_args"
    | "tool_call_run"
    | "tool_call_done"
    | "tool_call_error"
    | "assistant_done"
    | "iter"
    | "error";
  text?: string;
  toolCallId?: string;
  toolName?: string;
  args?: string;
  result?: string;
  error?: string;
}

export interface RunOpts {
  thread: Thread;
  userText: string;
  provider: ProviderConfig;
  model: string;
  systemPrompt: string;
  searxngUrl: string;
  temperature: number;
  maxToolSteps: number;
  signal: AbortSignal;
  onDelta: (d: AgentDelta) => void;
  /** if true, do not append a user message (used by scheduler) */
  skipUserAppend?: boolean;
  /** Auto-compress context when nearing limit */
  autoCompress?: boolean;
  /** Callback when context is compressed */
  onCompress?: (stats: { originalCount: number; compressedCount: number }) => void;
  /** Callback for token/cost updates */
  onTokenUpdate?: (breakdown: TokenBreakdown, cost: string) => void;
}

function buildContextSystem(base: string): string {
  const profile = loadProfile();
  const memory = loadMemory();
  const skills = loadSkills();
  let ctx = base + "\n\n";
  if (profile.name || profile.about || profile.preferences) {
    ctx += `# User Profile\nName: ${profile.name || "(unknown)"}\nAbout: ${profile.about || "(none)"}\nPreferences: ${profile.preferences || "(none)"}\n\n`;
  }
  if (memory.length) {
    ctx += "# Long-term memory (most recent first)\n";
    for (const m of memory.slice(-25).reverse()) ctx += `- [${m.key}] ${m.value}\n`;
    ctx += "\n";
  }
  if (skills.length) {
    ctx += "# Available learned skills (call run_skill to use)\n";
    for (const s of skills) ctx += `- ${s.name} — ${s.description} (trigger: ${s.trigger})\n`;
    ctx += "\n";
  }
  return ctx;
}

interface ApiMsg {
  role: string;
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
  name?: string;
}

function toApiMessages(thread: Thread, system: string, includeUserText?: string): ApiMsg[] {
  const out: ApiMsg[] = [{ role: "system", content: system }];
  for (const m of thread.messages) {
    if (m.role === "assistant") {
      out.push({
        role: "assistant",
        content: m.content || null,
        tool_calls: m.toolCalls?.map((tc) => ({
          id: tc.id,
          type: "function",
          function: { name: tc.name, arguments: tc.args || "{}" },
        })),
      });
    } else if (m.role === "tool") {
      out.push({ role: "tool", tool_call_id: m.toolCallId!, name: m.toolName, content: m.content });
    } else {
      out.push({ role: m.role, content: m.content });
    }
  }
  if (includeUserText !== undefined) out.push({ role: "user", content: includeUserText });
  return out;
}

export async function runAgent(opts: RunOpts) {
  const {
    thread,
    userText,
    provider,
    model,
    systemPrompt,
    searxngUrl,
    temperature,
    maxToolSteps,
    signal,
    onDelta,
    skipUserAppend,
  } = opts;

  if (!skipUserAppend) {
    thread.messages.push({ id: uid(), role: "user", content: userText, createdAt: Date.now() });
  }

  const assistantMsg: Message = {
    id: uid(),
    role: "assistant",
    content: "",
    reasoning: "",
    toolCalls: [],
    createdAt: Date.now(),
  };
  thread.messages.push(assistantMsg);

  const system = buildContextSystem(systemPrompt);
  const contextWindow = getContextWindow(provider, model);
  let cumulativeInputTokens = 0;
  let cumulativeOutputTokens = 0;

  for (let step = 0; step < maxToolSteps; step++) {
    onDelta({ type: "iter", text: String(step + 1) });
    // Context compression: compress messages if nearing limit
    let apiMessages = toApiMessages(thread, system);
    if (opts.autoCompress !== false) {
      const { messages: compressedMsgs, compressed } = compressMessages(
        thread.messages,
        system,
        { contextWindow, compressThreshold: 0.75, responseBuffer: 4096, keepRecent: 10 },
      );
      if (compressed) {
        // Convert compressed messages to API format
        const compressedApiMsgs: ApiMsg[] = [];
        for (const m of compressedMsgs) {
          if (m.role === "assistant") {
            compressedApiMsgs.push({ role: "assistant", content: m.content || null });
          } else if (m.role === "user") {
            compressedApiMsgs.push({ role: "user", content: m.content });
          }
          // Skip tool messages — they're already summarized in the compression summary
        }
        apiMessages = [{ role: "system", content: system }, ...compressedApiMsgs];
        opts.onCompress?.({
          originalCount: thread.messages.length,
          compressedCount: compressedMsgs.length,
        });
      }
    }

    const body = {
      model,
      messages: apiMessages,
      temperature,
      stream: true,
      tools: toolsForApi(),
      tool_choice: "auto" as const,
    };

    let resp: Response | undefined;
    let lastError: Error | null = null;
    const maxRetries = 2;

    // Retry logic for provider API calls
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Try server-side proxy first (hides API keys from browser, fixes CORS on mobile)
        resp = await chatCompletionProxy(provider.id, body, signal);

        if (resp.ok) break; // Success

        const t = await resp.text().catch(() => "");
        lastError = new Error(`provider ${resp.status}: ${t.slice(0, 300)}`);

        // Don't retry on 4xx client errors (except 429 rate limit)
        if (resp.status >= 400 && resp.status < 500 && resp.status !== 429) {
          throw lastError;
        }

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        }
      } catch (e) {
        lastError = e as Error;
        if (attempt >= maxRetries) throw lastError;
      }
    }

    if (!resp || !resp.ok) {
      throw lastError || new Error("Provider request failed");
    }

    // Estimate input tokens from the request body
    const inputTokens = estimateMessagesTokens(thread.messages) + computeTokenBreakdown([], system).systemTokens;
    cumulativeInputTokens += inputTokens;

    if (!resp.body) {
      throw new Error("Provider returned no body");
    }

    // Stream
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let finishReason: string | null = null;
    let stepText = "";
    let stepReasoning = "";
    const stepToolCalls: Array<{ id: string; name: string; args: string }> = [];

    outer: while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        const l = line.trim();
        if (!l.startsWith("data:")) continue;
        const data = l.slice(5).trim();
        if (data === "[DONE]") break outer;
        let json: {
          choices?: Array<{
            delta?: {
              content?: string;
              reasoning_content?: string;
              reasoning?: string;
              tool_calls?: Array<{
                index: number;
                id?: string;
                function?: { name?: string; arguments?: string };
              }>;
            };
            finish_reason?: string | null;
          }>;
        };
        try {
          json = JSON.parse(data);
        } catch {
          continue;
        }
        const choice = json.choices?.[0];
        const delta = choice?.delta;
        if (!delta) continue;
        if (delta.content) {
          stepText += delta.content;
          assistantMsg.content += delta.content;
          onDelta({ type: "text", text: delta.content });
        }
        const reasoning = delta.reasoning_content ?? delta.reasoning;
        if (reasoning) {
          stepReasoning += reasoning;
          assistantMsg.reasoning = (assistantMsg.reasoning ?? "") + reasoning;
          onDelta({ type: "reasoning", text: reasoning });
        }
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0;
            stepToolCalls[idx] = stepToolCalls[idx] ?? { id: "", name: "", args: "" };
            if (tc.id) stepToolCalls[idx].id = tc.id;
            if (tc.function?.name) {
              stepToolCalls[idx].name = tc.function.name;
              const tcId = stepToolCalls[idx].id || `call_${idx}_${Date.now()}`;
              stepToolCalls[idx].id = tcId;
              const existing = assistantMsg.toolCalls!.find((x) => x.id === tcId);
              if (!existing) {
                assistantMsg.toolCalls!.push({
                  id: tcId,
                  name: tc.function.name,
                  args: "",
                  status: "preparing",
                  startedAt: Date.now(),
                });
                onDelta({ type: "tool_call_start", toolCallId: tcId, toolName: tc.function.name });
              }
            }
            if (tc.function?.arguments) {
              stepToolCalls[idx].args += tc.function.arguments;
              const tcId = stepToolCalls[idx].id;
              const existing = assistantMsg.toolCalls!.find((x) => x.id === tcId);
              if (existing) existing.args += tc.function.arguments;
              onDelta({ type: "tool_call_args", toolCallId: tcId, args: tc.function.arguments });
            }
          }
        }
        if (choice.finish_reason) finishReason = choice.finish_reason;
      }
    }

    // Persist accumulated tool_calls on assistant message
    if (stepToolCalls.length === 0) {
      onDelta({ type: "assistant_done" });
      break;
    }

    // Execute each tool call sequentially
    for (const tc of stepToolCalls) {
      const stored = assistantMsg.toolCalls!.find((x) => x.id === tc.id)!;
      stored.args = tc.args;
      stored.status = "running";
      onDelta({ type: "tool_call_run", toolCallId: tc.id, toolName: tc.name, args: tc.args });
      const def = TOOLS_BY_NAME[tc.name];
      let result: string;
      try {
        if (!def) throw new Error(`unknown tool: ${tc.name}`);
        const parsed = tc.args ? JSON.parse(tc.args) : {};
        const r = await def.execute(parsed, { searxngUrl });
        result = typeof r === "string" ? r : JSON.stringify(r);
        stored.status = "done";
        stored.result = result;
        stored.endedAt = Date.now();
        onDelta({ type: "tool_call_done", toolCallId: tc.id, toolName: tc.name, result });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        result = `ERROR: ${msg}`;
        stored.status = "error";
        stored.result = result;
        stored.endedAt = Date.now();
        onDelta({ type: "tool_call_error", toolCallId: tc.id, toolName: tc.name, error: msg });
      }
      thread.messages.push({
        id: uid(),
        role: "tool",
        content: result,
        toolCallId: tc.id,
        toolName: tc.name,
        createdAt: Date.now(),
      });
    }

    // Loop continues to let the model react to tool results.
    if (finishReason && finishReason !== "tool_calls") {
      onDelta({ type: "assistant_done" });
      break;
    }
  }

  // Report final token usage and cost
  const outputTokens = estimateMessagesTokens([assistantMsg]);
  cumulativeOutputTokens += outputTokens;
  const breakdown = computeTokenBreakdown(thread.messages, system);
  const cost = formatCost(calculateCost(cumulativeInputTokens, cumulativeOutputTokens, model));
  opts.onTokenUpdate?.(breakdown, cost);

  return assistantMsg;
}

/**
 * Proxy AI chat completions through the server-side backend.
 * This hides API keys from the browser and fixes CORS issues on mobile.
 * Falls back to direct client-side call if server proxy is unavailable.
 */
async function chatCompletionProxy(
  providerId: string,
  requestBody: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<Response> {
  // Try agent server proxy first (port 3020)
  const agentPortRaw = import.meta.env.VITE_ALICE_AGENT_PORT;
  if (agentPortRaw) {
    try {
      const resp = await fetch(`http://localhost:${agentPortRaw}/api/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId, requestBody }),
        signal,
      });
      if (resp.ok) return resp;
    } catch { /* fall through to direct call */ }
  }
  // Try SSR server function proxy (non-streaming fallback)
  try {
    const { proxyChatCompletion } = await import("./server-backend");
    const result = await proxyChatCompletion({ data: { providerId, requestBody } });
    // Wrap the buffered body in a Response — streaming is lost in SSR mode
    // but the app still functions correctly
    return new Response(result.body, {
      status: result.status,
      headers: result.headers,
    });
  } catch { /* fall through */ }
  // Direct client-side call (last resort fallback)
  const providers = loadProviders();
  const provider = providers.find((p) => p.id === providerId);
  if (!provider) throw new Error(`Provider ${providerId} not found`);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${provider.apiKey || "dummy"}`,
  };
  if (providerId === "openrouter") {
    headers["HTTP-Referer"] = window.location.origin;
    headers["X-Title"] = "Alice";
  }
  return fetch(`${provider.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(requestBody),
    signal,
  });
}

// Discover models from an OpenAI-compatible /models endpoint
// Note: This uses direct client-side calls for model listing (low-risk, no chat data exposed)
export async function discoverModels(baseUrl: string, apiKey: string): Promise<string[]> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
  const r = await fetch(`${baseUrl.replace(/\/$/, "")}/models`, { headers });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  const j = (await r.json()) as { data?: Array<{ id: string }> };
  return (j.data ?? []).map((m) => m.id).sort();
}
