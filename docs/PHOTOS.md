# Photographs: the bucket

The photographs live in Cloudflare R2, not in this repo, because the privacy page promises any
of them comes down on request and git history cannot keep that promise. This is what has to be
true in Cloudflare and in Vercel for uploading and taking down to work from the portal.

## In Cloudflare

1. **A bucket.** Any name; it goes in `R2_BUCKET`.
2. **A custom domain on the bucket** — `photos.13parbon.org.uk`. R2 → the bucket → Settings →
   Custom Domains. This is the address photographs are served from, so it survives a change of
   host. It goes in `VITE_PHOTOS_URL`, with no trailing slash.
3. **CORS on the bucket**, so the browser may PUT straight to it. R2 → the bucket → Settings →
   CORS policy:

   ```json
   [
     {
       "AllowedOrigins": ["https://13parbon.org.uk", "http://localhost:5173"],
       "AllowedMethods": ["PUT"],
       "AllowedHeaders": ["content-type"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

   The file never passes through our server: the browser asks `/api/photos` for permission,
   then sends the picture to the bucket itself. Without this the bucket refuses the browser.
4. **An API token**, R2 → Manage R2 API Tokens → Create. Permission **Object Read & Write**,
   scoped to **this one bucket**. Note the Access Key ID, the Secret Access Key, and the
   Account ID shown on the same page.

## In Vercel

Project → Settings → Environment Variables. The four server values never go anywhere else:

| Name | Value |
|---|---|
| `R2_ACCOUNT_ID` | from the token page |
| `R2_ACCESS_KEY_ID` | from the token page |
| `R2_SECRET_ACCESS_KEY` | from the token page — **never in the repo, never in chat** |
| `R2_BUCKET` | the bucket's name |
| `VITE_PHOTOS_SIGN_URL` | `/api/photos` |
| `VITE_PHOTOS_URL` | `https://photos.13parbon.org.uk` |

`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are already there; the function uses them to
ask the database whether the person uploading is on the committee.

Redeploy. Until all six are set, `/api/photos` answers 503 and the Photographs screen says the
bucket is not configured rather than offering a button that fails.

## What the function does

`api/photos.ts`, with the logic and its tests in `src/server/photos.ts`.

- `POST /api/photos?key=<album>-<nn>` — two signed URLs, one per size, good for five minutes.
- `DELETE /api/photos?key=<album>-<nn>` — both objects removed.

Both require `Authorization: Bearer <the signed-in person's token>`, and the database decides
whether that person is an admin, with their own token, by `portal.is_admin()`. The key is
checked against `^[a-z0-9][a-z0-9-]{0,79}$` before it reaches the bucket: it names what a
DELETE removes, and left open it could name anything the token can reach.

## Taking a photograph down

Two removals, in this order: the object from the bucket, then the row from the database. If the
bucket refuses, the row stays and the screen still shows the picture — which is the truth. A row
gone while the file is still at its URL is the promise broken while appearing kept, and the
gallery adapter refuses to do that even when the bucket is not configured at all.
