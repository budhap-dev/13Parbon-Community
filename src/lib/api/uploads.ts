import type { Prepared } from '@/lib/images/prepare'
import { slugFrom } from '@/domain/slug'

export type UploadConfig = {
  /** Where the browser asks for permission to put a file in the bucket. */
  signUrl: string
  /** Where the files are served from afterwards. */
  publicUrl: string
}

/**
 * Whether this build can put a photograph in the bucket.
 *
 * The same shape as `readSupabaseConfig`: absent settings mean the feature is off and says so,
 * rather than offering a button that fails. R2 credentials cannot live in the browser — anybody
 * could read them out of the bundle and write to the bucket — so the browser asks a small
 * endpoint for a one-off permission and uploads with that.
 */
export function readUploadConfig(env: Record<string, string | undefined>): UploadConfig | null {
  const signUrl = env.VITE_PHOTOS_SIGN_URL?.trim()
  const publicUrl = env.VITE_PHOTOS_URL?.trim()
  if (!signUrl || !publicUrl) return null
  return { signUrl: signUrl.replace(/\/+$/, ''), publicUrl: publicUrl.replace(/\/+$/, '') }
}

export class UploadNotConfigured extends Error {
  constructor() {
    super(
      'Uploading is not switched on yet, so photographs cannot be added from here. Ask whoever looks after the website to switch it on.',
    )
    this.name = 'UploadNotConfigured'
  }
}

/** Both sizes of one photograph, under the keys the gallery already expects. */
export type UploadedPhoto = { url: string; thumbnailUrl: string }

/** The random end of every key. Twelve characters of base 36 is about 62 bits. */
const SUFFIX = 12

/**
 * The key to upload a new photograph under: something a person can read, then something random.
 *
 * Each screen used to build its own from what was to hand, and every one could repeat. An
 * event cover was its title and the file's name, so next year's "Durga Puja" from poster.jpg
 * replaced this year's; a theme photograph was the file's name alone; an album photograph was
 * the album's count plus one, which comes round again after a deletion. The second upload took
 * the first one's place in the bucket, and deleting either row took down the file both used.
 *
 * Random also means unguessable. The bucket serves whatever it holds to anybody with the
 * address, and an album kept for members only was a run of numbers anybody could count through.
 */
export function photoKey(...parts: string[]): string {
  const random = new Uint8Array(SUFFIX)
  crypto.getRandomValues(random)
  const suffix = Array.from(random, (byte) => (byte % 36).toString(36)).join('')
  const stem = slugFrom(parts.join(' ')).slice(0, 80 - SUFFIX - 1).replace(/-+$/, '') || 'photo'
  return `${stem}-${suffix}`
}

/**
 * Puts a prepared photograph in the bucket.
 *
 * `prepared` has already been re-encoded and checked in the browser, so what is sent carries no
 * location, camera or date. The server signs, the browser sends: the file never passes through
 * a server that would then be holding somebody's photograph.
 */
export async function uploadPhoto(
  config: UploadConfig,
  key: string,
  prepared: Prepared,
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<UploadedPhoto> {
  // The signed-in person's own token: the function asks the database whether they are on the
  // committee before it signs anything, and it asks with this.
  const signed = await fetchImpl(`${config.signUrl}?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
  })
  if (!signed.ok) throw new Error(`The upload was refused (${signed.status}). Try again in a moment, or sign out and back in.`)
  const { full, thumb } = (await signed.json()) as { full: string; thumb: string }

  const put = async (url: string, body: Blob) => {
    const response = await fetchImpl(url, { method: 'PUT', body, headers: { 'content-type': 'image/jpeg' } })
    if (!response.ok) throw new Error(`That photograph would not upload (${response.status}).`)
  }

  // Both, or neither: a full picture with no thumbnail shows as a gap in every grid.
  await Promise.all([put(full, prepared.full), put(thumb, prepared.thumb)])

  /*
   * Now ask the server what actually landed.
   *
   * Everything above this line happens in the browser, including the check that the photograph
   * carries no location — and the browser is the thing being defended against. What was sent
   * went to a waiting area nothing serves from; this reads both objects back where nothing here
   * can reach them, and only if they carry nothing does the server publish them under `full/`
   * and `thumb/`. Until it has said yes, no row is written, so a refused photograph is not in
   * the album and not at a URL.
   */
  const checked = await fetchImpl(`${config.signUrl}?key=${encodeURIComponent(key)}&verify=1`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
  })
  if (!checked.ok) {
    const said = (await checked.json().catch(() => null)) as { error?: string } | null
    throw new Error(said?.error ?? `The photograph uploaded but could not be checked (${checked.status}), so it was not added. Try again.`)
  }

  return {
    url: `${config.publicUrl}/full/${key}.jpg`,
    thumbnailUrl: `${config.publicUrl}/thumb/${key}.jpg`,
  }
}

/**
 * Takes a photograph out of the bucket — both sizes.
 *
 * The half of "taking a photograph down" the database cannot do. The privacy page promises a
 * picture comes down on request, and a row deleted while the file stays at its URL has broken
 * that promise while appearing to keep it. The gallery calls this first and removes the row
 * only once it has succeeded.
 */
export async function deletePhoto(config: UploadConfig, key: string, token: string, fetchImpl: typeof fetch = fetch): Promise<void> {
  const response = await fetchImpl(`${config.signUrl}?key=${encodeURIComponent(key)}`, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error(`The photograph could not be deleted from storage (${response.status}). Try again in a moment.`)
}

/**
 * The key a photograph was uploaded under, from where it is served — or null for one that is
 * not in our bucket at all. Nothing else's file is ours to delete.
 */
export function keyOf(config: Pick<UploadConfig, 'publicUrl'>, url: string): string | null {
  const match = new RegExp(`^${config.publicUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/full/([a-z0-9][a-z0-9-]{0,79})\\.jpg$`).exec(url)
  return match ? match[1] : null
}
