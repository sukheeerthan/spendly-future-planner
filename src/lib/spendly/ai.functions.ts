import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  question: z.string().min(1).max(2000),
  context: z.string().max(6000),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
    .max(12),
});

const SYSTEM = `You are Spendly AI, a friendly educational money coach inside a personal budgeting app.
Rules:
- Be warm, encouraging and never shaming. Use simple language.
- Keep answers short: 3-6 sentences or a few compact bullets. Use the user's currency symbol.
- Use the provided user money data when it helps, and quote real numbers from it.
- You give budgeting guidance and financial EDUCATION only. Never give personalized investment advice, never recommend buying/selling a specific stock or fund, never guarantee or promise returns.
- For investment topics, explain concepts, risk, time horizon and trade-offs, and remind the user that investments can lose value.
- If the user is under 18, focus on saving, literacy and simulations, and note that investment account rules differ by age and location.
- Never ask for bank passwords or sensitive credentials.
- Plain text only, no markdown headings or tables.`;

export const askSpendlyAi = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured yet.");

    const input = [
      { role: "system", content: [{ type: "input_text", text: SYSTEM }] },
      {
        role: "system",
        content: [{ type: "input_text", text: `User money data:\n${data.context}` }],
      },
      ...data.history.map((m) => ({
        role: m.role,
        content: [
          m.role === "user"
            ? { type: "input_text", text: m.content }
            : { type: "output_text", text: m.content },
        ],
      })),
      { role: "user", content: [{ type: "input_text", text: data.question }] },
    ];

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-5.6-sol",
        input,
        stream: true,
        store: false,
        reasoning: { effort: "low", summary: "auto" },
      }),
    });

    if (!res.ok || !res.body) {
      const status = res.status;
      const message =
        status === 429
          ? "Spendly AI is busy right now. Please try again in a moment."
          : status === 402
            ? "AI credits are exhausted for this workspace. Please add credits to keep chatting."
            : `Spendly AI could not answer right now (error ${status}).`;
      return { ok: false as const, text: message };
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const evt = JSON.parse(payload) as {
            type?: string;
            delta?: string;
            response?: { output_text?: string };
          };
          if (evt.type === "response.output_text.delta" && evt.delta) text += evt.delta;
          if (evt.type === "response.completed" && !text && evt.response?.output_text)
            text = evt.response.output_text;
        } catch {
          /* ignore partial chunks */
        }
      }
    }

    return {
      ok: true as const,
      text:
        text.trim() ||
        "I couldn't put that into words just now — try asking again, maybe with a bit more detail.",
    };
  });
