-- Checks that the poll and quiz rules hold. Run in the Supabase SQL editor after
-- polls-quizzes.sql.
--
-- Written the same way as verify-feedback.sql: every block is something that would be a real
-- problem if it were allowed, each raises if a rule is not doing its job, and a clean run is
-- silence followed by the final notice. It runs in a transaction and rolls back, so it leaves
-- nothing behind. Seeding happens as the owner; everything after runs as `anon` or
-- `authenticated` with `request.jwt.claims` set by hand, so the checks exercise row level
-- security rather than describing it.

begin;

do $$
begin
  if to_regprocedure('portal.submit_quiz(uuid, integer[], boolean)') is null then
    raise exception 'FAIL: portal.submit_quiz() does not exist. Run supabase/polls-quizzes.sql first.';
  end if;
end $$;


-- ---------------------------------------------------------------------------
-- Seed, as the owner
-- ---------------------------------------------------------------------------

insert into portal.households (id, name, contact_name, email, google_email, role)
values
  ('cccccccc-0000-0000-0000-000000000001', 'The Poll Members', 'A Member', 'pqa@example.com', 'pqa@example.com', 'member'),
  ('cccccccc-0000-0000-0000-000000000002', 'The Quiet Members', 'B Member', 'pqb@example.com', 'pqb@example.com', 'member'),
  ('cccccccc-0000-0000-0000-000000000003', 'The Poll Admins', 'An Admin', 'pqadmin@example.com', 'pqadmin@example.com', 'admin')
on conflict (id) do nothing;

insert into portal.polls (id, title, options, named, results, opens_at, closes_at)
values
  -- Open, unnamed, totals after voting.
  ('dddddddd-0000-0000-0000-000000000001', 'Picnic date', array['Sat 12th', 'Sun 13th'], false, 'after_vote', now() - interval '1 day', null),
  -- Open and named: a volunteer headcount.
  ('dddddddd-0000-0000-0000-000000000002', 'Who can help set up?', array['Yes', 'No'], true, 'after_vote', now() - interval '1 day', null),
  -- Open, totals only once it closes.
  ('dddddddd-0000-0000-0000-000000000003', 'Veg or non-veg', array['Veg', 'Non-veg'], false, 'after_close', now() - interval '1 day', now() + interval '7 days'),
  -- Open, totals for the committee alone.
  ('dddddddd-0000-0000-0000-000000000004', 'Committee only', array['A', 'B'], false, 'committee', now() - interval '1 day', null),
  -- A draft.
  ('dddddddd-0000-0000-0000-000000000005', 'Still a draft', array['A', 'B'], false, 'after_vote', null, null),
  -- Closed.
  ('dddddddd-0000-0000-0000-000000000006', 'Last year''s', array['A', 'B'], false, 'after_vote', now() - interval '30 days', now() - interval '1 day')
on conflict (id) do nothing;

insert into portal.quiz_questions (id, prompt, options, explanation)
values
  ('eeeeeeee-0000-0000-0000-000000000001', 'Which goddess rides a swan?', array['Lakshmi', 'Saraswati', 'Durga'], 'Saraswati''s vahana is the swan.'),
  ('eeeeeeee-0000-0000-0000-000000000002', 'Poila Boishakh marks?', array['New Year', 'Harvest'], ''),
  ('eeeeeeee-0000-0000-0000-000000000003', 'Members only question', array['A', 'B'], ''),
  ('eeeeeeee-0000-0000-0000-000000000004', 'Still in the bank', array['A', 'B'], '')
on conflict (id) do nothing;

insert into portal.quiz_answers (question_id, correct)
values
  ('eeeeeeee-0000-0000-0000-000000000001', 1),
  ('eeeeeeee-0000-0000-0000-000000000002', 0),
  ('eeeeeeee-0000-0000-0000-000000000003', 1),
  ('eeeeeeee-0000-0000-0000-000000000004', 0)
on conflict (question_id) do nothing;

insert into portal.quizzes (id, title, audience, opens_at)
values
  ('ffffffff-0000-0000-0000-000000000001', 'A quiz for everyone', 'public', now() - interval '1 day'),
  ('ffffffff-0000-0000-0000-000000000002', 'A quiz for members', 'members', now() - interval '1 day'),
  ('ffffffff-0000-0000-0000-000000000003', 'A draft quiz', 'public', null)
