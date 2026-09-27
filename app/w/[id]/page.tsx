import { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import ShareGalaxy from "@/components/ShareGalaxy";

interface Props {
  params: { id: string };
}

async function getWhisper(id: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const supabase = createClient(url, key);
  const { data } = await supabase
    .from("whispers")
    .select("*")
    .eq("id", id)
    .single();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const w = await getWhisper(params.id);
  const whisper = w?.whisper ?? "A whisper to the void";
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://aether.app";

  return {
    title: `AETHER — ${whisper.slice(0, 60)}`,
    description: whisper,
    openGraph: {
      title: "AETHER — A Whisper to the Void",
      description: whisper,
      images: [`${baseUrl}/api/og?id=${params.id}`],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "AETHER — A Whisper to the Void",
      description: whisper,
      images: [`${baseUrl}/api/og?id=${params.id}`],
    },
  };
}

export default async function WhisperPage({ params }: Props) {
  const w = await getWhisper(params.id);

  const palette = w?.palette ?? ["#0d0221", "#4c1d95", "#a78bfa"];
  const [dark, mid, bright] = palette;
  // Stable per-whisper, so a shared link always draws the same galaxy
  // rather than a different one on every open.
  const seed = Array.from(params.id).reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) || 1;

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        overflow: "hidden",
        background: `radial-gradient(ellipse at 50% 42%, ${mid}33 0%, ${dark} 62%, #04030c 100%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "56px 24px",
      }}
    >
      {/* The galaxy this whisper became. Behind the words, not competing
          with them — the page is still there to be read. */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.95 }}>
        <ShareGalaxy palette={palette} form={w?.form ?? "spiral"} seed={seed} />
      </div>
      {/* Keeps the words legible without dimming the galaxy's core, which is
          the brightest and most interesting part of it. A centre-dark vignette
          did exactly the wrong thing: it hid the subject to protect the
          caption. This darkens the edges instead, and the text carries its
          own shadow. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 50%, transparent 0%, rgba(4,3,12,.30) 58%, rgba(4,3,12,.72) 100%)",
        }}
      />

      <div style={{ position: "relative", textAlign: "center", maxWidth: 680 }}>
        <p
          style={{
            fontFamily: "var(--font-sans), Inter, Arial, sans-serif",
            fontSize: 10,
            letterSpacing: "0.34em",
            color: "rgba(226,222,255,.52)",
            textShadow: "0 1px 10px rgba(0,0,0,.9)",
            marginBottom: 10,
          }}
        >
          A WHISPER TO THE VOID
        </p>
        <h1
          style={{
            fontFamily: "var(--font-sans), Inter, Arial, sans-serif",
            fontSize: 13,
            fontWeight: 400,
            letterSpacing: "0.5em",
            color: "rgba(240,238,255,.85)",
            textShadow: "0 1px 12px rgba(0,0,0,.9)",
            marginBottom: 44,
          }}
        >
          AETHER
        </h1>

        {w ? (
          <>
            {/* The person's own words lead. The line Aether wrote back is the
                answer to them, so it cannot come first. */}
            <p
              style={{
                fontFamily: "var(--font-serif), Georgia, serif",
                fontSize: "clamp(15px, 2.2vw, 18px)",
                color: "rgba(232,228,255,.62)",
                textShadow: "0 1px 10px rgba(0,0,0,.85)",
                marginBottom: 22,
              }}
            >
              &ldquo;{w.thought}&rdquo;
            </p>
            <div
              style={{
                width: 42,
                height: 1,
                margin: "0 auto 22px",
                background: `linear-gradient(to right, transparent, ${bright}aa, transparent)`,
              }}
            />
            <blockquote
              style={{
                fontFamily: "var(--font-serif), Georgia, serif",
                fontStyle: "italic",
                fontSize: "clamp(22px, 4vw, 36px)",
                lineHeight: 1.5,
                color: "#f3f0ff",
                textShadow: `0 0 46px ${bright}55, 0 2px 14px rgba(0,0,0,.92), 0 1px 3px rgba(0,0,0,.9)`,
                margin: "0 0 34px",
              }}
            >
              &ldquo;{w.whisper}&rdquo;
            </blockquote>

            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 44,
              }}
            >
              {w.palette.map((c: string) => (
                <span
                  key={c}
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 99,
                    backgroundColor: c,
                    boxShadow: `0 0 10px ${c}`,
                  }}
                />
              ))}
              <span
                style={{
                  fontFamily: "var(--font-sans), Inter, Arial, sans-serif",
                  fontSize: 9.5,
                  letterSpacing: "0.26em",
                  color: "rgba(226,222,255,.4)",
                  marginLeft: 8,
                }}
              >
                {String(w.form ?? "").toUpperCase()}
              </span>
            </div>
          </>
        ) : (
          <p
            style={{
              fontFamily: "var(--font-serif), Georgia, serif",
              fontStyle: "italic",
              fontSize: 18,
              color: "rgba(226,222,255,.62)",
              textShadow: "0 1px 12px rgba(0,0,0,.9)",
              marginBottom: 44,
            }}
          >
            This whisper has faded into the void.
          </p>
        )}

        <Link
          href="/"
          style={{
            display: "inline-block",
            fontFamily: "var(--font-sans), Inter, Arial, sans-serif",
            fontSize: 11,
            letterSpacing: "0.22em",
            color: "rgba(236,232,255,.82)",
            border: `1px solid ${bright}55`,
            borderRadius: 999,
            padding: "13px 30px",
            textDecoration: "none",
            background: "rgba(14,10,28,.5)",
            boxShadow: `0 0 26px ${bright}22`,
          }}
        >
          WHISPER YOUR OWN &#10023;
        </Link>
      </div>
    </div>
  );
}
