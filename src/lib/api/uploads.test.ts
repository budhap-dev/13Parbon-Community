import { describe, expect, it, vi } from 'vitest'
import { KEY } from '@/server/photos'
import { deletePhoto, keyOf, photoKey, readUploadConfig, uploadPhoto, UploadNotConfigured } from './uploads'

const config = { signUrl: 'https://site.example/api/sign', publicUrl: 'https://photos.example' }
const prepared = { full: new Blob(['f']), thumb: new Blob(['t']), width: 1600, height: 1200 }

describe('whether uploading is switched on', () => {
  it('is off until both addresses are set', () => {
    expect(readUploadConfig({})).toBeNull()
    expect(readUploadConfig({ VITE_PHOTOS_SIGN_URL: 'https://a' })).toBeNull()
    expect(readUploadConfig({ VITE_PHOTOS_URL: 'https://b' })).toBeNull()
  })

  it('tidies trailing slashes, so keys do not end up doubled', () => {
    expect(readUploadConfig({ VITE_PHOTOS_SIGN_URL: 'https://a/', VITE_PHOTOS_URL: 'https://b//' })).toEqual({
      signUrl: 'https://a',
      publicUrl: 'https://b',
    })
  })

  it('says what to do instead when it is off', () => {
    expect(new UploadNotConfigured().message).toMatch(/Ask whoever looks after the website/)
  })
})

/*
 * Every screen used to name its own uploads, and every one could repeat — the second file took
 * the first one's place, and deleting either row took down the picture both pointed at.
 */
describe('naming a new photograph', () => {
  it('never gives the same name twice, even for the same event and the same file', () => {
    const names = new Set(Array.from({ length: 200 }, () => photoKey('Durga Puja', 'cover', 'poster')))
    expect(names.size).toBe(200)
  })

  it('keeps the part a person can read, and ends in something nobody could guess', () => {
    expect(photoKey('boishakhi-2026', 'IMG_1234')).toMatch(/^boishakhi-2026-img-1234-[a-z0-9]{12}$/)
  })

  it('always makes a key the server will take, however long or odd what it is given', () => {
    for (const parts of [['x'.repeat(200)], ['', ''], ['শারদোৎসব'], ['A long event title with — dashes', 'cover', 'WhatsApp Image 2026-10-05 at 21.14.03']]) {
      const key = photoKey(...parts)
      expect(KEY.test(key), key).toBe(true)
    }
  })
})

