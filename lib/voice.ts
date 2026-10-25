// Server-side voice synthesis, behind one interface.
//
// The browser's own speechSynthesis is what ships today. It is free, private
// (nothing leaves the device) and, after the clause/deceleration work, it is
// not embarrassing — but it cannot be anyone's voice, and it cannot enter the
// Web Audio graph, which is why Aether's voice is the one sound in the product
// that is not spatial.
//
// This module is the other path: a real voice, synthesised server-side and
// handed back as audio the client can decode and route through the graph like
// any other sound. It deliberately knows about more than one provider, because
// the choice between them is a business decision we have not made yet, and
// nothing above this file should have to care which one won.
//
// Nothing here activates without environment variables. Unconfigured, every
// call returns null and the caller falls back to the browser voice, which is
// exactly how production behaves right now.

export type ProviderName = "elevenlabs" | "cartesia" | "custom";

export type VoiceConfig = {
  provider: ProviderName;
  /** Model identifier, where the provider takes one. */
  model: string;
  /** The cloned voice to speak as. */
  voiceId: string;
  key: string;
  /** Only for "custom": a self-hosted endpoint (RunPod, Modal, a GPU box). */
  endpoint?: string;
};

const env = (k: string) => {
  const v = process.env[k];
  return v && v.trim() ? v.trim() : "";
};

/**
 * Resolve the active provider from the environment, or null when voice
 * synthesis is simply not switched on. Never throws, and never returns a
 * partially configured provider — a key without a voice id would fail at the
 * provider with a less useful message than failing here.
 */
export function voiceConfig(): VoiceConfig | null {
  const explicit = env("VOICE_PROVIDER").toLowerCase();

  const eleven = env("ELEVENLABS_API_KEY");
  const cartesia = env("CARTESIA_API_KEY");
  const endpoint = env("VOICE_ENDPOINT_URL");

  // An explicit choice wins; otherwise take whichever is configured, in the
  // order we would recommend them.
  const provider: ProviderName | "" =
    explicit === "elevenlabs" || explicit === "cartesia" || explicit === "custom"
      ? explicit
      : eleven ? "elevenlabs"
      : cartesia ? "cartesia"
      : endpoint ? "custom"
      : "";

  if (!provider) return null;

  if (provider === "elevenlabs") {
    const voiceId = env("ELEVENLABS_VOICE_ID");
    if (!eleven || !voiceId) return null;
    return {
      provider,
      // Flash is the low-latency line; independent 2026 benchmarks put its
      // median time-to-first-audio around 190ms, which is what makes a voice
      // feel answered rather than loaded.
      model: env("ELEVENLABS_MODEL") || "eleven_flash_v2_5",
      voiceId,
      key: eleven,
    };
  }

  if (provider === "cartesia") {
    const voiceId = env("CARTESIA_VOICE_ID");
    if (!cartesia || !voiceId) return null;
    return {
      provider,
      model: env("CARTESIA_MODEL") || "sonic-3",
      voiceId,
      key: cartesia,
    };
  }

  if (!endpoint) return null;
  return {
    provider: "custom",
    model: env("VOICE_MODEL") || "",
    voiceId: env("VOICE_ID") || "",
    key: env("VOICE_ENDPOINT_TOKEN"),
    endpoint,
  };
}

/** What the client should play. mp3 and wav both decode in every browser we support. */
export type Synthesised = { body: ArrayBuffer; contentType: string };

/**
 * The longest line we will ever synthesise. Aether says one line and one
 * question; nothing legitimate is longer than this, and an uncapped length is
 * an uncapped bill on a per-character API.
 */
export const MAX_SPEAK_CHARS = 400;

/**
 * Collapse whitespace and cut to the cap at a word boundary. Returns "" for
 * anything that is not speakable, which the caller treats as a bad request.
 */
export function cleanSpeakText(raw: unknown): string {
  const text = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= MAX_SPEAK_CHARS) return text;
  const cut = text.slice(0, MAX_SPEAK_CHARS);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > MAX_SPEAK_CHARS * 0.6 ? cut.slice(0, lastSpace) : cut).trim();
}

type FetchLike = typeof fetch;

/**
 * Synthesise one line. Throws on a provider error with a message safe to log
 * — never the text, never the key.
 */
export async function synthesise(
  cfg: VoiceConfig,
  text: string,
  doFetch: FetchLike = fetch,
): Promise<Synthesised> {
  if (cfg.provider === "elevenlabs") {
    const res = await doFetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(cfg.voiceId)}`,
      {
        method: "POST",
        headers: { "xi-api-key": cfg.key, "content-type": "application/json", accept: "audio/mpeg" },
        body: JSON.stringify({
          text,
          model_id: cfg.model,
          // Aether's delivery is deliberately even and unhurried. High
          // stability and low style keep it from performing the line, which
          // is the failure mode that makes a synthetic voice feel like it is
          // selling you something.
          voice_settings: { stability: 0.6, similarity_boost: 0.8, style: 0.1, use_speaker_boost: true },
        }),
      },
    );
    if (!res.ok) throw new Error(`elevenlabs ${res.status}`);
    return { body: await res.arrayBuffer(), contentType: "audio/mpeg" };
  }

  if (cfg.provider === "cartesia") {
    const res = await doFetch("https://api.cartesia.ai/tts/bytes", {
      method: "POST",
      headers: {
        "X-API-Key": cfg.key,
        "Cartesia-Version": "2024-06-10",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model_id: cfg.model,
        transcript: text,
        voice: { mode: "id", id: cfg.voiceId },
        output_format: { container: "wav", encoding: "pcm_f32le", sample_rate: 44100 },
        language: "en",
      }),
    });
    if (!res.ok) throw new Error(`cartesia ${res.status}`);
    return { body: await res.arrayBuffer(), contentType: "audio/wav" };
  }

  // Self-hosted: whatever we run on a rented GPU. One POST, audio back. Keeping
  // the contract this thin is the point — it means the open-weight models can
  // be swapped without the app knowing.
  const res = await doFetch(cfg.endpoint!, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cfg.key ? { authorization: `Bearer ${cfg.key}` } : {}),
    },
    body: JSON.stringify({ text, voice: cfg.voiceId || undefined, model: cfg.model || undefined }),
  });
  if (!res.ok) throw new Error(`custom ${res.status}`);
  const ct = res.headers.get("content-type") || "";
  return {
    body: await res.arrayBuffer(),
    contentType: /wav|mpeg|mp3|ogg|webm/.test(ct) ? ct.split(";")[0].trim() : "audio/mpeg",
  };
}
