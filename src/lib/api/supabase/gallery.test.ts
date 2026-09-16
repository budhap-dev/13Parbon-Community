import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { galleryMethods, slugOf, type GalleryDeps } from './gallery'

/** A stand-in for PostgREST that answers per table and records what it was asked. */
function fakeClient(answers: Record<string, unknown> = {}, errors: Record<string, { code: string; message: string }> = {}) {
  const calls: string[] = []
  const chain = (table: string): Record<string, unknown> => {
    const self: Record<string, unknown> = {}
    for (const method of ['select', 'eq', 'in', 'order', 'insert', 'update', 'delete']) {
      self[method] = (...args: unknown[]) => {
        calls.push(`${table}.${method}(${args.map((a) => (typeof a === 'string' ? a : '…')).join(',')})`)
        return self
      }
    }
    const failure = errors[table] ?? null
    const answer = () => (failure ? null : (answers[table] ?? null))
    self.maybeSingle = async () => ({ data: Array.isArray(answer()) ? (answer() as unknown[])[0] ?? null : answer(), error: failure })
    self.single = async () => ({ data: Array.isArray(answer()) ? (answer() as unknown[])[0] ?? null : answer(), error: failure })
    self.then = (resolve: (v: unknown) => unknown) => resolve({ data: failure ? [] : (answers[table] ?? []), error: failure, count: null })
    return self
  }
  return { calls, client: { schema: () => ({ from: (table: string) => chain(table) }) } as unknown as SupabaseClient }
}

const uploads = { signUrl: 'https://site.example/api/photos', publicUrl: 'https://photos.example' }
const admin = { householdId: 'hh-chatterjee', role: 'admin' } as const

/**
 * Dependencies that record into the *same* timeline the fake database writes to.
 *
 * One list, so "the bucket before the row" is a question about two entries in it. Kept apart —
 * a spy here, an array there — the order could only be asserted by comparing a call count to a
 * list index, which is how the first version of this passed while the code did it backwards.
 */
function deps(timeline: string[], over: Partial<GalleryDeps> = {}): GalleryDeps & { removeObject: ReturnType<typeof vi.fn> } {
  return {
    uploads,
    token: async () => 'the-token',
    removeObject: vi.fn(async (_c: unknown, key: string) => {
      timeline.push(`bucket.remove(${key})`)
    }),
    ...over,
  } as never
}

const albumRow = (over: Record<string, unknown> = {}) => ({
  id: 'al-1', slug: 'a-night', title: 'A night', description: null, event_slug: null, festival_id: null,
  cover_media_id: null, published_at: '2026-04-18T20:00:00Z', visibility: 'public', ...over,
})
const mediaRow = (over: Record<string, unknown> = {}) => ({
  id: 'm-1', album_id: 'al-1', type: 'photo', url: 'https://photos.example/full/a-night-01.jpg',
  thumbnail_url: 'https://photos.example/thumb/a-night-01.jpg', caption: null, approved: true, position: 0, ...over,
})

describe('what the public lists show', () => {
  it('asks for public albums even when the caller could see more', async () => {
    const { client, calls } = fakeClient({ albums: [albumRow()], media: [mediaRow()] })
    await galleryMethods(async () => client, deps([])).listAlbums()
    // An admin's session can see the members' albums; the public gallery must not show them.
    expect(calls).toContain('albums.eq(visibility,public)')
  })

  it('leaves an unapproved photograph out, and puts the rest in order', async () => {
    const { client } = fakeClient({
      albums: [albumRow()],
      media: [mediaRow({ id: 'm-2', position: 1 }), mediaRow({ id: 'm-x', approved: false }), mediaRow({ id: 'm-1', position: 0 })],
    })
    const [album] = await galleryMethods(async () => client, deps([])).listAlbums()
    expect(album.media.map((m) => m.id)).toEqual(['m-1', 'm-2'])
  })

  it('gives somebody who is not on the committee an empty list of all albums', async () => {
    const { client, calls } = fakeClient({ albums: [albumRow()] })
    expect(await galleryMethods(async () => client, deps([])).listAllAlbums({ householdId: 'h', role: 'member' })).toEqual([])
    expect(calls).toEqual([])
  })
})

