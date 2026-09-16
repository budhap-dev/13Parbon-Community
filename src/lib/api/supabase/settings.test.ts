import { describe, expect, it } from 'vitest'
import { defaultSettings } from '@/app/defaults'
import { mergeSettings } from '@/domain/settings'

/**
 * The row is one JSON object, which is the shape `domain/settings.ts` warns about: a column
 * anybody can put anything in. Nothing is trusted on the way out, and this is where that is
 * proved — a stale key, a renamed switch or a half-written row must not reach a public page.
 */
describe('laying saved settings over what the code says', () => {
  it('uses the code when nothing has been saved', () => {
    expect(mergeSettings(null, defaultSettings)).toEqual(defaultSettings)
    expect(mergeSettings(undefined, defaultSettings)).toEqual(defaultSettings)
    // Not an object, and an array is not an object for this purpose either.
    expect(mergeSettings('showNews', defaultSettings)).toEqual(defaultSettings)
    expect(mergeSettings([], defaultSettings)).toEqual(defaultSettings)
  })

  it('takes the keys it recognises and leaves the rest alone', () => {
    const merged = mergeSettings({ showNews: !defaultSettings.showNews }, defaultSettings)
    expect(merged.showNews).toBe(!defaultSettings.showNews)
    expect(merged.showPhotos).toBe(defaultSettings.showPhotos)
    expect(merged.text).toEqual(defaultSettings.text)
  })

  it('ignores a key of the wrong type rather than putting it on a page', () => {
    // A switch that arrives as the string "false" is truthy, and would turn a section on.
    const merged = mergeSettings({ showPhotos: 'false', text: { tagline: 42 } }, defaultSettings)
    expect(merged.showPhotos).toBe(defaultSettings.showPhotos)
    expect(merged.text.tagline).toBe(defaultSettings.text.tagline)
  })

  it('drops a switch the code no longer has, rather than carrying it', () => {
    const merged = mergeSettings({ showVolunteering: true }, defaultSettings) as Record<string, unknown>
    expect(merged.showVolunteering).toBeUndefined()
  })

  it('merges the home sections one at a time, keeping the others', () => {
    const merged = mergeSettings({ home: { photos: 'admins', upcoming: 'nonsense' } }, defaultSettings)
    expect(merged.home.photos).toBe('admins')
    expect(merged.home.upcoming).toBe(defaultSettings.home.upcoming)
    expect(merged.home.nextEvent).toBe(defaultSettings.home.nextEvent)
  })

  it('keeps the committee and the roll, and tidies half-written rows out', () => {
    const merged = mergeSettings(
      {
        committee: [
          { role: 'Chair', name: 'A Person' },
          { role: '  ', name: 'Half a row' },
          'not a row',
        ],
        members: ['A Member', 7, 'Another'],
      },
      defaultSettings,
    )
    expect(merged.committee).toEqual([{ role: 'Chair', name: 'A Person' }])
    expect(merged.members).toEqual(['A Member', 'Another'])
  })
})
