-- 13Parbon Community: polls and quizzes.
--
-- Run this AFTER schema.sql, portal.sql and feedback.sql, once, in the Supabase SQL editor.
-- Then run verify-polls-quizzes.sql, which proves the rules below hold rather than merely
-- having been typed. Safe to run again: every statement replaces what it finds.
--
-- ---------------------------------------------------------------------------
-- The rules, and where each one is kept
-- ---------------------------------------------------------------------------
-- The committee writes polls and quizzes; members answer them; anybody may play a quiz the
-- committee has opened to everyone. Sign-in is per household, so the unit of a vote and of a
-- score is the household.
--
--   1. One vote per household per poll, changeable while the poll is open. Votes go through
--      `cast_vote()` and nothing else: members hold no insert or update grant on the table.
--   2. A poll's totals, never who voted which way — unless the committee marked the poll
--      `named` before anybody voted. Members read their own vote and nobody else's; the
--      committee reads votes only on a named poll.
--   3. The right answers never leave the database before somebody has played. They live in
--      `quiz_answers`, which only the committee can read, and a quiz is marked by
--      `submit_quiz()`. The questions a visitor reads carry no hint of which option is right.
--   4. One attempt per household per quiz. A visitor's play is counted and nothing else about
--      it is kept — no row, no address, no score.
--   5. Once anybody has voted, a poll's choices cannot change; once anybody has played, a
--      quiz's questions cannot change. Changing them would quietly rewrite what people answered.
--   6. Votes and attempts are not in the audit trail. `record_change()` records which household
--      did what, and a line per vote would be the list of who voted which way that rule 2
--      promises does not exist.
--
-- A refusal a person should read arrives as SQLSTATE 45010 with the reason as its message,
-- and the app shows the message as it is.


-- ===========================================================================
-- 1. Polls
-- ===========================================================================

create table if not exists portal.polls (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 3 and 200),
  detail text not null default '' check (char_length(detail) <= 1000),
  options text[] not null check (cardinality(options) between 2 and 8),
  -- Decided before the first vote and not after: see the lock trigger below.
  named boolean not null default false,
  -- When members see the totals. 'committee' means only the committee ever does.
  results text not null default 'after_vote' check (results in ('after_vote', 'after_close', 'committee')),
  -- Null is a draft. Nobody but the committee sees a poll without an opening time.
  opens_at timestamptz,
  closes_at timestamptz,
  created_at timestamptz not null default now(),
  constraint polls_closes_after_opening check (closes_at is null or opens_at is null or closes_at > opens_at)
);

create index if not exists polls_opens_at_idx on portal.polls (opens_at desc);

create table if not exists portal.poll_votes (
  poll_id uuid not null references portal.polls (id) on delete cascade,
  household_id uuid not null references portal.households (id) on delete cascade,
  option integer not null check (option >= 0),
  voted_at timestamptz not null default now(),
  primary key (poll_id, household_id)
);


-- ===========================================================================
-- 2. Quizzes
-- ===========================================================================

-- The question bank. A question belongs to no quiz in particular, so next year's Durga Puja
-- quiz can reuse this year's.
create table if not exists portal.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  prompt text not null check (char_length(trim(prompt)) between 3 and 300),
  options text[] not null check (cardinality(options) between 2 and 6),
  image_url text check (image_url is null or image_url ~ '^https://'),
  explanation text not null default '' check (char_length(explanation) <= 600),
  tags text[] not null default '{}',
  -- The household that suggested it, by name, when they asked to be credited.
  credited_to text check (credited_to is null or char_length(credited_to) <= 120),
  created_at timestamptz not null default now()
);

-- Which option is right, kept apart from the question so that reading a question can never
-- read its answer. Only the committee can see this table.
create table if not exists portal.quiz_answers (
  question_id uuid primary key references portal.quiz_questions (id) on delete cascade,
  correct integer not null check (correct >= 0)
);

create table if not exists portal.quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 3 and 200),
  intro text not null default '' check (char_length(intro) <= 1000),
  audience text not null default 'members' check (audience in ('public', 'members')),
  opens_at timestamptz,
  closes_at timestamptz,
  created_at timestamptz not null default now(),
  constraint quizzes_closes_after_opening check (closes_at is null or opens_at is null or closes_at > opens_at)
);

