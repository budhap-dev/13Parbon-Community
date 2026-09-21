-- Checks that the feedback rules hold. Run in the Supabase SQL editor after feedback.sql.
--
-- Written the same way as verify.sql and for the same reason: every block below is something
-- that would be a real problem if it were allowed, each raises if the rule is not doing its
-- job, and a clean run is silence followed by the final notice. The whole file runs in a
-- transaction and rolls back, so it leaves nothing behind.
--
-- Seeding happens as the owner, who bypasses policies. Everything after that runs as `anon`
-- or `authenticated`, with `request.jwt.claims` set by hand — the same claim `auth_email()`
-- and `auth_name()` read — so the checks actually exercise row level security rather than
-- describing it.
--
-- This file assumes verify.sql's two households do not exist and makes its own, so the two
-- can be run in either order or on their own.

begin;

-- ---------------------------------------------------------------------------
-- First: is the database actually running the current feedback.sql?
-- ---------------------------------------------------------------------------
/*
 * This file and feedback.sql are a pair, and nothing makes you run them together. Edit the
 * schema, run only the checks, and the failure arrives a hundred and fifty lines later
 * wearing the wrong name — the first time this happened it reported that the name on a signed
 * piece of feedback was "Priya" rather than "Priya Sharma", which reads as a bug in the
 * trigger rather than as an un-run migration.
 *
 * So the version is checked here, where the answer is "re-run feedback.sql" rather than
 * "something is wrong with your database".
 */
set local request.jwt.claims = '{"email": "preflight@example.com", "user_metadata": {"full_name": "Preflight  Person"}}';

do $$
declare
  got text;
begin
  if to_regprocedure('portal.auth_name()') is null then
    raise exception 'FAIL: portal.auth_name() does not exist. Run supabase/feedback.sql first.';
  end if;

  select portal.auth_name() into got;

  -- The whole name, with the doubled space collapsed. A bare 'Preflight' is the pre-2026-09-21
  -- function, which cut the name to its first word.
  if got = 'Preflight' then
    raise exception 'FAIL: this database has the older portal.auth_name(), which keeps only the first name. Re-run supabase/feedback.sql, then run this file again.';
  end if;
  if got is distinct from 'Preflight Person' then
    raise exception 'FAIL: portal.auth_name() returned %, which is neither name this file knows about. Re-run supabase/feedback.sql.', coalesce(got, 'null');
  end if;
end $$;

set local request.jwt.claims = '';


-- ---------------------------------------------------------------------------
-- Seed, as the owner
-- ---------------------------------------------------------------------------

insert into portal.households (id, name, contact_name, email, google_email, role)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'The Feedback Members', 'A Member', 'fbmember@example.com', 'fbmember@example.com', 'member'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'The Feedback Admins', 'An Admin', 'fbadmin@example.com', 'fbadmin@example.com', 'admin')
on conflict (id) do nothing;

/*
 * Two rows, and the approved one has to be made in two steps. Worth reading, because the
 * reason is the rule this file exists to check.
 *
 * `portal.stamp_feedback` fires on *every* insert, the owner's included. It has no exception
 * for a privileged caller on purpose — an exception is a way in, and "the seed script needs
 * it" is how one gets added. So an insert claiming `status = 'approved'` and a name lands
 * pending and anonymous whoever sends it, and the first draft of this file seeded two pending
 * rows and then failed on its own first check, reporting that a visitor could see no approved
 * feedback. It was right.
 *
 * Nothing but an update can put a piece of feedback on the website. That is true of the
 * committee's screen, true of the SQL editor, and true here.
 */
insert into portal.feedback (id, message)
values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'This one is already on the website and everybody may read it.'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'This one is still waiting and nobody outside the committee may read it.')
on conflict (id) do nothing;

update portal.feedback
   set author_name = 'Meera Ghosh', signed_in = true, status = 'approved', reviewed_by = 'An Admin', reviewed_at = now()
 where id = 'bbbbbbbb-0000-0000-0000-000000000001';

-- The seed is only a seed if it seeded. A silent `on conflict do nothing` against a row left
-- behind by an earlier run would leave every check below testing the wrong thing.
do $$
begin
  if (select status from portal.feedback where id = 'bbbbbbbb-0000-0000-0000-000000000001') <> 'approved' then
    raise exception 'FAIL: the seed could not put a piece of feedback on the website, so nothing below is being tested';
  end if;
  if (select status from portal.feedback where id = 'bbbbbbbb-0000-0000-0000-000000000002') <> 'pending' then
    raise exception 'FAIL: the waiting seed row is not waiting, so the checks below prove nothing';
  end if;
