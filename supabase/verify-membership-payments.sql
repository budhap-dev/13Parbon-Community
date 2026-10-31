-- Checks that the membership payment rules hold. Run in the Supabase SQL editor after
-- membership-payments.sql.
--
-- Written the same way as verify-polls-quizzes.sql: every block is something that would be a
-- real problem if it were allowed, each raises if a rule is not doing its job, and a clean run is
-- silence followed by the final notice. It runs in a transaction and rolls back, so it leaves
-- nothing behind. Seeding happens as the owner; everything after runs as `anon` or
-- `authenticated` with `request.jwt.claims` set by hand, so the checks exercise row level
-- security rather than describing it.

begin;

do $$
begin
  if to_regclass('portal.membership_payments') is null then
    raise exception 'FAIL: portal.membership_payments does not exist. Run supabase/membership-payments.sql first.';
  end if;
end $$;


-- ---------------------------------------------------------------------------
-- Seed, as the owner
-- ---------------------------------------------------------------------------

insert into portal.households (id, name, contact_name, email, google_email, role)
values
  ('abababab-0000-0000-0000-000000000001', 'The Payers', 'A Member', 'mpa@example.com', 'mpa@example.com', 'member'),
  ('abababab-0000-0000-0000-000000000002', 'The Neighbours', 'B Member', 'mpb@example.com', 'mpb@example.com', 'member'),
  ('abababab-0000-0000-0000-000000000003', 'The Treasurers', 'An Admin', 'mpadmin@example.com', 'mpadmin@example.com', 'admin')
on conflict (id) do nothing;

insert into portal.membership_payments (household_id, year)
values
  ('abababab-0000-0000-0000-000000000001', 2025),
  ('abababab-0000-0000-0000-000000000002', 2025)
on conflict do nothing;


-- ---------------------------------------------------------------------------
-- A visitor with no account
-- ---------------------------------------------------------------------------

reset role;
set local role anon;
set local request.jwt.claims = '';

do $$
declare
  n integer;
begin
  begin
    select count(*) into n from portal.membership_payments;
    raise exception 'FAIL: a visitor read % payments', n;
  exception when insufficient_privilege then null;
  end;
end $$;


-- ---------------------------------------------------------------------------
-- A member
-- ---------------------------------------------------------------------------

reset role;
set local role authenticated;
set local request.jwt.claims = '{"email": "mpa@example.com"}';

do $$
declare
  n integer;
begin
  -- Their own year, and not the neighbours'.
  select count(*) into n from portal.membership_payments
   where household_id in ('abababab-0000-0000-0000-000000000001', 'abababab-0000-0000-0000-000000000002');
  if n <> 1 then
    raise exception 'FAIL: a member read % payments, expected only their own one', n;
  end if;

  -- Marking themselves paid.
  begin
    insert into portal.membership_payments (household_id, year)
    values ('abababab-0000-0000-0000-000000000001', 2026);
    raise exception 'FAIL: a member marked their own household paid';
  exception when insufficient_privilege then null;
  end;

  -- Taking away a neighbour's payment, or their own. A blocked delete affects nothing rather
  -- than raising, so it is checked by looking, as the owner, below.
  delete from portal.membership_payments where year = 2025;
end $$;

reset role;
do $$
declare
  n integer;
begin
  select count(*) into n from portal.membership_payments
   where household_id in ('abababab-0000-0000-0000-000000000001', 'abababab-0000-0000-0000-000000000002')
     and year = 2025;
  if n <> 2 then
    raise exception 'FAIL: a member removed a payment (% of 2 left)', n;
  end if;
end $$;


-- ---------------------------------------------------------------------------
-- The committee
-- ---------------------------------------------------------------------------

reset role;
set local role authenticated;
set local request.jwt.claims = '{"email": "mpadmin@example.com"}';

do $$
declare
  n integer;
begin
  select count(*) into n from portal.membership_payments
   where household_id in ('abababab-0000-0000-0000-000000000001', 'abababab-0000-0000-0000-000000000002');
  if n <> 2 then
    raise exception 'FAIL: the committee read % payments, expected 2', n;
  end if;

  insert into portal.membership_payments (household_id, year)
  values ('abababab-0000-0000-0000-000000000002', 2026);

  -- The same year twice is one payment, not two.
  begin
    insert into portal.membership_payments (household_id, year)
    values ('abababab-0000-0000-0000-000000000002', 2026);
    raise exception 'FAIL: one household was recorded as paying for one year twice';
  exception when unique_violation then null;
  end;

  delete from portal.membership_payments
   where household_id = 'abababab-0000-0000-0000-000000000001' and year = 2025;
  if not found then
    raise exception 'FAIL: the committee could not mark a household not paid';
  end if;
end $$;

reset role;
do $$
begin
  if not exists (select 1 from portal.audit_log where subject_kind = 'membership_payments' and action = 'insert') then
    raise exception 'FAIL: marking a household paid left no line in the audit trail';
  end if;
  if not exists (select 1 from portal.audit_log where subject_kind = 'membership_payments' and action = 'delete') then
    raise exception 'FAIL: marking a household not paid left no line in the audit trail';
  end if;

  -- A household erased takes its payments with it.
  delete from portal.households where id = 'abababab-0000-0000-0000-000000000002';
  if exists (select 1 from portal.membership_payments where household_id = 'abababab-0000-0000-0000-000000000002') then
    raise exception 'FAIL: removing a household left its payments behind';
  end if;
end $$;

do $$
begin
  raise notice 'All membership payment rules hold.';
end $$;

rollback;
