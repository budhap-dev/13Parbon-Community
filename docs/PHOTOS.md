# Photographs: switching the bucket on

The photographs live in Cloudflare R2, not in this repo, because the privacy page promises any
of them comes down on request and git history cannot keep that promise.

Everything in the app is built and tested. What is missing is six settings. Until all six are
there, the Photographs screen prepares a picture, shows you its size, tells you it carries no
location or camera or date — and then says *there is nowhere to put it yet*. This is how to give
it somewhere.

**It is about twenty minutes**, nearly all of it in two web consoles. You will not touch the code.

---

## The whole job, in one list

- [ ] 1. Check the bucket and its address are still there *(Cloudflare — 2 min)*
- [ ] 2. Let the browser write to the bucket — a CORS rule *(Cloudflare — 3 min)*
- [ ] 3. Make an API token and **keep the page open** *(Cloudflare — 3 min)*
- [ ] 4. Paste six settings into Vercel *(Vercel — 5 min)*
- [ ] 5. Redeploy, because settings do not reach a deployment that already happened *(Vercel — 2 min)*
- [ ] 6. Check it worked — three checks, in order *(5 min)*

Do them in order. Step 3 shows you a secret exactly once, and step 4 is where it goes, so those
two are really one step with a cup of tea in the middle at your peril.

---

## Step 1 — Check the bucket and its address

The bucket was made on 11 September 2026 and has photographs in it already, so this is a check
rather than a task. You are confirming two things and writing one of them down.

1. Go to **dash.cloudflare.com** → **R2** in the left sidebar → **Overview**.
2. You should see a bucket named **`13parbon-photos`**. Click it.
3. Click the **Settings** tab. Under **Custom Domains** you should see
   **`photos.13parbon.org.uk`**, marked Active.

**Write down the bucket's exact name.** That is the value of `R2_BUCKET` in step 4. If the bucket
is called something other than `13parbon-photos`, use what it is actually called — the name here
has to match the name there character for character.

> **If the custom domain is missing or not Active**, add it: Settings → Custom Domains →
> **Connect Domain** → `photos.13parbon.org.uk`. The DNS record is made for you because the
> domain is already on this Cloudflare account. Wait for Active before going on. The address
> matters more than it looks: every photograph URL the database has begins with it, so changing
> it later means rewriting rows, not just settings.

---

## Step 2 — Let the browser write to the bucket

The photograph never passes through our server. The browser asks our little function for a
one-off permission, then sends the file straight to Cloudflare — which is why a 12MB picture
does not go to a server that would then be holding somebody's photograph. But a browser will not
send anything to another domain unless that domain says it may. That permission is the CORS rule,
and without it uploads fail with an error the browser refuses to explain.

1. Still in **R2** → **`13parbon-photos`** → **Settings**.
2. Scroll to **CORS Policy**. Click **Edit** (or **Add CORS policy** if there is none).
3. Paste this, replacing anything already there:

   ```json
   [
     {
       "AllowedOrigins": [
         "https://13parbon.org.uk",
         "https://13parbon-git-feat-member-login-work-0cc7.vercel.app",
         "http://localhost:5173"
       ],
       "AllowedMethods": ["PUT"],
       "AllowedHeaders": ["content-type"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

4. **Save**.

It says: a page served from one of these three addresses may send a file here, and may set its
content type. Nothing else, from nowhere else.

> **The middle one is the branch preview, and you must check its spelling.** This is where the
> Photographs screen is testable *before* the branch is merged — the live site is still running
> `main`, which has no portal and no `/api/photos` at all. Vercel → the project → **Deployments**
> → the `feat/member-login` deployment → **Domains**: use the stable `…-git-feat-member-login-…`
> address, **not** the one with a random hash in the middle, which changes with every push.
> A browser compares this string exactly; one character out and the upload fails with a CORS
> error that says nothing useful.
>
> **Once the branch is merged, this line can come out** — `13parbon.org.uk` is then the place
> uploading happens, and a preview address left in the list is one more origin that can write to
> the bucket for no reason.
>
> **Why `localhost` is in the list:** so the screen can be worked on locally. It costs nothing —
> a page on your own machine can only reach the bucket with a signed URL our function gave it,
> and it only gives them to the committee.

---

## Step 3 — Make an API token

This is the one that lets our function sign uploads and remove objects. **Do not close the page
it gives you** until step 4 is done.

1. **R2** → **Overview** → **Manage R2 API Tokens** (top right).
2. You are offered two kinds. Choose **Create Account API token** — the top one.

   > **Account, not User.** A User token belongs to whoever is signed in and goes inactive the
   > day that person leaves the Cloudflare account. This token is what takes a photograph *out*
   > of the bucket, so a token that dies with a committee member is the takedown promise quietly
   > breaking on a day nobody is watching. Cloudflare marks the account one "recommended" for
   > production, and this is production.

3. Fill it in:
   - **Token name:** `13parbon-site-uploads` — so that in a year you know what it is for and can
     revoke it without guessing.
   - **Permissions:** **Object Read & Write**. Not Admin Read & Write. This token should be able
     to put photographs in and take them out, and nothing else — it cannot make or destroy a
     bucket, and if it ever leaked that is the difference that matters.
   - **Specify bucket(s):** choose **Apply to specific buckets only** and pick **`13parbon-photos`**.
   - **TTL:** leave as Forever.
4. **Create Account API Token**.

You are now on a page showing values you will not be shown again. Copy these three into a scratch
note — **not into a file in this repo, not into a chat window, not into an email**:

| On the page | Looks like | Goes into |
|---|---|---|
| **Access Key ID** | 32 hex characters | `R2_ACCESS_KEY_ID` |
| **Secret Access Key** | 64 hex characters | `R2_SECRET_ACCESS_KEY` |
| **Account ID** | 32 hex characters, shown just below, in the S3 endpoint | `R2_ACCOUNT_ID` |

The Account ID is the part of the **endpoint** before `.r2.cloudflarestorage.com`. If the page
shows `https://a1b2c3d4e5f6....r2.cloudflarestorage.com`, the Account ID is the `a1b2c3d4e5f6...`
part — not the whole URL. It is also on the R2 Overview page in the right-hand column, so this
one is recoverable if you lose it. The secret is not: lose it and you make a new token.

