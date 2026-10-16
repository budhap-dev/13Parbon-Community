import { SETTING_LABELS, SITE_TEXT_FIELDS } from '@/domain/settings'
import { formatStamp } from '@/domain/dates'
import { SITE_SECTIONS } from './siteSections'

/** One line of "what moved", in words: what it is, what it was, and what it became. */
export type ChangeLine = { label: string; was: string; now: string }

/**
 * The names a person would give the fields that turn up in the trail.
 *
 * The rest are worked out from the field's own name — `handledBy` is "Handled by" — which is
 * near enough for a column nobody thought to name here.
 */
const NAMES: Record<string, string> = {
  ...Object.fromEntries(Object.entries(SETTING_LABELS).map(([key, { label }]) => [key, label])),
  ...Object.fromEntries(Object.entries(SITE_TEXT_FIELDS).map(([key, { label }]) => [key, label])),
  faq: SITE_SECTIONS.faq,
  committee: SITE_SECTIONS.committee,
  committeeRoles: 'The committee’s roles',
  members: SITE_SECTIONS.roll,
  festivals: SITE_SECTIONS.festivals,
  story: SITE_SECTIONS.story,
  values: SITE_SECTIONS.values,
  social: SITE_SECTIONS.social,
  collage: SITE_SECTIONS.collage,
  privacy: SITE_SECTIONS.privacy,
  tools: SITE_SECTIONS.tools,
  heroCard: SITE_SECTIONS.heroCard,
  home: 'Who sees each part of the home page',
  homeOrder: 'The order of the home page',
  text: SITE_SECTIONS.words,
  defaultTheme: 'The colours a visitor arrives to',
  volunteerFormUrl: 'The volunteer form',
  google_email: 'Google account',
  googleEmail: 'Google account',
  paid_to: 'Paid up to',
  member_since: 'Member since',
  updated_at: 'Last changed',
  created_at: 'Added',
}

/** "handledBy" and "handled_by" both read "Handled by". */
export function fieldName(key: string): string {
  if (NAMES[key]) return NAMES[key]
  const words = key
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim()
    .toLowerCase()
  return words ? words[0].toUpperCase() + words.slice(1) : key
}

const ISO_MOMENT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/

/**
 * A value as it went into the database, back out as what it is.
 *
 * The wrapper writes an object into the trail as a string of JSON, so a settings change arrives
 * as a paragraph of braces. Read back as an object, it can be compared field by field.
 */
function unpack(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const text = value.trim()
  if (!(text.startsWith('{') || text.startsWith('['))) return value
  try {
    return JSON.parse(text)
  } catch {
    return value
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** What a single value looks like in a sentence. Absent reads as absent, not as "undefined". */
export function show(value: unknown): string {
  const v = unpack(value)
  if (v === null || v === undefined || v === '') return 'nothing'
  if (typeof v === 'boolean') return v ? 'yes' : 'no'
  if (typeof v === 'string' && ISO_MOMENT.test(v) && !Number.isNaN(Date.parse(v))) return formatStamp(v)
  if (Array.isArray(v)) return v.length === 0 ? 'none' : count(v.length, 'item', 'items')
  if (isRecord(v)) {
    const keys = Object.keys(v)
    return keys.length === 0 ? 'nothing' : count(keys.length, 'setting', 'settings')
  }
  return String(v)
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/**
 * What changed in one field, as lines a person can read.
 *
 * A plain value is one line: "Handled by: nothing → The Chatterjees". A field holding a whole
 * object — the site's settings are one jsonb value, the FAQ and the committee and every word on
 * the pages inside it — is opened up, and only the parts that differ are listed, each under its
 * own name. A list that changed says how long it was and is: the full before and after are on
 * the row's title for anybody who wants them.
 */
export function changeLines(field: string, from: unknown, to: unknown, depth = 0): ChangeLine[] {
  const was = unpack(from)
  const now = unpack(to)
  if (isRecord(was) && isRecord(now) && depth < 2) {
    const lines: ChangeLine[] = []
    for (const key of new Set([...Object.keys(was), ...Object.keys(now)])) {
      if (same(was[key], now[key])) continue
      for (const line of changeLines(key, was[key], now[key], depth + 1)) {
        // The site's settings live in a column called `value`: its name says nothing, so its
        // parts stand on their own.
        lines.push(field === 'value' && depth === 0 ? line : { ...line, label: `${fieldName(field)} › ${line.label}` })
      }
    }
    return lines.length > 0 ? lines : [{ label: fieldName(field), was: 'unchanged', now: 'unchanged' }]
  }
  if (Array.isArray(was) && Array.isArray(now)) {
    const before = show(was)
    const after = show(now)
    return [{ label: fieldName(field), was: before, now: before === after ? `${after}, edited` : after }]
  }
  return [{ label: fieldName(field), was: show(was), now: show(now) }]
}
