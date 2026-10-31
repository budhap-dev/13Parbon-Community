-- 13Parbon Community: which households have paid for which membership year.
--
-- Run this AFTER portal.sql, once, in the Supabase SQL editor. Then run
-- verify-membership-payments.sql. Safe to run again: every statement replaces what it finds.
--
-- A membership year runs from 1 April to 31 March, and `year` is the April it starts in: 2026 is
-- 1 April 2026 to 31 March 2027, written "2026–27" on the screens. One row says that household
-- paid for that year. No row is not paid — so a new year starts with nobody paid, and the
-- committee ticks households off as the money comes in.
--
-- Its own table rather than a column on households, because the committee wants to see each
-- year, not only the latest. `households.membership_paid_to` stays where it is, unwritten by the
-- app from now on; it holds whatever was typed before this existed.
--
-- Who can do what:
--   * The committee reads and writes every row.
--   * A household reads its own rows and nobody else's: whether a neighbour has paid is not
--     another member's business.
--   * Nobody else reaches it. A visitor has no grant at all.
--
-- Every change leaves a line in the audit trail, through the same trigger as everything else.
--
-- Safe to run before or after the code that uses it is deployed. Until it has run, the app reads
-- every household as not paid and says so; ticking one is refused with "does not exist".

create table if not exists portal.membership_payments (
  -- Its own id so the audit trail, which records rows by `id`, can say which line this was.
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references portal.households (id) on delete cascade,
  year smallint not null check (year between 2000 and 2100),
  paid_on date not null default current_date,
  created_at timestamptz not null default now(),
  unique (household_id, year)
);

comment on table portal.membership_payments is
  'One row per household per membership year paid. year is the April the year starts in (2026 = Apr 2026 to Mar 2027).';

create index if not exists membership_payments_year_idx on portal.membership_payments (year);

alter table portal.membership_payments enable row level security;

grant select, insert, update, delete on portal.membership_payments to authenticated;
revoke all on portal.membership_payments from anon;

drop policy if exists "household reads own payments" on portal.membership_payments;
create policy "household reads own payments"
  on portal.membership_payments for select to authenticated
  using (household_id = portal.current_household_id() or portal.is_admin());

drop policy if exists "admins record payments" on portal.membership_payments;
create policy "admins record payments"
  on portal.membership_payments for insert to authenticated
  with check (portal.is_admin());

drop policy if exists "admins change payments" on portal.membership_payments;
create policy "admins change payments"
  on portal.membership_payments for update to authenticated
  using (portal.is_admin())
  with check (portal.is_admin());

drop policy if exists "admins remove payments" on portal.membership_payments;
create policy "admins remove payments"
  on portal.membership_payments for delete to authenticated
  using (portal.is_admin());

drop trigger if exists record_change on portal.membership_payments;
create trigger record_change after insert or update or delete on portal.membership_payments
  for each row execute function portal.record_change();

-- PostgREST learns about a new table, and the households -> membership_payments link the app
-- reads through, on its next schema reload. Asking for one now saves waiting for it.
notify pgrst, 'reload schema';

do $$
begin
  raise notice 'membership-payments: OK';
end;
$$;
