import { describe, expect, it } from 'vitest'
import {
  ACCEPTED_LABEL,
  FULL_PX,
  hasJpegMetadata,
  isAccepted,
  metadataMarkers,
  scaleTo,
  THUMB_PX,
} from './images'

/** A minimal JPEG: start of image, the given segments, start of scan, end of image. */
function jpeg(...blocks: { marker: number; body?: number[] }[]): Uint8Array {
  const bytes: number[] = [0xff, 0xd8]
  for (const { marker, body = [0, 0] } of blocks) {
    const payload = body.length >= 2 ? body : [0, 2]
    bytes.push(0xff, marker, ...payload)
  }
  bytes.push(0xff, 0xda, 0x00, 0x02, 0x11, 0x22, 0xff, 0xd9)
  return new Uint8Array(bytes)
}

/** A segment of `n` payload bytes, with the two length bytes JPEG requires in front. */
const block = (marker: number, n = 4) => ({ marker, body: [0x00, n + 2, ...Array(n).fill(0x41)] })

/** An APP2 carrying a colour profile: the signature the browser's own encoder writes. */
const iccBlock = () => {
  const signature = [...'ICC_PROFILE'].map((c) => c.charCodeAt(0)).concat(0x00)
  return { marker: 0xe2, body: [0x00, signature.length + 4, ...signature, 0x01, 0x01] }
}

describe('what the upload accepts', () => {
  it('takes JPEG and PNG', () => {
    expect(isAccepted('image/jpeg')).toBe(true)
    expect(isAccepted('image/png')).toBe(true)
    expect(isAccepted('IMAGE/JPEG')).toBe(true)
  })

  it('does not take HEIC, which is what an iPhone shoots by default', () => {
    // The script copes with these because sips decodes them. This does not, and the screen
    // has to say so rather than ignoring the file in silence.
    expect(isAccepted('image/heic')).toBe(false)
    expect(isAccepted('image/heif')).toBe(false)
  })

  it('names the formats it takes, for saying out loud', () => {
    expect(ACCEPTED_LABEL).toMatch(/JPG/)
    expect(ACCEPTED_LABEL).toMatch(/PNG/)
  })
})

describe('the size to draw at', () => {
  it('fits the longest side, landscape or portrait', () => {
    expect(scaleTo(4000, 3000, FULL_PX)).toEqual({ width: 1600, height: 1200 })
    expect(scaleTo(3000, 4000, FULL_PX)).toEqual({ width: 1200, height: 1600 })
  })

  it('makes a thumbnail from the same picture', () => {
    expect(scaleTo(4000, 3000, THUMB_PX)).toEqual({ width: 600, height: 450 })
  })

  it('leaves a small photograph alone rather than blowing it up', () => {
    // Enlarging costs bytes to add nothing, and shows a soft picture where a small one would do.
    expect(scaleTo(800, 600, FULL_PX)).toEqual({ width: 800, height: 600 })
  })

  it('handles a square', () => {
    expect(scaleTo(2000, 2000, FULL_PX)).toEqual({ width: 1600, height: 1600 })
  })
})

