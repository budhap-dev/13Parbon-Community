import { describe, expect, it, vi } from 'vitest'
import { deletePhoto, depsFromEnv, incomingKeys, KEY, MAX_BYTES, objectKeys, signUpload, verifyUpload, type PhotoDeps } from './photos.js'

/** A JPEG with nothing in it but the picture: start, quantisation table, scan, end. */
const CLEAN = new Uint8Array([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x04, 0x41, 0x41, 0xff, 0xda, 0x00, 0x02, 0x11, 0xff, 0xd9])

/** The same, with an APP1 in front of it — which is where EXIF, and so GPS, lives. */
const WITH_EXIF = new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0x00, 0x06, 0x41, 0x41, 0x41, 0x41, 0xff, 0xdb, 0x00, 0x04, 0x41, 0x41, 0xff, 0xda, 0x00, 0x02, 0x11, 0xff, 0xd9])

type Fakes = PhotoDeps & { remove: ReturnType<typeof vi.fn>; write: ReturnType<typeof vi.fn> }

/** By default: both sizes are waiting to be checked, and nothing is published under the name yet. */
function deps(over: Partial<PhotoDeps> = {}): Fakes {
  return {
    signPut: async (key) => `https://bucket/${key}?signed`,
    remove: vi.fn(async () => {}),
    isAdmin: async (token) => token === 'admin-token',
    read: async () => CLEAN,
    size: async (key) => (key.startsWith('incoming/') ? CLEAN.length : null),
    write: vi.fn(async () => {}),
    ...over,
  } as Fakes
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
  it('gives an admin two URLs, one per size, both in the waiting area rather than where the gallery serves from', async () => {
    const reply = await signUpload(deps(), 'admin-token', 'boishakhi-2026-01')
    expect(reply.status).toBe(200)
    expect(reply.body).toEqual({
      full: 'https://bucket/incoming/full/boishakhi-2026-01.jpg?signed',
      thumb: 'https://bucket/incoming/thumb/boishakhi-2026-01.jpg?signed',
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
    expect(d.remove).toHaveBeenCalledWith([
      'full/boishakhi-2026-01.jpg',
      'thumb/boishakhi-2026-01.jpg',
      'incoming/full/boishakhi-2026-01.jpg',
      'incoming/thumb/boishakhi-2026-01.jpg',
    ])
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

/*
 * The check that does not run in the browser.
 *
 * Everything the app does to a photograph before this happens on the machine it came from, and
 * that machine is exactly what a signed-in account could replace. The signed PUT is pinned to
 * image/jpeg, but that pins what the upload claims, not what its bytes are.
 */
describe('reading back what actually arrived', () => {
  const held = incomingKeys('holi-2027-01')

  it('publishes a photograph that carries nothing, and empties the waiting area', async () => {
    const d = deps()
    expect(await verifyUpload(d, 'admin-token', 'holi-2027-01')).toEqual({ status: 200, body: { ok: true } })
    expect(d.write).toHaveBeenCalledWith('full/holi-2027-01.jpg', CLEAN)
    expect(d.write).toHaveBeenCalledWith('thumb/holi-2027-01.jpg', CLEAN)
    expect(d.remove).toHaveBeenCalledWith([held.full, held.thumb])
  })

  it('refuses one with EXIF in it, publishes nothing, and takes it out of the waiting area', async () => {
    const d = deps({ read: async (key) => (key === held.full ? WITH_EXIF : CLEAN) })
    const reply = await verifyUpload(d, 'admin-token', 'holi-2027-01')

    expect(reply.status).toBe(422)
    expect(String(reply.body.error)).toMatch(/the full carries EXIF \(may include GPS\)/)
    expect(d.write).not.toHaveBeenCalled()
    expect(d.remove).toHaveBeenCalledWith([held.full, held.thumb])
  })

  it('checks the thumbnail too, which is the one nobody thinks about', async () => {
    const d = deps({ read: async (key) => (key === held.thumb ? WITH_EXIF : CLEAN) })
    const reply = await verifyUpload(d, 'admin-token', 'holi-2027-01')
    expect(String(reply.body.error)).toMatch(/the thumbnail carries/)
    expect(d.write).not.toHaveBeenCalled()
  })

  it('refuses a PNG, which the old check could not read and so called clean', async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    const d = deps({ read: async () => png })
    const reply = await verifyUpload(d, 'admin-token', 'holi-2027-01')
    expect(reply.status).toBe(422)
    expect(String(reply.body.error)).toMatch(/not a well-formed JPEG/)
    expect(d.write).not.toHaveBeenCalled()
  })

  /*
   * The original could be put back with the same signed URL after the check had passed. It
   * lands in the waiting area, which nothing serves from, because what is published is the
   * bytes that were read and checked rather than a copy of whatever is waiting by then.
   */
  it('publishes the bytes it checked, not whatever is in the waiting area afterwards', async () => {
    let swapped = false
    const d = deps({
      read: async () => {
        const bytes = swapped ? WITH_EXIF : CLEAN
        swapped = true
        return bytes
      },
    })
    await verifyUpload(d, 'admin-token', 'holi-2027-01')
    for (const [, bytes] of d.write.mock.calls) expect(bytes).not.toBe(WITH_EXIF)
  })

  it('says so when nothing was uploaded to check', async () => {
    const d = deps({ size: async () => null })
    expect((await verifyUpload(d, 'admin-token', 'holi-2027-01')).status).toBe(400)
    expect(d.write).not.toHaveBeenCalled()
  })

  it('refuses something far larger than the app ever sends, before reading it', async () => {
    const read = vi.fn(async () => CLEAN)
    const d = deps({ read, size: async (key) => (key.startsWith('incoming/') ? MAX_BYTES + 1 : null) })
    expect((await verifyUpload(d, 'admin-token', 'holi-2027-01')).status).toBe(413)
    expect(read).not.toHaveBeenCalled()
    expect(d.remove).toHaveBeenCalledWith([held.full, held.thumb])
  })

  it('never writes over a photograph that is already published', async () => {
    const d = deps({ size: async () => 1000 })
    const reply = await verifyUpload(d, 'admin-token', 'holi-2027-01')
    expect(reply.status).toBe(409)
    expect(d.write).not.toHaveBeenCalled()
    expect(d.remove).toHaveBeenCalledWith([held.full, held.thumb])
  })

  it('asks the same questions of the caller as everything else here', async () => {
    expect((await verifyUpload(deps(), '', 'holi-2027-01')).status).toBe(401)
    expect((await verifyUpload(deps(), 'admin-token', '../secrets')).status).toBe(400)
    expect((await verifyUpload(deps(), 'member-token', 'holi-2027-01')).status).toBe(403)
  })
})
