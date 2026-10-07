import { describe, expect, it, vi } from 'vitest'
import { FULL_PX, THUMB_PX } from '@/domain/images'
import { MetadataSurvived, prepareImage, UnsupportedImage, type ImageOps } from './prepare'

const file = (name: string, type: string) => new File([new Uint8Array([1, 2, 3])], name, { type })

/** A clean JPEG: start of image, quantisation table, scan, end. Nothing but the picture. */
const clean = new Uint8Array([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x04, 0x41, 0x41, 0xff, 0xda, 0x00, 0x02, 0x11, 0xff, 0xd9])
/** The same, with an EXIF block that should never have survived. */
const dirty = new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0x00, 0x04, 0x41, 0x41, 0xff, 0xda, 0x00, 0x02, 0x11, 0xff, 0xd9])

function ops(over: Partial<ImageOps> = {}, size = { width: 4000, height: 3000 }): ImageOps {
  return {
    decode: vi.fn(async () => ({ ...size, close: vi.fn() })),
    encode: vi.fn(async () => new Blob(['x'])),
    bytes: vi.fn(async () => clean),
    ...over,
  }
}

describe('what it refuses before doing any work', () => {
  it('refuses a format we do not take, and names what we do', async () => {
    await expect(prepareImage(file('holi.heic', 'image/heic'), ops())).rejects.toThrow(UnsupportedImage)
    await expect(prepareImage(file('holi.heic', 'image/heic'), ops())).rejects.toThrow(/JPG, JPEG and PNG/)
  })

  it('names the file, because people drag in twenty at a time', async () => {
    await expect(prepareImage(file('IMG_0421.heic', 'image/heic'), ops())).rejects.toThrow(/IMG_0421\.heic/)
  })

  it('does not even decode something it will not take', async () => {
    const o = ops()
    await expect(prepareImage(file('x.gif', 'image/gif'), o)).rejects.toThrow()
    expect(o.decode).not.toHaveBeenCalled()
  })
})

describe('preparing a photograph', () => {
  it('applies the rotation the camera recorded before discarding it', async () => {
    // The rotation lives in EXIF — inside the thing being thrown away. Decode without it and
    // every portrait photograph comes out on its side.
    const o = ops()
    await prepareImage(file('a.jpg', 'image/jpeg'), o)
    expect(o.decode).toHaveBeenCalledWith(expect.anything())
  })

  it('makes both sizes, at the same numbers as the script', async () => {
    const o = ops()
    await prepareImage(file('a.jpg', 'image/jpeg'), o)

    const calls = (o.encode as ReturnType<typeof vi.fn>).mock.calls
    expect(calls).toHaveLength(2)
    expect(calls[0].slice(1, 3)).toEqual([FULL_PX, 1200])
    expect(calls[1].slice(1, 3)).toEqual([THUMB_PX, 450])
  })

  it('reports the size it settled on', async () => {
    const result = await prepareImage(file('a.jpg', 'image/jpeg'), ops())
    expect(result).toMatchObject({ width: 1600, height: 1200 })
  })

  it('leaves a picture that is already small alone', async () => {
    const o = ops({}, { width: 500, height: 400 })
    await prepareImage(file('a.jpg', 'image/jpeg'), o)
    const [firstCall] = (o.encode as ReturnType<typeof vi.fn>).mock.calls
    expect(firstCall.slice(1, 3)).toEqual([500, 400])
  })

  it('lets go of the decoded picture afterwards', async () => {
    const close = vi.fn()
    await prepareImage(file('a.jpg', 'image/jpeg'), ops({ decode: async () => ({ width: 10, height: 10, close }) }))
    expect(close).toHaveBeenCalled()
  })

  it('lets go of it even when something went wrong', async () => {
    const close = vi.fn()
    const o = ops({
      decode: async () => ({ width: 10, height: 10, close }),
      encode: async () => {
        throw new Error('canvas gave up')
      },
    })
    await expect(prepareImage(file('a.jpg', 'image/jpeg'), o)).rejects.toThrow()
    expect(close).toHaveBeenCalled()
  })
})

describe('checking its own work', () => {
  it('refuses to hand back anything still carrying metadata', async () => {
    // The promise rests on the bytes, not on the encoder having behaved.
    const o = ops({ bytes: async () => dirty })
    await expect(prepareImage(file('a.jpg', 'image/jpeg'), o)).rejects.toThrow(MetadataSurvived)
  })

  it('says what it found, and that nothing was sent', async () => {
    const o = ops({ bytes: async () => dirty })
    await expect(prepareImage(file('a.jpg', 'image/jpeg'), o)).rejects.toThrow(/EXIF \(may include GPS\)/)
    await expect(prepareImage(file('a.jpg', 'image/jpeg'), o)).rejects.toThrow(/Nothing has been uploaded/)
  })

  it('checks the thumbnail too, not only the big one', async () => {
    let call = 0
    const o = ops({
      bytes: async () => {
        call += 1
        return call === 1 ? clean : dirty
      },
    })
    await expect(prepareImage(file('a.jpg', 'image/jpeg'), o)).rejects.toThrow(/thumbnail/)
  })

  it('hands back both sizes when they are clean', async () => {
    const result = await prepareImage(file('a.jpg', 'image/jpeg'), ops())
    expect(result.full).toBeInstanceOf(Blob)
    expect(result.thumb).toBeInstanceOf(Blob)
  })
})
