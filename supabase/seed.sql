-- 13Parbon Community: sample households, to fill the screens while this is being built.
--
-- Run AFTER portal.sql, in the Supabase SQL editor. Safe to run twice: nothing here overwrites
-- anything, and the households are matched by name.
--
-- ---------------------------------------------------------------------------
-- These are not real people
-- ---------------------------------------------------------------------------
-- Eight invented households, carried over from the fixtures the app has been built against.
-- They exist so the committee screens have something to show — a lapsed membership, a
-- household that keeps out of the directory, one that has never signed in, two admins — rather
-- than being empty on the day you switch over and looking broken.
--
-- Take them out before the first real household goes in:
--
--   delete from portal.people where household_id in (select id from portal.households where email like '%@example.com');
--   delete from portal.households where email like '%@example.com';
--
-- ---------------------------------------------------------------------------
-- Every sign-in address is deliberately null
-- ---------------------------------------------------------------------------
-- The fixtures carried addresses like rina.sen@gmail.com. Those are invented too — but an
-- invented Gmail address is not necessarily an unused one, and a real person who happens to own
-- it would be matched to a household and shown its contents. So none are seeded, and nobody can
-- sign in as any of these.
--
-- To give yourself one, uncomment the line you want at the bottom.

insert into portal.households
  (id, name, contact_name, email, phone, google_email, interests, member_since,
   membership_status, membership_paid_to, role, listed_in_directory, share_email, share_phone)
values
  (gen_random_uuid(), 'The Sens', 'Rina Sen', 'rina@example.com', null,
   null, array['Cooking', 'Stage and sound']::text[], '2024-04-01', 'active', '2027-03-31', 'member',
   true, true, false),
  (gen_random_uuid(), 'The Chatterjees', 'Debashis Chatterjee', 'debashis@example.com', null,
   null, array['Sound', 'Photos']::text[], '2021-01-10', 'active', '2027-03-31', 'admin',
   true, true, false),
  (gen_random_uuid(), 'The Banerjees', 'Anita Banerjee', 'anita@example.com', null,
   null, array['Cooking']::text[], '2022-03-14', 'active', '2027-03-31', 'admin',
   true, true, false),
  (gen_random_uuid(), 'The Ghoshes', 'Meera Ghosh', 'meera@example.com', null,
   null, array['Children''s programme']::text[], '2026-09-01', 'active', '2027-03-31', 'member',
   true, true, false),
  (gen_random_uuid(), 'The Roys', 'Kaushik Roy', 'kaushik@example.com', null,
   null, array['Treasury']::text[], '2023-11-02', 'active', '2027-03-31', 'member',
   true, true, false),
  (gen_random_uuid(), 'The Mitras', 'Sanjay Mitra', 'sanjay@example.com', null,
   null, array[]::text[], '2025-02-20', 'active', '2027-03-31', 'member',
   false, false, false),
  (gen_random_uuid(), 'The Palits', 'Joy Palit', 'joy@example.com', null,
   null, array[]::text[], '2020-02-11', 'lapsed', '2026-03-31', 'member',
   false, false, false),
  (gen_random_uuid(), 'The Dases', 'Ruma Das', 'ruma@example.com', null,
   null, array['Decorations']::text[], '2026-08-25', 'active', '2027-03-31', 'member',
   false, false, false)
on conflict do nothing;

insert into portal.people (household_id, name, age_group, age, note)
select id, v.name, v.age_group, v.age, v.note from portal.households h
cross join (values
  ('Rina Sen', 'adult', null::smallint, 'Sings, happy to help on stage'),
  ('Arjun Sen', 'adult', null::smallint, 'Vegetarian'),
  ('Mira Sen', 'child', 7::smallint, 'Dance group')
) as v(name, age_group, age, note)
where h.name = 'The Sens';

insert into portal.people (household_id, name, age_group, age, note)
select id, v.name, v.age_group, v.age, v.note from portal.households h
cross join (values
  ('Debashis Chatterjee', 'adult', null::smallint, null)
) as v(name, age_group, age, note)
where h.name = 'The Chatterjees';

insert into portal.people (household_id, name, age_group, age, note)
select id, v.name, v.age_group, v.age, v.note from portal.households h
cross join (values
  ('Anita Banerjee', 'adult', null::smallint, null),
  ('Sujoy Banerjee', 'adult', null::smallint, null),
  ('Ishan Banerjee', 'child', 11::smallint, null),
  ('Tara Banerjee', 'child', 6::smallint, null)
) as v(name, age_group, age, note)
where h.name = 'The Banerjees';

insert into portal.people (household_id, name, age_group, age, note)
select id, v.name, v.age_group, v.age, v.note from portal.households h
cross join (values
  ('Meera Ghosh', 'adult', null::smallint, null),
  ('Ria Ghosh', 'child', 9::smallint, null),
  ('Neel Ghosh', 'child', 4::smallint, null)
) as v(name, age_group, age, note)
where h.name = 'The Ghoshes';

insert into portal.people (household_id, name, age_group, age, note)
select id, v.name, v.age_group, v.age, v.note from portal.households h
cross join (values
  ('Kaushik Roy', 'adult', null::smallint, null),
  ('Sharmila Roy', 'adult', null::smallint, null)
) as v(name, age_group, age, note)
where h.name = 'The Roys';

insert into portal.people (household_id, name, age_group, age, note)
select id, v.name, v.age_group, v.age, v.note from portal.households h
cross join (values
  ('Sanjay Mitra', 'adult', null::smallint, null),
  ('Ruma Mitra', 'adult', null::smallint, null),
  ('Ayan Mitra', 'child', 12::smallint, null)
) as v(name, age_group, age, note)
where h.name = 'The Mitras';

insert into portal.people (household_id, name, age_group, age, note)
select id, v.name, v.age_group, v.age, v.note from portal.households h
cross join (values
  ('Joy Palit', 'adult', null::smallint, null),
  ('Sudipa Palit', 'adult', null::smallint, null),
  ('Rohan Palit', 'child', 15::smallint, null)
) as v(name, age_group, age, note)
where h.name = 'The Palits';

insert into portal.people (household_id, name, age_group, age, note)
select id, v.name, v.age_group, v.age, v.note from portal.households h
cross join (values
  ('Ruma Das', 'adult', null::smallint, null),
  ('Bikram Das', 'adult', null::smallint, null)
) as v(name, age_group, age, note)
where h.name = 'The Dases';

insert into portal.documents (title, category, file_url, added_on) values
  ('Annual general meeting minutes 2026', 'minutes', '#', '2026-08-20'),
  ('How we run a programme', 'guidelines', '#', '2026-06-02'),
  ('Constitution', 'guidelines', '#', '2025-01-14'),
  ('Stage plan and equipment list', 'resources', '#', '2026-09-03')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Giving yourself a household
-- ---------------------------------------------------------------------------
-- Until you do this you sign in as an admin with "No household yet", which is the fallback for
-- an allowed address the committee has not recorded. It works, but it exercises none of the
-- interesting rules: you see everything because you are an admin, not because a policy let you.
--
-- Put your own Google address in ONE of these and run it.

-- As an ordinary member. This is the one worth doing: sign in, and check that the other seven
-- households are simply not there. That is the whole of row level security, seen from a browser.
-- update portal.households set google_email = 'you@gmail.com' where name = 'The Sens';

-- As the committee. Everything, because a policy says so rather than because nothing stopped you.
-- update portal.households set google_email = 'you@gmail.com' where name = 'The Chatterjees';

-- And to hand it back afterwards:
-- update portal.households set google_email = null where google_email = 'you@gmail.com';
