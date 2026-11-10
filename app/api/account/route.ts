import { whispersDb } from "@/lib/supabase";
import { callerFrom } from "@/lib/user";

// Deleting an account, properly.
//
// Signing in created a row we had no way to remove, which made every claim
// about privacy conditional on us being asked nicely. This removes the
// thoughts first and the identity second, in that order deliberately: if the
// second step fails, the person's words are already gone and they can try
// again, whereas the reverse order would orphan their rows behind a deleted
// identity and leave nothing that could ever reach them.
//
// There is no soft delete, no thirty-day grace period and no "deactivated"
// state. For a product whose whole promise is that a thought is yours, a
// deletion that keeps a copy is a lie with a timer on it.

export const dynamic = "force-dynamic";

export async function DELETE(req: Request) {
  const db = whispersDb();
  if (!db) {
    return Response.json({ ok: false, reason: "no-supabase" }, { status: 503 });
  }

  // Deleting rows and deleting an auth user both need the service-role key.
  // Without it we would report success having done nothing, which on this
  // endpoint is the worst possible outcome.
  if (!db.privileged) {
    return Response.json(
      { ok: false, reason: "not-configured" },
      { status: 503 }
    );
  }

  const caller = await callerFrom(req);
  if (!caller) {
    return Response.json({ ok: false, reason: "not-signed-in" }, { status: 401 });
  }

  const supabase = db.client;

  // 1. The thoughts.
  let removed = 0;
  try {
    const { data, error } = await supabase
      .from("whispers")
      .delete()
      .eq("user_id", caller.userId)
      .select("id");
    if (error) throw error;
    removed = data?.length ?? 0;
  } catch {
    return Response.json({ ok: false, reason: "thoughts-not-deleted" }, { status: 500 });
  }

  // 2. The identity. Reported separately, because the person needs to know
  // which half happened: their words being gone is the part that matters
  // most, and it is already done by this point.
  try {
    const { error } = await supabase.auth.admin.deleteUser(caller.userId);
    if (error) throw error;
  } catch {
    return Response.json(
      { ok: false, reason: "account-not-deleted", thoughtsRemoved: removed },
      { status: 500 }
    );
  }

  return Response.json({ ok: true, thoughtsRemoved: removed });
}
