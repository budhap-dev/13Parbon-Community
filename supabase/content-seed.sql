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
-- The news
-- ---------------------------------------------------------------------------
-- `slug` is unique, so on conflict is enough here and a second run changes nothing.
insert into portal.news_posts (slug, title, excerpt, body, tags, author, published_at, hidden)
values
  (
    'mahalaya-programme-what-to-expect',
    'Mahalaya programme: what to expect on the night',
    'Songs, dance and a short play, with the children opening the evening. Here is how the night will run.',
    'The evening opens at five with the children’s choir, followed by the dance group and a short play written by our own members.

There will be a break for tea and snacks halfway through. Dinner is served after the final act.

If your family would like a slot on the programme, speak to the cultural secretary before [DATE].',
    array['Updates'],
    'The committee',
    timestamptz '2026-09-01 10:00+01',
    false
  ),
  (
    'saraswati-puja-2026-thank-you',
    'Saraswati Puja 2026: thank you',
    'Morning pujo, hatekhori for the children, and lunch together — thank you to everybody who made it happen.',
    'Thank you to everyone who came, cooked, decorated and cleared up.

The children had their hatekhori, and the photographs from the morning are in the gallery.',
    array['Success stories'],
    'The committee',
    -- February, so GMT rather than BST.
    timestamptz '2026-02-14 10:00+00',
    false
  ),
  (
    'we-have-a-hall-for-the-year',
    'We have a hall for the whole year',
    'After two years of moving between venues, every programme this year is booked in one place.',
    'After two years of moving between venues, we have booked St Andrew’s Community Hall for every programme this year.

That means one address to remember, one parking arrangement, and a stage we can decorate the way we want.',
    array['Success stories', 'Updates'],
    'The committee',
    timestamptz '2026-05-20 10:00+01',
    false
  )
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- What just happened
-- ---------------------------------------------------------------------------
-- Expect three posts and at least the two notices below. Fewer means they were already there.
select 'news_posts' as what, count(*) from portal.news_posts
union all
select 'announcements', count(*) from portal.announcements
union all
select 'events', count(*) from portal.events
union all
select 'newsletters (expected 0)', count(*) from portal.newsletters;

-- ---------------------------------------------------------------------------
-- Carried over warts, to fix from the portal once this is in
-- ---------------------------------------------------------------------------
-- 1. "[DATE]" is live on the site today, in the Mahalaya piece. The evening is 10 October, so
--    the deadline is some date before it — the committee's to choose. When they have:
--
--    update portal.news_posts
--    set body = replace(body, '[DATE]', '<the date>')
--    where slug = 'mahalaya-programme-what-to-expect';
--
-- 2. The headcounts are gone rather than seeded, 2026-09-17: the committee never counted, and
--    the numbers in the fixtures were invented. "Forty households" and "twelve children" are out
--    of the Saraswati piece.
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
