-- 13Parbon Community: the portal tables.
--
-- Run this AFTER schema.sql, once, in the Supabase SQL editor.
--
-- Everything is in the `portal` schema rather than `public`, because this project is shared
-- with the committee's event planner and that already owns a `people` table. See schema.sql. Then run verify.sql, which
-- proves the rules below actually hold rather than merely having been typed.
--
-- The guards in React decide what to draw. These decide what anybody can actually read and
-- write, and they are the only ones that count: everything in the browser is advisory,
-- because anyone can run their own JavaScript against the same anon key.
--
-- Everything assumes Google is the only sign-in and membership is by invitation. A row in
-- `households` carrying a `google_email` is the only thing that lets somebody in.
--
-- Three rules are worth reading twice, because they are the ones that would hurt:
--   1. A child's name never leaves their own household. `people` is readable only by the
--      household itself, and no other member can reach it at all.
--   2. A member cannot make themselves an admin. A trigger rejects it rather than a policy,
--      because row level security sees rows, not which column changed.
--   3. `anon` reaches none of this. Only a signed-in account matched to a household does.
--
-- This is a first-run script, not a migration. Every `create table if not exists` is a no-op
-- against a table that is already there, so changing a column here and re-running changes
-- nothing and says nothing. Once this has been run against the live project, later changes
-- are `alter table` written by hand.
--
-- Order matters here. Tables come before the functions that query them: a `language sql`
-- function has its body parsed at creation, so one written first would fail on a table that
-- does not exist yet.


-- ===========================================================================
-- 1. Tables
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Households
-- ---------------------------------------------------------------------------

create table if not exists portal.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  contact_name text not null check (char_length(trim(contact_name)) between 2 and 120),
  -- Nullable on purpose. A required field the committee cannot always fill is a field
  -- somebody types unknown@example.com into, and then this holds a fact that is not true.
  -- Recording what is known beats inventing what is not. Wrong is still refused: an address
  -- that is there has to look like one.
  email text check (email is null or email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  phone text,
  -- The address they use with Google. Null while invited but never signed in.
  -- Lowercased on write so a capital letter cannot lock somebody out.
  --
  -- Matching on the address rather than on auth.users.id is deliberate: the committee records
  -- an address before that person has ever signed in, so there is no user id to record yet.
  -- The cost is that a changed Google address needs the committee to change it here too,
  -- which for fifty households is a smaller problem than a linking step that can go wrong.
  google_email text check (google_email is null or google_email = lower(google_email)),
  interests text[] not null default '{}',
  member_since date not null default current_date,
  membership_status text not null default 'active' check (membership_status in ('active', 'lapsed')),
  membership_paid_to date,
  role text not null default 'member' check (role in ('member', 'admin')),
  -- Three separate choices, because agreeing to be listed is not agreeing to share a phone number.
  created_at timestamptz not null default now()
);

-- Partial, so any number of households may be invited with no address yet while no two
-- share one. A plain unique constraint would allow only a single null in some engines;
-- Postgres permits many, but saying it this way makes the intent explicit and indexes the
-- lookup that every policy below depends on.
create unique index if not exists households_google_email_idx
  on portal.households (google_email) where google_email is not null;


-- ---------------------------------------------------------------------------
-- People in a household
-- ---------------------------------------------------------------------------
-- Never readable by another member. A child's name stays inside their own household.

create table if not exists portal.people (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references portal.households (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  age_group text not null check (age_group in ('adult', 'child')),
  age smallint check (age is null or age between 0 and 120),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists people_household_idx on portal.people (household_id);


-- ---------------------------------------------------------------------------
-- Documents
-- ---------------------------------------------------------------------------

create table if not exists portal.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 2 and 200),
  category text not null check (category in ('minutes', 'guidelines', 'resources')),
  file_url text not null,
  added_on date not null default current_date
);


-- ---------------------------------------------------------------------------
-- Google accounts that matched no household
-- ---------------------------------------------------------------------------
-- Without an application form, this is how the committee learns somebody is knocking.

