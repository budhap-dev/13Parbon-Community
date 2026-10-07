import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultSettings } from '@/app/defaults'
import type { Viewer } from '@/domain/household'
import { mergeSettings, type SiteSettings } from '@/domain/settings'
import { createMockApi } from '../mock'
import { withSupabaseSettings } from './settings'

/**
 * The switches, in two halves.
 *
 * `mergeSettings` is the pure half: what a stored row becomes once it has been laid over the
 * code's own values. `withSupabaseSettings` is the half that talks to the database. They fail
 * in different ways and are tested separately, but they belong in one file because between
 * them they decide what the public site *is* — whether the gallery exists, whether there is a
 * news page, which home page sections a visitor ever sees.
 */

/**
 * The row is one JSON object, which is the shape `domain/settings.ts` warns about: a column
 * anybody can put anything in. Nothing is trusted on the way out, and this is where that is
 * proved — a stale key, a renamed switch or a half-written row must not reach a public page.
 */
/**
 * The lists that left the files: the channels, the festivals, the story, the privacy notice.
 *
 * The same rule as the switches, with more at stake. A switch of the wrong type falls back to
 * what the code says; a channel with the wrong sort of address would be a link on every page.
 */
describe('laying saved content over what the code says', () => {
  it('is the code’s own when nothing of the kind has been saved', () => {
    const merged = mergeSettings({ showNews: true }, defaultSettings)
    expect(merged.social).toEqual(defaultSettings.social)
    expect(merged.festivals).toEqual(defaultSettings.festivals)
    expect(merged.story).toEqual(defaultSettings.story)
    expect(merged.privacy).toEqual(defaultSettings.privacy)
    expect(merged.homeOrder).toEqual(defaultSettings.homeOrder)
    expect(merged.defaultTheme).toBe('festival')
  })

  it('takes the committee’s festivals, and an empty list when that is what they saved', () => {
    const merged = mergeSettings({ festivals: [{ id: 'holi', name: 'Dol Jatra', season: 'March' }] }, defaultSettings)
    expect(merged.festivals).toEqual([{ id: 'holi', name: 'Dol Jatra', season: 'March' }])
    expect(mergeSettings({ festivals: [] }, defaultSettings).festivals).toEqual([])
  })

  it('never lets a script out as a link', () => {
    const merged = mergeSettings(
      {
        social: [{ name: 'Facebook', icon: 'facebook', href: 'javascript:alert(1)', blurb: '' }],
        volunteerFormUrl: 'javascript:alert(1)',
        tools: [{ name: 'Planner', description: '', href: 'javascript:alert(1)' }],
      },
      defaultSettings,
    )
    expect(merged.social[0].href).toBe('')
    expect(merged.volunteerFormUrl).toBe('')
    expect(merged.tools).toEqual([])
  })

  it('puts the home page in the saved order, and finds room for a part the order never mentioned', () => {
    const merged = mergeSettings({ homeOrder: ['photos', 'notices', 'photos', 'adverts'] }, defaultSettings)
    expect(merged.homeOrder.slice(0, 2)).toEqual(['photos', 'notices'])
    // Every part exactly once: a stranger dropped, a repeat dropped, the rest put back.
    expect([...merged.homeOrder].sort()).toEqual([...defaultSettings.homeOrder].sort())
  })

  it('falls back to the code’s colours for a theme it does not have', () => {
    expect(mergeSettings({ defaultTheme: 'holi' }, defaultSettings).defaultTheme).toBe('holi')
    expect(mergeSettings({ defaultTheme: 'neon' }, defaultSettings).defaultTheme).toBe('festival')
    // A portal theme is a real theme, and still not one the public site wears.
    expect(mergeSettings({ defaultTheme: 'slate' }, defaultSettings).defaultTheme).toBe('festival')
  })

  it('will not blank a line the page has a hole without', () => {
    const merged = mergeSettings({ text: { heroName: '  ', joinTitle: '', galleryNote: '' } }, defaultSettings)
    expect(merged.text.heroName).toBe(defaultSettings.text.heroName)
    expect(merged.text.joinTitle).toBe(defaultSettings.text.joinTitle)
    // Whereas no gallery note is a perfectly good answer.
    expect(merged.text.galleryNote).toBe('')
  })

  it('keeps the developer’s privacy notice rather than an empty one', () => {
    expect(mergeSettings({ privacy: { sections: [] } }, defaultSettings).privacy).toEqual(defaultSettings.privacy)
  })
})

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

  it('keeps the questions people ask, and tidies half-written ones out', () => {
    const merged = mergeSettings(
      {
        faq: [
          { question: '  Is there parking? ', answer: 'Yes, behind the hall. ' },
          { question: 'No answer', answer: '' },
          { question: 42, answer: 'not a question' },
          'not a row',
        ],
      },
      defaultSettings,
    )
    expect(merged.faq).toEqual([{ question: 'Is there parking?', answer: 'Yes, behind the hall.' }])
  })

  it('falls back to the file for the questions when nothing was saved for them', () => {
    expect(mergeSettings({ showNews: true }, defaultSettings).faq).toEqual(defaultSettings.faq)
  })
})

/**
 * The switches, against the real database.
 *
 * Worth testing on its own because this one row decides what the public site *is*: whether
 * the gallery exists, whether there is a news page, which home page sections a visitor sees.
 * Two of the behaviours below are the difference between a working site and a blank one on
 * the morning after something goes wrong with the database.
 */

