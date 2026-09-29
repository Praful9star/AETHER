-- 001 turned RLS on but then wrote a read policy that defeated it.
--
--   using (... or user_id = coalesce(
--            nullif(current_setting('request.headers', true)::jsonb->>'x-user-id',''),
--            'anon'))
--
-- Nothing in the app ever sends an x-user-id header, so that setting is always
-- null, the coalesce always yields 'anon', and the clause reduces to
-- `user_id = 'anon'`. Every row we have ever written carries exactly that,
-- because /api/save defaults user_id to 'anon' and the client has never sent
-- one. So the policy granted the anon role read access to the whole table —
-- and the anon key is public: it is compiled into the browser bundle.
--
-- `with check (true)` on insert was the same shape of mistake in the other
-- direction: any holder of that key could write rows under any user_id, and
-- mark them public.
--
-- Every read and write of this table happens on the server (the share page,
-- the OG image, /api/save, /api/stars), so the table does not need to be
-- reachable with the anon key at all. Revoke it, and let the server use the
-- service-role key, which bypasses RLS and never leaves the server.
--
-- Requires SUPABASE_SERVICE_ROLE_KEY in the deployment environment. Without
-- it the app falls back to the anon key (see lib/supabase.ts) and, once this
-- migration is applied, share pages will stop resolving — so set the variable
-- and redeploy BEFORE running this. Vercel resolves env vars at build time.

drop policy if exists "Public read" on whispers;
drop policy if exists "Own read"    on whispers;
drop policy if exists "Insert own"  on whispers;

alter table whispers enable row level security;

-- Belt and braces: with no policies, RLS already denies every row to the
-- anon and authenticated roles, but revoking the grants means a future policy
-- added by mistake cannot quietly re-open the table either.
revoke all on table whispers from anon, authenticated;

-- Share links are opened by id, one at a time, and /api/stars filters by
-- owner. Both are seq scans today.
create index if not exists whispers_user_created_idx
  on whispers (user_id, created_at desc);
