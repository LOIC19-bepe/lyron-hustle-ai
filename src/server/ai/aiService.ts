import type { AIProvider, BusinessSnapshot } from "@/server/ai/types";
import { RuleBasedProvider } from "@/server/ai/ruleBasedProvider";
import { LLMProvider } from "@/server/ai/llmProvider";

/**
 * Provider-agnostic AI service.
 * Order: configured LLM provider (if AI_API_KEY / OPENAI_API_KEY is set),
 * then deterministic rule-based analyst as guaranteed fallback.
 */
export class AIService {
  private readonly providers: AIProvider[];
  private readonly fallback = new RuleBasedProvider();

  constructor(providers?: AIProvider[]) {
    const llm = LLMProvider.fromEnv();
    this.providers = providers ?? (llm ? [llm] : []);
  }

  async answer(question: string, snapshot: BusinessSnapshot): Promise<{
    reply: string;
    provider: string;
  }> {
    for (const provider of this.providers) {
      try {
        const reply = await provider.answer(question, snapshot);
        return { reply, provider: provider.name };
      } catch (error) {
        console.error(`[ai] provider "${provider.name}" failed:`, error);
      }
    }
    const reply = await this.fallback.answer(question, snapshot);
    return { reply, provider: this.fallback.name };
  }
}

export const aiService = new AIService();
