import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("user_id");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return Response.json([]);
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const query = supabase
      .from("whispers")
      .select("id,thought,whisper,palette,form,energy,pos,created_at")
      .order("created_at", { ascending: false })
      .limit(30);

    if (userId) {
      query.eq("user_id", userId);
    } else {
      query.eq("public", true);
    }

    const { data, error } = await query;
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
