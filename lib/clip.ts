// Recording a thought as a short vertical film.
//
// A galaxy on a phone screen is the most persuasive thing Aether has, and
// until now there was no way to show it to anybody who had not opened the
// site. A still does not carry it: the thing that lands is the motion.
//
// This is not a screen recording. The scene is rendered at the clip's own
// 9:16 aspect, and the words are composited on afterwards with typography we
// control — so the result is a designed object rather than a video of a
// browser window.
//
// The arithmetic and the text layout live here, apart from the DOM work, so
// they can be tested without a canvas.

export type ClipFormat = { mime: string; ext: string };

/**
 * The best container this browser will actually record, in preference order.
 * mp4 first: Instagram and TikTok both take it without transcoding, and a
 * webm upload is the kind of thing that fails silently on somebody's phone.
 */
export const FORMAT_CANDIDATES: ClipFormat[] = [
  { mime: "video/mp4;codecs=avc1.42E01E,mp4a.40.2", ext: "mp4" },
  { mime: "video/mp4;codecs=avc1.42E01E", ext: "mp4" },
  { mime: "video/mp4", ext: "mp4" },
  { mime: "video/webm;codecs=vp9,opus", ext: "webm" },
  { mime: "video/webm;codecs=vp8,opus", ext: "webm" },
  { mime: "video/webm", ext: "webm" },
];

/** What the browser claims it can record. Only a shortlist — see findWorkingFormat. */
export function pickFormat(
  supported: (m: string) => boolean = m =>
    typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m),
): ClipFormat {
  for (const c of FORMAT_CANDIDATES) {
    try { if (supported(c.mime)) return c; } catch {}
  }
  // Let the browser choose. The extension is a guess, but a file that plays
  // beats no file.
  return { mime: "", ext: "webm" };
}

/**
 * Ask, then actually try.
 *
 * isTypeSupported("video/mp4") returns true in Chromium and then the recorder
 * produces nothing at all when frames are fed to it manually — a zero-byte
 * file, no error raised, 43 frames drawn into the void. Found by recording a
 * clip and checking the bytes rather than checking the API.
 *
 * So each candidate gets a real four-hundred-millisecond recording of a tiny
 * canvas, and the first one that comes back with bytes in it is the one the
 * clip is recorded in. The result is cached: this costs once per session.
 */
let workingFormat: ClipFormat | null = null;

export async function findWorkingFormat(): Promise<ClipFormat> {
  if (workingFormat) return workingFormat;
  for (const c of FORMAT_CANDIDATES) {
    try {
      if (!MediaRecorder.isTypeSupported(c.mime)) continue;
      if (await producesBytes(c.mime)) { workingFormat = c; return c; }
    } catch {}
  }
  workingFormat = { mime: "", ext: "webm" };   // let the browser decide
  return workingFormat;
}

async function producesBytes(mime: string): Promise<boolean> {
  const c = document.createElement("canvas");
  c.width = 64; c.height = 64;
  const g = c.getContext("2d");
  if (!g) return false;
  const stream = (c as any).captureStream(0) as MediaStream;
  const track = stream.getVideoTracks()[0] as any;
  if (!track) return false;
  let size = 0;
  try {
    const rec = new MediaRecorder(stream, { mimeType: mime });
    rec.ondataavailable = e => { if (e.data) size += e.data.size; };
    const stopped = new Promise<void>(r => { rec.onstop = () => r(); });
    rec.start(100);
    for (let i = 0; i < 4; i++) {
      g.fillStyle = i % 2 ? "#fff" : "#000";
      g.fillRect(0, 0, 64, 64);
      track.requestFrame();
      await new Promise(r => setTimeout(r, 100));
    }
    rec.stop();
    await stopped;
  } catch {
    return false;
  } finally {
    try { stream.getTracks().forEach(t => t.stop()); } catch {}
  }
  return size > 0;
}

/** Whether this browser can record a canvas at all. */
export function canRecord(): boolean {
  return typeof window !== "undefined"
    && typeof MediaRecorder !== "undefined"
    && typeof HTMLCanvasElement !== "undefined"
    && typeof HTMLCanvasElement.prototype.captureStream === "function";
}

/**
 * A clip is 1080x1920 where there is room for it and 720x1280 on a phone.
 * Both are 9:16; the smaller one exists because rendering four times the
 * pixels on a phone is how an export turns into a stutter.
 */
export function clipSize(viewportWidth: number): { width: number; height: number } {
  return viewportWidth < 820 ? { width: 720, height: 1280 } : { width: 1080, height: 1920 };
}