create table if not exists portal.sign_in_attempts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  attempts integer not null default 1,
  first_tried_at timestamptz not null default now(),
  last_tried_at timestamptz not null default now(),
  resolved boolean not null default false
);


-- ===========================================================================
-- 2. Who is asking
-- ===========================================================================
-- These read `households` and are used in policies ON `households`, so they must be
-- SECURITY DEFINER: a policy that queried the table under its own rules would recurse.
--
-- `set search_path = ''` on every one of them, with every name written out in full. A
-- SECURITY DEFINER function runs with the owner's rights, so a search path it does not
-- control is a way to hand those rights to something else's table.

create or replace function portal.auth_email()
  returns text
  language sql
  stable
  -- Deliberately NOT security definer: it reads the caller's own token and nothing else.
  set search_path = ''
as $$
  -- auth.jwt() rather than current_setting('request.jwt.claims', true)::jsonb, which throws
  -- on an empty string — and an empty string is exactly what an unauthenticated request
  -- leaves behind. Supabase's helper already folds that case to null.
  select lower(nullif(auth.jwt() ->> 'email', ''));
$$;

comment on function portal.auth_email() is
  'The signed-in account''s email, lowercased. Null when nobody is signed in.';

create or replace function portal.current_household_id()
  returns uuid
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select h.id from portal.households h
    where h.google_email is not null
      and h.google_email = portal.auth_email()
    limit 1;
$$;

comment on function portal.current_household_id() is
  'The household this account belongs to, or null. Null means signed in but not a member.';

create or replace function portal.is_admin()
  returns boolean
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select coalesce(
    (select h.role = 'admin' from portal.households h
       where h.google_email is not null
         and h.google_email = portal.auth_email()
       limit 1),
    false
  );
$$;

comment on function portal.is_admin() is 'Whether this account acts for the committee.';

-- A stranger cannot usefully call these — each only reports on the caller's own token — but
-- there is no reason for an unauthenticated request to reach them at all.
revoke all on function portal.auth_email() from public, anon;
revoke all on function portal.current_household_id() from public, anon;
revoke all on function portal.is_admin() from public, anon;
grant execute on function portal.auth_email() to authenticated, service_role;
grant execute on function portal.current_household_id() to authenticated, service_role;
grant execute on function portal.is_admin() to authenticated, service_role;


-- ===========================================================================
-- 3. Grants, then row level security
-- ===========================================================================
-- Grants and policies are two different gates and a row has to pass both. Supabase sets
-- default privileges that usually cover this, but a table that never received them fails
-- closed no matter how carefully its policies are written — and that failure looks exactly
-- like a policy bug, which is a bad afternoon. So say it out loud.

-- Reaching anything in a schema needs usage on the schema itself, before any table grant is
-- even looked at. Miss this and every query fails as though the tables were not there.
grant usage on schema portal to authenticated, anon, service_role;

grant select, insert, update, delete
  on portal.households, portal.people, portal.documents, portal.sign_in_attempts
  to authenticated;

-- Nothing in the portal is public. The contact form in schema.sql is the only thing an
-- unauthenticated visitor may write to, and it is insert-only.
revoke all
  on portal.households, portal.people, portal.documents, portal.sign_in_attempts
  from anon;

alter table portal.households enable row level security;
alter table portal.people enable row level security;
alter table portal.documents enable row level security;
alter table portal.sign_in_attempts enable row level security;


-- ---------------------------------------------------------------------------
-- Households
-- ---------------------------------------------------------------------------

drop policy if exists "read own household" on portal.households;
create policy "read own household"
  on portal.households for select to authenticated
  using (id = portal.current_household_id() or portal.is_admin());

drop policy if exists "update own household" on portal.households;
create policy "update own household"
  on portal.households for update to authenticated
  using (id = portal.current_household_id() or portal.is_admin())
  with check (id = portal.current_household_id() or portal.is_admin());

