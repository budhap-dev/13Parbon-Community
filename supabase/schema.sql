create schema if not exists portal;

-- 13Parbon Community: tables the public website writes to.
--
-- Everything this app owns lives in the `portal` schema, not in `public`. The Supabase project
-- is shared with the committee's event planner, which already has tables called `people`,
-- `events`, `diary`, `diary_log` and `history` — and `create table if not exists public.people`
-- would have quietly done nothing, then switched row level security on for the planner's table
-- and left it unreadable. A schema of our own makes that impossible rather than careful.
--
-- Supabase needs `portal` added under Settings → API → Exposed schemas before the browser can
-- reach any of it.
--
-- Membership is by invitation, so there is no application table: an admin adds a
-- household and the member signs in with Google. That comes with the portal.
-- Run this once in the Supabase SQL editor (Database → SQL Editor → New query).
--
-- The table is insert-only for anonymous visitors: the website can add a row, but
-- nobody can read, change or delete rows without a service key. The committee reads
-- them in the Supabase table editor until the admin portal exists.

create table if not exists portal.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  email text not null check (email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  subject text not null check (char_length(trim(subject)) between 1 and 200),
  message text not null check (char_length(trim(message)) between 10 and 5000),
  handled_by text,
  created_at timestamptz not null default now()
);


alter table portal.contact_messages enable row level security;

-- Anyone may submit. Nobody may read back through the public API.
drop policy if exists "anyone can submit a contact message" on portal.contact_messages;
create policy "anyone can submit a contact message"
  on portal.contact_messages for insert to anon, authenticated with check (true);


create index if not exists contact_messages_created_at_idx on portal.contact_messages (created_at desc);
