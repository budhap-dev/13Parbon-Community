import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { useOpenFromAddress } from '@/app/useOpenFromAddress'
import { useSettings } from '@/app/SettingsContext'
import { Button } from '@/components/Button'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Icon } from '@/components/Icon'
import { formatLongDate } from '@/domain/dates'
import { pollDraftOf, stateOf, votesLabel, type Poll, type PollDraft, type PollState } from '@/domain/polls'
import { quizDraftOf, scoreLine, type BankQuestion, type Quiz, type QuizDraft } from '@/domain/quizzes'
import { SUGGESTION_STATUS, waitingSuggestions, type Suggestion } from '@/domain/suggestions'
import {
  useAllPolls,
  useAllQuizzes,
  useAllSuggestions,
  useCreatePoll,
  useCreateQuestion,
  useCreateQuiz,
  useQuestionBank,
  useQuizAttempts,
  useRemovePoll,
  useRemoveQuestion,
  useRemoveQuiz,
  useRemoveSuggestion,
  useReviewSuggestion,
  useUpdatePoll,
  useUpdateQuestion,
  useUpdateQuiz,
} from '@/lib/api'
import { useNow } from '@/lib/clock'
import portal from '@/features/portal/Portal.module.css'
import { Tally } from './PollCard'
import { PollForm, QuestionForm, QuizForm } from './PlayForms'
import styles from './Play.module.css'

type Tab = 'polls' | 'quizzes' | 'bank' | 'suggestions'

const STATE_WORDS: Record<PollState, string> = { draft: 'Draft', scheduled: 'Scheduled', open: 'Open', closed: 'Closed' }
const STATE_PILL: Record<PollState, string> = {
  draft: portal.pillPast,
  scheduled: portal.pillWait,
  open: portal.pillLive,
  closed: portal.pillPast,
}

type Editing =
  | { kind: 'poll'; poll?: Poll; start?: Partial<PollDraft>; locked?: boolean; fromSuggestion?: string }
  | { kind: 'quiz'; quiz?: Quiz; start?: Partial<QuizDraft>; locked?: boolean }
  | { kind: 'question'; question?: BankQuestion; start?: Partial<BankQuestion>; fromSuggestion?: string }

type Removing = { kind: 'poll' | 'quiz' | 'question' | 'suggestion'; id: string; title: string }

/**
 * The committee's polls and quizzes: writing them, the question bank they are built from, and
 * what members have suggested.
 *
 * Totals here are totals. On a poll that was not marked named before voting began, nobody —
 * this screen included — can say which household chose what, because the database does not
 * hand it over.
 */
