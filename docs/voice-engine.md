# The voice engine

Where Aether's voice is, where it is going, and the decisions that are not
ours to make. Written after the review asked for "a recorded human voice,
trained, that the user can speak with".

## What ships today

The browser's own `speechSynthesis`, shaped as far as it can be shaped:

- clauses split at punctuation, 230ms between them, 420ms before the last
- rate eased down 9% across a line, slowest on the final clause
- the bed held at 0.28 for exactly as long as the voice runs
- the galaxy pulsing on word-boundary events
- voice scored by platform quality and matched to the listener's English region

It is free, it is private — nothing leaves the device — and it is the only
part of the product that costs nothing to run. It has two hard limits:

1. **It cannot be anyone's voice.** The engine picks from what the OS has.
2. **It cannot enter the Web Audio graph.** `speechSynthesis` writes straight
   to the output device, which is why the voice is the one sound in Aether
   that is not spatial, and why the galaxy's pulse during speech has to be
   *reconstructed* from word events rather than measured.

## Route 0 — the user's own voice, with no provider at all

Built and shipped. `lib/voice-engine.ts`, `lib/mic.ts`.

The review asked for a recorded human voice the user could hear things in.
Routes A and B below answer that by renting somebody's model to imitate a
voice. There is a third answer that needs no model, no key and no GPU:

**record the person saying their own thought, and play it back to them from
the star it became, lower and slower than they said it.**

This is not a cheaper substitute for cloning. For what Aether does it is
closer to the point. The mechanism the product is built on is self-distancing
— encountering your own experience from outside yourself — and a cloned voice
reading a *new* sentence is an effect laid on top of that. Your own sentence
returning to you from sixty units away *is* the mechanism, performed. It is
the difference between being told something comforting and hearing yourself
from the outside.

### How it works

`SpeechRecognition` gives us no audio — it opens the microphone itself, sends
it away, and returns a string. So the microphone is recorded a second time in
parallel with `getUserMedia` and a `MediaRecorder`.

The playback is a real pitch and time shifter, because the browser has none:
`playbackRate` moves pitch and duration together, and a thought played at
0.8× is not deeper, it is slurred. So the recording is cut into 110ms grains,
each played at a different rate than the rate they are spaced at, and
cross-faded with a Hann window at 50% overlap (which sums to exactly 1, so
there is no amplitude ripple). Spacing sets duration, playback rate sets
pitch, and the two come apart.

Then distance, built from three things that have to move together or it reads
as an effect rather than as a place: a lowpass for air absorption (7.5kHz
near, 1.6kHz far), a send into the same convolver the rest of the galaxy uses,
and a short feedback delay that smears consonants the way a room does.

### The modulation is built, measured, and switched off

The engine above is real and tested. It is not used on the voice.

Hearing it on actual recordings settled it: past about two semitones you stop
recognising yourself, and the entire argument for choosing this over cloning
was that the voice is unmistakably *yours*. A processed voice saying your own
words is an effect again — the exact thing we said a cloned voice would be.

So `realVoiceSettings` leaves pitch and pace at zero and ages only the
**space**: air absorption, the galaxy's convolver, a short blur delay, and the
panner position. `isUnshifted` detects that nothing needs shifting and the
player sends the buffer straight through, which is both cheaper (two nodes
instead of two per grain) and cleaner, since granular resynthesis at ratio 1
is a no-op that can still add a faint warble where grains meet.

Distance is also capped at 0.60 rather than 1.0. At full distance the air
filter reaches 1.6kHz, which reads as a recording of a recording rather than
as you, far away. Capped, an old thought still arrives at 4.0kHz — duller and
further off, still plainly the person.

This is the fourth feature testing has made us remove. The engine stays in the
codebase and under test; turning it back on is one function call.

### It plays only from the star

It used to play at release too, 0.9 seconds after the star flew out. That is
gone. It put the person's own voice on top of the one moment the galaxy is
forming and the line is arriving — three things competing for the same few
seconds — and it pushed Aether's own line nearly two seconds late.

Now you open the sky, tap your star and ask for it. That gesture matches what
the thing is: you came back to that thought on purpose. The capture, decode,
trim and cache all still happen at release, because without them a star has no
voice to give back.

### Distance is time, and now it is audible

`lib/sky.ts` already recedes a star from 52 to 78 units over six months on a
log curve. The voice ages on **exactly that curve and that constant** — a
thought from today comes back almost as you said it; one from months ago comes
back deeper, slower, duller and further off. If the two curves ever drift
apart the sky contradicts itself: a star twice as far that does not sound
twice as far.

### What it costs, and what it does not need

Nothing, and it works offline. It also sidesteps both constraints in "Two
constraints that are not technical" below: there is no consent question,
because it is the person's own recording of themselves, and no EU AI Act
Article 50 disclosure duty, because nothing synthetic is generated.

