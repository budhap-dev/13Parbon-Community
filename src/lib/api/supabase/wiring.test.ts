import { describe, expect, it } from 'vitest'
import { createApi } from '../create'
import { createMockApi } from '../mock'
import { withSupabasePortal } from './portal'
import { withSupabaseSettings } from './settings'

/**
 * Which parts of the app talk to the database, and which are still fixtures.
 *
 * Worth a test because the answer is invisible from a screen: fixture data and real data look
 * identical, and the moment they differ is the moment somebody is looking at sample households
 * believing they are real ones.
 */
const configured = { VITE_SUPABASE_URL: 'https://project.supabase.co', VITE_SUPABASE_ANON_KEY: 'anon-key' }

describe('with no project configured', () => {
  const api = createApi({})

  it('is fixtures throughout', async () => {
    expect((await api.portal.listHouseholds({ householdId: 'x', role: 'admin' })).length).toBeGreaterThan(0)
  })

  it('says the contact form does not deliver, rather than pretending', async () => {
    expect(api.delivers).toBe(false)
  })
})

describe('with a project configured', () => {
  it('says the contact form delivers', () => {
    expect(createApi(configured).delivers).toBe(true)
  })

  /*
   * Against the *same* base object, and every key of it rather than a list typed out here.
   *
   * Both details are the test. An earlier version compared two separately built fixture clients,
   * and every method of one differs by identity from every method of another whether it is wired
   * or not — so it passed no matter what `withSupabasePortal` left out. And a hand-written list
   * of method names cannot fail for the case worth catching: a fourteenth portal method added to
   * the interface, implemented in the mock, and never wired to the database.
   */
  it('sends the whole portal to the database, not half of it', () => {
    const base = createMockApi()
    const wired = withSupabasePortal(base, { url: configured.VITE_SUPABASE_URL, anonKey: configured.VITE_SUPABASE_ANON_KEY })

    const names = Object.keys(base.portal) as (keyof typeof base.portal)[]
    expect(names.length).toBeGreaterThan(0)

    // Half is worse than none: a screen with real households and a sample directory is one
    // nobody can reason about, and the first thing anybody does is doubt the half that is right.
    const stillFixtures = names.filter((name) => wired.portal[name] === base.portal[name])
    expect(stillFixtures).toEqual([])
  })

  /*
   * The inbox, which was the half-wired section this test was written to catch and did not.
   * `withSupabaseWrites` posted a visitor's message to the real table while the screen the
   * committee reads it on stayed on fixtures — so every message sent through the live site
   * went into a table nobody in the app could see, and the inbox showed sample data instead.
   */
  it('reads the inbox from the same table the contact form writes to', () => {
    const base = createMockApi()
    const wired = withSupabasePortal(base, { url: configured.VITE_SUPABASE_URL, anonKey: configured.VITE_SUPABASE_ANON_KEY })

    expect(wired.contact.listMessages).not.toBe(base.contact.listMessages)
    expect(wired.contact.markHandled).not.toBe(base.contact.markHandled)
    // `send` belongs to the public website, which has no session and posts under the anon key.
    expect(wired.contact.send).toBe(base.contact.send)
  })

  it('reads the site\'s own switches from the database', () => {
    // What the committee can change about the public site without a developer. On fixtures these
    // were an in-memory object: a switch thrown on the live site survived until the next reload.
    const base = createMockApi()
    const wired = withSupabaseSettings(base, { url: configured.VITE_SUPABASE_URL, anonKey: configured.VITE_SUPABASE_ANON_KEY })
    expect(wired.settings.get).not.toBe(base.settings.get)
    expect(wired.settings.save).not.toBe(base.settings.save)
  })

  it('leaves events, news and the gallery on fixtures, because they have no tables yet', async () => {
    // Honest rather than aspirational: this line moves as each one gets a table.
    const api = createApi(configured)
    expect((await api.events.listUpcoming()).length).toBeGreaterThan(0)
    expect((await api.gallery.listAlbums()).length).toBeGreaterThan(0)
    expect((await api.news.listAnnouncements()).length).toBeGreaterThan(0)
  })
})