on conflict (id) do nothing;

insert into portal.quiz_items (quiz_id, question_id, position)
values
  ('ffffffff-0000-0000-0000-000000000001', 'eeeeeeee-0000-0000-0000-000000000001', 0),
  ('ffffffff-0000-0000-0000-000000000001', 'eeeeeeee-0000-0000-0000-000000000002', 1),
  ('ffffffff-0000-0000-0000-000000000002', 'eeeeeeee-0000-0000-0000-000000000003', 0),
  ('ffffffff-0000-0000-0000-000000000003', 'eeeeeeee-0000-0000-0000-000000000004', 0)
on conflict do nothing;


-- ---------------------------------------------------------------------------
-- A visitor with no account
-- ---------------------------------------------------------------------------

reset role;
set local role anon;
set local request.jwt.claims = '';

do $$
declare
  n integer;
  r record;
begin
  -- Polls are for members.
  begin
    select count(*) into n from portal.polls;
    if n > 0 then
      raise exception 'FAIL: a visitor read % polls', n;
    end if;
  exception when insufficient_privilege then null;
  end;

  begin
    perform portal.cast_vote('dddddddd-0000-0000-0000-000000000001', 0);
    raise exception 'FAIL: a visitor voted in a poll';
  exception when insufficient_privilege then null;
  end;

  -- The public quiz, and only the public quiz.
  select count(*) into n from portal.quizzes;
  if n <> 1 then
    raise exception 'FAIL: a visitor saw % quizzes; only the opened public one should be readable', n;
  end if;

  -- Its questions, and no others: not the members' quiz, not the draft's, not the bank.
  select count(*) into n from portal.quiz_questions;
  if n <> 2 then
    raise exception 'FAIL: a visitor read % questions; only the two in the public quiz should be readable', n;
  end if;

  -- The right answers are never readable before playing.
  begin
    select count(*) into n from portal.quiz_answers;
    raise exception 'FAIL: a visitor could read the right answers (% rows)', n;
  exception when insufficient_privilege then null;
  end;

  -- Playing works, and marks it.
  select * into r from portal.submit_quiz('ffffffff-0000-0000-0000-000000000001', array[1, 0], true);
  if r.score <> 2 or r.total <> 2 then
    raise exception 'FAIL: a visitor who got both right scored % of %', r.score, r.total;
  end if;
  if r.correct <> array[1, 0] then
    raise exception 'FAIL: the right answers came back as %', r.correct;
  end if;

  -- Not the members' quiz.
  begin
    perform portal.submit_quiz('ffffffff-0000-0000-0000-000000000002', array[1], true);
    raise exception 'FAIL: a visitor played a quiz for members';
  exception when insufficient_privilege then null;
  end;

  -- Not a draft.
  begin
    perform portal.submit_quiz('ffffffff-0000-0000-0000-000000000003', array[0], true);
    raise exception 'FAIL: a visitor played a draft quiz';
  exception when sqlstate '45010' then null;
  end;

  -- Scores are for members.
  begin
    perform portal.quiz_leaderboard('ffffffff-0000-0000-0000-000000000001');
    raise exception 'FAIL: a visitor read a leaderboard';
  exception when insufficient_privilege then null;
  end;
end $$;

-- A visitor's play is a number and nothing else.
reset role;
do $$
begin
  if exists (select 1 from portal.quiz_attempts where quiz_id = 'ffffffff-0000-0000-0000-000000000001') then
    raise exception 'FAIL: a visitor''s play left a row in quiz_attempts';
  end if;
  if (select plays from portal.quiz_public_plays where quiz_id = 'ffffffff-0000-0000-0000-000000000001') is distinct from 1 then
    raise exception 'FAIL: a visitor''s play was not counted';
  end if;
end $$;


-- ---------------------------------------------------------------------------
-- Signed in with Google, but not a member
-- ---------------------------------------------------------------------------

reset role;
set local role authenticated;
set local request.jwt.claims = '{"email": "pqstranger@example.com"}';

