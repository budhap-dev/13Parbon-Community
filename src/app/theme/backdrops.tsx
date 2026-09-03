import type { ThemeName } from './themes'

type Props = { className?: string }

/** Alpona: concentric rings and petals. Festival. */
function Alpona({ className }: Props) {
  return (
    <svg viewBox="0 0 400 400" className={className} data-backdrop="alpona" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth={2}>
        <circle cx="200" cy="200" r="60" />
        <circle cx="200" cy="200" r="110" />
        <circle cx="200" cy="200" r="170" />
        <path d="M200 30 C230 90 230 130 200 140 C170 130 170 90 200 30 Z" />
        <path d="M370 200 C310 230 270 230 260 200 C270 170 310 170 370 200 Z" />
        <path d="M200 370 C170 310 170 270 200 260 C230 270 230 310 200 370 Z" />
        <path d="M30 200 C90 170 130 170 140 200 C130 230 90 230 30 200 Z" />
        <path d="M320 80 C290 140 250 160 240 160 C240 130 260 100 320 80 Z" />
        <path d="M320 320 C260 300 240 260 240 240 C270 250 300 270 320 320 Z" />
        <path d="M80 320 C110 260 150 240 160 240 C160 270 140 300 80 320 Z" />
        <path d="M80 80 C140 100 160 140 160 160 C130 150 100 130 80 80 Z" />
        <circle cx="200" cy="200" r="8" fill="currentColor" stroke="none" />
      </g>
    </svg>
  )
}

/** A pair of fish, waves and a new-year sun. Poila Boishakh. */
function Fish({ className }: Props) {
  return (
    <svg viewBox="0 0 400 400" className={className} data-backdrop="fish" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="320" cy="80" r="34" />
        <path d="M320 20v14M320 126v14M260 80h14M366 80h14M278 38l10 10M352 122l10 10M362 38l-10 10M288 122l-10 10" />
        <path d="M40 190 C100 110 240 110 300 190 C240 270 100 270 40 190 Z" />
        <path d="M300 190 L350 150 L340 190 L350 230 Z" />
        <circle cx="90" cy="180" r="6" fill="currentColor" stroke="none" />
        <path d="M130 150 q20 40 0 80M170 138 q24 52 0 104M210 138 q24 52 0 104M250 150 q20 40 0 80" />
        <path d="M120 300 C160 250 250 250 290 300 C250 350 160 350 120 300 Z" />
        <path d="M290 300 L326 272 L318 300 L326 328 Z" />
        <circle cx="152" cy="294" r="4" fill="currentColor" stroke="none" />
        <path d="M20 372 q25 -18 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0" />
      </g>
    </svg>
  )
}

/** Veena, lotus and swan: Saraswati's iconography as line art. */
function Veena({ className }: Props) {
  return (
    <svg viewBox="0 0 400 400" className={className} data-backdrop="veena" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M88 312 L312 88" />
        <path d="M96 320 L320 96" strokeWidth={1} />
        <path d="M80 304 L304 80" strokeWidth={1} />
        <circle cx="86" cy="314" r="44" />
        <circle cx="314" cy="86" r="36" />
        <path d="M330 60 l22 -22 M340 74 l24 -10" />
        <path d="M130 270 l10 10M150 250 l10 10M170 230 l10 10M190 210 l10 10M210 190 l10 10M230 170 l10 10M250 150 l10 10M270 130 l10 10" />
        <path d="M200 388 C170 388 150 370 150 350 C170 356 190 360 200 372 C210 360 230 356 250 350 C250 370 230 388 200 388 Z" />
        <path d="M200 372 C180 350 176 330 200 310 C224 330 220 350 200 372 Z" />
        <path d="M172 356 C150 340 146 320 160 300 C178 314 182 336 172 356 Z" />
        <path d="M228 356 C250 340 254 320 240 300 C222 314 218 336 228 356 Z" />
        <path d="M290 330 c-6 -50 30 -66 44 -34 c8 20 -6 34 -22 34 c-10 0 -14 -8 -10 -14" />
        <path d="M290 330 h-70 c-24 0 -34 -14 -30 -30" />
        <path d="M334 296 l16 -4" />
      </g>
    </svg>
  )
}

