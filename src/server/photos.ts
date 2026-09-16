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

export type PhotoDeps = {
  /** A URL the browser may PUT one object to, for a few minutes. */
  signPut: (objectKey: string) => Promise<string>
  /** Removes objects. Missing ones are not an error: a takedown that finds nothing has succeeded. */
  remove: (objectKeys: string[]) => Promise<void>
  /** Whether the bearer of this token acts for the committee — answered by the database. */
  isAdmin: (token: string) => Promise<boolean>
}

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

async function admitted(deps: PhotoDeps, token: string, key: string): Promise<Reply | null> {
  if (!token) return { status: 401, body: { error: 'Sign in first.' } }
  if (!KEY.test(key)) return { status: 400, body: { error: 'That is not a photograph key.' } }
  // The database decides, with the caller's own token, so this cannot be talked round in the
  // browser and cannot drift from the rule every other screen uses.
  if (!(await deps.isAdmin(token))) return { status: 403, body: { error: 'Only the committee can do that.' } }
  return null
}

/** Two URLs, full and thumbnail. Both or neither: a picture with no thumbnail is a gap in every grid. */
export async function signUpload(deps: PhotoDeps, token: string, key: string): Promise<Reply> {
  const refused = await admitted(deps, token, key)
  if (refused) return refused
  const keys = objectKeys(key)
  const [full, thumb] = await Promise.all([deps.signPut(keys.full), deps.signPut(keys.thumb)])
  return { status: 200, body: { full, thumb } }
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
  await deps.remove([keys.full, keys.thumb])
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

  const [{ S3Client, PutObjectCommand, DeleteObjectsCommand }, { getSignedUrl }, { createClient }] =
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
