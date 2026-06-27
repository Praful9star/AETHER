"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";

// ─── Constants ────────────────────────────────────────────────────────────────

const BG_STARS = 1400;
const CAP = 120;
const MAXR = 38;

const FORMS = [
  "spiral", "barred", "elliptical", "ring", "merger",
  "quasar", "supernova", "filament", "hourglass", "tidal",
  "irregular", "lenticular", "sphere", "nebula", "vortex",
] as const;
type FormType = (typeof FORMS)[number];

const FORM_LABELS: Record<FormType, string> = {
  spiral:     "SPIRAL GALAXY",
  barred:     "BARRED SPIRAL",
  elliptical: "ELLIPTICAL GALAXY",
  ring:       "RING GALAXY",
  merger:     "GALAXY MERGER",
  quasar:     "ACTIVE QUASAR",
  supernova:  "SUPERNOVA REMNANT",
  filament:   "COSMIC FILAMENT",
  hourglass:  "HOURGLASS NEBULA",
  tidal:      "TIDAL STREAM",
  irregular:  "IRREGULAR GALAXY",
  lenticular: "LENTICULAR GALAXY",
  sphere:     "GLOBULAR CLUSTER",
  nebula:     "EMISSION NEBULA",
  vortex:     "COSMIC VORTEX",
};

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
];

const FALLBACK_LINES = [
  "Even a single thought bends the dark into light.",
  "What you wonder, the stars rearrange to answer.",
  "Every question is a seed of some unmade galaxy.",
  "The void was only waiting for you to say something.",
  "You are made of the same restless stuff as these suns.",
  "In the silence between heartbeats, galaxies are born.",
  "Your thought ripples outward across a billion light-years.",
  "Every whisper you speak becomes a constellation.",
  "The cosmos exhales, and your words become stars.",
  "You are the universe becoming aware of itself.",
];

// ─── Utilities ────────────────────────────────────────────────────────────────

function hexToRGB(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255];
}

function lerp3(c0: number[], c1: number[], c2: number[], t: number): [number, number, number] {
  if (t < 0.5) { const k = t * 2; return [c0[0] + (c1[0] - c0[0]) * k, c0[1] + (c1[1] - c0[1]) * k, c0[2] + (c1[2] - c0[2]) * k]; }
  const k = (t - 0.5) * 2; return [c1[0] + (c2[0] - c1[0]) * k, c1[1] + (c2[1] - c1[1]) * k, c1[2] + (c2[2] - c1[2]) * k];
}