Go straight to step 4 while this page is open.

---

## Step 4 — Paste six settings into Vercel

1. Go to **vercel.com** → the **13parbon** project → **Settings** → **Environment Variables**.
2. Add each of these six, one at a time. For each: type the **Key**, paste the **Value**, and
   leave all three environment boxes ticked (Production, Preview, Development).

| Key | Value | Where it came from |
|---|---|---|
| `R2_ACCOUNT_ID` | the Account ID | step 3 |
| `R2_ACCESS_KEY_ID` | the Access Key ID | step 3 |
| `R2_SECRET_ACCESS_KEY` | the Secret Access Key | step 3 |
| `R2_BUCKET` | `13parbon-photos` | step 1 — the bucket's real name |
| `VITE_PHOTOS_SIGN_URL` | `/api/photos` | type it exactly, leading slash, no domain |
| `VITE_PHOTOS_URL` | `https://photos.13parbon.org.uk` | **no trailing slash** |

Three things that go wrong here, all of them silent:

- **A trailing space.** Pasting a key sometimes brings one. The code trims these, but paste
  carefully anyway — a trimmed value is right, a value with a newline in the middle is not.
- **A trailing slash on `VITE_PHOTOS_URL`.** The code strips it, but every example of these
  addresses elsewhere has none, and matching them is worth more than relying on the strip.
- **`VITE_PHOTOS_SIGN_URL` written as a full URL.** It is a path on this same site. `/api/photos`,
  not `https://13parbon.org.uk/api/photos`.

**The first four are server-side and stay that way.** They are never sent to a browser and must
never go in `.env.local` with real values, in the repo, or into a message. The two beginning
`VITE_` are compiled into the public JavaScript by design — they are an address and a path, and
neither is a secret.

### Two more, and check rather than assume

`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` must be in Vercel as well. The function uses
them to ask the database whether the person uploading is on the committee, and without them it
reports **the bucket is not configured** — sending you back to re-check six R2 values that were
right all along.

**On 17 September 2026 they were missing**, although this file had said for weeks that they were
already there. Every session against the real database had been a local one, reading
`.env.local`, so nothing had ever noticed. Check before believing it:

```
npx vercel env ls
```

If the two are not listed, add them — same values as in `.env.local`, all three environments.
Neither is a secret: the URL is public and the anon key is in the built JavaScript either way,
which is what makes row level security rather than the key the thing protecting the data.

---

## Step 5 — Redeploy

Environment variables reach the *next* deployment, not the one already running. Nothing you did
above is live until you do this.

Vercel → **Deployments** → the `feat/member-login` deployment → the **⋯** menu → **Redeploy**.

Two things in that dialog:

- **Choose Environment: Preview**, not Production. Production builds `main`, and `main` is from
  11 September: no portal, no Photographs screen, no `/api/photos`. Redeploying Production would
  apply these settings to a build that has nothing to apply them to. Until the branch is merged,
  Preview is where all of this exists.
- **Leave "Use existing Build Cache" unchecked.** `VITE_PHOTOS_SIGN_URL` and `VITE_PHOTOS_URL`
  are compiled into the JavaScript at build time rather than read when the page runs, so a cached
  build can hand back the old bundle — the one that still believes there is no bucket — and the
  screen goes on saying so however right the settings are.

When the tick appears, go to step 6, **on the preview address**, not on `13parbon.org.uk`.
If you changed your mind about a value, change it in Settings and redeploy again; there is no
other way to apply it.

---

## Step 6 — Check it worked

Three checks. Do them in order — each one tells you something the next cannot.

### Check 1: the function is there at all

In a browser, open the preview address with `/api/photos` on the end:

```
https://13parbon-git-feat-member-login-work-0cc7.vercel.app/api/photos
```

(Not `13parbon.org.uk/api/photos` — that is `main`, which has no such function and will show you
the home page no matter how right everything else is.)

**What you want to see:** a small piece of JSON, most likely
`{"error":"POST to sign an upload, DELETE to take a photograph down."}` — a GET is not something
it does, and saying so proves it is running and configured.

