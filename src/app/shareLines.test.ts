import type { Event } from '@/domain/event'
import { SHARE_LINES, albumShareLine, calendarShareLine, eventShareLine } from './shareLines'

describe('the lines pages are passed on with', () => {
  it('says whose each one is, since WhatsApp shows the text and not the title', () => {
    for (const line of Object.values(SHARE_LINES)) expect(line).toContain('13Parbon Community')
  })

  it('gives an evening its what, when and where, and says first if it is off', () => {
    const event = {
      title: 'Bijoya Sammilani',
      // A local time, so it reads the same in any time zone the tests run in.
      startsAt: '2026-10-24T17:00:00',
      venue: 'Leeds Civic Hall',
      summary: 'Sweets and songs.',
      status: 'published',
    } as Event
    expect(eventShareLine(event)).toBe('Bijoya Sammilani: Saturday 24 October, 5:00 pm at Leeds Civic Hall. Sweets and songs.')
    expect(eventShareLine({ ...event, status: 'cancelled' } as Event)).toBe(
      'Cancelled: Bijoya Sammilani, Saturday 24 October, 5:00 pm at Leeds Civic Hall.',
    )
  })

  it('counts an album’s photos', () => {
    expect(albumShareLine('Durga Puja 2025', 1)).toBe('Durga Puja 2025: 1 photo from 13Parbon Community.')
    expect(albumShareLine('Durga Puja 2025', 48)).toBe('Durga Puja 2025: 48 photos from 13Parbon Community.')
  })

  it('names a calendar month and the first three of what is on in it', () => {
    expect(calendarShareLine('Poush 1433', [])).toBe('Poush 1433 in the Bengali calendar from 13Parbon Community, with the times in the UK and India.')
    expect(calendarShareLine('Magh 1433', ['Saraswati Puja'])).toMatch(/Community: Saraswati Puja, with the times/)
    expect(calendarShareLine('Falgun 1433', ['Shivratri', 'Dol Jatra'])).toMatch(/: Shivratri and Dol Jatra, with/)
    expect(calendarShareLine('Kartik 1433', ['A', 'B', 'C', 'D'])).toMatch(/: A, B, C and more, with/)
  })
})
