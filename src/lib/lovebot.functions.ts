import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.6-flash";

async function ask(system: string, user: string, maxTokens = 300): Promise<string> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: MODEL,
      max_completion_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (res.status === 429) throw new Error("LoveBot is a little busy. Try again in a moment.");
  if (res.status === 402) throw new Error("AI credits are exhausted. Please top up to keep LoveBot alive.");
  if (!res.ok) throw new Error(`LoveBot failed (${res.status})`);
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content?.trim() ?? "";
}

export const loveBotStarter = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ question: z.string().min(1), names: z.string().default("you two") }).parse(d),
  )
  .handler(async ({ data }) =>
    ({
      message: await ask(
        "You are LoveBot, a warm, playful matchmaker hosting a couples compatibility game. Reply with ONE short line (max 22 words), no quotes, no emojis at the start. Be flirty-sweet, never cringe.",
        `The couple (${data.names}) is answering: "${data.question}". Give them a fun conversation starter or a teasing nudge about this question.`,
        120,
      ),
    }),
  );

export const loveInsight = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        nameA: z.string(),
        nameB: z.string(),
        score: z.number(),
        categories: z.array(z.object({ name: z.string(), score: z.number() })),
        highlights: z.array(z.object({ q: z.string(), a: z.string(), b: z.string() })).max(25),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const cats = data.categories.map((c) => `${c.name}: ${c.score}%`).join(", ");
    const hl = data.highlights
      .slice(0, 12)
      .map((h) => `Q: ${h.q} | ${data.nameA}: ${h.a} | ${data.nameB}: ${h.b}`)
      .join("\n");
    const text = await ask(
      "You are LoveBot, a warm relationship insight writer for a premium couples app. Write 3 short paragraphs (max 55 words each), second person plural, no headings, no markdown, no emojis. Paragraph 1: what makes their bond special. Paragraph 2: the one difference worth talking about, framed kindly. Paragraph 3: a specific little ritual or date idea for them.",
      `Couple: ${data.nameA} and ${data.nameB}. Compatibility score: ${data.score}%. Category scores: ${cats}.\nTheir answers:\n${hl}`,
      600,
    );
    return { insight: text };
  });