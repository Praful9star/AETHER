# Accounts

Why Aether now asks for an email, what it does with it, and the one piece of
setup that is not in this repository.

## The gap this closes

Aether had no accounts, and two of the honest gaps in the project brief were
consequences of that rather than separate problems:

- **The stored copy was write-only.** `/api/save` defaulted `user_id` to the
  string `'anon'` because the client never sent one, and `/api/stars` rejects
  that placeholder — so every thought anybody had ever written was in the
  database and nothing could read it back.
- **Your sky was one browser's sky.** It lived in `localStorage`. A new phone
  started empty, and clearing site data was deletion with no undo.

## Why an emailed code

Not a password: a password is a thing to store, leak and reset, and we would
be asking somebody to invent one in order to write down a thought at 1am.

Not primarily a magic link, which is the usual answer: a link opens a new
tab. Aether is a galaxy you are standing inside with a thought half-typed, and
a new tab throws that away in order to prove who you are. Six digits are
typed where you already are and the sky never moves. The link still works if
somebody clicks it — `restoreFromLink` picks the session up off the URL and
then strips the token out of the address bar — it is just not the path the UI
is designed around.

Not Google. One tap, but it hands Google the fact that this person uses a
product for writing down thoughts they would not say out loud. That is a
strange thing to broker on somebody's behalf in exchange for a convenience.

## How identity travels

```
browser                         server
───────                         ──────
auth with the anon key   ──▶    Supabase Auth  ──▶  JWT
                                                     │
POST /api/save                                       │
  Authorization: Bearer <JWT>  ──▶  callerFrom(req) ─┘
                                      auth.getUser(token)
                                      ⇒ uuid, or null
```

Three rules hold this together.

**Identity never comes from the request body.** `/api/save` used to read
`user_id` out of the JSON it was posted. That was harmless only while there
were no accounts; with real identities, anyone could write rows into anyone
else's sky by typing their uuid into a POST. The body is attacker-controlled;
a signed token is not.

**`/api/stars` no longer takes `?user_id=`.** Same reasoning in the other
direction: that parameter was safe only because it was useless, and the moment
rows carry real uuids it becomes an endpoint that hands over anybody's
thoughts to anybody holding their id — and a uuid is not a secret. It travels
in share links and logs. The owner is read from the token.

> Removing that parameter made Next.js treat the route as **static** and
> prerender a single empty array for everybody, which the build output shows
> as `○` instead of `ƒ`. Hence `export const dynamic = "force-dynamic"`.

**The anon key does not re-open the table.** Auth legitimately uses the public
anon key — that is what it is for, and it is what mints the user's JWT.
Migration 002 revokes the `whispers` table from both `anon` and
`authenticated`, so the table is still only reachable server-side with the
service-role key. The JWT is proof of identity, not a database grant.

## Failure is anonymous, not fatal

`callerFrom` returns `null` for every failure identically: no header, a
malformed one, an expired session, a token from another project, Supabase
unreachable. Callers treat `null` as "not signed in", which degrades to
exactly the behaviour the app had before accounts existed.

One consequence is deliberate: if Supabase is down, a signed-in person's
thought is saved anonymously rather than refused. For a product whose job is
to accept a thought at 1am, losing the association is better than losing the
thought.

## Merging two skies

Signing in produces a second copy of the sky, and the two overlap — the
stored rows include everything written on this device while signed in. A
concatenation would double every one of them.

`mergeStars` dedupes on the normalised thought and whisper text, and **local
wins**. That direction matters: a local star carries the `answer` and the
exchange `turns` that pull it closer, and `recedeRadius` reads both. The
stored row is a snapshot taken when the thought was made, before any of that
happened. Preferring the remote copy would quietly discard the record of
which thoughts somebody returned to, which is the most meaningful thing the
sky knows.

Stored rows have uuid ids, but the sky's ids are the millisecond a thought was
made — `recedeRadius` reads the id *as a time* to decide how far away a star
sits — so a row's `created_at` becomes its id on the way in.

It returns the local array unchanged when there is nothing new, so the caller
can compare by reference and skip a geometry rebuild of every star.

## Setup — the part that is not in this repository

Supabase's default email for this flow contains **only the link, not the
code**. The template has to be edited once:

> Authentication → Emails → Magic Link → include `{{ .Token }}`

Until that is done the email arrives with a working link and no digits, and
the UI sits waiting for a code that is not in the message. The sign-in panel
says so in a line at the bottom — "No code in the email, only a link? Click
the link — it signs you in too" — which is the only honest signal we have for
this, since nothing on our side can observe the template.

Also still outstanding, and unchanged by this work:

- `SUPABASE_SERVICE_ROLE_KEY` in the Vercel environment, then a redeploy,
  **before** applying migration 002. Vercel resolves env vars at build time,
  and applying 002 first would stop share pages resolving.
- Migration 002 itself is written but not applied.

## What this still does not do

- **Deleting a thought locally does not delete the shared copy.** A `/w/[id]`
  link outlives deletion in the sky. This is now worse than before, not
  better: there is an account to attach a delete to, so the excuse is gone.
- **No account deletion.** Signing in creates a row we have no UI to remove.
  Required before launch, and before any GDPR-shaped claim.
- **No email change, and no export.**
- Rate limiting is Supabase's default. We surface it ("wait a minute") rather
  than managing it.