-- Only the committee adds or removes a household. This is the whole invitation model.
drop policy if exists "admins add households" on portal.households;
create policy "admins add households"
  on portal.households for insert to authenticated
  with check (portal.is_admin());

drop policy if exists "admins remove households" on portal.households;
create policy "admins remove households"
  on portal.households for delete to authenticated
  using (portal.is_admin());


-- ---------------------------------------------------------------------------
-- People and documents
-- ---------------------------------------------------------------------------
-- One policy each rather than a select policy and an all policy side by side: policies are
-- OR'd together, so two that say almost the same thing is two places to get it wrong.
--
-- `with check` is what stops a member moving a person into somebody else's household; `using`
-- is what stops them reaching one that is already there.

drop policy if exists "own people only" on portal.people;
drop policy if exists "manage own people" on portal.people;
create policy "own people only"
  on portal.people for all to authenticated
  using (household_id = portal.current_household_id() or portal.is_admin())
  with check (household_id = portal.current_household_id() or portal.is_admin());

drop policy if exists "members read documents" on portal.documents;
create policy "members read documents"
  on portal.documents for select to authenticated
  using (portal.current_household_id() is not null);

drop policy if exists "admins manage documents" on portal.documents;
create policy "admins manage documents"
  on portal.documents for all to authenticated
  using (portal.is_admin()) with check (portal.is_admin());


-- ---------------------------------------------------------------------------
-- Sign-in attempts
-- ---------------------------------------------------------------------------
-- Written by a trigger running as owner, which is why there is no insert policy: nothing
-- reaching this table through the API may add to it.

drop policy if exists "admins read sign-in attempts" on portal.sign_in_attempts;
create policy "admins read sign-in attempts"
  on portal.sign_in_attempts for select to authenticated using (portal.is_admin());

drop policy if exists "admins resolve sign-in attempts" on portal.sign_in_attempts;
create policy "admins resolve sign-in attempts"
  on portal.sign_in_attempts for update to authenticated
  using (portal.is_admin()) with check (portal.is_admin());


-- ---------------------------------------------------------------------------
-- What the committee writes: news, notices and newsletters
-- ---------------------------------------------------------------------------
-- Public content, so the read policies are the unusual ones here: a visitor with no session has
-- to see what has been published, and only that. Drafts and notices that have expired or have
-- not started are the committee's business, and RLS is what keeps them so — not the query the
-- browser happens to send.

create table if not exists portal.news_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null check (char_length(trim(title)) between 1 and 200),
  excerpt text not null,
  body text not null,
  tags text[] not null default '{}'::text[],
  author text not null,
  -- When it first went up. Null means it has never been published: a draft.
  --
  -- Kept when a piece is taken down rather than cleared, because clearing it loses the only
  -- record of when the piece belongs to — a round-up of April that came down for a week would
  -- come back dated today and sit at the top of the list as though it were new.
  published_at timestamptz,
  -- Taken down, but still written, so it can go back up and so there is an answer to who took
  -- it down and when.
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists news_posts_published_idx on portal.news_posts (published_at desc);

alter table portal.news_posts enable row level security;

grant select on portal.news_posts to anon, authenticated;
grant insert, update on portal.news_posts to authenticated;

-- Two select policies, which RLS ORs together: everybody sees what is up, and the committee
-- sees everything. Written as two rather than one `or` so that removing the second cannot
-- quietly take the public site down with it.
drop policy if exists "anybody reads a published post" on portal.news_posts;
create policy "anybody reads a published post"
  on portal.news_posts for select to anon, authenticated
  using (published_at is not null and not hidden);

drop policy if exists "admins read every post" on portal.news_posts;
create policy "admins read every post"
  on portal.news_posts for select to authenticated using (portal.is_admin());

drop policy if exists "admins write posts" on portal.news_posts;
create policy "admins write posts"
  on portal.news_posts for insert to authenticated with check (portal.is_admin());

drop policy if exists "admins edit posts" on portal.news_posts;
create policy "admins edit posts"
  on portal.news_posts for update to authenticated
  using (portal.is_admin()) with check (portal.is_admin());