create index if not exists quizzes_opens_at_idx on portal.quizzes (opens_at desc);

-- How many visitors played, as a number and nothing else. Its own table rather than a column
-- on the quiz, because the quiz is in the audit trail and every visitor's play would otherwise
-- write a line there.
create table if not exists portal.quiz_public_plays (
  quiz_id uuid primary key references portal.quizzes (id) on delete cascade,
  plays integer not null default 0 check (plays >= 0)
);

create table if not exists portal.quiz_items (
  quiz_id uuid not null references portal.quizzes (id) on delete cascade,
  -- Restrict: a question in a quiz has to be taken out of the quiz before it can be deleted.
  question_id uuid not null references portal.quiz_questions (id) on delete restrict,
  position integer not null check (position >= 0),
  primary key (quiz_id, position),
  unique (quiz_id, question_id)
);

create index if not exists quiz_items_question_idx on portal.quiz_items (question_id);

create table if not exists portal.quiz_attempts (
  quiz_id uuid not null references portal.quizzes (id) on delete cascade,
  household_id uuid not null references portal.households (id) on delete cascade,
  score integer not null check (score >= 0),
  total integer not null check (total >= 0 and score <= total),
  answers integer[] not null default '{}',
  -- Whether their household's name goes on the leaderboard. Their choice, made as they submit.
  show_name boolean not null default true,
  played_at timestamptz not null default now(),
  primary key (quiz_id, household_id)
);


-- ===========================================================================
-- 3. Suggestions from members
-- ===========================================================================

create table if not exists portal.suggestions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('question', 'poll')),
  prompt text not null check (char_length(trim(prompt)) between 3 and 300),
  options text[] not null check (cardinality(options) between 2 and 8),
  -- The right option, for a question. A poll has none.
  answer integer,
  note text not null default '' check (char_length(note) <= 1000),
  credit boolean not null default false,
  household_id uuid not null references portal.households (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint suggestions_answer_fits check (
    (kind = 'poll' and answer is null)
    or (kind = 'question' and answer is not null and answer >= 0 and answer < cardinality(options)
        and cardinality(options) <= 6)
  ),
  constraint suggestions_reviewed_together check (
    (status = 'pending' and reviewed_by is null and reviewed_at is null)
    or (status <> 'pending' and reviewed_by is not null and reviewed_at is not null)
  )
);

create index if not exists suggestions_created_at_idx on portal.suggestions (created_at desc);

-- Who sent it, and that it is waiting, are decided here rather than by the browser — the
-- same reasoning as stamp_feedback() in feedback.sql.
create or replace function portal.stamp_suggestion()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
begin
  new.household_id := portal.current_household_id();
  if new.household_id is null then
    raise exception 'Only members can make a suggestion.' using errcode = '42501';
  end if;
  new.status := 'pending';
  new.reviewed_by := null;
  new.reviewed_at := null;
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists stamp_suggestion on portal.suggestions;
create trigger stamp_suggestion before insert on portal.suggestions
  for each row execute function portal.stamp_suggestion();


-- ===========================================================================
-- 4. What cannot change once people have answered
-- ===========================================================================

create or replace function portal.lock_poll_options()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
begin
  if new.options is distinct from old.options
     and exists (select 1 from portal.poll_votes v where v.poll_id = old.id) then
    raise exception 'People have already voted, so the choices cannot change.' using errcode = '45010';
  end if;
  if new.named is distinct from old.named
     and exists (select 1 from portal.poll_votes v where v.poll_id = old.id) then
    raise exception 'People have already voted, so whether the poll is named cannot change.' using errcode = '45010';
  end if;
  return new;
end;
$$;

drop trigger if exists lock_poll_options on portal.polls;
create trigger lock_poll_options before update on portal.polls
  for each row execute function portal.lock_poll_options();

