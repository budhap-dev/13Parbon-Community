import { changeLines, fieldName, show } from './auditChanges'
import { formatStamp } from '@/domain/dates'

describe('what moved, in words', () => {
  it('names a field the way a person would', () => {
    expect(fieldName('handledBy')).toBe('Handled by')
    expect(fieldName('paid_to')).toBe('Paid up to')
    expect(fieldName('faq')).toBe('Questions people ask')
  })

  /*
   * The site's settings are one jsonb value. Printed whole it read
   * `value: {"faq":[{"answer":"N…` — the part somebody came to read lost in braces.
   */
  it('opens up a settings change and lists only the parts that differ', () => {
    const before = JSON.stringify({ showNews: true, faq: [{ question: 'Q', answer: 'A' }], committee: [] })
    const after = JSON.stringify({ showNews: false, faq: [{ question: 'Q', answer: 'B' }], committee: [] })
    const lines = changeLines('value', before, after)

    expect(lines).toEqual([
      { label: 'News and newsletters', was: 'yes', now: 'no' },
      { label: 'Questions people ask', was: '1 item', now: '1 item, edited' },
    ])
    expect(lines.map((line) => line.was + line.now).join('')).not.toContain('{')
  })

  it('says how long a list was and is', () => {
    expect(changeLines('faq', [1], [1, 2])).toEqual([{ label: 'Questions people ask', was: '1 item', now: '2 items' }])
  })

  it('shows a moment as day, month, year and the time to the second', () => {
    const iso = '2026-10-16T08:05:09Z'
    expect(show(iso)).toBe(formatStamp(iso))
    expect(formatStamp(iso)).toMatch(/^16\/10\/2026 \d{2}:05:09$/)
  })

  it('says nothing for an empty value, rather than "undefined"', () => {
    expect(show(undefined)).toBe('nothing')
    expect(show('')).toBe('nothing')
  })
})
