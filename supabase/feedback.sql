-- 13Parbon Community: feedback from the public.
--
-- Run this AFTER schema.sql and portal.sql, once, in the Supabase SQL editor. Then run the
-- feedback section of verify.sql, which proves the rules below actually hold rather than
-- merely having been typed.
--
-- Its own file rather than another block in portal.sql, because portal.sql has been run
-- against the live project and every `create table if not exists` in it is now a no-op that
-- says nothing. New tables come in files of their own from here on.
--
-- ---------------------------------------------------------------------------
-- What makes this table different from every other one here
-- ---------------------------------------------------------------------------
-- It is the only table a stranger both writes to and reads from. Everything else is either
-- the committee's to write (news, events, albums) or write-only for the public (contact
-- messages). So it is the one place where a mistake in a policy does not leak private data —
-- it publishes a stranger's words on the community's website, over somebody's name.
--
-- Three rules carry that weight, and all three are in the database rather than the browser:
--
--   1. Everything arrives `pending`. Not defaulted — forced, by a trigger, on every insert.
--      A row is whatever the client chose to send, and "the form does not offer a status
--      field" is not a rule.
--   2. The name is taken from the token, never from the request. Somebody signing feedback
--      cannot sign it with anybody else's name, because the name is not something they send.
--   3. Only `approved` rows are readable by anyone but the committee.
--
-- ---------------------------------------------------------------------------
-- What is deliberately not stored
-- ---------------------------------------------------------------------------
-- No email address. Signing in with Google proves a real account is behind the words; it is
-- not a reason to keep a record of how to reach somebody. An address here would become a new
-- category of personal data that the subject-access export has to find, the privacy page has
-- to declare and an erasure has to reach — for no benefit the committee actually uses.
--
-- That has a real cost, and it is worth saying out loud: **the committee cannot reply to a
-- piece of feedback.** The contact form is where somebody goes who wants an answer.
--
-- The name *is* kept in full — first name and surname, as Google gives it. An earlier design
-- cut it to the first word here, on the way in, so that no page could ever leak a surname.
-- That was reversed on 2026-09-21 for a plain reason: two people called Priya are two people,
-- and a showcase that cannot tell them apart is not attributing anything to anybody. It is a
-- heavier disclosure, so it stays opt-in, the form shows the exact name before the box is
-- ticked, and nothing appears until the committee has approved it.


-- ===========================================================================
-- 1. The name on the token
-- ===========================================================================
-- Beside portal.auth_email(), and for the same reason it exists: the only trustworthy source
-- for who somebody is, is the token they arrived with.

create or replace function portal.auth_name()
  returns text
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select nullif(
    -- Tidied, and capped rather than rejected. A Google display name is whatever somebody
    -- typed into their account: it can carry doubled spaces, and it can in principle be
    -- longer than any column wants. Truncating keeps a long name from failing an insert that
    -- has a perfectly good piece of feedback attached to it.
    left(
      trim(
        regexp_replace(
          coalesce(
            nullif(auth.jwt() -> 'user_metadata' ->> 'full_name', ''),
            nullif(auth.jwt() -> 'user_metadata' ->> 'name', ''),
            ''
          ),
          '\s+',
          ' ',
          'g'
        )
      ),
      120
    ),
    ''
  );
$$;

comment on function portal.auth_name() is
  'The name on this account''s Google profile, in full, or null. The only trustworthy source for who signed a piece of feedback: it comes from the token, so it is not something a browser can choose.';

revoke all on function portal.auth_name() from public, anon;
grant execute on function portal.auth_name() to authenticated, service_role;


-- ===========================================================================
-- 2. The table
-- ===========================================================================

