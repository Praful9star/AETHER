"use client";

import dynamic from "next/dynamic";
import { useRef, useEffect, useState } from "react";

const AetherCanvas = dynamic(() => import("./AetherCanvas"), { ssr: false });

// ─── Data ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: "✦",
    title: "AI Cosmic Whispers",
    body: "Type any thought — joy, grief, wonder, or confusion. Our AI reads your emotional frequency and sculpts a galaxy that mirrors you.",
  },
  {
    icon: "◈",
    title: "15 Living Galaxy Forms",
    body: "Spiral arms, quasar jets, supernova remnants, tidal streams — 40,000 particles morph in real time between fifteen cosmic structures.",
  },
  {
    icon: "⟡",
    title: "Spatial Soundscapes",
    body: "Each form generates a unique sonic universe. Bell harmonics for ring galaxies, sub-bass for ellipticals, pure chaos for vortices.",
  },
  {
    icon: "✧",
    title: "Your Constellation",
    body: "Every thought becomes a permanent star plotted in 3D space. Tap any star to travel back to that moment, that color, that whisper.",
  },
];

const FORM_CARDS = [
  { label: "SPIRAL GALAXY",     color: "#b892ff", theme: "Wonder · Growth · Journey" },
  { label: "BARRED SPIRAL",     color: "#ff88aa", theme: "Structure · Discipline · Order" },
  { label: "ELLIPTICAL GALAXY", color: "#ffcc44", theme: "Age · Wisdom · Serenity" },
  { label: "RING GALAXY",       color: "#44ddff", theme: "Cycles · Completeness · Destiny" },
  { label: "GALAXY MERGER",     color: "#ff6644", theme: "Conflict · Union · Collision" },
  { label: "ACTIVE QUASAR",     color: "#ff4488", theme: "Intensity · Brilliance · Raw Power" },
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
    items: [
      "5 cosmic whispers per day",
      "10 saved stars",
      "6 galaxy forms",
      "Ambient audio",
      "1080p cosmic capture",
    ],
    cta: "Begin Free",
    featured: false,
  },
  {
    tier: "COSMIC",
    price: "$9",
    cycle: "/ month",
    color: "#ff88aa",
    items: [
      "Unlimited whispers",
      "120 saved stars",
      "All 15 galaxy forms",
      "Full spatial audio suite",
      "4K cosmic capture",
      "Priority AI responses",
      "Custom color palettes",
    ],
    cta: "Go Cosmic →",
    featured: true,
  },
  {
    tier: "ETERNAL",
    price: "$29",
    cycle: "one time",
    color: "#44ddff",
    items: [
      "Everything in Cosmic",
      "Lifetime access",
      "Early access to new forms",
      "Named star in constellation",
    ],
    cta: "Own the Cosmos",
    featured: false,
  },
];

