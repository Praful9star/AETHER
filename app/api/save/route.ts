import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return Response.json({ ok: false, reason: "no-supabase" });
  }

  try {
    const body = await req.json();
    const { thought, whisper, palette, form, energy, user_id, pos } = body;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from("whispers")
      .insert({
        id: uuidv4(),
        user_id: String(user_id ?? "anon").slice(0, 64),
        thought: String(thought ?? "").slice(0, 500),
        whisper: String(whisper ?? ""),
        palette: palette ?? [],
        form: String(form ?? "spiral"),
        energy: Number(energy ?? 0.5),
        pos: pos ?? null,
        public: true,
      })
      .select("id")
      .single();

    if (error) throw error;
    return Response.json({ ok: true, id: data.id });
  } catch (err) {
    return Response.json({ ok: false, reason: String(err) });
  }
}