const upsert = vi.fn(async () => ({ error: null as { code?: string; message: string } | null }))
let stored: unknown = undefined
let readError: { message: string } | null = null

const client = {
  schema: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          // No row is the ordinary state of a new project, so undefined is the default here.
          maybeSingle: async () =>
            readError ? { data: null, error: readError } : { data: stored === undefined ? null : { value: stored }, error: null },
        }),
      }),
      upsert,
    }),
  }),
}

vi.mock('@/lib/auth/supabaseAuth', () => ({ dataClient: async () => client }))

const config = { url: 'https://project.supabase.co', anonKey: 'anon-key' }
const admin: Viewer = { householdId: 'hh-1', role: 'admin' }
const member: Viewer = { householdId: 'hh-2', role: 'member' }

const wired = () => withSupabaseSettings(createMockApi(), config)

beforeEach(() => {
  stored = undefined
  readError = null
  upsert.mockClear()
  upsert.mockResolvedValue({ error: null })
})

describe('reading the switches', () => {
  /**
   * The ordinary state of a new project, and not a failure: nobody has changed anything yet,
   * so the code's own values are the right answer. An adapter that treated "no row" as an
   * error would take the whole public site down on the day the project was created.
   */
  it('falls back to what the code says when nothing has been saved', async () => {
    const settings = await wired().settings.get()
    expect(settings).toEqual(defaultSettings)
  })

  it('lays a saved row over the defaults, key by key', async () => {
    stored = { showNews: true, showFeedback: true }
    const settings = await wired().settings.get()
    expect(settings.showNews).toBe(true)
    expect(settings.showFeedback).toBe(true)
    // Untouched keys keep the code's answer rather than becoming undefined.
    expect(settings.showPhotos).toBe(defaultSettings.showPhotos)
    expect(settings.committee).toEqual(defaultSettings.committee)
  })

  /**
   * Nothing stored is trusted on the way out. A key renamed in the code must not leave a
   * stale value quietly driving the live site, and a half-written row must not blank a page.
   */
  it('ignores a row that is the wrong shape', async () => {
    stored = { showNews: 'yes please', home: { photos: 'everyone' }, committee: 'the committee' }
    const settings = await wired().settings.get()
    expect(settings.showNews).toBe(defaultSettings.showNews)
    expect(settings.home.photos).toBe(defaultSettings.home.photos)
    expect(settings.committee).toEqual(defaultSettings.committee)
  })

  /**
   * The other half of "no row is not a failure": a failure is not "no row". Answered with the
   * defaults, the Content page took them for what was saved and its next Save wrote them over
   * the committee's story, privacy notice and links.
   */
  it('fails, rather than passing the defaults off as what was saved, when the read fails', async () => {
    stored = { showNews: true }
    readError = { message: 'JWT expired' }
    await expect(wired().settings.get()).rejects.toThrow(/could not be read: JWT expired/)
  })

  it('still draws the code’s festivals on the public pages when the read fails', async () => {
    readError = { message: 'Failed to fetch' }
    expect(await wired().festivals.list()).toEqual(defaultSettings.festivals)
  })
})

describe('saving them', () => {
  const draft: SiteSettings = { ...defaultSettings, showFeedback: true }

  it('writes one row, and reads the switches back afterwards', async () => {
    const saved = await wired().settings.save(draft, admin)
    expect(upsert).toHaveBeenCalledTimes(1)
    const [row] = upsert.mock.calls[0] as unknown as [{ id: boolean; value: SiteSettings }]
    expect(row.id).toBe(true)
    expect(row.value.showFeedback).toBe(true)
    // What comes back is what the database now holds, not what was hopefully sent.
    expect(saved).toEqual(defaultSettings)
  })

  it('refuses a draft that is not a settings object at all', async () => {
    const broken = { ...defaultSettings, home: { ...defaultSettings.home, photos: 'everybody' } } as unknown as SiteSettings
    await expect(wired().settings.save(broken, admin)).rejects.toThrow(/do not look right/i)
    expect(upsert).not.toHaveBeenCalled()
  })

  /**
   * A refused write comes back 42501 from an upsert with a `with check` on both policies.
   * It reaches a person, so it is translated rather than shown raw — nobody should read
   * "new row violates row-level security policy" and have to work out that they are not on
   * the committee.
   */
  it('says who may change this when the policy refuses', async () => {
    upsert.mockResolvedValue({ error: { code: '42501', message: 'new row violates row-level security policy' } })
    await expect(wired().settings.save(draft, admin)).rejects.toThrow(/only the committee/i)
  })

  it('says the same to a member whatever the database called it', async () => {
    // `isAdmin` is consulted for the wording only, never to decide: the database has already
    // decided by the time this runs.
    upsert.mockResolvedValue({ error: { code: '08006', message: 'connection failure' } })
    await expect(wired().settings.save(draft, member)).rejects.toThrow(/only the committee/i)
  })

  it('passes a real failure through to the committee rather than blaming them', async () => {
    upsert.mockResolvedValue({ error: { code: '08006', message: 'connection failure' } })
    await expect(wired().settings.save(draft, admin)).rejects.toThrow(/connection failure/)
  })
})
