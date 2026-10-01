import { useState, type FormEvent } from 'react'
import { Button } from '@/components/Button'
import { PhotoUpload } from '@/components/PhotoUpload'
import { forDateTimeInput, fromDateTimeInput } from '@/domain/dates'
import { isValid, slugFrom, type ContentErrors } from '@/domain/news'
import {
  POLL_OPTIONS_MAX,
  POLL_RESULTS,
  POLL_TITLE_MAX,
  POLL_TITLE_MIN,
  pollDraftOf,
  validatePoll,
  type Poll,
  type PollDraft,
  type PollResults,
} from '@/domain/polls'
import {
  PROMPT_MAX,
  PROMPT_MIN,
  QUESTION_OPTIONS_MAX,
  QUIZ_AUDIENCE,
  QUIZ_TITLE_MAX,
  QUIZ_TITLE_MIN,
  questionDraftOf,
  quizDraftOf,
  tagsFrom,
  validateQuestion,
  validateQuiz,
  type BankQuestion,
  type QuestionDraft,
  type Quiz,
  type QuizAudience,
  type QuizDraft,
} from '@/domain/quizzes'
import { validateSuggestion, type SuggestionDraft, type SuggestionKind } from '@/domain/suggestions'
import { readSupabaseConfig } from '@/lib/api'
import { readUploadConfig, uploadPhoto, UploadNotConfigured } from '@/lib/api/uploads'
import { accessToken } from '@/lib/auth/supabaseAuth'
import { Field } from '@/features/admin/ContentForms'
import { outstanding } from '@/features/admin/outstanding'
import formStyles from '@/features/admin/ContentForms.module.css'
import styles from './Play.module.css'

/**
 * A list of choices somebody can add to and take from. With `correct`, each row also carries
 * a radio for "this one is right" — a quiz question, or a member's suggested question.
 */
function Choices({
  label,
  options,
  onChange,
  most,
  error,
  correct,
  onCorrect,
  locked,
}: {
  label: string
  options: string[]
  onChange: (options: string[]) => void
  most: number
  error?: string
  correct?: number
  onCorrect?: (index: number) => void
  locked?: boolean
}) {
  const id = label.toLowerCase().replace(/[^a-z]+/g, '-')
  return (
    <fieldset className={formStyles.field} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }} aria-describedby={error ? `${id}-error` : undefined}>
      <legend className={formStyles.label}>{label}</legend>
      {onCorrect ? <p className={formStyles.hint}>Tick the one that is right.</p> : null}
      {options.map((option, i) => (
        <div key={i} className={styles.optionRow}>
          {onCorrect ? (
            <input
              type="radio"
              name={`${id}-correct`}
              checked={correct === i}
              disabled={locked}
              aria-label={`Answer ${i + 1} is the right one`}
              onChange={() => onCorrect(i)}
            />
          ) : null}
          <input
            className={formStyles.input}
            value={option}
            disabled={locked}
            aria-label={`${onCorrect ? 'Answer' : 'Choice'} ${i + 1}`}
            aria-invalid={error ? true : undefined}
            onChange={(e) => onChange(options.map((o, n) => (n === i ? e.target.value : o)))}
          />
          <button
            type="button"
            className={styles.iconButton}
            disabled={locked || options.length <= 2}
            aria-label={`Remove ${onCorrect ? 'answer' : 'choice'} ${i + 1}`}
            onClick={() => {
              onChange(options.filter((_, n) => n !== i))
              // The tick follows its answer up the list, and falls to the first if its own went.
              if (onCorrect && correct !== undefined) {
                if (correct === i) onCorrect(0)
                else if (correct > i) onCorrect(correct - 1)
              }
            }}
          >
            ✕
          </button>
        </div>
      ))}
      {!locked && options.length < most ? (
        <div>
          <Button variant="line" size="sm" onClick={() => onChange([...options, ''])}>
            Add {onCorrect ? 'an answer' : 'a choice'}
          </Button>
        </div>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className={formStyles.error}>
          {error}
        </p>
      ) : null}
    </fieldset>
  )
}