function rn() { return (Math.random() + Math.random() + Math.random() - 1.5) * 0.9; }
function hashStr(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
function starPos(): [number, number, number] {
  const a = Math.random() * Math.PI * 2, b = Math.acos(2 * Math.random() - 1), r = 52 + Math.random() * 26;
  return [r * Math.sin(b) * Math.cos(a), r * Math.cos(b), r * Math.sin(b) * Math.sin(a)];
}

function getN(): number {
  if (typeof window === "undefined") return 8000;
  const ua = navigator.userAgent;
  const isMobile = /Android|iPhone|iPad|iPod/i.test(ua) || (navigator.maxTouchPoints > 0 && window.innerWidth <= 1366);
  if (isMobile) return window.innerWidth < 768 ? 8000 : 14000;
  return 40000;
}

// ─── Galaxy Form Generators ───────────────────────────────────────────────────

function genSpiral(arr: Float32Array, tArr: Float32Array | null, N: number) {
  for (let i = 0; i < N; i++) {
    const r = Math.pow(Math.random(), 1.7) * MAXR;
    const branch = (i % 3) / 3;
    const angle = branch * Math.PI * 2 + r * 0.09;
    const sp = 0.6 + r * 0.05;
    arr[i*3]   = Math.cos(angle) * r + rn() * sp;
    arr[i*3+1] = rn() * (MAXR * 0.05) * (1 - (r / MAXR) * 0.7);
    arr[i*3+2] = Math.sin(angle) * r + rn() * sp;
    if (tArr) tArr[i] = r / MAXR;
  }
}

function genBarred(arr: Float32Array, N: number) {
  for (let i = 0; i < N; i++) {
    const roll = Math.random();
    if (roll < 0.12) {
      const t = (Math.random() - 0.5) * 30;
      arr[i*3]   = t + rn() * 1.5;
      arr[i*3+1] = rn() * 1.2;
      arr[i*3+2] = rn() * (3 + Math.abs(t) * 0.1);
    } else if (roll < 0.6) {
      const side = roll < 0.36 ? 1 : -1;
      const r = 14 + Math.pow(Math.random(), 1.4) * 22;
      const angle = side * Math.PI / 2 + r * 0.07;
      arr[i*3]   = Math.cos(angle) * r + rn() * 2.5;
      arr[i*3+1] = rn() * 1.0;
      arr[i*3+2] = Math.sin(angle) * r + rn() * 2.5;
    } else {
      const r = 6 + Math.pow(Math.random(), 0.8) * 30;
      const angle = Math.random() * Math.PI * 2;
      arr[i*3]   = Math.cos(angle) * r + rn() * 2.5;
      arr[i*3+1] = rn() * 0.7;
      arr[i*3+2] = Math.sin(angle) * r + rn() * 2.5;
    }
  }
}

function genElliptical(arr: Float32Array, N: number) {
  for (let i = 0; i < N; i++) {
    const r = Math.pow(Math.random(), 2.2) * 34;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    arr[i*3]   = r * Math.sin(phi) * Math.cos(theta);
    arr[i*3+1] = r * Math.cos(phi) * 0.55;
    arr[i*3+2] = r * Math.sin(phi) * Math.sin(theta) * 0.85;
  }
}

function genRing(arr: Float32Array, N: number) {
  for (let i = 0; i < N; i++) {
    if (Math.random() < 0.14) {
      const r = Math.pow(Math.random(), 2) * 8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      arr[i*3+1] = r * Math.cos(phi) * 0.4;
      arr[i*3+2] = r * Math.sin(phi) * Math.sin(theta);
    } else {
      const ringR = 26 + rn() * 2;
      const width = 4 + Math.random() * 5;
      const theta = Math.random() * Math.PI * 2;
      arr[i*3]   = Math.cos(theta) * (ringR + (Math.random() - 0.5) * width);
      arr[i*3+1] = rn() * 1.8;
      arr[i*3+2] = Math.sin(theta) * (ringR + (Math.random() - 0.5) * width);
    }
  }
}

function genMerger(arr: Float32Array, N: number) {
  const offset = 13;
  for (let i = 0; i < N; i++) {
    const gal = i % 2;
    const cx = gal === 0 ? -offset : offset;
    if (Math.random() < 0.6) {
      const r = Math.pow(Math.random(), 1.7) * 16;
      const angle = Math.random() * Math.PI * 2 + (gal === 0 ? 0.04 : -0.04) * r;
      arr[i*3]   = cx + Math.cos(angle) * r + rn() * 2;
      arr[i*3+1] = rn() * 1.8;
      arr[i*3+2] = Math.sin(angle) * r + rn() * 2;
    } else {
      const t = Math.random();
      const dir = gal === 0 ? 1 : -1;
      arr[i*3]   = cx + dir * t * 24 + rn() * 5;
      arr[i*3+1] = (t - 0.5) * 18 + rn() * 3;
      arr[i*3+2] = (Math.random() - 0.5) * 14 * (1 - t * 0.5);
    }
  }
}

function genQuasar(arr: Float32Array, N: number) {
  for (let i = 0; i < N; i++) {
    if (Math.random() < 0.35) {
      const r = 2 + Math.pow(Math.random(), 0.5) * 18;
      const angle = Math.random() * Math.PI * 2;
      arr[i*3]   = Math.cos(angle) * r + rn() * 0.8;
      arr[i*3+1] = rn() * 1.0;
      arr[i*3+2] = Math.sin(angle) * r + rn() * 0.8;
    } else {
      const dir = Math.random() > 0.5 ? 1 : -1;
      const t = Math.pow(Math.random(), 0.5) * 36;
      const spread = 1 + t * 0.1;
      arr[i*3]   = rn() * spread;
      arr[i*3+1] = dir * t;
      arr[i*3+2] = rn() * spread;
    }
  }
}

function genSupernova(arr: Float32Array, N: number) {
  for (let i = 0; i < N; i++) {
    const isShell = Math.random() < 0.65;
    const r = isShell ? (24 + rn() * 4.5) : (10 + Math.random() * 16);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const scatter = isShell ? 0 : rn() * 4;
    arr[i*3]   = r * Math.sin(phi) * Math.cos(theta) + scatter;
    arr[i*3+1] = r * Math.cos(phi) + scatter;
    arr[i*3+2] = r * Math.sin(phi) * Math.sin(theta) + scatter;
  }
}

function genFilament(arr: Float32Array, N: number) {
  for (let i = 0; i < N; i++) {
    const f = i % 5;
    const theta = (f / 5) * Math.PI * 2;
    const t = Math.random();
    const jitter = 3 + t * 5;
    arr[i*3]   = Math.cos(theta) * t * 34 + rn() * jitter;
    arr[i*3+1] = (Math.random() - 0.5) * 10;
    arr[i*3+2] = Math.sin(theta) * t * 34 + rn() * jitter;
  }
}

function genHourglass(arr: Float32Array, N: number) {
  for (let i = 0; i < N; i++) {
    const roll = Math.random();
    if (roll < 0.08) {
      arr[i*3]   = rn() * 3;
      arr[i*3+1] = rn() * 2;
      arr[i*3+2] = rn() * 3;
    } else {
      const side = roll < 0.54 ? 1 : -1;
      const t = Math.pow(Math.random(), 0.9);
      const h = side * (7 + t * 26);
      const r = 3 + t * 14 + rn() * 1.5;
      const angle = Math.random() * Math.PI * 2;
      arr[i*3]   = Math.cos(angle) * r;
      arr[i*3+1] = h;
      arr[i*3+2] = Math.sin(angle) * r;
    }
  }
}

function genTidal(arr: Float32Array, N: number) {
  for (let i = 0; i < N; i++) {
    if (Math.random() < 0.25) {
      const r = Math.pow(Math.random(), 1.5) * 12;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i*3]   = -20 + r * Math.sin(phi) * Math.cos(theta);
      arr[i*3+1] = r * Math.cos(phi) * 0.5;
      arr[i*3+2] = r * Math.sin(phi) * Math.sin(theta);
    } else {
      const t = Math.random();
      const arc = t * Math.PI * 1.4 - 0.3;
      arr[i*3]   = Math.cos(arc) * 28 + rn() * 3;
      arr[i*3+1] = (t - 0.5) * 8 + rn() * 1.5;
      arr[i*3+2] = Math.sin(arc) * 28 + rn() * 3;
    }
  }
}

