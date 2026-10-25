// The client half of /api/speak.
//
// It lives in lib/ rather than beside the canvas for one reason: its failure
// behaviour is the thing most likely to take production's voice away, and the
// only way to know it is right is to test it. Nothing in here touches the DOM
// or three.js, so it runs under plain node.
//
// Everything about it is designed to fail into the browser voice rather than
// into silence.

/** The audio graph's voice path — only the two methods this needs. */
export type VoiceSink = {
  speakVoice?: (bytes: ArrayBuffer, opts?: { pos?: [number, number, number]; gain?: number }) => Promise<void>;
  stopVoice?: () => void;
} | null | undefined;

// A cloned voice, if one is configured. This is the client half of
// /api/speak: it asks for a line, hands the bytes to the audio graph, and
// reports whether it managed to speak. Everything about it is designed to
// fail into the browser voice rather than into silence.
//
// The first 503 switches it off for the rest of the session. Without that,
// every line in an unconfigured deployment — which is production today —
// would cost a round trip before falling back.
export function makeCloneVoice(getAudio: () => VoiceSink) {
  let state: "unknown" | "ready" | "off" = "unknown";
  let ctrl: AbortController | null = null;
  // Reopening a star speaks its line again, and the text is the whole of the
  // input, so the same bytes are worth keeping. On a per-character API this
  // is the difference between paying once and paying every time somebody
  // taps the same star.
  const cache = new Map<string, ArrayBuffer>();
  const CACHE_CAP = 12;

  const fetchLine = async (text: string): Promise<ArrayBuffer | null> => {
    const hit = cache.get(text);
    if (hit) return hit;
    ctrl?.abort();
    ctrl = new AbortController();
    const res = await fetch("/api/speak", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
      signal: ctrl.signal,
    });
    if (res.status === 503) { state = "off"; return null; }
    if (!res.ok) return null;
    const bytes = await res.arrayBuffer();
    if (!bytes.byteLength) return null;
    state = "ready";
    if (cache.size >= CACHE_CAP) cache.delete(cache.keys().next().value as string);
    cache.set(text, bytes);
    return bytes;
  };

  return {
    /** False once we know no provider is configured, so callers can skip us. */
    get possible() { return state !== "off"; },
    get active() { return state === "ready"; },
    cancel() { ctrl?.abort(); ctrl = null; try { getAudio()?.stopVoice?.(); } catch {} },
    /**
     * Speak one line. Resolves true only if the line was actually heard, so
     * the caller falls back on every other outcome: not configured, offline,
     * provider down, a decode the browser refused, or a newer line replacing
     * this one mid-flight.
     */
    async speak(text: string, opts: { pos?: [number, number, number]; gain?: number } = {}): Promise<boolean> {
      if (state === "off") return false;
      const line = String(text || "").trim();
      if (!line) return false;
      const audio = getAudio();
      if (!audio?.speakVoice) return false;
      try {
        const bytes = await fetchLine(line);
        if (!bytes) return false;
        await audio.speakVoice(bytes, opts);
        return true;
      } catch {
        return false;
      }
    },
  };
}