function Dates({
  opensAt,
  closesAt,
  onChange,
  error,
  what,
}: {
  opensAt: string
  closesAt: string
  onChange: (dates: { opensAt: string; closesAt: string }) => void
  error?: string
  what: string
}) {
  return (
    <div className={formStyles.row}>
      <Field label="Opens" hint={`Leave empty to keep the ${what} as a draft nobody else can see.`}>
        {(p) => (
          <input
            {...p}
            type="datetime-local"
            className={formStyles.input}
            value={forDateTimeInput(opensAt)}
            onChange={(e) => onChange({ opensAt: fromDateTimeInput(e.target.value), closesAt })}
          />
        )}
      </Field>
      <Field label="Closes" hint="Leave empty and it stays open until you close it." error={error}>
        {(p) => (
          <input
            {...p}
            type="datetime-local"
            className={formStyles.input}
            value={forDateTimeInput(closesAt)}
            onChange={(e) => onChange({ opensAt, closesAt: fromDateTimeInput(e.target.value) })}
          />
        )}
      </Field>
    </div>
  )
}

function Actions({ saving, label, onCancel, error }: { saving?: boolean; label: string; onCancel: () => void; error?: string }) {
  return (
    <div className={formStyles.actions}>
      <Button variant="gold" type="submit" size="sm" disabled={saving}>
        {saving ? 'Saving…' : label}
      </Button>
      <Button variant="line" size="sm" onClick={onCancel}>
        Cancel
      </Button>
      {error ? (
        <span className={formStyles.error} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  )
}

/** Writing a poll. Once anybody has voted, the choices and whether it is named are fixed. */
export function PollForm({
  poll,
  start,
  locked,
  onSave,
  onCancel,
  saving,
  error,
}: {
  poll?: Poll
  /** A starting point that is not a saved poll — a member's suggestion being turned into one. */
  start?: Partial<PollDraft>
  locked?: boolean
  onSave: (draft: PollDraft) => void
  onCancel: () => void
  saving?: boolean
  error?: string
}) {
  const [draft, setDraft] = useState<PollDraft>(() => ({ ...pollDraftOf(poll), ...start }))
  const [refused, setRefused] = useState<ContentErrors>({})
  const errors = outstanding(refused, validatePoll(draft))

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const found = validatePoll(draft)
    setRefused(found)
    if (isValid(found)) onSave(draft)
  }

  return (
    <form className={formStyles.form} onSubmit={submit} noValidate>
      <Field label="The question" error={errors.title} need={{ value: draft.title, min: POLL_TITLE_MIN, max: POLL_TITLE_MAX }}>
        {(p) => <input {...p} className={formStyles.input} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />}
      </Field>
      <Field label="Background" hint="Optional. Where, when, or why you are asking." error={errors.detail}>
        {(p) => (
          <textarea {...p} className={formStyles.textarea} rows={3} value={draft.detail} onChange={(e) => setDraft({ ...draft, detail: e.target.value })} />
        )}
      </Field>

      {locked ? (
        <p className={formStyles.hint}>
          <strong>People have already voted,</strong> so the choices and whether the poll is named are fixed. The question, background, dates
          and when totals show can still change.
        </p>
      ) : null}
      <Choices label="Choices" options={draft.options} onChange={(options) => setDraft({ ...draft, options })} most={POLL_OPTIONS_MAX} error={errors.options} locked={locked} />

      <Field label="Members see the totals">
        {(p) => (
          <select {...p} className={formStyles.input} value={draft.results} onChange={(e) => setDraft({ ...draft, results: e.target.value as PollResults })}>
            {(Object.keys(POLL_RESULTS) as PollResults[]).map((key) => (
              <option key={key} value={key}>
                {POLL_RESULTS[key]}
              </option>
            ))}
          </select>
        )}
      </Field>

      <div className={formStyles.check}>
        <input id="named" type="checkbox" checked={draft.named} disabled={locked} aria-describedby="named-note" onChange={(e) => setDraft({ ...draft, named: e.target.checked })} />
        <span>
          <label htmlFor="named">Named — the committee sees who chose what</label>
          <span id="named-note" className={formStyles.hint}>
            For a headcount, like who can help set up. Members are told on the poll before they vote. Leave it off and nobody, the committee
            included, can see how any household voted.
          </span>
        </span>
      </div>

      <Dates what="poll" opensAt={draft.opensAt} closesAt={draft.closesAt} error={errors.closesAt} onChange={(d) => setDraft({ ...draft, ...d })} />
      <Actions saving={saving} label={poll ? 'Save' : 'Make the poll'} onCancel={onCancel} error={error} />
    </form>
  )
}

/** Writing a question for the bank. */
export function QuestionForm({
  question,
  start,
  onSave,
  onCancel,
  saving,
  error,
}: {
  question?: BankQuestion
  start?: Partial<QuestionDraft>
  onSave: (draft: QuestionDraft) => void
  onCancel: () => void
  saving?: boolean
  error?: string
}) {
  const [draft, setDraft] = useState<QuestionDraft>(() => ({ ...questionDraftOf(question), ...start }))
  const [tags, setTags] = useState(() => draft.tags.join(', '))
  const [refused, setRefused] = useState<ContentErrors>({})
  const errors = outstanding(refused, validateQuestion(draft))
  const locked = Boolean(question?.locked)
  const uploads = readUploadConfig(import.meta.env)
  const supabase = readSupabaseConfig(import.meta.env)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const next = { ...draft, tags: tagsFrom(tags) }
    const found = validateQuestion(next)
    setRefused(found)
    if (isValid(found)) onSave(next)
  }

  return (
    <form className={formStyles.form} onSubmit={submit} noValidate>
      {locked ? (
        <p className={formStyles.hint}>
          <strong>Somebody has answered this in a quiz,</strong> so the wording and the right answer are fixed. The explanation, tags and
          picture can still change.
        </p>
      ) : null}
      <Field label="Question" error={errors.prompt} need={{ value: draft.prompt, min: PROMPT_MIN, max: PROMPT_MAX }}>
        {(p) => (
          <input {...p} className={formStyles.input} value={draft.prompt} disabled={locked} onChange={(e) => setDraft({ ...draft, prompt: e.target.value })} />
        )}
      </Field>
      <Choices
        label="Answers"
        options={draft.options}
        onChange={(options) => setDraft({ ...draft, options })}
        most={QUESTION_OPTIONS_MAX}
        error={errors.options ?? errors.correct}
        correct={draft.correct}
        onCorrect={(correct) => setDraft((d) => ({ ...d, correct }))}
        locked={locked}
      />
      <Field label="Why it is right" hint="Optional. Shown after somebody answers — a line of the story behind it." error={errors.explanation}>
        {(p) => (
          <textarea {...p} className={formStyles.textarea} rows={3} value={draft.explanation} onChange={(e) => setDraft({ ...draft, explanation: e.target.value })} />
        )}
      </Field>
      <div className={formStyles.row}>
        <Field label="Tags" hint="The festival it is about, so it can be found next year. Separated by commas.">
          {(p) => <input {...p} className={formStyles.input} value={tags} placeholder="durga-puja, food" onChange={(e) => setTags(e.target.value)} />}
        </Field>
        <Field label="Credit" hint="The household that suggested it, if they asked to be named.">
          {(p) => <input {...p} className={formStyles.input} value={draft.creditedTo} onChange={(e) => setDraft({ ...draft, creditedTo: e.target.value })} />}
        </Field>
      </div>
      <Field
        label="Picture"
        hint="Optional. A festival picture — an idol, a dish, a decoration. Never a photograph of somebody’s child: quiz pictures are public."
        error={errors.imageUrl}
      >
        {(p) => <input {...p} className={formStyles.input} value={draft.imageUrl} placeholder="https://…" onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })} />}
      </Field>
      <PhotoUpload
        canSend={Boolean(uploads)}
        label="Choose a picture"
        onSend={async (prepared, name) => {
          if (!uploads) throw new UploadNotConfigured()
          const stem = slugFrom(draft.prompt).slice(0, 40) || slugFrom(name.replace(/\.[^.]+$/, '')).slice(0, 40) || 'picture'
          const key = `quiz-${stem}-${Date.now().toString(36)}`.replace(/-+/g, '-')
          const token = supabase ? await accessToken(supabase) : null
          if (!token) throw new Error('Sign in first.')
          return uploadPhoto(uploads, key, prepared, token)
        }}
        onDone={(url) => setDraft((d) => ({ ...d, imageUrl: url }))}
      />
      <Actions saving={saving} label={question ? 'Save' : 'Add to the bank'} onCancel={onCancel} error={error} />
    </form>
  )
}

