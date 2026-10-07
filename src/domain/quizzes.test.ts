import { describe, expect, it } from 'vitest'
import {
  mark,
  questionDraftOf,
  quizDraftOf,
  scoreLine,
  tagsFrom,
  validateQuestion,
  validateQuiz,
  verdict,
  type QuestionDraft,
  type QuizDraft,
} from './quizzes'

const question = (over: Partial<QuestionDraft> = {}): QuestionDraft => ({
  prompt: 'Which goddess rides a swan?',
  options: ['Lakshmi', 'Saraswati'],
  correct: 1,
  explanation: '',
  tags: [],
  imageUrl: '',
  creditedTo: '',
  ...over,
})

const quiz = (over: Partial<QuizDraft> = {}): QuizDraft => ({
  title: 'Durga Puja',
  intro: '',
  audience: 'public',
  opensAt: '2026-09-01T09:00:00Z',
  closesAt: '',
  questionIds: ['q-1'],
  ...over,
})

describe('checking a question', () => {
  it('accepts a sensible one', () => {
    expect(validateQuestion(question())).toEqual({})
  })

  it('wants the question written', () => {
    expect(validateQuestion(question({ prompt: '' })).prompt).toBeDefined()
    expect(validateQuestion(question({ prompt: 'x'.repeat(301) })).prompt).toBeDefined()
  })

  it('wants every answer filled, different, and not too many', () => {
    expect(validateQuestion(question({ options: ['Only one'] })).options).toBeDefined()
    expect(validateQuestion(question({ options: ['A', '', 'B'] })).options).toBe('Fill in every answer, or remove the empty one.')
    expect(validateQuestion(question({ options: ['A', 'a'] })).options).toBe('Two of the answers are the same.')
    expect(validateQuestion(question({ options: ['1', '2', '3', '4', '5', '6', '7'] })).options).toBeDefined()
    expect(validateQuestion(question({ options: ['A', 'x'.repeat(121)] })).options).toBeDefined()
  })

  it('wants the right answer marked', () => {
    expect(validateQuestion(question({ correct: 2 })).correct).toBe('Mark which answer is right.')
    expect(validateQuestion(question({ correct: -1 })).correct).toBeDefined()
  })

  it('keeps the explanation short and the picture secure', () => {
    expect(validateQuestion(question({ explanation: 'x'.repeat(601) })).explanation).toBeDefined()
    expect(validateQuestion(question({ imageUrl: 'http://example.com/a.jpg' })).imageUrl).toBeDefined()
    expect(validateQuestion(question({ imageUrl: 'https://photos.13parbon.org.uk/a.jpg' }))).toEqual({})
  })
})

describe('checking a quiz', () => {
  it('accepts a sensible one', () => {
    expect(validateQuiz(quiz())).toEqual({})
  })

  it('wants a name and a short introduction', () => {
    expect(validateQuiz(quiz({ title: 'Q' })).title).toBeDefined()
    expect(validateQuiz(quiz({ title: 'x'.repeat(201) })).title).toBeDefined()
    expect(validateQuiz(quiz({ intro: 'x'.repeat(1001) })).intro).toBeDefined()
  })

  it('may be a draft with no questions, but not open with none', () => {
    expect(validateQuiz(quiz({ opensAt: '', questionIds: [] }))).toEqual({})
    expect(validateQuiz(quiz({ questionIds: [] })).questionIds).toBeDefined()
    expect(validateQuiz(quiz({ questionIds: Array.from({ length: 31 }, (_, i) => `q-${i}`) })).questionIds).toBeDefined()
  })

  it('closes after it opens', () => {
    expect(validateQuiz(quiz({ opensAt: '', closesAt: '2026-09-05T09:00:00Z', questionIds: [] })).closesAt).toBeDefined()
    expect(validateQuiz(quiz({ closesAt: '2026-08-01T09:00:00Z' })).closesAt).toBeDefined()
  })
})

describe('marking', () => {
  it('counts the answers that match, and an unanswered one as wrong', () => {
    expect(mark([1, 0, undefined], [1, 1, 2])).toBe(1)
    expect(mark([], [])).toBe(0)
  })

  it('reads a score as words', () => {
    expect(scoreLine(7, 10)).toBe('7 / 10')
    expect(verdict(0, 0)).toBe('Nothing to mark.')
    expect(verdict(3, 3)).toBe('Full marks!')
    expect(verdict(7, 10)).toBe('Very well done.')
    expect(verdict(4, 10)).toBe('Not bad at all.')
    expect(verdict(1, 10)).toMatch(/next time/)
  })
})

describe('the forms', () => {
  it('starts blank, or from what is there', () => {
    expect(questionDraftOf()).toMatchObject({ prompt: '', options: ['', ''], correct: 0 })
    expect(questionDraftOf({ id: 'q', prompt: 'P?', options: ['A', 'B'], correct: 1, explanation: 'E', tags: ['t'], imageUrl: 'https://x/y.jpg', creditedTo: 'The Ghoshes', locked: false })).toMatchObject({
      prompt: 'P?',
      correct: 1,
      imageUrl: 'https://x/y.jpg',
      creditedTo: 'The Ghoshes',
    })
    expect(quizDraftOf()).toMatchObject({ title: '', audience: 'members', questionIds: [] })
    expect(quizDraftOf({ id: 'z', title: 'Z', intro: '', audience: 'public', opensAt: '2026-09-01T09:00:00Z', createdAt: '', questionIds: ['a'] })).toMatchObject({
      audience: 'public',
      questionIds: ['a'],
    })
  })

  it('reads tags from one box', () => {
    expect(tagsFrom(' Durga-Puja, food,, durga-puja ')).toEqual(['durga-puja', 'food'])
  })
})
