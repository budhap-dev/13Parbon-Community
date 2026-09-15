/**
 * The rules a photograph has to pass before it can go in the bucket.
 *
 * All pure, all byte work, and deliberately separate from anything that touches a canvas: this
 * is the half that can be tested properly, and it is the half that carries the promise. The
 * privacy page says we will take down any photograph somebody appears in, and a photograph
 * taken in a front room publishes an address unless its metadata is gone.
 *
 * `scripts/prepare-photos.mjs` does the same job on a Mac with sips. These numbers are its
 * numbers, so an album uploaded in the app and one prepared by the script look the same.
 */

export const FULL_PX = 1600
export const THUMB_PX = 600
export const FULL_QUALITY = 0.7
export const THUMB_QUALITY = 0.68

/**
 * What the upload accepts. Decided 2026-09-15.
 *
 * Narrower than the script, which takes HEIC because sips decodes it — and an iPhone shoots
 * HEIC. So the screen has to say this out loud rather than ignoring files it cannot read:
 * somebody dragging photographs straight off a phone is the likeliest person to hit it.
 */
export const ACCEPTED = ['image/jpeg', 'image/png'] as const
export const ACCEPTED_LABEL = 'JPG, JPEG and PNG'

export function isAccepted(type: string): boolean {
  return (ACCEPTED as readonly string[]).includes(type.toLowerCase())
}

/**
 * The size to draw at, fitting the longest side to `max` and never scaling up.
 *
 * A picture smaller than the target is left alone. Enlarging it would cost bytes to add
 * nothing, and the grid would show a soft photograph where it could have shown a small one.
 */
export function scaleTo(width: number, height: number, max: number): { width: number; height: number } {
  const longest = Math.max(width, height)
  if (longest <= max) return { width, height }
  const ratio = max / longest
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) }
}

type Segment = { marker: number; start: number; end: number }

/** Every JPEG segment in order, so metadata can be told apart from the picture itself. */
function* segments(data: Uint8Array): Generator<Segment> {
  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) return
  let i = 2
  while (i < data.length - 1 && data[i] === 0xff) {
    const marker = data[i + 1]
    // Standalone markers carry no length.
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      yield { marker, start: i, end: i + 2 }
      i += 2
      continue
    }
    if (i + 3 >= data.length) return
    const length = (data[i + 2] << 8) | data[i + 3]
    if (length < 2) return
    yield { marker, start: i, end: i + 2 + length }
    // Everything after the start of scan is the picture.
    if (marker === 0xda) return
    i += 2 + length
  }
}

/**
 * APP1 holds EXIF, which is where GPS lives. APP2..APP15 carry ICC, XMP and the rest; COM is a
 * free-text comment. APP0 is JFIF, which is only ever the picture's own dimensions, so it stays.
 */
const isMetadata = (marker: number) => (marker >= 0xe1 && marker <= 0xef) || marker === 0xfe

/**
 * Whether a JPEG still carries anything that is not the picture.
 *
 * The last line of `prepare-photos.mjs` is its refusal to finish quietly when a file still has
 * metadata on it. This is that refusal, carried into the app: the browser checks its own output
 * before anything is sent, so the guarantee does not rest on the encoder having behaved.
 */
export function hasJpegMetadata(data: Uint8Array): boolean {
  for (const segment of segments(data)) if (isMetadata(segment.marker)) return true
  return false
}

/** Which segments they are, for saying what was found rather than only that something was. */
export function metadataMarkers(data: Uint8Array): string[] {
  const found: string[] = []
  for (const segment of segments(data)) {
    if (!isMetadata(segment.marker)) continue
    if (segment.marker === 0xfe) found.push('comment')
    else if (segment.marker === 0xe1) found.push('EXIF (may include GPS)')
    else found.push(`APP${segment.marker - 0xe0}`)
  }
  return found
}
