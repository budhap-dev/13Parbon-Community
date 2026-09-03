import type { ThemeName } from './themes'
import motion from './backdrops.module.css'

type Props = { className?: string }

const lines = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

/** Alpona: concentric rings and petals that roll a little way and back. Festival. */
function Alpona({ className }: Props) {
  return (
    <svg viewBox="0 0 400 400" className={className} data-backdrop="alpona" aria-hidden="true" focusable="false">
      <g className={`${motion.wheelTrack} ${motion.faint}`} data-animate="wheel">
        <g className={motion.wheel} {...lines}>
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
      </g>
    </svg>
  )
}

/** A pair of fish that swim across and back, waves and a new-year sun. Poila Boishakh. */
function Fish({ className }: Props) {
  return (
    <svg viewBox="0 0 400 400" className={className} data-backdrop="fish" aria-hidden="true" focusable="false">
      <g {...lines} className={motion.faint}>
        <circle cx="320" cy="80" r="34" />
        <path d="M320 20v14M320 126v14M260 80h14M366 80h14M278 38l10 10M352 122l10 10M362 38l-10 10M288 122l-10 10" />
        <g className={motion.fishA} data-animate="fish">
          <path d="M40 190 C100 110 240 110 300 190 C240 270 100 270 40 190 Z" />
          <path className={motion.tail} d="M300 190 L350 150 L340 190 L350 230 Z" />
          <circle cx="90" cy="180" r="6" fill="currentColor" stroke="none" />
          <path d="M130 150 q20 40 0 80M170 138 q24 52 0 104M210 138 q24 52 0 104M250 150 q20 40 0 80" />
        </g>
        <g className={motion.fishB} data-animate="fish">
          <path d="M120 300 C160 250 250 250 290 300 C250 350 160 350 120 300 Z" />
          <path className={motion.tail} d="M290 300 L326 272 L318 300 L326 328 Z" />
          <circle cx="152" cy="294" r="4" fill="currentColor" stroke="none" />
        </g>
        <path d="M20 372 q25 -18 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0" />
      </g>
    </svg>
  )
}

/** Veena, lotus and swan, with music rising from the strings. Saraswati Puja. */
function Veena({ className }: Props) {
  // An eighth note and a beamed pair, drawn with the stem base at the origin.
  const eighth = 'M0 0 v-34 c10 2 18 8 20 18 c-5 -7 -12 -10 -20 -10 v26 a7 5.5 0 1 1 -3 -4.5 Z'
  const beamed = 'M0 0 v-30 l22 -6 v30 a6 5 0 1 1 -3 -4 v-18 l-16 4 v24 a6 5 0 1 1 -3 -4 Z'
  const notes = [
    { d: eighth, x: 196, y: 204, scale: 1.1 },
    { d: beamed, x: 228, y: 176, scale: 0.9 },
    { d: eighth, x: 176, y: 224, scale: 0.8 },
    { d: beamed, x: 252, y: 150, scale: 1.05 },
    { d: eighth, x: 214, y: 190, scale: 1.25 },
    { d: beamed, x: 160, y: 240, scale: 0.75 },
  ]
  return (
    <svg viewBox="0 0 400 400" className={className} data-backdrop="veena" aria-hidden="true" focusable="false">
      <g {...lines} className={motion.faint}>
        <g data-animate="strings">
          <path className={motion.string} d="M88 312 L312 88" />
          <path className={motion.string} d="M96 320 L320 96" strokeWidth={1} />
          <path className={motion.string} d="M80 304 L304 80" strokeWidth={1} />
        </g>
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
      <g className={motion.notes} data-animate="notes">
        {notes.map((n, i) => (
          <g key={i} transform={`translate(${n.x} ${n.y})`}>
            <path className={motion.note} d={n.d} transform={`scale(${n.scale})`} />
          </g>
        ))}
      </g>
    </svg>
  )
}

/** Splashes of colour poured in from above. Holi. Uses its own colours on purpose. */
function Splash({ className }: Props) {
  return (
    <svg viewBox="0 0 400 400" className={className} data-backdrop="splash" aria-hidden="true" focusable="false">
      <g className={motion.faint} data-animate="splashes">
        <path className={motion.splash} fill="#ffd60a" d="M118 96 c40 -50 110 -30 120 20 c8 40 -30 60 -60 70 c-40 12 -90 -4 -96 -40 c-4 -22 14 -36 36 -50 Z" />
        <path className={motion.splash} fill="#e0369a" d="M228 190 c50 -40 120 -10 120 50 c0 44 -40 70 -84 68 c-46 -2 -80 -34 -70 -74 c6 -22 18 -34 34 -44 Z" />
        <path className={motion.splash} fill="#2bb3a0" d="M70 230 c10 -50 80 -60 110 -20 c24 32 8 80 -30 96 c-40 16 -84 -6 -86 -44 c0 -12 2 -22 6 -32 Z" />
        <path className={motion.splash} fill="#4f7bd9" d="M250 60 c30 -30 80 -14 84 24 c4 34 -24 58 -56 56 c-32 -2 -58 -26 -50 -54 c4 -12 12 -20 22 -26 Z" />
        <path className={motion.splash} fill="#f28c28" d="M150 300 c36 -20 84 0 90 40 c6 40 -34 66 -74 56 c-40 -10 -60 -44 -46 -74 c6 -12 18 -18 30 -22 Z" />
      </g>
      <g className={motion.faint} data-animate="drips">
        <circle className={motion.drip} fill="#ffd60a" cx="150" cy="190" r="7" />
        <circle className={motion.drip} fill="#e0369a" cx="300" cy="312" r="8" />
        <circle className={motion.drip} fill="#2bb3a0" cx="110" cy="312" r="6" />
        <circle className={motion.drip} fill="#4f7bd9" cx="290" cy="146" r="6" />
        <circle className={motion.drip} fill="#f28c28" cx="190" cy="400" r="7" />
      </g>
    </svg>
  )
}

