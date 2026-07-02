/**
 * Context compression for Alice AI Agent.
 *
 * When the conversation exceeds the context window, this module
 * automatically summarizes older messages to free up space while
 * preserving the most important information.
 */

import type { Message, ProviderConfig } from "./types";
import { estimateMessagesTokens, estimateSystemTokens, estimateTokens } from "./tokens";

export interface CompressionConfig {
  /** Context window size in tokens */
  contextWindow: number;
  /** Start compressing when usage exceeds this ratio (0-1). Default 0.75 */
  compressThreshold: number;
  /** Safety margin in tokens to leave for response. Default 4096 */
  responseBuffer: number;
  /** Maximum messages to keep uncompressed (most recent). Default 10 */
  keepRecent: number;
}

const DEFAULT_CONFIG: CompressionConfig = {
  contextWindow: 128000,
  compressThreshold: 0.75,
  responseBuffer: 4096,
  keepRecent: 10,
};

/**
 * Get context window for a model/provider.
 */
export function getContextWindow(provider?: ProviderConfig, model?: string): number {
  if (provider?.contextWindow && provider.contextWindow > 0) {
    return provider.contextWindow;
  }
  // Model-specific defaults
  if (model) {
    const m = model.toLowerCase();
    if (m.includes("gpt-4o") && !m.includes("mini")) return 128000;
    if (m.includes("gpt-4o-mini") || m.includes("gpt-4.1-mini")) return 128000;
    if (m.includes("gpt-4-turbo") || m.includes("gpt-4.1")) return 128000;
    if (m.includes("o1") || m.includes("o3")) return 128000;
    if (m.includes("claude-sonnet-4") || m.includes("claude-3-5-sonnet") || m.includes("claude-3-opus")) return 200000;
    if (m.includes("claude-3-haiku")) return 200000;
    if (m.includes("gemini-2.5-pro")) return 1000000;
    if (m.includes("gemini-2.0-flash") || m.includes("gemini-1.5")) return 1000000;
    if (m.includes("deepseek")) return 64000;
    if (m.includes("llama-3.3-70b")) return 128000;
    if (m.includes("mixtral")) return 32000;
    if (m.includes("command-r")) return 128000;
  }
  return 128000; // Safe default
}

/**
 * Summarize a batch of messages into a single summary message.
 * This is a local heuristic summary (not AI-generated).
 * For better summaries, we could call the LLM, but that costs tokens.
 */
function summarizeMessagesBatch(messages: Message[]): string {
  const parts: string[] = [];

  for (const msg of messages) {
    if (msg.role === "user") {
      const text = msg.content.slice(0, 300);
      parts.push(`User: ${text}${msg.content.length > 300 ? "..." : ""}`);
    } else if (msg.role === "assistant") {
      if (msg.content) {
        const text = msg.content.slice(0, 300);
        parts.push(`Assistant: ${text}${msg.content.length > 300 ? "..." : ""}`);
      }
      if (msg.toolCalls?.length) {
        const toolNames = msg.toolCalls.map((tc) => tc.name).join(", ");
        parts.push(`  [Called tools: ${toolNames}]`);
      }
    }
    // Skip tool messages in summary — they're too verbose
  }

  return parts.join("\n");
}

/**
 * Compress messages to fit within the context window.
 *
 * Strategy:
 * 1. Keep system prompt + last N messages uncompressed
 * 2. Summarize the oldest chunk of messages into a single summary
 * 3. If still over limit, summarize more aggressively
 * 4. Never drop the most recent user message
 *
 * Returns the compressed message list and a summary message if compression happened.
 */
export function compressMessages(
  messages: Message[],
  systemPrompt: string,
  config: Partial<CompressionConfig> = {},
): { messages: Message[]; compressed: boolean; summary?: string } {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const systemTokens = estimateSystemTokens(systemPrompt);
  const availableTokens = cfg.contextWindow - systemTokens - cfg.responseBuffer;

  // Check if compression is needed
  const totalMessageTokens = estimateMessagesTokens(messages);
  if (totalMessageTokens <= availableTokens * cfg.compressThreshold) {
    return { messages, compressed: false };
  }

  // Need to compress. Strategy: keep recent messages, summarize older ones.
  const { keepRecent } = cfg;

  if (messages.length <= keepRecent + 1) {
    // Too few messages to compress meaningfully
    return { messages, compressed: false };
  }

  // Separate: messages to keep vs messages to summarize
  const keepMessages = messages.slice(-keepRecent);
  const compressMessages = messages.slice(0, -keepRecent);

  // Check if just summarizing the old messages is enough
  const keepTokens = estimateMessagesTokens(keepMessages);
  const budgetLeft = availableTokens - keepTokens;

  if (budgetLeft <= 0) {
    // Even keeping only recent messages is too much — truncate aggressively
    const truncatedKeep = keepMessages.slice(-5);
    const truncatedOld = compressMessages.slice(-5);
    const summary = summarizeMessagesBatch(truncatedOld);

    const summaryMsg: Message = {
      id: `summary_${Date.now()}`,
      role: "user",
      content: `[Context Summary — earlier conversation compressed — read this before responding]\n\n${summary}`,
      createdAt: Date.now(),
    };

    return {
      messages: [summaryMsg, ...truncatedKeep],
      compressed: true,
      summary,
    };
  }

  // Summarize older messages
  const summary = summarizeMessagesBatch(compressMessages);

  const summaryMsg: Message = {
    id: `summary_${Date.now()}`,
    role: "user",
    content: `[Context Summary — ${compressMessages.length} messages compressed — read this before responding]\n\n${summary}`,
    createdAt: Date.now(),
  };

  const result = [summaryMsg, ...keepMessages];

  // Verify compression worked
  const resultTokens = estimateMessagesTokens(result);
  if (resultTokens > availableTokens) {
    // Still too big — be more aggressive, keep only last 3
    const aggressiveKeep = keepMessages.slice(-3);
    const aggressiveResult = [summaryMsg, ...aggressiveKeep];
    return {
      messages: aggressiveResult,
      compressed: true,
      summary,
    };
  }

  return {
    messages: result,
    compressed: true,
    summary,
  };
}

/**
 * Get compression stats for display.
 */
export interface CompressionStats {
  originalCount: number;
  compressedCount: number;
  originalTokens: number;
  compressedTokens: number;
  savedTokens: number;
  savedPercent: number;
}

export function getCompressionStats(
  original: Message[],
  compressed: Message[],
  systemPrompt: string,
): CompressionStats {
  const originalTokens =
    estimateSystemTokens(systemPrompt) + estimateMessagesTokens(original);
  const compressedTokens =
    estimateSystemTokens(systemPrompt) + estimateMessagesTokens(compressed);
  const savedTokens = originalTokens - compressedTokens;

  return {
    originalCount: original.length,
    compressedCount: compressed.length,
    originalTokens,
    compressedTokens,
    savedTokens,
    savedPercent: originalTokens > 0 ? Math.round((savedTokens / originalTokens) * 100) : 0,
  };
}
