-- 13Parbon Community: who the superadmin is.
--
-- Run this in the Supabase SQL editor, AFTER portal.sql. If the database was set up before
-- 2026-10-01, re-run portal.sql first: the table and the guard this file relies on arrived
-- then, and portal.sql is written to be run again. Then verify.sql, which should still end
-- with "All portal rules hold."
--
-- What an address in this table gets, all of it decided by the database (see portal.sql,
-- "The account the rest of the committee cannot remove"):
--
--   * It is an admin whatever any household row says, and with no household at all.
--   * No other admin can remove its household, change its role, or change or clear the
--     address that signs it in.
--   * No other admin can give the address to a household of their own making.
--
-- And what it does not get: any mention in the app. Nothing that arrives through the API can
-- read this table, so there is no label, no badge and no row for anybody to come across. To
-- another admin the household looks like any other committee household until they try one of
-- the three things above, and then they are told that it cannot be done — not why.
--
-- This file is the only way in or out of the list, on purpose. A screen that could add a
-- superadmin is a screen that could be used by whoever is signed in as an admin that day.
--
-- Safe to run more than once.

insert into portal.superadmins (email)
values
  ('panditbudhaditya@gmail.com')
  -- A second address for the same person goes on its own line, lowercased:
  -- , ('budhadityapandit@gmail.com')
on conflict (email) do nothing;

-- The app decides what to draw from the role on the household row. The guard keeps that row
-- at 'admin' from now on; this puts right a row that already said otherwise.
update portal.households
   set role = 'admin'
 where role <> 'admin'
   and google_email in (select email from portal.superadmins);

-- What you should see: one line per address. `household` is empty until that address has
-- been given one — which only that account, or this editor, can now do.
select s.email, s.added_at, h.name as household, h.role
  from portal.superadmins s
  left join portal.households h on h.google_email = s.email
 order by s.added_at;

-- To take an address off the list again:
--
--   delete from portal.superadmins where email = 'somebody@example.com';
--
-- Its household, if it has one, stays as it is and becomes an ordinary committee household
-- that any admin can demote or remove.