type Point = readonly [number, number]

/** A kash (kans grass) stem: a curved stalk with a feathery plume along its upper third. */
function kashStem(base: Point, tip: Point, bend: number, index: number): { key: string; stalk: string; plume: string[] } {
  const [x0, y0] = base
  const [x2, y2] = tip
  const cx = (x0 + x2) / 2 + bend
  const cy = (y0 + y2) / 2 + 20
  const at = (t: number): Point => [
    (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t ** 2 * x2,
    (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t ** 2 * y2,
  ]
  const plume: string[] = []
  for (let i = 0; i < 9; i += 1) {
    const t = 0.62 + i * 0.045
    const [px, py] = at(t)
    const [nx, ny] = at(Math.min(1, t + 0.02))
    const angle = Math.atan2(ny - py, nx - px)
    const length = 15 - i * 1.2
    for (const side of [-1, 1]) {
      const a = angle + side * 0.95
      plume.push(`M${px.toFixed(1)} ${py.toFixed(1)} l${(Math.cos(a) * length).toFixed(1)} ${(Math.sin(a) * length).toFixed(1)}`)
    }
  }
  return { key: `stem-${index}`, stalk: `M${x0} ${y0} Q${cx} ${cy} ${x2} ${y2}`, plume }
}

/** Kash grass swaying while an old steam train puffs past below, under a dawn sun. Mahalaya. */
function Kash({ className }: Props) {
  const stems = [
    kashStem([12, 372], [40, 210], -30, 0),
    kashStem([52, 372], [70, 150], -20, 1),
    kashStem([96, 372], [126, 190], -26, 2),
    kashStem([140, 372], [150, 130], -14, 3),
    kashStem([186, 372], [222, 200], -30, 4),
    kashStem([236, 372], [250, 160], -18, 5),
    kashStem([282, 372], [318, 220], -28, 6),
    kashStem([330, 372], [352, 180], -20, 7),
  ]
  return (
    <svg viewBox="0 0 400 400" className={className} data-backdrop="kash" aria-hidden="true" focusable="false">
      <g {...lines} className={motion.faint}>
        <circle cx="300" cy="90" r="52" />
        <path d="M212 90 h26M362 90 h26" strokeWidth={1.5} />
        <g data-animate="stems">
          {stems.map((stem, i) => (
            <g key={stem.key} className={motion.stem} style={{ animationDelay: `${-i * 0.7}s` }}>
              <path d={stem.stalk} />
              {stem.plume.map((d) => (
                <path key={d} d={d} strokeWidth={1.4} />
              ))}
            </g>
          ))}
        </g>
        <path d="M0 384 H400" strokeWidth={1.5} />
        <g className={motion.train} data-animate="train">
          <g data-animate="smoke">
            {[0, 1, 2, 3, 4].map((i) => (
              <circle
                key={i}
                className={motion.smoke}
                cx="20"
                cy="326"
                r="7"
                fill="currentColor"
                stroke="none"
                style={{ animationDelay: `${i * 0.55}s` }}
              />
            ))}
          </g>
          {/* Engine, facing left: cowcatcher, chimney, boiler with dome, cab, driving wheels. */}
          <path d="M8 378 l-8 0 l8 -12 Z" />
          <path d="M14 334 v-8 h-4 v-4 h16 v4 h-4 v8" />
          <rect x="8" y="346" width="60" height="22" rx="8" />
          <path d="M36 346 a8 6 0 0 1 16 0" />
          <path d="M68 340 h26 v38 h-26 Z" />
          <rect x="74" y="346" width="12" height="10" />
          <path d="M60 368 h34" />
          <circle cx="26" cy="375" r="7" />
          <circle cx="48" cy="375" r="7" />
          <circle cx="82" cy="376" r="4.5" />
          <path d="M26 375 h22" strokeWidth={1.5} />
          {/* Three carriages */}
          <rect x="102" y="348" width="54" height="26" rx="3" />
          <rect x="162" y="348" width="54" height="26" rx="3" />
          <rect x="222" y="348" width="54" height="26" rx="3" />
          <path d="M110 355 h10 M128 355 h10 M146 355 h4 M170 355 h10 M188 355 h10 M206 355 h4 M230 355 h10 M248 355 h10 M266 355 h4" strokeWidth={1.5} />
          <circle cx="114" cy="377" r="3.5" /><circle cx="144" cy="377" r="3.5" />
          <circle cx="174" cy="377" r="3.5" /><circle cx="204" cy="377" r="3.5" />
          <circle cx="234" cy="377" r="3.5" /><circle cx="264" cy="377" r="3.5" />
        </g>
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

/** The decorative, gently animated motif behind the hero for the active theme. */
export function Backdrop({ theme, className }: Props & { theme: ThemeName }) {
  const Motif = backdrops[theme]
  return <Motif className={className} />
}
