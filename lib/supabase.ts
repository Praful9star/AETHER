import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Every read and write of `whispers` happens on the server — the share page,
// the OG image, /api/save, /api/stars. None of it happens in the browser.
// That matters, because it means the table never has to be reachable with the
// anon key, and the anon key is public: it ships inside the client bundle, so
// anyone who opens the site has it.
//
// Until now all four call sites used that public key, and the table's read
// policy let it through for any row whose user_id was 'anon' — which is every
// row we have ever written, since the client never sends a user_id. Anybody
// holding the key (i.e. anybody) could read every thought anyone had ever
// confided to Aether. The thoughts people write here are the most private
// thing this product touches; that is the one thing it cannot get wrong.
//
// So: prefer the service-role key, which bypasses RLS and is never exposed to
// the browser, and pair it with a migration that denies the anon role any
// access at all. The fallback to the anon key is deliberate — it keeps an
// existing deployment working until SUPABASE_SERVICE_ROLE_KEY is set — but it
// is reported, so a caller can tell which mode it is in.

export type Db = { client: SupabaseClient; privileged: boolean } | null;

export function whispersDb(): Db {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const key = service || anon;
  if (!url || !key) return null;

  return {
    client: createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
    privileged: Boolean(service),
  };
}

// 'anon' is what /api/save stores when it is given no user_id, so it is a
// shared bucket rather than an identity: letting it through /api/stars would
// hand any caller a slice of everyone else's whispers. Reserved until real
// accounts exist and every row carries an owner.
const RESERVED = new Set(["anon", "null", "undefined", "none", "public", "all", "*"]);

export function isRealUserId(id: string | null | undefined): id is string {
  if (!id) return false;
  const v = id.trim();
  return v.length >= 8 && v.length <= 64 && !RESERVED.has(v.toLowerCase());
}