### How it is verified

Measured rather than listened to. `voicetest/dsp.cjs` renders the real grain
schedule in Chromium's Web Audio against a 220Hz tone and reads the output
back: at −5 semitones it measures **164.8Hz, and the duration unchanged** —
which is the whole claim. It also checks the overlapping windows sum flat
rather than clipping, and that there are no gaps at any setting the app
actually uses. `voicetest/engine.cjs` pins the arithmetic and the silence
trimmer; `voicetest/echo.cjs` drives the real path in a browser with a fake
microphone, stubbing only `SpeechRecognition`, which cannot run headless.

One measurement error worth recording, because it nearly became a fix for a
problem that did not exist: the first run reported dropouts at every setting
that combined a pitch shift with a rate change. The cause was the harness
measuring the first and last grain's fade-in and fade-out as if they were
gaps. The interior was always clean. Confirming that before changing the
engine took one extra test; adding grain jitter to "fix" it would have made
the voice worse for no reason.

### What it does not do

It is not a substitute for Routes A and B, and does not close them.

- The recording lives in memory for as long as the tab is open and nowhere
  else: not uploaded, not written to disk. So a star from last week has no
  voice. Persisting these to IndexedDB would fix it and is the obvious next
  step, but it means writing recordings of somebody's voice to their disk,
  which is a decision to take deliberately rather than as a side effect of
  wanting a better demo.
- It can only ever say the thing the person already said. Aether's own lines —
  the whisper, the question — still need a synthetic voice, which is what the
  routes below are for.
- A typed thought has no recording, so most sessions never hear it.

## The finding that changed the plan

The review assumed a recording and a training run. That is no longer how this
is done. **Zero-shot cloning reproduces a speaker from 30–60 seconds of audio
with no fine-tuning step at all.** Fine-tuning on 10–30 minutes still buys
some consistency, but not enough to justify the GPU hours for one voice.

So the ask got cheaper, not harder. What is left is a choice between two
delivery routes, and a bill.

## Route A — a hosted API

ElevenLabs, Cartesia and similar. One HTTPS call, audio back.

- Runs on Vercel exactly as it stands. No new infrastructure.
- Independent 2026 benchmarks put ElevenLabs Flash v2.5 around **190ms**
  median time-to-first-audio and Cartesia Sonic 3.6 around **290ms**. Both
  vendors publish much lower self-reported figures; prefer the independent
  numbers.
- Per-character billing. Published rates vary by source between roughly
  **$20 and $60 per million characters**. Aether speaks two short lines per
  exchange — call it 250 characters — so order of magnitude **₹0.5–1.5 per
  exchange**. Verify against the vendor's own pricing page before committing.
- The text leaves our servers to one more processor. The thought already goes
  to Groq for the whisper itself, so this is one more, not the first — but it
  belongs in the privacy note either way.

## Route B — an open model on a rented GPU

**Licensing decides this before performance does.** Several of the obvious
candidates cannot be used in a product that charges money:

| Model | Licence | Usable commercially |
|---|---|---|
| **Chatterbox** (Resemble AI) | MIT | **Yes.** Output is watermarked |
| **CosyVoice 2** | Apache 2.0 | **Yes** |
| F5-TTS | MIT code, **CC BY-NC weights** | **No** — the checkpoints are non-commercial |
| IndexTTS-2 | bilibili model licence | **No** without a separate agreement |

F5-TTS is the one most tutorials reach for, and its weights are the ones we
cannot ship. That single fact is the most expensive thing in this document.

Hosting, from the pricing surveyed: serverless GPU runs roughly **$2.5–5.5
per H100-hour** billed per second (Modal, RunPod, Replicate), and cold starts
range from ~2s on Modal and RunPod to 30s+ on Replicate for a custom model. A
30-second cold start is not survivable for a voice that answers you, so any
serverless route needs a warm worker, and a warm worker is a fixed monthly
cost, not a per-use one. Past roughly 50–60% utilisation a dedicated GPU is
cheaper than serverless anyway.

## The recommendation

**Start on Route A. Keep Route B behind the same interface.**

Not because hosted is better, but because the only thing worth paying for
right now is learning whether a cloned voice changes how the product feels.
Route A answers that this week for a few hundred rupees. Route B answers it in
a fortnight for a GPU bill plus the engineering, and if the answer turns out
to be "it doesn't", Route B was the expensive way to find out.

Route B becomes the right answer at exactly two moments: when the voice
volume makes per-character billing hurt, or when "the thought never leaves
infrastructure we control" becomes a promise worth making. Both are real. Neither
is today.

`lib/voice.ts` exists so that moving between them is an environment variable.

## Configuration

Nothing activates without these. Unset, `/api/speak` answers `503
{"reason":"unconfigured"}` and the client stays on the browser voice — which
is production's current behaviour, and is tested as such.