create table if not exists portal.feedback (
  id uuid primary key default gen_random_uuid(),
  -- Bounded at both ends. Ten characters is "was lovely" and is worth having; five thousand
  -- is either an essay or a paste, and the form stops at two thousand.
  message text not null check (char_length(trim(message)) between 10 and 2000),
  -- Their name, taken from the token by the trigger below. Null means anonymous, which is the
  -- default state and not a failure. The length check is an alter below, so that re-running
  -- this file against a database that already has the table widens it.
  author_name text,
  -- Whether a Google account stood behind it. What makes a name worth anything on the page,
  -- and the only thing the committee has to go on when deciding whether to believe a note.
  signed_in boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  -- The committee member who decided, by name. A household id here would show a reader
  -- "approved by 7f3a-…", and the name is one the About page publishes anyway.
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Named rather than inline, because an inline check inside `create table if not exists` is a
-- no-op against a table that already exists — and this one was widened from 80 to 120 when
-- the surname stopped being cut off. Everything that can change lives in an alter here.
alter table portal.feedback drop constraint if exists feedback_author_name_check;
alter table portal.feedback drop constraint if exists feedback_author_name_length;
alter table portal.feedback
  add constraint feedback_author_name_length check (
    author_name is null or char_length(trim(author_name)) between 1 and 120
  );

create index if not exists feedback_created_at_idx on portal.feedback (created_at desc);
-- The public page's query, which is by far the most frequent one.
create index if not exists feedback_approved_idx on portal.feedback (status, created_at desc);

-- A decision has to say who made it, and a piece still waiting must not claim one. Written
-- as a constraint rather than left to the app: "turned down by nobody, at no time" is a state
-- the screens cannot produce and the SQL editor can.
alter table portal.feedback drop constraint if exists feedback_reviewed_together;
alter table portal.feedback
  add constraint feedback_reviewed_together check (
    (status = 'pending' and reviewed_by is null and reviewed_at is null)
    or (status <> 'pending' and reviewed_by is not null and reviewed_at is not null)
  );


-- ===========================================================================
-- 3. Who wrote it is decided here, not by the browser
-- ===========================================================================

create or replace function portal.stamp_feedback()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
begin
  /*
   * `signed_in` arrives as a request — "put my name to this" — and leaves as a fact. The name
   * itself is never read from the row being inserted: whatever the client sent in
   * `author_name` is thrown away and replaced with what the token says, so there is no way to
   * sign a piece of feedback with somebody else's name.
   *
   * Ticking the box while signed out is not an error. The person asked for something the
   * request cannot support, and the sensible answer is to keep their words and file them
   * anonymously rather than to lose what they wrote over a checkbox.
   */
  if coalesce(new.signed_in, false) and portal.auth_name() is not null then
    new.author_name := portal.auth_name();
    new.signed_in := true;
  else
    new.author_name := null;
    new.signed_in := false;
  end if;

  -- Nobody publishes themselves. Forced rather than defaulted: a default is only what happens
  -- when a column is left out, and a client can always choose not to leave it out.
  new.status := 'pending';
  new.reviewed_by := null;
  new.reviewed_at := null;
  new.created_at := now();
  return new;
end;
$$;

comment on function portal.stamp_feedback() is
  'Decides the author and the status of a new piece of feedback from the token, ignoring whatever the client sent.';

/*
 * There is no exception for a privileged caller, and that is worth knowing before you are
 * surprised by it: an insert from the SQL editor, from `service_role`, or from a migration
 * lands pending and anonymous exactly like one from a stranger's browser.
 *
 * So **nothing but an update can put a piece of feedback on the website** — not even the
 * owner. To seed an approved row, insert it and then update it. `verify-feedback.sql` does
 * precisely that, having first been written the obvious way and having failed on its own
 * first check, which is the best evidence the trigger works that this file has.
 *
 * The exception is deliberately absent because an exception is a way in, and "the seed script
 * needs it" is how one gets added.
 */

drop trigger if exists stamp_feedback on portal.feedback;
create trigger stamp_feedback before insert on portal.feedback
  for each row execute function portal.stamp_feedback();


-- ===========================================================================
-- 4. Grants, then row level security
-- ===========================================================================
-- Two different gates, and a row has to pass both. See the note in portal.sql.

alter table portal.feedback enable row level security;

grant select on portal.feedback to anon, authenticated;
grant update, delete on portal.feedback to authenticated;

-- Column grants on the insert, so the two columns a person may actually decide are the only
-- two they may name. The rest are the trigger's to fill, and the trigger overwrites them
-- anyway — this is the belt to that pair of braces, and it makes the intent legible in
-- `\dp portal.feedback` rather than only inside a function body.
revoke insert on portal.feedback from anon, authenticated;
grant insert (message, signed_in) on portal.feedback to anon, authenticated;

-- Reading. Two policies, which RLS ORs together: everybody sees what has been approved, and
-- the committee sees everything. Written as two rather than one `or` so that removing the
-- second cannot quietly take the public page down with it.
drop policy if exists "anybody reads approved feedback" on portal.feedback;
create policy "anybody reads approved feedback"
  on portal.feedback for select to anon, authenticated using (status = 'approved');

drop policy if exists "admins read every piece of feedback" on portal.feedback;
create policy "admins read every piece of feedback"
  on portal.feedback for select to authenticated using (portal.is_admin());

/*
 * Writing. `with check (true)` is right here for the same reason it is right on
 * contact_messages: a member of the public is anonymous by definition, and there is nothing
 * about them to check. What keeps this safe is not the policy but the trigger above — the row
 * that lands is not the row that was sent.
 *
 * Note that a person cannot read back what they just wrote. That is not an oversight: it is
 * pending, and pending is exactly what no read policy admits. The app returns a receipt it
 * built itself rather than asking for the row, because `insert ... returning` is a read and
 * would fail the whole request.
 */
drop policy if exists "anybody may leave feedback" on portal.feedback;
create policy "anybody may leave feedback"
  on portal.feedback for insert to anon, authenticated with check (true);

drop policy if exists "admins review feedback" on portal.feedback;
create policy "admins review feedback"
  on portal.feedback for update to authenticated
  using (portal.is_admin()) with check (portal.is_admin());

drop policy if exists "admins delete feedback" on portal.feedback;
create policy "admins delete feedback"
  on portal.feedback for delete to authenticated using (portal.is_admin());


-- ===========================================================================
-- 5. The trail
-- ===========================================================================

/*
 * Updates only, and deliberately not the generic delete.
 *
 * `portal.record_change()` copies every field that moved into `audit_log`, and on a delete
 * that means the whole row — including the message. The reason to delete a piece of feedback
 * in the first place is that it should not be held: abuse, somebody's phone number typed in
 * by mistake. Copying those words into the one table the committee cannot delete from would
 * be the opposite of taking them down.
 *
 * An update is safe, because `record_change` records only what changed, and what changes here
 * is the status. Inserts are left alone for the same reason contact_messages leaves them
 * alone: a line per member of the public using the form says nothing the table does not.
 */
drop trigger if exists record_change on portal.feedback;
create trigger record_change after update on portal.feedback
  for each row execute function portal.record_change();

create or replace function portal.record_feedback_removed()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
begin
  insert into portal.audit_log (actor_household_id, action, subject_kind, subject_id, changes)
  values (
    portal.current_household_id(),
    'delete',
    'feedback',
    old.id::text,
    -- What was there, without the words: enough to answer "what happened to the note I left
    -- you?" and not enough to preserve what somebody deleted it to be rid of.
    jsonb_build_object(
      'status', jsonb_build_object('from', old.status, 'to', null),
      'signed_in', jsonb_build_object('from', old.signed_in, 'to', null),
      'created_at', jsonb_build_object('from', old.created_at, 'to', null)
    )
  );
  return null;
exception
  when others then
    -- Same reasoning as the other triggers: an AFTER trigger that raises takes its whole
    -- transaction with it, and losing a line of the trail must not cost the committee the write.
    return null;
end;
$$;

comment on function portal.record_feedback_removed() is
  'Records that a piece of feedback was deleted, and by whom — never what it said.';

drop trigger if exists record_feedback_removed on portal.feedback;
create trigger record_feedback_removed after delete on portal.feedback
  for each row execute function portal.record_feedback_removed();
