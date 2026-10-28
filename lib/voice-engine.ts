// The voice modulation engine.
//
// Sir's note was that the voice should be a recorded human voice, trained, so
// the user can hear things in it. We built the cloning pipeline for that
// (lib/voice.ts, lib/clone-voice.ts) and it is still waiting on a provider
// key. But there is a version of the same idea that needs no provider, no key
// and no GPU, and on reflection it is the better one for what Aether actually
// does:
//
//   you do not hear a synthetic voice reading a line to you.
//   you hear YOUR OWN voice, saying YOUR OWN thought, arriving from the star.
//
// That is not a substitute for cloning. It is closer to the mechanism. The
// research this product is built on is self-distancing — Kross and Ayduk —
// where the effect comes from encountering your own experience from outside
// yourself. A cloned voice saying a new sentence is a nice effect. Your own
// sentence returning to you from sixty units away, lower and slower than you
// said it, IS the mechanism, performed.
//
// And unlike a cloned voice it costs nothing, works offline, needs no consent
// paperwork, has no Article 50 disclosure duty (it is not synthetic speech of
// a person — it is that person's recording), and the audio never leaves the
// tab.
//
// WHAT THIS FILE IS
//
// A pitch and time shifter, built by granular resynthesis, expressed as pure
// functions so the arithmetic can be tested without an AudioContext. The
// browser gives us no pitch shifter: playbackRate changes pitch and duration
// together, which is the one thing we cannot use (a thought played at 0.8x is
// not deeper, it is slurred). So we cut the recording into short overlapping
// grains, play each grain at a different rate than we space them out, and
// cross-fade. Spacing controls duration, rate controls pitch, and the two
// come apart.
//
// Nothing here touches the DOM or Web Audio. planGrains returns a schedule;
// the caller schedules it.

export type ModSettings = {
  /** Pitch shift. Negative is deeper. Clamped to +/- 12. */
  semitones: number;
  /** Output speed. 1 is as recorded, 0.85 is slower and longer. */
  rate: number;
  /** 0..1. Drives air absorption, reverb and level — how far away it sounds. */
  distance: number;
  /** 0..1. Smears consonants, the way distance does to a voice across a room. */
  blur: number;
};

export type Grain = {
  /** When to start this grain, in seconds from the start of playback. */
  at: number;
  /** Where to read from in the source, in seconds. */
  offset: number;
  /** How much source to read, in seconds. */
  dur: number;
  /** Source-to-output rate. This is what shifts the pitch. */
  playbackRate: number;
  /** How long this grain occupies in the output: dur / playbackRate. */
  outDur: number;
};

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/** Equal-power-ish crossfade window. Hann summed at 50% hop is exactly 1. */
export function hann(n: number): Float32Array {
  const w = new Float32Array(Math.max(2, n | 0));
  const N = w.length;
  for (let i = 0; i < N; i++) w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (N - 1)));
  return w;
}

/**
 * Longest stretch we will granulate and play back.
 *
 * Each grain is two audio nodes, and the plan holds roughly 27 grains per
 * second of output, so a 30-second recording would schedule about 1,600
 * nodes in one go. Twelve seconds is both a sane ceiling on that and longer
 * than anyone speaks a single thought for.
 */
export const ECHO_MAX_SEC = 12;

export const DEFAULT_GRAIN_SEC = 0.11;
/**
 * Hann windows at exactly 50% overlap sum to 1.0, so the output has no
 * amplitude ripple. Other values need a correction curve; 0.5 needs none,
 * which is why it is not a tuning knob.
 */
export const GRAIN_OVERLAP = 0.5;

export function pitchRatio(semitones: number): number {
  return Math.pow(2, clamp(semitones, -12, 12) / 12);
}

/**
 * The schedule.
 *
 * Output grain i starts at `i * hop`, and reads the source from
 * `i * hop * rate`. That single relationship is the whole trick:
 *
 *   output advances by hop per grain        -> total output = N * hop
 *   input advances by hop * rate per grain  -> total input  = N * hop * rate = D
 *   therefore                                  total output = D / rate
 *
 * so `rate` sets duration independently of `playbackRate`, which sets pitch.
 *
 * `hop` is half of a grain's OUTPUT length (grainSec / ratio), not half of
 * grainSec — a deep shift stretches each grain in the output, and spacing
 * them by the source length would leave audible gaps between them.
 */
export function planGrains(
  durationSec: number,
  semitones: number,
  rate: number,
  grainSec: number = DEFAULT_GRAIN_SEC,
  overlap: number = GRAIN_OVERLAP
): Grain[] {
  const D = Math.max(0, durationSec);
  if (D <= 0) return [];

  const ratio = pitchRatio(semitones);
  const r = clamp(rate, 0.5, 1.5);
  const g = clamp(grainSec, 0.03, 0.25);
  const ov = clamp(overlap, 0, 0.9);

  // A recording shorter than one grain is not worth granulating: one grain,
  // whole source. It still gets the pitch shift, and its duration changes
  // with it, which for a sub-100ms fragment nobody can hear as wrong.
  if (D <= g) {
    return [{ at: 0, offset: 0, dur: D, playbackRate: ratio, outDur: D / ratio }];
  }

  const grainOut = g / ratio;
  const hop = grainOut * (1 - ov);
  const inHop = hop * r;

  // The last grain must not read past the end of the source.
  const n = Math.floor((D - g) / inHop) + 1;

  const out: Grain[] = [];
  for (let i = 0; i < n; i++) {
    const offset = i * inHop;
    const dur = Math.min(g, D - offset);
    if (dur <= 0.002) break;
    out.push({ at: i * hop, offset, dur, playbackRate: ratio, outDur: dur / ratio });
  }
  return out;
}