/** Building a quiz from the bank. Once anybody has played, the list of questions is fixed. */
export function QuizForm({
  quiz,
  start,
  bank,
  locked,
  onSave,
  onCancel,
  saving,
  error,
}: {
  quiz?: Quiz
  start?: Partial<QuizDraft>
  bank: BankQuestion[]
  locked?: boolean
  onSave: (draft: QuizDraft) => void
  onCancel: () => void
  saving?: boolean
  error?: string
}) {
  const [draft, setDraft] = useState<QuizDraft>(() => ({ ...quizDraftOf(quiz), ...start }))
  const [refused, setRefused] = useState<ContentErrors>({})
  const [tag, setTag] = useState('')
  const errors = outstanding(refused, validateQuiz(draft))
  const byId = new Map(bank.map((q) => [q.id, q]))
  const tags = [...new Set(bank.flatMap((q) => q.tags))].sort()
  const available = bank.filter((q) => !draft.questionIds.includes(q.id) && (!tag || q.tags.includes(tag)))

  const move = (from: number, to: number) => {
    const ids = [...draft.questionIds]
    const [taken] = ids.splice(from, 1)
    ids.splice(to, 0, taken)
    setDraft({ ...draft, questionIds: ids })
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const found = validateQuiz(draft)
    setRefused(found)
    if (isValid(found)) onSave(draft)
  }

  return (
    <form className={formStyles.form} onSubmit={submit} noValidate>
      <Field label="Name" error={errors.title} need={{ value: draft.title, min: QUIZ_TITLE_MIN, max: QUIZ_TITLE_MAX }}>
        {(p) => <input {...p} className={formStyles.input} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />}
      </Field>
      <Field label="Introduction" hint="Optional. A line before the first question." error={errors.intro}>
        {(p) => <textarea {...p} className={formStyles.textarea} rows={2} value={draft.intro} onChange={(e) => setDraft({ ...draft, intro: e.target.value })} />}
      </Field>
      <Field
        label="Who can play"
        hint={
          draft.audience === 'public'
            ? 'Anybody, without signing in — once Quizzes is switched on under Content → Site switches. Members play it in the portal too.'
            : 'Signed-in members, in the portal.'
        }
      >
        {(p) => (
          <select {...p} className={formStyles.input} value={draft.audience} onChange={(e) => setDraft({ ...draft, audience: e.target.value as QuizAudience })}>
            {(Object.keys(QUIZ_AUDIENCE) as QuizAudience[]).map((key) => (
              <option key={key} value={key}>
                {QUIZ_AUDIENCE[key]}
              </option>
            ))}
          </select>
        )}
      </Field>

      <fieldset className={formStyles.field} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <legend className={formStyles.label}>Questions, in order</legend>
        {locked ? (
          <p className={formStyles.hint}>
            <strong>People have already played this quiz,</strong> so its questions are fixed. Make a copy to change them.
          </p>
        ) : null}
        {draft.questionIds.length === 0 ? (
          <p className={formStyles.hint}>None yet. Add them from the bank below.</p>
        ) : (
          <ol className={styles.picked}>
            {draft.questionIds.map((id, i) => (
              <li key={id}>
                <span className={styles.pickedText}>
                  {i + 1}. {byId.get(id)?.prompt ?? 'A question no longer in the bank'}
                </span>
                <button type="button" className={styles.iconButton} disabled={locked || i === 0} aria-label={`Move question ${i + 1} up`} onClick={() => move(i, i - 1)}>
                  ↑
                </button>
                <button
                  type="button"
                  className={styles.iconButton}
                  disabled={locked || i === draft.questionIds.length - 1}
                  aria-label={`Move question ${i + 1} down`}
                  onClick={() => move(i, i + 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className={styles.iconButton}
                  disabled={locked}
                  aria-label={`Take question ${i + 1} out`}
                  onClick={() => setDraft({ ...draft, questionIds: draft.questionIds.filter((q) => q !== id) })}
                >
                  ✕
                </button>
              </li>
            ))}
          </ol>
        )}
        {errors.questionIds ? <p className={formStyles.error}>{errors.questionIds}</p> : null}
      </fieldset>

      {!locked ? (
        <div className={formStyles.row}>
          <Field label="Filter the bank">
            {(p) => (
              <select {...p} className={formStyles.input} value={tag} onChange={(e) => setTag(e.target.value)}>
                <option value="">Every tag</option>
                {tags.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Add a question" hint={available.length === 0 ? 'Nothing left to add — write more in the Question bank tab.' : undefined}>
            {(p) => (
              <select
                {...p}
                className={formStyles.input}
                value=""
                disabled={available.length === 0}
                onChange={(e) => e.target.value && setDraft({ ...draft, questionIds: [...draft.questionIds, e.target.value] })}
              >
                <option value="">Choose one…</option>
                {available.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.prompt}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>
      ) : null}

      <Dates what="quiz" opensAt={draft.opensAt} closesAt={draft.closesAt} error={errors.closesAt} onChange={(d) => setDraft({ ...draft, ...d })} />
      <Actions saving={saving} label={quiz ? 'Save' : 'Make the quiz'} onCancel={onCancel} error={error} />
    </form>
  )
}

const blankSuggestion = (kind: SuggestionKind): SuggestionDraft => ({
  kind,
  prompt: '',
  options: ['', ''],
  ...(kind === 'question' ? { answer: 0 } : {}),
  note: '',
  credit: true,
})

/** A member suggesting a quiz question or a poll. */
export function SuggestionForm({
  householdName,
  onSend,
  onCancel,
  sending,
  error,
}: {
  householdName?: string
  onSend: (draft: SuggestionDraft) => void
  onCancel: () => void
  sending?: boolean
  error?: string
}) {
  const [draft, setDraft] = useState<SuggestionDraft>(() => blankSuggestion('question'))
  const [refused, setRefused] = useState<ContentErrors>({})
  const errors = outstanding(refused, validateSuggestion(draft))
  const question = draft.kind === 'question'

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const found = validateSuggestion(draft)
    setRefused(found)
    if (isValid(found)) onSend(draft)
  }

  return (
    <form className={formStyles.form} onSubmit={submit} noValidate>
      <Field label="What are you suggesting?">
        {(p) => (
          <select
            {...p}
            className={formStyles.input}
            value={draft.kind}
            onChange={(e) => {
              const kind = e.target.value as SuggestionKind
              setDraft({ ...blankSuggestion(kind), prompt: draft.prompt, options: draft.options, note: draft.note, credit: draft.credit })
            }}
          >
            <option value="question">A quiz question</option>
            <option value="poll">A poll for members</option>
          </select>
        )}
      </Field>
      <Field label={question ? 'The question' : 'What to ask'} error={errors.prompt} need={{ value: draft.prompt, min: PROMPT_MIN, max: PROMPT_MAX }}>
        {(p) => <input {...p} className={formStyles.input} value={draft.prompt} onChange={(e) => setDraft({ ...draft, prompt: e.target.value })} />}
      </Field>
      <Choices
        label={question ? 'Answers' : 'Choices'}
        options={draft.options}
        onChange={(options) => setDraft({ ...draft, options })}
        most={question ? QUESTION_OPTIONS_MAX : POLL_OPTIONS_MAX}
        error={errors.options ?? errors.answer}
        {...(question ? { correct: draft.answer, onCorrect: (answer: number) => setDraft((d) => ({ ...d, answer })) } : {})}
      />
      <Field label="Anything the committee should know" hint="Optional — where it came from, which festival it is for." error={errors.note}>
        {(p) => <textarea {...p} className={formStyles.textarea} rows={2} value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />}
      </Field>
      <div className={formStyles.check}>
        <input id="credit" type="checkbox" checked={draft.credit} onChange={(e) => setDraft({ ...draft, credit: e.target.checked })} />
        <span>
          <label htmlFor="credit">Credit {householdName ?? 'our household'} if it is used</label>
        </span>
      </div>
      <Actions saving={sending} label="Send to the committee" onCancel={onCancel} error={error} />
    </form>
  )
}
