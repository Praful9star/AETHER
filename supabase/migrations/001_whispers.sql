create table if not exists whispers (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  thought text,
  whisper text not null,
  palette jsonb not null,
  form text not null,
  energy real not null,
  pos jsonb,
  public boolean default false,
  created_at timestamptz default now()
);

alter table whispers enable row level security;

-- Anyone can read public whispers
create policy "Public read"
  on whispers for select
  using (public = true);

-- Users can read their own whispers
create policy "Own read"
  on whispers for select
  using (user_id = current_setting('request.jwt.claims', true)::jsonb->>'sub'
         or user_id = coalesce(nullif(current_setting('request.headers', true)::jsonb->>'x-user-id', ''), 'anon'));

-- Only the anon key can insert (service-side)
create policy "Insert own"
  on whispers for insert
  with check (true);
