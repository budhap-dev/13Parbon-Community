import { describe, expect, it } from 'vitest'
import { hasFormatting, parseBlocks, parseInline, plainText } from './whatsappText'

describe('parseInline', () => {
  it('reads WhatsApp’s bold, italic, strikethrough and monospace', () => {
    expect(parseInline('a *loud* _soft_ ~gone~ `code` ```mono``` end')).toEqual([
      'a ',
      { mark: 'bold', children: ['loud'] },
      ' ',
      { mark: 'italic', children: ['soft'] },
      ' ',
      { mark: 'strike', children: ['gone'] },
      ' ',
      { mark: 'code', children: ['code'] },
      ' ',
      { mark: 'code', children: ['mono'] },
      ' end',
    ])
  })

  it('nests them, as WhatsApp does', () => {
    expect(parseInline('*_both_*')).toEqual([{ mark: 'bold', children: [{ mark: 'italic', children: ['both'] }] }])
  })

  it('takes marks against punctuation, the way people write them', () => {
    expect(parseInline('(*really*), yes.')).toEqual(['(', { mark: 'bold', children: ['really'] }, '), yes.'])
  })

  it('works in Bengali too', () => {
    expect(parseInline('*শুভ নববর্ষ*!')).toEqual([{ mark: 'bold', children: ['শুভ নববর্ষ'] }, '!'])
  })

  it('leaves marks inside words, against spaces, or unclosed as typed', () => {
    for (const text of ['snake_case_name', '2*3*4', 'a * b * c', '* not bold*', '*not bold *', 'just *one', '**', 'x_y_']) {
      expect(parseInline(text)).toEqual([text])
    }
  })

  it('does not read formatting inside monospace', () => {
    expect(parseInline('`*as is*`')).toEqual([{ mark: 'code', children: ['*as is*'] }])
  })
})

describe('parseBlocks', () => {
  it('keeps paragraphs apart and line breaks within them', () => {
    expect(parseBlocks('one\ntwo\n\nthree')).toEqual([
      { kind: 'paragraph', lines: [['one'], ['two']] },
      { kind: 'paragraph', lines: [['three']] },
    ])
  })

  it('reads bulleted and numbered lists, straight after a line of text', () => {
    expect(parseBlocks('Loved:\n- the food\n* the *music*\n• the people\n3. three\n4) four')).toEqual([
      { kind: 'paragraph', lines: [['Loved:']] },
      {
        kind: 'list',
        ordered: false,
        start: 1,
        items: [['the food'], ['the ', { mark: 'bold', children: ['music'] }], ['the people']],
      },
      { kind: 'list', ordered: true, start: 3, items: [['three'], ['four']] },
    ])
  })

  it('reads quotes', () => {
    expect(parseBlocks('> what you said\n> on two lines\nand mine')).toEqual([
      { kind: 'quote', lines: [['what you said'], ['on two lines']] },
      { kind: 'paragraph', lines: [['and mine']] },
    ])
  })

  it('keeps a ``` block exactly, over as many lines as it runs', () => {
    expect(parseBlocks('before\n```\n  *as is*\nsecond\n```\nafter')).toEqual([
      { kind: 'paragraph', lines: [['before']] },
      { kind: 'code', text: '  *as is*\nsecond' },
      { kind: 'paragraph', lines: [['after']] },
    ])
  })

  it('reads an unclosed ``` as the backticks it is', () => {
    expect(parseBlocks('```\nnothing closes this')).toEqual([
      { kind: 'paragraph', lines: [['```'], ['nothing closes this']] },
    ])
  })

  it('copes with Windows line endings', () => {
    expect(parseBlocks('one\r\ntwo')).toEqual([{ kind: 'paragraph', lines: [['one'], ['two']] }])
  })
})

describe('hasFormatting', () => {
  it('is only true when there is something beyond lines and paragraphs', () => {
    expect(hasFormatting('plain\n\nwords')).toBe(false)
    expect(hasFormatting('one *bold* word')).toBe(true)
    expect(hasFormatting('- a list')).toBe(true)
  })
})

describe('plainText', () => {
  it('takes the marks off and keeps the words', () => {
    expect(plainText('A *great* _night_\n\n- food\n- music')).toBe('A great night\n\n• food\n• music')
  })
})