| What you see instead | What it means |
|---|---|
| `{"error":"Photographs are not switched on: the bucket is not configured."}` | One of the six is missing or misspelled, or you have not redeployed. Back to step 4, and check the spelling of every key. |
| *This page is temporarily unavailable* / `500 FUNCTION_INVOCATION_FAILED` | The function was found and then crashed. Copy the **request id** off that page and run `npx vercel logs --request-id <id> --since 6h --expand` — it prints the stack trace. This happened once already, on 2026-09-17: Vercel transpiles `api/` rather than bundling it, so an import written without a `.js` on the end reached Node unchanged and could not be resolved. `tsconfig.api.json` refuses that now. |
| The website's home page, or a 404 | The function is not being served at all. Tell me and I will look at [vercel.json](../vercel.json). |

### Check 2: an upload, end to end

1. Sign in **on the preview address** as yourself, and go to **Portal → Photographs**
   (`/admin/media`).
2. Open any album, or make a new one.
3. **Add a photograph** and choose a picture — ideally one taken on a phone, outdoors, so it has
   GPS in it.
4. You should see it prepare, and a line like *Ready: 1600×1200, 214KB and 31KB for the grid.
   **No location, camera or date***.
5. **The button you are looking for is "Put it in the bucket".** If it is there, the six settings
   have arrived. If instead it says *there is nowhere to put it yet: this build has no bucket
   configured*, the two `VITE_` values did not reach the build — they are compiled in, so they
   need the redeploy from step 5, not just saving.
6. Click it. The photograph should appear in the album.

| What you see instead | What it means |
|---|---|
| *The bucket would not let us in (403)* | The function ran and the database said you are not on the committee. Check you are signed in as an admin. |
| *The bucket would not let us in (503)* | The four server values are missing — check 1 will say the same thing. |
| *That photograph would not upload* with no number, or a browser console CORS error | Step 2. The rule is missing, or its `AllowedOrigins` does not include the address you are on. |
| *It reached the bucket but the album did not take it* | The file is in the bucket; the database row failed. Different problem — tell me. |

### Check 3: the promise it is all for

The point of the bucket is that nothing you upload carries where it was taken.

1. In the album, click the photograph you just uploaded to open it large, and copy its address —
   it will be `https://photos.13parbon.org.uk/full/<something>.jpg`.
2. Download that file and look at its properties. **There should be no GPS, no camera, no date.**
   On a Mac: open in Preview → Tools → Show Inspector → there should be no ⓘ location tab at all.
3. Then delete it from the screen — the trash on the picture itself — and reload the address from
   step 1. **It should now be gone**, not merely missing from the page.

If both of those hold, the privacy page's promise is real rather than a sentence, and step 4 of
[MEMBER-LOGIN-BUILD.md](MEMBER-LOGIN-BUILD.md) can be ticked.

---

## Working on this locally

`npm run dev` serves the site but **not** `/api/photos` — Vite does not run Vercel functions, so
uploading from `localhost` fails until you run `npx vercel dev` instead, with the same six values
in `.env.local`. Keep real R2 credentials out of that file if you can; the live site is the
honest place to test this, and check 2 above is the test.

---

## Reference: what the function does

[api/photos.ts](../api/photos.ts), with the logic and its tests in
[src/server/photos.ts](../src/server/photos.ts).

- `POST /api/photos?key=<album>-<nn>-<name>` — two signed URLs, one per size, good for five minutes.
- `POST /api/photos?key=<album>-<nn>-<name>&verify=1` — reads both objects back out of the bucket
  and refuses anything carrying metadata, taking it out rather than leaving it at a public URL.
- `DELETE /api/photos?key=<album>-<nn>-<name>` — both objects removed.

Both require `Authorization: Bearer <the signed-in person's token>`, and the database decides
whether that person is an admin, with their own token, by `portal.is_admin()`. The key is checked
against `^[a-z0-9][a-z0-9-]{0,79}$` before it reaches the bucket: it names what a DELETE removes,
and left open it could name anything the token can reach.

The signed PUT is pinned to `image/jpeg`, so nothing but a JPEG can go in through it, whatever
the browser claims to be sending. That pins what an upload *claims*, though, not what its bytes
are — which is why the browser's own check is no longer the last word. After the two PUTs the
browser asks `&verify=1`, and the function reads both objects back where the browser cannot
reach them. Anything carrying EXIF, XMP, IPTC or a comment is removed from the bucket and the
upload fails, so no album row is ever written for it.

## Reference: taking a photograph down

Two removals, in this order: the object from the bucket, then the row from the database. If the
bucket refuses, the row stays and the screen still shows the picture — which is the truth. A row
gone while the file is still at its URL is the promise broken while appearing kept, and the
gallery adapter refuses to do that even when the bucket is not configured at all.

## Reference: if the token ever leaks

Cloudflare → R2 → Manage R2 API Tokens → the token → **Revoke**. Uploading stops working
immediately and the screen goes back to saying there is nowhere to put photographs. Then do steps
3, 4 and 5 again with a new token. Nothing in the bucket is lost, and no address changes.
