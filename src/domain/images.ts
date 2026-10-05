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

/** A restart marker, which sits inside the picture's own bytes and carries no length. */
const isRestart = (marker: number) => marker >= 0xd0 && marker <= 0xd7

/**
 * Every JPEG segment in order, and whether the file was a JPEG from end to end.
 *
 * Strict, because this used to stop at the first thing it did not understand and report
 * whatever it had seen by then — so a check built on it could be walked round. A PNG was not a
 * JPEG, so it had no segments and no metadata. A padding byte before the EXIF ended the walk
 * early and hid it. Metadata put after the first scan, or anything written after the end of
 * the picture, was never reached. Every one of those is now `wellFormed: false`, and the
 * callers refuse a file that is not well formed rather than calling it clean.
 */
function scan(data: Uint8Array): { segments: Segment[]; wellFormed: boolean } {
  const segments: Segment[] = []
  const malformed = { segments, wellFormed: false }
  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) return malformed
  let i = 2
  while (i < data.length) {
    if (data[i] !== 0xff) return malformed
    const start = i
    // Any number of 0xff may pad the gap before a marker; the marker is the first byte that is not one.
    while (i < data.length && data[i] === 0xff) i += 1
    if (i >= data.length) return malformed
    const marker = data[i]
    i += 1
    if (marker === 0x00 || marker === 0xd8) return malformed
    if (marker === 0xd9) {
      segments.push({ marker, start, end: i })
      // Nothing may follow the end of the picture except padding: a whole second file can sit there.
      for (; i < data.length; i += 1) if (data[i] !== 0x00) return malformed
      return { segments, wellFormed: true }
    }
    if (isRestart(marker) || marker === 0x01) {
      segments.push({ marker, start, end: i })
      continue
    }
    if (i + 1 >= data.length) return malformed
    const length = (data[i] << 8) | data[i + 1]
    if (length < 2 || i + length > data.length) return malformed
    segments.push({ marker, start, end: i + length })
    i += length
    if (marker !== 0xda) continue
    /*
     * After a start of scan comes the picture itself, which is full of 0xff bytes that are not
     * markers: 0xff 0x00 is a stuffed byte and 0xff 0xd0..d7 a restart. Walked past here rather
     * than given up on, because a progressive JPEG has more segments after its first scan and
     * an APP1 can be put there as easily as anywhere.
     */
    while (i < data.length) {
      if (data[i] !== 0xff) {
        i += 1
        continue
      }
      const next = data[i + 1]
      if (next === 0x00 || (next !== undefined && isRestart(next))) i += 2
      else if (next === 0xff) i += 1
      else break
    }
  }
  return malformed
}

/** `ICC_PROFILE\0`, the signature an ICC segment always opens with. */
const ICC_SIGNATURE = [0x49, 0x43, 0x43, 0x5f, 0x50, 0x52, 0x4f, 0x46, 0x49, 0x4c, 0x45, 0x00]

/**
 * A colour profile — the one thing in APP2 that describes the picture rather than the person
 * who took it.
 *
 * It matters because the browser writes one. A phone photograph is usually Display P3, and
 * canvas records which colours it meant in an APP2 segment; refusing that refused the encoder's
 * own output, so every wide-gamut photograph — most photographs taken on a phone — failed the
 * check and could not be uploaded at all.
 *
 * Keeping it is not a concession either. Without the profile the same bytes are read as sRGB
 * and the picture comes out flat. And a profile says how to show colour: it has nowhere to put
 * a location, a camera or a date, which is what this check exists to keep out.
 */
function isColourProfile(data: Uint8Array, segment: Segment): boolean {
  if (segment.marker !== 0xe2) return false
  // Past the marker and its two length bytes is where a segment's own signature begins.
  const at = segment.start + 4
  return ICC_SIGNATURE.every((byte, i) => data[at + i] === byte)
}

/**
 * APP1 holds EXIF, which is where GPS lives. APP2..APP15 carry XMP, IPTC and the rest; COM is a
 * free-text comment. APP0 is JFIF, which is only ever the picture's own dimensions, so it stays,
 * and so does an APP2 that turns out to be a colour profile.
 *
 * XMP is APP1 as well, under a different signature, so it is refused with EXIF rather than
 * needing its own case.
 */
const isMetadata = (data: Uint8Array, segment: Segment) =>
  ((segment.marker >= 0xe1 && segment.marker <= 0xef) || segment.marker === 0xfe) &&
  !isColourProfile(data, segment)

/**
 * Whether a JPEG still carries anything that is not the picture.
 *
 * The last line of `prepare-photos.mjs` is its refusal to finish quietly when a file still has
 * metadata on it. This is that refusal, carried into the app: the browser checks its own output
 * before anything is sent, so the guarantee does not rest on the encoder having behaved.
 */
export function hasJpegMetadata(data: Uint8Array): boolean {
  return metadataMarkers(data).length > 0
}

/**
 * Which segments they are, for saying what was found rather than only that something was.
 *
 * A file that is not a well-formed JPEG is reported as one, so it is refused like metadata is:
 * whatever could not be read is exactly where a location could be hiding.
 */
export function metadataMarkers(data: Uint8Array): string[] {
  const { segments, wellFormed } = scan(data)
  const found: string[] = []
  for (const segment of segments) {
    if (!isMetadata(data, segment)) continue
    if (segment.marker === 0xfe) found.push('comment')
    else if (segment.marker === 0xe1) found.push('EXIF (may include GPS)')
    else found.push(`APP${segment.marker - 0xe0}`)
  }
  if (!wellFormed) found.push('something that is not a well-formed JPEG')
  return found
}
