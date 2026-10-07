import { describe, expect, it } from 'vitest'
import { slugFrom, uniqueSlug } from './slug'

describe('an address from a title', () => {
  it('lowercases and joins with hyphens', () => {
    expect(slugFrom('How the Boishakhi evening went')).toBe('how-the-boishakhi-evening-went')
  })

  it('drops punctuation rather than encoding it', () => {
    expect(slugFrom('Durga Puja 2026 — the programme!')).toBe('durga-puja-2026-the-programme')
  })

  it('does not leave a hyphen hanging at either end', () => {
    expect(slugFrom('  Holi!  ')).toBe('holi')
  })

  it('gives nothing back for a title with nothing in it', () => {
    expect(slugFrom('!!!')).toBe('')
  })
})

describe('making it unique', () => {
  it('leaves a free name alone', () => {
    expect(uniqueSlug('Holi 2027', ['durga-puja'])).toBe('holi-2027')
  })

  it('numbers rather than refuses, because the same festival comes round every year', () => {
    expect(uniqueSlug('Durga Puja', ['durga-puja'])).toBe('durga-puja-2')
    expect(uniqueSlug('Durga Puja', ['durga-puja', 'durga-puja-2'])).toBe('durga-puja-3')
  })

  it('falls back when the title leaves nothing to work with', () => {
    expect(uniqueSlug('!!!', [], 'event')).toBe('event')
    expect(uniqueSlug('!!!', ['event'], 'event')).toBe('event-2')
  })
})