describe('putting a photograph in the bucket', () => {
  it('asks permission, then sends both sizes straight there', async () => {
    const calls: string[] = []
    const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      calls.push(`${init?.method ?? 'GET'} ${String(url).split('?')[0]}`)
      if (String(url).startsWith(config.signUrl)) {
        return new Response(JSON.stringify({ full: 'https://put/full', thumb: 'https://put/thumb' }))
      }
      return new Response(null, { status: 200 })
    })

    const result = await uploadPhoto(config, 'holi-2027-01', prepared, 'admin-token', fetchImpl as unknown as typeof fetch)

    // The file goes to the bucket, not through a server that would then be holding it — and
    // then the server is asked what actually landed there, before any row is written.
    expect(calls).toEqual([
      'POST https://site.example/api/sign',
      'PUT https://put/full',
      'PUT https://put/thumb',
      'POST https://site.example/api/sign',
    ])
    expect(result).toEqual({
      url: 'https://photos.example/full/holi-2027-01.jpg',
      thumbnailUrl: 'https://photos.example/thumb/holi-2027-01.jpg',
    })
  })

  /*
   * Everything before this happens in the browser, including the metadata check — and the
   * browser is what is being defended against. If the server reads the object back and finds
   * anything, the upload fails here, so no row is ever written and nothing appears in an album.
   */
  it('fails when the server reads the object back and does not like it', async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      if (String(url).includes('verify=1')) {
        return new Response(JSON.stringify({ error: 'That photograph was not accepted: the full carries EXIF (may include GPS). It has been taken out of the bucket.' }), { status: 422 })
      }
      if (String(url).startsWith(config.signUrl)) {
        return new Response(JSON.stringify({ full: 'https://put/full', thumb: 'https://put/thumb' }))
      }
      return new Response(null, { status: 200 })
    })
    await expect(
      uploadPhoto(config, 'x', prepared, 'admin-token', fetchImpl as unknown as typeof fetch),
    ).rejects.toThrow(/was not accepted.*taken out of the bucket/)
  })

  it('says something usable even when the refusal carries no words', async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      if (String(url).includes('verify=1')) return new Response('not json', { status: 500 })
      if (String(url).startsWith(config.signUrl)) {
        return new Response(JSON.stringify({ full: 'https://put/full', thumb: 'https://put/thumb' }))
      }
      return new Response(null, { status: 200 })
    })
    await expect(
      uploadPhoto(config, 'x', prepared, 'admin-token', fetchImpl as unknown as typeof fetch),
    ).rejects.toThrow(/could not be checked \(500\)/)
  })

  it('says so plainly when the bucket refuses', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 403 }))
    await expect(uploadPhoto(config, 'x', prepared, 'admin-token', fetchImpl as unknown as typeof fetch)).rejects.toThrow(/upload was refused \(403\)/)
  })

  it('fails if either size fails, because half a photograph is a gap in the grid', async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      if (String(url).startsWith(config.signUrl)) {
        return new Response(JSON.stringify({ full: 'https://put/full', thumb: 'https://put/thumb' }))
      }
      return new Response(null, { status: String(url).endsWith('thumb') ? 500 : 200 })
    })
    await expect(uploadPhoto(config, 'x', prepared, 'admin-token', fetchImpl as unknown as typeof fetch)).rejects.toThrow(/would not upload \(500\)/)
  })
})

describe('who is asking', () => {
  it('sends the signed-in person\'s token, which is how the function knows they are on the committee', async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request, _init?: RequestInit) =>
      String(url).startsWith(config.signUrl)
        ? new Response(JSON.stringify({ full: 'https://put/full', thumb: 'https://put/thumb' }))
        : new Response(null, { status: 200 }),
    )
    await uploadPhoto(config, 'x', prepared, 'the-token', fetchImpl as unknown as typeof fetch)
    const [, init] = fetchImpl.mock.calls[0]
    expect((init?.headers as Record<string, string>).authorization).toBe('Bearer the-token')
  })
})

describe('taking a photograph out of the bucket', () => {
  it('asks the function to remove it, as the person doing it', async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => new Response(null, { status: 200 }))
    await deletePhoto(config, 'holi-2027-01', 'the-token', fetchImpl as unknown as typeof fetch)
    const [url, init] = fetchImpl.mock.calls[0]
    expect(String(url)).toBe('https://site.example/api/sign?key=holi-2027-01')
    expect(init?.method).toBe('DELETE')
    expect((init?.headers as Record<string, string>).authorization).toBe('Bearer the-token')
  })

  it('says so plainly when the bucket refuses, so the row is not deleted on a false yes', async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => new Response(null, { status: 403 }))
    await expect(deletePhoto(config, 'x', 'the-token', fetchImpl as unknown as typeof fetch)).rejects.toThrow(/could not be deleted from storage \(403\)/)
  })

  it('knows which photographs are ours to remove from the bucket, and which are not', () => {
    expect(keyOf(config, 'https://photos.example/full/holi-2027-01.jpg')).toBe('holi-2027-01')
    // Somebody else's file, a thumbnail address, or a shape that could reach outside full/.
    expect(keyOf(config, 'https://elsewhere.example/full/holi-2027-01.jpg')).toBeNull()
    expect(keyOf(config, 'https://photos.example/thumb/holi-2027-01.jpg')).toBeNull()
    expect(keyOf(config, 'https://photos.example/full/../secret.jpg')).toBeNull()
  })
})
