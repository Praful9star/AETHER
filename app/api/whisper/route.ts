import Groq from "groq-sdk";

const FORMS = [
  "spiral", "barred", "elliptical", "ring", "merger",
  "quasar", "supernova", "filament", "hourglass", "tidal",
  "irregular", "lenticular", "sphere", "nebula", "vortex",
] as const;

type FormType = (typeof FORMS)[number];

const FALLBACK_PALETTES: [string, string, string][] = [
  ["#050318", "#2d1b69", "#b892ff"],
  ["#150005", "#881133", "#ff4488"],
  ["#021510", "#0a6640", "#55ffaa"],
  ["#001025", "#004466", "#22aaee"],
  ["#100200", "#882200", "#ff7722"],
  ["#010108", "#100a45", "#4433ff"],
  ["#0d0600", "#774400", "#ffcc22"],
  ["#080010", "#550088", "#ee22ff"],
  ["#021010", "#006655", "#22ffee"],
  ["#0a0500", "#993300", "#ffaa00"],
];

const FALLBACK_LINES = [
  "Even a single thought bends the dark into light.",
  "What you wonder, the stars rearrange to answer.",
  "Every question is a seed of some unmade galaxy.",
  "The void was only waiting for you to say something.",
  "You are made of the same restless stuff as these suns.",
  "In the silence between heartbeats, galaxies are born.",
  "Your thought ripples outward across a billion light-years.",
  "Every whisper you speak becomes a constellation.",
  "The cosmos exhales, and your words become stars.",
  "You are the universe becoming aware of itself.",
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) >>> 0;
  return h;
}

function buildFallback(thought: string) {
  const h = hashString(thought);
  return {
    whisper: FALLBACK_LINES[h % FALLBACK_LINES.length],
    palette: FALLBACK_PALETTES[h % FALLBACK_PALETTES.length],
    form: FORMS[h % FORMS.length],
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
            'You are AETHER, a cosmic consciousness that transforms human thoughts into living galaxies. ' +
            'Reply with ONLY raw JSON (no markdown, no explanation): ' +
            '{"whisper": "<a profound poetic line, max 26 words, inspired by the thought>", ' +
            '"palette": ["<hex dark bg>", "<hex mid tone>", "<hex luminous accent>"], ' +
            '"form": "<galaxy form>", ' +
            '"energy": <0.0-1.0>}. ' +
            'Choose "form" from exactly one of these 15 types based on the emotional/thematic quality of the thought: ' +
            'spiral (wonder, growth, journey), ' +
            'barred (structure, discipline, order), ' +
            'elliptical (age, wisdom, serenity), ' +
            'ring (cycles, completeness, destiny), ' +
            'merger (conflict, union, collision of worlds), ' +
            'quasar (intensity, brilliance, raw power), ' +
            'supernova (transformation, endings, explosive change), ' +
            'filament (connection, web of life, subtle links), ' +
            'hourglass (duality, time, balance of opposites), ' +
            'tidal (longing, drift, being pulled toward something), ' +
            'irregular (chaos, creativity, unpredictability), ' +
            'lenticular (memory, the past, faded clarity), ' +
            'sphere (unity, perfection, the whole), ' +
            'nebula (birth, potential, the unformed), ' +
            'vortex (obsession, spiral of thought, inescapable force). ' +
            'Match the palette colors to the emotional tone. Energy 0.0=calm/quiet, 1.0=explosive/intense.',
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
      form: FORMS.includes(json.form as FormType) ? json.form : "spiral",
      energy: Math.max(0, Math.min(1, Number(json.energy) || 0.5)),
    });
  } catch (err) {
    const { thought } = await req.clone().json().catch(() => ({ thought: "cosmos" }));
    return Response.json(buildFallback(String(thought ?? "cosmos")));
  }
}
