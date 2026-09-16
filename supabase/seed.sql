-- 13Parbon Community: the membership, from the names on the About page.
--
-- Run AFTER portal.sql. Safe to run twice: households are matched by name, and a name already
-- there is left alone.
--
-- ---------------------------------------------------------------------------
-- What this claims, and what it does not
-- ---------------------------------------------------------------------------
-- 38 real people, each as a household of one, named after themselves.
--
-- ONE PERSON PER HOUSEHOLD because grouping them means knowing which families live together,
-- and this list does not say. Rename "Mr. Dalim Ghosh" to "The Ghoshes" and add the family from
-- /admin/people, where somebody knows the answer. See the note at the bottom before you do.
--
-- NO EMAIL ADDRESSES, because the About page carries none and inventing one would put an
-- untruth in the database. The column takes null for exactly this reason.
--
-- NO SIGN-IN ADDRESSES. A household without one is a record the committee keeps; a household
-- with one is somebody who can sign in. Nobody here can, which is the right default for people
-- who have not been asked.
--

insert into portal.households (name, contact_name, role, member_since)
select v.name, v.name, 'member', current_date
from (values
  ('Mr. Dalim Ghosh'),
  ('Mr. Subhendu Roy'),
  ('Mr. Dinesh Panda'),
  ('Mrs. Abhinanda Pandit'),
  ('Mrs. Pinki Ghosh'),
  ('Mrs. Kuhu Panda'),
  ('Mr. Budhaditya Pandit'),
  ('Mr. Somnath Das'),
  ('Mrs. Aditi Sengupta'),
  ('Mr. Amritasya Majumder'),
  ('Mrs. Amrita Roy'),
  ('Mr. Arunashish Banerjee'),
  ('Mrs. Puja Mukherjee'),
  ('Mr. Aveek Hazra'),
  ('Mrs. Madhumita Hazra'),
  ('Mr. Debashish Das'),
  ('Mrs. Saswati Ghoshal'),
  ('Mr. Digjoy Adhikary'),
  ('Mrs. Poulami Chaudhury'),
  ('Mr. Md Golam Murtuja'),
  ('Mrs. Swati Mondal'),
  ('Mr. Mrinal Maity'),
  ('Mrs. Ipsita Sarkar Maiti'),
  ('Mr. Jahir Tarafder'),
  ('Mrs. Munni Shah'),
  ('Mr. Rajjoy Adhikary'),
  ('Mrs. Piyali Nag'),
  ('Mr. Debashis Hatai'),
  ('Mrs. Rima Hatai'),
  ('Mr. Subhom Mitra'),
  ('Mrs. Saptaparna Mitra'),
  ('Mr. Sourangshu Roy'),
  ('Mrs. Sayani Ghosh'),
  ('Mrs. Payel Roy'),
  ('Mr. Siddhartha Chakraborty'),
  ('Mrs. Sulagna Chakraborty'),
  ('Mr. Subhashis Dutta'),
  ('Mrs. Sohini Dutta')
) as v(name)
where not exists (select 1 from portal.households h where h.name = v.name);

-- One adult each. Families are added from the screen, by people who know who they are.
insert into portal.people (household_id, name, age_group)
select h.id, h.contact_name, 'adult'
from portal.households h
where not exists (select 1 from portal.people p where p.household_id = h.id);


-- ---------------------------------------------------------------------------
-- Who can sign in
-- ---------------------------------------------------------------------------
-- Everybody above is a member with no way in. Sign-in comes one address at a time, and each one
-- is a decision: recording it is what opens the door.
--
-- The committee's Google addresses are already in this database, in the planner's public.people.
-- This copies them across for anybody whose name matches exactly — check what it matched before
-- trusting it, because the planner holds "Budhaditya" and "Rajjoy" with no surname, and the
-- names here carry a title.
--
--   update portal.households h set google_email = lower(trim(p.email))
--     from public.people p
--    where p.email is not null
--      and h.name like '%' || p.name || '%';
--
--   select name, google_email from portal.households where google_email is not null;
--
-- Then yourself — and **both columns in one statement**, which is the whole point of the next
-- three lines.
--
-- You are an admin today only because your address has no household: that is the fallback for an
-- allowed address the committee has not recorded. The moment it has one, your role comes from
-- that household instead. Set the address on its own and reload, and you are an ordinary member
-- of a household of one, with no way to promote anybody — including yourself.
--
--   update portal.households
--      set google_email = 'panditbudhaditya@gmail.com', role = 'admin'
--    where name = 'Mr. Budhaditya Pandit';
--
-- Everybody else is promoted from /admin/people, one at a time — chosen 2026-09-16. Six clicks
-- rather than a `case when`, and each one leaves a line in the audit trail saying who did it and
-- when, which is exactly the record you want for who can read every family's details.
--
-- The app will not let the last admin be demoted, so you cannot close the door behind you from
-- the screen. You can from here, which is why this says it twice.


-- ---------------------------------------------------------------------------
-- A pattern in the roll, for you to judge
-- ---------------------------------------------------------------------------
-- The names on the About page run in Mr./Mrs. pairs — Aveek and Madhumita Hazra, Debashis and
-- Rima Hatai, Subhom and Saptaparna Mitra, Siddhartha and Sulagna Chakraborty, Subhashis and
-- Sohini Dutta. Several pairs share no surname, which is ordinary, so the order says more than
-- the names do.
--
-- That is a strong hint and still a guess, and getting a family wrong in the committee's records
-- is its own kind of wrong. So nothing here acts on it. If the pairs are right, merging them is
-- a rename and a drag of one person into the other household, thirty-odd times, by somebody who
-- knows. If they are not, it is thirty-odd corrections nobody can see are needed.


-- ---------------------------------------------------------------------------
-- Undoing it
-- ---------------------------------------------------------------------------
--   delete from portal.people where household_id in (select id from portal.households);
--   delete from portal.households;