```
# Route A — hosted
ELEVENLABS_API_KEY=...        # or CARTESIA_API_KEY
ELEVENLABS_VOICE_ID=...       # the cloned voice
ELEVENLABS_MODEL=eleven_flash_v2_5     # optional
VOICE_PROVIDER=elevenlabs     # optional; only needed if several are set

# Route B — self-hosted: one POST {text} -> audio bytes
VOICE_ENDPOINT_URL=https://<gpu-host>/tts
VOICE_ENDPOINT_TOKEN=...      # optional bearer
```

Set them in the deployment environment, never in the repository. Vercel
resolves environment variables at build time, so a change needs a redeploy.

## What the cloned voice buys beyond sounding human

Because it arrives as audio bytes, it is a source in the graph like any other:

- **It is spatial.** In sky mode a star's line can arrive from that star,
  through the same HRTF panner as everything else in the sky.
- **The pulse becomes a measurement.** The analyser sees the real waveform, so
  the galaxy breathes to the voice itself rather than to an approximation.
- **We know when it has finished.** `speakVoice` resolves on `onended`, so a
  question can follow an answer without guessing at durations.

It is deliberately **dry** — no reverb send. Speech wants less room, not more:
it is both more intelligible and reads as closer to you.

## Two constraints that are not technical

**Consent, and the authority a voice implies.** A real person's voice needs
recorded, revocable consent before a line of code is written. Note also that
under **EU AI Act Article 50**, in force from 2 August 2026, consent settles
personality and data rights but *does not* remove the transparency duty:
synthetic audio must be machine-readably marked by the provider, and the
deployer must disclose it to the listener. Chatterbox watermarking its output
is a feature, not a nuisance. Separately, a voice that sounds clinical implies
an authority Aether must never claim.

**One exchange, or a conversation.** The review also asked that the user be
able to speak *with* Aether. The evidence cuts both ways and should be read
honestly:

- *For:* a 2026 RCT (n=99, 14 days) found an emotional-support chatbot
  significantly reduced several measures of digital stress in students.
- *Against:* the MIT Media Lab / OpenAI trial (n=981, 28 days) found a spoken
  agent beat text, **but only at moderate use**; heavy use reversed it. And a
  2026 paper in *npj Digital Medicine* models how general-purpose chatbots can
  perpetuate OCD and anxiety by serving as reassurance-seeking and avoidance.
  It is a model, not an outcome study — but reassurance-seeking maintaining
  anxiety is not in doubt.

**The design that follows: bounded turns, not unlimited chat.** Aether answers,
asks one concrete question, takes your reply, responds once more, and closes.
Three turns, never reassuring, never asking "why". That is a conversation —
it is not a companion you can lean on at 3am, and it should not become one.
`MAX_TURNS` is a single constant, so this is a decision that can be changed in
one line if the call goes the other way.

## Sources

Independent where possible; vendor-published figures are marked as such above.
Latency and pricing numbers move — re-check before committing money.

- Licences: [Cartesia's open-source TTS licence survey](https://www.cartesia.ai/learn/open-source-tts) ·
  [local TTS licence round-up](https://www.yaps.ai/blog/best-local-tts-models)
- Hosted latency: [independent TTS provider benchmarks](https://www.coval.ai/blog/best-text-to-speech-providers-in-2026-how-to-choose-(and-why-vendor-benchmarks-lie)/) ·
  [Cartesia vs Deepgram vs ElevenLabs](https://dev.to/mrzitoun/benchmarking-real-time-voice-ai-apis-cartesia-vs-deepgram-vs-elevenlabs-2026-2n8c)
- GPU hosting: [scale-to-zero serverless GPU comparison](https://www.buildmvpfast.com/blog/scale-to-zero-serverless-gpu-modal-runpod-ai-hosting-2026) ·
  [real inference hosting cost](https://notcheapai.com/guides/modal-vs-runpod-vs-replicate-inference-cost-2026/)
- Latency budget: [the full voice-AI latency budget](https://www.hirefinn.ai/blog/low-latency-voice-ai-the-full-2026-latency-budget-56b125d2) ·
  [STT/LLM/TTS pipeline design](https://deepgram.com/learn/voice-agent-architecture-stt-llm-tts-pipeline-design)
- Law: [EU AI Act Article 50 compliance checklist](https://www.resemble.ai/resources/eu-ai-act-article-50-compliance-checklist-for-providers-and-deployers) ·
  [consent does not settle transparency](https://www.praxikon.com/en/posts/ai-voice-clones-article-50-transparency)
- Evidence: [function-specific AI chatbot RCT (n=99)](https://pmc.ncbi.nlm.nih.gov/articles/PMC13491411/) ·
  [transdiagnostic model, npj Digital Medicine](https://www.nature.com/articles/s41746-026-02531-7)
