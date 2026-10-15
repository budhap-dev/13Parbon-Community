/**
 * Draws the icons a phone puts on its home screen when somebody installs the site, and writes
 * them to public/icons/.
 *
 *   icon-192.png, icon-512.png   Android and the install dialog, used as they are
 *   icon-maskable-512.png        Android's own shapes (circle, squircle…), which crop the edges
 *   apple-touch-icon.png         iPhone and iPad, 180px; iOS rounds the corners itself
 *
 * Each is the emblem in a gold ring on Festival red. The maskable one keeps the emblem well
 * inside the middle 80%, which is all Android promises not to cut off.
 *
 * Run this again whenever the emblem changes:
 *
 *   node scripts/make-app-icons.mjs
 *
 * Needs Chrome installed, and puppeteer-core to drive it, as make-share-card.mjs does.
 */
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

/** `emblem` is the share of the width the emblem and its ring take up. */
const ICONS = [
  { file: 'icon-192.png', size: 192, emblem: 0.84 },
  { file: 'icon-512.png', size: 512, emblem: 0.84 },
  { file: 'icon-maskable-512.png', size: 512, emblem: 0.66 },
  { file: 'apple-touch-icon.png', size: 180, emblem: 0.8 },
]

// Embedded, because the page is loaded from a data URL and has no origin to resolve against.
const emblem = await readFile(join(root, 'public/brand/13parbon-emblem.jpg'))
const emblemUrl = `data:image/jpeg;base64,${emblem.toString('base64')}`

const html = (size, share) => {
  const diameter = Math.round(size * share)
  const ring = Math.max(3, Math.round(size * 0.022))
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<style>
  * { margin: 0; box-sizing: border-box; }
  body {
    width: ${size}px; height: ${size}px;
    display: grid; place-items: center;
    background: radial-gradient(120% 120% at 30% 10%, #9a2a1e 0%, #7a1a12 55%, #5e1009 100%);
  }
  .emblem {
    width: ${diameter}px; height: ${diameter}px;
    border-radius: 50%; overflow: hidden;
    box-shadow: 0 0 0 ${ring}px #f7b733, 0 ${ring * 2}px ${ring * 5}px rgba(0,0,0,.35);
  }
  /* A touch larger than the circle, so the grey corners of the square photo never show. */
  .emblem img { width: 100%; height: 100%; object-fit: cover; transform: scale(1.1); display: block; }
</style>
</head>
<body><div class="emblem"><img src="${emblemUrl}" alt="" /></div></body>
</html>`
}

const outDir = join(root, 'public/icons')
await mkdir(outDir, { recursive: true })

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
for (const { file, size, emblem: share } of ICONS) {
  await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 })
  await page.setContent(html(size, share), { waitUntil: 'load' })
  const out = join(outDir, file)
  await writeFile(out, await page.screenshot({ type: 'png' }))
  console.log(`${file} — ${size}x${size}, ${Math.round((await stat(out)).size / 1024)} KB`)
}
await browser.close()
