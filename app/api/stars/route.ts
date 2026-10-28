import { isRealUserId, whispersDb } from "@/lib/supabase";
import { callerFrom } from "@/lib/user";

// Without this the route is static.
//
// It used to read searchParams, which marked it dynamic as a side effect.
// Now that identity comes from a header instead, Next sees a GET handler that
// touches nothing request-shaped, prerenders it at build time and serves that
// one response to everybody — an empty array, forever, however many stars the
// caller has. The build output is where this shows up: ○ rather than ƒ.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const db = whispersDb();
  if (!db) return Response.json([]);

  // The owner is read from the signed token, and the ?user_id= parameter this
  // route used to accept is gone.
  //
  // That parameter was safe only while it was useless: isRealUserId rejects
  // the 'anon' placeholder every stored row carried, so it has always
  // returned nothing. The moment rows carry real uuids it would have become
  // an endpoint that hands over anybody's thoughts to anybody holding their
  // id — and a uuid is not a secret. It travels in share links and logs.
  //
  // No bulk feed either: a whisper is private to whoever wrote it unless
  // shared explicitly, via its own unguessable /w/[id] link.
  const caller = await callerFrom(req);
  const userId = caller?.userId ?? null;
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
