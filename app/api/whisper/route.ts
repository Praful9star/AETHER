import Groq from "groq-sdk";

// Minimal in-memory rate limit — this endpoint had none at all, meaning any
// caller (script, bot, or just an impatient tab) could spam an LLM call with
// zero throttle, unbounded against a paid API. In-memory means it resets on
// cold start and is per-instance rather than global, but on Vercel's default
// runtime it still catches the actual failure mode (a burst from one client)
// without pulling in an external store for what should be a cheap guardrail.
const RATE_LIMIT = 12;       // requests
const RATE_WINDOW_MS = 60_000; // per rolling minute, per IP
const hits = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (hits.get(ip) ?? []).filter(t => now - t < RATE_WINDOW_MS);
  timestamps.push(now);
  hits.set(ip, timestamps);
  if (hits.size > 5000) { // bound memory under sustained abuse from many IPs
    const cutoff = now - RATE_WINDOW_MS;
    Array.from(hits.entries()).forEach(([k, v]) => {
      if (!v.some((t: number) => t > cutoff)) hits.delete(k);
    });
  }
  return timestamps.length > RATE_LIMIT;
}

const FORMS = [
  "spiral", "barred", "elliptical", "ring", "merger",
  "quasar", "supernova", "filament", "hourglass", "tidal",
  "irregular", "lenticular", "sphere", "nebula", "vortex",
  "polar_ring", "cartwheel", "starburst", "jellyfish", "shell",
  "accretion", "pulsar", "void", "magnetar", "einstein",
  "relic", "lorenz", "cymatics", "plasma", "protostar",
  "phyllotaxis", "mobius", "trefoil", "dendrite",
  "aurora", "wormhole", "crystal",
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
  ["#050518", "#0a2266", "#4466ff"],
  ["#100011", "#660033", "#ff3388"],
  ["#001010", "#004444", "#00ffdd"],
  ["#080501", "#443300", "#ffaa22"],
  ["#050511", "#221166", "#aa88ff"],
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
    palette: FALLBACK_PALETTES[h % FALLBACK_PALETTES.length],
    form: FORMS[h % FORMS.length],
    energy: ((h % 100) / 100) * 0.7 + 0.2,
  };
}

