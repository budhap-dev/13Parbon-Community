/**
 * Questions arriving in bulk: from a spreadsheet, or from a list somebody typed.
 *
 * The committee writes questions in two places that are not this site — a shared sheet, and a
 * WhatsApp message or a document — and typing them in again one form at a time is how a quiz
 * night's twenty questions become a job nobody starts. So either is read here into the same
 * `QuestionDraft` the form makes, checked by the same `validateQuestion`, and saved through the
 * same call. Nothing about a question that arrives this way is different from one typed in;
 * in particular its right answer goes to the database the same way, and never to a player.
 *
 * Reading is forgiving and saving is not: anything that can be understood is, and anything that
 * cannot is shown with its row or line and the reason, and left out.
 */

import { QUESTION_OPTIONS_MAX, validateQuestion, type QuestionDraft } from './quizzes'

export type ImportFormat = 'spreadsheet' | 'list'

export type ImportRow = {
  /** Where it came from: the spreadsheet's row number, or the list's line, counting from 1. */
  line: number
  draft: QuestionDraft
  /** Why it cannot be saved as it is. Empty means it is ready. */
  problems: string[]
}

export type ImportResult = {
  format: ImportFormat
  rows: ImportRow[]
  /** About the whole paste rather than one question: no headings found, a mangled file. */
  notes: string[]
}

const LETTERS = 'abcdef'

const blankDraft = (): QuestionDraft => ({
  prompt: '',
  options: [],
  correct: -1,
  explanation: '',
  tags: [],
  imageUrl: '',
  creditedTo: '',
})

/**
 * The form's rules, in the form's words — less any that only repeat, less exactly, a problem
 * already found here ("Mark which answer is right" under "“E” is not one of its answers").
 */
function checked(line: number, draft: QuestionDraft, problems: string[] = []): ImportRow {
  const errors = validateQuestion(draft)
  if (problems.length) delete errors.correct
  if (problems.length && draft.options.length === 0) delete errors.options
  return { line, draft, problems: [...problems, ...Object.values(errors)] }
}

/**
 * Which answer is meant, from what was written: a letter, a number, or the answer itself.
 * `-1` when it is none of those.
 */
export function answerIndex(written: string, options: readonly string[]): number {
  const value = written.trim()
  if (!value) return -1
  const bare = value.replace(/^[([]\s*|\s*[)\].:]$/g, '').trim().toLowerCase()
  if (bare.length === 1 && LETTERS.includes(bare)) {
    const i = LETTERS.indexOf(bare)
    return i < options.length ? i : -1
  }
  if (/^[1-6]$/.test(bare)) {
    const i = Number(bare) - 1
    return i < options.length ? i : -1
  }
  const said = squash(value)
  return options.findIndex((option) => squash(option) === said)
}

const squash = (text: string) => text.trim().replace(/\s+/g, ' ').toLowerCase()

/** Tags as written in a cell or after "Tags:": commas, semicolons or both. */
const tagsIn = (text: string) => [...new Set(text.split(/[,;]/).map((t) => t.trim().toLowerCase()).filter(Boolean))]

// ---------------------------------------------------------------------------------------------
// Spreadsheets
// ---------------------------------------------------------------------------------------------

/**
 * Rows and cells, from a CSV file or from cells copied out of Excel or Google Sheets.
 *
 * Copied cells arrive separated by tabs; a CSV by commas, or by semicolons where the computer
 * writes decimals with a comma. Quoted cells may hold any of those, and line breaks, and a quote
 * written twice is one quote.
 */
