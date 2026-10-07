/**
 * The server half of photographs: signing an upload, and taking one down.
 *
 * R2 credentials cannot live in the browser — anybody could read them out of the bundle and
 * write to the bucket — so the browser asks here for a one-off permission and uploads with
 * that. The file itself never passes through this code: what is signed is a URL, and the
 * photograph goes straight from the browser to the bucket.
 *
 * Pure of Node and of Vercel on purpose. Everything that touches the network arrives as a
 * function in `PhotoDeps`, so this can be tested to the last branch without a bucket, and
 * `api/photos.ts` is a few lines that hand it a request.
 */

import { metadataMarkers } from '../domain/images.js'

export type PhotoDeps = {
  /** A URL the browser may PUT one object to, for a few minutes. */
  signPut: (objectKey: string) => Promise<string>
  /** Removes objects. Missing ones are not an error: a takedown that finds nothing has succeeded. */
  remove: (objectKeys: string[]) => Promise<void>
  /** Whether the bearer of this token acts for the committee — answered by the database. */
  isAdmin: (token: string) => Promise<boolean>
  /** Reads an object back out of the bucket, to see what actually arrived in it. */
  read: (objectKey: string) => Promise<Uint8Array>
  /** How big an object is, without fetching it; null when there is nothing there. */
  size: (objectKey: string) => Promise<number | null>
  /** Puts these exact bytes at a key, as a JPEG. */
  write: (objectKey: string, bytes: Uint8Array) => Promise<void>
}

/**
 * The most either size of one photograph may weigh.
 *
 * The app sends a 1600-pixel picture at quality 0.7, which is well under a megabyte. Nothing is
 * signed with a length, so this is checked before anything is read: without it, one PUT could
 * be as large as the bucket allows, and the check would try to hold all of it in memory.
 */
export const MAX_BYTES = 5 * 1024 * 1024

export type Reply = { status: number; body: Record<string, unknown> }

/**
 * A key is an album slug and a number, and nothing else.
 *
 * This is the one input that reaches the bucket, and on DELETE it says which objects go. Left
 * open it would take `../` or a `/`, and a request to remove "a photograph" could remove
 * anything the credentials can reach. So: lowercase, digits, hyphens, eighty characters.
 */
export const KEY = /^[a-z0-9][a-z0-9-]{0,79}$/

/** Where the two sizes of one photograph live, under the keys the gallery already expects. */
export function objectKeys(key: string): { full: string; thumb: string } {
  return { full: `full/${key}.jpg`, thumb: `thumb/${key}.jpg` }
}

/**
 * Where the browser's upload waits to be checked.
 *
 * Signed for here rather than for `full/` and `thumb/`, because what the browser puts in the
 * bucket is exactly what this code cannot vouch for. Uploaded straight to where the gallery
 * serves from, a photograph was public before anything had looked at it — and the look was a
 * second request the browser could simply not make, or follow by putting the camera original
 * back with the same signed URL. Only `verifyUpload` puts anything under `full/` and `thumb/`,
 * and what it puts there is the bytes it checked.
 */
export function incomingKeys(key: string): { full: string; thumb: string } {
  return { full: `incoming/full/${key}.jpg`, thumb: `incoming/thumb/${key}.jpg` }
}

async function admitted(deps: PhotoDeps, token: string, key: string): Promise<Reply | null> {
  if (!token) return { status: 401, body: { error: 'Sign in first.' } }
  if (!KEY.test(key)) return { status: 400, body: { error: 'That is not a photograph key.' } }
  // The database decides, with the caller's own token, so this cannot be talked round in the
  // browser and cannot drift from the rule every other screen uses.
  if (!(await deps.isAdmin(token))) return { status: 403, body: { error: 'Only the committee can do that.' } }
  return null
}

/**
 * Two URLs, full and thumbnail. Both or neither: a picture with no thumbnail is a gap in every grid.
 * Both are in the waiting area; see `incomingKeys`.
 */
export async function signUpload(deps: PhotoDeps, token: string, key: string): Promise<Reply> {
  const refused = await admitted(deps, token, key)
  if (refused) return refused
  const keys = incomingKeys(key)
  const [full, thumb] = await Promise.all([deps.signPut(keys.full), deps.signPut(keys.thumb)])
  return { status: 200, body: { full, thumb } }
}

/**
 * Reads back what arrived, and publishes it only if it carries nothing.
 *
 * Until now the only check on a photograph's metadata ran in the browser — which is the thing
 * being defended against. The signed PUT is pinned to image/jpeg, but that constrains what the
 * upload *claims* to be, not what its bytes are: anyone who can sign in as the committee could
 * put an untouched camera file, GPS and all, at a URL the gallery would then publish.
 *
 * So the object is fetched back out of the waiting area here, where the browser cannot reach,
 * and put through the same rules the browser used. Only if it passes are those same bytes —
 * the ones read and checked, not whatever is in the waiting area by now — written to where the
 * gallery serves from. Whatever happens, the waiting area is emptied.
 *
 * It never writes over a photograph that is already published. A name that is taken is
 * refused, so a slip in naming cannot quietly replace somebody else's picture.
 */
