import { describe, expect, it } from 'vitest'
import { answerIndex, readCells, readImport, readList, readSpreadsheet, templateCsv, withoutRepeats } from './quizImport'

const ready = (text: string) => readImport(text).rows.filter((row) => row.problems.length === 0)

describe('reading cells', () => {
  it('reads cells copied out of Excel or Google Sheets, which arrive separated by tabs', () => {
    expect(readCells('Question\tA\tB\nWhen?\tToday\tTomorrow')).toEqual([
      ['Question', 'A', 'B'],
      ['When?', 'Today', 'Tomorrow'],
    ])
  })

  it('reads a CSV, with commas, quotes and line breaks inside quoted cells', () => {
    expect(readCells('\uFEFFQuestion,A\r\n"Rice, or luchi?","He said ""both""\nand meant it"\r\n')).toEqual([
      ['Question', 'A'],
      ['Rice, or luchi?', 'He said "both"\nand meant it'],
    ])
  })

  it('reads a CSV written with semicolons, as Excel does where decimals take a comma', () => {
    expect(readCells('Question;A;B\nWhen?;Today;Tomorrow')[1]).toEqual(['When?', 'Today', 'Tomorrow'])
  })
})

describe('which answer is meant', () => {
  const options = ['Durga Puja', 'Poila Boishakh', 'Holi']
  it('takes a letter, a number or the answer itself', () => {
    expect(answerIndex('B', options)).toBe(1)
    expect(answerIndex('b)', options)).toBe(1)
    expect(answerIndex('(c)', options)).toBe(2)
    expect(answerIndex('2', options)).toBe(1)
    expect(answerIndex('  poila   boishakh ', options)).toBe(1)
  })
  it('is none of them for a letter past the end, or words that are not an answer', () => {
    expect(answerIndex('D', options)).toBe(-1)
    expect(answerIndex('Kali Puja', options)).toBe(-1)
    expect(answerIndex('', options)).toBe(-1)
  })
})

describe('a spreadsheet', () => {
  const sheet = [
    'Question\tA\tB\tC\tD\tCorrect\tExplanation\tTags',
    'Which festival opens the Bengali year?\tDurga Puja\tPoila Boishakh\tHoli\tSaraswati Puja\tB\tThe first of Boishakh.\tfestivals; calendar',
    'Two answers only?\tYes\tNo\t\t\tYes\t\t',
  ].join('\n')

  it('becomes questions, with their answers, the right one, an explanation and tags', () => {
    const { format, rows } = readImport(sheet)
    expect(format).toBe('spreadsheet')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      line: 2,
      problems: [],
      draft: {
        prompt: 'Which festival opens the Bengali year?',
        options: ['Durga Puja', 'Poila Boishakh', 'Holi', 'Saraswati Puja'],
        correct: 1,
        explanation: 'The first of Boishakh.',
        tags: ['festivals', 'calendar'],
      },
    })
    expect(rows[1].draft).toMatchObject({ options: ['Yes', 'No'], correct: 0 })
  })

  it('understands the headings people actually write', () => {
    const rows = readSpreadsheet('Questions,Option 1,Option 2,Right answer,Topic\nWhen?,Today,Tomorrow,2,dates').rows
    expect(rows[0]).toMatchObject({ problems: [], draft: { options: ['Today', 'Tomorrow'], correct: 1, tags: ['dates'] } })
  })

  it('says which row is wrong and why, and leaves the rest ready', () => {
    const rows = readSpreadsheet(
      ['Question,A,B,C,Correct', 'Fine?,Yes,No,,A', 'No answer?,Yes,No,,', 'Wrong letter?,Yes,No,,D', 'Gap?,Yes,,Maybe,A', 'Hi,Yes,No,,A'].join('\n'),
    ).rows
    expect(rows.map((row) => row.line)).toEqual([2, 3, 4, 5, 6])
    expect(rows[0].problems).toEqual([])
    expect(rows[1].problems).toEqual(['Say which answer is right, in the Correct column.'])
    expect(rows[2].problems).toEqual(['“D” in the Correct column is not one of its answers.'])
    expect(rows[3].problems).toEqual(['Fill in every answer, or remove the empty one.'])
    expect(rows[4].problems).toEqual(['Write the question.'])
  })

  it('skips empty rows, which a spreadsheet is full of', () => {
    expect(readSpreadsheet('Question,A,B,Correct\n,,,\nWhen?,Now,Later,A\n,,,').rows).toHaveLength(1)
  })

  it('asks for headings when there are none', () => {
    const result = readSpreadsheet('When?,Now,Later,A')
    expect(result.rows).toEqual([])
    expect(result.notes[0]).toMatch(/headings/)
  })

  it('says how to fix a file whose letters Excel has mangled', () => {
    expect(readSpreadsheet('Question,A,B,Correct\nK�li?,Yes,No,A').notes[0]).toMatch(/CSV UTF-8/)
  })

  it('reads its own template back', () => {
    const rows = readImport(templateCsv()).rows
    expect(rows).toHaveLength(1)
    expect(rows[0].problems).toEqual([])
  })
})

