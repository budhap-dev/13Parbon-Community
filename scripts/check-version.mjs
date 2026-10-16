/*
 * Refuses a pull request that does not move the version forward.
 *
 * The version sat at 0.1.0 from the first commit through forty merged pull requests, because
 * nothing asked for it to change. The footers show it, so a version that never moves says the
 * site never changes. CI runs this on every pull request into main:
 *
 *   node scripts/check-version.mjs <version on main>
 *
 * Which part to bump is the author's call: `npm version minor --no-git-tag-version` for a
 * feature, `patch` for a fix or anything smaller, `major` for a change people will notice.
 * That command moves package.json and package-lock.json together; this checks both.
 */
import { readFileSync } from 'node:fs'

const [, , onMain] = process.argv
const here = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version
const locked = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8')).version

const parts = (version) => version.split('.').map((part) => Number.parseInt(part, 10))

function isAfter(next, previous) {
  const [a, b] = [parts(next), parts(previous)]
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i]
  }
  return false
}

if (!onMain) {
  console.error('Usage: node scripts/check-version.mjs <version on main>')
  process.exit(2)
}

if (locked !== here) {
  console.error(`package.json says ${here} but package-lock.json says ${locked}. Bump with npm version so both move.`)
  process.exit(1)
}

if (!isAfter(here, onMain)) {
  console.error(
    `The version is ${here}, and main is already at ${onMain}. Bump it on this branch:\n` +
      '  npm version minor --no-git-tag-version   (a feature)\n' +
      '  npm version patch --no-git-tag-version   (a fix, or anything smaller)',
  )
  process.exit(1)
}

console.log(`Version ${onMain} → ${here}.`)
