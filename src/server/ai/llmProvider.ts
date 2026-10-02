import type { AIProvider, BusinessSnapshot } from "@/server/ai/types";

const SYSTEM_PROMPT = `Tu es l'assistant IA de LYRON HUSTLE AI, une plateforme de gestion pour petits entrepreneurs.
Règles STRICTES :
- Tu reçois des chiffres DÉJÀ calculés par le backend. Tu ne calcules ni n'inventes JAMAIS de chiffres ou de transactions.
- Si une information n'est pas dans les données fournies, réponds : "Je n'ai pas suffisamment de données pour répondre précisément."
- Réponds en français, simplement, pour un entrepreneur qui ne connaît pas la comptabilité.
- Utilise la devise fournie dans les données. Sois concis (max ~150 mots), avec des puces si utile.`;

/**
 * Generic OpenAI-compatible chat provider.
 * Works with OpenAI, Groq, Mistral, etc. via AI_API_BASE_URL + AI_API_KEY.
 */
export class LLMProvider implements AIProvider {
  readonly name = "llm";

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string = process.env.AI_API_BASE_URL ??
      "https://api.openai.com/v1",
    private readonly model: string = process.env.AI_MODEL ?? "gpt-4o-mini"
  ) {}

  static fromEnv(): LLMProvider | null {
    const key = process.env.AI_API_KEY ?? process.env.OPENAI_API_KEY;
    return key ? new LLMProvider(key) : null;
  }

  async answer(question: string, snapshot: BusinessSnapshot): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.3,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Données calculées par le backend (source de vérité) :\n${JSON.stringify(snapshot, null, 2)}\n\nQuestion de l'entrepreneur : ${question}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM provider error: ${response.status}`);
    }
    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("LLM provider returned empty content");
    return content;
  }
}