describe('finding metadata that should not be there', () => {
  it('passes a picture that is only a picture', () => {
    expect(hasJpegMetadata(jpeg())).toBe(false)
  })

  it('leaves JFIF alone, which is only the picture\'s own dimensions', () => {
    expect(hasJpegMetadata(jpeg(block(0xe0)))).toBe(false)
  })

  it('catches EXIF, which is where GPS lives', () => {
    // A photograph taken in somebody's front room otherwise publishes their address.
    expect(hasJpegMetadata(jpeg(block(0xe1)))).toBe(true)
    expect(metadataMarkers(jpeg(block(0xe1)))).toEqual(['EXIF (may include GPS)'])
  })

  it('catches XMP and the other application blocks', () => {
    expect(hasJpegMetadata(jpeg(block(0xe2)))).toBe(true)
    expect(hasJpegMetadata(jpeg(block(0xed)))).toBe(true)
    expect(metadataMarkers(jpeg(block(0xe2), block(0xed)))).toEqual(['APP2', 'APP13'])
  })

  /*
   * The browser writes a colour profile into APP2 for any wide-gamut picture, which is most
   * photographs taken on a phone. Refusing it refused the encoder's own output, so nothing
   * could be uploaded at all — and a profile describes colour, not the person who took it.
   */
  it('lets a colour profile through, and only a real one', () => {
    expect(hasJpegMetadata(jpeg(iccBlock()))).toBe(false)
    expect(metadataMarkers(jpeg(iccBlock()))).toEqual([])
    // An APP2 that is not a profile is still something nobody asked for.
    expect(hasJpegMetadata(jpeg(block(0xe2)))).toBe(true)
    // And the profile does not excuse what sits beside it.
    expect(metadataMarkers(jpeg(iccBlock(), block(0xe1)))).toEqual(['EXIF (may include GPS)'])
  })

  it('catches a free-text comment', () => {
    expect(hasJpegMetadata(jpeg(block(0xfe)))).toBe(true)
    expect(metadataMarkers(jpeg(block(0xfe)))).toEqual(['comment'])
  })

  it('finds it wherever it sits among the other segments', () => {
    expect(hasJpegMetadata(jpeg(block(0xe0), block(0xdb), block(0xe1)))).toBe(true)
  })

  it('walks past the picture, so its own bytes are never read as segments', () => {
    // After start-of-scan comes the photograph, full of 0xff bytes that are not markers:
    // 0xff 0x00 is a stuffed byte and 0xff 0xd0 a restart. Neither is metadata.
    const clean = new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0x00, 0x02, 0x11, 0xff, 0x00, 0xe1, 0xff, 0xd0, 0x22, 0xff, 0xd9])
    expect(metadataMarkers(clean)).toEqual([])
  })

  /*
   * Each of these got a camera file past the check on the server, which used to stop at the
   * first thing it did not understand and call what it had seen so far clean.
   */
  describe('the ways round it', () => {
    it('refuses something that is not a JPEG at all, a PNG with its own EXIF chunk included', () => {
      expect(hasJpegMetadata(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(true)
      expect(metadataMarkers(new Uint8Array([]))).toEqual(['something that is not a well-formed JPEG'])
      expect(hasJpegMetadata(new Uint8Array([0xff]))).toBe(true)
    })

    it('finds EXIF behind padding bytes', () => {
      // Any number of 0xff before a marker is legal JPEG, and used to end the walk.
      const padded = new Uint8Array([0xff, 0xd8, 0xff, 0xff, 0xff, 0xe1, 0x00, 0x04, 0x41, 0x41, 0xff, 0xda, 0x00, 0x02, 0x11, 0xff, 0xd9])
      expect(metadataMarkers(padded)).toEqual(['EXIF (may include GPS)'])
    })

    it('refuses a stray byte between segments, which used to hide whatever came after it', () => {
      const stray = new Uint8Array([0xff, 0xd8, 0x00, 0xff, 0xe1, 0x00, 0x04, 0x41, 0x41, 0xff, 0xda, 0x00, 0x02, 0x11, 0xff, 0xd9])
      expect(hasJpegMetadata(stray)).toBe(true)
    })

    it('finds EXIF put after the first scan', () => {
      const late = new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0x00, 0x02, 0x11, 0xff, 0xe1, 0x00, 0x04, 0x41, 0x41, 0xff, 0xda, 0x00, 0x02, 0x22, 0xff, 0xd9])
      expect(metadataMarkers(late)).toEqual(['EXIF (may include GPS)'])
    })

    it('refuses anything written after the end of the picture, but not padding', () => {
      const appended = new Uint8Array([...jpeg(block(0xe0)), 0xff, 0xe1, 0x00, 0x08, 1, 2, 3, 4, 5, 6])
      expect(hasJpegMetadata(appended)).toBe(true)
      expect(hasJpegMetadata(new Uint8Array([...jpeg(block(0xe0)), 0x00, 0x00]))).toBe(false)
    })

    it('refuses a file that stops before the end of the picture', () => {
      expect(hasJpegMetadata(jpeg(block(0xe0)).slice(0, -2))).toBe(true)
    })
  })

  it('does not run off the end of a truncated file', () => {
    expect(() => hasJpegMetadata(new Uint8Array([0xff, 0xd8, 0xff, 0xe1]))).not.toThrow()
    expect(() => hasJpegMetadata(new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0x00]))).not.toThrow()
    // A length of zero would otherwise loop for ever.
    expect(() => hasJpegMetadata(new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0x00, 0x00, 0x41]))).not.toThrow()
  })
})
