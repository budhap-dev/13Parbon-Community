import { describe, expect, it, vi } from 'vitest'
import { deletePhoto, keyOf, readUploadConfig, uploadPhoto, UploadNotConfigured } from './uploads'

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
    expect(new UploadNotConfigured().message).toMatch(/prepare-photos\.mjs/)
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

    // The file goes to the bucket, not through a server that would then be holding it.
    expect(calls).toEqual(['POST https://site.example/api/sign', 'PUT https://put/full', 'PUT https://put/thumb'])
    expect(result).toEqual({
      url: 'https://photos.example/full/holi-2027-01.jpg',
      thumbnailUrl: 'https://photos.example/thumb/holi-2027-01.jpg',
    })
  })

  it('says so plainly when the bucket refuses', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 403 }))
    await expect(uploadPhoto(config, 'x', prepared, 'admin-token', fetchImpl as unknown as typeof fetch)).rejects.toThrow(/would not let us in \(403\)/)
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
    await expect(deletePhoto(config, 'x', 'the-token', fetchImpl as unknown as typeof fetch)).rejects.toThrow(/would not take that photograph down \(403\)/)
  })

  it('knows which photographs are ours to remove from the bucket, and which are not', () => {
    expect(keyOf(config, 'https://photos.example/full/holi-2027-01.jpg')).toBe('holi-2027-01')
    // Somebody else's file, a thumbnail address, or a shape that could reach outside full/.
    expect(keyOf(config, 'https://elsewhere.example/full/holi-2027-01.jpg')).toBeNull()
    expect(keyOf(config, 'https://photos.example/thumb/holi-2027-01.jpg')).toBeNull()
    expect(keyOf(config, 'https://photos.example/full/../secret.jpg')).toBeNull()
  })
})
