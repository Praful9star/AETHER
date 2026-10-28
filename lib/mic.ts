// Keeping the user's own voice.
//
// SpeechRecognition does not give us audio. It opens the microphone itself,
// ships it off to be transcribed, and hands back a string — the waveform
// never passes through our code. So to play a thought back in the voice it
// was spoken in, we have to record the microphone a second time, in parallel,
// with getUserMedia and a MediaRecorder.
//
// Two mic consumers at once is fine in Chrome and Edge. It is not reliably
// fine everywhere — iOS Safari in particular will sometimes hand the second
// request a stream that produces no samples, and on some Android builds
// recognition itself stops working when another consumer is attached. Which
// is the whole shape of this file: every failure here has to be silent and
// total. The thought still goes up, the sky still answers, and the person
// never learns that a feature they did not ask for did not happen.
//
// WHERE THE AUDIO GOES
//
// Nowhere. It is decoded into an AudioBuffer, held in memory for as long as
// the tab is open, and lost on reload. It is never uploaded, never written to
// disk, and never sent to a model — not as a privacy policy we are choosing
// to honour, but because there is no code that could: nothing in this file
// has a network call in it.
//
// That is a real limitation and worth naming: a star from last week has no
// voice, because last week's recording is gone. Persisting these to
// IndexedDB would fix it and is the obvious next step, but it means writing
// recordings of somebody's voice to their disk, which is a decision to make
// deliberately rather than as a side effect of wanting a nicer demo.

/** Longest recording we will keep. A thought is a sentence, not a monologue. */
export const MAX_RECORD_SEC = 30;

export type MicFormat = { mime: string } | null;

/**
 * Opus in WebM first: it is what Chrome and Firefox record natively, and it
 * decodes back to an AudioBuffer in the same browsers. mp4/aac is the Safari
 * path. An empty string is the documented way to ask MediaRecorder for
 * whatever it would pick itself, and is the last resort rather than the first
 * choice because what it picks is then unknown to us.
 */
export function pickMicFormat(
  supported: (m: string) => boolean = (m) =>
    typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)
): MicFormat {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4;codecs=mp4a.40.2",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const mime of candidates) {
    try {
      if (supported(mime)) return { mime };
    } catch {
      // isTypeSupported throwing on a malformed string is a browser quirk,
      // not an answer about the next candidate.
    }
  }
  return { mime: "" };
}

export function micSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined" &&
    typeof window !== "undefined" &&
    !!(window.AudioContext || (window as any).webkitAudioContext)
  );
}

export type Capture = {
  /** Stop recording and hand back the bytes, or null if there are none worth having. */
  stop: () => Promise<ArrayBuffer | null>;
  /** Give up and release the microphone without producing anything. */
  cancel: () => void;
};

/**
 * Start recording. Returns null if the microphone is unavailable or refused —
 * including when the user denies permission, which is not an error worth
 * surfacing a second time because SpeechRecognition will have already asked
 * and already been refused.
 *
 * The returned handle releases every track it opened on either exit path. A
 * leaked audio track leaves the browser's recording indicator lit, which on a
 * product about private thoughts is about the worst possible bug.
 */
export async function captureVoice(maxSec = MAX_RECORD_SEC): Promise<Capture | null> {
  if (!micSupported()) return null;

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        // Aggressive processing, on purpose. This recording is played back
        // through a convolver at a simulated distance, and room tone that was
        // inaudible in the original is very audible once it has been given a
        // tail and had its top end rolled off.
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
  } catch {
    return null;
  }

  const release = () => {
    try {
      for (const t of stream.getTracks()) t.stop();
    } catch {}
  };

  const fmt = pickMicFormat();
  let rec: MediaRecorder;
  try {
    rec = fmt?.mime
      ? new MediaRecorder(stream, { mimeType: fmt.mime })
      : new MediaRecorder(stream);
  } catch {
    // A mimeType isTypeSupported accepted and the constructor then rejected.
    try {
      rec = new MediaRecorder(stream);
    } catch {
      release();
      return null;
    }
  }

  const chunks: Blob[] = [];
  let failed = false;
  rec.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };
  rec.onerror = () => {
    failed = true;
  };

  try {
    // A timeslice, so a recording that is cut off by a tab going to sleep
    // still has most of its bytes rather than none.
    rec.start(1000);
  } catch {
    release();
    return null;
  }

  // Nobody speaks a thought for half a minute, and an unbounded recorder left
  // running by a bug upstream would hold the microphone open indefinitely.
  const cap = setTimeout(() => {
    try {
      if (rec.state === "recording") rec.stop();
    } catch {}
  }, Math.max(1, maxSec) * 1000);

  let settled = false;

  return {
    stop: () =>
      new Promise<ArrayBuffer | null>((resolve) => {
        if (settled) return resolve(null);
        settled = true;
        clearTimeout(cap);

        const finish = async () => {
          release();
          if (failed || chunks.length === 0) return resolve(null);
          try {
            const blob = new Blob(chunks, { type: chunks[0].type || "audio/webm" });
            // A couple of hundred bytes is a container header and no audio.
            if (blob.size < 1200) return resolve(null);
            resolve(await blob.arrayBuffer());
          } catch {
            resolve(null);
          }
        };

        if (rec.state === "inactive") {
          void finish();
          return;
        }
        rec.onstop = () => void finish();
        try {
          rec.stop();
        } catch {
          void finish();
        }
        // If onstop never arrives the promise would never settle, and the
        // caller awaits this before the star is released.
        setTimeout(() => {
          if (rec.state !== "inactive") void finish();
        }, 2500);
      }),

    cancel: () => {
      if (settled) return;
      settled = true;
      clearTimeout(cap);
      try {
        if (rec.state !== "inactive") rec.stop();
      } catch {}
      release();
    },
  };
}