do $$
declare
  n integer;
begin
  select count(*) into n from portal.polls;
  if n <> 0 then
    raise exception 'FAIL: a signed-in stranger read % polls', n;
  end if;

  begin
    perform portal.cast_vote('dddddddd-0000-0000-0000-000000000001', 0);
    raise exception 'FAIL: a signed-in stranger voted';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into portal.suggestions (kind, prompt, options) values ('poll', 'From a stranger', array['A', 'B']);
    raise exception 'FAIL: a signed-in stranger made a suggestion';
  exception when insufficient_privilege then null;
  end;
end $$;


-- ---------------------------------------------------------------------------
-- A member
-- ---------------------------------------------------------------------------

reset role;
set local role authenticated;
set local request.jwt.claims = '{"email": "pqa@example.com"}';

do $$
declare
  n integer;
  r record;
begin
  -- Every opened poll, open or closed; never a draft.
  select count(*) into n from portal.polls where id::text like 'dddddddd-%';
  if n <> 5 then
    raise exception 'FAIL: a member saw % polls; the five opened ones should be readable', n;
  end if;

  -- No totals before voting on an after-vote poll.
  select count(*) into n from portal.poll_results('dddddddd-0000-0000-0000-000000000001');
  if n <> 0 then
    raise exception 'FAIL: a member saw the totals before voting';
  end if;

  perform portal.cast_vote('dddddddd-0000-0000-0000-000000000001', 1);
  select votes into n from portal.poll_results('dddddddd-0000-0000-0000-000000000001') where option = 1;
  if n is distinct from 1 then
    raise exception 'FAIL: after voting, the totals showed % for the chosen option', n;
  end if;

  -- Changing their mind replaces the vote rather than adding one.
  perform portal.cast_vote('dddddddd-0000-0000-0000-000000000001', 0);
  select sum(votes) into n from portal.poll_results('dddddddd-0000-0000-0000-000000000001');
  if n <> 1 then
    raise exception 'FAIL: changing a vote left % votes from one household', n;
  end if;

  -- Writing to the votes table directly is not a way round any of this.
  begin
    insert into portal.poll_votes (poll_id, household_id, option)
    values ('dddddddd-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000002', 1);
    raise exception 'FAIL: a member wrote a vote straight into the table, for another household';
  exception when insufficient_privilege then null;
  end;

  -- After-close and committee-only totals stay hidden, voted or not.
  perform portal.cast_vote('dddddddd-0000-0000-0000-000000000003', 0);
  select count(*) into n from portal.poll_results('dddddddd-0000-0000-0000-000000000003');
  if n <> 0 then
    raise exception 'FAIL: a member saw an after-close poll''s totals while it was open';
  end if;
  perform portal.cast_vote('dddddddd-0000-0000-0000-000000000004', 0);
  select count(*) into n from portal.poll_results('dddddddd-0000-0000-0000-000000000004');
  if n <> 0 then
    raise exception 'FAIL: a member saw a committee-only poll''s totals';
  end if;

  -- A closed poll shows its totals and takes no votes.
  select count(*) into n from portal.poll_results('dddddddd-0000-0000-0000-000000000006');
  if n <> 2 then
    raise exception 'FAIL: a member could not see a closed poll''s totals';
  end if;
  begin
    perform portal.cast_vote('dddddddd-0000-0000-0000-000000000006', 0);
    raise exception 'FAIL: a member voted in a closed poll';
  exception when sqlstate '45010' then null;
  end;
  begin
    perform portal.cast_vote('dddddddd-0000-0000-0000-000000000005', 0);
    raise exception 'FAIL: a member voted in a draft poll';
  exception when sqlstate '45010' then null;
  end;
  begin
    perform portal.cast_vote('dddddddd-0000-0000-0000-000000000001', 7);
    raise exception 'FAIL: a member voted for a choice that does not exist';
  exception when sqlstate '45010' then null;
  end;

  perform portal.cast_vote('dddddddd-0000-0000-0000-000000000002', 0);

  -- The members' quiz is readable now, the bank and the draft still are not.
  select count(*) into n from portal.quiz_questions;
  if n <> 3 then
    raise exception 'FAIL: a member read % questions; the three in opened quizzes should be readable', n;
  end if;
  select count(*) into n from portal.quiz_answers;
  if n <> 0 then
    raise exception 'FAIL: a member read % right answers', n;
  end if;

  select * into r from portal.submit_quiz('ffffffff-0000-0000-0000-000000000002', array[1], true);
  if r.score <> 1 then
    raise exception 'FAIL: a member who got it right scored %', r.score;
  end if;

  begin
    perform portal.submit_quiz('ffffffff-0000-0000-0000-000000000002', array[1], true);
    raise exception 'FAIL: a household played the same quiz twice';
  exception when sqlstate '45010' then null;
  end;

  -- Members cannot run polls or quizzes.
  begin
    insert into portal.polls (title, options) values ('A member''s own poll', array['A', 'B']);
    raise exception 'FAIL: a member created a poll';
  exception when insufficient_privilege then null;
  end;
  update portal.quizzes set title = 'Renamed by a member' where id = 'ffffffff-0000-0000-0000-000000000001';
  if found then
    raise exception 'FAIL: a member renamed a quiz';
  end if;

  -- A suggestion lands pending and theirs, whatever was sent.
  begin
    insert into portal.suggestions (kind, prompt, options, status)
    values ('poll', 'Trying to approve itself', array['A', 'B'], 'approved');
    raise exception 'FAIL: a member sent a suggestion with its own status';
  exception when insufficient_privilege then null;
  end;
  insert into portal.suggestions (kind, prompt, options, answer, credit)
  values ('question', 'Which river runs through Kolkata?', array['Hooghly', 'Thames'], 0, true);
