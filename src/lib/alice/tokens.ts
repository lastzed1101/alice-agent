/**
 * Token estimation for Alice AI Agent.
 *
 * Uses a heuristic: ~1 token per 4 chars for English, ~1 token per 2 chars for CJK.
 * This is approximate but good enough for context window management.
 * For accurate counting, we could integrate tiktoken later.
 */

import type { Message } from "./types";

// Approximate tokens per character by script
const CJK_RE = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uffef]/;

/**
 * Estimate tokens for a plain text string.
 * ~1 token per 4 chars for Latin text, ~1 token per 2 chars for CJK.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  let count = 0;
  let cjkCount = 0;
  let otherCount = 0;

  for (let i = 0; i < text.length; i++) {
    if (CJK_RE.test(text[i])) {
      cjkCount++;
    } else {
      otherCount++;
    }
  }

  // CJK characters: ~1 token each
  // Latin/other: ~4 chars per token
  count = cjkCount + Math.ceil(otherCount / 4);

  // Add overhead for formatting, newlines, etc.
  count += Math.ceil(count * 0.05);

  return Math.max(1, count);
}

/**
 * Estimate tokens for a single message including role overhead.
 */
export function estimateMessageTokens(msg: Message): number {
  let tokens = 4; // message framing overhead (role, separators)

  // System/user/assistant content
  tokens += estimateTokens(msg.content || "");

  // Reasoning content (for chain-of-thought models)
  if (msg.reasoning) {
    tokens += estimateTokens(msg.reasoning);
  }

  // Tool calls add significant overhead
  if (msg.toolCalls?.length) {
    for (const tc of msg.toolCalls) {
      tokens += 15; // function call overhead
      tokens += estimateTokens(tc.name || "");
      tokens += estimateTokens(tc.args || "");
      if (tc.result) {
        // Tool results are often large, but we truncate them for estimation
        tokens += estimateTokens(tc.result.slice(0, 2000));
      }
    }
  }

  return tokens;
}

/**
 * Estimate total tokens for a list of messages.
 */
export function estimateMessagesTokens(messages: Message[]): number {
  let total = 0;
  for (const msg of messages) {
    total += estimateMessageTokens(msg);
  }
  return total;
}

/**
 * Estimate tokens for the system prompt + context.
 */
export function estimateSystemTokens(systemPrompt: string): number {
  return estimateTokens(systemPrompt);
}

/**
 * Token usage breakdown for display.
 */
export interface TokenBreakdown {
  systemTokens: number;
  messagesTokens: number;
  totalTokens: number;
  toolResultTokens: number;
}

export function computeTokenBreakdown(
  messages: Message[],
  systemPrompt: string,
): TokenBreakdown {
  const systemTokens = estimateSystemTokens(systemPrompt);
  let messagesTokens = 0;
  let toolResultTokens = 0;

  for (const msg of messages) {
    const msgTokens = estimateMessageTokens(msg);
    messagesTokens += msgTokens;

    // Track tool result size separately
    if (msg.role === "tool" && msg.content) {
      toolResultTokens += estimateTokens(msg.content);
    }
  }

  return {
    systemTokens,
    messagesTokens,
    totalTokens: systemTokens + messagesTokens,
    toolResultTokens,
  };
}