const STEPS = [
  {
    n: "01",
    title: "Whisper a thought",
    body: "Type anything — a fear, a dream, a single word. The cosmos does not judge what it receives.",
  },
  {
    n: "02",
    title: "Watch it transform",
    body: "The AI reads your energy and reshapes 40,000 stars into a galaxy that mirrors the shape of your mind.",
  },
  {
    n: "03",
    title: "Save your universe",
    body: "Your thought becomes a permanent star in your personal constellation, orbiting in three dimensions forever.",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const heroRef      = useRef<HTMLDivElement>(null);
  const featuresRef  = useRef<HTMLDivElement>(null);
  const [scrolled,  setScrolled]  = useState(false);
  const [email,     setEmail]     = useState("");
  const [joined,    setJoined]    = useState(false);
  const [visible,   setVisible]   = useState<Set<string>>(new Set());

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.7);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting)
            setVisible(v => { const n = new Set(v); n.add(e.target.id); return n; });
        });
      },
      { threshold: 0.12 },
    );
    document.querySelectorAll("[data-reveal]").forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const scrollToTop = () => heroRef.current?.scrollIntoView({ behavior: "smooth" });

  const joinWaitlist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setJoined(true);
    // TODO: POST to /api/waitlist when backend is ready
  };

  const reveal = (id: string): React.CSSProperties => ({
    opacity:   visible.has(id) ? 1 : 0,
    transform: visible.has(id) ? "translateY(0)" : "translateY(32px)",
    transition: "opacity 0.9s ease, transform 0.9s ease",
  });

  // ── Shared style tokens
  const divider = "1px solid rgba(150, 130, 230, 0.14)";
  const cardBg  = "rgba(12, 7, 24, 0.75)";
  const cardBlur = "blur(18px)";

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────────
          SECTION 1 — HERO (full-screen galaxy experience)
      ───────────────────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        style={{ position: "relative", height: "100svh", overflow: "hidden" }}
      >
        <AetherCanvas />
      </section>

      {/* ─────────────────────────────────────────────────────────────────
          SECTION 2 — WHAT IS AETHER (features)
      ───────────────────────────────────────────────────────────────── */}
      <section
        ref={featuresRef}
        style={{
          background: "#060310",
          borderTop: divider,
          padding: "110px 24px",
        }}
      >
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <div
            id="feat-label"
            data-reveal
            style={{ ...reveal("feat-label"), color: "rgba(184,146,255,0.55)", fontSize: 10, letterSpacing: "0.52em", textAlign: "center", marginBottom: 14 }}
          >
            WHAT IS AETHER
          </div>
          <h2
            id="feat-h2"
            data-reveal
            style={{
              ...reveal("feat-h2"),
              color: "#f0ecff",
              fontSize: "clamp(26px, 4.5vw, 52px)",
              fontWeight: 200,
              letterSpacing: "0.06em",
              textAlign: "center",
              marginBottom: 14,
              fontFamily: "Georgia, 'Times New Roman', serif",
              transitionDelay: "0.1s",
            }}
          >
            A cosmos shaped by your thoughts
          </h2>
          <p
            id="feat-sub"
            data-reveal
            style={{
              ...reveal("feat-sub"),
              color: "rgba(200,196,235,0.48)",
              fontSize: "clamp(14px, 2vw, 17px)",
              textAlign: "center",
              maxWidth: 560,
              margin: "0 auto 70px",
              lineHeight: 1.78,
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontStyle: "italic",
              transitionDelay: "0.18s",
            }}
          >
            Not a screensaver. Not a game. Aether is a living universe that
            listens — and transforms itself around the words you dare to speak.
          </p>

          <div
            id="feat-grid"
            data-reveal
            style={{
              ...reveal("feat-grid"),
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
              gap: 22,
              transitionDelay: "0.26s",
            }}
          >
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                style={{
                  background: cardBg,
                  backdropFilter: cardBlur,
                  border: divider,
                  borderRadius: 20,
                  padding: "36px 28px",
                  transition: "border-color 0.35s, box-shadow 0.35s",
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = "rgba(184,146,255,0.32)";
                  el.style.boxShadow   = "0 0 32px rgba(184,146,255,0.1)";
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = "";
                  el.style.boxShadow   = "";
                }}
              >
                <div style={{ fontSize: 26, marginBottom: 18, color: "#b892ff", textShadow: "0 0 22px #b892ff88" }}>
                  {f.icon}
                </div>
                <h3 style={{
                  color: "#ece8ff",
                  fontSize: 13,
                  fontWeight: 400,
                  letterSpacing: "0.18em",
                  marginBottom: 14,
                  fontFamily: "'Helvetica Neue', Arial, sans-serif",
                }}>
                  {f.title}
                </h3>
                <p style={{
                  color: "rgba(200,196,235,0.52)",
                  fontSize: 13.5,
                  lineHeight: 1.76,
                  fontFamily: "Georgia, serif",
                  fontStyle: "italic",
                  margin: 0,
                }}>
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────
          SECTION 3 — HOW IT WORKS
      ───────────────────────────────────────────────────────────────── */}
      <section style={{ background: "#050308", borderTop: divider, padding: "110px 24px" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <div
            id="how-label"
            data-reveal
            style={{ ...reveal("how-label"), color: "rgba(184,146,255,0.55)", fontSize: 10, letterSpacing: "0.52em", textAlign: "center", marginBottom: 14 }}
          >
            HOW IT WORKS
          </div>
          <h2
            id="how-h2"
            data-reveal
            style={{
              ...reveal("how-h2"),
              color: "#f0ecff",
              fontSize: "clamp(26px, 4.5vw, 52px)",
              fontWeight: 200,
              letterSpacing: "0.06em",
              textAlign: "center",
              marginBottom: 70,
              fontFamily: "Georgia, 'Times New Roman', serif",
              transitionDelay: "0.1s",
            }}
          >
            Three steps to the cosmos
          </h2>
          <div
            id="how-grid"
            data-reveal
            style={{
              ...reveal("how-grid"),
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 40,
              transitionDelay: "0.2s",
            }}
          >
            {STEPS.map((s, i) => (
              <div key={s.n} style={{ textAlign: "center", padding: "0 12px" }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 999,
                  border: "1px solid rgba(184,146,255,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 22px",
                  color: "rgba(184,146,255,0.55)",
                  fontSize: 11,
                  letterSpacing: "0.24em",
                  fontFamily: "'Helvetica Neue', Arial, sans-serif",
                }}>
                  {s.n}
                </div>
                <h3 style={{
                  color: "#ece8ff",
                  fontSize: 17,
                  fontWeight: 300,
                  letterSpacing: "0.06em",
                  marginBottom: 14,
                  fontFamily: "Georgia, serif",
                }}>
                  {s.title}
                </h3>
                <p style={{
                  color: "rgba(200,196,235,0.48)",
                  fontSize: 14,
                  lineHeight: 1.82,
                  fontFamily: "Georgia, serif",
                  fontStyle: "italic",
                  margin: 0,
                }}>
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────
          SECTION 4 — 15 GALAXY FORMS
      ───────────────────────────────────────────────────────────────── */}
      <section style={{ background: "#060310", borderTop: divider, padding: "110px 24px" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <div
            id="forms-label"
            data-reveal
            style={{ ...reveal("forms-label"), color: "rgba(184,146,255,0.55)", fontSize: 10, letterSpacing: "0.52em", textAlign: "center", marginBottom: 14 }}
          >
            THE COSMOS
          </div>
          <h2
            id="forms-h2"
            data-reveal
            style={{
              ...reveal("forms-h2"),
              color: "#f0ecff",
              fontSize: "clamp(26px, 4.5vw, 52px)",
              fontWeight: 200,
              letterSpacing: "0.06em",
              textAlign: "center",
              marginBottom: 14,
              fontFamily: "Georgia, 'Times New Roman', serif",
              transitionDelay: "0.1s",
            }}
          >
            15 Living Galaxy Forms
          </h2>
          <p
            id="forms-sub"
            data-reveal
            style={{
              ...reveal("forms-sub"),
              color: "rgba(200,196,235,0.48)",
              fontSize: "clamp(14px, 2vw, 17px)",
              textAlign: "center",
              maxWidth: 520,
              margin: "0 auto 64px",
              lineHeight: 1.78,
              fontFamily: "Georgia, serif",
              fontStyle: "italic",
              transitionDelay: "0.18s",
            }}
          >
            Every thought maps to one of fifteen cosmic structures.
            No two whispers ever produce the same universe.
          </p>
          <div
            id="forms-grid"
            data-reveal
            style={{
              ...reveal("forms-grid"),
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
              gap: 13,
              transitionDelay: "0.26s",
            }}
          >
            {FORM_CARDS.map(c => (
              <div
                key={c.label}
                style={{
                  background: "rgba(10, 6, 20, 0.8)",
                  border: `1px solid ${c.color}1e`,
                  borderRadius: 14,
                  padding: "20px 18px",
                  transition: "border-color 0.35s, box-shadow 0.35s",
                  cursor: "default",
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = c.color + "55";
                  el.style.boxShadow   = `0 0 22px ${c.color}1a`;
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = c.color + "1e";
                  el.style.boxShadow   = "none";
                }}
              >
                <div style={{
                  width: 7, height: 7, borderRadius: 999,
                  background: c.color,
                  boxShadow: `0 0 9px ${c.color}`,
                  marginBottom: 13,
                }} />
                <div style={{
                  color: "#ece8ff",
                  fontSize: 9.5,
                  letterSpacing: "0.24em",
                  marginBottom: 7,
                  fontFamily: "'Helvetica Neue', Arial, sans-serif",
                }}>
                  {c.label}
                </div>
                <div style={{
                  color: c.color,
                  fontSize: 10,
                  opacity: 0.65,
                  letterSpacing: "0.06em",
                  fontFamily: "Georgia, serif",
                  fontStyle: "italic",
                  lineHeight: 1.5,
                }}>
                  {c.theme}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────
          SECTION 5 — PRICING
      ───────────────────────────────────────────────────────────────── */}
      <section style={{ background: "#050308", borderTop: divider, padding: "110px 24px" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <div
            id="price-label"
            data-reveal
            style={{ ...reveal("price-label"), color: "rgba(184,146,255,0.55)", fontSize: 10, letterSpacing: "0.52em", textAlign: "center", marginBottom: 14 }}
          >
            PRICING
          </div>
          <h2
            id="price-h2"
            data-reveal
            style={{
              ...reveal("price-h2"),
              color: "#f0ecff",
              fontSize: "clamp(26px, 4.5vw, 52px)",
              fontWeight: 200,
              letterSpacing: "0.06em",
              textAlign: "center",
              marginBottom: 14,
              fontFamily: "Georgia, 'Times New Roman', serif",
              transitionDelay: "0.1s",
            }}
          >
            Choose your cosmos
          </h2>
          <p
            id="price-sub"
            data-reveal
            style={{
              ...reveal("price-sub"),
              color: "rgba(200,196,235,0.48)",
              fontSize: "clamp(14px, 2vw, 17px)",
              textAlign: "center",
              maxWidth: 480,
              margin: "0 auto 36px",
              lineHeight: 1.78,
              fontFamily: "Georgia, serif",
              fontStyle: "italic",
              transitionDelay: "0.18s",
            }}
          >
            Aether is free to explore. For the deeper journey, unlock the full
            cosmic spectrum.
          </p>

          {/* Early access notice */}
          <div
            id="price-notice"
            data-reveal
            style={{
              ...reveal("price-notice"),
              background: "rgba(184,146,255,0.07)",
              border: "1px solid rgba(184,146,255,0.22)",
              borderRadius: 12,
              padding: "14px 24px",
              textAlign: "center",
              marginBottom: 44,
              color: "rgba(200,196,235,0.55)",
              fontSize: 13,
              letterSpacing: "0.06em",
              fontFamily: "Georgia, serif",
              fontStyle: "italic",
              transitionDelay: "0.22s",
            }}
          >
            ✦ &nbsp; Premium tiers are in active development — join the waitlist below for early access
          </div>

          <div
            id="price-cards"
            data-reveal
            style={{
              ...reveal("price-cards"),
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 20,
              marginBottom: 72,
              transitionDelay: "0.3s",
            }}
          >
            {PLANS.map(p => (
              <div
                key={p.tier}
                style={{
                  background: p.featured
                    ? `linear-gradient(160deg, rgba(255,136,170,0.09), rgba(184,146,255,0.07))`
                    : cardBg,
                  backdropFilter: cardBlur,
                  border: `1px solid ${p.featured ? p.color + "44" : p.color + "1e"}`,
                  borderRadius: 22,
                  padding: "40px 28px",
                  position: "relative",
                  boxShadow: p.featured ? `0 0 48px ${p.color}14` : "none",
                }}
              >
                {p.featured && (
                  <div style={{
                    position: "absolute",
                    top: -1, left: "50%", transform: "translateX(-50%)",
                    background: "linear-gradient(90deg, #ff88aa, #b892ff)",
                    color: "#fff",
                    fontSize: 9,
                    letterSpacing: "0.32em",
                    padding: "5px 20px",
                    borderRadius: "0 0 10px 10px",
                    fontFamily: "'Helvetica Neue', Arial, sans-serif",
                    whiteSpace: "nowrap",
                  }}>
                    MOST POPULAR
                  </div>
                )}
                <div style={{ color: p.color, fontSize: 9.5, letterSpacing: "0.44em", marginBottom: 14 }}>
                  {p.tier}
                </div>
                <div style={{
                  color: "#f0ecff",
                  fontSize: 42,
                  fontWeight: 200,
                  lineHeight: 1,
                  marginBottom: 4,
                  fontFamily: "Georgia, serif",
                }}>
                  {p.price}
                </div>
                <div style={{
                  color: "rgba(200,196,235,0.4)",
                  fontSize: 12,
                  letterSpacing: "0.1em",
                  marginBottom: 30,
                  fontFamily: "'Helvetica Neue', Arial, sans-serif",
                }}>
                  {p.cycle}
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 34px", display: "flex", flexDirection: "column", gap: 11 }}>
                  {p.items.map(item => (
                    <li key={item} style={{
                      color: "rgba(200,196,235,0.68)",
                      fontSize: 13.5,
                      display: "flex", gap: 10, alignItems: "flex-start",
                      fontFamily: "Georgia, serif",
                      lineHeight: 1.5,
                    }}>
                      <span style={{ color: p.color, flexShrink: 0, marginTop: 1 }}>✦</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <button
                  style={{
                    width: "100%",
                    background: p.featured
                      ? `linear-gradient(135deg, ${p.color}44, ${p.color}22)`
                      : "rgba(10,6,22,0.6)",
                    border: `1px solid ${p.color}44`,
                    color: p.featured ? "#fff" : "rgba(220,216,255,0.65)",
                    borderRadius: 999,
                    padding: "15px 0",
                    fontSize: 12,
                    letterSpacing: "0.22em",
                    cursor: "pointer",
                    fontFamily: "'Helvetica Neue', Arial, sans-serif",
                    boxShadow: p.featured ? `0 0 28px ${p.color}2a` : "none",
                    transition: "all 0.35s ease",
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.boxShadow = `0 0 36px ${p.color}40`;
                    el.style.borderColor = p.color + "77";
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.boxShadow = p.featured ? `0 0 28px ${p.color}2a` : "none";
                    el.style.borderColor = p.color + "44";
                  }}
                >
                  {p.cta}
                </button>
              </div>
            ))}
          </div>

          {/* Waitlist email capture */}
          <div
            id="waitlist"
            data-reveal
            style={{
              ...reveal("waitlist"),
              maxWidth: 500,
              margin: "0 auto",
              textAlign: "center",
              transitionDelay: "0.38s",
            }}
          >
            <div style={{
              color: "rgba(200,196,235,0.55)",
              fontSize: 13.5,
              marginBottom: 20,
              fontFamily: "Georgia, serif",
              fontStyle: "italic",
              letterSpacing: "0.04em",
            }}>
              Get early access when premium launches
            </div>
            {joined ? (
              <div style={{
                color: "#b892ff",
                fontSize: 15,
                fontFamily: "Georgia, serif",
                fontStyle: "italic",
                textShadow: "0 0 22px #b892ff66",
                lineHeight: 1.7,
              }}>
                ✦ &nbsp; You are now among the stars. We will find you when the time comes.
              </div>
            ) : (
              <form onSubmit={joinWaitlist} style={{ display: "flex", gap: 10 }}>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@cosmos.com"
                  required
                  style={{
                    flex: 1,
                    background: "rgba(14,9,28,.65)",
                    backdropFilter: "blur(14px)",
                    border: "1px solid rgba(150,130,230,.26)",
                    borderRadius: 999,
                    color: "#eee9ff",
                    fontSize: 14,
                    padding: "13px 22px",
                    outline: "none",
                    fontFamily: "Georgia, serif",
                    minWidth: 0,
                  }}
                />
                <button
                  type="submit"
                  style={{
                    background: "linear-gradient(135deg, rgba(184,146,255,.28), rgba(184,146,255,.14))",
                    border: "1px solid rgba(184,146,255,.55)",
                    color: "#ece8ff",
                    borderRadius: 999,
                    padding: "13px 26px",
                    fontSize: 12,
                    letterSpacing: "0.2em",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    fontFamily: "'Helvetica Neue', Arial, sans-serif",
                    boxShadow: "0 0 22px rgba(184,146,255,.22)",
                    flexShrink: 0,
                  }}
                >
                  JOIN
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────
          SECTION 6 — CTA
      ───────────────────────────────────────────────────────────────── */}
      <section
        style={{
          background: "#060310",
          borderTop: divider,
          padding: "130px 24px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div
            id="cta-label"
            data-reveal
            style={{ ...reveal("cta-label"), color: "rgba(184,146,255,0.55)", fontSize: 10, letterSpacing: "0.52em", marginBottom: 20 }}
          >
            BEGIN
          </div>
          <h2
            id="cta-h2"
            data-reveal
            style={{
              ...reveal("cta-h2"),
              color: "#f0ecff",
              fontSize: "clamp(32px, 6vw, 72px)",
              fontWeight: 200,
              letterSpacing: "0.06em",
              marginBottom: 22,
              fontFamily: "Georgia, 'Times New Roman', serif",
              transitionDelay: "0.1s",
            }}
          >
            The cosmos is waiting
          </h2>
          <p
            id="cta-sub"
            data-reveal
            style={{
              ...reveal("cta-sub"),
              color: "rgba(200,196,235,0.45)",
              fontSize: "clamp(15px, 2.2vw, 19px)",
              maxWidth: 500,
              margin: "0 auto 50px",
              lineHeight: 1.78,
              fontFamily: "Georgia, serif",
              fontStyle: "italic",
              transitionDelay: "0.18s",
            }}
          >
            Every thought you have ever had deserved to become a star.
          </p>
          <div
            id="cta-btn"
            data-reveal
            style={{ ...reveal("cta-btn"), transitionDelay: "0.26s" }}
          >
            <button
              onClick={scrollToTop}
              style={{
                background: "linear-gradient(135deg, rgba(184,146,255,0.18), rgba(255,136,170,0.1))",
                border: "1px solid rgba(184,146,255,0.38)",
                color: "#f0ecff",
                borderRadius: 999,
                padding: "19px 52px",
                fontSize: 12,
                letterSpacing: "0.34em",
                cursor: "pointer",
                fontFamily: "'Helvetica Neue', Arial, sans-serif",
                boxShadow: "0 0 44px rgba(184,146,255,0.18)",
                transition: "all 0.4s ease",
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.boxShadow   = "0 0 70px rgba(184,146,255,0.38)";
                el.style.borderColor = "rgba(184,146,255,0.6)";
                el.style.background  = "linear-gradient(135deg, rgba(184,146,255,0.26), rgba(255,136,170,0.16))";
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.boxShadow   = "0 0 44px rgba(184,146,255,0.18)";
                el.style.borderColor = "rgba(184,146,255,0.38)";
                el.style.background  = "linear-gradient(135deg, rgba(184,146,255,0.18), rgba(255,136,170,0.1))";
              }}
            >
              ENTER THE COSMOS &nbsp; ✦
            </button>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────
          FOOTER
      ───────────────────────────────────────────────────────────────── */}
      <footer style={{
        background: "#050308",
        borderTop: divider,
        padding: "44px 24px",
        textAlign: "center",
      }}>
        <div style={{ color: "#eceaff", fontSize: 12, letterSpacing: "0.62em", marginBottom: 8 }}>
          A E T H E R
        </div>
        <div style={{ color: "rgba(200,196,235,0.24)", fontSize: 9, letterSpacing: "0.32em", marginBottom: 28 }}>
          A LIVING COSMOS
        </div>
        <div style={{ color: "rgba(200,196,235,0.18)", fontSize: 11, letterSpacing: "0.1em" }}>
          © {new Date().getFullYear()} AETHER · A whisper to the void
        </div>
      </footer>

      {/* ─────────────────────────────────────────────────────────────────
          FLOATING RETURN BUTTON
      ───────────────────────────────────────────────────────────────── */}
      <button
        onClick={scrollToTop}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 200,
          background: "rgba(12,7,24,0.88)",
          backdropFilter: "blur(18px)",
          border: "1px solid rgba(184,146,255,0.28)",
          color: "#b892ff",
          borderRadius: 999,
          padding: "10px 18px",
          fontSize: 10,
          letterSpacing: "0.28em",
          cursor: "pointer",
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
          boxShadow: "0 0 18px rgba(184,146,255,0.12)",
          transition: "opacity 0.5s ease, transform 0.5s ease",
          opacity: scrolled ? 1 : 0,
          transform: scrolled ? "translateY(0)" : "translateY(12px)",
          pointerEvents: scrolled ? "auto" : "none",
        }}
      >
        ↑ &nbsp; COSMOS
      </button>
    </>
  );
}
