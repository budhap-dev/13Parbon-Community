import { axe } from 'vitest-axe'
import { expect } from 'vitest'

/**
 * Checks a rendered page against the automated half of WCAG.
 *
 * The half, and worth saying so: axe finds missing labels, unlabelled controls, contrast it can
 * compute, bad heading order and broken landmarks. It cannot tell whether a label makes sense,
 * whether focus goes somewhere useful, or whether a photograph's alt text describes the
 * photograph. A clean run is a floor, not a pass.
 *
 * `colour-contrast` is off because jsdom does not paint: every colour resolves to a default and
 * the rule either passes meaninglessly or fails on nothing. Contrast is checked in the browser,
 * which is where it can be.
 */
export async function expectNoAxeViolations(container: HTMLElement): Promise<void> {
  const results = await axe(container, { rules: { 'color-contrast': { enabled: false } } })
  const violations = results.violations ?? []

  if (violations.length > 0) {
    const detail = violations
      .map((v) => `${v.id}: ${v.help}\n    ${v.nodes.map((n) => n.html).slice(0, 3).join('\n    ')}`)
      .join('\n  ')
    expect.fail(`${violations.length} accessibility violation(s):\n  ${detail}`)
  }
}
