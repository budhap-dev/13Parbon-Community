-- 13Parbon Community: the faces the public About page may show.
--
-- Run this AFTER portal.sql and people-photo.sql, once, in the Supabase SQL editor. It is safe to
-- run again: it replaces the function.
--
-- The About page is public and portal.people is not: a visitor cannot read a household's people,
-- and must not be able to. This function is the one way through, and it is narrow. It returns the
-- photograph of a grown-up only where their name is already printed on the About page — in the
-- committee or on the members' roll, as the committee last saved them in portal.site_settings.
-- Nobody else's, and nothing else about anybody: a name and an address, both already public.
--
-- It takes no argument on purpose. One that took a name would let anybody ask for the face of
-- whoever they could guess the name of.
--
-- Names are compared without a Mr. or Mrs., capitals or doubled spaces — on both sides, because a
-- household may write the title too — so "Mr. Dalim Ghosh" on the roll finds "Dalim Ghosh" or
-- "Mr. Dalim Ghosh" in his household. The app does the same; see plainName().
--
-- If the roll has never been saved from the portal, the code's own copy of it is not in the
-- database and so cannot be matched here: saving the roll once from the portal fixes that.

-- One name as both sides might write it: no title, no capitals, single spaces.
create or replace function portal.plain_name(name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(regexp_replace(lower(btrim(name)), '^(mr|mrs|ms|miss|dr|prof)\.?\s+', ''), '\s+', ' ', 'g');
$$;

create or replace function portal.public_photos()
returns table (name text, photo_url text)
language sql
stable
security definer
set search_path = ''
as $$
  with lists as (
    select value from portal.site_settings
  ),
  published as (
    select entry ->> 'name' as name
      from lists,
           jsonb_array_elements(case when jsonb_typeof(value -> 'committee') = 'array' then value -> 'committee' else '[]'::jsonb end) as entry
     where jsonb_typeof(entry) = 'object'
    union
    select entry #>> '{}'
      from lists,
           jsonb_array_elements(case when jsonb_typeof(value -> 'members') = 'array' then value -> 'members' else '[]'::jsonb end) as entry
     where jsonb_typeof(entry) = 'string'
  ),
  plain as (
    select distinct portal.plain_name(name) as name
      from published
     where name is not null
  )
  select p.name, p.photo_url
    from portal.people p
   where p.age_group = 'adult'
     and p.photo_url is not null
     and portal.plain_name(p.name) in (select name from plain);
$$;

comment on function portal.public_photos() is
  'The profile photographs of grown-ups whose names are already on the public About page, and nobody else''s.';

revoke all on function portal.public_photos() from public;
grant execute on function portal.public_photos() to anon, authenticated, service_role;

-- Proves it is there and answers. Changes nothing.
do $$
declare
  found integer;
begin
  select count(*) into found from portal.public_photos();
  raise notice 'public-photos: OK, % photograph(s) published', found;
end;
$$;
