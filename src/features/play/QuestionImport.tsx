import { useId, useMemo, useState, type ChangeEvent } from 'react'
import { Button } from '@/components/Button'
import { InfoNote } from '@/components/InfoNote'
import { readImport, templateCsv, withoutRepeats, type ImportRow } from '@/domain/quizImport'
import { QUIZ_QUESTIONS_MAX, QUIZ_TITLE_MIN, tagsFrom, quizDraftOf } from '@/domain/quizzes'
import { useCreateQuestion, useCreateQuiz } from '@/lib/api'
import { Field } from '@/features/admin/ContentForms'
import formStyles from '@/features/admin/ContentForms.module.css'
import styles from './QuestionImport.module.css'

const LIST_EXAMPLE = `1. Which festival opens the Bengali year?
a) Durga Puja
b) Poila Boishakh
c) Holi
Answer: b
Explanation: The first day of Boishakh.

2. Who is worshipped at Saraswati Puja?
a) Lakshmi
b) *Saraswati*`

/**
 * Many questions at once, from a spreadsheet or from a list somebody wrote out.
 *
 * Paste, or choose a file, and every question is shown as it will be saved — or, where it
 * cannot be, with its row or line and what to change. Only the ready ones are saved, one at a
 * time through the same call the form makes, so nothing about an imported question differs from
 * a typed one. Questions already in the bank are left out, which makes it safe to fix the sheet
 * and import it again.
 */
