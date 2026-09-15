import {
  ACCEPTED_LABEL,
  FULL_PX,
  FULL_QUALITY,
  hasJpegMetadata,
  isAccepted,
  metadataMarkers,
  scaleTo,
  THUMB_PX,
  THUMB_QUALITY,
} from '@/domain/images'

export type Prepared = {
  /** 1600px on the longest side, shown when a photograph is opened. */
  full: Blob
  /** 600px, shown in the grid and the carousel. */
  thumb: Blob
  width: number
  height: number
}

/**
 * The browser bits, named so they can be handed in. A canvas cannot be exercised in the test
 * environment, and an upload path that is only ever tested by hand is one that breaks quietly.
 */
export type ImageOps = {
  decode: (file: Blob) => Promise<{ width: number; height: number; close?: () => void }>
  encode: (source: unknown, width: number, height: number, quality: number) => Promise<Blob>
  bytes: (blob: Blob) => Promise<Uint8Array>
}

export class UnsupportedImage extends Error {}
export class MetadataSurvived extends Error {}

/**
 * Gets a photograph ready for the bucket.
 *
 * The important part is what it does *not* do. It does not strip metadata — it re-encodes from
 * a pixel buffer, so there is never any metadata to strip. EXIF, GPS, the camera and the date,
 * XMP, IPTC, and the little preview image EXIF can carry (which is the pre-crop picture, and the
 * one people forget) are all gone by construction rather than by having been removed carefully.
 *
 * The original never leaves the machine. Sending a 12MB photograph to a server to have its GPS
 * taken off means the GPS was on the server.
 *
 * Two things that are easy to get wrong and are handled here:
 *
 *   *Orientation.* The rotation a phone records lives in EXIF — inside the thing being thrown
 *   away. Decode without applying it first and every portrait photograph comes out on its side.
 *   That is the single commonest bug in browser-side EXIF stripping.
 *
 *   *Trusting the encoder.* The output is read back and checked before anything is sent, so the
 *   promise rests on the bytes rather than on the canvas having behaved. That refusal is the
 *   best line in `scripts/prepare-photos.mjs` and it is carried over here.
 */
export async function prepareImage(file: File, ops: ImageOps = browserOps): Promise<Prepared> {
  if (!isAccepted(file.type)) {
    throw new UnsupportedImage(
      `${file.name} is a ${file.type || 'file of unknown type'}. We can take ${ACCEPTED_LABEL}.`,
    )
  }

  const source = await ops.decode(file)
  try {
    const full = scaleTo(source.width, source.height, FULL_PX)
    const thumb = scaleTo(source.width, source.height, THUMB_PX)

    const [fullBlob, thumbBlob] = await Promise.all([
      ops.encode(source, full.width, full.height, FULL_QUALITY),
      ops.encode(source, thumb.width, thumb.height, THUMB_QUALITY),
    ])

    for (const [what, blob] of [
      ['full', fullBlob],
      ['thumbnail', thumbBlob],
    ] as const) {
      const found = metadataMarkers(await ops.bytes(blob))
      if (found.length > 0) {
        throw new MetadataSurvived(
          `${file.name}: the ${what} still carries ${found.join(', ')}. Nothing has been uploaded.`,
        )
      }
    }

    return { full: fullBlob, thumb: thumbBlob, width: full.width, height: full.height }
  } finally {
    source.close?.()
  }
}

const browserOps: ImageOps = {
  // `imageOrientation: 'from-image'` is the whole of the orientation fix: it applies the
  // rotation the camera recorded, so that discarding EXIF afterwards costs nothing.
  decode: (file) => createImageBitmap(file, { imageOrientation: 'from-image' }),

  encode: async (source, width, height, quality) => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('This browser would not give us a canvas to work on.')
    // A canvas holds pixels and nothing else. This is the step that loses the metadata.
    context.drawImage(source as ImageBitmap, 0, 0, width, height)
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality),
    )
    if (!blob) throw new Error('The browser could not make a JPEG from that picture.')
    return blob
  },

  bytes: async (blob) => new Uint8Array(await blob.arrayBuffer()),
}

/** Exported for the check that runs before publishing, and for tests. */
export { hasJpegMetadata }
