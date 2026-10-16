/**
 * The colours the portal hands out to cards that need telling apart: the people in a household,
 * the sections of a form, the committee. Each is deep enough to carry white writing in every
 * theme, which is how they are used on chips and icon discs.
 */
export const TONES = ['#2563eb', '#15803d', '#7c3aed', '#c2410c', '#0f766e', '#be185d'] as const

/** The colour for the card at this place, going round the list again after the last. */
export const toneAt = (i: number): string => TONES[i % TONES.length]

/** The style that gives a card its colour and its place in an arriving row (see `.rise`). */
export const toneStyle = (i: number, tone = toneAt(i)) => ({ '--tone': tone, '--i': i }) as React.CSSProperties
