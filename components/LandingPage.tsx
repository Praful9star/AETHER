"use client";

import dynamic from "next/dynamic";
import { useRef, useEffect, useState } from "react";

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

/* Five concentric orbital ellipses with glowing dots */
function OrbitRings() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    let raf = 0, t = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => { el.width = el.clientWidth * dpr; el.height = el.clientHeight * dpr; };
    resize();
    window.addEventListener("resize", resize, { passive: true });
    const ctx = el.getContext("2d")!;

    const RINGS = [
      { rf: 0.09, sp: 1.4,  tilt: 0.38,  col: "#b892ff", n: 2 },
      { rf: 0.17, sp: 0.80, tilt: -0.62, col: "#ff88aa", n: 3 },
      { rf: 0.26, sp: 0.50, tilt: 0.95,  col: "#44ddff", n: 4 },
      { rf: 0.36, sp: 0.33, tilt: -0.28, col: "#ffcc44", n: 5 },
      { rf: 0.44, sp: 0.20, tilt: 0.65,  col: "#88ffcc", n: 7 },
    ];

    const draw = () => {
      const W = el.width, H = el.height;
      ctx.clearRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2;

      for (const ring of RINGS) {
        const rx = Math.min(W, H) * ring.rf;
        const ry = rx * Math.abs(Math.cos(ring.tilt));
        ctx.strokeStyle = ring.col; ctx.lineWidth = 0.7; ctx.globalAlpha = 0.13;
        ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, ring.tilt, 0, Math.PI * 2); ctx.stroke();

        for (let d = 0; d < ring.n; d++) {
          const a = t * ring.sp + (d / ring.n) * Math.PI * 2;
          ctx.fillStyle = ring.col;
          ctx.globalAlpha = 0.9;
          ctx.shadowColor = ring.col; ctx.shadowBlur = 7;
          ctx.beginPath();
          ctx.arc(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.shadowBlur = 0;
      t += 0.011;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} style={{ width: "100%", height: "100%", display: "block" }} />;
}

/* Floating particle constellation with proximity line connections */
function ConstellationNet({ color = "#b892ff" }: { color?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => { el.width = el.clientWidth * dpr; el.height = el.clientHeight * dpr; };
    resize();
    window.addEventListener("resize", resize, { passive: true });
    const ctx = el.getContext("2d")!;

    type Pt = { x: number; y: number; vx: number; vy: number; r: number };
    const pts: Pt[] = Array.from({ length: 60 }, () => ({
      x: Math.random() * el.width, y: Math.random() * el.height,
      vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5,
      r: Math.random() * 1.4 + 0.6,
    }));

    const draw = () => {
      const W = el.width, H = el.height;
      ctx.clearRect(0, 0, W, H);
      const D = W * 0.14;

      for (const p of pts) { p.x = (p.x + p.vx + W) % W; p.y = (p.y + p.vy + H) % H; }

      ctx.strokeStyle = color;
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          const d = Math.hypot(dx, dy);
          if (d < D) {
            ctx.globalAlpha = 0.16 * (1 - d / D);
            ctx.lineWidth = 0.7;
            ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke();
          }
        }
      }
      ctx.fillStyle = color;
      for (const p of pts) {
        ctx.globalAlpha = 0.5;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [color]);
  return <canvas ref={ref} style={{ width: "100%", height: "100%", display: "block" }} />;
}

/* Morphing particle burst — particles radiate outward and reform */
function ParticleBurst({ color = "#ff88aa" }: { color?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    let raf = 0, t = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => { el.width = el.clientWidth * dpr; el.height = el.clientHeight * dpr; };
    resize();
    window.addEventListener("resize", resize, { passive: true });
    const ctx = el.getContext("2d")!;

    const N = 90;
    const base = Array.from({ length: N }, (_, i) => {
      const a = (i / N) * Math.PI * 2 + Math.random() * 0.3;
      const r = 0.28 + Math.random() * 0.14;
      return { a, r, phase: Math.random() * Math.PI * 2, speed: 0.3 + Math.random() * 0.6 };
    });

    const draw = () => {
      const W = el.width, H = el.height;
      ctx.clearRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2;
      const S = Math.min(W, H);

      for (const p of base) {
        const breathe = 1 + Math.sin(t * p.speed + p.phase) * 0.18;
        const r = p.r * S * breathe;
        const x = cx + Math.cos(p.a + t * 0.08) * r;
        const y = cy + Math.sin(p.a + t * 0.08) * r * 0.75;
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.4 + Math.sin(t * p.speed + p.phase) * 0.2;
        ctx.shadowColor = color; ctx.shadowBlur = 5;
        ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.shadowBlur = 0;

      // Center pulse
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * 0.1);
      g.addColorStop(0, color + "44"); g.addColorStop(1, "transparent");
      ctx.globalAlpha = 0.6 + Math.sin(t * 1.4) * 0.3;
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, S * 0.1, 0, Math.PI * 2); ctx.fill();

      t += 0.012;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [color]);
  return <canvas ref={ref} style={{ width: "100%", height: "100%", display: "block" }} />;
}

/* Stars slowly connecting into constellation lines */
function ConstellateCanvas({ color = "#44ddff" }: { color?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    let raf = 0, t = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => { el.width = el.clientWidth * dpr; el.height = el.clientHeight * dpr; };
    resize();
    window.addEventListener("resize", resize, { passive: true });
    const ctx = el.getContext("2d")!;

    const STARS = Array.from({ length: 26 }, () => ({
      x: 0.1 + Math.random() * 0.8, y: 0.1 + Math.random() * 0.8,
      r: 1 + Math.random() * 2.5,
      phase: Math.random() * Math.PI * 2,
    }));

    const EDGES = STARS.flatMap((s, i) =>
      STARS.slice(i + 1).map((s2, j) => ({
        i, j: i + j + 1,
        dist: Math.hypot(s.x - s2.x, s.y - s2.y),
      }))
    ).filter(e => e.dist < 0.32).slice(0, 28);

    const draw = () => {
      const W = el.width, H = el.height;
      ctx.clearRect(0, 0, W, H);

      // Lines fade in over time
      const lineProgress = Math.min(1, (Math.sin(t * 0.3) + 1) / 2);
      ctx.strokeStyle = color; ctx.lineWidth = 0.8;
      for (const e of EDGES) {
        const s1 = STARS[e.i], s2 = STARS[e.j];
        ctx.globalAlpha = lineProgress * 0.22;
        ctx.beginPath();
        ctx.moveTo(s1.x * W, s1.y * H);
        ctx.lineTo(s2.x * W, s2.y * H);
        ctx.stroke();
      }

      ctx.fillStyle = color;
      for (const s of STARS) {
        const pulse = 1 + Math.sin(t * 0.9 + s.phase) * 0.3;
        ctx.globalAlpha = 0.6 + Math.sin(t * 0.9 + s.phase) * 0.3;
        ctx.shadowColor = color; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r * pulse, 0, Math.PI * 2); ctx.fill();
      }
      ctx.shadowBlur = 0;
      t += 0.014;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [color]);
  return <canvas ref={ref} style={{ width: "100%", height: "100%", display: "block" }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
//  DATA
// ══════════════════════════════════════════════════════════════════════════════

const GALAXY_FORMS = [
  { label: "SPIRAL GALAXY",     color: "#b892ff", theme: "Wonder · Growth · Journey" },
  { label: "BARRED SPIRAL",     color: "#ff88aa", theme: "Structure · Discipline · Order" },
  { label: "ELLIPTICAL GALAXY", color: "#ffcc44", theme: "Age · Wisdom · Serenity" },
  { label: "RING GALAXY",       color: "#44ddff", theme: "Cycles · Completeness · Destiny" },
  { label: "GALAXY MERGER",     color: "#ff6644", theme: "Conflict · Union · Collision" },
  { label: "ACTIVE QUASAR",     color: "#ff4488", theme: "Intensity · Brilliance · Power" },
  { label: "SUPERNOVA REMNANT", color: "#ff8844", theme: "Transformation · Endings · Rebirth" },
  { label: "COSMIC FILAMENT",   color: "#88ffcc", theme: "Connection · Web of Life" },
  { label: "HOURGLASS NEBULA",  color: "#cc88ff", theme: "Duality · Time · Balance" },
  { label: "TIDAL STREAM",      color: "#44aaff", theme: "Longing · Drift · Distance" },
  { label: "IRREGULAR GALAXY",  color: "#ffaa44", theme: "Chaos · Creativity · Wildness" },
  { label: "LENTICULAR GALAXY", color: "#aaccff", theme: "Memory · The Past · Faded Clarity" },
  { label: "GLOBULAR CLUSTER",  color: "#eeddff", theme: "Unity · Perfection · The Whole" },
  { label: "EMISSION NEBULA",   color: "#ff44aa", theme: "Birth · Potential · The Unformed" },
  { label: "COSMIC VORTEX",     color: "#8844ff", theme: "Obsession · Spiral of Thought" },
];

const PLANS = [
  {
    tier: "EXPLORER",
    price: "Free",
    cycle: "forever",
    color: "#b892ff",
    items: ["5 cosmic whispers / day", "10 saved stars", "6 galaxy forms", "Ambient audio", "1080p capture"],
    cta: "Begin Free",
  },
  {
    tier: "COSMIC",
    price: "$9",
    cycle: "per month",
    color: "#ff88aa",
    featured: true,
    items: ["Unlimited whispers", "120 saved stars", "All 15 galaxy forms", "Full spatial audio", "4K capture", "Priority AI", "Custom palettes"],
    cta: "Go Cosmic →",
  },
  {
    tier: "ETERNAL",
    price: "$29",
    cycle: "one time",
    color: "#44ddff",
    items: ["Everything in Cosmic", "Lifetime access", "Early access to new forms", "Named star in constellation"],
    cta: "Own the Cosmos",
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
            {([ ["EXPLORE", "feat-h2"], ["FORMS", "forms-h2"], ["SOUND", "freq-h2"], ["PRICING", "price-h2"] ] as const).map(([lbl, id]) => (
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
              {["40,000 PARTICLES", "15 GALAXY FORMS", "SPATIAL AUDIO ENGINE", "AI-POWERED COSMOS", "3D REAL-TIME MORPH", "CONSTELLATION MEMORY", "LIVE SOUNDSCAPES", "WHISPER TO THE VOID"].map(item => (
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
          SECTION 3 — STATS  (oversized editorial numbers)
      ───────────────────────────────────────────────────────────────── */}
      <section style={{ background: "#07030f", borderBottom: L, padding: isMobile ? "70px 28px" : "90px 64px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 0 }}>
            {([
              { n: "40K",  label: "PARTICLES PER COSMOS", sub: "Rendered in real time at 60fps", color: "#b892ff", id: "stat-0" },
              { n: "15",   label: "LIVING GALAXY FORMS",  sub: "Each with unique geometry and sound", color: "#ff88aa", id: "stat-1" },
              { n: "∞",    label: "UNIQUE UNIVERSES",      sub: "No two thoughts produce the same sky", color: "#44ddff", id: "stat-2" },
            ] as const).map(({ n, label, sub, color, id }, i) => (
              <div key={id} id={id} data-reveal style={{
                ...reveal(id, i * 0.14),
                padding: isMobile ? "40px 0" : "52px 56px",
                borderRight: !isMobile && i < 2 ? L : "none",
                borderBottom: isMobile && i < 2 ? L : "none",
                textAlign: "center",
              }}>
                <div style={{
                  fontSize: "clamp(64px, 9.5vw, 112px)", fontWeight: 100,
                  color, fontFamily: "Georgia, serif", lineHeight: 1,
                  textShadow: `0 0 70px ${color}38`,
                  marginBottom: 14, letterSpacing: "-0.02em",
                }}>
                  {n}
                </div>
                <div style={{ color: "rgba(200,196,235,0.44)", fontSize: 9.5, letterSpacing: "0.38em", marginBottom: 8 }}>{label}</div>
                <div style={{ color: "rgba(200,196,235,0.28)", fontSize: 12, fontFamily: "Georgia, serif", fontStyle: "italic", lineHeight: 1.65 }}>{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────
          SECTION 4 — FEATURE STRIPS  (alternating canvas ↔ text)
      ───────────────────────────────────────────────────────────────── */}
      <section style={{ background: "#050308", borderBottom: L }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", paddingTop: "90px" }}>
          <div id="feat-eye" data-reveal style={{ ...reveal("feat-eye"), color: "rgba(184,146,255,0.44)", fontSize: 9.5, letterSpacing: "0.52em", paddingLeft: isMobile ? 28 : 64, marginBottom: 12 }}>CAPABILITIES</div>
          <h2 id="feat-h2" data-reveal style={{ ...reveal("feat-h2", 0.1), color: "#f0ecff", fontSize: "clamp(28px, 4.5vw, 54px)", fontWeight: 200, fontFamily: "Georgia, serif", letterSpacing: "0.04em", paddingLeft: isMobile ? 28 : 64, marginBottom: 72 }}>
            What Aether can do
          </h2>
        </div>

        {([
          {
            n: "01", title: "AI Cosmic Whispers", color: "#b892ff",
            body: "Type any thought — joy, grief, wonder, or confusion. The AI reads your emotional signature and sculpts a galaxy from it. Every word becomes geometry.",
            Canvas: () => <ConstellationNet color="#b892ff" />,
          },
          {
            n: "02", title: "15 Living Galaxy Forms", color: "#ff88aa",
            body: "Forty thousand particles reshape in real time between fifteen distinct cosmic structures — each carrying its own geometry, color palette, and meaning.",
            Canvas: () => <OrbitRings />,
          },
          {
            n: "03", title: "Spatial Soundscapes", color: "#44ddff",
            body: "Each galaxy form triggers a unique sonic environment the moment it appears. Bell harmonics for ring galaxies. Sub-bass rumble for ellipticals. Noise chaos for vortices.",
            Canvas: () => <AudioWaves />,
          },
          {
            n: "04", title: "Your Constellation", color: "#ffcc44",
            body: "Every thought becomes a permanent star plotted in 3D space. Tap any star to revisit that exact moment — that color, that form, that whisper. Your private universe grows.",
            Canvas: () => <ConstellationNet color="#ffcc44" />,
          },
        ] as const).map((f, i) => (
          <div key={f.n} id={`strip-${i}`} data-reveal style={{
            ...reveal(`strip-${i}`, 0.08),
            display: "flex",
            flexDirection: isMobile ? "column" : (i % 2 === 0 ? "row" : "row-reverse"),
            borderTop: L,
          }}>
            {/* Canvas panel */}
            <div style={{ width: isMobile ? "100%" : "44%", height: isMobile ? 260 : 380, position: "relative", overflow: "hidden", flexShrink: 0,
              borderRight: !isMobile && i % 2 === 0 ? L : "none",
              borderLeft: !isMobile && i % 2 === 1 ? L : "none",
            }}>
              <f.Canvas />
            </div>
            {/* Text panel */}
            <div style={{ flex: 1, padding: isMobile ? "44px 28px" : "64px 72px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ color: f.color, fontSize: 9, letterSpacing: "0.46em", marginBottom: 16, opacity: 0.6 }}>{f.n}</div>
              <h3 style={{ color: "#f0ecff", fontSize: "clamp(20px, 2.6vw, 34px)", fontWeight: 200, fontFamily: "Georgia, serif", letterSpacing: "0.04em", marginBottom: 18, lineHeight: 1.3 }}>{f.title}</h3>
              <p style={{ color: "rgba(200,196,235,0.5)", fontSize: 14.5, lineHeight: 1.86, fontFamily: "Georgia, serif", fontStyle: "italic", maxWidth: 460, margin: 0 }}>{f.body}</p>
            </div>
          </div>
        ))}
      </section>

      {/* ─────────────────────────────────────────────────────────────────
          SECTION 5 — FORMS MARQUEE  (two rows, opposite directions)
      ───────────────────────────────────────────────────────────────── */}
      <section style={{ background: "#07030f", borderBottom: L, padding: "70px 0", overflow: "hidden" }}>
        <div id="forms-eye" data-reveal style={{ ...reveal("forms-eye"), color: "rgba(184,146,255,0.44)", fontSize: 9.5, letterSpacing: "0.52em", textAlign: "center", marginBottom: 36 }}>
          GALAXY FORMS
        </div>
        <h2 id="forms-h2" data-reveal style={{ ...reveal("forms-h2", 0.08), color: "#f0ecff", fontSize: "clamp(24px, 4vw, 48px)", fontWeight: 200, fontFamily: "Georgia, serif", letterSpacing: "0.04em", textAlign: "center", marginBottom: 52 }}>
          15 Living Galaxy Forms
        </h2>

        {/* Row 1 — left */}
        <div style={{ overflow: "hidden", marginBottom: 14 }}>
          <div style={{ display: "inline-flex", animation: "aether-ticker-l 55s linear infinite", whiteSpace: "nowrap" }}>
            {[0, 1, 2].map(k => (
              <span key={k} style={{ display: "inline-flex" }}>
                {GALAXY_FORMS.map(f => (
                  <span key={f.label + k} style={{ display: "inline-flex", alignItems: "center", gap: 10, marginRight: 44 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 999, background: f.color, boxShadow: `0 0 8px ${f.color}`, display: "inline-block", flexShrink: 0 }} />
                    <span style={{ color: "#d8d4f2", fontSize: 12, letterSpacing: "0.22em", fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>{f.label}</span>
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>

        {/* Row 2 — right (opposite direction, themes) */}
        <div style={{ overflow: "hidden" }}>
          <div style={{ display: "inline-flex", animation: "aether-ticker-r 62s linear infinite", whiteSpace: "nowrap" }}>
            {[0, 1, 2].map(k => (
              <span key={k} style={{ display: "inline-flex" }}>
                {[...GALAXY_FORMS].reverse().map(f => (
                  <span key={f.label + k} style={{ display: "inline-flex", alignItems: "center", gap: 10, marginRight: 44 }}>
                    <span style={{ color: f.color, fontSize: 10, letterSpacing: "0.1em", fontFamily: "Georgia, serif", fontStyle: "italic", opacity: 0.55 }}>{f.theme}</span>
                    <span style={{ width: 4, height: 4, borderRadius: 999, background: f.color, opacity: 0.4, display: "inline-block", flexShrink: 0 }} />
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────
          SECTION 6 — HOW IT WORKS  (three panels, Roman numerals)
      ───────────────────────────────────────────────────────────────── */}
      <section style={{ background: "#050308", borderBottom: L, padding: isMobile ? "80px 28px" : "0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", borderTop: L }}>
            {([
              {
                n: "I", title: "Whisper", color: "#b892ff", id: "step-0",
                body: "Type anything — a fear, a dream, a single half-formed word. Aether does not need complete sentences. It reads between them.",
                Canvas: () => <ConstellationNet color="#b892ff" />,
              },
              {
                n: "II", title: "Transform", color: "#ff88aa", id: "step-1",
                body: "The AI matches your thought to its cosmic form. Forty thousand particles rearrange into the universe that most resembles you, right now.",
                Canvas: () => <ParticleBurst color="#ff88aa" />,
              },
              {
                n: "III", title: "Remember", color: "#44ddff", id: "step-2",
                body: "Your thought becomes a star — plotted and archived in three-dimensional space. Return to any moment in your cosmos, forever.",
                Canvas: () => <ConstellateCanvas color="#44ddff" />,
              },
            ] as const).map((s, i) => (
              <div key={s.n} id={s.id} data-reveal style={{
                ...reveal(s.id, i * 0.16),
                borderRight: !isMobile && i < 2 ? L : "none",
                borderBottom: isMobile && i < 2 ? L : "none",
              }}>
                {/* Mini canvas */}
                <div style={{ height: 220, position: "relative", overflow: "hidden", borderBottom: L }}>
                  <s.Canvas />
                </div>
                {/* Text */}
                <div style={{ padding: "44px 40px 52px" }}>
                  <div style={{ color: s.color, fontSize: "clamp(36px, 5vw, 56px)", fontWeight: 100, fontFamily: "Georgia, serif", lineHeight: 1, marginBottom: 20, opacity: 0.3, letterSpacing: "-0.02em" }}>
                    {s.n}
                  </div>
                  <h3 style={{ color: "#f0ecff", fontSize: "clamp(18px, 2.2vw, 24px)", fontWeight: 200, fontFamily: "Georgia, serif", letterSpacing: "0.06em", marginBottom: 14 }}>{s.title}</h3>
                  <p style={{ color: "rgba(200,196,235,0.46)", fontSize: 13.5, lineHeight: 1.86, fontFamily: "Georgia, serif", fontStyle: "italic", margin: 0 }}>{s.body}</p>
                </div>
              </div>
            ))}
          </div>
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
      <section style={{ background: "#050308", borderBottom: L, padding: isMobile ? "80px 28px" : "110px 64px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.35, pointerEvents: "none" }}>
          <OrbitRings />
        </div>
        <div style={{ position: "relative", maxWidth: 1200, margin: "0 auto" }}>
          <div id="price-eye" data-reveal style={{ ...reveal("price-eye"), color: "rgba(184,146,255,0.44)", fontSize: 9.5, letterSpacing: "0.52em", marginBottom: 14 }}>PRICING</div>
          <h2 id="price-h2" data-reveal style={{ ...reveal("price-h2", 0.08), color: "#f0ecff", fontSize: "clamp(26px, 4.2vw, 50px)", fontWeight: 200, fontFamily: "Georgia, serif", letterSpacing: "0.04em", marginBottom: 14 }}>
            Choose your cosmos
          </h2>
          <p id="price-sub" data-reveal style={{ ...reveal("price-sub", 0.14), color: "rgba(200,196,235,0.42)", fontSize: "clamp(13px, 1.5vw, 15px)", fontFamily: "Georgia, serif", fontStyle: "italic", marginBottom: 16 }}>
            Aether is free to explore. For the deeper journey, unlock the full spectrum.
          </p>
          <div id="price-notice" data-reveal style={{ ...reveal("price-notice", 0.2), display: "inline-block", border: "1px solid rgba(184,146,255,0.2)", borderRadius: 8, padding: "10px 20px", marginBottom: 52, color: "rgba(200,196,235,0.48)", fontSize: 12, fontFamily: "Georgia, serif", fontStyle: "italic" }}>
            ✦ &nbsp;Premium tiers launching soon — join the waitlist below
          </div>

          <div id="price-grid" data-reveal style={{ ...reveal("price-grid", 0.26), display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 20, marginBottom: 64 }}>
            {PLANS.map(p => (
              <div key={p.tier} style={{
                background: p.featured ? `linear-gradient(160deg, rgba(255,136,170,0.08), rgba(184,146,255,0.06))` : "rgba(10,6,20,0.7)",
                backdropFilter: "blur(18px)",
                border: `1px solid ${p.color}${p.featured ? "44" : "20"}`,
                borderRadius: 20,
                padding: "38px 28px",
                position: "relative",
              }}>
                {p.featured && (
                  <div style={{ position: "absolute", top: -1, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(90deg,#ff88aa,#b892ff)", color: "#fff", fontSize: 8.5, letterSpacing: "0.3em", padding: "5px 18px", borderRadius: "0 0 9px 9px", whiteSpace: "nowrap", fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
                    MOST CHOSEN
                  </div>
                )}
                <div style={{ color: p.color, fontSize: 9, letterSpacing: "0.44em", marginBottom: 12 }}>{p.tier}</div>
                <div style={{ color: "#f0ecff", fontSize: 40, fontWeight: 200, lineHeight: 1, marginBottom: 4, fontFamily: "Georgia, serif" }}>{p.price}</div>
                <div style={{ color: "rgba(200,196,235,0.38)", fontSize: 11.5, letterSpacing: "0.1em", marginBottom: 28 }}>{p.cycle}</div>
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {p.items.map(item => (
                    <li key={item} style={{ display: "flex", gap: 10, alignItems: "flex-start", color: "rgba(200,196,235,0.62)", fontSize: 13, fontFamily: "Georgia, serif", lineHeight: 1.55 }}>
                      <span style={{ color: p.color, flexShrink: 0, marginTop: 1 }}>✦</span>{item}
                    </li>
                  ))}
                </ul>
                <button
                  style={{ width: "100%", background: p.featured ? `linear-gradient(135deg,${p.color}44,${p.color}22)` : "rgba(8,5,18,0.6)", border: `1px solid ${p.color}44`, color: p.featured ? "#fff" : "rgba(220,216,255,0.6)", borderRadius: 999, padding: "14px 0", fontSize: 11, letterSpacing: "0.22em", cursor: "pointer", fontFamily: "'Helvetica Neue', Arial, sans-serif", transition: "all 0.35s ease", boxShadow: p.featured ? `0 0 24px ${p.color}28` : "none" }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = `0 0 32px ${p.color}44`; el.style.borderColor = p.color + "66"; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = p.featured ? `0 0 24px ${p.color}28` : "none"; el.style.borderColor = p.color + "44"; }}>
                  {p.cta}
                </button>
              </div>
            ))}
          </div>

          {/* Waitlist */}
          <div id="waitlist" data-reveal style={{ ...reveal("waitlist", 0.32), maxWidth: 460, margin: "0 auto", textAlign: "center" }}>
            <div style={{ color: "rgba(200,196,235,0.48)", fontSize: 13, fontFamily: "Georgia, serif", fontStyle: "italic", marginBottom: 18 }}>
              Get early access when premium launches
            </div>
            {joined ? (
              <div style={{ color: "#b892ff", fontSize: 14, fontFamily: "Georgia, serif", fontStyle: "italic", textShadow: "0 0 20px #b892ff55", lineHeight: 1.7 }}>
                ✦ &nbsp;You are now among the stars. We will find you.
              </div>
            ) : (
              <form onSubmit={e => { e.preventDefault(); if (email.trim()) setJoined(true); }} style={{ display: "flex", gap: 10 }}>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@cosmos.com" required
                  style={{ flex: 1, background: "rgba(12,7,24,.7)", backdropFilter: "blur(14px)", border: "1px solid rgba(150,130,230,.22)", borderRadius: 999, color: "#eee9ff", fontSize: 13.5, padding: "13px 20px", outline: "none", fontFamily: "Georgia, serif", minWidth: 0 }} />
                <button type="submit" style={{ background: "linear-gradient(135deg,rgba(184,146,255,.25),rgba(184,146,255,.12))", border: "1px solid rgba(184,146,255,.5)", color: "#ece8ff", borderRadius: 999, padding: "13px 24px", fontSize: 11, letterSpacing: "0.2em", cursor: "pointer", whiteSpace: "nowrap", fontFamily: "'Helvetica Neue',Arial,sans-serif", flexShrink: 0 }}>
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
