"use client";

import dynamic from "next/dynamic";
import { useRef, useEffect, useState, useCallback } from "react";

const AetherCanvas = dynamic(() => import("./AetherCanvas"), { ssr: false });

// ══════════════════════════════════════════════════════════════════════════════
//  CANVAS COMPONENTS
//  All use Canvas 2D (no extra WebGL contexts — the hero already owns one).
// ══════════════════════════════════════════════════════════════════════════════

/* Rotating wireframe sphere with fibonacci-distributed surface particles */
function WireframeGlobe({ color = "#b892ff" }: { color?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    let raf = 0, t = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => { el.width = el.clientWidth * dpr; el.height = el.clientHeight * dpr; };
    resize();
    window.addEventListener("resize", resize, { passive: true });
    const ctx = el.getContext("2d")!;

    const draw = () => {
      const W = el.width, H = el.height;
      ctx.clearRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.37;
      const cosY = Math.cos(t), sinY = Math.sin(t);
      const cosX = Math.cos(t * 0.31), sinX = Math.sin(t * 0.31);

      const xf = (x: number, y: number, z: number) => {
        const x1 = x * cosY + z * sinY, z1 = -x * sinY + z * cosY;
        const y2 = y * cosX - z1 * sinX, z2 = y * sinX + z1 * cosX;
        const f = 1.5 / (1.5 + z2 * 0.38);
        return { sx: cx + x1 * f * R, sy: cy + y2 * f * R, z: z2 };
      };

      ctx.strokeStyle = color;
      // Latitude rings
      for (let lat = -80; lat <= 80; lat += 20) {
        const φ = lat * Math.PI / 180, cosφ = Math.cos(φ), sinφ = Math.sin(φ);
        ctx.globalAlpha = 0.09 + Math.abs(lat / 80) * 0.05;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        let first = true;
        for (let i = 0; i <= 72; i++) {
          const λ = i / 72 * Math.PI * 2;
          const { sx, sy } = xf(cosφ * Math.cos(λ), sinφ, cosφ * Math.sin(λ));
          if (first) { ctx.moveTo(sx, sy); first = false; } else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
      }
      // Meridians
      for (let lon = 0; lon < 180; lon += 30) {
        const λ = lon * Math.PI / 180;
        ctx.globalAlpha = 0.055;
        ctx.beginPath();
        let first = true;
        for (let i = 0; i <= 36; i++) {
          const φ = (i / 36 - 0.5) * Math.PI, cosφ = Math.cos(φ);
          const { sx, sy } = xf(cosφ * Math.cos(λ), Math.sin(φ), cosφ * Math.sin(λ));
          if (first) { ctx.moveTo(sx, sy); first = false; } else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
      }
      // Fibonacci surface particles
      ctx.fillStyle = color;
      const pts: Array<{ sx: number; sy: number; z: number }> = [];
      for (let i = 0; i < 110; i++) {
        const φ = Math.acos(1 - 2 * (i + 0.5) / 110);
        const λ = i * 2.39996;
        pts.push(xf(Math.sin(φ) * Math.cos(λ), Math.cos(φ), Math.sin(φ) * Math.sin(λ)));
      }
      pts.sort((a, b) => a.z - b.z);
      for (const p of pts) {
        if (p.z < -0.25) continue;
        ctx.globalAlpha = Math.max(0.04, (p.z + 1) * 0.38);
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      t += 0.0042;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [color]);
  return <canvas ref={ref} style={{ width: "100%", height: "100%", display: "block" }} />;
}

/* Expanding hexagonal rings converging to a vanishing point — wormhole */
function PortalTunnel({ color = "#b892ff" }: { color?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    let raf = 0, t = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => { el.width = el.clientWidth * dpr; el.height = el.clientHeight * dpr; };
    resize();
    window.addEventListener("resize", resize, { passive: true });
    const ctx = el.getContext("2d")!;

    const draw = () => {
      const W = el.width, H = el.height;
      ctx.fillStyle = "rgba(5,3,10,0.07)";
      ctx.fillRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2;
      const maxR = Math.min(W, H) * 0.52;

      for (let i = 0; i < 34; i++) {
        const prog = ((i / 34) + t * 0.2) % 1;
        const r = (1 - prog) * maxR + 5;
        const a = prog * 0.5;
        const twist = prog * Math.PI * 3.5;
        const sides = 7;
        ctx.globalAlpha = a;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.6 * (1 - prog * 0.7);
        ctx.beginPath();
        for (let s = 0; s <= sides; s++) {
          const ang = (s / sides) * Math.PI * 2 + twist;
          const x = cx + Math.cos(ang) * r;
          const y = cy + Math.sin(ang) * r * 0.58;
          s === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      // Core glow
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.22);
      g.addColorStop(0, color + "55"); g.addColorStop(0.6, color + "18"); g.addColorStop(1, "transparent");
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, maxR * 0.22, 0, Math.PI * 2); ctx.fill();

      t += 0.007;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [color]);
  return <canvas ref={ref} style={{ width: "100%", height: "100%", display: "block" }} />;
}

/* Six layered sine waves — different galaxy frequency signatures */
function AudioWaves() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    let raf = 0, t = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => { el.width = el.clientWidth * dpr; el.height = el.clientHeight * dpr; };
    resize();
    window.addEventListener("resize", resize, { passive: true });
    const ctx = el.getContext("2d")!;

    const W_arr = [
      { c: "#b892ff", f: 1.1,  a: 0.21, ph: 0.0 },
      { c: "#ff88aa", f: 2.4,  a: 0.14, ph: 1.1 },
      { c: "#44ddff", f: 0.75, a: 0.18, ph: 2.0 },
      { c: "#ffcc44", f: 3.8,  a: 0.10, ph: 0.5 },
      { c: "#88ffcc", f: 1.85, a: 0.13, ph: 2.7 },
      { c: "#ff6644", f: 2.9,  a: 0.08, ph: 1.4 },
    ];

    const draw = () => {
      const W = el.width, H = el.height;
      ctx.clearRect(0, 0, W, H);
      W_arr.forEach((w, i) => {
        const cy = H * (0.16 + i * 0.13);
        const amp = H * w.a;
        ctx.beginPath();
        for (let x = 0; x <= W; x += 3) {
          const n = x / W;
          const y = cy + Math.sin(n * w.f * Math.PI * 8 + t * 2.3 + w.ph) * amp * Math.sin(n * Math.PI);
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = w.c; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.68; ctx.stroke();
        ctx.lineWidth = 6;      ctx.globalAlpha = 0.10; ctx.stroke();
      });
      t += 0.017;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} style={{ width: "100%", height: "100%", display: "block" }} />;
}



// ══════════════════════════════════════════════════════════════════════════════
//  ACT COMPONENTS — demonstrated, not described
// ══════════════════════════════════════════════════════════════════════════════

/* ACT I — a quiet field of particles that gathers itself around whatever is typed */
function WhisperField({ text }: { text: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const pullRef = useRef(0);
  useEffect(() => { pullRef.current = Math.min(1, text.trim().length / 24); }, [text]);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    let raf = 0, t = 0, pull = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => { el.width = el.clientWidth * dpr; el.height = el.clientHeight * dpr; };
    resize();
    window.addEventListener("resize", resize, { passive: true });
    const ctx = el.getContext("2d")!;
    const golden = Math.PI * (3 - Math.sqrt(5));
    const N = 160;
    const pts = Array.from({ length: N }, (_, i) => ({
      rx: Math.random(), ry: Math.random(),
      gr: Math.sqrt(i / N), ga: i * golden,
      phase: Math.random() * Math.PI * 2,
    }));

    const draw = () => {
      const W = el.width, H = el.height, cx = W / 2, cy = H / 2, S = Math.min(W, H) * 0.42;
      pull += (pullRef.current - pull) * 0.06;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#cfc6ff";
      for (const p of pts) {
        const scatterX = p.rx * W, scatterY = p.ry * H;
        const gx = cx + Math.cos(p.ga) * p.gr * S, gy = cy + Math.sin(p.ga) * p.gr * S;
        const x = scatterX + (gx - scatterX) * pull;
        const y = scatterY + (gy - scatterY) * pull;
        const tw = 0.35 + Math.sin(t * 0.6 + p.phase) * 0.2;
        ctx.globalAlpha = (0.2 + pull * 0.5) * (tw + 0.5);
        ctx.beginPath(); ctx.arc(x, y, 1 + pull * 0.6, 0, Math.PI * 2); ctx.fill();
      }
      if (pull > 0.04) {
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * 0.5);
        g.addColorStop(0, `rgba(184,146,255,${0.1 * pull})`); g.addColorStop(1, "transparent");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, S * 0.5, 0, Math.PI * 2); ctx.fill();
      }
      t += 0.016;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} style={{ width: "100%", height: "100%", display: "block" }} />;
}

/* ACT II — the 32 forms as a field of points, not a card grid */
function FormsField({ onHover, focusIndex = null }: { onHover: (i: number | null) => void; focusIndex?: number | null }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const hoverRef = useRef<number | null>(null);
  const focusRef = useRef<number | null>(focusIndex);
  const posRef = useRef<{ x: number; y: number }[]>([]);
  useEffect(() => { focusRef.current = focusIndex; if (focusIndex !== null) onHover(focusIndex); }, [focusIndex, onHover]);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    let raf = 0, t = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => { el.width = el.clientWidth * dpr; el.height = el.clientHeight * dpr; };
    resize();
    window.addEventListener("resize", resize, { passive: true });
    const ctx = el.getContext("2d")!;
    const golden = Math.PI * (3 - Math.sqrt(5));
    const N = GALAXY_FORMS.length;

    const move = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * dpr, my = (e.clientY - rect.top) * dpr;
      let best = -1, bestD = 26 * dpr;
      posRef.current.forEach((p, i) => {
        const d = Math.hypot(p.x - mx, p.y - my);
        if (d < bestD) { bestD = d; best = i; }
      });
      if (hoverRef.current !== (best < 0 ? null : best)) {
        hoverRef.current = best < 0 ? null : best;
        onHover(hoverRef.current ?? focusRef.current);
      }
    };
    const leave = () => { hoverRef.current = null; onHover(focusRef.current); };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);

    const draw = () => {
      const W = el.width, H = el.height, cx = W / 2, cy = H / 2, S = Math.min(W, H) * 0.46;
      ctx.clearRect(0, 0, W, H);
      posRef.current = [];
      const activeIdx = hoverRef.current ?? focusRef.current;
      for (let i = 0; i < N; i++) {
        const r = Math.sqrt((i + 0.5) / N) * S;
        const a = i * golden + t * 0.02;
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.62;
        posRef.current.push({ x, y });
        const active = activeIdx === i;
        const c = GALAXY_FORMS[i].color;
        ctx.fillStyle = c;
        ctx.globalAlpha = active ? 1 : 0.42 + Math.sin(t * 0.5 + i) * 0.08;
        if (active) { ctx.shadowColor = c; ctx.shadowBlur = 14 * dpr; }
        ctx.beginPath(); ctx.arc(x, y, active ? 3.6 * dpr : 2 * dpr, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }
      t += 0.016;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf); window.removeEventListener("resize", resize);
      el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave);
    };
  }, [onHover]);
  return <canvas ref={ref} style={{ width: "100%", height: "100%", display: "block", cursor: "crosshair" }} />;
}

