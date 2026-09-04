import styles from './Home.module.css'

const lines = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

/**
 * A small drawn mark for each occasion, in the site's own hand rather than a photograph.
 * Decorative: the card already names the occasion in text.
 */
export function FestivalGlyph({ id }: { id: string }) {
  const shape = glyphs[id] ?? glyphs.default
  return (
    <svg viewBox="0 0 64 64" className={styles.glyph} aria-hidden="true" focusable="false">
      {shape}
    </svg>
  )
}

const glyphs: Record<string, React.JSX.Element> = {
  // New year: a boat on the water, as on the community's own emblem.
  'poila-boishakh': (
    <g {...lines}>
      <path d="M10 40h44l-6 10H16z" />
      <path d="M32 40V14" />
      <path d="M32 16c8 2 13 6 15 11H32z" />
      <path d="M6 56q7-4 13 0t13 0t13 0t13 0" />
    </g>
  ),
  // Mahalaya: kash grass at dawn.
  mahalaya: (
    <g {...lines}>
      <circle cx="46" cy="18" r="9" />
      <path d="M14 56c2-14 7-24 15-32" />
      <path d="M24 56c1-10 4-18 9-24" />
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M29 24l-7 ${-3 + i * 4}`} />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <path key={`b${i}`} d={`M29 24l7 ${-3 + i * 4}`} />
      ))}
      <path d="M4 56h56" />
    </g>
  ),
  // Saraswati Puja: a veena and a note.
  'saraswati-puja': (
    <g {...lines}>
      <circle cx="18" cy="46" r="10" />
      <circle cx="48" cy="20" r="7" />
      <path d="M24 40 43 21" />
      <path d="M27 44 46 25" />
      <path d="M52 46v-9l6-2v9" />
      <circle cx="50" cy="46" r="2.5" />
      <circle cx="56" cy="44" r="2.5" />
    </g>
  ),
  // Holi: colour thrown into the air.
  holi: (
    <g {...lines}>
      <path d="M20 44c-6-8-2-18 8-20s18 4 18 13-8 14-16 12" />
      <circle cx="14" cy="22" r="3" />
      <circle cx="50" cy="46" r="3" />
      <circle cx="46" cy="12" r="2.5" />
      <circle cx="22" cy="54" r="2.5" />
      <circle cx="56" cy="28" r="2" />
      <circle cx="8" cy="40" r="2" />
    </g>
  ),
  default: (
    <g {...lines}>
      <circle cx="32" cy="32" r="18" />
      <circle cx="32" cy="32" r="7" />
    </g>
  ),
}
