import Groq from "groq-sdk";

const FORMS = ["spiral", "sphere", "nebula", "vortex"] as const;
const FALLBACK_PALETTES = [
  ["#0d0221", "#4c1d95", "#a78bfa"],
  ["#031220", "#164e63", "#67e8f9"],
  ["#1a0a2e", "#7c3aed", "#f0abfc"],
  ["#100b00", "#78350f", "#fbbf24"],
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) >>> 0;
  return h;
}

function buildFallback(thought: string) {
  const h = hashString(thought);
  return {
    whisper: "In the quiet between stars, your thought becomes light.",
    palette: FALLBACK_PALETTES[h % 4],
    form: FORMS[h % 4],
    energy: ((h % 100) / 100) * 0.7 + 0.2,
  };
}

export async function POST(req: Request) {
  try {
    const { thought } = await req.json();
    const sanitized = String(thought ?? "").slice(0, 200);

    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await client.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_tokens: 400,
      temperature: 0.9,
      messages: [
        {
          role: "system",
          content:
            'You are AETHER, a cosmic consciousness. Reply with ONLY raw JSON: ' +
            '{"whisper": "<profound poetic line, max 26 words>", "palette": ["<hex dark>", "<hex mid>", "<hex luminous>"], ' +
            '"form": "<spiral|sphere|nebula|vortex>", "energy": <0.0-1.0>}. JSON only, no markdown, no explanation.',
        },
        { role: "user", content: sanitized },
      ],
    });

    const text = completion.choices[0]?.message?.content ?? "";

    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("No JSON in response");

    const json = JSON.parse(text.slice(start, end + 1));

    if (!json.whisper || !Array.isArray(json.palette) || json.palette.length !== 3) {
      throw new Error("Invalid response shape");
    }

    return Response.json({
      whisper: String(json.whisper),
      palette: json.palette.map(String),
      form: FORMS.includes(json.form) ? json.form : "spiral",
      energy: Math.max(0, Math.min(1, Number(json.energy) || 0.5)),
    });
  } catch (err) {
    const { thought } = await req.clone().json().catch(() => ({ thought: "cosmos" }));
    return Response.json(buildFallback(String(thought ?? "cosmos")));
  }
}
