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

/*
 * Where the trail stood before this file touched anything.
 *
 * The database being verified is a working one: audit_log has rows in it from real use, written
 * before any of this ran. Every check below that looks at the trail has to look only at what
 * *this* run wrote, or it is asserting things about the committee's history rather than about
 * the rules — and on a live database "the trail is not empty" is true whether the triggers
 * fired or not.
 *
 * A transaction-local setting rather than a temporary table. A temp table would have to be
 * read back under `set local role authenticated`, which holds no grant on one the owner made,
 * so the first check to use it would have died on a permission error rather than on anything
 * it was testing. It also makes Supabase's editor warn about a table with no row level
 * security, which for a table that lives inside one transaction is noise.
 */
-- Inside a block so it returns nothing. As a bare select it was the one statement in the file
-- that produced a result, and the editor showed `{"set_config": "77"}` in place of the "no rows
-- returned" a clean run has always ended with — a pass that looked like it needed decoding.
do $$
begin
  perform set_config(
    'verify.audit_from',
    (select coalesce(max(seq), 0)::text from portal.audit_log),
    true
  );
end $$;

insert into portal.households (id, name, contact_name, email, google_email, role, phone)
values
  ('11111111-1111-1111-1111-111111111111', 'The Test Members', 'A Member', 'member@example.com', 'member@example.com', 'member', '07700 900001'),
  ('22222222-2222-2222-2222-222222222222', 'The Test Admins', 'An Admin', 'admin@example.com', 'admin@example.com', 'admin', '07700 900002'),
  ('33333333-3333-3333-3333-333333333333', 'The Test Quiet', 'A Quiet One', 'quiet@example.com', 'quiet@example.com', 'member', '07700 900003');

insert into portal.people (household_id, name, age_group, age)
values
  ('11111111-1111-1111-1111-111111111111', 'A Test Child', 'child', 7),
  ('22222222-2222-2222-2222-222222222222', 'An Admin Adult', 'adult', null);

insert into portal.documents (id, title, category, file_url)
values ('44444444-4444-4444-4444-444444444444', 'Test Minutes', 'minutes', 'https://example.com/m.pdf');

insert into portal.albums (id, slug, title, visibility)
values
  ('55555555-5555-5555-5555-555555555555', 'test-public-night', 'A public night', 'public'),
  ('66666666-6666-6666-6666-666666666666', 'test-members-dinner', 'A members'' dinner', 'members');

insert into portal.media (id, album_id, url, thumbnail_url, approved)
values
  ('77777777-7777-7777-7777-777777777777', '55555555-5555-5555-5555-555555555555', 'https://photos.example/full/test-public-night-01.jpg', 'https://photos.example/thumb/test-public-night-01.jpg', true),
  ('88888888-8888-8888-8888-888888888888', '55555555-5555-5555-5555-555555555555', 'https://photos.example/full/test-public-night-02.jpg', 'https://photos.example/thumb/test-public-night-02.jpg', false),
  ('99999999-9999-9999-9999-999999999999', '66666666-6666-6666-6666-666666666666', 'https://photos.example/full/test-members-dinner-01.jpg', 'https://photos.example/thumb/test-members-dinner-01.jpg', true);

-- Public content, seeded as the owner: one of each thing a visitor should see and one of each
-- they should not.
insert into portal.news_posts (slug, title, excerpt, body, author, published_at, hidden)
values
  ('a-published-piece', 'A published piece', 'Up on the website.', 'The body of it.', 'Someone', now() - interval '1 day', false),
  ('a-draft', 'A draft', 'Not finished.', 'Half a thought.', 'Someone', null, false),
  ('taken-down', 'Taken down', 'Was up, is not.', 'The body of it.', 'Someone', now() - interval '30 days', true)
on conflict (slug) do nothing;

insert into portal.announcements (title, body, pinned, audience, publish_at, expires_at)
values
  ('Doors at six', 'The hall opens at six on Saturday.', false, 'public', now() - interval '1 hour', null),
  ('Not yet', 'This one has not started.', false, 'public', now() + interval '7 days', null),
  ('Long over', 'This one has expired.', false, 'public', now() - interval '30 days', now() - interval '7 days'),
  ('Members only', 'For the members, not the public.', false, 'members', now() - interval '1 hour', null);

