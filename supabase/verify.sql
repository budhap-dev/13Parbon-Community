-- Checks that the portal rules hold. Run in the Supabase SQL editor after portal.sql.
--
-- Every block below is something that would be a real problem if it were allowed. Each raises
-- an exception if the rule is not doing its job, so a clean run means silence followed by the
-- final notice. The whole thing runs in a transaction and rolls back, so it leaves nothing
-- behind.
--
-- The important part, and what an earlier draft of this file could not do: these tests
-- actually exercise row level security. Seeding happens as the owner, who bypasses policies.
-- Every check after that runs as `authenticated` or `anon` — roles that do not own the tables
-- and are therefore subject to them — with `request.jwt.claims` set by hand to whichever
-- account is being impersonated, which is the same claim `auth_email()` reads.
--
-- Two behaviours to keep in mind while reading:
--   * A blocked INSERT raises. A blocked UPDATE or DELETE does not — the policy's `using`
--     clause simply matches no rows and the statement affects nothing. So every attempt to
--     write to somebody else's row is checked afterwards, as the owner, by looking.
--   * `anon` has no grant at all on these tables, so it is refused before policies are even
--     consulted. That is the intended answer and is checked as an exception.
--
-- Not covered here: the triggers on auth.users. Those need a real sign-in — see the checklist
-- at the bottom.

begin;

-- ---------------------------------------------------------------------------
-- Seed, as the owner
-- ---------------------------------------------------------------------------

insert into portal.households (id, name, contact_name, email, google_email, role, listed_in_directory, share_email, share_phone, phone)
values
  ('11111111-1111-1111-1111-111111111111', 'The Test Members', 'A Member', 'member@example.com', 'member@example.com', 'member', true, true, false, '07700 900001'),
  ('22222222-2222-2222-2222-222222222222', 'The Test Admins', 'An Admin', 'admin@example.com', 'admin@example.com', 'admin', false, false, false, '07700 900002'),
  ('33333333-3333-3333-3333-333333333333', 'The Test Quiet', 'A Quiet One', 'quiet@example.com', 'quiet@example.com', 'member', false, true, true, '07700 900003');

insert into portal.people (household_id, name, age_group, age)
values
  ('11111111-1111-1111-1111-111111111111', 'A Test Child', 'child', 7),
  ('22222222-2222-2222-2222-222222222222', 'An Admin Adult', 'adult', null);

insert into portal.documents (id, title, category, file_url)
values ('44444444-4444-4444-4444-444444444444', 'Test Minutes', 'minutes', 'https://example.com/m.pdf');

insert into portal.contact_messages (name, email, subject, message)
values ('A Visitor', 'visitor@example.com', 'Hello', 'A message long enough to pass the check.');

insert into portal.sign_in_attempts (email, name)
values ('stranger@example.com', 'A Stranger');


-- ---------------------------------------------------------------------------
-- A member
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"email": "member@example.com"}';

do $$
begin
  if portal.current_household_id() <> '11111111-1111-1111-1111-111111111111' then
    raise exception 'FAIL: a signed-in member was not matched to their household';
  end if;
  if portal.is_admin() then
    raise exception 'FAIL: a member is being treated as an admin';
  end if;
end $$;

-- The rule the whole portal rests on: one household, and it is their own.
do $$
declare
  visible integer;
begin
  select count(*) into visible from portal.households;
  if visible <> 1 then
    raise exception 'FAIL: a member can see % households, expected only their own', visible;
  end if;

  if exists (select 1 from portal.households where id = '22222222-2222-2222-2222-222222222222') then
    raise exception 'FAIL: a member can read another household';
  end if;
end $$;

-- And no person belonging to anybody else, at any sharing setting.
do $$
declare
  visible integer;
begin
  select count(*) into visible from portal.people;
  if visible <> 1 then
    raise exception 'FAIL: a member can see % people, expected only their own household''s', visible;
  end if;

  if exists (select 1 from portal.people where name = 'An Admin Adult') then
    raise exception 'FAIL: a member can read another household''s people';
  end if;
end $$;

-- A member cannot invite anybody. That is the invitation model.
do $$
begin
  begin
    insert into portal.households (name, contact_name, email)
      values ('The Gatecrashers', 'Someone', 'gate@example.com');
    raise exception 'FAIL: a member added a household';
  exception when insufficient_privilege then
    null;
  end;
end $$;