describe('a list, from WhatsApp or a document', () => {
  it('reads questions separated by blank lines, with an Answer line', () => {
    const rows = readList(
      [
        '1. Which festival opens the Bengali year?',
        'a) Durga Puja',
        'b) Poila Boishakh',
        'c) Holi',
        'Answer: b',
        'Explanation: The first of Boishakh.',
        'Tags: festivals, calendar',
        '',
        '2. Who is worshipped at Saraswati Puja?',
        'A. Lakshmi',
        'B. Saraswati',
        'Answer: Saraswati',
      ].join('\n'),
    ).rows
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      line: 1,
      problems: [],
      draft: {
        prompt: 'Which festival opens the Bengali year?',
        options: ['Durga Puja', 'Poila Boishakh', 'Holi'],
        correct: 1,
        explanation: 'The first of Boishakh.',
        tags: ['festivals', 'calendar'],
      },
    })
    expect(rows[1]).toMatchObject({ line: 9, problems: [], draft: { prompt: 'Who is worshipped at Saraswati Puja?', correct: 1 } })
  })

  it('takes the right answer from WhatsApp bold, a star or a tick', () => {
    const rows = ready(
      [
        'Q1: Colours are thrown at…',
        'a) Durga Puja',
        'b) *Holi*',
        '',
        'Q2: The goddess of learning?',
        '- Lakshmi',
        '- Saraswati *',
        '',
        'Q3: Mahalaya comes before…',
        '(a) Durga Puja ✅',
        '(b) Holi',
      ].join('\n'),
    )
    expect(rows.map((row) => [row.draft.prompt, row.draft.options[row.draft.correct]])).toEqual([
      ['Colours are thrown at…', 'Holi'],
      ['The goddess of learning?', 'Saraswati'],
      ['Mahalaya comes before…', 'Durga Puja'],
    ])
  })

  it('finds the next question without a blank line, from its number', () => {
    const rows = ready(['1. First?', 'a) Yes *', 'b) No', '2. Second?', 'a) Yes', 'b) No *'].join('\n'))
    expect(rows.map((row) => row.draft.prompt)).toEqual(['First?', 'Second?'])
    expect(rows[1].draft.correct).toBe(1)
  })

  it('keeps answers numbered 1) 2) 3) apart from the next question’s number', () => {
    const rows = ready(['Q1. First?', '1) Yes', '2) No *', '3) Maybe', 'Q2. Second?', '1) Up *', '2) Down'].join('\n'))
    expect(rows.map((row) => [row.draft.prompt, row.draft.options.length, row.draft.correct])).toEqual([
      ['First?', 3, 1],
      ['Second?', 2, 0],
    ])
  })

  it('allows a blank line between a question and its answers', () => {
    const rows = ready('First?\n\na) Yes *\nb) No\n\n\nSecond?\n\n- Up\n- Down *')
    expect(rows.map((row) => [row.draft.prompt, row.draft.correct])).toEqual([
      ['First?', 0],
      ['Second?', 1],
    ])
  })

  it('joins a question written over two lines', () => {
    expect(ready('Which of these\nis a festival?\na) Holi *\nb) Tuesday')[0].draft.prompt).toBe('Which of these is a festival?')
  })

  it('says what is wrong with a question it cannot use', () => {
    const rows = readList(
      ['No answer marked?', 'a) Yes', 'b) No', '', 'Two marked?', 'a) Yes *', 'b) No *', '', 'Disagrees?', 'a) Yes *', 'b) No', 'Answer: b', '', 'Nothing under it?', '', 'Unknown answer?', 'a) Yes', 'b) No', 'Answer: e'].join('\n'),
    ).rows
    expect(rows.map((row) => row.problems)).toEqual([
      ['Say which answer is right: an “Answer:” line, or a * after it.'],
      ['More than one answer is marked as right.'],
      ['The answer marked and the “Answer:” line say different things.'],
      ['No answers found under it. Put each on its own line, starting a), b), c) or -.'],
      ['“Answer: e” is not one of its answers.'],
    ])
  })
})

describe('telling the two apart', () => {
  it('reads headings in the first row as a spreadsheet, and anything else as a list', () => {
    expect(readImport('Question,A,B,Correct\nWhen?,Now,Later,A').format).toBe('spreadsheet')
    expect(readImport('1. When, exactly?\na) Now *\nb) Later').format).toBe('list')
  })
})

describe('what is already there', () => {
  it('leaves out what is in the bank, and a question pasted twice', () => {
    const rows = withoutRepeats(ready('First?\na) Yes *\nb) No\n\nsecond?\na) Yes *\nb) No\n\nSecond?\na) Up *\nb) Down'), ['FIRST?'])
    expect(rows.map((row) => row.problems)).toEqual([['Already in the question bank.'], [], ['The same question appears earlier in this paste.']])
  })

  it('adds the tags chosen for the whole lot, alongside each question’s own', () => {
    const [row] = withoutRepeats(ready('First?\na) Yes *\nb) No\nTags: one'), [], ['quiz-night', 'one'])
    expect(row.draft.tags).toEqual(['one', 'quiz-night'])
  })
})