end $$;

-- The second household plays and stays off the board by name.
reset role;
set local role authenticated;
set local request.jwt.claims = '{"email": "pqb@example.com"}';

do $$
declare
  n integer;
  named text[];
begin
  perform portal.submit_quiz('ffffffff-0000-0000-0000-000000000002', array[0], false);

  select array_agg(household order by household nulls last) into named
    from portal.quiz_leaderboard('ffffffff-0000-0000-0000-000000000002');
  if named is distinct from array['The Poll Members', null] then
    raise exception 'FAIL: the leaderboard read %; one named household and one without a name expected', named;
  end if;

  -- Nobody else's vote, score or suggestion.
  select count(*) into n from portal.poll_votes;
  if n <> 0 then
    raise exception 'FAIL: a household read % votes it did not cast', n;
  end if;
  select count(*) into n from portal.quiz_attempts where household_id <> 'cccccccc-0000-0000-0000-000000000002';
  if n <> 0 then
    raise exception 'FAIL: a household read another household''s score';
  end if;
  select count(*) into n from portal.suggestions;
  if n <> 0 then
    raise exception 'FAIL: a household read another household''s suggestion';
  end if;
end $$;


-- ---------------------------------------------------------------------------
-- The committee
-- ---------------------------------------------------------------------------

reset role;
set local role authenticated;
set local request.jwt.claims = '{"email": "pqadmin@example.com"}';

do $$
declare
  n integer;
  saved uuid;