end $$;


-- ---------------------------------------------------------------------------
-- A visitor with no account
-- ---------------------------------------------------------------------------

reset role;
set local role anon;
set local request.jwt.claims = '';

do $$
declare
  visible integer;
  signed boolean;
  filed text;
begin
  -- Approved feedback is public. This is the whole point of the showcase, and the one read
  -- on this table that a stranger is meant to get an answer to.
  select count(*) into visible from portal.feedback;
  if visible <> 1 then
    raise exception 'FAIL: a visitor saw % pieces of feedback; only the approved one should be readable', visible;
  end if;

  if not exists (select 1 from portal.feedback where status = 'approved') then
    raise exception 'FAIL: a visitor could not read approved feedback, so the public page would be empty';
  end if;

  -- Leaving feedback has to work without an account, or the anonymous half of the feature
  -- does not exist.
  insert into portal.feedback (message) values ('A visitor with no account left this note for the committee.');

  -- And it has to arrive pending, whatever was asked for. Sending `status` is the obvious
  -- attack and the trigger is what stops it, not the absence of a field on the form.
  begin
    insert into portal.feedback (message, status)
    values ('This one tried to publish itself on the way in.', 'approved');
    -- The column grant should refuse this outright; if it somehow does not, the trigger must.
    select status into filed from portal.feedback
      where message = 'This one tried to publish itself on the way in.';
    if filed is distinct from 'pending' then
      raise exception 'FAIL: a visitor published their own feedback by sending status=%', filed;
    end if;
  exception when insufficient_privilege then
    null;
  end;

  -- Nor may a visitor sign somebody else's name to their words. There is no token, so there
  -- is no name, and the row lands anonymous however hard the request insists.
  insert into portal.feedback (message, signed_in)
  values ('Ticked the box with no account behind it.', true);

  reset role;
  select signed_in into signed from portal.feedback where message = 'Ticked the box with no account behind it.';
  if signed then
    raise exception 'FAIL: feedback was marked as signed in with no account behind it';
  end if;
  if (select author_name from portal.feedback where message = 'Ticked the box with no account behind it.') is not null then
    raise exception 'FAIL: a visitor with no token got a name attached to their feedback';
  end if;

  set local role anon;
  set local request.jwt.claims = '';

  -- Reviewing and deleting are the committee's, and anon holds no grant on either.
  begin
    update portal.feedback set status = 'approved' where status = 'pending';
    if found then
      raise exception 'FAIL: a visitor approved feedback';
    end if;
  exception when insufficient_privilege then
    null;
  end;

  begin
    delete from portal.feedback where status = 'approved';
    if found then
      raise exception 'FAIL: a visitor deleted feedback';
    end if;
  exception when insufficient_privilege then
    null;
  end;
end $$;


-- ---------------------------------------------------------------------------
-- Somebody signed in with Google
-- ---------------------------------------------------------------------------
-- A stranger with an account, which is exactly what a member of the public leaving signed
-- feedback is. They must reach no more of this table than a visitor does.

reset role;
set local role authenticated;
set local request.jwt.claims = '{"email": "stranger@example.com", "user_metadata": {"full_name": "Priya Sharma"}}';

do $$
declare
  visible integer;
  name_on_it text;
begin
  select count(*) into visible from portal.feedback;
  if visible <> 1 then
    raise exception 'FAIL: a signed-in stranger saw % pieces of feedback; only the approved one should be readable', visible;
  end if;

  insert into portal.feedback (message, signed_in)
  values ('Signed in with Google and happy to put my name to it.', true);

  reset role;
  select author_name into name_on_it from portal.feedback
    where message = 'Signed in with Google and happy to put my name to it.';

  /*
   * The whole name, from the token. Surname included since 2026-09-21: two people called
   * Priya are two people, and a showcase that cannot tell them apart attributes nothing.
   *
   * What still matters is where it came from. 'Priya Sharma' is what the token says, and the
   * only way for it to be anything else is for the browser to have chosen it — which is the
   * next check.
   */
  if name_on_it is distinct from 'Priya Sharma' then
    raise exception 'FAIL: the name on signed feedback was %, not the name from the token', coalesce(name_on_it, 'null');
  end if;
end $$;

