import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

export const revalidate = 60;

async function getPublicWhispers() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];

  const supabase = createClient(url, key);
  const { data } = await supabase
    .from("whispers")
    .select("id,whisper,palette,form,energy,created_at")
    .eq("public", true)
    .order("created_at", { ascending: false })
    .limit(50);
  return data ?? [];
}

export default async function VoidPage() {
  const whispers = await getPublicWhispers();

  return (
    <div className="min-h-screen bg-[#050308] text-white">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <p className="text-xs tracking-[0.3em] text-white/30 mb-2">
            A WHISPER TO THE VOID
          </p>
          <h1
            className="text-5xl font-bold tracking-[0.3em] text-white/80 mb-4"
            style={{ fontFamily: "serif" }}
          >
            AETHER
          </h1>
          <p className="text-white/30 text-sm">
            {whispers.length} whispers have echoed through the cosmos
          </p>
        </div>

        {whispers.length === 0 ? (
          <div className="text-center text-white/20 py-24">
            <p className="text-xl italic" style={{ fontFamily: "serif" }}>
              The void awaits your first whisper.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {whispers.map((w: any) => (
              <Link
                key={w.id}
                href={`/w/${w.id}`}
                className="block border border-white/10 rounded-xl p-5 hover:border-white/25 transition-colors"
                style={{
                  background: `linear-gradient(135deg, ${w.palette[0]}88, ${w.palette[1]}44)`,
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  {w.palette.map((c: string) => (
                    <div
                      key={c}
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <span className="text-xs text-white/20 ml-auto tracking-widest">
                    {w.form?.toUpperCase()}
                  </span>
                </div>
                <p
                  className="text-white/75 text-sm italic leading-relaxed line-clamp-3"
                  style={{ fontFamily: "Georgia, serif" }}
                >
                  &ldquo;{w.whisper}&rdquo;
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <div
                    className="h-0.5 rounded-full flex-1 mr-4"
                    style={{
                      background: `linear-gradient(to right, ${w.palette[1]}, ${w.palette[2]})`,
                      opacity: w.energy,
                    }}
                  />
                  <span className="text-xs text-white/15">
                    {new Date(w.created_at).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="text-center mt-16">
          <Link
            href="/"
            className="inline-block border border-white/20 text-white/50 hover:text-white/80 hover:border-white/40 transition-colors px-8 py-3 rounded-xl text-sm tracking-widest"
          >
            ENTER THE COSMOS
          </Link>
        </div>
      </div>
    </div>
  );
}
