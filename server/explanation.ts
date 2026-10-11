import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";

export type ExplanationProvider = "gemini" | "claude";

const FALLBACK_TEXT = "No explanation could be generated at this time.";

// Claude models that accept server-side refusal fallbacks (`fallbacks: "default"`)
const FALLBACK_CAPABLE_MODELS = new Set(["claude-fable-5-1", "claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5"]);

const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";

function buildPrompt(sector: string, technology: string) {
  return `
      The statement is: "The future of ${sector} will be bright because of ${technology}."

      Provide a short, optimistic, and compelling 2-3 sentence argument explaining why this combination specifically creates a better future.
      Use professional but inspiring language. Avoid cliches.
    `;
}

/**
 * Picks the provider for explanations. EXPLANATION_PROVIDER wins when set;
 * otherwise use whichever key is configured, preferring Gemini when both are.
 */
export function resolveExplanationProvider(): ExplanationProvider | null {
  const requested = process.env.EXPLANATION_PROVIDER?.toLowerCase();
  if (requested === "claude" || requested === "gemini") {
    const key = requested === "claude" ? process.env.ANTHROPIC_API_KEY : process.env.GEMINI_API_KEY;
    if (!key) {
      console.error(`EXPLANATION_PROVIDER is "${requested}" but its API key is not configured.`);
      return null;
    }
    return requested;
  }
  if (requested) {
    console.error(`Unknown EXPLANATION_PROVIDER "${requested}"; expected "claude" or "gemini".`);
  }
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "claude";
  return null;
}

async function explainWithGemini(ai: GoogleGenAI, sector: string, technology: string) {
  // Using gemini-3.5-flash as recommended for general text task in guidelines
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: buildPrompt(sector, technology),
    config: {
      temperature: 0.8,
      topP: 0.9,
    },
  });
  return response.text || FALLBACK_TEXT;
}

async function explainWithClaude(client: Anthropic, sector: string, technology: string) {
  const useFallbacks = FALLBACK_CAPABLE_MODELS.has(CLAUDE_MODEL);
  const response = await client.beta.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 16000,
    // A short creative answer doesn't need deep reasoning
    output_config: { effort: "low" },
    system: "Reply with only the argument itself: no preamble, headings, or quotation marks.",
    messages: [{ role: "user", content: buildPrompt(sector, technology) }],
    // If a safety classifier declines, let the API retry on a fallback model
    ...(useFallbacks ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
  });

  if (response.stop_reason === "refusal") {
    throw new Error(`Claude declined the request (${response.stop_details?.category ?? "no category"}).`);
  }
  const text = response.content
    .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();
  return text || FALLBACK_TEXT;
}

export function createExplainer(provider: ExplanationProvider, gemini: GoogleGenAI | null) {
  if (provider === "claude") {
    const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    return (sector: string, technology: string) => explainWithClaude(claude, sector, technology);
  }
  if (!gemini) throw new Error("Gemini client is not configured.");
  return (sector: string, technology: string) => explainWithGemini(gemini, sector, technology);
}
