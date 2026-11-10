import { whispersDb } from "@/lib/supabase";
import { callerFrom } from "@/lib/user";

// Deleting one thought, everywhere.
//
// Removing a star from the sky used to delete it from this browser and leave
// the stored copy untouched, so its /w/<id> share link kept resolving after
// the person had deliberately forgotten it. That is the single most
// uncomfortable gap this product had: a thing you asked to be gone, still
// readable by anybody holding a link you may have sent weeks ago.
//
// Two ways in, because the sky has two kinds of star:
//
//   by `id`      — the row's uuid, which /api/save now hands back and the
//                  client keeps. Exact, and the normal path for anything
//                  written from now on.
//   by text      — the thought and the whisper, for stars saved before the
//                  uuid was kept. Matching on text is blunter, but a star
//                  from last month deserves to be deletable too.
//
// Both are scoped to `user_id = caller`, always, so no request can reach a
// row that is not the caller's own, whichever way in it used.

export const dynamic = "force-dynamic";

export async function DELETE(req: Request) {
  const db = whispersDb();
  if (!db) return Response.json({ ok: false, reason: "no-supabase" }, { status: 503 });
  if (!db.privileged) {
    // Reporting success here would tell somebody their thought was deleted
    // when it was not.
    return Response.json({ ok: false, reason: "not-configured" }, { status: 503 });
  }

  const caller = await callerFrom(req);
  if (!caller) {
    // Not an error worth surfacing: a thought written before signing in
    // carries no owner, so there is nothing we could safely delete. The
    // privacy note says this plainly rather than pretending otherwise.
    return Response.json({ ok: false, reason: "not-signed-in" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, reason: "bad-request" }, { status: 400 });
  }

  const id = typeof body?.id === "string" ? body.id.trim() : "";
  const thought = typeof body?.thought === "string" ? body.thought.slice(0, 500) : "";
  const whisper = typeof body?.whisper === "string" ? body.whisper.slice(0, 300) : "";

  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const byId = UUID.test(id);
  if (!byId && !whisper) {
    return Response.json({ ok: false, reason: "bad-request" }, { status: 400 });
  }

  try {
    let q = db.client.from("whispers").delete().eq("user_id", caller.userId);
    if (byId) {
      q = q.eq("id", id);
    } else {
      q = q.eq("whisper", whisper);
      // A thought and its whisper together identify a star; whisper alone
      // could in principle repeat across two different thoughts.
      if (thought) q = q.eq("thought", thought);
    }
    const { data, error } = await q.select("id");
    if (error) throw error;
    return Response.json({ ok: true, removed: data?.length ?? 0 });
  } catch {
    return Response.json({ ok: false, reason: "not-deleted" }, { status: 500 });
  }
}
