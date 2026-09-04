/**
 * Draws the picture that WhatsApp, Facebook and the rest show when somebody shares a link to
 * the site, and writes it to public/brand/share-card.jpg.
 *
 * It has to be a real file at a real address: the crawlers that fetch it do not run
 * JavaScript, so nothing the app draws at runtime can be used. Run this again whenever the
 * logo, the name or the tagline changes:
 *
 *   node scripts/make-share-card.mjs
 *
 * Needs Chrome installed, and puppeteer-core to drive it. Neither is a dependency of the app:
 * this runs by hand, not in the build.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

/** 1.91:1, which is what the crawlers ask for and what gets the wide card rather than a thumbnail. */
const WIDTH = 1200
const HEIGHT = 630

const NAME = '13PARBON'
const BENGALI = 'বারো মাসে তেরো পার্বণ'
const TAGLINE = 'A Bengali cultural association in Leeds'

// Embedded, because the page is loaded from a data URL and has no origin to resolve against.
const logo = await readFile(join(root, 'public/brand/13parbon-logo.jpeg'))
const logoUrl = `data:image/jpeg;base64,${logo.toString('base64')}`

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,800&family=Tiro+Bangla&family=Hind+Siliguri:wght@400;600&display=swap" />
<style>
  * { margin: 0; box-sizing: border-box; }
  body {
    width: ${WIDTH}px; height: ${HEIGHT}px;
    display: flex; align-items: center; gap: 64px;
    padding: 0 84px;
    background: radial-gradient(120% 140% at 12% 0%, #9a2a1e 0%, #7a1a12 55%, #5e1009 100%);
    color: #fff3e3;
    font-family: 'Bricolage Grotesque', system-ui, sans-serif;
  }
  .logo {
    width: 300px; height: 300px; flex-shrink: 0;
    border-radius: 28px; background: #fff; padding: 16px;
    box-shadow: 0 24px 60px rgba(0,0,0,.35);
    object-fit: contain;
  }
  .copy { display: flex; flex-direction: column; gap: 18px; min-width: 0; }
  .bengali { font-family: 'Tiro Bangla', serif; font-size: 40px; color: #f7b733; line-height: 1.2; }
  .name { font-size: 108px; font-weight: 800; letter-spacing: -0.02em; line-height: 1; }
  .tagline { font-family: 'Hind Siliguri', system-ui, sans-serif; font-size: 32px; line-height: 1.35; color: rgba(255,243,227,.82); }
  .rule { width: 120px; height: 6px; border-radius: 99px; background: #f7b733; }
</style>
</head>
<body>
  <img class="logo" src="${logoUrl}" alt="" />
  <div class="copy">
    <p class="bengali">${BENGALI}</p>
    <p class="name">${NAME}</p>
    <div class="rule"></div>
    <p class="tagline">${TAGLINE}</p>
  </div>
</body>
</html>`

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 })
await page.setContent(html, { waitUntil: 'networkidle0' })
await page.evaluate(() => document.fonts.ready)

const out = join(root, 'public/brand/share-card.jpg')
// JPEG at 88: WhatsApp will not fetch a large image, and this stays well inside its limit.
await writeFile(out, await page.screenshot({ type: 'jpeg', quality: 88 }))
await browser.close()

const { size } = await import('node:fs/promises').then((fs) => fs.stat(out))
console.log(`share-card.jpg — ${WIDTH}x${HEIGHT}, ${Math.round(size / 1024)} KB`)
