-- 13Parbon Community: the two tables the public website writes to.
--
-- Membership is by invitation, so there is no application table: an admin adds a
-- household and the member signs in with Google. That comes with the portal.
-- Run this once in the Supabase SQL editor (Database → SQL Editor → New query).
--
-- Both are insert-only for anonymous visitors: the website can add a row, but nobody can
-- read, change or delete rows without a service key. The committee reads them in the
-- Supabase table editor until the admin portal exists.
--
-- Registering does not require an account. Most people who come to a programme are not
-- members, and asking them to sign in first would lose the headcount this exists to get.

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  email text not null check (email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  subject text not null check (char_length(trim(subject)) between 1 and 200),
  message text not null check (char_length(trim(message)) between 10 and 5000),
  handled_by text,
  created_at timestamptz not null default now()
);


alter table public.contact_messages enable row level security;

-- Anyone may submit. Nobody may read back through the public API.
drop policy if exists "anyone can submit a contact message" on public.contact_messages;
create policy "anyone can submit a contact message"
  on public.contact_messages for insert to anon, authenticated with check (true);


create index if not exists contact_messages_created_at_idx on public.contact_messages (created_at desc);


-- Anybody coming to an event, member or not. `event_slug` rather than a foreign key,
-- because events still live in the code; that becomes a reference when they move here.
create table if not exists public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_slug text not null check (char_length(trim(event_slug)) between 1 and 200),
  household_name text not null check (char_length(trim(household_name)) between 2 and 120),
  email text not null check (email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  phone text,
  adults smallint not null check (adults between 1 and 30),
  children smallint not null default 0 check (children between 0 and 30),
  helping text,
  notes text,
  registered_at timestamptz not null default now()
);

alter table public.event_registrations enable row level security;

-- Anyone may register. Nobody may read the list back through the public API: it is a list
-- of who will be out of their house on a given evening.
drop policy if exists "anyone can register for an event" on public.event_registrations;
create policy "anyone can register for an event"
  on public.event_registrations for insert to anon, authenticated with check (true);

create index if not exists event_registrations_event_idx
  on public.event_registrations (event_slug, registered_at desc);