-- A member must not be able to promote themselves, change the address that signs them in,
-- or mark themselves paid up.
do $$
begin
  begin
    update portal.households set role = 'admin'
      where id = '11111111-1111-1111-1111-111111111111';
    raise exception 'FAIL: a member promoted themselves to admin';
  exception when insufficient_privilege then
    null;
  end;

  begin
    update portal.households set google_email = 'someone.else@example.com'
      where id = '11111111-1111-1111-1111-111111111111';
    raise exception 'FAIL: a member changed their own sign-in address';
  exception when insufficient_privilege then
    null;
  end;

  begin
    update portal.households set membership_paid_to = '2099-01-01'
      where id = '11111111-1111-1111-1111-111111111111';
    raise exception 'FAIL: a member marked their own membership paid';
  exception when insufficient_privilege then
    null;
  end;
end $$;

-- But they may still edit what is theirs to edit.
update portal.households set contact_name = 'A Renamed Member', share_phone = true
  where id = '11111111-1111-1111-1111-111111111111';

-- Writes aimed at somebody else's row do not raise. They quietly match nothing, and that is
-- checked below as the owner, because a member cannot read the row to check it themselves.
update portal.households set name = 'Hijacked'
  where id = '22222222-2222-2222-2222-222222222222';
delete from portal.households where id = '33333333-3333-3333-3333-333333333333';
update portal.people set name = 'Renamed Somebody Else' where name = 'An Admin Adult';
delete from portal.people where name = 'An Admin Adult';

-- The inbox is the committee's.
do $$
declare
  visible integer;
begin
  select count(*) into visible from portal.contact_messages;
  if visible <> 0 then
    raise exception 'FAIL: a member can read % messages from the public', visible;
  end if;

  select count(*) into visible from portal.sign_in_attempts;
  if visible <> 0 then
    raise exception 'FAIL: a member can read who has been knocking';
  end if;
end $$;

-- The trail is the committee's, and it is nobody's to edit.
do $$
declare
  visible integer;
begin
  select count(*) into visible from portal.audit_log;
  if visible <> 0 then
    raise exception 'FAIL: a member can read the audit trail';
  end if;

  begin
    insert into portal.audit_log (action, subject_kind, subject_id)
      values ('update', 'households', '11111111-1111-1111-1111-111111111111');
    raise exception 'FAIL: a member wrote a line into the audit trail';
  exception when insufficient_privilege then
    null;
  end;
end $$;

-- Documents are for members, and this one is a member.
do $$
begin
  if not exists (select 1 from portal.documents where id = '44444444-4444-4444-4444-444444444444') then
    raise exception 'FAIL: a member cannot read the documents library';
  end if;

  begin
    insert into portal.documents (title, category, file_url)
      values ('Forged Minutes', 'minutes', 'https://example.com/x.pdf');
    raise exception 'FAIL: a member added a document';
  exception when insufficient_privilege then
    null;
  end;
end $$;

-- The directory shows what was agreed, and nothing else.
do $$
declare
  listed integer;
  shared_email text;
  shared_phone text;
begin
  select count(*) into listed from portal.directory;
  if listed <> 1 then
    raise exception 'FAIL: directory showed % households, expected only the one that opted in', listed;
  end if;

  select email, phone into shared_email, shared_phone
    from portal.directory where id = '11111111-1111-1111-1111-111111111111';
  if shared_email is null then
    raise exception 'FAIL: an address the household agreed to share was hidden';
  end if;

  if exists (select 1 from portal.directory where id = '33333333-3333-3333-3333-333333333333') then
    raise exception 'FAIL: a household that opted out appeared in the directory';
  end if;
end $$;

-- No name of any person is reachable through the directory.
do $$
begin
  if exists (
    select 1 from portal.directory d
    where d.name like '%Test Child%' or d.contact_name like '%Test Child%'
  ) then
    raise exception 'FAIL: a child''s name is reachable through the directory';
  end if;
end $$;


-- ---------------------------------------------------------------------------
-- What those attempts actually did, checked as the owner
-- ---------------------------------------------------------------------------

reset role;

do $$
begin
  if exists (select 1 from portal.households where name = 'Hijacked') then
    raise exception 'FAIL: a member renamed another household';
  end if;
  if not exists (select 1 from portal.households where id = '33333333-3333-3333-3333-333333333333') then
    raise exception 'FAIL: a member deleted another household';
  end if;
  if not exists (select 1 from portal.people where name = 'An Admin Adult') then
    raise exception 'FAIL: a member renamed or deleted another household''s person';
  end if;
  if not exists (select 1 from portal.households
                 where id = '11111111-1111-1111-1111-111111111111'
                   and contact_name = 'A Renamed Member' and share_phone) then
    raise exception 'FAIL: a member could not edit what is theirs to edit';
  end if;