-- Whether a question sits in any quiz somebody has played.
create or replace function portal.question_is_played(p_question uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select exists (
    select 1 from portal.quiz_items i
      join portal.quiz_attempts a on a.quiz_id = i.quiz_id
     where i.question_id = p_question
  ) or exists (
    select 1 from portal.quiz_items i
      join portal.quiz_public_plays p on p.quiz_id = i.quiz_id
     where i.question_id = p_question and p.plays > 0
  );
$$;

revoke all on function portal.question_is_played(uuid) from public, anon, authenticated;

create or replace function portal.quiz_is_played(p_quiz uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select exists (select 1 from portal.quiz_attempts a where a.quiz_id = p_quiz)
      or exists (select 1 from portal.quiz_public_plays p where p.quiz_id = p_quiz and p.plays > 0);
$$;

revoke all on function portal.quiz_is_played(uuid) from public, anon, authenticated;

create or replace function portal.lock_quiz_items()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  quiz uuid := coalesce(new.quiz_id, old.quiz_id);
begin
  -- Deleting the whole quiz takes its items with it, and that is allowed: by the time the
  -- cascade reaches here, the quiz row is already gone.
  if tg_op = 'DELETE' and not exists (select 1 from portal.quizzes q where q.id = old.quiz_id) then
    return old;
  end if;
  if portal.quiz_is_played(quiz) then
    raise exception 'People have already played this quiz, so its questions cannot change. Make a copy instead.' using errcode = '45010';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists lock_quiz_items on portal.quiz_items;
create trigger lock_quiz_items before insert or update or delete on portal.quiz_items
  for each row execute function portal.lock_quiz_items();

create or replace function portal.lock_played_question()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
begin
  -- Tags, a picture or an explanation can be tidied at any time; none of them changes a score.
  if new.prompt is not distinct from old.prompt and new.options is not distinct from old.options then
    return new;
  end if;
  if portal.question_is_played(old.id) then
    raise exception 'People have already answered this question in a quiz, so it cannot change. Write a new one instead.' using errcode = '45010';
  end if;
  return new;
end;
$$;

drop trigger if exists lock_played_question on portal.quiz_questions;
create trigger lock_played_question before update on portal.quiz_questions
  for each row execute function portal.lock_played_question();

create or replace function portal.lock_played_answer()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
begin
  if new.correct is distinct from old.correct and portal.question_is_played(old.question_id) then
    raise exception 'People have already answered this question in a quiz, so its answer cannot change. Write a new one instead.' using errcode = '45010';
  end if;
  return new;
end;
$$;

drop trigger if exists lock_played_answer on portal.quiz_answers;
create trigger lock_played_answer before update on portal.quiz_answers
  for each row execute function portal.lock_played_answer();


-- ===========================================================================
-- 5. Grants, then row level security
-- ===========================================================================

alter table portal.polls enable row level security;
alter table portal.poll_votes enable row level security;
alter table portal.quiz_questions enable row level security;
alter table portal.quiz_answers enable row level security;
alter table portal.quizzes enable row level security;
alter table portal.quiz_items enable row level security;
alter table portal.quiz_attempts enable row level security;
alter table portal.quiz_public_plays enable row level security;
alter table portal.suggestions enable row level security;

revoke all on portal.polls, portal.poll_votes, portal.quiz_questions, portal.quiz_answers,
  portal.quizzes, portal.quiz_items, portal.quiz_attempts, portal.quiz_public_plays, portal.suggestions
  from anon, authenticated;

grant select, insert, update, delete on portal.polls to authenticated;
-- Read only. A vote is cast through cast_vote() below and in no other way.
grant select on portal.poll_votes to authenticated;
grant select on portal.quiz_questions, portal.quizzes, portal.quiz_items to anon;
grant select, insert, update, delete on portal.quiz_questions, portal.quizzes, portal.quiz_items to authenticated;
grant select, insert, update, delete on portal.quiz_answers to authenticated;
-- Read only. An attempt is written by submit_quiz() and in no other way.
grant select on portal.quiz_attempts to authenticated;
grant select on portal.quiz_public_plays to authenticated;
grant select, update, delete on portal.suggestions to authenticated;
grant insert (kind, prompt, options, answer, note, credit) on portal.suggestions to authenticated;

-- Polls. Members only: a poll anybody could answer could be answered fifty times by one person.
drop policy if exists "members read an opened poll" on portal.polls;
create policy "members read an opened poll" on portal.polls for select to authenticated
  using (portal.current_household_id() is not null and opens_at is not null and opens_at <= now());

drop policy if exists "admins read every poll" on portal.polls;
create policy "admins read every poll" on portal.polls for select to authenticated
  using (portal.is_admin());

drop policy if exists "admins write polls" on portal.polls;
create policy "admins write polls" on portal.polls for insert to authenticated
  with check (portal.is_admin());

drop policy if exists "admins edit polls" on portal.polls;
create policy "admins edit polls" on portal.polls for update to authenticated
  using (portal.is_admin()) with check (portal.is_admin());

drop policy if exists "admins delete polls" on portal.polls;
create policy "admins delete polls" on portal.polls for delete to authenticated
  using (portal.is_admin());

-- Votes. A household reads its own; the committee reads them only on a named poll.
drop policy if exists "a household reads its own vote" on portal.poll_votes;
create policy "a household reads its own vote" on portal.poll_votes for select to authenticated
  using (household_id = portal.current_household_id());

drop policy if exists "admins read votes on a named poll" on portal.poll_votes;
create policy "admins read votes on a named poll" on portal.poll_votes for select to authenticated
  using (portal.is_admin() and exists (select 1 from portal.polls p where p.id = poll_id and p.named));

-- Quizzes. Opened ones only; a public quiz to anybody, every opened quiz to a member.
drop policy if exists "anybody reads an opened public quiz" on portal.quizzes;
create policy "anybody reads an opened public quiz" on portal.quizzes for select to anon, authenticated
  using (audience = 'public' and opens_at is not null and opens_at <= now());

drop policy if exists "members read an opened quiz" on portal.quizzes;
create policy "members read an opened quiz" on portal.quizzes for select to authenticated
  using (portal.current_household_id() is not null and opens_at is not null and opens_at <= now());

drop policy if exists "admins read every quiz" on portal.quizzes;
create policy "admins read every quiz" on portal.quizzes for select to authenticated
  using (portal.is_admin());

drop policy if exists "admins write quizzes" on portal.quizzes;
create policy "admins write quizzes" on portal.quizzes for insert to authenticated
  with check (portal.is_admin());

drop policy if exists "admins edit quizzes" on portal.quizzes;
create policy "admins edit quizzes" on portal.quizzes for update to authenticated
  using (portal.is_admin()) with check (portal.is_admin());

drop policy if exists "admins delete quizzes" on portal.quizzes;
create policy "admins delete quizzes" on portal.quizzes for delete to authenticated
  using (portal.is_admin());

-- A quiz's items, and the questions in them, are readable exactly where the quiz is. The
-- subqueries run as the caller, so the quiz policies above decide.
drop policy if exists "items of a quiz you can read" on portal.quiz_items;
create policy "items of a quiz you can read" on portal.quiz_items for select to anon, authenticated
  using (exists (select 1 from portal.quizzes q where q.id = quiz_id));

drop policy if exists "admins write quiz items" on portal.quiz_items;
create policy "admins write quiz items" on portal.quiz_items for all to authenticated
  using (portal.is_admin()) with check (portal.is_admin());

-- A bank question nobody has put in an opened quiz stays the committee's.
drop policy if exists "questions in a quiz you can read" on portal.quiz_questions;
create policy "questions in a quiz you can read" on portal.quiz_questions for select to anon, authenticated
  using (exists (select 1 from portal.quiz_items i where i.question_id = quiz_questions.id));

drop policy if exists "admins read the question bank" on portal.quiz_questions;
create policy "admins read the question bank" on portal.quiz_questions for select to authenticated
  using (portal.is_admin());

drop policy if exists "admins write the question bank" on portal.quiz_questions;
create policy "admins write the question bank" on portal.quiz_questions for insert to authenticated
  with check (portal.is_admin());

drop policy if exists "admins edit the question bank" on portal.quiz_questions;
create policy "admins edit the question bank" on portal.quiz_questions for update to authenticated
  using (portal.is_admin()) with check (portal.is_admin());

drop policy if exists "admins delete from the question bank" on portal.quiz_questions;
create policy "admins delete from the question bank" on portal.quiz_questions for delete to authenticated
  using (portal.is_admin());

-- The answers. The committee's alone, with no policy for anybody else at all.
drop policy if exists "admins keep the answers" on portal.quiz_answers;
create policy "admins keep the answers" on portal.quiz_answers for all to authenticated
  using (portal.is_admin()) with check (portal.is_admin());

-- Attempts. A household reads its own score; the committee reads every score.
drop policy if exists "a household reads its own score" on portal.quiz_attempts;
create policy "a household reads its own score" on portal.quiz_attempts for select to authenticated
  using (household_id = portal.current_household_id());

drop policy if exists "admins read every score" on portal.quiz_attempts;
create policy "admins read every score" on portal.quiz_attempts for select to authenticated
  using (portal.is_admin());

drop policy if exists "admins read how many visitors played" on portal.quiz_public_plays;
create policy "admins read how many visitors played" on portal.quiz_public_plays for select to authenticated
  using (portal.is_admin());

-- Suggestions. A member sends and reads their own; the committee reviews them all.
drop policy if exists "members make suggestions" on portal.suggestions;
create policy "members make suggestions" on portal.suggestions for insert to authenticated
  with check (portal.current_household_id() is not null);

drop policy if exists "a household reads its own suggestions" on portal.suggestions;
create policy "a household reads its own suggestions" on portal.suggestions for select to authenticated
  using (household_id = portal.current_household_id());

drop policy if exists "admins read every suggestion" on portal.suggestions;
create policy "admins read every suggestion" on portal.suggestions for select to authenticated
  using (portal.is_admin());

drop policy if exists "admins review suggestions" on portal.suggestions;
create policy "admins review suggestions" on portal.suggestions for update to authenticated
  using (portal.is_admin()) with check (portal.is_admin());

drop policy if exists "admins delete suggestions" on portal.suggestions;
create policy "admins delete suggestions" on portal.suggestions for delete to authenticated
  using (portal.is_admin());


-- ===========================================================================
-- 6. Voting, playing and the results
-- ===========================================================================

create or replace function portal.cast_vote(p_poll uuid, p_option integer)
  returns void
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  household uuid := portal.current_household_id();
  poll portal.polls;
begin
  if household is null then
    raise exception 'Only members can vote.' using errcode = '42501';
  end if;
  select * into poll from portal.polls p where p.id = p_poll;
  if not found or poll.opens_at is null or poll.opens_at > now() then
    raise exception 'There is no such poll.' using errcode = '45010';
  end if;
  if poll.closes_at is not null and poll.closes_at <= now() then
    raise exception 'This poll has closed.' using errcode = '45010';
  end if;
  if p_option is null or p_option < 0 or p_option >= cardinality(poll.options) then
    raise exception 'That is not one of the choices.' using errcode = '45010';
  end if;

  insert into portal.poll_votes (poll_id, household_id, option)
  values (p_poll, household, p_option)
  on conflict (poll_id, household_id) do update set option = excluded.option, voted_at = now();
end;
$$;

comment on function portal.cast_vote(uuid, integer) is
  'Records this household''s vote on an open poll, replacing any earlier one. The only way a vote is written.';

revoke all on function portal.cast_vote(uuid, integer) from public, anon;
grant execute on function portal.cast_vote(uuid, integer) to authenticated, service_role;

-- The totals, one row per choice including the ones nobody chose. Empty when this person is
-- not allowed them yet.
create or replace function portal.poll_results(p_poll uuid)
  returns table (option integer, votes integer)
  language plpgsql
  stable
  security definer
  set search_path = ''
as $$
declare
  poll portal.polls;
  household uuid := portal.current_household_id();
  closed boolean;
  voted boolean;
begin
  select * into poll from portal.polls p where p.id = p_poll;
  if not found then
    return;
  end if;

  if not portal.is_admin() then
    if household is null or poll.opens_at is null or poll.opens_at > now() then
      return;
    end if;
    closed := poll.closes_at is not null and poll.closes_at <= now();
    voted := exists (select 1 from portal.poll_votes v where v.poll_id = p_poll and v.household_id = household);
    if poll.results = 'committee'
       or (poll.results = 'after_close' and not closed)
       or (poll.results = 'after_vote' and not voted and not closed) then
      return;
    end if;
  end if;

  return query
    select (n - 1)::integer,
           (select count(*)::integer from portal.poll_votes v where v.poll_id = p_poll and v.option = n - 1)
      from generate_series(1, cardinality(poll.options)) as n
     order by n;
end;
$$;

comment on function portal.poll_results(uuid) is
  'A poll''s totals per choice, for whoever is allowed them at this moment. Never says who.';

revoke all on function portal.poll_results(uuid) from public, anon;
grant execute on function portal.poll_results(uuid) to authenticated, service_role;

create or replace function portal.submit_quiz(p_quiz uuid, p_answers integer[], p_show_name boolean default true)
  returns table (score integer, total integer, correct integer[], explanations text[])
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  quiz portal.quizzes;
  household uuid := portal.current_household_id();
  right_ones integer[];
  notes text[];
  got integer := 0;
  i integer;
begin
  select * into quiz from portal.quizzes q where q.id = p_quiz;
  if not found or quiz.opens_at is null or quiz.opens_at > now() then
    raise exception 'There is no such quiz.' using errcode = '45010';
  end if;
  if quiz.closes_at is not null and quiz.closes_at <= now() then
    raise exception 'This quiz has closed.' using errcode = '45010';
  end if;
  if quiz.audience = 'members' and household is null then
    raise exception 'This quiz is for members.' using errcode = '42501';
  end if;

  select coalesce(array_agg(a.correct order by it.position), '{}'),
         coalesce(array_agg(qq.explanation order by it.position), '{}')
    into right_ones, notes
    from portal.quiz_items it
    join portal.quiz_questions qq on qq.id = it.question_id
    join portal.quiz_answers a on a.question_id = it.question_id
   where it.quiz_id = p_quiz;

  for i in 1 .. coalesce(cardinality(right_ones), 0) loop
    if p_answers[i] is not distinct from right_ones[i] then
      got := got + 1;
    end if;
  end loop;

  if household is not null then
    begin
      insert into portal.quiz_attempts (quiz_id, household_id, score, total, answers, show_name)
      values (p_quiz, household, got, cardinality(right_ones), coalesce(p_answers, '{}'), coalesce(p_show_name, true));
    exception when unique_violation then
      raise exception 'Your household has already played this quiz.' using errcode = '45010';
    end;
  else
    insert into portal.quiz_public_plays as p (quiz_id, plays) values (p_quiz, 1)
    on conflict (quiz_id) do update set plays = p.plays + 1;
  end if;

  return query select got, cardinality(right_ones), right_ones, notes;
end;
$$;

comment on function portal.submit_quiz(uuid, integer[], boolean) is
  'Marks a quiz and returns the score with the right answers. Keeps a member household''s attempt; for a visitor, only adds one to the count.';

revoke all on function portal.submit_quiz(uuid, integer[], boolean) from public;
grant execute on function portal.submit_quiz(uuid, integer[], boolean) to anon, authenticated, service_role;

-- The households who chose to be shown, best first. Members and the committee only.
create or replace function portal.quiz_leaderboard(p_quiz uuid)
  returns table (household text, score integer, total integer)
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select case when a.show_name then h.name end, a.score, a.total
    from portal.quiz_attempts a
    join portal.households h on h.id = a.household_id
   where a.quiz_id = p_quiz
     and (portal.current_household_id() is not null or portal.is_admin())
   order by a.score desc, a.played_at asc;
$$;

comment on function portal.quiz_leaderboard(uuid) is
  'Scores for a quiz, best first, with a household''s name only where it chose to be shown.';

revoke all on function portal.quiz_leaderboard(uuid) from public, anon;
grant execute on function portal.quiz_leaderboard(uuid) to authenticated, service_role;


-- ===========================================================================
-- 7. Saving, in one step each
-- ===========================================================================
-- Security invoker: these only bundle writes the policies above already allow the committee,
-- so a question and its answer, or a quiz and its list of questions, land together or not at all.

create or replace function portal.save_question(
  p_id uuid,
  p_prompt text,
  p_options text[],
  p_correct integer,
  p_explanation text,
  p_tags text[],
  p_image_url text,
  p_credited_to text
)
  returns uuid
  language plpgsql
  security invoker
  set search_path = ''
as $$
declare
  saved uuid := p_id;
begin
  if p_correct is null or p_correct < 0 or p_correct >= cardinality(p_options) then
    raise exception 'Mark which answer is right.' using errcode = '45010';
  end if;
  if saved is null then
    insert into portal.quiz_questions (prompt, options, explanation, tags, image_url, credited_to)
    values (p_prompt, p_options, coalesce(p_explanation, ''), coalesce(p_tags, '{}'), p_image_url, p_credited_to)
    returning id into saved;
    insert into portal.quiz_answers (question_id, correct) values (saved, p_correct);
  else
    update portal.quiz_questions
       set prompt = p_prompt, options = p_options, explanation = coalesce(p_explanation, ''),
           tags = coalesce(p_tags, '{}'), image_url = p_image_url, credited_to = p_credited_to
     where id = saved;
    if not found then
      raise exception 'There is no such question.' using errcode = '45010';
    end if;
    insert into portal.quiz_answers (question_id, correct) values (saved, p_correct)
    on conflict (question_id) do update set correct = excluded.correct
      where portal.quiz_answers.correct is distinct from excluded.correct;
  end if;
  return saved;
end;
$$;

revoke all on function portal.save_question(uuid, text, text[], integer, text, text[], text, text) from public, anon;
grant execute on function portal.save_question(uuid, text, text[], integer, text, text[], text, text) to authenticated, service_role;

create or replace function portal.save_quiz(
  p_id uuid,
  p_title text,
  p_intro text,
  p_audience text,
  p_opens_at timestamptz,
  p_closes_at timestamptz,
  p_questions uuid[]
)
  returns uuid
  language plpgsql
  security invoker
  set search_path = ''
as $$
declare
  saved uuid := p_id;
  current uuid[];
begin
  if saved is null then
    insert into portal.quizzes (title, intro, audience, opens_at, closes_at)
    values (p_title, coalesce(p_intro, ''), p_audience, p_opens_at, p_closes_at)
    returning id into saved;
  else
    update portal.quizzes
       set title = p_title, intro = coalesce(p_intro, ''), audience = p_audience,
           opens_at = p_opens_at, closes_at = p_closes_at
     where id = saved;
    if not found then
      raise exception 'There is no such quiz.' using errcode = '45010';
    end if;
  end if;

  -- Only touch the list when it actually changed, so that editing the title of a quiz people
  -- have played is not refused by the lock on its questions.
  select coalesce(array_agg(i.question_id order by i.position), '{}') into current
    from portal.quiz_items i where i.quiz_id = saved;
  if current is distinct from coalesce(p_questions, '{}') then
    delete from portal.quiz_items where quiz_id = saved;
    insert into portal.quiz_items (quiz_id, question_id, position)
    select saved, q, n - 1 from unnest(p_questions) with ordinality as t(q, n);
  end if;
  return saved;
end;
$$;

revoke all on function portal.save_quiz(uuid, text, text, text, timestamptz, timestamptz, uuid[]) from public, anon;
grant execute on function portal.save_quiz(uuid, text, text, text, timestamptz, timestamptz, uuid[]) to authenticated, service_role;


-- ===========================================================================
-- 8. The trail
-- ===========================================================================
-- What the committee did, as everywhere else. Not votes, not attempts and not the answers
-- table: see rule 6 at the top.

drop trigger if exists record_change on portal.polls;
create trigger record_change after insert or update or delete on portal.polls
  for each row execute function portal.record_change();

drop trigger if exists record_change on portal.quizzes;
create trigger record_change after insert or update or delete on portal.quizzes
  for each row execute function portal.record_change();

drop trigger if exists record_change on portal.quiz_questions;
create trigger record_change after insert or update or delete on portal.quiz_questions
  for each row execute function portal.record_change();

-- Reviews only. A delete would copy the member's words into the one table nobody can delete
-- from, which is the reasoning feedback.sql gives at length.
drop trigger if exists record_change on portal.suggestions;
create trigger record_change after update on portal.suggestions
  for each row execute function portal.record_change();