/** Splashes of colour. Holi. Uses its own colours on purpose. */
function Splash({ className }: Props) {
  return (
    <svg viewBox="0 0 400 400" className={className} data-backdrop="splash" aria-hidden="true" focusable="false">
      <g opacity="0.85">
        <path fill="#ffd60a" d="M118 96 c40 -50 110 -30 120 20 c8 40 -30 60 -60 70 c-40 12 -90 -4 -96 -40 c-4 -22 14 -36 36 -50 Z" />
        <path fill="#e0369a" d="M228 190 c50 -40 120 -10 120 50 c0 44 -40 70 -84 68 c-46 -2 -80 -34 -70 -74 c6 -22 18 -34 34 -44 Z" />
        <path fill="#2bb3a0" d="M70 230 c10 -50 80 -60 110 -20 c24 32 8 80 -30 96 c-40 16 -84 -6 -86 -44 c0 -12 2 -22 6 -32 Z" />
        <path fill="#4f7bd9" d="M250 60 c30 -30 80 -14 84 24 c4 34 -24 58 -56 56 c-32 -2 -58 -26 -50 -54 c4 -12 12 -20 22 -26 Z" />
        <path fill="#f28c28" d="M150 300 c36 -20 84 0 90 40 c6 40 -34 66 -74 56 c-40 -10 -60 -44 -46 -74 c6 -12 18 -18 30 -22 Z" />
        <circle fill="#ffd60a" cx="330" cy="330" r="16" />
        <circle fill="#e0369a" cx="60" cy="120" r="10" />
        <circle fill="#2bb3a0" cx="300" cy="150" r="8" />
        <circle fill="#4f7bd9" cx="120" cy="360" r="12" />
        <circle fill="#f28c28" cx="360" cy="230" r="9" />
      </g>
    </svg>
  )
}

/** Kash grass, a dawn sun and shiuli flowers. Mahalaya. */
function Kash({ className }: Props) {
  const stems = [
    { d: 'M60 400 C70 300 100 220 150 160', head: [150, 160] as const },
    { d: 'M130 400 C140 320 170 250 220 200', head: [220, 200] as const },
    { d: 'M200 400 C210 330 240 270 290 230', head: [290, 230] as const },
    { d: 'M20 400 C40 330 60 280 90 250', head: [90, 250] as const },
  ]
  const flowers = [
    [330, 300],
    [360, 350],
    [300, 360],
  ] as const
  return (
    <svg viewBox="0 0 400 400" className={className} data-backdrop="kash" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
        <circle cx="300" cy="110" r="60" />
        <path d="M200 110 h30M370 110 h30" strokeWidth={1.5} />
        {stems.map((stem) => (
          <g key={stem.d}>
            <path d={stem.d} />
            {[-40, -25, -10, 5, 20, 35].map((angle) => {
              const rad = ((angle - 60) * Math.PI) / 180
              const [x, y] = stem.head
              return <path key={angle} d={`M${x} ${y} l${Math.cos(rad) * 34} ${Math.sin(rad) * 34}`} strokeWidth={1.5} />
            })}
          </g>
        ))}
        {flowers.map(([x, y]) => (
          <g key={`${x}-${y}`}>
            {[0, 60, 120, 180, 240, 300].map((angle) => {
              const rad = (angle * Math.PI) / 180
              return <ellipse key={angle} cx={x + Math.cos(rad) * 9} cy={y + Math.sin(rad) * 9} rx="4" ry="7" transform={`rotate(${angle} ${x + Math.cos(rad) * 9} ${y + Math.sin(rad) * 9})`} />
            })}
            <circle cx={x} cy={y} r="3" fill="currentColor" stroke="none" />
          </g>
        ))}
      </g>
    </svg>
  )
}

const backdrops: Record<ThemeName, (props: Props) => React.JSX.Element> = {
  festival: Alpona,
  'poila-boishakh': Fish,
  saraswati: Veena,
  holi: Splash,
  mahalaya: Kash,
}

/** The decorative motif behind the hero for the active theme. */
export function Backdrop({ theme, className }: Props & { theme: ThemeName }) {
  const Motif = backdrops[theme]
  return <Motif className={className} />
}