export function readCells(text: string): string[][] {
  const body = text.replace(/^\uFEFF/, '')
  const firstLine = body.split(/\r?\n/, 1)[0] ?? ''
  const separator = firstLine.includes('\t')
    ? '\t'
    : (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0)
      ? ';'
      : ','

  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < body.length; i++) {
    const c = body[i]
    if (quoted) {
      if (c === '"' && body[i + 1] === '"') {
        cell += '"'
        i++
      } else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"' && cell === '') quoted = true
    else if (c === separator) {
      row.push(cell)
      cell = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && body[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += c
  }
  if (cell !== '' || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows
}

type Column = 'prompt' | 'option' | 'correct' | 'explanation' | 'tags' | 'image'

/** What a heading means, in the words people use for it. */
function columnFor(heading: string): { column: Column; option?: number } | null {
  const h = heading.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (['question', 'questions', 'prompt', 'q'].includes(h)) return { column: 'prompt' }
  const option = /^(?:option|answer|choice)?([a-f])$/.exec(h) ?? /^(?:option|answer|choice)([1-6])$/.exec(h)
  if (option) {
    const key = option[1]
    return { column: 'option', option: LETTERS.includes(key) ? LETTERS.indexOf(key) : Number(key) - 1 }
  }
  if (['correct', 'correctanswer', 'rightanswer', 'answer', 'right', 'key', 'solution'].includes(h)) return { column: 'correct' }
  if (['explanation', 'explain', 'why', 'notes', 'note'].includes(h)) return { column: 'explanation' }
  if (['tags', 'tag', 'topic', 'topics', 'category'].includes(h)) return { column: 'tags' }
  if (['picture', 'image', 'imageurl', 'photo', 'pictureurl'].includes(h)) return { column: 'image' }
  return null
}

/** Whether a first row reads as the headings this needs: a question, and somewhere for answers. */
function headingsOf(row: string[]) {
  const columns = row.map(columnFor)
  const has = (column: Column) => columns.some((c) => c?.column === column)
  return has('prompt') && has('option') ? columns : null
}

export function readSpreadsheet(text: string): ImportResult {
  const cells = readCells(text)
  const notes: string[] = []
  const headings = cells.length ? headingsOf(cells[0]) : null
  if (!headings) {
    return {
      format: 'spreadsheet',
      rows: [],
      notes: [
        'The first row needs to be the headings — Question, A, B, C, D, Correct — so each column can be read for what it is. Download the template to start from.',
      ],
    }
  }

  const rows: ImportRow[] = []
  cells.slice(1).forEach((cellsInRow, i) => {
    if (cellsInRow.every((cell) => !cell.trim())) return
    const draft = blankDraft()
    const options: string[] = []
    let correctWritten = ''
    headings.forEach((heading, col) => {
      const value = (cellsInRow[col] ?? '').trim()
      if (!heading) return
      if (heading.column === 'prompt') draft.prompt = value
      else if (heading.column === 'option') options[heading.option ?? 0] = value
      else if (heading.column === 'correct') correctWritten = value
      else if (heading.column === 'explanation') draft.explanation = value
      else if (heading.column === 'tags') draft.tags = tagsIn(value)
      else if (heading.column === 'image') draft.imageUrl = value
    })
    // Empty columns at the end are a question with fewer answers; one in the middle is a gap,
    // which the form's own rule then names.
    const filled = Array.from(options, (option) => option ?? '')
    while (filled.length && !filled[filled.length - 1]) filled.pop()
    draft.options = filled

    const problems: string[] = []
    if (!correctWritten) problems.push('Say which answer is right, in the Correct column.')
    else {
      draft.correct = answerIndex(correctWritten, filled)
      if (draft.correct < 0) problems.push(`“${correctWritten}” in the Correct column is not one of its answers.`)
    }
    rows.push(checked(i + 2, draft, problems))
  })

  if (text.includes('�')) notes.push(garbledNote)
  return { format: 'spreadsheet', rows, notes }
}

const garbledNote =
  'Some letters came through as “�”, which happens when Excel saves a plain CSV. Save it as “CSV UTF-8” instead, or copy the cells and paste them here.'

/** The template, with one question filled in to show the way. */
export const SPREADSHEET_TEMPLATE = [
  ['Question', 'A', 'B', 'C', 'D', 'Correct', 'Explanation', 'Tags'],
  [
    'Which festival opens the Bengali year?',
    'Durga Puja',
    'Poila Boishakh',
    'Holi',
    'Saraswati Puja',
    'B',
    'Poila Boishakh is the first day of Boishakh, the first month.',
    'festivals',
  ],
]

/** The template as a file Excel opens straight away, Bengali and all. */
export function templateCsv(): string {
  const cell = (value: string) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value)
  return `\uFEFF${SPREADSHEET_TEMPLATE.map((row) => row.map(cell).join(',')).join('\r\n')}\r\n`
}

// ---------------------------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------------------------

/** An answer line: `a)`, `(b)`, `C.`, `1)`, or a bullet. */
const OPTION = /^(?:\(?([a-fA-F]|[1-6])\s*[).:]|\(([a-fA-F]|[1-6])\)|[-•–])\s*(.+)$/
const ANSWER = /^(?:answer|ans|correct(?:\s+answer)?|right\s+answer)\s*[:\-–=]\s*(.+)$/i
const EXPLANATION = /^(?:explanation|why|because)\s*[:\-–]\s*(.+)$/i
const TAGS = /^(?:tags?|topics?)\s*[:\-–]\s*(.+)$/i
/** "1.", "Q1:", "Question 3 -", "Q." — the numbering in front of a question, not part of it. */
const NUMBERING = /^(?:q(?:uestion)?\s*\d*\s*[.):\-–]|\d+\s*[.):\-–])\s*/i

/** An answer marked as the right one, and the answer without the mark. */
function marked(text: string): { text: string; right: boolean } {
  let value = text.trim()
  let right = false
  // WhatsApp's bold, which is how a right answer is usually shown there: *Poila Boishakh*
  const bold = /^\*(.+)\*$/.exec(value)
  if (bold) {
    value = bold[1].trim()
    right = true
  }
  const trailing = /\s*(?:\*|✓|✔|✅|\((?:correct|right)\)|\[(?:correct|right)\])\s*$/i
  if (trailing.test(value)) {
    value = value.replace(trailing, '').trim()
    right = true
  }
  return { text: value, right }
}

type Block = {
  line: number
  prompt: string
  options: string[]
  rightMarks: number[]
  answer: string
  explanation: string
  tags: string[]
  /** What the answers are labelled with, so the next question's number is not read as one. */
  labels: 'letters' | 'numbers' | 'bullets' | null
}

