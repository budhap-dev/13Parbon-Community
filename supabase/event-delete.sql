-- Deleting an evening.
--
-- Run once on the live project, in the SQL editor, after portal.sql. Safe to run again: every
-- statement replaces what it would otherwise duplicate. The same lines are in portal.sql, so a
-- fresh project, or portal.sql run again, ends up the same.
--
-- Until now an evening could be archived and never removed, which left a test evening — or one
-- typed twice — in the committee's list for good. The committee can delete one now, and the
-- database refuses where deleting would lose history somebody else is holding:
--
--   * a headcount recorded against it (portal.event_attendance), which is the community's record
--     of who came; archive it instead
--   * an album filed under it (portal.albums), whose photographs would be left pointing at an
--     evening that no longer exists; move or delete the album first
--
-- Either may name the evening by its slug or by its id: despite the column's name, the portal's
-- headcount form has always saved the id there, so both are checked.
--
-- Both refusals are 45003 with a sentence fit to show somebody, the same as the last-admin guard
-- (45001) and the superadmin guard (45002).

grant delete on portal.events to authenticated;

drop policy if exists "admins delete events" on portal.events;
create policy "admins delete events"
  on portal.events for delete to authenticated using (portal.is_admin());

create or replace function portal.guard_event_delete() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from portal.event_attendance where event_slug in (old.slug, old.id::text)) then
    raise exception 'This evening has a headcount recorded, so it stays. Archive it instead.'
      using errcode = '45003';
  end if;
  if exists (select 1 from portal.albums where event_slug in (old.slug, old.id::text)) then
    raise exception 'A photo album is filed under this evening. Move the album to another evening, or delete it, first.'
      using errcode = '45003';
  end if;
  return old;
end;
$$;

drop trigger if exists guard_event_delete on portal.events;
create trigger guard_event_delete
  before delete on portal.events
  for each row execute function portal.guard_event_delete();

-- A deleted evening is worth a line in the trail as much as a published one: "where did that
-- go?" is asked as often as "who put it up?".
drop trigger if exists record_change on portal.events;
create trigger record_change after insert or update or delete on portal.events
  for each row execute function portal.record_change();