/* ACT III — a waveform that only moves because the visitor's cursor moves */
function SoundField() {
  const ref = useRef<HTMLCanvasElement>(null);
  const energyRef = useRef(0);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    let raf = 0, t = 0, lastX = -1, lastY = -1, energy = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => { el.width = el.clientWidth * dpr; el.height = el.clientHeight * dpr; };
    resize();
    window.addEventListener("resize", resize, { passive: true });
    const ctx = el.getContext("2d")!;
    const move = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      if (lastX >= 0) energyRef.current = Math.min(1, energyRef.current + Math.hypot(x - lastX, y - lastY) * 0.01);
      lastX = x; lastY = y;
    };
    el.addEventListener("pointermove", move);

    const LAYERS = [
      { c: "#b892ff", f: 1.2, ph: 0 }, { c: "#44ddff", f: 2.1, ph: 1.4 }, { c: "#ff88aa", f: 0.7, ph: 2.6 },
    ];
    const draw = () => {
      const W = el.width, H = el.height, cy = H / 2;
      energy += (energyRef.current - energy) * 0.05;
      energyRef.current = Math.max(0, energyRef.current - 0.006);
      ctx.clearRect(0, 0, W, H);
      LAYERS.forEach((l, i) => {
        const amp = H * (0.03 + energy * 0.16) / (i + 1);
        ctx.beginPath();
        for (let x = 0; x <= W; x += 4) {
          const n = x / W;
          const y = cy + Math.sin(n * l.f * Math.PI * 8 + t * (1.4 + energy * 2) + l.ph) * amp * Math.sin(n * Math.PI);
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = l.c; ctx.lineWidth = 1.4 * dpr; ctx.globalAlpha = 0.55 + energy * 0.35; ctx.stroke();
      });
      t += 0.014 + energy * 0.01;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); el.removeEventListener("pointermove", move); };
  }, []);
  return <canvas ref={ref} style={{ width: "100%", height: "100%", display: "block" }} />;
}