end $$;


-- ---------------------------------------------------------------------------
-- An account with no household: signed in, a member of nothing
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"email": "stranger@example.com"}';

do $$
declare
  visible integer;
begin
  if portal.current_household_id() is not null then
    raise exception 'FAIL: an unknown account was matched to a household';
  end if;
  if portal.is_admin() then
    raise exception 'FAIL: an unknown account is being treated as an admin';
  end if;

  select count(*) into visible from portal.households;
  if visible <> 0 then
    raise exception 'FAIL: an unknown account can see % households', visible;
  end if;

  select count(*) into visible from portal.people;
  if visible <> 0 then
    raise exception 'FAIL: an unknown account can see % people', visible;
  end if;

  select count(*) into visible from portal.directory;
  if visible <> 0 then
    raise exception 'FAIL: an unknown account could read the directory';
  end if;

  select count(*) into visible from portal.documents;
  if visible <> 0 then
    raise exception 'FAIL: an unknown account could read the documents library';
  end if;
end $$;


-- ---------------------------------------------------------------------------
-- Nobody at all
-- ---------------------------------------------------------------------------
-- anon holds no grant on any of this, so it is refused before policies are consulted.

reset role;
set local role anon;
set local request.jwt.claims = '';

do $$
declare
  visible integer;
begin
  begin
    select count(*) into visible from portal.households;
    raise exception 'FAIL: an unauthenticated request read the households table';
  exception when insufficient_privilege then
    null;
  end;

  begin
    select count(*) into visible from portal.people;
    raise exception 'FAIL: an unauthenticated request read the people table';
  exception when insufficient_privilege then
    null;
  end;

  begin
    select count(*) into visible from portal.directory;
    raise exception 'FAIL: an unauthenticated request read the directory';
  exception when insufficient_privilege then
    null;
  end;

  begin
    select count(*) into visible from portal.audit_log;
    raise exception 'FAIL: an unauthenticated request read the audit trail';
  exception when insufficient_privilege then
    null;
  end;
end $$;

-- The contact form must still work for a visitor, or the public website loses its only
-- way of being written to.
insert into portal.contact_messages (name, email, subject, message)
values ('Another Visitor', 'another@example.com', 'Still working', 'Long enough to pass the check.');

-- Two correct answers here, depending on whether anon holds a SELECT grant at all: refused
-- outright, or admitted and shown nothing. Either is the inbox staying shut. What would be
-- wrong is a row coming back.
do $$
declare
  visible integer;
begin
  begin
    select count(*) into visible from portal.contact_messages;
    if visible <> 0 then
      raise exception 'FAIL: a visitor can read the committee''s inbox';
    end if;
  exception when insufficient_privilege then
    null;
  end;
end $$;


-- ---------------------------------------------------------------------------
-- The committee
-- ---------------------------------------------------------------------------

reset role;
set local role authenticated;
set local request.jwt.claims = '{"email": "admin@example.com"}';

do $$
declare
  visible integer;
begin
  if not portal.is_admin() then
    raise exception 'FAIL: an admin is not being treated as one';
  end if;

  select count(*) into visible from portal.households;
  if visible < 3 then
    raise exception 'FAIL: an admin can see only % households', visible;
  end if;

  select count(*) into visible from portal.people;
  if visible < 2 then
    raise exception 'FAIL: an admin cannot see the people in a household';
  end if;

  select count(*) into visible from portal.contact_messages;
  if visible < 1 then
    raise exception 'FAIL: an admin cannot read the committee''s inbox';
  end if;

  select count(*) into visible from portal.sign_in_attempts;
  if visible < 1 then
    raise exception 'FAIL: an admin cannot see who has been knocking';
  end if;
end $$;

-- The count is typed in, and only by the committee.
reset role;
set local role authenticated;
set local request.jwt.claims = '{"email": "member@example.com"}';

do $$
begin
  begin
    insert into portal.event_attendance (event_slug, held_on, households, adults, children)
      values ('made-up', current_date, 99, 99, 0);
    raise exception 'FAIL: a member recorded a headcount';
  exception when insufficient_privilege then
    null;
  end;
end $$;

reset role;
set local role authenticated;
set local request.jwt.claims = '{"email": "admin@example.com"}';

