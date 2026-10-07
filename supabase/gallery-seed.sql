-- 13Parbon Community: the back catalogue, from the bucket into the database.
--
-- Run AFTER portal.sql, and BEFORE this branch reaches main. Safe to run twice: albums are
-- matched by slug, and a photograph already pointing at the same object is left alone.
--
-- ---------------------------------------------------------------------------
-- Why this has to exist
-- ---------------------------------------------------------------------------
-- The gallery on the live site is not data. It is two arrays in src/lib/api/mock/fixtures.ts,
-- built from a naming convention: full/<slug>-NN.jpg and thumb/<slug>-NN.jpg. That worked
-- because the site read fixtures for everything.
--
-- This branch changes where the gallery reads from. Once it is live with Supabase configured,
-- the public gallery asks portal.albums and portal.media — which have never had a row in them.
-- Merging without running this empties the gallery on 13parbon.org.uk while all 63 photographs
-- sit untouched in R2, referenced by nothing.
--
-- ---------------------------------------------------------------------------
-- What it claims, and what it does not
-- ---------------------------------------------------------------------------
-- TWO ALBUMS, the two that are published. The fixtures carry a third, "Committee dinner",
-- which has no photographs in it: it exists so the members-only filter has something to hide
-- in tests. It is not seeded, because an empty album on the real site is a puzzle rather than
-- a feature, and the committee can make one from /admin/media the day they want it.
--
-- SIXTY-THREE PHOTOGRAPHS, counted from the bucket rather than from the fixtures: every key
-- from 01 to 28 and 01 to 35 was fetched over https before this file was written, and both
-- sizes answered 200 for all of them. The fixtures happened to agree. They are not the
-- authority — the bucket is.
--
-- NO CAPTIONS. The fixtures have none either, and for the reason written beside them: the
-- committee knows who is in these and what the moment was, and a guess here would be worse
-- than the silence. They can be written from /admin/media.
--
-- NO PINNED COVERS. Null means rotate, which is the default and is deliberate: one photograph
-- is not the whole of an evening, so a different face fronts the album on each visit.
--
-- POSITION IS THE UPLOAD ORDER, 1 upward, which is the order they have always appeared in.
-- Without it inOrder() falls back to sorting by url, which gives the same answer here but only
-- by luck of the naming.

-- ---------------------------------------------------------------------------
-- The albums
-- ---------------------------------------------------------------------------
insert into portal.albums (slug, title, description, festival_id, published_at, visibility)
select v.slug, v.title, v.description, v.festival_id, v.published_at::timestamptz, 'public'
from (values
  (
    'boishakhi-2026',
    'Boishakhi 2026',
    'Our Boishakh evening at St Andrew’s Community Hall, April 2026.',
    'boishakhi',
    '2026-04-20T12:00:00Z'
  ),
  (
    'saraswati-puja-2026',
    'Saraswati Puja 2026',
    'Morning pujo and hatekhori, February 2026.',
    'saraswati-puja',
    '2026-02-05T12:00:00Z'
  )
) as v (slug, title, description, festival_id, published_at)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- The photographs
-- ---------------------------------------------------------------------------
-- Keys are built here rather than listed, because they are a convention and writing them out
-- sixty-three times invites one of them to be wrong in a way nobody reads carefully enough to
-- catch. The `not exists` is what makes a second run harmless: media has no unique key on url,
-- so without it the albums would quietly double.
insert into portal.media (album_id, type, url, thumbnail_url, approved, position)
select
  a.id,
  'photo',
  'https://photos.13parbon.org.uk/full/' || a.slug || '-' || lpad(n::text, 2, '0') || '.jpg',
  'https://photos.13parbon.org.uk/thumb/' || a.slug || '-' || lpad(n::text, 2, '0') || '.jpg',
  true,
  n
from portal.albums a
join (values
  ('boishakhi-2026', 28),
  ('saraswati-puja-2026', 35)
) as c (slug, how_many) on c.slug = a.slug
cross join lateral generate_series(1, c.how_many) as n
where not exists (
  select 1
  from portal.media m
  where m.album_id = a.id
    and m.url = 'https://photos.13parbon.org.uk/full/' || a.slug || '-' || lpad(n::text, 2, '0') || '.jpg'
);

-- ---------------------------------------------------------------------------
-- What just happened
-- ---------------------------------------------------------------------------
-- Expect 28 and 35. A smaller number on a first run means a key was already there; a larger
-- one should not be possible.
select a.slug, count(m.id) as photographs, min(m.position) as first, max(m.position) as last
from portal.albums a
left join portal.media m on m.album_id = a.id
where a.slug in ('boishakhi-2026', 'saraswati-puja-2026')
group by a.slug
order by a.slug;