export async function verifyUpload(deps: PhotoDeps, token: string, key: string): Promise<Reply> {
  const refused = await admitted(deps, token, key)
  if (refused) return refused

  const held = incomingKeys(key)
  const published = objectKeys(key)
  const refuse = async (status: number, error: string): Promise<Reply> => {
    await deps.remove([held.full, held.thumb])
    return { status, body: { error } }
  }

  const sizes = await Promise.all([deps.size(held.full), deps.size(held.thumb)])
  if (sizes.some((size) => size === null)) return refuse(400, 'Nothing arrived to check: both sizes have to be uploaded first.')
  if (sizes.some((size) => size! > MAX_BYTES)) return refuse(413, 'That photograph is far larger than the app ever sends, and was not accepted.')

  const taken = await Promise.all([deps.size(published.full), deps.size(published.thumb)])
  if (taken.some((size) => size !== null)) {
    return refuse(409, 'There is already a photograph under that name. It has been left as it was, and this one was not added.')
  }

  const checked: { what: string; to: string; bytes: Uint8Array }[] = []
  const found: string[] = []
  for (const [what, from, to] of [
    ['full', held.full, published.full],
    ['thumbnail', held.thumb, published.thumb],
  ] as const) {
    const bytes = await deps.read(from)
    // Read again rather than trusted from the size above: the object can change in between.
    if (bytes.length > MAX_BYTES) return refuse(413, 'That photograph is far larger than the app ever sends, and was not accepted.')
    const markers = metadataMarkers(bytes)
    if (markers.length > 0) found.push(`the ${what} carries ${markers.join(', ')}`)
    checked.push({ what, to, bytes })
  }

  if (found.length > 0) {
    return refuse(422, `That photograph was not accepted: ${found.join('; ')}. Nothing was published.`)
  }

  for (const { to, bytes } of checked) await deps.write(to, bytes)
  await deps.remove([held.full, held.thumb])
  return { status: 200, body: { ok: true } }
}

/**
 * Removes both objects.
 *
 * This is the half of "taking a photograph down" the database cannot do. The privacy page
 * promises a picture comes down on request, and a row deleted while the file stays at its URL
 * has broken that promise while appearing to keep it. So the object goes first, and the app
 * removes the row only once this has said yes.
 */
export async function deletePhoto(deps: PhotoDeps, token: string, key: string): Promise<Reply> {
  const refused = await admitted(deps, token, key)
  if (refused) return refused
  const keys = objectKeys(key)
  const held = incomingKeys(key)
  // The waiting area too, in case an upload was abandoned before it was checked.
  await deps.remove([keys.full, keys.thumb, held.full, held.thumb])
  return { status: 200, body: { removed: [keys.full, keys.thumb] } }
}

/** What the function needs from its environment. Absent means photographs are switched off. */
export type PhotoEnv = {
  R2_ACCOUNT_ID?: string
  R2_ACCESS_KEY_ID?: string
  R2_SECRET_ACCESS_KEY?: string
  R2_BUCKET?: string
  VITE_SUPABASE_URL?: string
  VITE_SUPABASE_ANON_KEY?: string
}

/**
 * Wires the dependencies to R2 and to Supabase, or says the bucket is not configured.
 *
 * Only this function knows about the SDKs, and it loads them when asked rather than at
 * import, so the pure half above costs nothing to test.
 */
export async function depsFromEnv(env: PhotoEnv): Promise<PhotoDeps | null> {
  const accountId = env.R2_ACCOUNT_ID?.trim()
  const accessKeyId = env.R2_ACCESS_KEY_ID?.trim()
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY?.trim()
  const bucket = env.R2_BUCKET?.trim()
  const supabaseUrl = env.VITE_SUPABASE_URL?.trim()
  const anonKey = env.VITE_SUPABASE_ANON_KEY?.trim()
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !supabaseUrl || !anonKey) return null

  const [{ S3Client, PutObjectCommand, DeleteObjectsCommand, GetObjectCommand, HeadObjectCommand }, { getSignedUrl }, { createClient }] =
    await Promise.all([import('@aws-sdk/client-s3'), import('@aws-sdk/s3-request-presigner'), import('@supabase/supabase-js')])

  // R2 speaks S3. `auto` is the only region it accepts.
  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  })

  return {
    signPut: (Key) =>
      // The browser sends image/jpeg, and a signed PUT is only valid for the type it was signed
      // with — so nothing but a JPEG can go in through here, whatever the browser says.
      getSignedUrl(s3, new PutObjectCommand({ Bucket: bucket, Key, ContentType: 'image/jpeg' }), { expiresIn: 300 }),
    read: async (Key) => {
      const out = await s3.send(new GetObjectCommand({ Bucket: bucket, Key }))
      return new Uint8Array(await out.Body!.transformToByteArray())
    },
    size: async (Key) => {
      try {
        const out = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key }))
        return out.ContentLength ?? 0
      } catch (error) {
        // Nothing there is an answer, not a failure. Anything else is a failure, and says so.
        if ((error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404) return null
        throw error
      }
    },
    write: async (Key, bytes) => {
      await s3.send(new PutObjectCommand({ Bucket: bucket, Key, Body: bytes, ContentType: 'image/jpeg' }))
    },
    remove: async (keys) => {
      await s3.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true } }))
    },
    isAdmin: async (token) => {
      // The caller's own token, so the policies answer for them; the anon key alone would ask
      // as nobody and be told no.
      const client = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
      })
      const { data, error } = await client.schema('portal').rpc('is_admin')
      return !error && data === true
    },
  }
}