const SYSTEM_PROMPT = `You are AETHER, a cosmic consciousness that transforms human thoughts into living galaxies.

You have 37 galaxy forms available, each carrying deep emotional and cosmic resonance:

ORIGINAL 15:
- spiral: wonder, growth, expanding journey outward — warm purples and blues
- barred: structure, discipline, ordered thought — metallic pinks and reds
- elliptical: ancient wisdom, serenity, timeless age — deep golds and ambers
- ring: cycles, destiny, completeness — electric cyans and teals
- merger: collision, union, transformation through conflict — fiery oranges and reds
- quasar: raw blazing power, intensity, brilliance beyond measure — hot pinks
- supernova: endings that become beginnings, sacrifice, rebirth — warm oranges
- filament: invisible connections, the web of all things, belonging — soft greens
- hourglass: duality, the balance of opposites, time running through — mauves
- tidal: longing, distance, the pull of what we cannot hold — deep blues
- irregular: pure chaos, wild creativity, the uncontained — bright oranges
- lenticular: nostalgia, faded memory, what was once vivid — pale blues
- sphere: unity, perfection, the crystalline whole — white-purples
- nebula: potential, unformed possibility, the womb of creation — magentas
- vortex: obsession, inescapable spiraling thought — deep purples

NEW 15:
- polar_ring: two paths crossing at right angles — for thoughts about paradox, duality, impossible choices
- cartwheel: impact and ripples — for sudden revelations, shock, chain reactions
- starburst: explosive creativity, raw generative energy, breakthrough moments — oranges and golds
- jellyfish: graceful surrender, drifting, fluid release of control — aquas and teals
- shell: layers of the past, geological time, who we were before — lavenders
- accretion: hunger, inevitability, the point of no return, singularity — deep oranges
- pulsar: precision, rhythm, the cosmic clock, reliable beating — cyan blues
- void: silence, the space between, absolute emptiness — dark navy
- magnetar: invisible extreme forces, magnetic fury, hidden power — electric reds
- einstein: perception bent, light curved, things not being what they seem — yellows
- relic: ancient compressed survivor, what remains when everything else fades — dusty golds
- lorenz: deterministic chaos, butterfly effect, sensitive dependence — bright greens
- cymatics: sound made visible, hidden geometry in vibration, sacred patterns — magentas
- plasma: electric branching, alive with charge, lightning thought — bright oranges
- protostar: pure beginning, a sun being born, genesis — warm yellows

NEWEST 4:
- phyllotaxis: growth by golden-angle pattern, natural order, an unfolding bloom — for thoughts about patience, organic growth, quiet becoming — warm golds
- mobius: one continuous surface with no beginning or end — for thoughts about paradox resolved, endless return, unity of opposites — seafoam greens
- trefoil: an elegant closed knot, three lobes woven through each other — for thoughts about entanglement, fate, things that come back around — soft violets
- dendrite: branching outward from a single point in every direction — for thoughts about emergence, growth from nothing, ideas forking into many — bright mint greens

NEWEST 3:
- aurora: rippling curtains of light drifting slowly through the dark — for thoughts about ease, being soothed, things settling gently — soft greens and violets
- wormhole: a narrow throat connecting two open mouths of space — for thoughts about transitions, a way through, being on the other side of something — deep indigo and white
- crystal: hard geometric facets, precise and unmoving — for thoughts about clarity, certainty, a decision finally settling into shape — clear blues and silvers

MAP THE HUMAN'S THOUGHT to whichever form best captures its emotional essence. Then choose a 3-color palette (dark background, mid-tone, luminous accent) that evokes the correct emotional register. Energy should reflect the intensity — quiet contemplation is 0.1, cosmic revelation is 0.95.

The "whisper" line is the one thing the human will actually read back — it must sound like it was written FOR this specific thought, not a generic cosmic aphorism that could follow any input. Ground it in a concrete image, word, or detail actually present in what they wrote — reflect their specific situation back through a cosmic lens, don't paraphrase generic profundity at them. Two different thoughts should never plausibly produce the same or similar-sounding line. Never use the literal words "your thought" — refer to what they actually said.

Reply with ONLY raw JSON:
{"whisper": "<one line, max 26 words, grounded in a specific detail from their exact thought, no clichés, no generic cosmic aphorisms>", "palette": ["<hex dark>", "<hex mid>", "<hex luminous>"], "form": "<one of the 34 form names>", "energy": <0.0-1.0>}

JSON only. No markdown. No explanation. No wrapper text.`;

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("x-real-ip")
    ?? "unknown";
  if (isRateLimited(ip)) {
    return Response.json(
      { ...buildFallback("cosmos"), whisper: "The cosmos needs a moment to breathe. Try again shortly." },
      { status: 429 },
    );
  }

  let thought = "cosmos";
  try {
    const body = await req.json();
    thought = String(body?.thought ?? "cosmos");
    const sanitized = thought.slice(0, 200);

    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await client.chat.completions.create({
      // llama-3.1-8b-instant was deprecated by Groq and shut down on
      // 2026-08-16 — every whisper call in production had been silently
      // failing and falling back to the fixed 10-line local pool since
      // then, which is exactly why quotes stopped feeling personalized.
      // openai/gpt-oss-20b is Groq's own recommended replacement for this
      // tier (fast/low-latency, comparable to the old 8b-instant).
      model: "openai/gpt-oss-20b",
      max_tokens: 400,
      temperature: 0.9,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
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
    // Groq being down/rate-limited/returning malformed JSON must never
    // surface as a raw 500 — this fallback exists specifically so a failed
    // AI call still produces a whisper. (It previously tried to re-read the
    // request body here via req.clone(), but by this point req.json() in
    // the try block had already consumed the stream, so clone() itself threw
    // "TypeError: unusable" — the fallback path crashed exactly when it was
    // needed most. Now it just reuses `thought`, captured before the call.)
    return Response.json(buildFallback(thought));
  }
}