-- A notice on a noticeboard: short, dated, and gone once it stops being true.
create table if not exists portal.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 200),
  -- The app refuses an essay at 500 characters, because the story is firm that this does not
  -- compete with WhatsApp for attention. Said here too, so nothing else can fill it with one.
  body text not null check (char_length(trim(body)) between 1 and 500),
  pinned boolean not null default false,
  -- 'public' or 'members', and no third option: a notice is a thing on a noticeboard, and there
  -- is no such thing as an announcement only the committee can read. The home page has sections
  -- that can be committee-only while something is got ready; this is not one of them.
  audience text not null default 'public' check (audience in ('public', 'members')),
  publish_at timestamptz not null default now(),
  expires_at timestamptz,
  link_label text,
  link_to text,
  created_at timestamptz not null default now()
);

alter table portal.announcements enable row level security;

grant select on portal.announcements to anon, authenticated;
grant insert, update, delete on portal.announcements to authenticated;

drop policy if exists "anybody reads a live public notice" on portal.announcements;
create policy "anybody reads a live public notice"
  on portal.announcements for select to anon, authenticated
  using (
    audience = 'public'
    and publish_at <= now()
    and (expires_at is null or expires_at > now())
  );

drop policy if exists "admins read every notice" on portal.announcements;
create policy "admins read every notice"
  on portal.announcements for select to authenticated using (portal.is_admin());

drop policy if exists "admins post notices" on portal.announcements;
create policy "admins post notices"
  on portal.announcements for insert to authenticated with check (portal.is_admin());

drop policy if exists "admins edit notices" on portal.announcements;
create policy "admins edit notices"
  on portal.announcements for update to authenticated
  using (portal.is_admin()) with check (portal.is_admin());

-- Really gone, unlike a post. A notice has no version worth keeping once it stops being true.
drop policy if exists "admins take notices down" on portal.announcements;
create policy "admins take notices down"
  on portal.announcements for delete to authenticated using (portal.is_admin());


create table if not exists portal.newsletters (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  file_url text not null,
  issued_on date not null,
  created_at timestamptz not null default now()
);

alter table portal.newsletters enable row level security;

grant select on portal.newsletters to anon, authenticated;
grant insert, update, delete on portal.newsletters to authenticated;

drop policy if exists "anybody reads the newsletters" on portal.newsletters;
create policy "anybody reads the newsletters"
  on portal.newsletters for select to anon, authenticated using (true);

drop policy if exists "admins manage the newsletters" on portal.newsletters;
create policy "admins manage the newsletters"
  on portal.newsletters for all to authenticated
  using (portal.is_admin()) with check (portal.is_admin());


