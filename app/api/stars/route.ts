import { isRealUserId, whispersDb } from "@/lib/supabase";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("user_id");

  const db = whispersDb();
  if (!db) return Response.json([]);

  // No bulk "public feed" — a whisper is private to whoever wrote it unless
  // shared explicitly (via its own /w/[id] link, fetched by id elsewhere).
  // Without a user_id this must return nothing rather than let anyone
  // enumerate other people's whispers.
  //
  // And 'anon' is not a user_id. It is the placeholder /api/save writes when
  // it is given none, so every row we have ever stored carries it: asking for
  // it here used to return a page of strangers' thoughts. Rejected until rows
  // carry a real owner.
  if (!isRealUserId(userId)) return Response.json([]);

  try {
    const supabase = db.client;
    const { data, error } = await supabase
      .from("whispers")
      .select("id,thought,whisper,palette,form,energy,pos,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw error;

    return Response.json(
      (data ?? []).map((r: any) => ({
        id: r.id,
        thought: r.thought ?? "",
        whisper: r.whisper,
        palette: r.palette ?? ["#0d0221", "#4c1d95", "#a78bfa"],
        form: r.form ?? "spiral",
        energy: r.energy ?? 0.5,
        pos: r.pos ?? null,
        created_at: r.created_at,
      }))
    );
  } catch {
    return Response.json([]);
  }
}
