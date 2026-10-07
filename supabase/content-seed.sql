-- 13Parbon Community: the words on the live site, from the fixtures into the database.
--
-- Run AFTER portal.sql, and BEFORE this branch reaches main. Safe to run twice: posts are
-- matched by slug, notices by their title, and anything already there is left alone.
--
-- The sister of gallery-seed.sql, which did this for the 63 photographs on 2026-09-17. The
-- same reasoning had not been applied to anything written.
--
-- ---------------------------------------------------------------------------
-- Why this has to exist
-- ---------------------------------------------------------------------------
-- The notices on the home page and the pieces on /news are not data. They are arrays in
-- src/lib/api/mock/fixtures.ts, and that worked because the site read fixtures for everything.
--
-- This branch changes where they are read from. With Supabase configured, `withSupabaseNews`
-- takes over and the public pages ask portal.news_posts and portal.announcements — which, when
-- this was written, held no posts and one notice. Merging without this empties the news page
-- and takes both notices off the home page, while the text sits in a file that nothing reads.
--
-- ---------------------------------------------------------------------------
-- What it claims, and what it does not
-- ---------------------------------------------------------------------------
-- PARITY, NOT IMPROVEMENT, WITH ONE EXCEPTION. Every row below is what 13parbon.org.uk shows
-- today, moved without being rewritten, and where the fixtures carry something awkward it is
-- carried too and listed at the foot of this file. A seed that quietly improves the words is a
-- seed nobody can check against the live site.
--
-- The exception is invented headcounts, which are not carried at any price. A made-up number is
-- not an awkward sentence; it is a claim about what happened, and this community's own record is
-- the only place anybody will look it up. See the foot of the file.
--
-- TWO NOTICES, the two the public sees. The fixtures carry two more: one for members whose body
-- is the word "Members only.", and one that expired in April whose body is "Already over.".
-- Both exist so the audience and expiry filters have something to hide in tests. Neither is a
-- notice anybody wrote for a noticeboard, so neither is seeded.
--
-- THREE PIECES OF NEWS, all three published, with their original dates kept. A round-up of
-- February that arrived dated today would sit at the top of the list as though it were new.
--
-- NO NEWSLETTERS. The fixtures hold two, titled "[Newsletter title], Autumn 2026" and the same
-- for Spring, with "#" where the file should be. That is a placeholder waiting for a PDF, not a
-- newsletter, and seeding it would put a dead link on the real site. The page shows an empty
-- list until the committee uploads one, which is the truth.
--
-- NOTHING FOR FESTIVALS OR VOLUNTEER ROLES. Neither has a table: `api.festivals` and
-- `api.volunteering` have no Supabase adapter, so they keep reading the fixtures after the
-- merge and need nothing here.
--
-- TIMES CARRY AN OFFSET. The fixtures write "2026-09-01T09:00:00" with no timezone, which every
-- browser reads as its own local nine o'clock. A timestamptz is an instant, so each one below
-- says +01 or +00 — British Summer Time until 25 October, GMT after it.

-- ---------------------------------------------------------------------------
-- The notices
-- ---------------------------------------------------------------------------
-- Matched by title rather than by id: the fixtures' ids are strings like 'an-register' and the
-- column is a uuid, so the title is the only thing the two sides share.
insert into portal.announcements (title, body, pinned, audience, publish_at, expires_at, link_label, link_to)
select
  'Registrations are open for the Mahalaya cultural programme',
  'Tell us how many from your household are coming so we can plan the seating and the food.',
  true,
  'public',
  timestamptz '2026-08-28 09:00+01',
  -- Expires as the evening ends, so it takes itself off the home page without anybody deciding.
  timestamptz '2026-10-10 17:00+01',
  'What is happening that day',
  '/events/mahalaya-cultural-programme-2026'
where not exists (
  select 1 from portal.announcements
  where title = 'Registrations are open for the Mahalaya cultural programme'
);

insert into portal.announcements (title, body, pinned, audience, publish_at, expires_at, link_label, link_to)
select
  'A Festival is Best Shared',
  'We warmly welcome volunteers for our Cultural Programme on Saturday, 10 October. If you would like to be part of making the day special, please let us know.',
  false,
  'public',
  timestamptz '2026-09-01 09:00+01',
  null,
  'Register and say so',
  '/events/mahalaya-cultural-programme-2026'
where not exists (
  select 1 from portal.announcements where title = 'A Festival is Best Shared'
);

-- ---------------------------------------------------------------------------
-- The news: not seeded, 2026-09-17
-- ---------------------------------------------------------------------------
-- Three pieces were carried here on the first run of this file, on the same parity argument as
-- the notices: they were on the live site, so they came across. That was the wrong test to
-- apply to them.
--
-- The committee did not write them. They are sample writing that arrived with the fixtures, to
-- give the news screens something to draw — one of them still carried "[DATE]" where a deadline
-- should be, which is what a piece nobody wrote looks like. Notices are a different matter: the
-- two below are the committee's own words, the second of them the same sentence as the event's
-- call for volunteers.
--
-- If they were seeded before this file was amended, they are removed by hand — the app has no
-- delete for a piece, by design:
--
--   delete from portal.news_posts
--   where slug in (
--     'mahalaya-programme-what-to-expect',
--     'saraswati-puja-2026-thank-you',
--     'we-have-a-hall-for-the-year'
--   );
--
-- The news page shows nothing until the committee writes something, which is the truth. The
-- `showNews` switch is off in site_settings, so it is not even a page yet.

-- ---------------------------------------------------------------------------
-- What just happened
-- ---------------------------------------------------------------------------
-- Expect no posts and at least the two notices. Fewer notices means they were already there.
select 'news_posts (expected 0)' as what, count(*) from portal.news_posts
union all
select 'announcements', count(*) from portal.announcements
union all
select 'events', count(*) from portal.events
union all
select 'newsletters (expected 0)', count(*) from portal.newsletters;

-- ---------------------------------------------------------------------------
-- Carried over warts, to fix from the portal once this is in
-- ---------------------------------------------------------------------------
-- 1. The headcounts are gone rather than seeded, 2026-09-17: the committee never counted, and
--    the numbers in the fixtures were invented.
--
--    "Households booked so far" went further and was removed altogether — the field in the
--    designer, the line on the members' dashboard, and every mapping between them. Nothing reads
--    the booking form, so the number could only ever be a guess somebody typed, printed to
--    members as though it were a count.
--
--    `households_registered` is therefore a column nothing writes and nothing reads. It is left
--    in place because dropping a column is not something a seed file should do behind anybody's
--    back. To be rid of it, and only when you are content that no other tool reads it:
--
--    alter table portal.events drop column households_registered;
