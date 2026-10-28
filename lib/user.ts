// Who is asking.
//
// The identity of a request comes from its Authorization header and from
// nowhere else — in particular never from the request body. /api/save used to
// take `user_id` out of the JSON it was posted, which with real accounts
// would mean anybody could write rows into anybody else's sky by typing their
// uuid into a POST. The body is a thing the caller controls; a signed token
// is not.
//
// Verification is a network call to Supabase per request, which is a real
// cost and the right one: validating the JWT's signature locally would need
// the project's signing secret deployed here, and a revoked or expired
// session would keep working until the token's own expiry. These are
// endpoints that run a few times per thought, not per frame.

import { whispersDb } from "@/lib/supabase";

export type Caller = { userId: string } | null;

function bearer(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  const t = m?.[1]?.trim();
  // A JWT is three dot-separated segments. Anything else is not worth a round
  // trip to find out about.
  if (!t || t.length < 20 || t.length > 4096 || t.split(".").length !== 3) return null;
  return t;
}

/**
 * The signed-in user, or null.
 *
 * Null covers every failure identically — no header, a malformed one, an
 * expired session, a token from another project, Supabase being unreachable.
 * Callers treat null as "not signed in", which degrades to the anonymous
 * behaviour the app had before accounts existed rather than to an error.
 *
 * One consequence worth being deliberate about: if Supabase is down, a
 * signed-in person's thought is saved as anonymous rather than refused. For a
 * product whose job is to accept a thought at 1am, losing the association is
 * better than losing the thought.
 */
export async function callerFrom(req: Request): Promise<Caller> {
  const token = bearer(req);
  if (!token) return null;

  const db = whispersDb();
  if (!db) return null;

  try {
    const { data, error } = await db.client.auth.getUser(token);
    const id = data?.user?.id;
    if (error || !id) return null;
    // Supabase user ids are uuids. Checked rather than trusted because this
    // value goes on to be used as a database filter.
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
    return { userId: id };
  } catch {
    return null;
  }
}
