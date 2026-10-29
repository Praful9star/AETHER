-- The table was never reachable by the application. Not once.
--
-- Found by inspecting the live database rather than the repository, which is
-- the only reason it was found at all: `whispers` held ZERO rows, and every
-- /api/save had been failing silently since the table was created, because
-- that route catches its own errors and answers {ok:false} so a thought is
-- never lost to a 500. The quiet failure was the feature working as designed;
-- nobody noticed the thing it was quietly reporting.
--
-- WHAT WAS ACTUALLY WRONG
--
--   role           select  insert  bypassrls
--   anon           false   false   false
--   authenticated  false   false   false
--   service_role   false   false   TRUE
--   postgres       true    true    true
--
-- `service_role` has BYPASSRLS, and BYPASSRLS is not a privilege. It lets a
-- role past row-level security once it is already allowed to touch the table;
-- it does not grant SELECT or INSERT. With no grant, RLS never even gets a
-- say — Postgres refuses at the privilege check first.
--
-- This project does not have Supabase's default grants on the public schema:
-- its other tables were each granted by hand (`feedback`, which works, has
-- INSERT for anon and SELECT for authenticated). `whispers` was created
-- without that step and nothing since has supplied it.
--
-- AND 002 WOULD NOT HAVE FIXED IT
--
-- 002 revokes the table from anon and authenticated and leaves service_role
-- alone, because it assumed service_role already held the grants every other
-- Supabase project hands out by default. Here it never did, so 002 would have
-- locked the table down to exactly nobody and looked correct doing it. That
-- assumption is the bug, and this migration is the correction: 002 was never
-- applied, and this supersedes it.
--
-- Its warning does not carry over either. 002 said to set the service-role
-- key and redeploy BEFORE applying, or share pages would stop resolving.
-- Share pages do not resolve today — there are no rows and no read access —
-- so this cannot take away anything that currently works. It can only add.
--
-- STILL REQUIRED AFTERWARDS
--
-- SUPABASE_SERVICE_ROLE_KEY in the deployment, then a redeploy. Without it
-- lib/supabase.ts falls back to the anon key, which this migration
-- deliberately leaves with no access at all, so saving stays broken. The
-- database being correct is necessary and not sufficient.

-- The whole design is that every read and write happens on the server with
-- the service-role key, which never reaches the browser. So that role, and
-- only that role, gets access.
grant select, insert, update, delete on table whispers to service_role;

-- Explicit and idempotent rather than assumed. The anon key is public — it is
-- compiled into the client bundle — so anybody who opens the site holds it,
-- and it must never be able to reach a table of other people's private
-- thoughts. Re-revoking what is already absent costs nothing and means a
-- future `grant ... to anon` added by mistake has to survive this file.
revoke all on table whispers from anon, authenticated;

alter table whispers enable row level security;

-- 001's two surviving policies, dropped. Both are over-permissive and neither
-- is load-bearing now that access is server-side only:
--
--   "Public read"  using (public = true)   — every row is written public=false,
--                                            so this grants nothing today and
--                                            would quietly open the table the
--                                            first time anything set it true.
--   "Insert own"   with check (true)       — any holder of a grant could write
--                                            rows under any user_id and mark
--                                            them public.
--
-- With RLS on and no policies at all, anon and authenticated are denied every
-- row even if someone later grants them a privilege. service_role is past RLS
-- by BYPASSRLS, so the server keeps working.
drop policy if exists "Public read" on whispers;
drop policy if exists "Own read"    on whispers;
drop policy if exists "Insert own"  on whispers;

-- Share links are opened one row at a time by id; /api/stars filters by owner
-- and orders by recency. Both are sequential scans without this.
create index if not exists whispers_user_created_idx
  on whispers (user_id, created_at desc);
