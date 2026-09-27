"use client";

import { useEffect, useRef } from "react";

// The shared whisper page is the only part of Aether a stranger sees first,
// and it showed no galaxy at all — a quote on a gradient, for a product whose
// entire premise is that a thought becomes one. This draws the galaxy that
// belongs to the whisper.
//
// Deliberately a small 2D canvas rather than the real engine: the share page
// should open instantly on a phone from a messaging app, and pulling in
// Three.js, 40,000 particles and the audio graph to decorate a page with one
// sentence on it would be the wrong trade. This is a few thousand points and
// no dependencies.

// The thirty-seven forms collapse into five silhouettes. A share card cannot
// honestly reproduce every form, but it can be the right *kind* of object —
// and the form's real name is printed beside it either way.
type Shape = "spiral" | "ring" | "cloud" | "filament" | "sphere";

const SHAPE_BY_FORM: Record<string, Shape> = {
  spiral: "spiral", barred: "spiral", lenticular: "spiral", starburst: "spiral",
  jellyfish: "spiral", accretion: "spiral", protostar: "spiral", phyllotaxis: "spiral",
  vortex: "spiral", lorenz: "spiral", cartwheel: "ring", ring: "ring",
  einstein: "ring", polar_ring: "ring", shell: "ring", mobius: "ring",
  trefoil: "ring", wormhole: "ring", nebula: "cloud", emission: "cloud",
  plasma: "cloud", supernova: "cloud", quasar: "cloud", magnetar: "cloud",
  pulsar: "cloud", aurora: "cloud", cymatics: "cloud", irregular: "cloud",
  merger: "cloud", filament: "filament", tidal: "filament", dendrite: "filament",
  elliptical: "sphere", sphere: "sphere", globular: "sphere", void: "sphere",
  relic: "sphere", crystal: "sphere",
};

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type P = { r: number; a: number; y: number; s: number; tw: number; c: string };

export default function ShareGalaxy({
  palette,
  form,
  seed = 1,
}: {
  palette: string[];
  form: string;
  seed?: number;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const shape: Shape = SHAPE_BY_FORM[form] ?? "spiral";
    const cols = [palette[2] ?? "#b892ff", palette[1] ?? "#4c1d95", "#ffffff"];
    const rnd = mulberry(seed * 2654435761);

    // Fewer points on a phone: this is decoration on a text page, and a
    // share link is opened on a phone far more often than on a laptop.
    const small = window.innerWidth < 640;
    const N = small ? 1100 : 2600;
    const pts: P[] = [];
    for (let i = 0; i < N; i++) {
      const t = i / N;
      let r: number, a: number, y: number;
      if (shape === "spiral") {
        const arm = i % 2;
        const turn = Math.pow(t, 0.62) * Math.PI * 2.5;
        a = turn + arm * Math.PI + (rnd() - 0.5) * 0.5;
        r = Math.pow(t, 0.62) * 0.94 + (rnd() - 0.5) * 0.07;
        y = (rnd() - 0.5) * 0.1 * (1 - t * 0.6);
      } else if (shape === "ring") {
        a = rnd() * Math.PI * 2;
        r = 0.62 + (rnd() - 0.5) * 0.2;
        y = (rnd() - 0.5) * 0.12;
      } else if (shape === "cloud") {
        a = rnd() * Math.PI * 2;
        r = Math.pow(rnd(), 0.5) * 0.95;
        y = (rnd() - 0.5) * 0.55 * (1 - r * 0.5);
      } else if (shape === "filament") {
        a = rnd() * Math.PI * 2;
        r = Math.pow(rnd(), 1.8) * 1.0;
        y = (rnd() - 0.5) * 0.14 + Math.sin(r * 5.0) * 0.16;
      } else {
        a = rnd() * Math.PI * 2;
        r = Math.pow(rnd(), 0.42) * 0.8;
        y = (rnd() - 0.5) * 0.72 * (1 - r * 0.35);
      }
      pts.push({
        r, a, y,
        s: 0.5 + rnd() * 1.5,
        tw: rnd() * Math.PI * 2,
        // Mostly the accent, a little of the mid tone, rarely white — the
        // same restraint the app's own stars use.
        c: cols[rnd() < 0.72 ? 0 : rnd() < 0.85 ? 1 : 2],
      });
    }

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    let raf = 0;
    let w = 0, h = 0, dpr = 1;

    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = Math.max(1, Math.round(w * dpr));
      cv.height = Math.max(1, Math.round(h * dpr));
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = (ms: number) => {
      const t = ms / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2;
      const R = Math.min(w, h) * 0.56;

      // Core bloom, so the centre reads as a source rather than a gap.
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.75);
      g.addColorStop(0, `${cols[0]}77`);
      g.addColorStop(0.35, `${cols[1]}33`);
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // Additive, like the real thing: overlapping particles build light
      // instead of painting over each other.
      ctx.globalCompositeOperation = "lighter";
      const spin = reduce ? 0.6 : t * 0.045;
      // Tilted, not face-on. A disc seen flat reads as a circle, not a body.
      const tilt = 0.42;
      for (const p of pts) {
        const a = p.a + spin * (1.25 - p.r * 0.5);
        const x = cx + Math.cos(a) * p.r * R;
        const yy = cy + Math.sin(a) * p.r * R * tilt + p.y * R * 0.62;
        const tw = reduce ? 1 : 0.72 + 0.28 * Math.sin(t * 1.5 + p.tw * 6.283);
        ctx.globalAlpha = (0.34 + 0.56 * (1 - p.r)) * tw;
        ctx.fillStyle = p.c;
        ctx.beginPath();
        ctx.arc(x, yy, p.s, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      if (!reduce) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [palette, form, seed]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{
        position: "absolute", inset: 0, width: "100%", height: "100%",
        display: "block", pointerEvents: "none",
      }}
    />
  );
}