/* ACT IV — faint stars; one remembered */
function MemoryField({ onSelect, focusIndex = null }: { onSelect: (i: number | null) => void; focusIndex?: number | null }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const selRef = useRef<number | null>(null);
  const travelRef = useRef(0);
  const posRef = useRef<{ x: number; y: number }[]>([]);
  useEffect(() => { if (focusIndex !== null) { selRef.current = focusIndex; onSelect(focusIndex); } }, [focusIndex, onSelect]);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    let raf = 0, t = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => { el.width = el.clientWidth * dpr; el.height = el.clientHeight * dpr; };
    resize();
    window.addEventListener("resize", resize, { passive: true });
    const ctx = el.getContext("2d")!;
    const STARS = Array.from({ length: 22 }, () => ({
      x: 0.08 + Math.random() * 0.84, y: 0.12 + Math.random() * 0.76,
      r: 1 + Math.random() * 2, phase: Math.random() * Math.PI * 2,
    }));

    const click = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const mx = (e.clientX - rect.left) / rect.width, my = (e.clientY - rect.top) / rect.height;
      let best = -1, bestD = 0.055;
      STARS.forEach((s, i) => { const d = Math.hypot(s.x - mx, s.y - my); if (d < bestD) { bestD = d; best = i; } });
      selRef.current = best < 0 ? null : best;
      onSelect(selRef.current);
    };
    el.addEventListener("pointerdown", click);

    const draw = () => {
      const W = el.width, H = el.height;
      travelRef.current += ((selRef.current !== null ? 1 : 0) - travelRef.current) * 0.05;
      ctx.clearRect(0, 0, W, H);
      posRef.current = STARS.map(s => ({ x: s.x * W, y: s.y * H }));
      STARS.forEach((s, i) => {
        const selected = selRef.current === i;
        const dim = selRef.current !== null && !selected;
        const pulse = 1 + Math.sin(t * 0.9 + s.phase) * 0.3;
        ctx.fillStyle = selected ? "#ffd9a8" : "#b892ff";
        ctx.globalAlpha = dim ? 0.12 : selected ? 0.95 : 0.5 + Math.sin(t * 0.9 + s.phase) * 0.25;
        if (selected) { ctx.shadowColor = "#ffd9a8"; ctx.shadowBlur = 16 * dpr; }
        ctx.beginPath(); ctx.arc(s.x * W, s.y * H, (selected ? s.r * 1.8 : s.r) * pulse, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      });
      t += 0.013;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); el.removeEventListener("pointerdown", click); };
  }, [onSelect]);
  return <canvas ref={ref} style={{ width: "100%", height: "100%", display: "block", cursor: "pointer" }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
//  DATA
// ══════════════════════════════════════════════════════════════════════════════

const GALAXY_FORMS = [
  { label: "SPIRAL GALAXY",      color: "#b892ff", theme: "Wonder · Growth · Journey" },
  { label: "BARRED SPIRAL",      color: "#ff88aa", theme: "Structure · Discipline · Order" },
  { label: "ELLIPTICAL GALAXY",  color: "#ffcc44", theme: "Age · Wisdom · Serenity" },
  { label: "RING GALAXY",        color: "#44ddff", theme: "Cycles · Completeness · Destiny" },
  { label: "GALAXY MERGER",      color: "#ff6644", theme: "Conflict · Union · Collision" },
  { label: "ACTIVE QUASAR",      color: "#ff4488", theme: "Intensity · Brilliance · Power" },
  { label: "SUPERNOVA REMNANT",  color: "#ff8844", theme: "Transformation · Endings · Rebirth" },
  { label: "COSMIC FILAMENT",    color: "#88ffcc", theme: "Connection · Web of Life" },
  { label: "HOURGLASS NEBULA",   color: "#cc88ff", theme: "Duality · Time · Balance" },
  { label: "TIDAL STREAM",       color: "#44aaff", theme: "Longing · Drift · Distance" },
  { label: "IRREGULAR GALAXY",   color: "#ffaa44", theme: "Chaos · Creativity · Wildness" },
  { label: "LENTICULAR GALAXY",  color: "#aaccff", theme: "Memory · The Past · Faded Clarity" },
  { label: "GLOBULAR CLUSTER",   color: "#eeddff", theme: "Unity · Perfection · The Whole" },
  { label: "EMISSION NEBULA",    color: "#ff44aa", theme: "Birth · Potential · The Unformed" },
  { label: "COSMIC VORTEX",      color: "#8844ff", theme: "Obsession · Spiral of Thought" },
  { label: "POLAR RING GALAXY",  color: "#4466ff", theme: "Perpendicular Paths · Crossing Fates" },
  { label: "CARTWHEEL GALAXY",   color: "#ff3388", theme: "Impact · Ripples · Aftermath" },
  { label: "STARBURST GALAXY",   color: "#ffaa22", theme: "Explosion · Creation · Raw Energy" },
  { label: "JELLYFISH GALAXY",   color: "#00ffdd", theme: "Surrender · Drift · Fluid Grace" },
  { label: "SHELL GALAXY",       color: "#aa88ff", theme: "Layers · Past Lives · Sediment of Time" },
  { label: "ACCRETION DISK",     color: "#ff6600", theme: "Hunger · Inevitability · The Point of No Return" },
  { label: "PULSAR WIND NEBULA", color: "#44ddff", theme: "Precision · Rhythm · The Cosmic Clock" },
  { label: "COSMIC VOID",        color: "#334488", theme: "Silence · Emptiness · The Space Between" },
  { label: "MAGNETAR FIELD",     color: "#ff2266", theme: "Extreme Force · Magnetic Fury · The Unseen" },
  { label: "EINSTEIN RING",      color: "#ffee44", theme: "Perception · Bending Light · Illusion" },
  { label: "RELIC GALAXY",       color: "#ccaa88", theme: "Antiquity · Compression · Survivor" },
  { label: "LORENZ ATTRACTOR",   color: "#88ffaa", theme: "Deterministic Chaos · Butterfly Effect" },
  { label: "CHLADNI CYMATICS",   color: "#ff88ff", theme: "Sound Made Visible · Hidden Order" },
  { label: "PLASMA FILAMENT",    color: "#ff4400", theme: "Electric · Branching · Alive" },
  { label: "PROTOSTELLAR DISK",  color: "#ffcc66", theme: "Beginning · Potential · A Sun Being Born" },
  { label: "PHYLLOTAXIS BLOOM",  color: "#ffd966", theme: "Growth · Pattern · The Golden Angle" },
  { label: "MÖBIUS RING",        color: "#66ffd9", theme: "Continuity · One Surface · No Beginning" },
  { label: "TREFOIL KNOT",       color: "#c896ff", theme: "Entanglement · Return · No Beginning, No End" },
  { label: "COSMIC DENDRITE",    color: "#7affb0", theme: "Growth · Branching · Emergence" },
];

const PLANS = [
  {
    tier: "EXPLORER",
    price: "Free",
    cycle: "forever",
    color: "#b892ff",
    blurb: "Five whispers a day, ten stars kept, six living forms, and the ambient soundscape.",
  },
  {
    tier: "COSMIC",
    price: "$9",
    cycle: "per month",
    color: "#ff88aa",
    blurb: "Unlimited whispers, all thirty-four forms, full spatial audio, 4K capture, custom palettes.",
  },
  {
    tier: "ETERNAL",
    price: "$29",
    cycle: "one time",
    color: "#44ddff",
    blurb: "Everything in Cosmic, permanently — plus early access to new forms and a named star of your own.",
  },
];

const FREQ_SAMPLES = [
  { form: "RING GALAXY",       sound: "Bell harmonics — C5 overtone series", color: "#44ddff" },
  { form: "ELLIPTICAL",        sound: "Deep sub-bass — 36 Hz slow bow",      color: "#ffcc44" },
  { form: "COSMIC VORTEX",     sound: "1600 → 55 Hz descending spiral",      color: "#8844ff" },
  { form: "SPIRAL GALAXY",     sound: "Pentatonic arpeggio — C E G C′ E′",   color: "#b892ff" },
  { form: "SUPERNOVA REMNANT", sound: "Noise burst → silence → shimmer",     color: "#ff8844" },
];

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function LandingPage() {
  const heroRef   = useRef<HTMLDivElement>(null);
  const [navUp,    setNavUp]    = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [email,    setEmail]    = useState("");
  const [joined,   setJoined]   = useState(false);
  const [visible,  setVisible]  = useState<Set<string>>(new Set());
  const [whisperText,   setWhisperText]   = useState("");
  const [hoveredForm,   setHoveredForm]   = useState<number | null>(null);
  const [selectedMemory, setSelectedMemory] = useState<number | null>(null);
  const [kbFormIndex, setKbFormIndex] = useState<number | null>(null);
  const [kbMemoryIndex, setKbMemoryIndex] = useState<number | null>(null);
  const MEMORY_STAR_COUNT = 22; // must match MemoryField's internal STARS length

  const onFormsKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const total = GALAXY_FORMS.length;
    setKbFormIndex(cur => {
      const base = cur ?? -1;
      return (base + (e.key === "ArrowRight" ? 1 : -1) + total) % total;
    });
  }, []);
  const onMemoryKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    setKbMemoryIndex(cur => {
      const base = cur ?? -1;
      return (base + (e.key === "ArrowRight" ? 1 : -1) + MEMORY_STAR_COUNT) % MEMORY_STAR_COUNT;
    });
  }, []);

  useEffect(() => {
    const check = () => {
      const h = window.innerHeight;
      setNavUp(window.scrollY > h * 0.65);
      setScrolled(window.scrollY > h * 0.8);
      setIsMobile(window.innerWidth < 768);
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check, { passive: true });
    return () => { window.removeEventListener("scroll", check); window.removeEventListener("resize", check); };
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting)
          setVisible(v => { const n = new Set(v); n.add(e.target.id); return n; });
      }),
      { threshold: 0.08 },
    );
    document.querySelectorAll("[data-reveal]").forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const reveal = (id: string, delay = 0): React.CSSProperties => ({
    opacity:   visible.has(id) ? 1 : 0,
    transform: visible.has(id) ? "none" : "translateY(30px)",
    transition: `opacity 1s ${delay}s ease, transform 1s ${delay}s ease`,
  });

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  const scrollToTop = () => heroRef.current?.scrollIntoView({ behavior: "smooth" });

  const L = "1px solid rgba(150,130,230,0.1)";

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────────
          STICKY NAV
      ───────────────────────────────────────────────────────────────── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 900,
        background: "rgba(5,3,10,0.84)", backdropFilter: "blur(22px)",
        borderBottom: L, padding: "15px 36px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        transition: "transform 0.55s cubic-bezier(0.4,0,0.2,1), opacity 0.55s ease",
        transform: navUp ? "translateY(0)" : "translateY(-100%)",
        opacity: navUp ? 1 : 0,
        pointerEvents: navUp ? "auto" : "none",
      }}>
        <button onClick={scrollToTop}
          style={{ background: "none", border: "none", color: "#eceaff", fontSize: 11, letterSpacing: "0.6em", cursor: "pointer", fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
          A E T H E R
        </button>
        {!isMobile && (
          <div style={{ display: "flex", gap: 32 }}>
            {([ ["EXPLORE", "feat-h2"], ["FORMS", "act-2"], ["SOUND", "freq-h2"], ["PRICING", "price-h2"] ] as const).map(([lbl, id]) => (
              <button key={id} onClick={() => scrollTo(id)}
                style={{ background: "none", border: "none", color: "rgba(200,196,235,0.48)", fontSize: 9, letterSpacing: "0.38em", cursor: "pointer", fontFamily: "'Helvetica Neue', Arial, sans-serif", transition: "color 0.3s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#b892ff")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(200,196,235,0.48)")}
              >
                {lbl}
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* ─────────────────────────────────────────────────────────────────
          SECTION 1 — HERO
      ───────────────────────────────────────────────────────────────── */}
      <section ref={heroRef}
        style={{ position: "relative", height: "100svh", overflow: "hidden" }}>
        <AetherCanvas />
      </section>

      {/* ─────────────────────────────────────────────────────────────────
          TICKER STRIP
      ───────────────────────────────────────────────────────────────── */}
      <div style={{ background: "#07030f", borderTop: L, borderBottom: L, overflow: "hidden", padding: "13px 0" }}>
        <div style={{ display: "flex", animation: "aether-ticker-l 44s linear infinite", whiteSpace: "nowrap" }}>
          {[0, 1].map(k => (
            <span key={k} style={{ display: "inline-flex", alignItems: "center" }}>
              {["40,000 PARTICLES", "34 GALAXY FORMS", "SPATIAL AUDIO ENGINE", "AI-POWERED COSMOS", "3D REAL-TIME MORPH", "CONSTELLATION MEMORY", "LIVE SOUNDSCAPES", "WHISPER TO THE VOID"].map(item => (
                <span key={item} style={{ color: "rgba(200,196,235,0.3)", fontSize: 9.5, letterSpacing: "0.38em", paddingRight: "3.5em", display: "inline-block" }}>
                  {item} <span style={{ color: "#b892ff55" }}>·</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────
          SECTION 2 — MANIFESTO  (editorial split, no cards)
      ───────────────────────────────────────────────────────────────── */}
      <section style={{ background: "#050308", borderBottom: L, padding: isMobile ? "80px 28px" : "130px 64px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 60 : 100, alignItems: "center" }}>
          <div>
            <div id="mani-eye" data-reveal
              style={{ ...reveal("mani-eye"), color: "rgba(184,146,255,0.45)", fontSize: 9.5, letterSpacing: "0.52em", marginBottom: 28 }}>
              A LIVING COSMOS
            </div>
            <blockquote id="mani-q" data-reveal
              style={{ ...reveal("mani-q", 0.1), margin: "0 0 32px", padding: 0, color: "#f0ecff", fontSize: "clamp(22px, 3.4vw, 42px)", fontWeight: 200, fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic", lineHeight: 1.42, letterSpacing: "0.01em" }}>
              "Every civilization has looked up and asked.<br />
              Until now, none of them answered back."
            </blockquote>
            <p id="mani-sub" data-reveal
              style={{ ...reveal("mani-sub", 0.2), margin: "0 0 44px", color: "rgba(200,196,235,0.45)", fontSize: "clamp(14px, 1.6vw, 16px)", lineHeight: 1.88, fontFamily: "Georgia, serif", fontStyle: "italic", maxWidth: 520 }}>
              Aether is not an app. It is an instrument — an AI-powered particle universe that listens to the shape of your thoughts and rearranges 40,000 stars into something uniquely, quietly yours.
            </p>
            <button id="mani-cta" data-reveal onClick={() => scrollTo("feat-h2")}
              style={{ ...reveal("mani-cta", 0.3), background: "none", border: "1px solid rgba(184,146,255,0.28)", color: "rgba(200,196,235,0.65)", borderRadius: 999, padding: "13px 28px", fontSize: 10, letterSpacing: "0.3em", cursor: "pointer", fontFamily: "'Helvetica Neue', Arial, sans-serif", transition: "all 0.4s ease" }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "rgba(184,146,255,0.55)"; el.style.color = "#f0ecff"; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "rgba(184,146,255,0.28)"; el.style.color = "rgba(200,196,235,0.65)"; }}>
              EXPLORE AETHER ↓
            </button>
          </div>
          <div style={{ height: isMobile ? 300 : 500, position: "relative" }}>
            <WireframeGlobe color="#b892ff" />
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────
          SECTION 3 — DISCOVERY  (four acts, demonstrated not announced)
      ───────────────────────────────────────────────────────────────── */}
      <section style={{ background: "#050308", borderBottom: L }} id="feat-h2">

        {/* PROCESS STRIP — the map before the territory. A single restrained
            line instead of a card grid: states the shape of the experience
            up front, and doubles as real navigation (click a word, travel
            to that Act) rather than being purely decorative. */}
        <div id="how-strip" data-reveal style={{
          ...reveal("how-strip"), display: "flex", alignItems: "center", justifyContent: "center",
          gap: isMobile ? 10 : 22, flexWrap: "wrap", padding: isMobile ? "56px 24px 0" : "80px 64px 0",
        }}>
          {[
            { label: "WHISPER",  id: "act-1", color: "#b892ff" },
            { label: "TRANSFORM", id: "act-2", color: "#ff88aa" },
            { label: "LISTEN",   id: "act-3", color: "#44ddff" },
            { label: "REMEMBER", id: "act-4", color: "#ffd9a8" },
          ].map((s, i, arr) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 22 }}>
              <button onClick={() => scrollTo(s.id)} style={{
                background: "none", border: "none", cursor: "pointer", padding: 0,
                color: "rgba(200,196,235,0.4)", fontSize: isMobile ? 10 : 11, letterSpacing: "0.32em",
                fontFamily: "'Helvetica Neue', Arial, sans-serif", transition: "color 0.35s ease",
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = s.color; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(200,196,235,0.4)"; }}>
                {s.label}
              </button>
              {i < arr.length - 1 && <span style={{ color: "rgba(184,146,255,0.22)", fontSize: 12 }}>—</span>}
            </div>
          ))}
        </div>

        {/* ACT I — THE UNIVERSE LISTENS */}
        <div id="act-1" data-reveal style={{ ...reveal("act-1"), maxWidth: 720, margin: "0 auto", padding: isMobile ? "120px 28px 60px" : "180px 64px 80px", textAlign: "center" }}>
          <div style={{ color: "rgba(184,146,255,0.4)", fontSize: 9.5, letterSpacing: "0.5em", marginBottom: 28 }}>WHISPER</div>
          <div style={{ height: isMobile ? 220 : 300, position: "relative", marginBottom: 36 }}>
            <WhisperField text={whisperText} />
          </div>
          <input
            value={whisperText}
            onChange={e => setWhisperText(e.target.value)}
            placeholder="whisper something…"
            style={{
              background: "none", border: "none", borderBottom: "1px solid rgba(184,146,255,0.25)",
              color: "#eee9ff", fontSize: 16, fontFamily: "Georgia, serif", fontStyle: "italic",
              textAlign: "center", padding: "8px 4px", outline: "none", width: "100%", maxWidth: 380,
            }}
          />
          <p style={{
            marginTop: 26, color: "rgba(200,196,235,0.4)", fontSize: 13.5, fontFamily: "Georgia, serif", fontStyle: "italic",
            opacity: whisperText.trim().length > 0 ? 1 : 0, transition: "opacity 1.4s ease", minHeight: 20,
          }}>
            A thought can become a universe.
          </p>
        </div>

        {/* ACT II — 32 FORMS */}
        <div id="act-2" data-reveal style={{ ...reveal("act-2"), borderTop: L, padding: isMobile ? "70px 28px" : "110px 64px", textAlign: "center", position: "relative" }}>
          <div style={{ color: "rgba(255,136,170,0.4)", fontSize: 9.5, letterSpacing: "0.5em", marginBottom: 28 }}>TRANSFORM</div>
          <div
            role="listbox" aria-label="32 galaxy forms — use arrow keys to browse"
            tabIndex={0} onKeyDown={onFormsKeyDown}
            style={{ height: isMobile ? 320 : 460, position: "relative", maxWidth: 720, margin: "0 auto" }}
          >
            <FormsField onHover={setHoveredForm} focusIndex={kbFormIndex} />
            <div style={{
              position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
              pointerEvents: "none", textAlign: "center", transition: "opacity 0.25s ease",
              opacity: hoveredForm !== null ? 1 : 0,
            }}>
              {hoveredForm !== null && (
                <>
                  <div style={{ color: GALAXY_FORMS[hoveredForm].color, fontSize: 11, letterSpacing: "0.32em", marginBottom: 6, textShadow: `0 0 16px ${GALAXY_FORMS[hoveredForm].color}77` }}>
                    {GALAXY_FORMS[hoveredForm].label}
                  </div>
                  <div style={{ color: "rgba(200,196,235,0.5)", fontSize: 12, fontFamily: "Georgia, serif", fontStyle: "italic" }}>
                    {GALAXY_FORMS[hoveredForm].theme}
                  </div>
                </>
              )}
            </div>
          </div>
          <p style={{ marginTop: 8, color: "rgba(200,196,235,0.3)", fontSize: 12, fontFamily: "Georgia, serif", fontStyle: "italic" }}>
            {isMobile ? "touch a point" : "move your cursor through the field"}
          </p>
        </div>

        {/* ACT III — SOUND */}
        <div id="act-3" data-reveal style={{ ...reveal("act-3"), borderTop: L, padding: isMobile ? "70px 28px" : "110px 64px", textAlign: "center" }}>
          <div style={{ color: "rgba(184,146,255,0.4)", fontSize: 9.5, letterSpacing: "0.5em", marginBottom: 28 }}>LISTEN</div>
          <div style={{ height: isMobile ? 160 : 200, position: "relative", maxWidth: 780, margin: "0 auto" }}>
            <SoundField />
          </div>
          <p style={{ marginTop: 24, color: "rgba(200,196,235,0.34)", fontSize: 13, fontFamily: "Georgia, serif", fontStyle: "italic" }}>
            the universe has a voice — move to hear it change
          </p>
        </div>

        {/* ACT IV — MEMORY */}
        <div id="act-4" data-reveal style={{ ...reveal("act-4"), borderTop: L, padding: isMobile ? "70px 28px" : "110px 64px", textAlign: "center" }}>
          <div style={{ color: "rgba(255,217,168,0.4)", fontSize: 9.5, letterSpacing: "0.5em", marginBottom: 28 }}>REMEMBER</div>
          <div
            role="listbox" aria-label="saved memories — use arrow keys to browse"
            tabIndex={0} onKeyDown={onMemoryKeyDown}
            style={{ height: isMobile ? 260 : 340, position: "relative", maxWidth: 640, margin: "0 auto" }}
          >
            <MemoryField onSelect={setSelectedMemory} focusIndex={kbMemoryIndex} />
          </div>
          <p style={{
            marginTop: 20, color: "rgba(255,217,168,0.55)", fontSize: 14, fontFamily: "Georgia, serif", fontStyle: "italic",
            opacity: selectedMemory !== null ? 1 : 0, transition: "opacity 1s ease", minHeight: 20,
          }}>
            Some things remain.
          </p>
        </div>

        {/* Instrumentation — numbers as discovered metadata, not announced stats */}
        <div style={{ borderTop: L, padding: "26px 28px", textAlign: "center", display: "flex", justifyContent: "center", gap: isMobile ? 16 : 32, flexWrap: "wrap" }}>
          {["~40,000 PARTICLES", "34 FORMS", "REAL-TIME"].map(s => (
            <span key={s} style={{ color: "rgba(200,196,235,0.24)", fontSize: 9, letterSpacing: "0.3em" }}>{s}</span>
          ))}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────
          SECTION 7 — FREQUENCIES  (audio wave visualization)
      ───────────────────────────────────────────────────────────────── */}
      <section style={{ background: "#07030f", borderBottom: L, padding: isMobile ? "80px 28px" : "100px 64px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div id="freq-eye" data-reveal style={{ ...reveal("freq-eye"), color: "rgba(184,146,255,0.44)", fontSize: 9.5, letterSpacing: "0.52em", marginBottom: 14 }}>SPATIAL AUDIO</div>
          <h2 id="freq-h2" data-reveal style={{ ...reveal("freq-h2", 0.08), color: "#f0ecff", fontSize: "clamp(26px, 4.2vw, 50px)", fontWeight: 200, fontFamily: "Georgia, serif", letterSpacing: "0.04em", marginBottom: 16 }}>
            Every galaxy speaks differently
          </h2>
          <p id="freq-sub" data-reveal style={{ ...reveal("freq-sub", 0.16), color: "rgba(200,196,235,0.45)", fontSize: "clamp(14px, 1.6vw, 16px)", lineHeight: 1.85, fontFamily: "Georgia, serif", fontStyle: "italic", maxWidth: 560, marginBottom: 52 }}>
            The moment a galaxy form appears, its sonic environment activates — a unique audio world generated from the emotional signature of its shape and your whisper.
          </p>
          <div id="freq-canvas" data-reveal style={{ ...reveal("freq-canvas", 0.22), height: 200, borderRadius: 4, overflow: "hidden", border: L, marginBottom: 36 }}>
            <AudioWaves />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: isMobile ? 18 : 28 }}>
            {FREQ_SAMPLES.map(f => (
              <div key={f.form} style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 160 }}>
                <span style={{ color: f.color, fontSize: 8.5, letterSpacing: "0.34em" }}>{f.form}</span>
                <span style={{ color: "rgba(200,196,235,0.38)", fontSize: 11.5, fontFamily: "Georgia, serif", fontStyle: "italic" }}>{f.sound}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────
          SECTION 8 — PRICING  (orbital background, editorial layout)
      ───────────────────────────────────────────────────────────────── */}
      <section style={{ background: "#050308", borderBottom: L, padding: isMobile ? "80px 28px" : "110px 64px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
          <div id="price-eye" data-reveal style={{ ...reveal("price-eye"), color: "rgba(184,146,255,0.44)", fontSize: 9.5, letterSpacing: "0.52em", marginBottom: 14 }}>PRICING</div>
          <h2 id="price-h2" data-reveal style={{ ...reveal("price-h2", 0.08), color: "#f0ecff", fontSize: "clamp(24px, 3.6vw, 40px)", fontWeight: 200, fontFamily: "Georgia, serif", letterSpacing: "0.04em", marginBottom: 14 }}>
            Aether is free to explore
          </h2>
          <p id="price-sub" data-reveal style={{ ...reveal("price-sub", 0.14), color: "rgba(200,196,235,0.42)", fontSize: "clamp(13px, 1.5vw, 15px)", fontFamily: "Georgia, serif", fontStyle: "italic", marginBottom: 56 }}>
            Three tiers are being built for the deeper journey. Here is what they will hold.
          </p>

          <div id="price-tiers" data-reveal style={{ ...reveal("price-tiers", 0.2), borderTop: L }}>
            {PLANS.map(p => (
              <div key={p.tier} style={{ padding: "30px 0", borderBottom: L, display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "center" : "baseline", gap: isMobile ? 8 : 24, textAlign: isMobile ? "center" : "left" }}>
                <div style={{ flexShrink: 0, width: isMobile ? "auto" : 150 }}>
                  <span style={{ color: p.color, fontSize: 10, letterSpacing: "0.36em" }}>{p.tier}</span>
                  <span style={{ color: "rgba(200,196,235,0.35)", fontSize: 11, marginLeft: isMobile ? 8 : 0, display: isMobile ? "inline" : "block", marginTop: isMobile ? 0 : 4 }}>
                    {p.price} · {p.cycle}
                  </span>
                </div>
                <p style={{ color: "rgba(200,196,235,0.55)", fontSize: 13.5, fontFamily: "Georgia, serif", fontStyle: "italic", lineHeight: 1.7, margin: 0, flex: 1 }}>
                  {p.blurb}
                </p>
              </div>
            ))}
          </div>

          {/* Waitlist — the one action that's actually live right now */}
          <div id="waitlist" data-reveal style={{ ...reveal("waitlist", 0.32), maxWidth: 420, margin: "56px auto 0" }}>
            <div style={{ color: "rgba(200,196,235,0.42)", fontSize: 12.5, fontFamily: "Georgia, serif", fontStyle: "italic", marginBottom: 18 }}>
              Leave your address, and Aether will find you when it opens.
            </div>
            {joined ? (
              <div style={{ color: "#b892ff", fontSize: 14, fontFamily: "Georgia, serif", fontStyle: "italic", textShadow: "0 0 20px #b892ff55", lineHeight: 1.7 }}>
                ✦ &nbsp;You are now among the stars. We will find you.
              </div>
            ) : (
              <form onSubmit={e => { e.preventDefault(); if (email.trim()) setJoined(true); }} style={{ display: "flex", gap: 10 }}>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@cosmos.com" required
                  style={{ flex: 1, background: "none", border: "none", borderBottom: "1px solid rgba(150,130,230,.28)", color: "#eee9ff", fontSize: 13.5, padding: "10px 4px", outline: "none", fontFamily: "Georgia, serif", minWidth: 0 }} />
                <button type="submit"
                  style={{ background: "none", border: "1px solid rgba(184,146,255,0.28)", color: "rgba(200,196,235,0.65)", borderRadius: 999, padding: "10px 22px", fontSize: 10.5, letterSpacing: "0.22em", cursor: "pointer", whiteSpace: "nowrap", fontFamily: "'Helvetica Neue',Arial,sans-serif", flexShrink: 0, transition: "all 0.35s ease" }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "rgba(184,146,255,0.55)"; el.style.color = "#f0ecff"; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "rgba(184,146,255,0.28)"; el.style.color = "rgba(200,196,235,0.65)"; }}>
                  JOIN
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────
          SECTION 9 — PORTAL CTA  (full-viewport wormhole)
      ───────────────────────────────────────────────────────────────── */}
      <section style={{ position: "relative", height: "100svh", overflow: "hidden", background: "#05030a" }}>
        <div style={{ position: "absolute", inset: 0 }}>
          <PortalTunnel color="#b892ff" />
        </div>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 24px" }}>
          <div id="cta-pre" data-reveal style={{ ...reveal("cta-pre"), color: "rgba(184,146,255,0.45)", fontSize: 9.5, letterSpacing: "0.52em", marginBottom: 22 }}>
            BEGIN
          </div>
          <div id="cta-word" data-reveal style={{ ...reveal("cta-word", 0.1), color: "#f0ecff", fontSize: "clamp(52px, 14vw, 148px)", fontWeight: 100, fontFamily: "Georgia, serif", letterSpacing: "0.14em", lineHeight: 1, textShadow: "0 0 100px rgba(184,146,255,0.22)", marginBottom: 22 }}>
            ENTER
          </div>
          <div id="cta-sub2" data-reveal style={{ ...reveal("cta-sub2", 0.18), color: "rgba(200,196,235,0.38)", fontSize: "clamp(10px, 1.6vw, 13px)", letterSpacing: "0.44em", marginBottom: 48 }}>
            THE COSMOS AWAITS
          </div>
          <div id="cta-btn" data-reveal style={{ ...reveal("cta-btn", 0.26) }}>
            <button onClick={scrollToTop}
              style={{ background: "linear-gradient(135deg,rgba(184,146,255,0.18),rgba(255,136,170,0.1))", border: "1px solid rgba(184,146,255,0.35)", color: "#f0ecff", borderRadius: 999, padding: "17px 48px", fontSize: 11, letterSpacing: "0.34em", cursor: "pointer", fontFamily: "'Helvetica Neue',Arial,sans-serif", boxShadow: "0 0 40px rgba(184,146,255,0.15)", transition: "all 0.4s ease" }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = "0 0 70px rgba(184,146,255,0.36)"; el.style.borderColor = "rgba(184,146,255,0.58)"; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = "0 0 40px rgba(184,146,255,0.15)"; el.style.borderColor = "rgba(184,146,255,0.35)"; }}>
              BEGIN YOUR JOURNEY &nbsp; ✦
            </button>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────
          FOOTER
      ───────────────────────────────────────────────────────────────── */}
      <footer style={{ background: "#050308", borderTop: L, padding: "48px 32px", textAlign: "center" }}>
        <div style={{ color: "#eceaff", fontSize: 12, letterSpacing: "0.62em", marginBottom: 8 }}>A E T H E R</div>
        <div style={{ color: "rgba(200,196,235,0.22)", fontSize: 9, letterSpacing: "0.32em", marginBottom: 26 }}>A LIVING COSMOS</div>
        <div style={{ color: "rgba(200,196,235,0.16)", fontSize: 10.5, letterSpacing: "0.1em" }}>
          © {new Date().getFullYear()} AETHER · A whisper to the void
        </div>
      </footer>

      {/* ─────────────────────────────────────────────────────────────────
          FLOATING RETURN
      ───────────────────────────────────────────────────────────────── */}
      <button onClick={scrollToTop} style={{
        position: "fixed", bottom: 24, right: 24, zIndex: 800,
        background: "rgba(10,6,22,0.88)", backdropFilter: "blur(18px)",
        border: "1px solid rgba(184,146,255,0.26)", color: "#b892ff",
        borderRadius: 999, padding: "10px 18px", fontSize: 9.5, letterSpacing: "0.28em",
        cursor: "pointer", fontFamily: "'Helvetica Neue',Arial,sans-serif",
        boxShadow: "0 0 16px rgba(184,146,255,0.1)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
        opacity: scrolled ? 1 : 0,
        transform: scrolled ? "none" : "translateY(12px)",
        pointerEvents: scrolled ? "auto" : "none",
      }}>
        ↑ &nbsp;COSMOS
      </button>
    </>
  );
}