function genIrregular(arr: Float32Array, N: number) {
  const clumps: [number, number, number][] = [];
  for (let c = 0; c < 9; c++) {
    const a = Math.random() * Math.PI * 2, r = Math.random() * 24;
    clumps.push([Math.cos(a) * r, (Math.random() - 0.5) * 8, Math.sin(a) * r]);
  }
  for (let i = 0; i < N; i++) {
    const c = clumps[Math.floor(Math.random() * clumps.length)];
    const sp = 5 + Math.random() * 9;
    arr[i*3]   = c[0] + rn() * sp;
    arr[i*3+1] = c[1] + rn() * sp * 0.3;
    arr[i*3+2] = c[2] + rn() * sp;
  }
}

function genLenticular(arr: Float32Array, N: number) {
  for (let i = 0; i < N; i++) {
    if (Math.random() < 0.3) {
      const r = Math.pow(Math.random(), 2.2) * 14;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      arr[i*3+1] = r * Math.cos(phi) * 0.75;
      arr[i*3+2] = r * Math.sin(phi) * Math.sin(theta);
    } else {
      const r = 8 + Math.pow(Math.random(), 0.9) * 28;
      const angle = Math.random() * Math.PI * 2;
      arr[i*3]   = Math.cos(angle) * r + rn() * 1.2;
      arr[i*3+1] = rn() * 0.6 * (1 - r / 40);
      arr[i*3+2] = Math.sin(angle) * r + rn() * 1.2;
    }
  }
}

function genSphere(arr: Float32Array, N: number) {
  const R = 30, gold = Math.PI * (1 + Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const k = i + 0.5, phi = Math.acos(1 - (2 * k) / N), th = gold * k;
    const inner = Math.random() < 0.18 ? 0.35 + Math.random() * 0.4 : 0.85 + Math.random() * 0.15;
    const rad = R * inner;
    arr[i*3]   = rad * Math.sin(phi) * Math.cos(th);
    arr[i*3+1] = rad * Math.cos(phi);
    arr[i*3+2] = rad * Math.sin(phi) * Math.sin(th);
  }
}

function genNebula(arr: Float32Array, N: number) {
  const c: [number, number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const a = Math.random() * Math.PI * 2, r = 5 + Math.random() * 22;
    c.push([Math.cos(a) * r, rn() * 9, Math.sin(a) * r]);
  }
  for (let i = 0; i < N; i++) {
    const k = c[i % c.length], s = 6 + Math.random() * 10;
    arr[i*3]   = k[0] + rn() * s;
    arr[i*3+1] = k[1] + rn() * s * 0.65;
    arr[i*3+2] = k[2] + rn() * s;
  }
}

function genVortex(arr: Float32Array, N: number) {
  for (let i = 0; i < N; i++) {
    const tt = i / N, angle = tt * Math.PI * 18, rad = 4 + (1 - tt) * 34;
    arr[i*3]   = Math.cos(angle) * rad + rn() * 1.2;
    arr[i*3+1] = (tt - 0.5) * 62 + rn() * 1.0;
    arr[i*3+2] = Math.sin(angle) * rad + rn() * 1.2;
  }
}

function buildForm(name: FormType, N: number, tArr?: Float32Array): Float32Array {
  const a = new Float32Array(N * 3);
  switch (name) {
    case "spiral":     genSpiral(a, tArr ?? null, N); break;
    case "barred":     genBarred(a, N); break;
    case "elliptical": genElliptical(a, N); break;
    case "ring":       genRing(a, N); break;
    case "merger":     genMerger(a, N); break;
    case "quasar":     genQuasar(a, N); break;
    case "supernova":  genSupernova(a, N); break;
    case "filament":   genFilament(a, N); break;
    case "hourglass":  genHourglass(a, N); break;
    case "tidal":      genTidal(a, N); break;
    case "irregular":  genIrregular(a, N); break;
    case "lenticular": genLenticular(a, N); break;
    case "sphere":     genSphere(a, N); break;
    case "nebula":     genNebula(a, N); break;
    case "vortex":     genVortex(a, N); break;
  }
  return a;
}

// ─── Audio ────────────────────────────────────────────────────────────────────

