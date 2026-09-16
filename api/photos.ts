import type { VercelRequest, VercelResponse } from '@vercel/node'
import { deletePhoto, depsFromEnv, signUpload } from '../src/server/photos'

/**
 * POST   /api/photos?key=<album>-<nn>   → two signed PUT URLs, full and thumbnail
 * DELETE /api/photos?key=<album>-<nn>   → both objects removed
 *
 * Both need `Authorization: Bearer <the signed-in person's Supabase token>`, and the database
 * is what decides whether that person is on the committee. Everything else is in
 * src/server/photos.ts, where the tests are.
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const deps = await depsFromEnv(process.env)
  if (!deps) {
    res.status(503).json({ error: 'Photographs are not switched on: the bucket is not configured.' })
    return
  }
  const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '')
  const key = typeof req.query.key === 'string' ? req.query.key : ''
  const reply =
    req.method === 'POST'
      ? await signUpload(deps, token, key)
      : req.method === 'DELETE'
        ? await deletePhoto(deps, token, key)
        : { status: 405, body: { error: 'POST to sign an upload, DELETE to take a photograph down.' } }
  res.status(reply.status).json(reply.body)
}