describe('making and keeping an album', () => {
  it('names it from the title the same way the mock does, so the two cannot disagree', () => {
    expect(slugOf('Boishakhi 2026: the night!')).toBe('boishakhi-2026-the-night')
  })

  it('refuses one with no name before asking the database', async () => {
    const { client, calls } = fakeClient()
    await expect(galleryMethods(async () => client, deps([])).createAlbum({ title: ' ', visibility: 'public' }, admin)).rejects.toThrow(/needs a name/)
    expect(calls).toEqual([])
  })

  it('says plainly when a second album would take the same address', async () => {
    const { client } = fakeClient({}, { albums: { code: '23505', message: 'duplicate key' } })
    await expect(galleryMethods(async () => client, deps([])).createAlbum({ title: 'A night', visibility: 'public' }, admin)).rejects.toThrow(/already an album with that name/)
  })

  it('refuses a cover from a different evening', async () => {
    const { client } = fakeClient({ media: [] })
    await expect(galleryMethods(async () => client, deps([])).setCover('al-1', 'm-elsewhere', admin)).rejects.toThrow(/not in this album/)
  })

  it('refuses a partial order, which would quietly drop the rest to the end', async () => {
    const { client } = fakeClient({ media: [mediaRow({ id: 'm-1' }), mediaRow({ id: 'm-2' })] })
    await expect(galleryMethods(async () => client, deps([])).reorder('al-1', ['m-2'], admin)).rejects.toThrow(/in one piece/)
  })
})

describe('taking a photograph down', () => {
  it('removes the object from the bucket before the row, as the person doing it', async () => {
    const { client, calls } = fakeClient({ media: [mediaRow()] })
    const d = deps(calls)
    await galleryMethods(async () => client, d).deleteMedia('m-1', admin)

    expect(d.removeObject).toHaveBeenCalledWith(uploads, 'a-night-01', 'the-token')

    /*
     * The bucket first, asserted on one timeline. If it refuses, the row stays and the screen
     * still shows the picture — which is the truth, and the opposite of a row gone while the
     * file is still at its URL for anybody who has it.
     */
    const bucket = calls.findIndex((c) => c.startsWith('bucket.remove'))
    const row = calls.findIndex((c) => c.startsWith('media.delete'))
    expect(bucket).toBeGreaterThan(-1)
    expect(row).toBeGreaterThan(-1)
    expect(bucket).toBeLessThan(row)
  })

  it('will not delete the row alone when there is no bucket to remove the picture from', async () => {
    const { client, calls } = fakeClient({ media: [mediaRow()] })
    const d = deps(calls, { uploads: null })
    await expect(galleryMethods(async () => client, d).deleteMedia('m-1', admin)).rejects.toThrow(/bucket is not configured/)
    expect(calls.some((c) => c.startsWith('media.delete'))).toBe(false)
  })

  it('removes only the row for a photograph served from somewhere that is not our bucket', async () => {
    const { client, calls } = fakeClient({ media: [mediaRow({ url: 'https://elsewhere.example/full/x-01.jpg' })] })
    const d = deps(calls)
    await galleryMethods(async () => client, d).deleteMedia('m-1', admin)
    expect(d.removeObject).not.toHaveBeenCalled()
    expect(calls.some((c) => c.startsWith('media.delete'))).toBe(true)
  })

  it('does not touch the bucket when the row is not there to begin with', async () => {
    const { client, calls } = fakeClient({ media: [] })
    const d = deps(calls)
    await expect(galleryMethods(async () => client, d).deleteMedia('m-gone', admin)).rejects.toThrow(/no such photograph/)
    expect(d.removeObject).not.toHaveBeenCalled()
  })
})
