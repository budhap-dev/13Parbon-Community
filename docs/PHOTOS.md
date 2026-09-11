# Photographs

How pictures from an event get onto the site, and why they are kept where they are.

## Where they live, and why not in this repository

The photographs are in a Cloudflare R2 bucket, `13parbon-photos`, served from
`https://photos.13parbon.org.uk`. Nothing but the filenames is in git.

That is deliberate. This repository is public and git history is permanent: a photograph
committed once stays recoverable by anyone who clones it, whatever a later commit removes.
The privacy page promises to take down any photograph a member or their child appears in, on
request and without a reason. That promise cannot be kept by a file in git history. Deleting
an object from a bucket deletes it.

So: **never commit a community photograph.** The pull request that adds an album should
contain filenames and counts, and no binaries.

Keys are flat, two per photograph:

```
full/<album-slug>-01.jpg     1600px, shown when a photograph is opened
thumb/<album-slug>-01.jpg     600px, shown in the grid and the carousel
```

The bucket is on Cloudflare's free tier: 10GB and no charge for traffic. Thirty-one
photographs use about 0.15% of it.

## Adding an album

### 1. Prepare the files

```sh
node scripts/prepare-photos.mjs <folder> <album-slug>
```

For example:

```sh
node scripts/prepare-photos.mjs ~/Desktop/holi-2027 holi-2027
```

It resizes, strips metadata, renames to `holi-2027-01.jpg` and up, and writes `full/` and
`thumb/` into `photos-out/`. It prints what it did and refuses to finish quietly if any file
still carries metadata.

**Why the stripping matters.** Phone photographs carry GPS coordinates and the camera model,
and resizing alone does not remove them — `sips` rewrites the picture and keeps the EXIF,
GPS included. The Boishakhi photographs carried the coordinates of the hall. One taken at
somebody's home would carry their address. The script drops every metadata segment and then
parses the result again to prove none survived.

The script needs macOS, for `sips`. It is not a dependency of the app and does not run in the
build, in the same way as `scripts/make-share-card.mjs`.

### More photographs for an album that already exists

Number them on from where the album left off, rather than re-running over everything:

```sh
node scripts/prepare-photos.mjs ~/Desktop/more-boishakhi boishakhi-2026 --start=18
```

Re-running over the whole folder instead would renumber every photograph, so `…-05.jpg`
could become a different picture, every object would have to be uploaded again, and any link
somebody had already shared would point somewhere else. `--start` avoids all three: the new
files are `18` and up, nothing already in the bucket is touched, and only the count in
`fixtures.ts` changes.

The current counts are in `fixtures.ts` — the number passed to `albumPhotos` — so `--start`
is that number plus one.

### 2. Upload

Cloudflare dashboard → R2 → `13parbon-photos` → **Objects**, then drag in the `full` and
`thumb` folders themselves, so the keys stay `full/…` and `thumb/…` rather than gaining a
folder in front.

### 3. Tell the site about it

In `src/lib/api/mock/fixtures.ts`:

```ts
const albums: Album[] = [
  { id: 'al-holi-2027', slug: 'holi-2027', title: 'Holi 2027',
    description: 'Colours in the park, March 2027.',
    festivalId: 'holi',                       // lets the events page offer it, see below
    publishedAt: '2027-03-20T12:00:00', visibility: 'public' },
  …
]

const media: Media[] = [
  ...albumPhotos('al-holi-2027', 'holi-2027', 24),   // the count the script printed
  …
]
```

`albumPhotos` builds the URLs from the slug and the count, so there is no list of filenames to
keep in step.

Setting `festivalId` matters for more than the album: when an occasion has no date on the
calendar yet, the events page offers that festival's most recent album instead of a dead end.

### 4. Check, and open a pull request

```sh
npm run check
```

The gallery tests count photographs, so an album whose count is wrong fails rather than
rendering a broken image.

## What the committee should know

- **Consent is opt-out.** The privacy page says what we publish, and anyone who asks has a
  photograph removed, no reason needed. The offer is repeated under the photographs
  themselves on the gallery and album pages, not left on the privacy page alone.
- **To remove one photograph:** `albumPhotos` builds its URLs by counting from `01`, so the
  numbering has to stay unbroken — deleting `…-05.jpg` and lowering the count to 16 would ask
  for a file that is gone and never ask for the last one. Take the photograph out of the
  original folder, run the script over that folder again, upload the result over the album,
  and delete whichever trailing pair is now surplus. Then lower the count in `fixtures.ts`.
  Deleting the two objects is the part that actually honours the request; do that first if
  somebody is waiting.
- **To pull the whole gallery at once:** set `showPhotos: false` in `src/app/site.ts`. The
  gallery leaves the navigation and the photographs leave the home page.
- **The gallery is kept out of search.** `robots.txt` disallows `/gallery`: the albums are
  open to anyone with the link, but photographs of children are not for an image search to
  find. A test holds the navigation, the sitemap and `robots.txt` to that decision.

## Members-only albums

`Album` has `visibility: 'public' | 'members'`, and members-only albums are filtered out of
every gallery call — they do not appear in listings and return nothing even to somebody who
knows the address.

That filter governs the *pages*, not the *files*. The `13parbon-photos` bucket has a public
custom domain, so anything in it can be fetched by anyone with the URL. A members-only album
therefore cannot live in that bucket. It needs a second bucket with no public domain, served
through signed URLs, or Supabase Storage with row-level security, whichever arrives first.