/** Greedy wrap against a real text measurer. */
export function wrapLines(
  measure: (s: string) => number,
  text: string,
  maxWidth: number,
  maxLines = 4,
): string[] {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? line + " " + w : w;
    if (line && measure(next) > maxWidth) { lines.push(line); line = w; }
    else line = next;
  }
  if (line) lines.push(line);
  if (lines.length <= maxLines) return lines;
  // Rather than cut a sentence off mid-air, keep the first lines and mark
  // that there was more.
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = kept[maxLines - 1].replace(/[,;:.\s]+$/, "") + "…";
  return kept;
}

/** 0 at the very start, 1 after `len`, eased. Used for every fade here. */
export function ease(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

/**
 * Open on black and close on black. Not decoration — a clip that starts
 * mid-motion reads as a screen recording, and one that fades reads as
 * something that was made.
 */
export function shutter(t: number, duration: number, inSec = 0.55, outSec = 0.7): number {
  if (t < inSec) return ease(t / inSec);
  const fromEnd = duration - t;
  if (fromEnd < outSec) return ease(Math.max(0, fromEnd) / outSec);
  return 1;
}

/** How much of the line has been written by time t. */
export function revealed(text: string, t: number, startSec: number, overSec: number): string {
  if (t <= startSec) return "";
  const p = Math.min(1, (t - startSec) / Math.max(0.001, overSec));
  // Linear, not eased: a typewriter that accelerates looks like a glitch.
  return text.slice(0, Math.round(text.length * p));
}

export type ClipRequest = {
  width: number;
  height: number;
  fps: number;
  seconds: number;
  whisper: string;
  /** Form label, shown small once the line has finished writing. */
  form?: string;
  /** Rendered at the clip's aspect by the scene, once per captured frame. */
  renderFrame: () => HTMLCanvasElement | null | undefined;
  /** The soundscape, if it is on. Connected only for the recording. */
  audio?: { ac: AudioContext; from: AudioNode } | null;
  onProgress?: (fraction: number) => void;
  /** Checked each frame; true abandons the recording. */
  cancelled?: () => boolean;
};

export type ClipResult = {
  blob: Blob;
  ext: string;
  mime: string;
  frames: number;
  /** Frames where the scene was actually composited in. Fewer than `frames`
   *  means the renderer handed back nothing and the clip is bare overlay. */
  drawn: number;
  /** Which branch ended the capture loop: "clock", "frames" or "cancel". */
  brokeOn: string;
  /** How long the capture loop actually ran. Should be the requested length;
   *  if it is not, the clock-driven break is not doing its job. */
  elapsedSec: number;
  /** Mean brightness of a corner patch, sampled once mid-clip. Zero means the
   *  scene rendered nothing and the clip is text on black. -1 means unread. */
  meanLuma: number;
  /** Wall-clock milliseconds per captured frame — the number that says
   *  whether this stuttered, measured rather than guessed. */
  avgFrameMs: number;
  worstFrameMs: number;
  achievedFps: number;
};

/**
 * Record the clip. Resolves with the file and with the frame timings, so the
 * caller can report what actually happened instead of hoping.
 */
export async function recordClip(req: ClipRequest): Promise<ClipResult> {
  const { width, height, fps, seconds } = req;
  // Only an upper bound now: the loop stops on the clock, so this is what a
  // device that keeps up will produce, not a quota it must fill.
  const maxFrames = Math.max(1, Math.round(fps * seconds));
  const frameMs = 1000 / fps;

  const out = document.createElement("canvas");
  out.width = width; out.height = height;
  const ctx = out.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("no 2d context");

  // captureStream(0) hands us the shutter: a frame enters the recording only
  // when we ask for it, so the clip's timing is ours and not the display's
  // refresh rate.
  const stream = (out as any).captureStream(0) as MediaStream;
  const track = stream.getVideoTracks()[0] as any;
  if (!track) throw new Error("no video track");

  // The generative score, recorded with the picture. Connected here and
  // disconnected in the finally, so nothing is left hanging off the graph.
  let dest: MediaStreamAudioDestinationNode | null = null;
  if (req.audio) {
    try {
      dest = req.audio.ac.createMediaStreamDestination();
      req.audio.from.connect(dest);
      dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
    } catch { dest = null; }
  }

  const fmt = await findWorkingFormat();
  const rec = new MediaRecorder(stream, {
    ...(fmt.mime ? { mimeType: fmt.mime } : {}),
    videoBitsPerSecond: width >= 1080 ? 9_000_000 : 5_500_000,
    audioBitsPerSecond: 128_000,
  });
  const chunks: BlobPart[] = [];
  rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  // A recorder that fails does so asynchronously and silently: without this
  // the result is a zero-byte file and a <video> that reports NaN, which is
  // indistinguishable to the caller from a clip nobody liked.
  let recError = "";
  rec.onerror = (e: any) => { recError = String(e?.error?.name || e?.error || e?.name || "recorder error"); };
  const finished = new Promise<void>(resolve => { rec.onstop = () => resolve(); });

  const timings: number[] = [];
  let drawn = 0;
  let elapsed = 0;
  let meanLuma = -1, lumaTaken = false;
  let brokeOn = "none";
  const startedAt = performance.now();
  // A timeslice, so chunks arrive as we go. Some implementations deliver
  // nothing at all when asked only at stop.
  rec.start(500);

  try {
    // Driven by the clock, not by a frame counter.
    //
    // Counting frames looks equivalent and is not: if a device needs 250ms to
    // render a frame, 240 frames take a minute, and the recorder timestamps
    // by wall clock — so the clip comes out as sixty seconds of slow motion
    // instead of eight seconds of galaxy. Found by measuring on a machine
    // slow enough to show it.
    //
    // Timing the composition off elapsed seconds instead means the duration
    // is always right and it is the frame rate that degrades: a slow phone
    // gets a choppier eight seconds, which is a clip somebody can still post.
    let i = 0;
    while (true) {
      if (req.cancelled?.()) { brokeOn = "cancel"; break; }
      const t = (performance.now() - startedAt) / 1000;
      // maxFrames is a guard, not the plan: the pacing below already keeps us
      // at or under the target rate, so this only fires if the clock misbehaves.
      if (t >= seconds) { brokeOn = "clock"; break; }
      if (i >= maxFrames) { brokeOn = "frames"; break; }

      const frameStart = performance.now();
      const src = req.renderFrame();
      ctx.fillStyle = "#050308";
      ctx.fillRect(0, 0, width, height);
      if (src) {
        try { ctx.drawImage(src, 0, 0, width, height); drawn++; } catch {}
      }
      drawOverlay(ctx, { width, height, t, duration: seconds, whisper: req.whisper, form: req.form });

      track.requestFrame();
      // Once, in the middle, read a small patch of the top-left corner —
      // away from everything the overlay draws. If the galaxy is in the clip
      // this is not black, and if the renderer handed back an empty canvas it
      // is. One 40x40 readback per recording, which is the cheapest honest
      // answer to "is there a picture in there".
      if (!lumaTaken && t > seconds * 0.4) {
        lumaTaken = true;
        try {
          const d = ctx.getImageData(0, 0, 40, 40).data;
          let sum = 0;
          for (let p = 0; p < d.length; p += 4) sum += (d[p] + d[p + 1] + d[p + 2]) / 3;
          meanLuma = sum / (d.length / 4);
        } catch {}
      }
      timings.push(performance.now() - frameStart);
      i++;
      req.onProgress?.(Math.min(1, (performance.now() - startedAt) / 1000 / seconds));

      // Never faster than the target frame rate. Slower is allowed, and is
      // what happens on a device that cannot keep up.
      //
      // Always yields, even when there is no time to wait. Falling behind
      // schedule makes `wait` negative, and skipping the await then would
      // leave the loop spinning without ever returning to the event loop —
      // so the progress bar's own re-render, and every other queued task,
      // would pile up and land as one long stall in the middle of the clip.
      const wait = startedAt + i * frameMs - performance.now();
      await new Promise(r => setTimeout(r, wait > 1 ? wait : 0));
    }
  } finally {
    // Measured here rather than after the recorder drains, or the time spent
    // stopping is counted against the frame rate.
    elapsed = (performance.now() - startedAt) / 1000;
    try { rec.stop(); } catch {}
    await finished;
    try { stream.getTracks().forEach(t => t.stop()); } catch {}
    if (dest && req.audio) { try { req.audio.from.disconnect(dest); } catch {} }
  }

  const blob = new Blob(chunks, { type: fmt.mime || "video/webm" });
  // Fail loudly. A zero-byte file dressed as a clip is worse than an error,
  // because the only way to discover it is to try to post it.
  if (!blob.size) {
    throw new Error(
      `empty recording (${timings.length} frames, ${drawn} drawn, mime "${fmt.mime || "browser default"}"`
      + (recError ? `, recorder: ${recError}` : "") + ")");
  }
  return {
    blob,
    ext: fmt.ext,
    mime: fmt.mime || "video/webm",
    frames: timings.length,
    drawn,
    meanLuma,
    elapsedSec: elapsed,
    brokeOn,
    avgFrameMs: timings.length ? timings.reduce((a, b) => a + b, 0) / timings.length : 0,
    worstFrameMs: timings.length ? Math.max(...timings) : 0,
    achievedFps: elapsed > 0 ? timings.length / elapsed : 0,
  };
}

type OverlayState = {
  width: number; height: number; t: number; duration: number;
  whisper: string; form?: string;
};

/**
 * The words, over the picture. Everything is timed off t rather than off a
 * frame counter, so the composition is identical whatever frame rate the
 * clip ends up recorded at.
 */
export function drawOverlay(ctx: CanvasRenderingContext2D, s: OverlayState) {
  const { width: W, height: H, t, duration } = s;
  const k = W / 1080;                       // one scale factor, so 720 is not a different design
  ctx.save();
  ctx.textAlign = "center";

  // Vignette, so text at top and bottom has something to sit on.
  const vg = ctx.createRadialGradient(W / 2, H * 0.42, W * 0.18, W / 2, H * 0.52, W * 1.02);
  vg.addColorStop(0, "rgba(5,3,8,0)");
  vg.addColorStop(1, "rgba(5,3,8,0.78)");
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

  // A slow rise on the whole text block. Twenty pixels over eight seconds is
  // not visible as movement; it is visible as the clip not being frozen.
  const drift = -20 * k * ease(Math.min(1, t / duration));

  const label = ease(Math.min(1, Math.max(0, (t - 0.35) / 0.9)));
  if (label > 0.01) {
    ctx.globalAlpha = label * 0.55;
    ctx.fillStyle = "#dcd8ff";
    ctx.font = `300 ${Math.round(24 * k)}px 'Helvetica Neue', Arial, sans-serif`;
    ctx.fillText("A   W H I S P E R   T O   T H E   V O I D", W / 2, H * 0.13 + drift);
  }

  // The line, written on.
  const full = String(s.whisper || "").trim();
  if (full) {
    ctx.globalAlpha = 1;
    ctx.font = `italic 400 ${Math.round(52 * k)}px Georgia, 'Times New Roman', serif`;
    const lines = wrapLines(str => ctx.measureText(str).width, full, W * 0.82, 4);
    // Reveal across the whole line, then split, so a word never jumps from
    // one line to another as it appears.
    const shown = revealed(lines.join(" "), t, 0.9, 2.6);
    let budget = shown.length;
    ctx.shadowColor = "rgba(130,100,230,0.85)";
    ctx.shadowBlur = 34 * k;
    ctx.fillStyle = "#f3f0ff";
    const lh = 72 * k;
    const top = H * 0.46 - ((lines.length - 1) * lh) / 2 + drift;
    lines.forEach((ln, i) => {
      if (budget <= 0) return;
      const part = ln.slice(0, budget);
      budget -= ln.length + 1;
      if (part) ctx.fillText(part, W / 2, top + i * lh);
    });
    ctx.shadowBlur = 0;

    if (s.form) {
      const after = ease(Math.min(1, Math.max(0, (t - 3.7) / 1.0)));
      if (after > 0.01) {
        ctx.globalAlpha = after * 0.42;
        ctx.fillStyle = "#cfc9ee";
        ctx.font = `300 ${Math.round(21 * k)}px 'Helvetica Neue', Arial, sans-serif`;
        ctx.fillText(s.form.replace(/_/g, " ").toUpperCase().split("").join(" "),
          W / 2, top + lines.length * lh + 26 * k);
      }
    }
  }

  const sig = ease(Math.min(1, Math.max(0, (t - 1.1) / 1.2)));
  if (sig > 0.01) {
    ctx.globalAlpha = sig * 0.92;
    ctx.fillStyle = "#e9e4ff";
    ctx.font = `300 ${Math.round(32 * k)}px 'Helvetica Neue', Arial, sans-serif`;
    ctx.fillText("✦  A E T H E R", W / 2, H * 0.915 + drift);
    ctx.globalAlpha = sig * 0.4;
    ctx.fillStyle = "#c8c4eb";
    ctx.font = `300 ${Math.round(18 * k)}px 'Helvetica Neue', Arial, sans-serif`;
    ctx.fillText("A   L I V I N G   C O S M O S", W / 2, H * 0.94 + drift);
  }

  // Shutter last, over everything.
  const open = shutter(t, duration);
  if (open < 0.999) {
    ctx.globalAlpha = 1 - open;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}