insert into portal.site_settings (id, value)
values (true, '{"showNews": true}'::jsonb)
on conflict (id) do update set value = excluded.value;

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
update portal.households set contact_name = 'A Renamed Member'
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
                   and contact_name = 'A Renamed Member') then
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

  select count(*) into visible from portal.documents;
  if visible <> 0 then
    raise exception 'FAIL: an unknown account could read the documents library';
  end if;

  -- Signed in is not a member. The public album, and not the members' one.
  select count(*) into visible from portal.albums where slug like 'test-%';
  if visible <> 1 then
    raise exception 'FAIL: an unknown account sees % albums; only the public one should be readable', visible;
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

/*
 * And the same insert the way the app makes it.
 *
 * This block is why `withSupabaseWrites` sends `Prefer: return=minimal`. With
 * `return=representation` PostgREST writes INSERT ... RETURNING, and RETURNING is a read: it
 * answers to the SELECT policies, of which a visitor deliberately has none. So every submission
 * failed, the contact form did not work against the real database at all, and nothing on any
 * screen said so — this file is what found it.
 *
 * Both halves are asserted, because the fix has to keep the property rather than trade it away:
 * the insert goes in, and asking for it back is still refused.
 */
do $$
declare
  echoed uuid;
begin
  begin
    insert into portal.contact_messages (name, email, subject, message)
    values ('A Third Visitor', 'third@example.com', 'Asking for it back', 'Long enough to pass the check.')
    returning id into echoed;

    raise exception 'FAIL: a visitor can read a contact message back. The app relies on not being able to — if this is now allowed, something has granted anon select on the inbox';
  exception
    when insufficient_privilege then null;
    when others then
      -- Postgres words this differently depending on whether the grant or the policy is what
      -- stops it. Either is the inbox staying shut; a row coming back is not.
      if sqlstate not in ('42501', '44000') then raise; end if;
  end;
end $$;

-- And the insert the app actually sends — no RETURNING — still goes in. That it arrived is
-- asserted further down, from the committee's side, where there is a role that can see it.
--
-- Everything written to this table is written here, as a visitor: the contact form posts under
-- the anon key whether or not somebody is signed in, so `authenticated` holds no insert grant
-- on it at all. A block further down that inserts as the committee fails on the grant, not on
-- anything it was trying to prove.
insert into portal.contact_messages (name, email, subject, message, kind)
values ('A Fourth Visitor', 'fourth@example.com', 'Just asking', 'Long enough to pass the check.', 'general');

-- And a takedown, sent the way a parent sends one: through the public form, as a visitor.
-- Whether it can then be marked dealt with is asserted from the committee's side, below.
insert into portal.contact_messages (name, email, subject, message, kind)
values ('A Parent', 'parent@example.com', 'Please take a photograph down', 'The one of my daughter on the Boishakhi page.', 'photo');

-- The gallery a visitor sees: the public album, and its approved photographs. The photograph
-- policy asks whether the album is visible to the caller, so nothing here restates the rule.
do $$
declare
  albums integer;
  photos integer;
begin
  select count(*) into albums from portal.albums where slug like 'test-%';
  if albums <> 1 then
    raise exception 'FAIL: a visitor sees % albums; only the public one should be readable', albums;
  end if;
  select count(*) into photos from portal.media where album_id in ('55555555-5555-5555-5555-555555555555', '66666666-6666-6666-6666-666666666666');
  if photos <> 1 then
    raise exception 'FAIL: a visitor sees % photographs; only the approved one in the public album should be readable', photos;
  end if;
end $$;

-- What a visitor may read of the committee's writing: what is up, and nothing else. This is
-- the policy doing the work, not the query — the app asks for every row and is given the
-- published ones, so a `select` that forgot to filter still cannot leak a draft.
do $$
declare
  visible integer;
begin
  select count(*) into visible from portal.news_posts;
  if visible <> 1 then
    raise exception 'FAIL: a visitor can see % news posts; only the published one should be readable', visible;
  end if;

  if not exists (select 1 from portal.news_posts where slug = 'a-published-piece') then
    raise exception 'FAIL: a visitor cannot read a published piece';
  end if;

  select count(*) into visible from portal.announcements;
  if visible <> 1 then
    raise exception 'FAIL: a visitor can see % notices; only the live public one should be readable', visible;
  end if;

  if not exists (select 1 from portal.announcements where title = 'Doors at six') then
    raise exception 'FAIL: a visitor cannot read a live public notice';
  end if;
end $$;

-- And may write none of it.
do $$
begin
  begin
    insert into portal.news_posts (slug, title, excerpt, body, author)
    values ('a-visitors-piece', 'A visitor''s piece', 'Nope.', 'Nope.', 'A Visitor');
    raise exception 'FAIL: a visitor can publish on the website';
  exception when insufficient_privilege then
    null;
  end;
end $$;

