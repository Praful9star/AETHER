// Accounts, by email code.
//
// Aether has had no accounts. That is why two of the gaps in the brief are
// what they are: the stored copy of a thought is write-only (nothing ever
// sends a user_id, so /api/stars cannot find anybody's rows), and your sky
// lives in localStorage, which means it is one browser's sky and clearing
// site data is deletion.
//
// WHY A CODE AND NOT A PASSWORD, A LINK, OR GOOGLE
//
// No password: a password is a thing to store, leak and reset, and we would
// be asking people to invent one in order to write down a thought at 1am.
//
// Not primarily a magic link: a link opens a new tab. Aether is a galaxy you
// are standing inside with a thought half-typed, and a new tab throws that
// away to prove who you are. A six-digit code is typed where you already
// are, and the sky never goes anywhere. (The link still works if somebody
// clicks it — see restoreFromLink — it is just not the path we design for.)
//
// Not Google: one tap, but it hands Google the fact that this person uses a
// product for writing down thoughts they would not say out loud. That is a
// strange thing to broker on somebody's behalf for a convenience.
//
// SETUP NOTE
//
// Supabase's default email for this flow contains only the link, so the code
// must be added to the template once, in the dashboard:
//   Authentication -> Emails -> Magic Link -> include {{ .Token }}
// Until that is done the email arrives with a working link and no code, and
// the UI will sit waiting for a code that is not in the message. The link
// path still signs you in.
//
// Auth legitimately uses the public anon key — that is what it is for, and it
// is what mints the user's own JWT. It does not re-open the whispers table:
// migration 002 revokes that table from both anon and authenticated, so the
// table is still only reachable server-side with the service key. The JWT is
// used as proof of identity, not as a database grant.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ── Validation, as pure functions ──────────────────────────────────────────

export function normaliseEmail(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().toLowerCase() : "";
}

/**
 * Deliberately loose. The only authority on whether an address exists is
 * whether the mail arrives, so this exists to catch a typo before we spend a
 * round trip on it, not to adjudicate RFC 5322 — a regex that rejects valid
 * unusual addresses is worse than one that accepts invalid ones.
 */
export function validEmail(raw: unknown): boolean {
  const e = normaliseEmail(raw);
  return e.length >= 6 && e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
}

/** Strip everything that is not a digit, so a pasted "123 456" still works. */
export function cleanCode(raw: unknown): string {
  return typeof raw === "string" ? raw.replace(/\D/g, "").slice(0, 6) : "";
}

export function validCode(raw: unknown): boolean {
  return cleanCode(raw).length === 6;
}

// ── The client ─────────────────────────────────────────────────────────────

export type Auth = { token: string; userId: string; email?: string };

let cached: SupabaseClient | null | undefined;

export function authClient(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon || typeof window === "undefined") {
    cached = null;
    return cached;
  }
  cached = createClient(url, anon, {
    auth: {
      // Unlike the server client in lib/supabase.ts, this one does persist:
      // the whole point is that your sky survives closing the tab.
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "aether_auth",
    },
  });
  return cached;
}

export function authAvailable(): boolean {
  return authClient() !== null;
}

export type Outcome = { ok: boolean; reason?: string };

/**
 * Ask for a code. `shouldCreateUser` is on, so signing in and signing up are
 * the same gesture — there is no separate registration, and no screen asking
 * whether you have been here before.
 *
 * Supabase does not say whether the address was already known, and we do not
 * either: that difference is the one piece of information an email form can
 * leak about somebody else.
 */
export async function sendCode(email: string): Promise<Outcome> {
  const client = authClient();
  if (!client) return { ok: false, reason: "Accounts are not set up on this deployment." };
  if (!validEmail(email)) return { ok: false, reason: "That does not look like an email address." };
  try {
    const { error } = await client.auth.signInWithOtp({
      email: normaliseEmail(email),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });
    if (error) {
      // Rate limiting is the one failure worth describing precisely, because
      // the fix is "wait" and a person who is not told that will keep
      // pressing the button and conclude it is broken.
      const m = /rate|limit|too many|seconds/i.test(error.message)
        ? "Too many requests — wait a minute and try again."
        : "Could not send the code. Check the address and try again.";
      return { ok: false, reason: m };
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: "Could not reach the server." };
  }
}

export async function verifyCode(email: string, code: string): Promise<Outcome & { auth?: Auth }> {
  const client = authClient();
  if (!client) return { ok: false, reason: "Accounts are not set up on this deployment." };
  const token = cleanCode(code);
  if (token.length !== 6) return { ok: false, reason: "The code is six digits." };
  try {
    const { data, error } = await client.auth.verifyOtp({
      email: normaliseEmail(email),
      token,
      type: "email",
    });
    if (error || !data.session) {
      return {
        ok: false,
        reason: /expired/i.test(error?.message || "")
          ? "That code has expired. Send a new one."
          : "That code did not match.",
      };
    }
    return {
      ok: true,
      auth: {
        token: data.session.access_token,
        userId: data.session.user.id,
        email: data.session.user.email ?? undefined,
      },
    };
  } catch {
    return { ok: false, reason: "Could not reach the server." };
  }
}

/**
 * The session as it stands, refreshing it if the stored one has expired.
 * Called before every request that needs identity rather than cached once,
 * because an access token lives about an hour and a tab left open overnight
 * would otherwise start silently saving nothing.
 */
export async function currentAuth(): Promise<Auth | null> {
  const client = authClient();
  if (!client) return null;
  try {
    const { data } = await client.auth.getSession();
    const s = data.session;
    if (!s?.access_token || !s.user?.id) return null;
    return { token: s.access_token, userId: s.user.id, email: s.user.email ?? undefined };
  } catch {
    return null;
  }
}

/**
 * Picks up the session from a clicked magic link, which arrives as a fragment
 * on the URL. detectSessionInUrl does the work; this exists to clean the
 * fragment off afterwards, because a URL carrying an access token should not
 * be what the person copies out of the address bar to show somebody the sky.
 */
export async function restoreFromLink(): Promise<Auth | null> {
  const auth = await currentAuth();
  try {
    if (typeof window !== "undefined" && /access_token=|type=magiclink|code=/.test(window.location.hash + window.location.search)) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  } catch {}
  return auth;
}

export async function signOut(): Promise<void> {
  try { await authClient()?.auth.signOut(); } catch {}
}

/** Fires on sign-in, sign-out and token refresh. Returns an unsubscribe. */
export function onAuthChange(cb: (auth: Auth | null) => void): () => void {
  const client = authClient();
  if (!client) return () => {};
  const { data } = client.auth.onAuthStateChange((_e, session) => {
    cb(
      session?.access_token && session.user?.id
        ? { token: session.access_token, userId: session.user.id, email: session.user.email ?? undefined }
        : null
    );
  });
  return () => { try { data.subscription.unsubscribe(); } catch {} };
}
