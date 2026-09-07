import OpenAI from "openai";

let client: OpenAI | null = null;

function getClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  if (!client) client = new OpenAI({ apiKey });
  return client;
}

export const AI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

/**
 * Ask the model for a JSON object matching the given shape description.
 * Returns null if no API key is configured or the response can't be parsed
 * — callers must have a deterministic rule-based fallback (see
 * lib/engines/*) so the product works end-to-end without an OpenAI key.
 */
export async function generateJson<T>(params: {
  system: string;
  user: string;
}): Promise<T | null> {
  const openai = getClient();
  if (!openai) return null;

  try {
    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      response_format: { type: "json_object" },
      temperature: 0.4,
      messages: [
        { role: "system", content: params.system },
        { role: "user", content: params.user },
      ],
    });
    const raw = completion.choices[0]?.message?.content;
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error("AI generation failed, caller should fall back:", err);
    return null;
  }
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}