begin
  select count(*) into n from portal.polls where id::text like 'dddddddd-%';
  if n <> 6 then
    raise exception 'FAIL: the committee saw % polls, drafts included should be 6', n;
  end if;

  -- Who voted which way: only on the named poll.
  select count(*) into n from portal.poll_votes where poll_id = 'dddddddd-0000-0000-0000-000000000001';
  if n <> 0 then
    raise exception 'FAIL: the committee could see who voted which way on an unnamed poll';
  end if;
  select count(*) into n from portal.poll_votes where poll_id = 'dddddddd-0000-0000-0000-000000000002';
  if n <> 1 then
    raise exception 'FAIL: the committee could not see the named poll''s votes';
  end if;

  select count(*) into n from portal.poll_results('dddddddd-0000-0000-0000-000000000004');
  if n <> 2 then
    raise exception 'FAIL: the committee could not see a committee-only poll''s totals';
  end if;

  -- Choices are locked once somebody has voted; the title is not.
  begin
    update portal.polls set options = array['Fri 11th', 'Sun 13th'] where id = 'dddddddd-0000-0000-0000-000000000001';
    raise exception 'FAIL: a poll''s choices changed after people had voted';
  exception when sqlstate '45010' then null;
  end;
  begin
    update portal.polls set named = true where id = 'dddddddd-0000-0000-0000-000000000001';
    raise exception 'FAIL: an unnamed poll became named after people had voted';
  exception when sqlstate '45010' then null;
  end;
  update portal.polls set title = 'Picnic date (final)' where id = 'dddddddd-0000-0000-0000-000000000001';
  if not found then
    raise exception 'FAIL: the committee could not rename a poll';
  end if;

  -- Played quizzes keep their questions. The title can still change.
  begin
    perform portal.save_quiz('ffffffff-0000-0000-0000-000000000002', 'A quiz for members', '', 'members',
      now() - interval '1 day', null, array['eeeeeeee-0000-0000-0000-000000000004'::uuid]);
    raise exception 'FAIL: a played quiz''s questions changed';
  exception when sqlstate '45010' then null;
  end;
  perform portal.save_quiz('ffffffff-0000-0000-0000-000000000002', 'A quiz for members, renamed', '', 'members',
    now() - interval '1 day', null, array['eeeeeeee-0000-0000-0000-000000000003'::uuid]);

  begin
    update portal.quiz_questions set prompt = 'Reworded after people answered' where id = 'eeeeeeee-0000-0000-0000-000000000003';
    raise exception 'FAIL: a played question was reworded';
  exception when sqlstate '45010' then null;
  end;
  begin
    update portal.quiz_answers set correct = 0 where question_id = 'eeeeeeee-0000-0000-0000-000000000003';
    raise exception 'FAIL: a played question''s answer changed';
  exception when sqlstate '45010' then null;
  end;
  -- A visitor's play locks it too.
  begin
    update portal.quiz_questions set prompt = 'Reworded after a visitor answered' where id = 'eeeeeeee-0000-0000-0000-000000000001';
    raise exception 'FAIL: a question a visitor had answered was reworded';
  exception when sqlstate '45010' then null;
  end;
  update portal.quiz_questions set explanation = 'Tidied afterwards.' where id = 'eeeeeeee-0000-0000-0000-000000000003';
  if not found then
    raise exception 'FAIL: the committee could not tidy a played question''s explanation';
  end if;

  -- A new question and its answer land together.
  saved := portal.save_question(null, 'A new one', array['Yes', 'No'], 1, '', array['durga-puja'], null, null);
  if (select correct from portal.quiz_answers where question_id = saved) is distinct from 1 then
    raise exception 'FAIL: saving a question did not save its answer';
  end if;

  -- Reviewing a suggestion.
  update portal.suggestions set status = 'approved', reviewed_by = 'An Admin', reviewed_at = now()
   where prompt = 'Which river runs through Kolkata?';
  if not found then
    raise exception 'FAIL: the committee could not approve a suggestion';
  end if;

  -- Deleting a played quiz is allowed, and takes its scores with it.
  delete from portal.quizzes where id = 'ffffffff-0000-0000-0000-000000000002';
  if not found then
    raise exception 'FAIL: the committee could not delete a played quiz';
  end if;
end $$;

-- The trail has the committee's work and nobody's votes or scores.
reset role;
do $$
begin
  if not exists (select 1 from portal.audit_log where subject_kind = 'polls' and subject_id = 'dddddddd-0000-0000-0000-000000000001') then
    raise exception 'FAIL: renaming a poll left no line in the audit trail';
  end if;
  if exists (select 1 from portal.audit_log where subject_kind in ('poll_votes', 'quiz_attempts', 'quiz_answers', 'quiz_public_plays')) then
    raise exception 'FAIL: a vote, a score or an answer was copied into the audit trail';
  end if;
  if exists (select 1 from portal.quiz_attempts where quiz_id = 'ffffffff-0000-0000-0000-000000000002') then
    raise exception 'FAIL: deleting a quiz left its scores behind';
  end if;
end $$;

do $$
begin
  raise notice 'All poll and quiz rules hold.';
end $$;

rollback;
