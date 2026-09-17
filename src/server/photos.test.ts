import { describe, expect, it, vi } from 'vitest'
import { deletePhoto, depsFromEnv, KEY, objectKeys, signUpload, type PhotoDeps } from './photos.js'

function deps(over: Partial<PhotoDeps> = {}): PhotoDeps & { remove: ReturnType<typeof vi.fn> } {
  return {
    signPut: async (key) => `https://bucket/${key}?signed`,
    remove: vi.fn(async () => {}),
    isAdmin: async (token) => token === 'admin-token',
    ...over,
  } as PhotoDeps & { remove: ReturnType<typeof vi.fn> }
}

describe('the key', () => {
  it('is an album slug and a number, and nothing that could reach another object', () => {
    for (const ok of ['boishakhi-2026-01', 'a', 'x'.repeat(80)]) expect(KEY.test(ok)).toBe(true)
    // This input names what a DELETE removes. Any of these, allowed through, is a request to
    // take down "a photograph" that could take down anything the credentials can reach.
    for (const bad of ['../secrets', 'full/other', 'a b', 'Boishakhi', '', 'x'.repeat(81), 'a.jpg']) {
      expect(KEY.test(bad)).toBe(false)
    }
  })

  it('names both sizes under the prefixes the gallery already uses', () => {
    expect(objectKeys('boishakhi-2026-01')).toEqual({ full: 'full/boishakhi-2026-01.jpg', thumb: 'thumb/boishakhi-2026-01.jpg' })
  })
})

describe('signing an upload', () => {
  it('gives an admin two URLs, one per size', async () => {
    const reply = await signUpload(deps(), 'admin-token', 'boishakhi-2026-01')
    expect(reply.status).toBe(200)
    expect(reply.body).toEqual({
      full: 'https://bucket/full/boishakhi-2026-01.jpg?signed',
      thumb: 'https://bucket/thumb/boishakhi-2026-01.jpg?signed',
    })
  })

  it('turns away no token, a bad key, and a member, in that order', async () => {
    expect((await signUpload(deps(), '', 'ok')).status).toBe(401)
    expect((await signUpload(deps(), 'admin-token', '../x')).status).toBe(400)
    expect((await signUpload(deps(), 'member-token', 'ok')).status).toBe(403)
  })

  it('asks the database, not the request, who is an admin', async () => {
    const isAdmin = vi.fn(async () => false)
    await signUpload(deps({ isAdmin }), 'whoever', 'ok')
    expect(isAdmin).toHaveBeenCalledWith('whoever')
  })
})

describe('taking a photograph down', () => {
  it('removes both objects, which is the half of the promise the database cannot keep', async () => {
    const d = deps()
    const reply = await deletePhoto(d, 'admin-token', 'boishakhi-2026-01')
    expect(reply.status).toBe(200)
    expect(d.remove).toHaveBeenCalledWith(['full/boishakhi-2026-01.jpg', 'thumb/boishakhi-2026-01.jpg'])
  })

  it('removes nothing for anybody who is not on the committee', async () => {
    const d = deps()
    expect((await deletePhoto(d, 'member-token', 'boishakhi-2026-01')).status).toBe(403)
    expect((await deletePhoto(d, 'admin-token', 'full/anything')).status).toBe(400)
    expect(d.remove).not.toHaveBeenCalled()
  })
})

describe('reading the environment', () => {
  it('says the bucket is off unless every setting is present', async () => {
    expect(await depsFromEnv({})).toBeNull()
    expect(await depsFromEnv({ R2_ACCOUNT_ID: 'a', R2_ACCESS_KEY_ID: 'k', R2_SECRET_ACCESS_KEY: 's', R2_BUCKET: 'b' })).toBeNull()
  })
})