export function QuestionImport({
  bankPrompts,
  onDone,
  onCancel,
}: {
  bankPrompts: readonly string[]
  onDone: (message: string) => void
  onCancel: () => void
}) {
  const [text, setText] = useState('')
  const [fileNote, setFileNote] = useState<string | null>(null)
  const [tagText, setTagText] = useState('')
  const [makeQuiz, setMakeQuiz] = useState(false)
  const [quizTitle, setQuizTitle] = useState('')
  const [progress, setProgress] = useState<{ saved: number; of: number } | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const createQuestion = useCreateQuestion()
  const createQuiz = useCreateQuiz()
  const summaryId = useId()

  const read = useMemo(() => (text.trim() ? readImport(text) : null), [text])
  const rows = useMemo(
    () => (read ? withoutRepeats(read.rows, bankPrompts, tagsFrom(tagText)) : []),
    [read, bankPrompts, tagText],
  )
  const ready = rows.filter((row) => row.problems.length === 0)
  const notReady = rows.filter((row) => row.problems.length > 0)

  const quizTooBig = makeQuiz && ready.length > QUIZ_QUESTIONS_MAX
  const quizUnnamed = makeQuiz && quizTitle.trim().length < QUIZ_TITLE_MIN
  const busy = progress !== null
  const canImport = ready.length > 0 && !quizTooBig && !quizUnnamed && !busy

  const chooseFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (/\.(xlsx|xls|numbers|ods)$/i.test(file.name)) {
      setFileNote(
        `“${file.name}” is a workbook, which this cannot open. In Excel choose File → Save As → “CSV UTF-8”, or select the cells and paste them here.`,
      )
      return
    }
    setFileNote(null)
    setText(await file.text())
  }

  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob([templateCsv()], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = '13parbon-questions-template.csv'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  /*
   * One at a time, in order, stopping at the first refusal. Whatever was saved before it stays
   * saved and is reported, and because a question already in the bank is left out, importing
   * the same paste again carries on from where it stopped rather than doubling up.
   */
  const importReady = async () => {
    setFailure(null)
    const ids: string[] = []
    setProgress({ saved: 0, of: ready.length })
    try {
      for (const row of ready) {
        const saved = await createQuestion.mutateAsync(row.draft)
        ids.push(saved.id)
        setProgress({ saved: ids.length, of: ready.length })
      }
      if (makeQuiz) {
        await createQuiz.mutateAsync({ ...quizDraftOf(), title: quizTitle.trim(), questionIds: ids })
      }
    } catch (error) {
      setProgress(null)
      const why = error instanceof Error ? error.message : String(error)
      setFailure(
        ids.length === ready.length
          ? `All ${ids.length} questions are in the bank, but the quiz could not be made: ${why}`
          : `${ids.length} of ${ready.length} were saved before one was refused: ${why} Fix it and import again — the saved ones will be left out.`,
      )
      return
    }
    const questions = `${ids.length} ${ids.length === 1 ? 'question' : 'questions'}`
    onDone(
      makeQuiz
        ? `${questions} added to the bank, and a draft quiz, “${quizTitle.trim()}”, made from them. Give it an opening time on the Quizzes tab.`
        : `${questions} added to the bank. Put them in a quiz from the Quizzes tab.`,
    )
  }

  return (
    <div className={formStyles.form}>
      <p className={formStyles.hint}>
        Paste the questions in — cells copied from Excel or Google Sheets, or a list from WhatsApp or a document — or choose a
        file. Each one is shown below before anything is saved.
      </p>

      <div>
        <InfoNote summary="How to lay out a spreadsheet">
          <p>
            One question to a row, under the headings <strong>Question</strong>, <strong>A</strong>, <strong>B</strong>,{' '}
            <strong>C</strong>, <strong>D</strong> (up to <strong>F</strong>) and <strong>Correct</strong>. Correct is the letter
            of the right answer — or its number, or the answer itself. <strong>Explanation</strong> and <strong>Tags</strong> are
            optional.
          </p>
          <p>Select the cells, headings included, and paste them here. Or save the sheet as “CSV UTF-8” and choose the file.</p>
          <p>
            <Button variant="line" size="sm" onClick={downloadTemplate}>
              Download the template
            </Button>
          </p>
        </InfoNote>
        <InfoNote summary="How to write a list">
          <p>
            The question, then each answer on its own line starting <strong>a)</strong>, <strong>b)</strong>… or a dash. Show the
            right one with an <strong>Answer:</strong> line, or put a <strong>*</strong> after it, or make it bold in WhatsApp.
            Leave a blank line between questions.
          </p>
          <pre className={styles.example}>{LIST_EXAMPLE}</pre>
        </InfoNote>
      </div>

      <Field label="Paste here">
        {(p) => (
          <textarea
            {...p}
            className={`${formStyles.textarea} ${styles.paste}`}
            rows={10}
            value={text}
            spellCheck={false}
            placeholder={LIST_EXAMPLE}
            disabled={busy}
            onChange={(e) => setText(e.target.value)}
          />
        )}
      </Field>

      <div className={styles.fileRow}>
        <label className={styles.fileButton}>
          Choose a file
          <input type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" className={styles.fileInput} onChange={chooseFile} disabled={busy} />
        </label>
        <span className={formStyles.hint}>A CSV or a text file.</span>
        {text ? (
          <Button variant="line" size="sm" onClick={() => setText('')} disabled={busy}>
            Clear
          </Button>
        ) : null}
      </div>
      {fileNote ? (
        <p className={formStyles.error} role="alert">
          {fileNote}
        </p>
      ) : null}

      {read ? (
        <section className={styles.preview} aria-labelledby={summaryId}>
          <h3 id={summaryId} className={styles.summary} aria-live="polite">
            Read as {read.format === 'spreadsheet' ? 'a spreadsheet' : 'a list'}: {ready.length} ready
            {notReady.length ? `, ${notReady.length} to fix` : ''}
          </h3>
          {read.notes.map((note) => (
            <p key={note} className={styles.note}>
              {note}
            </p>
          ))}
          {notReady.length ? (
            <ul className={styles.rows} aria-label="Not ready">
              {notReady.map((row) => (
                <Problem key={`${row.line}-${row.draft.prompt}`} row={row} format={read.format} />
              ))}
            </ul>
          ) : null}
          {ready.length ? (
            <ol className={styles.rows} aria-label="Ready to import">
              {ready.map((row) => (
                <li key={`${row.line}-${row.draft.prompt}`} className={styles.ready}>
                  <strong>{row.draft.prompt}</strong>
                  <span className={styles.answers}>
                    {row.draft.options.map((option, i) => (
                      <span key={i} className={i === row.draft.correct ? styles.right : styles.answer}>
                        {i === row.draft.correct ? '✓ ' : ''}
                        {option}
                      </span>
                    ))}
                  </span>
                  {row.draft.tags.length ? <span className={styles.meta}>Tags: {row.draft.tags.join(', ')}</span> : null}
                </li>
              ))}
            </ol>
          ) : null}
        </section>
      ) : null}

      <Field label="Tag them all" hint="Optional. Added to every question, alongside its own — the festival, or the quiz night. Separated by commas.">
        {(p) => <input {...p} className={formStyles.input} value={tagText} placeholder="durga-puja-2026" disabled={busy} onChange={(e) => setTagText(e.target.value)} />}
      </Field>

      <div className={formStyles.check}>
        <input id="import-make-quiz" type="checkbox" checked={makeQuiz} disabled={busy} onChange={(e) => setMakeQuiz(e.target.checked)} />
        <label htmlFor="import-make-quiz">Also make a quiz from them, as a draft nobody can see yet</label>
      </div>
      {makeQuiz ? (
        <Field
          label="Name of the quiz"
          error={quizTooBig ? `A quiz holds at most ${QUIZ_QUESTIONS_MAX} questions, and ${ready.length} are ready. Import them without a quiz, then build quizzes from the bank.` : undefined}
        >
          {(p) => <input {...p} className={formStyles.input} value={quizTitle} placeholder="Durga Puja quiz night" disabled={busy} onChange={(e) => setQuizTitle(e.target.value)} />}
        </Field>
      ) : null}

      {failure ? (
        <p className={formStyles.error} role="alert">
          {failure}
        </p>
      ) : null}

      <div className={formStyles.actions}>
        <Button variant="gold" onClick={importReady} disabled={!canImport}>
          {busy
            ? `Saving ${progress.saved} of ${progress.of}…`
            : ready.length
              ? `Import ${ready.length} ${ready.length === 1 ? 'question' : 'questions'}`
              : 'Import'}
        </Button>
        <Button variant="line" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        {notReady.length && ready.length && !busy ? (
          <span className={formStyles.hint}>The {notReady.length} to fix are left out. Fix them and paste again whenever.</span>
        ) : null}
      </div>
    </div>
  )
}

function Problem({ row, format }: { row: ImportRow; format: 'spreadsheet' | 'list' }) {
  return (
    <li className={styles.problem}>
      <span className={styles.where}>{format === 'spreadsheet' ? `Row ${row.line}` : `Line ${row.line}`}</span>
      <strong>{row.draft.prompt || '(no question)'}</strong>
      <ul className={styles.why}>
        {row.problems.map((problem) => (
          <li key={problem}>{problem}</li>
        ))}
      </ul>
    </li>
  )
}