export function AdminPlayPage() {
  useDocumentTitle('Polls and quizzes')
  const now = useNow()
  const { showQuizzes } = useSettings()
  const [params, setParams] = useSearchParams()
  const tabs: { key: Tab; label: string }[] = [
    { key: 'polls', label: 'Polls' },
    { key: 'quizzes', label: 'Quizzes' },
    { key: 'bank', label: 'Question bank' },
    { key: 'suggestions', label: 'Suggestions' },
  ]
  const tab: Tab = tabs.some((t) => t.key === params.get('tab')) ? (params.get('tab') as Tab) : 'polls'
  const [editing, setEditing] = useState<Editing | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [removing, setRemoving] = useState<Removing | null>(null)
  const [scoresFor, setScoresFor] = useState<string | null>(null)
  const [tag, setTag] = useState('')
  const [openSuggestion, setOpenSuggestion] = useState<string | null>(null)

  const polls = useAllPolls()
  const quizzes = useAllQuizzes()
  const bank = useQuestionBank()
  const suggestions = useAllSuggestions()
  const attempts = useQuizAttempts(scoresFor ?? undefined)

  // `?open=` names a poll or a quiz, and the tab it came with says which. Locked the way the
  // Edit buttons below lock it, so arriving from the search cannot change what members answered.
  const openable =
    tab === 'polls'
      ? polls.data?.map(({ poll, tally }) => ({
          id: poll.id,
          open: () => setEditing({ kind: 'poll', poll, locked: tally.some((n) => n > 0) }),
        }))
      : tab === 'quizzes'
        ? quizzes.data?.map(({ quiz, locked }) => ({ id: quiz.id, open: () => setEditing({ kind: 'quiz', quiz, locked }) }))
        : []
  useOpenFromAddress(openable, (item) => {
    setDone(null)
    item.open()
  })

  const createPoll = useCreatePoll()
  const updatePoll = useUpdatePoll()
  const removePoll = useRemovePoll()
  const createQuiz = useCreateQuiz()
  const updateQuiz = useUpdateQuiz()
  const removeQuiz = useRemoveQuiz()
  const createQuestion = useCreateQuestion()
  const updateQuestion = useUpdateQuestion()
  const removeQuestion = useRemoveQuestion()
  const review = useReviewSuggestion()
  const removeSuggestion = useRemoveSuggestion()

  const show = (next: Tab, then?: Editing) => {
    const p = new URLSearchParams(params)
    p.set('tab', next)
    setParams(p, { replace: true })
    setEditing(then ?? null)
    setDone(null)
  }

  const waiting = waitingSuggestions(suggestions.data ?? []).length
  const questions = bank.data ?? []
  const tags = [...new Set(questions.flatMap((q) => q.tags))].sort()
  const removeBusy = removePoll.isPending || removeQuiz.isPending || removeQuestion.isPending || removeSuggestion.isPending
  const removeError = [removePoll, removeQuiz, removeQuestion, removeSuggestion].find((m) => m.isError)?.error?.message

  const finish = (message: string) => () => {
    setEditing(null)
    setDone(message)
  }

  /** Approving a suggestion is part of saving what it became, so the two land together. */
  const approve = (id: string | undefined) => {
    if (id) review.mutate({ id, status: 'approved' })
  }

  const confirmRemove = () => {
    if (!removing) return
    const close = { onSuccess: () => setRemoving(null) }
    if (removing.kind === 'poll') removePoll.mutate(removing.id, close)
    if (removing.kind === 'quiz') removeQuiz.mutate(removing.id, close)
    if (removing.kind === 'question') removeQuestion.mutate(removing.id, close)
    if (removing.kind === 'suggestion') removeSuggestion.mutate(removing.id, { onSuccess: () => (setRemoving(null), setOpenSuggestion(null)) })
  }

  const pollSaveError = (createPoll.isError ? createPoll.error : updatePoll.isError ? updatePoll.error : null)?.message
  const quizSaveError = (createQuiz.isError ? createQuiz.error : updateQuiz.isError ? updateQuiz.error : null)?.message
  const questionSaveError = (createQuestion.isError ? createQuestion.error : updateQuestion.isError ? updateQuestion.error : null)?.message

  return (
    <div className={portal.page}>
      <div className={portal.top}>
        <div>
          <h1 className={portal.title}>Polls and quizzes</h1>
          <p className={portal.sub}>Ask members what they think, and write quizzes for members and the public. One vote and one go per household.</p>
        </div>
      </div>

      <div className={portal.tabs} role="tablist" aria-label="Polls and quizzes">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            id={`tab-${t.key}`}
            aria-selected={tab === t.key}
            aria-controls={`panel-${t.key}`}
            className={tab === t.key ? portal.tabOn : portal.tab}
            onClick={() => show(t.key)}
          >
            {t.label}
            {t.key === 'suggestions' && waiting > 0 ? ` (${waiting})` : ''}
          </button>
        ))}
      </div>

      {done ? (
        <p className={portal.note} role="status">
          {done}
        </p>
      ) : null}

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className={portal.page}>
        {/* ---- Polls ---------------------------------------------------- */}
        {tab === 'polls' ? (
          editing?.kind === 'poll' ? (
            <section className={portal.panel} aria-labelledby="poll-form-title">
              <div className={portal.panelHead}>
                <h2 id="poll-form-title" className={portal.panelTitle}>
                  {editing.poll ? 'Change the poll' : editing.fromSuggestion ? 'A poll from a member’s suggestion' : 'A new poll'}
                </h2>
              </div>
              <div className={portal.pad}>
                <PollForm
                  poll={editing.poll}
                  start={editing.start}
                  locked={editing.locked}
                  saving={createPoll.isPending || updatePoll.isPending}
                  error={pollSaveError}
                  onCancel={() => setEditing(null)}
                  onSave={(draft) =>
                    editing.poll
                      ? updatePoll.mutate({ id: editing.poll.id, draft }, { onSuccess: finish('Saved.') })
                      : createPoll.mutate(draft, {
                          onSuccess: () => {
                            approve(editing.fromSuggestion)
                            finish(draft.opensAt ? 'The poll is made.' : 'Saved as a draft. Give it an opening time when it is ready.')()
                          },
                        })
                  }
                />
              </div>
            </section>
          ) : (
            <>
              <div>
                <Button variant="gold" size="sm" onClick={() => setEditing({ kind: 'poll' })}>
                  New poll
                </Button>
              </div>
              {polls.isPending ? (
                <p className={portal.empty} aria-busy="true">
                  Loading…
                </p>
              ) : (polls.data ?? []).length === 0 ? (
                <p className={portal.empty}>No polls yet.</p>
              ) : (
                (polls.data ?? []).map(({ poll, tally, voters }) => {
                  const state = stateOf(poll, now)
                  const count = tally.reduce((sum, n) => sum + n, 0)
                  return (
                    <section key={poll.id} className={portal.panel} aria-labelledby={`admin-poll-${poll.id}`}>
                      <div className={portal.panelHead}>
                        <div>
                          <h2 id={`admin-poll-${poll.id}`} className={portal.panelTitle}>
                            {poll.title}
                          </h2>
                          <p className={`${portal.muted} ${portal.tiny}`} style={{ marginTop: 4 }}>
                            {votesLabel(count)}
                            {poll.named ? ' · named' : ''}
                            {poll.opensAt && state === 'scheduled' ? ` · opens ${formatLongDate(poll.opensAt)}` : ''}
                            {poll.closesAt && state !== 'closed' ? ` · closes ${formatLongDate(poll.closesAt)}` : ''}
                          </p>
                        </div>
                        <span className={STATE_PILL[state]}>{STATE_WORDS[state]}</span>
                      </div>
                      <div className={portal.pad} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <Tally options={poll.options} tally={tally} />
                        {voters ? (
                          <p className={styles.voters}>
                            {voters.length === 0
                              ? 'Nobody has voted yet.'
                              : poll.options
                                  .map((option, i) => {
                                    const who = voters.filter((v) => v.option === i).map((v) => v.household)
                                    return who.length ? `${option}: ${who.join(', ')}` : null
                                  })
                                  .filter(Boolean)
                                  .join(' · ')}
                          </p>
                        ) : null}
                        <div className={portal.actions}>
                          <Button variant="line" size="sm" onClick={() => setEditing({ kind: 'poll', poll, locked: count > 0 })}>
                            Edit
                          </Button>
                          {state === 'draft' ? (
                            <Button
                              variant="line"
                              size="sm"
                              disabled={updatePoll.isPending}
                              onClick={() => updatePoll.mutate({ id: poll.id, draft: { ...pollDraftOf(poll), opensAt: now.toISOString() } })}
                            >
                              Open it now
                            </Button>
                          ) : null}
                          {state === 'open' ? (
                            <Button
                              variant="line"
                              size="sm"
                              disabled={updatePoll.isPending}
                              onClick={() => updatePoll.mutate({ id: poll.id, draft: { ...pollDraftOf(poll), closesAt: now.toISOString() } })}
                            >
                              Close it now
                            </Button>
                          ) : null}
                          <Button variant="danger" size="sm" onClick={() => setRemoving({ kind: 'poll', id: poll.id, title: poll.title })}>
                            <Icon name="trash" size={15} />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </section>
                  )
                })
              )}
              {updatePoll.isError && !editing ? (
                <p className={portal.note} role="alert">
                  {updatePoll.error.message}
                </p>
              ) : null}
            </>
          )
        ) : null}

        {/* ---- Quizzes -------------------------------------------------- */}
        {tab === 'quizzes' ? (
          editing?.kind === 'quiz' ? (
            <section className={portal.panel} aria-labelledby="quiz-form-title">
              <div className={portal.panelHead}>
                <h2 id="quiz-form-title" className={portal.panelTitle}>
                  {editing.quiz ? 'Change the quiz' : 'A new quiz'}
                </h2>
                {editing.quiz && editing.locked ? (
                  <Button
                    variant="line"
                    size="sm"
                    onClick={() =>
                      setEditing({
                        kind: 'quiz',
                        start: { ...quizDraftOf(editing.quiz), title: `${editing.quiz!.title} (copy)`, opensAt: '', closesAt: '' },
                      })
                    }
                  >
                    Make a copy
                  </Button>
                ) : null}
              </div>
              <div className={portal.pad}>
                <QuizForm
                  key={editing.quiz?.id ?? `new-${editing.start?.title ?? ''}`}
                  quiz={editing.quiz}
                  start={editing.start}
                  locked={editing.locked}
                  bank={questions}
                  saving={createQuiz.isPending || updateQuiz.isPending}
                  error={quizSaveError}
                  onCancel={() => setEditing(null)}
                  onSave={(draft) =>
                    editing.quiz
                      ? updateQuiz.mutate({ id: editing.quiz.id, draft }, { onSuccess: finish('Saved.') })
                      : createQuiz.mutate(draft, {
                          onSuccess: finish(draft.opensAt ? 'The quiz is made.' : 'Saved as a draft. Give it an opening time when it is ready.'),
                        })
                  }
                />
              </div>
            </section>
          ) : (
            <>
              {!showQuizzes ? (
                <p className={portal.note}>
                  <strong>Quizzes are switched off on the public website,</strong> so a quiz for everyone is played by members in the portal only.
                  Turn it on under Content → Site switches.
                </p>
              ) : null}
              <div>
                <Button variant="gold" size="sm" onClick={() => setEditing({ kind: 'quiz' })}>
                  New quiz
                </Button>
              </div>
              <section className={portal.panel} aria-labelledby="quizzes-title">
                <div className={portal.panelHead}>
                  <h2 id="quizzes-title" className={portal.panelTitle}>
                    Quizzes
                  </h2>
                </div>
                {quizzes.isPending ? (
                  <p className={portal.empty} aria-busy="true">
                    Loading…
                  </p>
                ) : (quizzes.data ?? []).length === 0 ? (
                  <p className={portal.empty}>No quizzes yet. Write some questions in the bank, then make one here.</p>
                ) : (
                  <div className={portal.scroll}>
                    <table className={portal.table}>
                      <thead>
                        <tr>
                          <th>Quiz</th>
                          <th>Who</th>
                          <th>State</th>
                          <th>Played</th>
                          <th>
                            <span className="sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(quizzes.data ?? []).map(({ quiz, memberPlays, publicPlays, locked }) => {
                          const state = stateOf(quiz, now)
                          return (
                            <tr key={quiz.id}>
                              <td>
                                <strong>{quiz.title}</strong>
                                <div className={`${portal.muted} ${portal.tiny}`}>
                                  {quiz.questionIds.length} {quiz.questionIds.length === 1 ? 'question' : 'questions'}
                                </div>
                              </td>
                              <td className={portal.tiny}>{quiz.audience === 'public' ? 'Everyone' : 'Members'}</td>
                              <td>
                                <span className={STATE_PILL[state]}>{STATE_WORDS[state]}</span>
                              </td>
                              <td className={portal.tiny}>
                                {memberPlays} {memberPlays === 1 ? 'household' : 'households'}
                                {quiz.audience === 'public' ? ` · ${publicPlays} ${publicPlays === 1 ? 'visitor' : 'visitors'}` : ''}
                              </td>
                              <td>
                                <div className={portal.actions} style={{ flexWrap: 'nowrap' }}>
                                  <Button variant="line" size="sm" onClick={() => setEditing({ kind: 'quiz', quiz, locked })}>
                                    Edit
                                  </Button>
                                  <Link to={`/portal/play/${quiz.id}`} className={portal.inlineLink}>
                                    Preview
                                  </Link>
                                  {memberPlays > 0 ? (
                                    <Button variant="line" size="sm" onClick={() => setScoresFor(scoresFor === quiz.id ? null : quiz.id)}>
                                      {scoresFor === quiz.id ? 'Hide scores' : 'Scores'}
                                    </Button>
                                  ) : null}
                                  <Button variant="danger" size="sm" aria-label={`Delete ${quiz.title}`} onClick={() => setRemoving({ kind: 'quiz', id: quiz.id, title: quiz.title })}>
                                    <Icon name="trash" size={15} />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
              {scoresFor ? (
                <section className={portal.panel} aria-labelledby="scores-title">
                  <div className={portal.panelHead}>
                    <h2 id="scores-title" className={portal.panelTitle}>
                      Scores: {(quizzes.data ?? []).find((s) => s.quiz.id === scoresFor)?.quiz.title}
                    </h2>
                  </div>
                  <div className={portal.scroll}>
                    <table className={portal.table}>
                      <thead>
                        <tr>
                          <th>Household</th>
                          <th>Score</th>
                          <th>On the leaderboard</th>
                          <th>Played</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(attempts.data ?? []).map((a) => (
                          <tr key={`${a.household}-${a.playedAt}`}>
                            <td>{a.household}</td>
                            <td>{scoreLine(a.score, a.total)}</td>
                            <td className={portal.tiny}>{a.showName ? 'By name' : 'As “a household”'}</td>
                            <td className={`${portal.muted} ${portal.tiny}`}>{formatLongDate(a.playedAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : null}
            </>
          )
        ) : null}

        {/* ---- Question bank ------------------------------------------- */}
        {tab === 'bank' ? (
          editing?.kind === 'question' ? (
            <section className={portal.panel} aria-labelledby="question-form-title">
              <div className={portal.panelHead}>
                <h2 id="question-form-title" className={portal.panelTitle}>
                  {editing.question ? 'Change the question' : editing.fromSuggestion ? 'A question from a member’s suggestion' : 'A new question'}
                </h2>
              </div>
              <div className={portal.pad}>
                <QuestionForm
                  question={editing.question}
                  start={editing.start}
                  saving={createQuestion.isPending || updateQuestion.isPending}
                  error={questionSaveError}
                  onCancel={() => setEditing(null)}
                  onSave={(draft) =>
                    editing.question
                      ? updateQuestion.mutate({ id: editing.question.id, draft }, { onSuccess: finish('Saved.') })
                      : createQuestion.mutate(draft, {
                          onSuccess: () => {
                            approve(editing.fromSuggestion)
                            finish('Added to the bank. Put it in a quiz from the Quizzes tab.')()
                          },
                        })
                  }
                />
              </div>
            </section>
          ) : (
            <>
              <div className={styles.row} style={{ justifyContent: 'flex-start' }}>
                <Button variant="gold" size="sm" onClick={() => setEditing({ kind: 'question' })}>
                  New question
                </Button>
                {tags.length > 0 ? (
                  <select className={portal.input} aria-label="Filter by tag" value={tag} onChange={(e) => setTag(e.target.value)} style={{ maxWidth: 220 }}>
                    <option value="">Every tag</option>
                    {tags.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>
              <section className={portal.panel} aria-labelledby="bank-title">
                <div className={portal.panelHead}>
                  <h2 id="bank-title" className={portal.panelTitle}>
                    Question bank
                  </h2>
                  <span className={`${portal.muted} ${portal.tiny}`}>{questions.length} questions</span>
                </div>
                {bank.isPending ? (
                  <p className={portal.empty} aria-busy="true">
                    Loading…
                  </p>
                ) : questions.length === 0 ? (
                  <p className={portal.empty}>The bank is empty. Every quiz is built from the questions here.</p>
                ) : (
                  <div className={portal.scroll}>
                    <table className={portal.table}>
                      <thead>
                        <tr>
                          <th>Question</th>
                          <th>Right answer</th>
                          <th>Tags</th>
                          <th>
                            <span className="sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {questions
                          .filter((q) => !tag || q.tags.includes(tag))
                          .map((q) => (
                            <tr key={q.id}>
                              <td>
                                <strong>{q.prompt}</strong>
                                <div className={`${portal.muted} ${portal.tiny}`}>
                                  {q.locked ? 'Answered in a quiz — wording fixed' : 'Not yet played'}
                                  {q.creditedTo ? ` · from ${q.creditedTo}` : ''}
                                  {q.imageUrl ? ' · has a picture' : ''}
                                </div>
                              </td>
                              <td>{q.options[q.correct]}</td>
                              <td className={portal.tiny}>{q.tags.join(', ') || '—'}</td>
                              <td>
                                <div className={portal.actions} style={{ flexWrap: 'nowrap' }}>
                                  <Button variant="line" size="sm" onClick={() => setEditing({ kind: 'question', question: q })}>
                                    Edit
                                  </Button>
                                  <Button variant="danger" size="sm" aria-label={`Delete “${q.prompt}”`} onClick={() => setRemoving({ kind: 'question', id: q.id, title: q.prompt })}>
                                    <Icon name="trash" size={15} />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )
        ) : null}

        {/* ---- Suggestions --------------------------------------------- */}
        {tab === 'suggestions' ? (
          <Suggestions
            list={suggestions.data ?? []}
            loading={suggestions.isPending}
            openId={openSuggestion}
            onOpen={setOpenSuggestion}
            reviewing={review.isPending}
            reviewError={review.isError ? review.error.message : undefined}
            onDecline={(id) => review.mutate({ id, status: 'rejected' })}
            onReopen={(id) => review.mutate({ id, status: 'pending' })}
            onRemove={(s) => setRemoving({ kind: 'suggestion', id: s.id, title: s.prompt })}
            onUseQuestion={(s) =>
              show('bank', {
                kind: 'question',
                fromSuggestion: s.id,
                start: {
                  prompt: s.prompt,
                  options: [...s.options],
                  correct: s.answer ?? 0,
                  creditedTo: s.credit ? (s.household ?? '') : '',
                },
              })
            }
            onUsePoll={(s) => show('polls', { kind: 'poll', fromSuggestion: s.id, start: { title: s.prompt, options: [...s.options] } })}
          />
        ) : null}
      </div>

      <ConfirmDialog
        open={removing !== null}
        title={`Delete “${removing?.title ?? ''}”?`}
        confirmLabel="Delete"
        busyLabel="Deleting…"
        busy={removeBusy}
        onCancel={() => setRemoving(null)}
        onConfirm={confirmRemove}
      >
        {removing?.kind === 'poll'
          ? 'The poll goes for good, with every vote in it.'
          : removing?.kind === 'quiz'
            ? 'The quiz goes for good, with every household’s score. Its questions stay in the bank.'
            : removing?.kind === 'question'
              ? 'The question goes from the bank for good. A question that is in a quiz has to be taken out of it first.'
              : 'The suggestion goes for good. To keep the record, decline it instead.'}
        {removeError ? (
          <span role="alert" style={{ display: 'block', marginTop: 12 }}>
            {removeError}
          </span>
        ) : null}
      </ConfirmDialog>
    </div>
  )
}

function Suggestions({
  list,
  loading,
  openId,
  onOpen,
  reviewing,
  reviewError,
  onDecline,
  onReopen,
  onRemove,
  onUseQuestion,
  onUsePoll,
}: {
  list: Suggestion[]
  loading: boolean
  openId: string | null
  onOpen: (id: string) => void
  reviewing: boolean
  reviewError?: string
  onDecline: (id: string) => void
  onReopen: (id: string) => void
  onRemove: (s: Suggestion) => void
  onUseQuestion: (s: Suggestion) => void
  onUsePoll: (s: Suggestion) => void
}) {
  if (loading) {
    return (
      <p className={portal.empty} aria-busy="true">
        Loading…
      </p>
    )
  }
  if (list.length === 0) return <p className={portal.empty}>No suggestions yet. Members send them from Polls and quizzes in the portal.</p>
  const open = list.find((s) => s.id === openId) ?? list[0]
  return (
    <div className={portal.two}>
      <section className={portal.panel} aria-labelledby="suggestion-queue">
        <div className={portal.panelHead}>
          <h2 id="suggestion-queue" className={portal.panelTitle}>
            From members
          </h2>
          <span className={`${portal.muted} ${portal.tiny}`}>{waitingSuggestions(list).length} waiting</span>
        </div>
        <ul className={portal.list}>
          {list.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className={portal.listItem}
                style={{ width: '100%', background: 'transparent', border: 0, color: 'inherit', textAlign: 'left', cursor: 'pointer', font: 'inherit' }}
                aria-current={s.id === open.id ? 'true' : undefined}
                onClick={() => onOpen(s.id)}
              >
                {s.status === 'pending' ? <span className={portal.dot} /> : null}
                <span className={portal.listBody}>
                  <strong>{s.prompt}</strong>
                  <span className={`${portal.muted} ${portal.tiny}`}>
                    {s.kind === 'question' ? 'Question' : 'Poll'} · {s.household ?? 'A household'} · {SUGGESTION_STATUS[s.status]}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className={portal.panel} aria-labelledby="suggestion-open">
        <div className={portal.panelHead}>
          <div>
            <h2 id="suggestion-open" className={portal.panelTitle}>
              {open.kind === 'question' ? 'A quiz question' : 'A poll'}
            </h2>
            <p className={`${portal.muted} ${portal.tiny}`} style={{ marginTop: 4 }}>
              From {open.household ?? 'a household'}, {formatLongDate(open.createdAt)} · {SUGGESTION_STATUS[open.status]}
              {open.reviewedBy ? ` (${open.reviewedBy})` : ''}
            </p>
          </div>
        </div>
        <div className={portal.pad} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: 17, fontWeight: 600 }}>{open.prompt}</p>
          <ul className={portal.plainList}>
            {open.options.map((option, i) => (
              <li key={i}>
                {option}
                {open.answer === i ? <strong> — the right answer</strong> : null}
              </li>
            ))}
          </ul>
          {open.note ? <p className={portal.note}>{open.note}</p> : null}
          <p className={`${portal.muted} ${portal.tiny}`}>
            {open.credit ? 'They would like their household credited if it is used.' : 'They did not ask to be credited.'}
          </p>
          <div className={portal.actions}>
            {open.status === 'pending' ? (
              <>
                <Button variant="gold" size="sm" disabled={reviewing} onClick={() => (open.kind === 'question' ? onUseQuestion(open) : onUsePoll(open))}>
                  <Icon name="check" size={15} />
                  {open.kind === 'question' ? 'Add to the question bank' : 'Make it a poll'}
                </Button>
                <Button variant="line" size="sm" disabled={reviewing} onClick={() => onDecline(open.id)}>
                  Not this time
                </Button>
              </>
            ) : (
              <Button variant="line" size="sm" disabled={reviewing} onClick={() => onReopen(open.id)}>
                Put back in the queue
              </Button>
            )}
            <Button variant="danger" size="sm" onClick={() => onRemove(open)}>
              <Icon name="trash" size={15} />
              Delete
            </Button>
          </div>
          {open.status === 'pending' ? (
            <p className={`${portal.muted} ${portal.tiny}`}>
              {open.kind === 'question' ? 'Opens the question form with it filled in.' : 'Opens the poll form with it filled in.'} It is marked used once you save.
            </p>
          ) : null}
          {reviewError ? (
            <p className={portal.note} role="alert">
              {reviewError}
            </p>
          ) : null}
        </div>
      </section>
    </div>
  )
}
