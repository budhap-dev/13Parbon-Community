-- 13Parbon Community: a grown-up's own photograph, beside their name.
--
-- Run this AFTER portal.sql, once, in the Supabase SQL editor. It is safe to run twice.
--
-- Its own file because portal.sql has been run against the live project, and an edit there would
-- reach nobody. One new column on portal.people, and nothing else changes: the policies on that
-- table already keep a person's row inside their own household and the committee, and the audit
-- trigger already records changes to it.
--
-- What it holds: the address of the square photograph in the photographs bucket, which the app
-- uploads after stripping everything a phone writes into a picture. The file is in the bucket, not
-- here. Adults only: the app never sends one for a child, and the check below refuses one anyway.
--
-- Safe to run before or after the code that uses it is deployed. The app only sends the column
-- when somebody has added a photograph, so saves that do not use it work either way; adding one
-- before this has run is refused by the database with "column does not exist".

alter table portal.people
  add column if not exists photo_url text
  check (photo_url is null or (photo_url ~ '^https://[^[:space:]]+\.jpg$' and age_group = 'adult'));

comment on column portal.people.photo_url is
  'Optional. The address of an adult''s own profile photograph in the photographs bucket. Null for none, and always null for a child.';

-- Proves the column is there and refuses a child's photograph. Leaves nothing behind.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'portal' and table_name = 'people' and column_name = 'photo_url'
  ) then
    raise exception 'FAIL: portal.people.photo_url is missing';
  end if;

  begin
    insert into portal.people (household_id, name, age_group, photo_url)
      select id, 'Check row', 'child', 'https://photos.example/full/x.jpg' from portal.households limit 1;
    if found then
      raise exception 'FAIL: photo_url took a photograph of a child';
    end if;
  exception
    when check_violation then null; -- what should happen
  end;

  raise notice 'people-photo: OK';
end;
$$;