function makeAudio() {
  const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!Ctx) return null;
  const ac = new Ctx();
  const master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination);
  const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 420; lp.Q.value = 3;
  const droneGain = ac.createGain(); droneGain.gain.value = 0.2; droneGain.connect(lp); lp.connect(master);
  [55, 82.4, 110].forEach((f) => {
    const o = ac.createOscillator(); o.type = "sine"; o.frequency.value = f;
    const gg = ac.createGain(); gg.gain.value = 0.12; o.connect(gg); gg.connect(droneGain); o.start();
  });
  const buf = ac.createBuffer(1, 2 * ac.sampleRate, ac.sampleRate);
  const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const noise = ac.createBufferSource(); noise.buffer = buf; noise.loop = true;
  const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1100; bp.Q.value = 0.7;
  const noiseGain = ac.createGain(); noiseGain.gain.value = 0.03;
  noise.connect(bp); bp.connect(noiseGain); noiseGain.connect(master); noise.start();
  const delay = ac.createDelay(); delay.delayTime.value = 0.34;
  const fb = ac.createGain(); fb.gain.value = 0.34; delay.connect(fb); fb.connect(delay); delay.connect(master);
  const scale = [0, 3, 5, 7, 10, 12, 15];
  return {
    ac,
    on() { if (ac.state === "suspended") ac.resume(); master.gain.setTargetAtTime(0.5, ac.currentTime, 0.6); },
    off() { master.gain.setTargetAtTime(0.0, ac.currentTime, 0.4); },
    energy(e: number) {
      const n = ac.currentTime;
      lp.frequency.setTargetAtTime(320 + e * 1500, n, 0.8);
      droneGain.gain.setTargetAtTime(0.16 + e * 0.22, n, 0.8);
      noiseGain.gain.setTargetAtTime(0.02 + e * 0.1, n, 0.8);
    },
    pluck(e: number) {
      const oct = e > 0.6 ? 4 : 3, root = 220 * Math.pow(2, oct - 3);
      [0, 2, 4].map((i) => scale[i]).forEach((semi, idx) => {
        const o = ac.createOscillator(); o.type = "sine";
        o.frequency.value = root * Math.pow(2, semi / 12);
        const gg = ac.createGain();
        const t0 = ac.currentTime + idx * 0.06;
        gg.gain.setValueAtTime(0, t0);
        gg.gain.linearRampToValueAtTime(0.07, t0 + 0.04);
        gg.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.6);
        o.connect(gg); gg.connect(master); gg.connect(delay); o.start(t0); o.stop(t0 + 1.7);
      });
    },
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface SavedStar {
  id: number;
  thought: string;
  whisper: string;
  palette: string[];
  form: FormType;
  energy: number;
  pos: [number, number, number];
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AetherCanvas() {
  const mountRef  = useRef<HTMLDivElement>(null);
  const sceneRef  = useRef<any>({});
  const audioRef  = useRef<ReturnType<typeof makeAudio> | null>(null);
  const burstRef  = useRef(0);
  const lastEnergy = useRef(0.35);
  const starsRef  = useRef<SavedStar[]>([]);

  const [thought,    setThought]    = useState("");
  const [whisper,    setWhisper]    = useState("I am Aether. Whisper a thought, and watch it become a galaxy.");
  const [loading,    setLoading]    = useState(false);
  const [form,       setForm]       = useState<FormType>("spiral");
  const [count,      setCount]      = useState(0);
  const [show,       setShow]       = useState(false);
  const [sound,      setSound]      = useState(false);
  const [panel,      setPanel]      = useState(false);
  const [captureURL, setCaptureURL] = useState<string | null>(null);
  const [list,       setList]       = useState<SavedStar[]>([]);

  // ── Three.js setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const N = getN();

    // Renderer
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    } catch { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x050308, 1);
    mount.appendChild(renderer.domElement);

    // Scene & Camera
    const scene  = new THREE.Scene();
    scene.fog    = new THREE.FogExp2(0x050308, 0.003);
    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.1, 600);

    // Sprite texture
    const cv = document.createElement("canvas"); cv.width = cv.height = 128;
    const c2 = cv.getContext("2d")!;
    const g  = c2.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0,    "rgba(255,255,255,1)");
    g.addColorStop(0.04, "rgba(255,255,255,0.95)");
    g.addColorStop(0.12, "rgba(210,200,255,0.75)");
    g.addColorStop(0.3,  "rgba(160,120,255,0.35)");
    g.addColorStop(0.6,  "rgba(100,80,200,0.1)");
    g.addColorStop(1,    "rgba(0,0,0,0)");
    c2.fillStyle = g; c2.fillRect(0, 0, 128, 128);
    const sprite = new THREE.CanvasTexture(cv);

    const tArr = new Float32Array(N);

    // Pre-build all 15 forms
    const forms: Record<FormType, Float32Array> = {} as any;
    forms.spiral = buildForm("spiral", N, tArr);
    for (const f of FORMS) {
      if (f !== "spiral") forms[f] = buildForm(f, N);
    }

    const base    = new Float32Array(N * 3); base.set(forms.spiral);
    const phase   = new Float32Array(N);     for (let i = 0; i < N; i++) phase[i] = Math.random() * Math.PI * 2;
    const colCur  = new Float32Array(N * 3);
    const colTgt  = new Float32Array(N * 3);

    const applyPalette = (pal: string[], into: Float32Array) => {
      const a = hexToRGB(pal[0]), b = hexToRGB(pal[1]), c = hexToRGB(pal[2]);
      for (let i = 0; i < N; i++) {
        const k = lerp3(a, b, c, tArr[i]);
        into[i*3] = k[0]; into[i*3+1] = k[1]; into[i*3+2] = k[2];
      }
    };
    applyPalette(FALLBACK_PALETTES[0], colCur);
    colTgt.set(colCur);

    const geo = new THREE.BufferGeometry();
    const live = new Float32Array(N * 3); live.set(forms.spiral);
    geo.setAttribute("position", new THREE.BufferAttribute(live, 3));
    geo.setAttribute("color",    new THREE.BufferAttribute(colCur, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.95, map: sprite, vertexColors: true,
      transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, sizeAttenuation: true, opacity: 0.95,
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);

    const coreMat = new THREE.SpriteMaterial({ map: sprite, color: 0x9b6bff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const core    = new THREE.Sprite(coreMat); core.scale.set(16, 16, 1);
    scene.add(core);

    const sGeo = new THREE.BufferGeometry();
    const sPos = new Float32Array(BG_STARS * 3);
    for (let i = 0; i < BG_STARS; i++) {
      const a = Math.random() * Math.PI * 2, b = Math.acos(2 * Math.random() - 1), r = 130 + Math.random() * 130;
      sPos[i*3] = r*Math.sin(b)*Math.cos(a); sPos[i*3+1] = r*Math.cos(b); sPos[i*3+2] = r*Math.sin(b)*Math.sin(a);
    }
    sGeo.setAttribute("position", new THREE.BufferAttribute(sPos, 3));
    const bgStars = new THREE.Points(sGeo, new THREE.PointsMaterial({
      size: 0.65, color: 0x8899cc, map: sprite,
      transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    scene.add(bgStars);

    const memPos = new Float32Array(CAP * 3).fill(1e5);
    const memCol = new Float32Array(CAP * 3).fill(1);
    const memGeo = new THREE.BufferGeometry();
    memGeo.setAttribute("position", new THREE.BufferAttribute(memPos, 3));
    memGeo.setAttribute("color",    new THREE.BufferAttribute(memCol, 3));
    memGeo.setDrawRange(0, 0);
    const memMat = new THREE.PointsMaterial({
      size: 3.6, map: sprite, vertexColors: true,
      transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, sizeAttenuation: true, opacity: 0.95,
    });
    const memPoints = new THREE.Points(memGeo, memMat);
    scene.add(memPoints);

    const cam = { theta: 0.6, phi: 1.15, radius: 150, targetRadius: 62, lastInput: performance.now() };
    const updateCam = () => {
      camera.position.set(
        cam.radius * Math.sin(cam.phi) * Math.cos(cam.theta),
        cam.radius * Math.cos(cam.phi),
        cam.radius * Math.sin(cam.phi) * Math.sin(cam.theta),
      );
      camera.lookAt(0, 0, 0);
    };

    let dragging = false, px = 0, py = 0, pinchD = 0, downX = 0, downY = 0, downT = 0, moved = 0;
    const el = renderer.domElement;
    const ray = new THREE.Raycaster(); (ray.params as any).Points = { threshold: 3.5 };

    const onDown = (e: PointerEvent) => { dragging = true; px = e.clientX; py = e.clientY; downX = px; downY = py; downT = performance.now(); moved = 0; cam.lastInput = downT; };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      moved += Math.abs(e.clientX - px) + Math.abs(e.clientY - py);
      cam.theta -= (e.clientX - px) * 0.005;
      cam.phi = Math.max(0.18, Math.min(Math.PI - 0.18, cam.phi - (e.clientY - py) * 0.005));
      px = e.clientX; py = e.clientY; cam.lastInput = performance.now();
    };
    const onUp = () => {
      dragging = false;
      if (moved < 8 && performance.now() - downT < 400) {
        const rect = el.getBoundingClientRect();
        const nx = ((downX - rect.left) / rect.width) * 2 - 1;
        const ny = -((downY - rect.top) / rect.height) * 2 + 1;
        ray.setFromCamera({ x: nx, y: ny } as THREE.Vector2, camera);
        const hits = ray.intersectObject(memPoints);
        if (hits.length && hits[0].index !== undefined && hits[0].index < starsRef.current.length && sceneRef.current.onStarTap)
          sceneRef.current.onStarTap(hits[0].index);
      }
    };
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    const onTS = (e: TouchEvent) => { if (e.touches.length === 2) pinchD = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); };
    const onTM = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        cam.targetRadius = Math.max(30, Math.min(120, cam.targetRadius - (d - pinchD) * 0.25));
        pinchD = d; cam.lastInput = performance.now(); e.preventDefault();
      }
    };
    el.addEventListener("touchstart", onTS, { passive: false });
    el.addEventListener("touchmove",  onTM, { passive: false });

    let energyCur = 0.35, energyTgt = 0.35, colorFrames = 0, spin = 0;
    let burst = 0;
    let currentTarget = forms.spiral;

    sceneRef.current = {
      morph(pal: string[], fname: string, energy: number) {
        const f = FORMS.includes(fname as FormType) ? (fname as FormType) : "spiral";
        currentTarget = forms[f];
        applyPalette(pal, colTgt);
        colorFrames = 100;
        energyTgt = Math.max(0, Math.min(1, energy));
        burst = Math.min(1, energy + 0.35);
        coreMat.color.set(pal[2]);
      },
      rebuildStars(arr: SavedStar[]) {
        const n = Math.min(arr.length, CAP);
        for (let i = 0; i < CAP; i++) {
          if (i < n) {
            const s = arr[i];
            memPos[i*3] = s.pos[0]; memPos[i*3+1] = s.pos[1]; memPos[i*3+2] = s.pos[2];
            const rgb = hexToRGB(s.palette[2]);
            memCol[i*3] = rgb[0]; memCol[i*3+1] = rgb[1]; memCol[i*3+2] = rgb[2];
          } else {
            memPos[i*3] = memPos[i*3+1] = memPos[i*3+2] = 1e5;
          }
        }
        memGeo.setDrawRange(0, n);
        memGeo.attributes.position.needsUpdate = true;
        memGeo.attributes.color.needsUpdate    = true;
      },
      snapshot(whisperText: string) {
        const W = mount.clientWidth, H = mount.clientHeight;
        renderer.setSize(1080, 1920); camera.aspect = 1080 / 1920; camera.updateProjectionMatrix();
        renderer.render(scene, camera);
        const out = document.createElement("canvas"); out.width = 1080; out.height = 1920;
        const o = out.getContext("2d")!;
        o.fillStyle = "#050308"; o.fillRect(0, 0, 1080, 1920);
        o.drawImage(renderer.domElement, 0, 0, 1080, 1920);
        const vg = o.createRadialGradient(540, 760, 200, 540, 960, 1100);
        vg.addColorStop(0, "rgba(5,3,8,0)"); vg.addColorStop(1, "rgba(5,3,8,.72)");
        o.fillStyle = vg; o.fillRect(0, 0, 1080, 1920);
        o.textAlign = "center";
        o.fillStyle = "rgba(220,216,255,.5)"; o.font = "300 24px 'Helvetica Neue', Arial, sans-serif";
        o.fillText("A   WHISPER   TO   THE   VOID", 540, 250);
        o.fillStyle = "#f3f0ff"; o.font = "italic 400 54px Georgia, 'Times New Roman', serif";
        o.shadowColor = "rgba(130,100,230,.85)"; o.shadowBlur = 38;
        const words = (whisperText || "").split(" "); let line = ""; const lines: string[] = [];
        for (const w of words) {
          if (o.measureText(line + w).width > 880 && line) { lines.push(line.trim()); line = w + " "; }
          else line += w + " ";
        }
        if (line.trim()) lines.push(line.trim());
        const startY = 820 - (lines.length - 1) * 36;
        lines.forEach((ln, i) => o.fillText(ln, 540, startY + i * 72));
        o.shadowBlur = 0;
        o.fillStyle = "rgba(233,228,255,.92)"; o.font = "300 34px 'Helvetica Neue', Arial, sans-serif";
        o.fillText("✦  AETHER", 540, 1770);
        o.fillStyle = "rgba(200,196,235,.45)"; o.font = "300 18px 'Helvetica Neue', Arial, sans-serif";
        o.fillText("A LIVING COSMOS", 540, 1812);
        const url = out.toDataURL("image/png");
        renderer.setSize(W, H); camera.aspect = W / H; camera.updateProjectionMatrix();
        renderer.render(scene, camera);
        return url;
      },
    };

    const onResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth, h = mountRef.current.clientHeight;
      camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    let raf: number, lastT = performance.now();
    const posArr = geo.attributes.position.array as Float32Array;

    const loop = () => {
      raf = requestAnimationFrame(loop);
      const now = performance.now();
      const dt  = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;
      const t = now / 1000;

      if (burstRef.current > 0) { burst = Math.max(burst, burstRef.current); burstRef.current = 0; }
      burst = Math.max(0, burst - 1.2 * dt);

      cam.radius += (cam.targetRadius - cam.radius) * 0.045;
      if (!dragging && now - cam.lastInput > 2500) cam.theta += 0.04 * dt;
      updateCam();

      energyCur += (energyTgt - energyCur) * 0.025;
      const displayEnergy = Math.max(energyCur, burst);

      spin += (0.06 + displayEnergy * 0.5) * dt;
      points.rotation.y   = spin;
      bgStars.rotation.y  = spin * 0.06;
      memPoints.rotation.y = spin * 0.12;

      const amp = displayEnergy * 8;
      for (let i = 0; i < N; i++) {
        const j   = i * 3;
        const spd = 0.5 + tArr[i] * 0.4;
        base[j]   += (currentTarget[j]   - base[j])   * 0.04;
        base[j+1] += (currentTarget[j+1] - base[j+1]) * 0.04;
        base[j+2] += (currentTarget[j+2] - base[j+2]) * 0.04;
        const ph = phase[i];
        posArr[j]   = base[j]   + Math.sin(t * spd       + ph)        * amp;
        posArr[j+1] = base[j+1] + Math.sin(t * spd * 1.3 + ph * 1.7)  * amp;
        posArr[j+2] = base[j+2] + Math.cos(t * spd * 0.9 + ph)        * amp;
      }
      geo.attributes.position.needsUpdate = true;

      if (colorFrames > 0) {
        for (let i = 0; i < N * 3; i++) colCur[i] += (colTgt[i] - colCur[i]) * 0.055;
        geo.attributes.color.needsUpdate = true;
        colorFrames--;
      }

      const pulse = 1 + Math.sin(t * (1.5 + displayEnergy * 3)) * (0.12 + displayEnergy * 0.28);
      core.scale.set(14 * pulse, 14 * pulse, 1);
      coreMat.opacity = 0.5 + displayEnergy * 0.45;

      (memMat as any).size = 3.2 + Math.sin(t * 1.3) * 0.5;
      memMat.opacity = 0.8 + Math.sin(t * 0.9) * 0.18;

      mat.size = 0.9 + displayEnergy * 0.6;

      renderer.render(scene, camera);
    };
    loop();

    setTimeout(() => setShow(true), 350);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("touchstart", onTS);
      el.removeEventListener("touchmove", onTM);
      geo.dispose(); mat.dispose(); sGeo.dispose(); sprite.dispose();
      (bgStars.material as THREE.Material).dispose();
      memGeo.dispose(); memMat.dispose(); coreMat.dispose(); renderer.dispose();
      if (el.parentNode) el.parentNode.removeChild(el);
    };
  }, []);

  // ── React logic ─────────────────────────────────────────────────────────────

  const remember = useCallback((s: SavedStar) => {
    starsRef.current = [...starsRef.current, s].slice(-CAP);
    sceneRef.current.rebuildStars?.(starsRef.current);
    setList([...starsRef.current].reverse());
    setCount(starsRef.current.length);
    fetch("/api/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) }).catch(() => {});
  }, []);

  const applyResult = useCallback((pal: string[], fm: FormType, en: number, text: string, save?: string) => {
    sceneRef.current.morph?.(pal, fm, en);
    setForm(fm);
    lastEnergy.current = en;
    if (audioRef.current) { audioRef.current.energy(en); audioRef.current.pluck(en); }
    if (save) remember({ id: Date.now(), thought: save, whisper: text, palette: pal, form: fm, energy: en, pos: starPos() });
    setWhisper(text);
  }, [remember]);

  const fallback = useCallback((text: string) => {
    const h = hashStr(text || "void");
    applyResult(
      FALLBACK_PALETTES[h % FALLBACK_PALETTES.length],
      FORMS[h % FORMS.length],
      Math.min(1, 0.25 + (text.length % 80) / 90),
      FALLBACK_LINES[h % FALLBACK_LINES.length],
      text,
    );
  }, [applyResult]);

  const ask = useCallback(async () => {
    const text = thought.trim();
    if (!text || loading) return;
    setLoading(true);
    setThought("");
    burstRef.current = 0.8;
    try {
      const res = await fetch("/api/whisper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thought: text }),
      });
      if (!res.ok) throw new Error("api");
      const data = await res.json();
      const pal: string[] = Array.isArray(data.palette) && data.palette.length >= 3
        ? data.palette.slice(0, 3)
        : FALLBACK_PALETTES[0];
      const fm: FormType = FORMS.includes(data.form) ? data.form : "spiral";
      applyResult(pal, fm, typeof data.energy === "number" ? data.energy : 0.5, String(data.whisper || FALLBACK_LINES[0]).slice(0, 180), text);
    } catch {
      fallback(text);
    } finally {
      setLoading(false);
    }
  }, [thought, loading, applyResult, fallback]);

  const toggleSound = () => {
    if (!audioRef.current) { audioRef.current = makeAudio(); if (audioRef.current) audioRef.current.energy(lastEnergy.current); }
    if (!audioRef.current) return;
    if (sound) { audioRef.current.off(); setSound(false); } else { audioRef.current.on(); setSound(true); }
  };

  const revisit = useCallback((s: SavedStar) => {
    sceneRef.current.morph?.(s.palette, s.form, s.energy);
    setForm(s.form);
    setWhisper(s.whisper);
    lastEnergy.current = s.energy;
    if (audioRef.current) { audioRef.current.energy(s.energy); audioRef.current.pluck(s.energy); }
    setPanel(false);
  }, []);

  useEffect(() => { sceneRef.current.onStarTap = (i: number) => { const s = starsRef.current[i]; if (s) revisit(s); }; });

  const capture = () => { try { setCaptureURL(sceneRef.current.snapshot?.(whisper) ?? null); } catch {} };
  const clearStars = () => { starsRef.current = []; sceneRef.current.rebuildStars?.([]); setList([]); setCount(0); };

  const ui = { opacity: show ? 1 : 0, transition: "opacity 1s ease" };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#050308", fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      <div ref={mountRef} style={{ position: "absolute", inset: 0, touchAction: "none", cursor: "grab" }} />

      {/* Radial vignette overlay */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(circle at 50% 42%, transparent 32%, rgba(5,3,8,.6) 100%)" }} />

      {/* Header */}
      <div style={{ position: "absolute", top: 22, left: 24, pointerEvents: "none", ...ui }}>
        <div style={{ color: "#e9e6ff", fontSize: 13, letterSpacing: "0.62em", fontWeight: 300 }}>A E T H E R</div>
        <div style={{ color: "rgba(200,196,235,.4)", fontSize: 9, letterSpacing: "0.32em", marginTop: 5 }}>A LIVING COSMOS</div>
      </div>

      {/* Controls — top right */}
      <div style={{ position: "absolute", top: 22, right: 24, display: "flex", flexDirection: "column", alignItems: "flex-end", ...ui }}>
        <div style={{ color: "rgba(200,196,235,.45)", fontSize: 9, letterSpacing: "0.22em", marginBottom: 2, pointerEvents: "none" }}>
          {FORM_LABELS[form]}
        </div>
        {([
          ["SOUND · " + (sound ? "ON" : "OFF"), toggleSound],
          ["STARS · " + count,                  () => setPanel((p) => !p)],
          ["CAPTURE ✦",                          capture],
        ] as [string, () => void][]).map(([label, fn]) => (
          <button key={label} onClick={fn}
            style={{ display: "block", background: "none", border: "none", color: "rgba(214,210,245,.65)", fontSize: 10, letterSpacing: "0.2em", padding: "5px 0", cursor: "pointer", textAlign: "right", fontFamily: "inherit" }}>
            {label}
          </button>
        ))}
      </div>

      {/* Whisper display */}
      <div style={{ position: "absolute", left: 0, right: 0, top: "20%", display: "flex", justifyContent: "center", padding: "0 32px", pointerEvents: "none" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={loading ? "__loading__" : whisper}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 1.1, ease: "easeInOut" }}
            style={{ maxWidth: 640, textAlign: "center", color: "#f3f0ff", fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic", fontSize: "clamp(18px, 3.2vw, 30px)", lineHeight: 1.5, textShadow: "0 0 32px rgba(120,90,220,.6)" }}
          >
            {loading ? "Aether is contemplating…" : whisper}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Input */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 28, display: "flex", justifyContent: "center", padding: "0 18px", ...ui }}>
        <div style={{ width: "100%", maxWidth: 560, display: "flex", gap: 10, alignItems: "center" }}>
          <textarea
            value={thought}
            disabled={loading}
            rows={1}
            onChange={(e) => setThought(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); } }}
            placeholder="whisper a thought to the cosmos…"
            style={{ flex: 1, background: "rgba(18,14,34,.6)", backdropFilter: "blur(12px)", border: "1px solid rgba(150,130,230,.28)", borderRadius: 999, color: "#eee9ff", fontSize: 15, padding: "13px 22px", fontFamily: "inherit", resize: "none", outline: "none", lineHeight: 1.4 }}
          />
          <button
            onClick={ask}
            disabled={loading}
            style={{ background: "rgba(130,100,255,.16)", border: "1px solid rgba(160,140,255,.4)", color: "#e9e4ff", borderRadius: 999, padding: "13px 24px", fontSize: 13, letterSpacing: "0.18em", cursor: loading ? "default" : "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}
          >
            {loading ? "···" : "RELEASE"}
          </button>
        </div>
      </div>

      {/* Hint */}
      <div style={{ position: "absolute", bottom: 8, left: 0, right: 0, textAlign: "center", color: "rgba(190,186,225,.28)", fontSize: 9, letterSpacing: "0.22em", pointerEvents: "none" }}>
        DRAG TO ORBIT · PINCH TO ZOOM · TAP A STAR TO REVISIT
      </div>

      {/* Stars panel */}
      <AnimatePresence>
        {panel && (
          <motion.div
            initial={{ x: 340 }} animate={{ x: 0 }} exit={{ x: 340 }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "min(320px, 84vw)", background: "rgba(8,5,16,.88)", backdropFilter: "blur(18px)", borderLeft: "1px solid rgba(150,130,230,.18)", display: "flex", flexDirection: "column", zIndex: 5 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 22px 12px" }}>
              <div style={{ color: "#e9e6ff", fontSize: 11, letterSpacing: "0.3em" }}>YOUR CONSTELLATION</div>
              <button onClick={() => setPanel(false)} style={{ background: "none", border: "none", color: "rgba(220,216,255,.55)", fontSize: 18, cursor: "pointer" }}>&times;</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "0 12px" }}>
              {list.length === 0 && (
                <div style={{ color: "rgba(200,196,235,.38)", fontSize: 13, padding: "22px 12px", fontStyle: "italic", fontFamily: "Georgia, serif" }}>
                  No stars yet. Every thought you release becomes one.
                </div>
              )}
              {list.map((s) => (
                <div key={s.id} onClick={() => revisit(s)}
                  style={{ padding: "12px 12px", borderRadius: 10, cursor: "pointer", marginBottom: 3 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 5 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 8, background: s.palette[2], boxShadow: `0 0 10px ${s.palette[2]}`, display: "inline-block" }} />
                    <span style={{ color: "rgba(200,196,235,.4)", fontSize: 8, letterSpacing: "0.2em" }}>{FORM_LABELS[s.form] ?? s.form.toUpperCase()}</span>
                  </div>
                  <div style={{ color: "#ece8ff", fontSize: 13.5, fontFamily: "Georgia, serif", fontStyle: "italic", lineHeight: 1.45 }}>{s.whisper}</div>
                </div>
              ))}
            </div>
            {list.length > 0 && (
              <button onClick={clearStars}
                style={{ margin: "10px 22px 20px", background: "none", border: "1px solid rgba(180,120,140,.3)", color: "rgba(230,170,190,.65)", borderRadius: 999, padding: 9, fontSize: 9.5, letterSpacing: "0.2em", cursor: "pointer", fontFamily: "inherit" }}>
                DISSOLVE ALL STARS
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Capture overlay */}
      <AnimatePresence>
        {captureURL && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "absolute", inset: 0, background: "rgba(3,2,6,.93)", backdropFilter: "blur(10px)", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}
          >
            <img src={captureURL} alt="A whisper to the void" style={{ maxHeight: "72vh", maxWidth: "92vw", borderRadius: 14, boxShadow: "0 0 70px rgba(120,90,220,.45)" }} />
            <div style={{ color: "rgba(220,216,255,.65)", fontSize: 12, letterSpacing: "0.1em", marginTop: 16, textAlign: "center" }}>
              Long-press to save · ready for stories & reels
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <a href={captureURL} download="aether-whisper.png"
                style={{ background: "rgba(130,100,255,.16)", border: "1px solid rgba(160,140,255,.4)", color: "#e9e4ff", borderRadius: 999, padding: "11px 24px", fontSize: 12, letterSpacing: "0.16em", textDecoration: "none" }}>
                DOWNLOAD
              </a>
              <button onClick={() => setCaptureURL(null)}
                style={{ background: "none", border: "1px solid rgba(150,130,230,.3)", color: "rgba(220,216,255,.65)", borderRadius: 999, padding: "11px 22px", fontSize: 12, letterSpacing: "0.16em", cursor: "pointer", fontFamily: "inherit" }}>
                CLOSE
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
