import { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

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

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `radial-gradient(ellipse at center, ${mid}55 0%, ${dark} 70%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "serif",
        padding: "40px 24px",
      }}
    >
      <div className="text-center max-w-2xl">
        <p
          className="text-sm tracking-[0.3em] mb-2"
          style={{ color: "rgba(255,255,255,0.3)" }}
        >
          A WHISPER TO THE VOID
        </p>
        <h1
          className="text-4xl font-bold tracking-[0.3em] mb-12"
          style={{ color: "rgba(255,255,255,0.8)" }}
        >
          AETHER
        </h1>

        {w ? (
          <>
            <blockquote
              className="text-2xl md:text-3xl italic leading-relaxed mb-8"
              style={{ color: "rgba(255,255,255,0.85)", borderLeft: `3px solid ${bright}`, paddingLeft: "1.5rem" }}
            >
              &ldquo;{w.whisper}&rdquo;
            </blockquote>

            <p
              className="text-sm mb-8"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              {w.thought}
            </p>

            <div className="flex gap-2 justify-center mb-12">
              {w.palette.map((c: string) => (
                <div
                  key={c}
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: c }}
                />
              ))}
              <span
                className="text-xs tracking-widest ml-2 self-center"
                style={{ color: "rgba(255,255,255,0.2)" }}
              >
                {w.form?.toUpperCase()}
              </span>
            </div>
          </>
        ) : (
          <p style={{ color: "rgba(255,255,255,0.3)" }}>
            This whisper has faded into the void.
          </p>
        )}

        <Link
          href="/"
          className="inline-block border border-white/20 text-white/50 hover:text-white/80 hover:border-white/40 transition-colors px-8 py-3 rounded-xl text-sm tracking-widest"
        >
          WHISPER YOUR OWN
        </Link>
      </div>
    </div>
  );
}
