import { describe, expect, it } from 'vitest'
import type { AlbumDraft } from '@/domain/gallery'
import type { Viewer } from '@/domain/household'
import { withAuditTrail } from './audit'
import { createMockApi } from './mock'

const member: Viewer = { householdId: 'hh-sen', role: 'member' }
const admin: Viewer = { householdId: 'hh-chatterjee', role: 'admin' }

const api = () => withAuditTrail(createMockApi())
const draft: AlbumDraft = { title: 'Holi 2027', description: 'Colours in the park', visibility: 'public' }

/**
 * The newest album that actually has photographs in it.
 *
 * Not simply the first: the newest album in the fixtures is the members-only one, which is
 * there so the private-album filter has something to hide and deliberately holds nothing.
 */
async function firstAlbum(a: ReturnType<typeof api>) {
  const albums = await a.gallery.listAllAlbums(admin)
  return albums.find((x) => x.media.length > 2)!
}

describe('who may keep the gallery', () => {
  it('is the committee\'s, and nobody else\'s', async () => {
    const a = api()
    expect(await a.gallery.listAllAlbums(member)).toEqual([])
    await expect(a.gallery.createAlbum(draft, member)).rejects.toThrow(/committee/i)
    await expect(a.gallery.deleteMedia('me-1', member)).rejects.toThrow(/committee/i)
  })

  it('shows the committee the unpublished ones too', async () => {
    const a = api()
    const all = await a.gallery.listAllAlbums(admin)
    const publicOnly = await a.gallery.listAlbums()
    expect(all.length).toBeGreaterThanOrEqual(publicOnly.length)
  })
})

describe('making an album', () => {
  it('names it from the title so it has an address', async () => {
    const album = await api().gallery.createAlbum(draft, admin)
    expect(album.slug).toBe('holi-2027')
  })

  it('refuses one with no name', async () => {
    await expect(api().gallery.createAlbum({ ...draft, title: ' ' }, admin)).rejects.toThrow(/needs a name/i)
  })

  it('refuses a second album that would take the same address', async () => {
    const a = api()
    await a.gallery.createAlbum(draft, admin)
    await expect(a.gallery.createAlbum(draft, admin)).rejects.toThrow(/already an album/i)
  })

  it('can be made unlisted, which is how a picture is hidden without destroying it', async () => {
    const album = await api().gallery.createAlbum({ ...draft, visibility: 'members' }, admin)
    expect(album.visibility).toBe('members')
    expect((await api().gallery.listAlbums()).some((x) => x.id === album.id)).toBe(false)
  })
})

describe('the album cover', () => {
  it('rotates while none is pinned, so one face is not the whole evening', async () => {
    const a = api()
    const album = await firstAlbum(a)
    // Deliberate, and the default. Sampled enough times that a single cover means pinned.
    const seen = new Set<string>()
    for (let i = 0; i < 40; i += 1) {
      const albums = await a.gallery.listAlbums()
      const found = albums.find((x) => x.id === album.id)
      if (found?.cover) seen.add(found.cover.id)
    }
    expect(seen.size).toBeGreaterThan(1)
  })

  it('stays put once the committee pins one', async () => {
    const a = api()
    const album = await firstAlbum(a)
    const chosen = album.media[2]
    await a.gallery.setCover(album.id, chosen.id, admin)

    for (let i = 0; i < 10; i += 1) {
      const albums = await a.gallery.listAlbums()
      expect(albums.find((x) => x.id === album.id)?.cover?.id).toBe(chosen.id)
    }
  })

  it('refuses a photograph from a different evening', async () => {
    const a = api()
    const withPhotos = (await a.gallery.listAllAlbums(admin)).filter((x) => x.media.length > 0)
    const [one, two] = withPhotos
    await expect(a.gallery.setCover(one.id, two.media[0].id, admin)).rejects.toThrow(/not in this album/i)
  })

  it('goes back to rotating if the pinned one is taken down', async () => {
    const a = api()
    const album = await firstAlbum(a)
    await a.gallery.setCover(album.id, album.media[0].id, admin)
    await a.gallery.deleteMedia(album.media[0].id, admin)

    const after = (await a.gallery.listAllAlbums(admin)).find((x) => x.id === album.id)
    // An album must not go on pointing at a photograph that is not there.
    expect(after?.coverMediaId).toBeUndefined()
    expect(after?.cover).toBeDefined()
  })
})

describe('captions and order', () => {
  it('writes a caption, and clears one back to nothing', async () => {
    const a = api()
    const album = await firstAlbum(a)
    const media = album.media[0]

    expect((await a.gallery.setCaption(media.id, '  The lamps going up  ', admin)).caption).toBe('The lamps going up')
    expect((await a.gallery.setCaption(media.id, '   ', admin)).caption).toBeUndefined()
  })

  it('puts the photographs in the order it is given', async () => {
    const a = api()
    const album = await firstAlbum(a)
    const reversed = [...album.media].reverse().map((m) => m.id)

    const after = await a.gallery.reorder(album.id, reversed, admin)
    expect(after.map((m) => m.id)).toEqual(reversed)
  })

  it('refuses a partial list, which would quietly drop the rest to the end', async () => {
    const a = api()
    const album = await firstAlbum(a)
    const half = album.media.slice(0, 2).map((m) => m.id)
    await expect(a.gallery.reorder(album.id, half, admin)).rejects.toThrow(/in one piece/i)
  })

  it('refuses a list with the same photograph twice', async () => {
    const a = api()
    const album = await firstAlbum(a)
    const dupe = album.media.map((m) => m.id)
    dupe[1] = dupe[0]
    await expect(a.gallery.reorder(album.id, dupe, admin)).rejects.toThrow(/in one piece/i)
  })
})

describe('taking a photograph down', () => {
  it('removes it from the album for good', async () => {
    const a = api()
    const album = await firstAlbum(a)
    const gone = album.media[1]

    await a.gallery.deleteMedia(gone.id, admin)

    const after = (await a.gallery.listAllAlbums(admin)).find((x) => x.id === album.id)
    expect(after?.media.some((m) => m.id === gone.id)).toBe(false)
    // And out of everything else that lists photographs, not only this album.
    expect((await a.gallery.listRecentMedia(100)).some((m) => m.id === gone.id)).toBe(false)
  })

  it('leaves a line in the trail, which is what somebody will ask about later', async () => {
    const a = api()
    const album = await firstAlbum(a)
    const gone = album.media[0]
    await a.gallery.deleteMedia(gone.id, admin)

    const [entry] = await a.audit.list(admin)
    expect(entry.action).toBe('media:remove')
    // Read before it went: afterwards there is nothing left to say which one it was.
    expect(entry.changes.url.from).toBe(gone.url)
  })

  it('says nothing about one that was never there', async () => {
    await expect(api().gallery.deleteMedia('me-nope', admin)).rejects.toThrow(/no such photograph/i)
  })
})
