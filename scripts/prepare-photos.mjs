/**
 * Gets a folder of photographs ready for the gallery, and writes them where they can be
 * dragged into the Cloudflare R2 bucket:
 *
 *   node scripts/prepare-photos.mjs <folder> <album-slug> [outDir]
 *   node scripts/prepare-photos.mjs ~/Desktop/holi-2027 holi-2027
 *
 * Three things happen to every file, and the second is the one that matters:
 *
 *  1. It is resized — 1600px for the full picture, 600px for the thumbnail in the grid.
 *  2. Its metadata is stripped. Phone photographs carry GPS and a camera model, and resizing
 *     alone does NOT remove them: sips rewrites the file and keeps the EXIF, GPS included.
 *     So every APP1..APP15 and comment segment is dropped by hand afterwards, and the result
 *     is parsed again to prove none survived. A photograph taken at somebody's home otherwise
 *     publishes their address.
 *  3. It is renamed <album-slug>-01.jpg and up, which is what the album fixtures expect.
 *
 * Needs macOS for sips. Nothing here is a dependency of the app: this runs by hand.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const FULL_PX = 1600
const THUMB_PX = 600
const FULL_QUALITY = 70
const THUMB_QUALITY = 68

const [source, slug, outArg] = process.argv.slice(2)
if (!source || !slug) {
  console.error('usage: node scripts/prepare-photos.mjs <folder> <album-slug> [outDir]')
  process.exit(1)
}
const out = resolve(outArg ?? join(process.cwd(), 'photos-out'))

/** Every JPEG segment in order, so metadata can be told apart from the picture itself. */
function* segments(data) {
  let i = 2
  while (i < data.length - 1 && data[i] === 0xff) {
    const marker = data[i + 1]
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      yield { marker, start: i, end: i + 2 }
      i += 2
      continue
    }
    const length = data.readUInt16BE(i + 2)
    yield { marker, start: i, end: i + 2 + length }
    if (marker === 0xda) return
    i += 2 + length
  }
}

/** APP1 holds EXIF, which is where GPS lives. APP2..APP15 and COM carry the rest. */
const isMetadata = (marker) => (marker >= 0xe1 && marker <= 0xef) || marker === 0xfe

function stripMetadata(file) {
  const data = readFileSync(file)
  const keep = [data.subarray(0, 2)]
  let scanStart = null
  for (const segment of segments(data)) {
    if (segment.marker === 0xd8) continue
    if (!isMetadata(segment.marker)) keep.push(data.subarray(segment.start, segment.end))
    if (segment.marker === 0xda) {
      scanStart = segment.end
      break
    }
  }
  if (scanStart !== null) keep.push(data.subarray(scanStart))
  writeFileSync(file, Buffer.concat(keep))
}

function hasMetadata(file) {
  const data = readFileSync(file)
  for (const segment of segments(data)) if (isMetadata(segment.marker)) return true
  return false
}

function convert(from, to, px, quality) {
  execFileSync('sips', ['-Z', String(px), '-s', 'format', 'jpeg', '-s', 'formatOptions', String(quality), from, '--out', to], {
    stdio: 'ignore',
  })
  stripMetadata(to)
}

const files = readdirSync(source)
  .filter((name) => /\.(jpe?g|png|heic)$/i.test(name))
  .sort()
if (files.length === 0) {
  console.error(`no photographs found in ${source}`)
  process.exit(1)
}

mkdirSync(join(out, 'full'), { recursive: true })
mkdirSync(join(out, 'thumb'), { recursive: true })

let sourceBytes = 0
let outBytes = 0
let dirty = 0

files.forEach((name, i) => {
  const id = `${slug}-${String(i + 1).padStart(2, '0')}`
  const from = join(source, name)
  sourceBytes += statSync(from).size
  for (const [dir, px, quality] of [
    ['full', FULL_PX, FULL_QUALITY],
    ['thumb', THUMB_PX, THUMB_QUALITY],
  ]) {
    const to = join(out, dir, `${id}.jpg`)
    convert(from, to, px, quality)
    outBytes += statSync(to).size
    if (hasMetadata(to)) dirty += 1
  }
  console.log(`  ${name}  ->  ${id}.jpg`)
})

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)}MB`
console.log(`\n${files.length} photographs: ${mb(sourceBytes)} -> ${mb(outBytes)}`)
console.log(dirty === 0 ? 'metadata: none left, on any file' : `METADATA STILL PRESENT on ${dirty} file(s) — do not upload`)
console.log(`\nwritten to ${out}`)
console.log(`\nUpload full/ and thumb/ to the 13parbon-photos bucket, then in fixtures.ts add the`)
console.log(`album and its photographs, using that album's own id:`)
console.log(`  ...albumPhotos('<the album id>', '${slug}', ${files.length}),`)
if (dirty > 0) process.exit(1)