-- The public site asks this table whether the gallery and the news pages exist at all, so a
-- visitor with no session has to be able to read it. If this ever fails, the live site loses
-- every switch the committee has thrown and silently falls back to what the code says.
do $$
declare
  readable integer;
begin
  select count(*) into readable from portal.site_settings;
  if readable < 1 then
    raise exception 'FAIL: a visitor cannot read the site settings, so the public site cannot tell which sections are on';
  end if;
end $$;

-- Reading them is not changing them.
do $$
begin
  begin
    update portal.site_settings set value = '{"showPhotos": false}'::jsonb where id;
    raise exception 'FAIL: a visitor can turn the gallery off';
  exception when insufficient_privilege then
    null;
  end;
end $$;

-- A visitor may say what a message is about. A visitor may not say it has been dealt with:
-- a message arriving pre-marked handled is one that leaves the unread count and is never read.
do $$
begin
  begin
    insert into portal.contact_messages (name, email, subject, message, handled_by)
    values ('A Sneaky Visitor', 'sneak@example.com', 'Already done', 'Long enough to pass the check.', 'The Committee');
    raise exception 'FAIL: a visitor can post a message already marked as handled';
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
    raise exception 'FAIL: an admin cannot read the committee''s inbox, or a member just emptied it';
  end if;

  -- The member's `delete from portal.contact_messages` above, seen from the only side that can
  -- see it. Four were seeded and one of those was the member's own attempt at a fifth.
  if visible < 3 then
    raise exception 'FAIL: a member deleted % of the committee''s messages', 4 - visible;
  end if;

  -- The message a visitor sent the way the app sends it, read from the side that is meant to
  -- read it. This is the whole round trip the live site depends on, in two halves.
  select count(*) into visible from portal.contact_messages where email = 'fourth@example.com';
  if visible <> 1 then
    raise exception 'FAIL: a message a visitor sent never reached the committee';
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

-- A member emptying the committee's inbox. A blocked delete raises nothing — the policy simply
-- matches no rows — and a member cannot read this table either, so counting the survivors here
-- would count zero whether the delete worked or not. It is checked from the committee's side,
-- below, where there is a role that can see what is left.
delete from portal.contact_messages;

-- A member sees the members' album as well as the public one, and only approved photographs.
do $$
declare
  albums integer;
  photos integer;
begin
  select count(*) into albums from portal.albums where slug like 'test-%';
  if albums <> 2 then
    raise exception 'FAIL: a member sees % of the two albums', albums;
  end if;
  select count(*) into photos from portal.media where album_id in ('55555555-5555-5555-5555-555555555555', '66666666-6666-6666-6666-666666666666');
  if photos <> 2 then
    raise exception 'FAIL: a member sees % photographs; the unapproved one should not be among them', photos;
  end if;
end $$;

-- And may not add to, change, or take down any of it.
do $$
begin
  begin
    insert into portal.media (album_id, url, thumbnail_url)
    values ('55555555-5555-5555-5555-555555555555', 'https://photos.example/full/x.jpg', 'https://photos.example/thumb/x.jpg');
    raise exception 'FAIL: a member put a photograph in an album';
  exception when insufficient_privilege then
    null;
  end;
end $$;
delete from portal.media where id = '77777777-7777-7777-7777-777777777777';

-- A member sees what the public sees of the writing, and no drafts.
do $$
declare
  visible integer;
begin
  select count(*) into visible from portal.news_posts;
  if visible <> 1 then
    raise exception 'FAIL: a member can see % news posts; a draft is the committee''s business', visible;
  end if;
end $$;

-- An ordinary member reads the settings like anybody else and changes nothing. A blocked update
-- raises nothing, so this is checked by looking afterwards rather than by catching.
update portal.site_settings set value = '{"showPhotos": false}'::jsonb where id;

do $$
begin
  if (select value from portal.site_settings where id) <> '{"showNews": true}'::jsonb then
    raise exception 'FAIL: a member can change what the public site shows';
  end if;
end $$;

reset role;
set local role authenticated;
set local request.jwt.claims = '{"email": "admin@example.com"}';

-- The committee may do the things a member may not.
update portal.households set role = 'admin', membership_paid_to = '2027-03-31'
  where id = '11111111-1111-1111-1111-111111111111';

-- Takedowns left out: those cannot be marked dealt with without saying what happened to the
-- photograph, which is the next block's business. A blanket update here would trip that
-- constraint and fail the script on the very rule it is about to prove.
update portal.contact_messages set handled_by = 'An Admin'
  where handled_by is null and kind <> 'photo';