export function readList(text: string): ImportResult {
  const blocks: Block[] = []
  let block: Block | null = null

  const start = (line: number, prompt: string) => {
    block = { line, prompt: prompt.replace(NUMBERING, '').trim(), options: [], rightMarks: [], answer: '', explanation: '', tags: [], labels: null }
    blocks.push(block)
  }

  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/)
  /** The next line with anything on it, after this one. */
  const nextWords = (from: number) => lines.slice(from + 1).find((l) => l.trim())?.trim() ?? ''

  lines.forEach((raw, i) => {
      const line = raw.trim()
      const n = i + 1
      if (!line) {
        // A blank line ends a question — unless the question is still waiting for its answers
        // and they come next, which is only spacing ("Question?", a gap, then "a) …").
        if (block && (block.options.length || !OPTION.test(nextWords(i)))) block = null
        return
      }
      if (!block) return start(n, line)
      const current: Block = block

      const answer = ANSWER.exec(line)
      if (answer && current.options.length) return void (current.answer = answer[1].trim())
      const explanation = EXPLANATION.exec(line)
      if (explanation && current.options.length) return void (current.explanation = explanation[1].trim())
      const tags = TAGS.exec(line)
      if (tags && current.options.length) return void (current.tags = tagsIn(tags[1]))

      const option = OPTION.exec(line)
      if (option) {
        const label = option[1] ?? option[2]
        const kind = label === undefined ? 'bullets' : /\d/.test(label) ? 'numbers' : 'letters'
        const position = label === undefined ? current.options.length : kind === 'numbers' ? Number(label) - 1 : LETTERS.indexOf(label.toLowerCase())
        // The next answer in the same style. Anything else — "2." after a), b), c) — is the
        // next question, written without a blank line before it.
        const continues = (current.labels === null || current.labels === kind) && position === current.options.length
        if (continues && current.options.length < QUESTION_OPTIONS_MAX) {
          const { text: optionText, right } = marked(option[3])
          if (right) current.rightMarks.push(current.options.length)
          current.options.push(optionText)
          current.labels = kind
          return
        }
        if (!current.options.length) {
          // Before any answers, a numbered line is more of the question ("1. ...").
          current.prompt = `${current.prompt} ${line}`.trim()
          return
        }
        return start(n, line)
      }

      // Words before any answers are more of the question; after them, a new question.
      if (!current.options.length) current.prompt = `${current.prompt} ${line}`.trim()
      else start(n, line)
    })

  const rows = blocks.map((b): ImportRow => {
    const draft = { ...blankDraft(), prompt: b.prompt, options: b.options, explanation: b.explanation, tags: b.tags }
    const problems: string[] = []
    const byAnswer = b.answer ? answerIndex(b.answer, b.options) : -1
    if (b.answer && byAnswer < 0) problems.push(`“Answer: ${b.answer}” is not one of its answers.`)
    else if (b.rightMarks.length > 1) problems.push('More than one answer is marked as right.')
    else if (b.answer && b.rightMarks.length === 1 && b.rightMarks[0] !== byAnswer) {
      problems.push('The answer marked and the “Answer:” line say different things.')
    } else if (!b.answer && b.rightMarks.length === 0 && b.options.length) {
      problems.push('Say which answer is right: an “Answer:” line, or a * after it.')
    }
    draft.correct = byAnswer >= 0 ? byAnswer : b.rightMarks.length === 1 ? b.rightMarks[0] : -1
    if (!b.options.length) problems.push('No answers found under it. Put each on its own line, starting a), b), c) or -.')
    return checked(b.line, draft, problems)
  })

  return { format: 'list', rows, notes: text.includes('�') ? [garbledNote] : [] }
}

// ---------------------------------------------------------------------------------------------
// Either
// ---------------------------------------------------------------------------------------------

/** Read whichever was pasted: headings in the first row make it a spreadsheet. */
export function readImport(text: string): ImportResult {
  const first = readCells(text.trim())[0]
  const looksLikeSheet = Boolean(first && first.length > 1 && headingsOf(first))
  return looksLikeSheet ? readSpreadsheet(text.trim()) : readList(text)
}

/**
 * Marks what is already in the bank, and what appears twice in the paste, so importing the same
 * sheet again — after fixing one row, say — adds the fixed row and nothing else.
 */
export function withoutRepeats(rows: ImportRow[], bankPrompts: readonly string[], extraTags: readonly string[] = []): ImportRow[] {
  const inBank = new Set(bankPrompts.map(squash))
  const seen = new Set<string>()
  return rows.map((row) => {
    const key = squash(row.draft.prompt)
    const problems = [...row.problems]
    if (key && inBank.has(key)) problems.push('Already in the question bank.')
    else if (key && seen.has(key)) problems.push('The same question appears earlier in this paste.')
    seen.add(key)
    const tags = [...new Set([...row.draft.tags, ...extraTags])]
    return { ...row, draft: { ...row.draft, tags }, problems }
  })
}