-- The name cannot be chosen. Whatever the client sends in author_name is thrown away.
reset role;
set local role authenticated;
set local request.jwt.claims = '{"email": "stranger@example.com", "user_metadata": {"full_name": "Priya Sharma"}}';

do $$
declare
  name_on_it text;
begin
  begin
    insert into portal.feedback (message, signed_in, author_name)
    values ('Trying to sign this as somebody else entirely.', true, 'Debashis');
    reset role;
    select author_name into name_on_it from portal.feedback
      where message = 'Trying to sign this as somebody else entirely.';
    if name_on_it is distinct from 'Priya Sharma' then
      raise exception 'FAIL: feedback was signed %, a name the sender chose rather than one the token gave', coalesce(name_on_it, 'null');
    end if;
  exception when insufficient_privilege then
    -- The column grant refused it before the trigger was reached, which is the better answer.
    null;
  end;
end $$;

-- Being signed in is not being on the committee. A member is no closer to the queue than a
-- stranger is: feedback comes from the public and belongs to the committee alone.
reset role;
set local role authenticated;
set local request.jwt.claims = '{"email": "fbmember@example.com"}';

do $$
declare
  visible integer;
begin
  select count(*) into visible from portal.feedback where status <> 'approved';
  if visible <> 0 then
    raise exception 'FAIL: an ordinary member read % pieces of feedback that had not been approved', visible;
  end if;

  update portal.feedback set status = 'approved' where status = 'pending';
  if found then
    raise exception 'FAIL: an ordinary member approved feedback';
  end if;

  delete from portal.feedback where status = 'approved';
  if found then
    raise exception 'FAIL: an ordinary member deleted feedback';
  end if;
end $$;


-- ---------------------------------------------------------------------------
-- The committee
-- ---------------------------------------------------------------------------

reset role;
set local role authenticated;
set local request.jwt.claims = '{"email": "fbadmin@example.com"}';

do $$
declare
  visible integer;
  trail integer;
begin
  select count(*) into visible from portal.feedback;
  if visible < 2 then
    raise exception 'FAIL: the committee saw only % pieces of feedback and cannot review a queue they cannot read', visible;
  end if;

  update portal.feedback
     set status = 'approved', reviewed_by = 'An Admin', reviewed_at = now()
   where id = 'bbbbbbbb-0000-0000-0000-000000000002';
  if not found then
    raise exception 'FAIL: the committee could not approve a piece of feedback';
  end if;

  -- A decision has to say who made it. Half-recorded is a state the screens cannot produce
  -- and the SQL editor can, so the table refuses it.
  begin
    update portal.feedback set status = 'rejected', reviewed_by = null, reviewed_at = null
     where id = 'bbbbbbbb-0000-0000-0000-000000000002';
    raise exception 'FAIL: a piece of feedback was turned down by nobody, at no time';
  exception when check_violation then
    null;
  end;

  -- Approving is a change worth a line in the trail.
  select count(*) into trail from portal.audit_log
   where subject_kind = 'feedback' and subject_id = 'bbbbbbbb-0000-0000-0000-000000000002' and action = 'update';
  if trail = 0 then
    raise exception 'FAIL: approving a piece of feedback left no line in the audit trail';
  end if;
end $$;

-- Deleting records that it happened, and does not keep what was said.
reset role;
set local role authenticated;
set local request.jwt.claims = '{"email": "fbadmin@example.com"}';

do $$
declare
  kept jsonb;
begin
  delete from portal.feedback where id = 'bbbbbbbb-0000-0000-0000-000000000001';
  if found is not true then
    raise exception 'FAIL: the committee could not delete a piece of feedback';
  end if;

  reset role;
  select changes into kept from portal.audit_log
   where subject_kind = 'feedback' and subject_id = 'bbbbbbbb-0000-0000-0000-000000000001' and action = 'delete'
   order by seq desc limit 1;

  if kept is null then
    raise exception 'FAIL: deleting a piece of feedback left no line in the audit trail';
  end if;

  /*
   * And the words are not in it. This is the check the whole redacted-delete trigger exists
   * for: the reason to destroy a piece of feedback is that it should not be held, and a trail
   * that copied it into a table nobody can delete from would have kept it after all.
   */
  if kept ? 'message' then
    raise exception 'FAIL: deleting a piece of feedback copied what it said into the audit trail';
  end if;
  if kept -> 'status' is null then
    raise exception 'FAIL: the trail did not record what state the deleted feedback was in';
  end if;
end $$;

reset role;

do $$
begin
  raise notice 'All feedback rules hold.';
end $$;

rollback;