/** Total output length of a plan, in seconds. */
export function planDuration(plan: Grain[]): number {
  let end = 0;
  for (const g of plan) end = Math.max(end, g.at + g.outDur);
  return end;
}

// ── How a voice ages ────────────────────────────────────────────────────────
//
// lib/sky.ts already makes distance mean time: a star recedes from
// RECEDE_NEAR to RECEDE_FAR over RECEDE_FULL_DAYS on a log curve, because the
// first week of distance from a thought is worth more than the twentieth.
// The voice ages on the SAME curve and the same constant, deliberately — when
// a star is twice as far away it should also sound twice as far away, and if
// the two curves ever drift apart the sky will contradict itself.

export const VOICE_FULL_DAYS = 180;

/** 0..1, the same log curve lib/sky.ts uses for distance. */
export function ageCurve(days: number): number {
  const d = Math.max(0, days);
  return Math.min(1, Math.log10(1 + d) / Math.log10(1 + VOICE_FULL_DAYS));
}

/**
 * `near` is the moment of release — the star has only just left your hands,
 * and you should recognise your own voice immediately. Everything is scaled
 * right down: a touch deeper, a touch slower, barely any room. From the sky
 * the same recording is further away, lower and blurred, and the difference
 * between the two is audible in a single sitting, which matters because a
 * person cannot wait six months to find out whether the feature works.
 */
export function settingsForAge(days: number, near = false): ModSettings {
  const t = ageCurve(days);
  const full: ModSettings = {
    semitones: -1.4 - 3.6 * t,
    rate: 0.97 - 0.11 * t,
    distance: 0.18 + 0.82 * t,
    blur: 0.12 + 0.68 * t,
  };
  if (!near) return full;
  return {
    semitones: full.semitones * 0.35,
    rate: 1 - (1 - full.rate) * 0.35,
    distance: full.distance * 0.3,
    blur: full.blur * 0.3,
  };
}

/**
 * Air absorption. A voice across a large room loses its top end before it
 * loses its level, which is most of why distance is audible at all. 7.5kHz
 * at touching distance down to 1.6kHz at the far end of the sky.
 */
export function lowpassForDistance(distance: number): number {
  const d = clamp(distance, 0, 1);
  return 7500 - 5900 * d;
}

/** Level. Gentle — the panner's inverse distance model does most of this. */
export function gainForDistance(distance: number): number {
  return 1 - 0.3 * clamp(distance, 0, 1);
}

/** Wet send into the existing convolver. Never fully wet: that is unintelligible. */
export function reverbForDistance(distance: number): number {
  return 0.1 + 0.5 * clamp(distance, 0, 1);
}

/** Blur is a short feedback delay with a lowpass in the loop. */
export function blurParams(blur: number): { delaySec: number; feedback: number; mix: number } {
  const b = clamp(blur, 0, 1);
  return { delaySec: 0.055 + 0.045 * b, feedback: 0.25 * b, mix: 0.35 * b };
}

// ── Trimming ────────────────────────────────────────────────────────────────
//
// Speech recognition decides on its own when you have stopped talking, and it
// is not in a hurry: a recording routinely carries a second or two of room
// noise after the last word, and a moment of it before the first. Played back
// that lands as a dead pause where the point was immediacy, so find the
// speech and cut to it.
//
// Pure, over a Float32Array, so it can be tested with a synthesised signal.

export type Bounds = { start: number; end: number };

/**
 * RMS gate with a percentile noise floor.
 *
 * A fixed threshold cannot work here: the same gate has to cope with a phone
 * held at the mouth in a quiet room and a laptop across a desk with a fan.
 * So the floor is measured from the quietest fifth of the recording and the
 * threshold set above it, with a peak-relative floor as a second opinion for
 * the case where the whole recording is loud.
 *
 * Returns the whole range rather than an empty one when it finds nothing
 * above the threshold — a silent recording should play as recorded, not
 * vanish, because a person who sees their thought go up and hears nothing
 * will conclude the feature is broken rather than that they were too quiet.
 */
export function findSpeechBounds(
  samples: Float32Array,
  sampleRate: number,
  hangoverSec = 0.08
): Bounds {
  const n = samples.length;
  if (n === 0 || sampleRate <= 0) return { start: 0, end: n };

  const win = Math.max(1, Math.round(sampleRate * 0.02));
  const count = Math.ceil(n / win);
  if (count < 3) return { start: 0, end: n };

  const rms = new Float64Array(count);
  let peak = 0;
  for (let w = 0; w < count; w++) {
    const a = w * win;
    const b = Math.min(n, a + win);
    let sum = 0;
    for (let i = a; i < b; i++) sum += samples[i] * samples[i];
    const v = Math.sqrt(sum / Math.max(1, b - a));
    rms[w] = v;
    if (v > peak) peak = v;
  }

  const sorted = Array.from(rms).sort((x, y) => x - y);
  const floor = sorted[Math.floor(sorted.length * 0.2)] || 0;
  const threshold = Math.max(floor * 3, peak * 0.06, 1e-4);

  let first = -1;
  let last = -1;
  for (let w = 0; w < count; w++) {
    if (rms[w] >= threshold) {
      if (first < 0) first = w;
      last = w;
    }
  }
  if (first < 0) return { start: 0, end: n };

  const pad = Math.round((sampleRate * hangoverSec) / win);
  const start = Math.max(0, (first - pad) * win);
  const end = Math.min(n, (last + 1 + pad) * win);
  return { start, end: Math.max(end, start + win) };
}
