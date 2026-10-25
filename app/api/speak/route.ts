import { voiceConfig, synthesise, cleanSpeakText, MAX_SPEAK_CHARS } from "@/lib/voice";

// One line of Aether's voice, synthesised server-side.
//
// A 503 here is not an error — it is the normal state until a provider is
// configured, and the client reads it as "use the browser voice". So the body
// says which, in a field the client can branch on without parsing prose.

const RATE_LIMIT = 30;          // a turn is at most two lines; 30 is generous
const RATE_WINDOW_MS = 60_000;
const hits = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const stamps = (hits.get(ip) ?? []).filter(t => now - t < RATE_WINDOW_MS);
  stamps.push(now);
  hits.set(ip, stamps);
  if (hits.size > 5000) {
    const cutoff = now - RATE_WINDOW_MS;
    Array.from(hits.entries()).forEach(([k, v]) => {
      if (!v.some((t: number) => t > cutoff)) hits.delete(k);
    });
  }
  return stamps.length > RATE_LIMIT;
}

export async function POST(req: Request) {
  const cfg = voiceConfig();
  if (!cfg) {
    return Response.json(
      { ok: false, reason: "unconfigured" },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  if (isRateLimited(ip)) {
    return Response.json({ ok: false, reason: "rate_limited" }, { status: 429 });
  }

  let text = "";
  try {
    const body = await req.json();
    text = cleanSpeakText(body?.text);
  } catch {
    return Response.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  if (!text) {
    return Response.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }

  try {
    const { body, contentType } = await synthesise(cfg, text);
    if (!body.byteLength) throw new Error("empty audio");
    return new Response(body, {
      status: 200,
      headers: {
        "content-type": contentType,
        "content-length": String(body.byteLength),
        // The same line is spoken again when a star is reopened, and the text
        // is the whole of the input, so this is safely cacheable — but it is a
        // person's thought, so it is cached in their browser only, never at
        // the edge.
        "cache-control": "private, max-age=3600",
        "x-aether-voice": cfg.provider,
      },
    });
  } catch (err) {
    // Never the text and never the key: the message, the provider, and the
    // length, which is all that has ever been needed to debug this.
    console.error("[speak] synthesis failed", {
      provider: cfg.provider,
      model: cfg.model,
      chars: text.length,
      cap: MAX_SPEAK_CHARS,
      message: err instanceof Error ? err.message : "unknown",
    });
    return Response.json({ ok: false, reason: "provider_failed" }, { status: 502 });
  }
}