-- ---------------------------------------------------------------------------
-- The site's own switches
-- ---------------------------------------------------------------------------
-- What the committee can change about the public site without a developer: which sections are
-- on, the words on the public pages, who is on the committee this year, and the members' roll.
-- These lived in src/app/site.ts, where turning the news section on was a pull request.
--
-- One row, enforced by the primary key: `id` may only ever be true, so there is exactly one set
-- of settings and no question about which of two rows is live.
--
-- One jsonb column rather than a column per switch. The shape belongs to the app, which lays
-- the stored object over its own defaults key by key and drops anything it does not recognise —
-- so a switch renamed in the code cannot leave a stale value driving the live site. A column
-- per switch would mean a migration every time the committee wants a new toggle, which is the
-- developer this table exists to remove.
create table if not exists portal.site_settings (
  id boolean primary key default true check (id),
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table portal.site_settings enable row level security;

-- Readable by everybody, including a visitor who is not signed in, because the public site asks
-- this table whether the gallery and the news pages exist at all. Nothing in here is private:
-- the switches, the words already printed on the pages, and the same names the About page has
-- always carried in public.
grant select on portal.site_settings to anon, authenticated;
grant insert, update on portal.site_settings to authenticated;

drop policy if exists "anybody may read the site settings" on portal.site_settings;
create policy "anybody may read the site settings"
  on portal.site_settings for select to anon, authenticated using (true);

drop policy if exists "admins change the site settings" on portal.site_settings;
create policy "admins change the site settings"
  on portal.site_settings for insert to authenticated with check (portal.is_admin());

drop policy if exists "admins save the site settings" on portal.site_settings;
create policy "admins save the site settings"
  on portal.site_settings for update to authenticated
  using (portal.is_admin()) with check (portal.is_admin());


-- ---------------------------------------------------------------------------
-- The committee's inbox
-- ---------------------------------------------------------------------------
-- schema.sql makes contact_messages insert-only so the public website can post to it and
-- nobody can read it back. The committee has been reading it in the Supabase table editor.
-- Now that there are admins, they can read it in their own back office.

-- schema.sql built this table before there was an inbox screen to read it, so it records
-- neither what a message is about nor what was done about it. The columns are added here
-- rather than there because `create table if not exists` does nothing to a table that
-- already exists, and this file is the one that gets re-run.
alter table portal.contact_messages
  add column if not exists kind text not null default 'general',
  add column if not exists handled_note text;

alter table portal.contact_messages drop constraint if exists contact_messages_kind_check;
alter table portal.contact_messages
  add constraint contact_messages_kind_check check (kind in ('general', 'photo'));

-- The one promise on this site with a person waiting behind it, enforced where it cannot be
-- argued with. A takedown cannot be marked dealt with unless somebody wrote down what happened
-- to the photograph: "handled" on its own does not say whether the picture left the bucket.
alter table portal.contact_messages drop constraint if exists contact_messages_takedown_note_check;
alter table portal.contact_messages
  add constraint contact_messages_takedown_note_check
  check (handled_by is null or kind <> 'photo' or coalesce(trim(handled_note), '') <> '');

grant select, update, delete on portal.contact_messages to authenticated;

-- And the visitor keeps the one thing they had: schema.sql relies on Supabase's default
-- privileges for this, which is the fragility described above. Said out loud, the public
-- website cannot lose its only way of reaching the committee to a settings change.
--
-- Named columns rather than the whole table. With a blanket grant, and an insert policy that
-- has to stay `with check (true)` because a visitor is anonymous by definition, nothing stopped
-- a stranger posting a message with `handled_by` already filled in — which is a message that
-- arrives in the inbox looking like one the committee had dealt with, and is never read.
revoke insert on portal.contact_messages from anon;
grant insert (name, email, subject, message, kind) on portal.contact_messages to anon;

drop policy if exists "admins read contact messages" on portal.contact_messages;
create policy "admins read contact messages"
  on portal.contact_messages for select to authenticated using (portal.is_admin());

drop policy if exists "admins handle contact messages" on portal.contact_messages;
create policy "admins handle contact messages"
  on portal.contact_messages for update to authenticated
  using (portal.is_admin()) with check (portal.is_admin());

-- Really gone, and the trail is the only thing left of it. A message is the sole record of
-- something somebody asked for, so the row that says who deleted it and when is not a nicety:
-- the trigger below is attached for delete as well as update for exactly this.
drop policy if exists "admins delete contact messages" on portal.contact_messages;
create policy "admins delete contact messages"
  on portal.contact_messages for delete to authenticated using (portal.is_admin());


-- ===========================================================================
-- 4. What a member may not change about themselves
-- ===========================================================================
-- Row level security decides which rows, never which columns. So a member editing their own
-- household passes the policy and then meets this: they may not promote themselves, change
-- the address that signs them in, or mark their own subscription paid.

create or replace function portal.households_guard_protected_columns()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
begin
  -- No signed-in account means this is not a request through the API: the SQL editor, a
  -- migration, or a server-side key. Reaching this row at all already required passing the
  -- policies above, so let it through rather than locking the committee out of their own
  -- database.
  if portal.auth_email() is null or portal.is_admin() then
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'Only the committee can change a role.' using errcode = '42501';
  end if;
  if new.google_email is distinct from old.google_email then
    raise exception 'Only the committee can change the sign-in address.' using errcode = '42501';
  end if;
  if new.membership_status is distinct from old.membership_status
     or new.membership_paid_to is distinct from old.membership_paid_to
     or new.member_since is distinct from old.member_since then
    raise exception 'Only the committee can change membership.' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists households_guard_protected_columns on portal.households;
create trigger households_guard_protected_columns
  before update on portal.households
  for each row execute function portal.households_guard_protected_columns();


-- ---------------------------------------------------------------------------
-- The committee may not lock itself out
-- ---------------------------------------------------------------------------
-- Demoting the last admin, or deleting their household, leaves a site nobody can administer.
-- There is no way back from it through the app: promoting somebody is an admin-only action, so
-- the last person out takes the key with them and the only door left is the SQL editor.
--
-- The app has refused this for a while and so has the button, and neither is a guarantee — a
-- browser is not the thing deciding. Said here, where it cannot be got around.
--
-- Deliberately *not* the app's other rule. The screen also refuses to let an admin demote
-- themselves while other admins exist, which is a courtesy — a second pair of hands does the
-- demoting, and somebody who has resigned is not stuck. There is nothing irrecoverable about
-- it, so it stays a courtesy rather than becoming something the committee cannot undo.
create or replace function portal.guard_last_admin()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  losing_the_role boolean;
begin
  losing_the_role := tg_op = 'DELETE' or new.role is distinct from 'admin';

  if old.role = 'admin' and losing_the_role then
    -- Counted excluding this row, so it answers "would any be left?" rather than "are there
    -- any now?". `for update` because two admins resigning at once would otherwise each see
    -- the other and both succeed.
    if not exists (
      select 1 from portal.households
       where role = 'admin' and id <> old.id
       for update
    ) then
      -- Its own SQLSTATE, from an unassigned class, rather than 42501. A refusal by a policy
      -- says nothing worth showing a person and the adapter replaces it with a sentence of its
      -- own; this one already is that sentence, and the code is how the adapter tells them
      -- apart. All three layers then refuse in the same words.
      raise exception 'That is the last admin. Make somebody else one first.'
        using errcode = '45001';
    end if;
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

comment on function portal.guard_last_admin() is
  'Refuses the change that would leave the site with no administrator at all.';

drop trigger if exists guard_last_admin on portal.households;
create trigger guard_last_admin
  before update or delete on portal.households
  for each row execute function portal.guard_last_admin();


-- ===========================================================================
-- 5. The directory — removed
-- ===========================================================================
-- There was a `portal.directory` view here: households that had opted in, with only the
-- columns each agreed to share. The committee decided against having one at all, so the view
-- and the three columns that fed it are dropped rather than left behind switched off. A column
-- nothing reads is a column somebody later assumes means something.
--
-- Written as drops rather than simply deleted from this file, because this file is re-run
-- against a database that already has them.

drop view if exists portal.directory;

alter table portal.households
  drop column if exists listed_in_directory,
  drop column if exists share_email,
  drop column if exists share_phone;


-- ===========================================================================
-- 6. Somebody knocking
-- ===========================================================================
-- Recorded by a trigger rather than by the website, so it happens even when the browser is
-- closed on the "we do not recognise this account" screen.
--
-- The whole body is wrapped so that it cannot fail. A trigger on auth.users runs inside the
-- transaction that signs somebody in: if it raises, that sign-in fails. A bug in *recording*
-- that a stranger knocked would then lock out every member and every admin, including the
-- one person who could fix it. Losing a row from this table is a small thing. Losing the
-- door is not.

create or replace function portal.record_unmatched_sign_in()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  address text := lower(new.email);
begin
  if address is null then
    return new;
  end if;

  if exists (select 1 from portal.households h where h.google_email = address) then
    return new;
  end if;

  -- Aliased, because in `on conflict do update` the target is referred to by its own name
  -- or alias — a schema-qualified one is not in scope there.
  insert into portal.sign_in_attempts as a (email, name)
    values (address, nullif(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (email) do update
    set attempts = a.attempts + 1,
        last_tried_at = now(),
        name = coalesce(excluded.name, a.name);

  return new;
exception
  when others then
    -- Never take the door down over a note to the committee.
    return new;
end;
$$;

drop trigger if exists record_unmatched_sign_in on auth.users;
create trigger record_unmatched_sign_in
  after insert on auth.users
  for each row execute function portal.record_unmatched_sign_in();

-- A row in auth.users is created once, so the insert above catches only the first try. Every
-- try after that shows up as a new sign-in time, which is what makes the count on the People
-- screen mean anything.
drop trigger if exists record_repeat_unmatched_sign_in on auth.users;
create trigger record_repeat_unmatched_sign_in
  after update of last_sign_in_at on auth.users
  for each row
  when (new.last_sign_in_at is distinct from old.last_sign_in_at)
  execute function portal.record_unmatched_sign_in();


-- ===========================================================================
-- 7. What changed, and who changed it
-- ===========================================================================
-- Written by a trigger on each table rather than by whatever called the API, because a trail
-- the caller has to remember to write is a trail with holes exactly where somebody was in a
-- hurry. Nothing that reaches these tables through PostgREST can avoid leaving a row here.
--
-- It keeps the old value as well as the new, because the question asked six months later is
-- never "did this change" — it is "who unpublished that", "when did she become an admin",
-- "what was the number before". A trail that only says a row moved answers none of them.
--
-- On erasure: `on delete set null` means deleting a household leaves its trail behind with
-- nobody named in it. That is the right way round — a person asking to be forgotten should
-- not stay named in a log — but it does mean the committee should export the trail before
-- deleting anybody, or lose the account of what that household did. A retention decision,
-- and it is listed as one.

create table if not exists portal.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_household_id uuid references portal.households (id) on delete set null,
  -- insert | update | delete, and the table it happened to.
  action text not null check (action in ('insert', 'update', 'delete')),
  subject_kind text not null,
  subject_id text not null,
  -- Only the fields that moved: {"role": {"from": "member", "to": "admin"}}
  changes jsonb not null default '{}'::jsonb,
  at timestamptz not null default now()
);

create index if not exists audit_log_at_idx on portal.audit_log (at desc);
create index if not exists audit_log_subject_idx on portal.audit_log (subject_kind, subject_id);

alter table portal.audit_log enable row level security;

-- Readable by the committee, and written by nobody: the rows come from the triggers below,
-- which run as owner. There is deliberately no insert, update or delete policy, so the trail
-- cannot be edited by anyone holding an anon key, admin or not.
grant select on portal.audit_log to authenticated;
revoke all on portal.audit_log from anon;

drop policy if exists "admins read the audit trail" on portal.audit_log;
create policy "admins read the audit trail"
  on portal.audit_log for select to authenticated using (portal.is_admin());


create or replace function portal.record_change()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  before jsonb := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end;
  after jsonb := case when tg_op = 'DELETE' then '{}'::jsonb else to_jsonb(new) end;
  moved jsonb;
begin
  select coalesce(jsonb_object_agg(key, jsonb_build_object('from', b.value, 'to', a.value)), '{}'::jsonb)
    into moved
    from jsonb_each(before) b
    full join jsonb_each(after) a using (key)
   where b.value is distinct from a.value;

  -- An update that moved nothing is not worth a row.
  if tg_op = 'UPDATE' and moved = '{}'::jsonb then
    return null;
  end if;

  insert into portal.audit_log (actor_household_id, action, subject_kind, subject_id, changes)
  values (
    portal.current_household_id(),
    lower(tg_op),
    tg_table_name,
    coalesce(after ->> 'id', before ->> 'id', '?'),
    moved
  );

  return null;
exception
  when others then
    -- Same reasoning as the sign-in trigger: an AFTER trigger that raises takes its whole
    -- transaction with it. Losing a line of the trail must not cost the committee the write.
    return null;
end;
$$;

comment on function portal.record_change() is
  'Records an insert, update or delete in audit_log. Attached after the fact, so it cannot be skipped.';

-- Attached to everything that holds member data or committee decisions. Not to audit_log
-- itself, for obvious reasons.
drop trigger if exists record_change on portal.households;
create trigger record_change after insert or update or delete on portal.households
  for each row execute function portal.record_change();

drop trigger if exists record_change on portal.people;
create trigger record_change after insert or update or delete on portal.people
  for each row execute function portal.record_change();

drop trigger if exists record_change on portal.documents;
create trigger record_change after insert or update or delete on portal.documents
  for each row execute function portal.record_change();

-- Updates only. Every visitor submitting the contact form would otherwise write a row here
-- saying a visitor submitted the contact form, which the table already says.
drop trigger if exists record_change on portal.contact_messages;
create trigger record_change after update or delete on portal.contact_messages
  for each row execute function portal.record_change();

drop trigger if exists record_change on portal.news_posts;
create trigger record_change after insert or update on portal.news_posts
  for each row execute function portal.record_change();

drop trigger if exists record_change on portal.announcements;
create trigger record_change after insert or update or delete on portal.announcements
  for each row execute function portal.record_change();

-- Turning the gallery off takes every photograph off the public site at once, and changing the
-- roll takes somebody's name off the About page. Both are one click and neither leaves a mark
-- anywhere else, so who did it and when is worth keeping.
drop trigger if exists record_change on portal.site_settings;
create trigger record_change after insert or update on portal.site_settings
  for each row execute function portal.record_change();


-- ===========================================================================
-- 8. How many came
-- ===========================================================================
-- Typed in by the committee after the night, not worked out from anything here.
--
-- Registration is the committee's Google Form and the replies stay in their sheet, so a count
-- is the only thing that crosses over — and it brings nobody with it. No household is named, no
-- dietary note travels, nothing has to be matched to anybody, and there is nothing in this
-- table a member could ever ask us to delete. Which is also why there is no retention rule
-- here: a number about an evening is not personal data, and it can be kept for good.
--
-- The alternative was reading the sheet and matching rows to households. That would pull every
-- registrant's details into this database, which is exactly what leaving registration on the
-- form was meant to avoid.

create table if not exists portal.event_attendance (
  -- One row per event, so recording it again corrects the number rather than adding a second.
  event_slug text primary key,
  held_on date not null,
  households integer not null default 0 check (households >= 0),
  adults integer not null default 0 check (adults >= 0),
  children integer not null default 0 check (children >= 0),
  recorded_at timestamptz not null default now()
);

alter table portal.event_attendance enable row level security;
grant select on portal.event_attendance to authenticated;
grant insert, update on portal.event_attendance to authenticated;
revoke all on portal.event_attendance from anon;

-- Readable by any member: this is the history the portal shows, and there is nobody in it.
drop policy if exists "members read attendance" on portal.event_attendance;
create policy "members read attendance"
  on portal.event_attendance for select to authenticated
  using (portal.current_household_id() is not null);

drop policy if exists "admins record attendance" on portal.event_attendance;
create policy "admins record attendance"
  on portal.event_attendance for insert to authenticated with check (portal.is_admin());

drop policy if exists "admins correct attendance" on portal.event_attendance;
create policy "admins correct attendance"
  on portal.event_attendance for update to authenticated
  using (portal.is_admin()) with check (portal.is_admin());

drop trigger if exists record_change on portal.event_attendance;
create trigger record_change after insert or update or delete on portal.event_attendance
  for each row execute function portal.record_change();

comment on table portal.event_attendance is
  'How many came to each event. Typed in by the committee; nobody is named, so it is kept for good.';


-- ===========================================================================
-- Not here yet
-- ===========================================================================
-- Events, announcements, news, albums and media are still fixtures in the repository and get
-- their tables and policies when those steps come round. They are not member data, and the
-- rule for all of them is the same shape: readable by everyone if published and public,
-- readable by members if published and members-only, writable by admins.
