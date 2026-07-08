import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  let whisper = "A whisper to the cosmos.";
  let palette = ["#0d0221", "#4c1d95", "#a78bfa"];
  let form = "spiral";

  if (id) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
    );
    const { data } = await supabase
      .from("whispers")
      .select("whisper,palette,form")
      .eq("id", id)
      .single();
    if (data) {
      whisper = data.whisper;
      palette = data.palette;
      form = data.form;
    }
  }

  const [dark, mid, bright] = palette;

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: `radial-gradient(ellipse at center, ${mid}88 0%, ${dark} 70%)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "serif",
          padding: "60px 80px",
        }}
      >
        <div
          style={{
            fontSize: 18,
            color: "rgba(255,255,255,0.4)",
            letterSpacing: "0.3em",
            marginBottom: 20,
          }}
        >
          A WHISPER TO THE VOID
        </div>
        <div
          style={{
            fontSize: 64,
            color: "rgba(255,255,255,0.9)",
            fontWeight: "bold",
            letterSpacing: "0.2em",
            marginBottom: 40,
          }}
        >
          AETHER
        </div>
        <div
          style={{
            fontSize: 28,
            color: "rgba(255,255,255,0.8)",
            fontStyle: "italic",
            textAlign: "center",
            lineHeight: 1.5,
            maxWidth: 900,
            borderLeft: `3px solid ${bright}`,
            paddingLeft: 24,
          }}
        >
          {`“${whisper}”`}
        </div>
        <div
          style={{
            marginTop: 48,
            fontSize: 14,
            color: "rgba(255,255,255,0.2)",
            letterSpacing: "0.3em",
          }}
        >
          {`${form.toUpperCase()} · A LIVING COSMOS`}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
