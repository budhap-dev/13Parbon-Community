-- 13Parbon Community: how a person is drawn on their household's page.
--
-- Run this AFTER portal.sql, once, in the Supabase SQL editor. It is safe to run twice.
--
-- Its own file because portal.sql has been run against the live project, and an edit there would
-- reach nobody. One new column on portal.people, and nothing else changes: the policies on that
-- table already keep a person's row inside their own household and the committee, and the audit
-- trigger already records changes to it.
--
-- What it is for, and only for: the small picture beside each name on the household's own page.
-- Optional, and null means "not said", which draws a picture that is neither. Two answers rather
-- than four, because adult or child is already its own column.
--
-- Safe to run before or after the code that uses it is deployed. The app only sends the column
-- when somebody has chosen a picture, so saves that do not use it work either way; choosing one
-- before this has run is refused by the database with "column does not exist".

alter table portal.people
  add column if not exists shown_as text check (shown_as in ('female', 'male'));

comment on column portal.people.shown_as is
  'Optional. Draws the person as a woman/girl or man/boy on their own household''s page. Null is not said.';

-- Proves the column is there and refuses anything but the two answers. Leaves nothing behind.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'portal' and table_name = 'people' and column_name = 'shown_as'
  ) then
    raise exception 'FAIL: portal.people.shown_as is missing';
  end if;

  begin
    -- A row that breaks the check, inside a block that is rolled back whatever happens.
    insert into portal.people (household_id, name, age_group, shown_as)
      select id, 'Check row', 'adult', 'other' from portal.households limit 1;
    if found then
      raise exception 'FAIL: shown_as took a value other than female or male';
    end if;
  exception
    when check_violation then null; -- what should happen
  end;

  raise notice 'people-shown-as: OK';
end;
$$;
