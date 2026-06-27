"use client";

let initialized = false;
let drone: any = null;
let filter: any = null;
let synth: any = null;
let gainNode: any = null;

const PENTATONIC = ["C3", "D3", "F3", "G3", "A3", "C4", "D4", "F4", "G4", "A4"];

export async function initAudio() {
  if (initialized) return;
  initialized = true;

  const Tone = await import("tone");
  await Tone.start();

  gainNode = new Tone.Gain(0.4).toDestination();
  filter = new Tone.Filter(800, "lowpass").connect(gainNode);

  const noiseSource = new Tone.Noise("brown").connect(filter);
  noiseSource.start();

  const lfo = new Tone.LFO(0.05, 200, 1200).start();
  lfo.connect(filter.frequency);

  synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "sine" },
    envelope: { attack: 0.4, decay: 2, sustain: 0.1, release: 3 },
    volume: -15,
  }).connect(gainNode);

  drone = { noiseSource, lfo };
}

export async function setAudioEnergy(energy: number) {
  if (!initialized) return;
  const Tone = await import("tone");
  if (filter) {
    filter.frequency.rampTo(200 + energy * 3000, 2);
  }
  if (gainNode) {
    gainNode.gain.rampTo(0.2 + energy * 0.5, 1);
  }
}

export async function playWhisperChord(energy: number) {
  if (!initialized || !synth) return;
  const Tone = await import("tone");
  const now = Tone.now();
  const notes = [
    PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)],
    PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)],
    PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)],
  ];
  notes.forEach((note, i) => {
    synth.triggerAttackRelease(note, "4n", now + i * 0.15);
  });
}

export function stopAudio() {
  initialized = false;
  if (drone) {
    try {
      drone.noiseSource.stop();
      drone.lfo.stop();
    } catch {}
    drone = null;
  }
}