insert into portal.event_attendance (event_slug, held_on, households, adults, children)
values ('boishakhi-2026', '2026-04-18', 41, 96, 34);

-- Recording it again corrects the number rather than stacking a second row up.
insert into portal.event_attendance as ea (event_slug, held_on, households, adults, children)
values ('boishakhi-2026', '2026-04-18', 43, 99, 34)
on conflict (event_slug) do update
  set households = excluded.households, adults = excluded.adults, children = excluded.children;

do $$
declare
  counted record;
begin
  select * into counted from portal.event_attendance where event_slug = 'boishakhi-2026';
  if counted.households <> 43 then
    raise exception 'FAIL: correcting a count did not take: %', counted.households;
  end if;
  if (select count(*) from portal.event_attendance where event_slug = 'boishakhi-2026') <> 1 then
    raise exception 'FAIL: recording a count twice left two rows';
  end if;
end $$;

reset role;
set local role authenticated;
set local request.jwt.claims = '{"email": "member@example.com"}';

do $$
begin
  if not exists (select 1 from portal.event_attendance where event_slug = 'boishakhi-2026') then
    raise exception 'FAIL: a member cannot read the history the portal is meant to show';
  end if;
end $$;

reset role;
set local role authenticated;
set local request.jwt.claims = '{"email": "admin@example.com"}';

-- The committee may do the things a member may not.-- The committee may do the things a member may not.
update portal.households set role = 'admin', membership_paid_to = '2027-03-31'
  where id = '11111111-1111-1111-1111-111111111111';

update portal.contact_messages set handled_by = 'An Admin' where handled_by is null;

update portal.sign_in_attempts set resolved = true where email = 'stranger@example.com';

insert into portal.households (name, contact_name, email, google_email)
values ('The Newly Invited', 'A Newcomer', 'new@example.com', 'new@example.com');

do $$
begin
  if not exists (select 1 from portal.households where google_email = 'new@example.com') then
    raise exception 'FAIL: an admin could not invite a household';
  end if;
end $$;

-- The trail recorded all of that, without anybody above asking it to.
do $$
declare
  promotion jsonb;
begin
  if (select count(*) from portal.audit_log) = 0 then
    raise exception 'FAIL: nothing was recorded in the audit trail';
  end if;

  select changes into promotion
    from portal.audit_log
   where subject_kind = 'households'
     and subject_id = '11111111-1111-1111-1111-111111111111'
     and action = 'update'
     and changes ? 'role'
   order by at desc limit 1;

  if promotion is null then
    raise exception 'FAIL: a role change left no line in the audit trail';
  end if;
  if promotion -> 'role' ->> 'from' <> 'member' or promotion -> 'role' ->> 'to' <> 'admin' then
    raise exception 'FAIL: the trail did not keep what the role was before and after: %', promotion;
  end if;

  if not exists (
    select 1 from portal.audit_log
     where subject_kind = 'households' and action = 'insert'
       and actor_household_id = '22222222-2222-2222-2222-222222222222'
  ) then
    raise exception 'FAIL: the trail did not record who invited the new household';
  end if;
end $$;

-- Not even the committee may rewrite it. There is no policy for writing, on purpose.
do $$
begin
  begin
    update portal.audit_log set changes = '{}'::jsonb;
    if found then
      raise exception 'FAIL: an admin edited the audit trail';
    end if;
  exception when insufficient_privilege then
    null;
  end;

  begin
    delete from portal.audit_log;
    if found then
      raise exception 'FAIL: an admin deleted from the audit trail';
    end if;
  exception when insufficient_privilege then
    null;
  end;
end $$;

reset role;

do $$
begin
  raise notice 'All portal rules hold.';
end $$;

rollback;


-- ---------------------------------------------------------------------------
-- What this file cannot check
-- ---------------------------------------------------------------------------
-- The triggers on auth.users need a real sign-in, so check these by hand once, in the live
-- project, after portal.sql has been run:
--
--   1. Sign in with an address that has no household. You should be turned away, and a row
--      should appear in sign_in_attempts.
--   2. Sign in with that same address again. attempts should read 2, not 1, and
--      last_tried_at should move.
--   3. Give that address a household and sign in again. No new attempt is recorded, and the
--      dashboard appears.
--   4. Drop the sign_in_attempts table in a branch of the project and sign in. Sign-in must
--      still work: the trigger swallows its own failure on purpose, and this is the only way
--      to prove it.
