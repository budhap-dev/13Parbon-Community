#!/usr/bin/env node
/*
 * Contrast check for every theme in src/app/theme/tokens.css.
 *
 * Reads each theme's colour tokens, lays the translucent ones over the ground they sit on, and
 * prints only the pairs that fall short: text under 4.5:1, control edges under 3:1. Prints
 * nothing else and exits 1 when something fails, so it can sit in a script or CI step.
 *
 *   node scripts/contrast-check.mjs
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const TEXT = 4.5
const EDGE = 3

const css = readFileSync(fileURLToPath(new URL('../src/app/theme/tokens.css', import.meta.url)), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
)

// Every block's custom properties, in file order, as the cascade applies them: a theme's value
// is whatever the last block naming it — or naming every theme, as `:root` and a bare
// `[data-theme]` do — set.
const blocks = []
const names = new Set()
for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  const props = Object.fromEntries([...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]))
  const named = [...selector.matchAll(/\[data-theme='([\w-]+)'\]/g)].map((m) => m[1])
  named.forEach((n) => names.add(n))
  blocks.push({ props, named, all: /:root|\[data-theme\](?!=)/.test(selector) })
}
const shared = {}
const themes = {}
for (const name of names) {
  themes[name] = {}
  for (const block of blocks) if (block.all || block.named.includes(name)) Object.assign(themes[name], block.props)
}

const parse = (value) => {
  let m = value.match(/^#([0-9a-f]{3,8})$/i)
  if (m) {
    let h = m[1]
    if (h.length <= 4) h = [...h].map((c) => c + c).join('')
    const n = (i) => parseInt(h.slice(i, i + 2), 16)
    return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) / 255 : 1 }
  }
  m = value.match(/^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/)
  if (m) {
    const a = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4])
    return { r: +m[1], g: +m[2], b: +m[3], a }
  }
  if (value === 'white' || value === '#fff') return { r: 255, g: 255, b: 255, a: 1 }
  if (value === 'transparent') return { r: 0, g: 0, b: 0, a: 0 }
  return null
}

const over = (top, bottom) => ({
  r: top.r * top.a + bottom.r * (1 - top.a),
  g: top.g * top.a + bottom.g * (1 - top.a),
  b: top.b * top.a + bottom.b * (1 - top.a),
  a: 1,
})

const luminance = ({ r, g, b }) => {
  const c = (v) => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b)
}

const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** Every colour a token resolves to: one for a plain colour, each stop for a gradient. */
function colours(theme, name, seen = new Set()) {
  if (seen.has(name)) return []
  seen.add(name)
  const raw = theme[name] ?? shared[name]
  if (!raw) return []
  const resolved = raw.replace(/var\((--[\w-]+)(?:,\s*([^()]+|[^()]*\([^()]*\)))?\)/g, (_, v, fallback) => {
    const [first] = colours(theme, v, seen)
    return first ? `rgba(${first.r}, ${first.g}, ${first.b}, ${first.a})` : (fallback ?? '').trim()
  })
  const mix = resolved.match(/^color-mix\(in srgb,\s*(.+?)\s+([\d.]+)%,\s*transparent\)$/)
  if (mix) {
    const c = parse(mix[1])
    return c ? [{ ...c, a: c.a * (parseFloat(mix[2]) / 100) }] : []
  }
  const single = parse(resolved)
  if (single) return [single]
  return [...resolved.matchAll(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)/gi)].map((m) => parse(m[0])).filter(Boolean)
}

// [foreground, background, minimum]. Translucent foregrounds are laid over the background.
const PAIRS = [
  ['--color-fg', '--color-bg', TEXT],
  ['--color-fg', '--color-bg-raised', TEXT],
  ['--color-fg-muted', '--color-bg', TEXT],
  ['--color-fg-muted', '--color-bg-raised', TEXT],
  ['--error', '--color-bg', TEXT],
  ['--error', '--color-bg-raised', TEXT],
  ['--color-on-accent', '--color-accent', TEXT],
  ['--color-on-ink', '--color-ink', TEXT],
  ['--portal-side-fg', '--portal-side-bg', TEXT],
  ['--portal-side-muted', '--portal-side-bg', TEXT],
  ['--color-border-strong', '--color-bg', EDGE],
  ['--color-border-strong', '--color-bg-raised', EDGE],
  ['--color-accent', '--color-bg', EDGE],
  ['--color-focus', '--color-bg', EDGE],
  ['--gold', '--color-bg', EDGE],
]

const failures = []
for (const [name, raw] of Object.entries(themes)) {
  const theme = { ...raw }
  for (const [fg, bg, min] of PAIRS) {
    // A pair a theme does not define (the sidebar on a public theme) is not a failure.
    if (fg.startsWith('--portal-') && !(fg in theme)) continue
    const backs = colours(theme, bg)
    const fores = colours(theme, fg)
    if (!backs.length || !fores.length) continue
    let worst = Infinity
    for (const back of backs) {
      const ground = back.a < 1 ? over(back, { r: 255, g: 255, b: 255, a: 1 }) : back
      for (const fore of fores) worst = Math.min(worst, ratio(fore.a < 1 ? over(fore, ground) : fore, ground))
    }
    if (worst < min) failures.push(`${name.padEnd(15)} ${fg} on ${bg}: ${worst.toFixed(2)} (needs ${min})`)
  }
}

if (failures.length) {
  console.log(failures.join('\n'))
  process.exit(1)
}
