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
