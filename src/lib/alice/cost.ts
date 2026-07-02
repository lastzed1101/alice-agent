/**
 * Cost tracking for Alice AI Agent.
 *
 * Tracks estimated cost per conversation based on token usage
 * and model-specific pricing.
 */

export interface ModelPricing {
  /** Cost per 1M input tokens (USD) */
  input: number;
  /** Cost per 1M output tokens (USD) */
  output: number;
}

/** Pricing for common models (USD per 1M tokens) */
export const MODEL_PRICING: Record<string, ModelPricing> = {
  // OpenAI
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4-turbo": { input: 10, output: 30 },
  "gpt-4": { input: 30, output: 60 },
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
  "gpt-4.1": { input: 2, output: 8 },
  "o1": { input: 15, output: 60 },
  "o1-mini": { input: 3, output: 12 },
  "o3-mini": { input: 1.1, output: 4.4 },

  // Anthropic
  "claude-sonnet-4-20250514": { input: 3, output: 15 },
  "claude-3-5-sonnet-20241022": { input: 3, output: 15 },
  "claude-3-5-sonnet-latest": { input: 3, output: 15 },
  "claude-3-opus-20240229": { input: 15, output: 75 },
  "claude-3-haiku-20240307": { input: 0.25, output: 1.25 },

  // Google Gemini
  "gemini-2.0-flash": { input: 0.1, output: 0.4 },
  "gemini-2.5-pro": { input: 1.25, output: 10 },
  "gemini-1.5-pro": { input: 1.25, output: 5 },

  // Groq
  "llama-3.3-70b-versatile": { input: 0.59, output: 0.79 },
  "mixtral-8x7b-32768": { input: 0.24, output: 0.24 },

  // DeepSeek
  "deepseek-chat": { input: 0.14, output: 0.28 },
  "deepseek-coder": { input: 0.14, output: 0.28 },

  // Cohere
  "command-r-plus": { input: 2.5, output: 10 },
};

/** Fallback pricing for unknown models */
const DEFAULT_PRICING: ModelPricing = { input: 1, output: 3 };

/**
 * Get pricing for a model, falling back to defaults.
 */
export function getModelPricing(model: string): ModelPricing {
  // Try exact match first
  if (MODEL_PRICING[model]) return MODEL_PRICING[model];

  // Try partial match (e.g. "openai/gpt-4o" matches "gpt-4o")
  const modelLower = model.toLowerCase();
  for (const [key, pricing] of Object.entries(MODEL_PRICING)) {
    if (modelLower.includes(key)) return pricing;
  }

  return DEFAULT_PRICING;
}

/**
 * Calculate cost for token usage.
 */
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  model: string,
): number {
  const pricing = getModelPricing(model);
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}

/**
 * Format cost for display.
 */
export function formatCost(cost: number): string {
  if (cost < 0.001) return "<$0.001";
  if (cost < 0.01) return `$${cost.toFixed(3)}`;
  if (cost < 1) return `$${cost.toFixed(2)}`;
  return `$${cost.toFixed(2)}`;
}

/**
 * Conversation cost tracker.
 */
export interface ConversationCost {
  /** Total input tokens consumed */
  inputTokens: number;
  /** Total output tokens consumed */
  outputTokens: number;
  /** Total cost in USD */
  totalCost: number;
  /** Number of API calls made */
  apiCalls: number;
}

export function createCostTracker(): ConversationCost {
  return { inputTokens: 0, outputTokens: 0, totalCost: 0, apiCalls: 0 };
}

export function recordApiCall(
  cost: ConversationCost,
  inputTokens: number,
  outputTokens: number,
  model: string,
): ConversationCost {
  const callCost = calculateCost(inputTokens, outputTokens, model);
  return {
    inputTokens: cost.inputTokens + inputTokens,
    outputTokens: cost.outputTokens + outputTokens,
    totalCost: cost.totalCost + callCost,
    apiCalls: cost.apiCalls + 1,
  };
}