/*
 * The takedown promise, enforced where it cannot be argued with.
 *
 * The app refuses to mark a photograph request done without saying what happened to the
 * picture, but the app is a browser and the browser is not the thing deciding. "Handled" on its
 * own does not say whether the photograph actually left the bucket, and this is the one promise
 * on the site with a person waiting behind it.
 */
do $$
begin
  begin
    update portal.contact_messages set handled_by = 'An Admin'
      where kind = 'photo' and handled_by is null;
    raise exception 'FAIL: a takedown can be marked dealt with without saying what happened to the photograph';
  exception when check_violation then
    null;
  end;
end $$;

-- And with a note, it goes through.
update portal.contact_messages
  set handled_by = 'An Admin', handled_note = 'Deleted boishakhi-2026-14 from the album'
  where kind = 'photo' and handled_by is null;

do $$
declare
  unfinished integer;
begin
  select count(*) into unfinished from portal.contact_messages where kind = 'photo' and handled_by is null;
  if unfinished <> 0 then
    raise exception 'FAIL: a takedown with a note could not be marked dealt with';
  end if;
end $$;

-- The committee can delete a message, and the trail is what is left of it.
do $$
declare
  doomed uuid;
  trail integer;
begin
  -- A message this file put there, named rather than whichever row came back first. The
  -- transaction rolls back either way, but a check that deletes one of the committee's real
  -- messages to prove a point is one nobody should have to think twice about.
  select id into doomed from portal.contact_messages where email = 'fourth@example.com';
  delete from portal.contact_messages where id = doomed;

  if exists (select 1 from portal.contact_messages where id = doomed) then
    raise exception 'FAIL: the committee cannot delete a message';
  end if;

  select count(*) into trail from portal.audit_log
   where subject_kind = 'contact_messages' and action = 'delete' and subject_id = doomed::text;
  if trail <> 1 then
    raise exception 'FAIL: deleting a message left no line in the audit trail, and the message was the only other record of it';
  end if;
end $$;

-- The committee sees every album and every photograph, and keeps them.
do $$
declare
  photos integer;
begin
  select count(*) into photos from portal.media where album_id in ('55555555-5555-5555-5555-555555555555', '66666666-6666-6666-6666-666666666666');
  if photos <> 3 then
    raise exception 'FAIL: the committee sees % of the three photographs (a member''s delete above should have matched nothing)', photos;
  end if;
end $$;

update portal.albums set cover_media_id = '77777777-7777-7777-7777-777777777777'
  where id = '55555555-5555-5555-5555-555555555555';
delete from portal.media where id = '77777777-7777-7777-7777-777777777777';

do $$
begin
  if exists (select 1 from portal.media where id = '77777777-7777-7777-7777-777777777777') then
    raise exception 'FAIL: the committee cannot take a photograph down';
  end if;
  -- An album must not go on pointing at a photograph that is not there.
  if (select cover_media_id from portal.albums where id = '55555555-5555-5555-5555-555555555555') is not null then
    raise exception 'FAIL: an album still names a photograph that has been taken down as its cover';
  end if;
end $$;

-- The committee sees everything it has written, drafts and taken-down pieces included, and can
-- take a notice off the board for good.
do $$
declare
  visible integer;
begin
  select count(*) into visible from portal.news_posts;
  if visible < 3 then
    raise exception 'FAIL: the committee can see only % of its own news posts', visible;
  end if;

  select count(*) into visible from portal.announcements;
  if visible < 4 then
    raise exception 'FAIL: the committee cannot see the notices that are not live';
  end if;
end $$;

insert into portal.news_posts (slug, title, excerpt, body, author, published_at)
values ('the-committee-writes', 'The committee writes', 'A piece.', 'The body of it.', 'An Admin', now());

delete from portal.announcements where title = 'Long over';

do $$
begin
  if exists (select 1 from portal.announcements where title = 'Long over') then
    raise exception 'FAIL: the committee cannot take a notice off the board';
  end if;
end $$;

-- And the committee can, which is the whole point of the table.
update portal.site_settings set value = '{"showNews": false, "showPhotos": true}'::jsonb where id;

do $$
begin
  if (select value ->> 'showPhotos' from portal.site_settings where id) <> 'true' then
    raise exception 'FAIL: the committee cannot change what the public site shows';
  end if;

  -- And it left a line. Worth its own check because this is the only audited table whose key is
  -- not a uuid — `subject_id` is text and takes 'true', but the trigger swallows its own
  -- failures by design, so a type that did not fit would lose the line and say nothing.
  if not exists (
    select 1 from portal.audit_log
     where subject_kind = 'site_settings' and changes ? 'value'
       -- This run's line, not one from a settings change the committee made months ago, which
       -- would let this pass while the trigger did nothing at all.
       and seq > current_setting('verify.audit_from')::bigint
  ) then
    raise exception 'FAIL: changing what the public site shows left no line in the audit trail';
  end if;
