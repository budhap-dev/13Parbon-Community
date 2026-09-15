import { describe, expect, it, vi } from 'vitest'
import { readUploadConfig, uploadPhoto, UploadNotConfigured } from './uploads'

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

    const result = await uploadPhoto(config, 'holi-2027-01', prepared, fetchImpl as unknown as typeof fetch)

    // The file goes to the bucket, not through a server that would then be holding it.
    expect(calls).toEqual(['POST https://site.example/api/sign', 'PUT https://put/full', 'PUT https://put/thumb'])
    expect(result).toEqual({
      url: 'https://photos.example/full/holi-2027-01.jpg',
      thumbnailUrl: 'https://photos.example/thumb/holi-2027-01.jpg',
    })
  })

  it('says so plainly when the bucket refuses', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 403 }))
    await expect(uploadPhoto(config, 'x', prepared, fetchImpl as unknown as typeof fetch)).rejects.toThrow(/would not let us in \(403\)/)
  })

  it('fails if either size fails, because half a photograph is a gap in the grid', async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      if (String(url).startsWith(config.signUrl)) {
        return new Response(JSON.stringify({ full: 'https://put/full', thumb: 'https://put/thumb' }))
      }
      return new Response(null, { status: String(url).endsWith('thumb') ? 500 : 200 })
    })
    await expect(uploadPhoto(config, 'x', prepared, fetchImpl as unknown as typeof fetch)).rejects.toThrow(/would not upload \(500\)/)
  })
})