end $$;

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
  -- What this run wrote, not what was already there: on a working database the trail is never
  -- empty, so counting all of it would pass whether the triggers fired or not.
  if (select count(*) from portal.audit_log
       where seq > current_setting('verify.audit_from')::bigint) = 0 then
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

/*
 * The trail comes back in the order things happened.
 *
 * Ordering on `at` cannot do this: a statement that changes several rows fires the trigger for
 * each inside one microsecond, so a write and the write that undid it come back in an arbitrary
 * order — which is the one thing an audit trail must not do. `seq` is what the screen orders by.
 *
 * Checked against something known rather than by counting distinct stamps. The last audited
 * thing done above was inviting The Newly Invited, so that is what the newest row must be.
 */
do $$
declare
  newest record;
  written integer;
begin
  select count(*) into written from portal.audit_log
   where seq > current_setting('verify.audit_from')::bigint;
  if written < 2 then
    raise exception 'FAIL: this run recorded only % changes, too few to say anything about order', written;
  end if;

  select subject_kind, action into newest
    from portal.audit_log
   where seq > current_setting('verify.audit_from')::bigint
   order by seq desc
   limit 1;

  if newest.subject_kind <> 'households' or newest.action <> 'insert' then
    raise exception 'FAIL: the newest line in the trail is % %, not the household just invited — the trail is not in the order things happened',
      newest.action, newest.subject_kind;
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

/*
 * The committee locking itself out — the one change with no way back through the app.
 *
 * Promoting somebody is admin-only, so the last admin demoting or deleting themselves takes the
 * key with them and leaves the SQL editor as the only door.
 *
 * "The last admin" is a fact about the whole table, which is why an earlier version of this
 * check was wrong: it assumed the only admins were the two it had made, and on a real database
 * the committee's own accounts are admins too. So the test household was never the last one,
 * the guard correctly did nothing, and the check called that a failure.
 *
 * Everything below therefore stands the real committee down first, so that one test household
 * genuinely is the last admin — and it is all inside the transaction this file rolls back, so
 * nobody's role actually changes. Run last for that reason.
 */
do $$
declare
  admins integer;
begin
  select count(*) into admins from portal.households where role = 'admin';
  if admins < 2 then
    raise exception 'FAIL: this check needs two admins to be meaningful, and found %', admins;
  end if;
end $$;

-- With somebody else holding the role, standing down is allowed.
update portal.households set role = 'member'
  where id = '11111111-1111-1111-1111-111111111111';

do $$
begin
  if (select role from portal.households where id = '11111111-1111-1111-1111-111111111111') <> 'member' then
    raise exception 'FAIL: an admin could not stand down while another one remained';
  end if;
end $$;

/*
 * Down to one, one at a time.
 *
 * A single `update ... where role = 'admin' and id <> …` would not do: the trigger fires per
 * row and asks whether any other admin is left, and rows changed earlier in the same statement
 * are not reliably visible to that question. A loop makes each demotion its own statement, and
 * each is legitimate because the test admin is still holding the role.
 */
do $$
declare
  standing_down record;
  remaining integer;
begin
  for standing_down in
    select id from portal.households
     where role = 'admin' and id <> '22222222-2222-2222-2222-222222222222'
  loop
    update portal.households set role = 'member' where id = standing_down.id;
  end loop;

  select count(*) into remaining from portal.households where role = 'admin';
  if remaining <> 1 then
    raise exception 'FAIL: could not reduce the committee to a single admin for this check; % left', remaining;
  end if;
end $$;

-- The last one cannot, by either route.
do $$
begin
  begin
    update portal.households set role = 'member'
      where id = '22222222-2222-2222-2222-222222222222';
    raise exception 'FAIL: the last admin could demote themselves, leaving nobody able to administer the site';
  exception when sqlstate '45001' then
    null;
  end;

  begin
    delete from portal.households where id = '22222222-2222-2222-2222-222222222222';
    raise exception 'FAIL: the last admin could delete their own household, leaving nobody able to administer the site';
  exception when sqlstate '45001' then
    null;
  end;

  if (select role from portal.households where id = '22222222-2222-2222-2222-222222222222') <> 'admin' then
    raise exception 'FAIL: the last admin lost the role after all';
  end if;
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
