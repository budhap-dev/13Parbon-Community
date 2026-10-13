import { useId, useLayoutEffect, useRef } from 'react'
import type { PublicThemeName, ThemeName } from './themes'
import motion from './backdrops.module.css'

type Props = {
  className?: string
  /** In the hero: the Festival alpona rolls along its floor. Elsewhere (the phone menu) it stays put. */
  roll?: boolean
}

const lines = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

/*
 * The Festival alpona, in the manner of the ones drawn at the door for Lakshmi Puja: a lotus at
 * the heart, a ring of dots, double petals, a band of leaves, paisleys with their curl, a
 * scalloped edge, a ring of dots and an outermost ring of petals. The view is widened to hold
 * the petals, so the rest keeps its own coordinates. Every piece is drawn pointing up from the
 * centre and turned into place, so one path serves each ring.
 */
const AC = 200
const turn = (deg: number) => `rotate(${deg.toFixed(2)} ${AC} ${AC})`
const each = (n: number, offset = 0) => Array.from({ length: n }, (_, i) => (i * 360) / n + offset)
/** A petal pointing straight up, from radius `r1` out to `r2`, half `w` wide. */
const upPetal = (r1: number, r2: number, w: number) =>
  `M${AC} ${AC - r1} C${AC - w} ${AC - r1 - (r2 - r1) * 0.35} ${AC - w} ${AC - r2 + (r2 - r1) * 0.3} ${AC} ${AC - r2} C${AC + w} ${AC - r2 + (r2 - r1) * 0.3} ${AC + w} ${AC - r1 - (r2 - r1) * 0.35} ${AC} ${AC - r1} Z`
/** A paisley — the kolka — leaning off the vertical, with its tip curled in. */
const PAISLEY = `M${AC} ${AC - 150} C${AC - 15} ${AC - 158} ${AC - 13} ${AC - 178} ${AC + 2} ${AC - 180} C${AC + 14} ${AC - 181} ${AC + 15} ${AC - 168} ${AC + 6} ${AC - 166} C${AC} ${AC - 165} ${AC - 1} ${AC - 172} ${AC + 4} ${AC - 172}`
/** One scallop of the edge, a little arch standing on the r=180 circle. */
const SCALLOP = `M${AC - 15.7} ${AC - 179.3} A15.7 15.7 0 0 1 ${AC + 15.7} ${AC - 179.3}`

/**
 * Alpona: in the hero, a wheel rolling along the floor — 60% of the way across and back, turning
 * exactly as far as it travels, so it rolls rather than slides. Drawn from the centre out at the
 * start of each run and rubbed out near its end, then drawn again for the way back. Festival.
 */
function Alpona({ className, roll }: Props) {
  const box = useRef<SVGSVGElement>(null)
  // Each line's length for the dash that draws it; see WhoAlpona for why not pathLength.
  useLayoutEffect(() => {
    box.current?.querySelectorAll<SVGGeometryElement>(`.${motion.build}`).forEach((line) => {
      if (typeof line.getTotalLength === 'function') line.style.setProperty('--len', line.getTotalLength().toFixed(1))
    })
  }, [])
  /*
   * How far to roll and how far that turns it, from the width it rolls across: a wheel of
   * radius r turns one radian for every r it travels. Measured, and again on a resize, because
   * a phone and a desktop give the same wheel very different floors.
   */
  useLayoutEffect(() => {
    const svg = box.current
    const floor = svg?.parentElement
    if (!roll || !svg || !floor) return
    const measure = () => {
      const size = svg.getBoundingClientRect().width
      const distance = Math.max(0, Math.min(floor.clientWidth * 0.6, floor.clientWidth - size))
      svg.style.setProperty('--roll-distance', `${distance.toFixed(0)}px`)
      svg.style.setProperty('--roll-turn', `${((distance / (size / 2)) * (180 / Math.PI)).toFixed(0)}deg`)
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const watch = new ResizeObserver(measure)
    watch.observe(floor)
    return () => watch.disconnect()
  }, [roll])
  const step = (n: number) => ({ className: motion.build, style: { ['--step' as string]: n } })
  const dot = (n: number) => ({ className: motion.buildDot, style: { ['--step' as string]: n }, fill: 'currentColor', stroke: 'none' })
  return (
    <svg ref={box} viewBox="-40 -40 480 480" className={`${className ?? ''} ${roll ? motion.roll : ''}`} data-backdrop="alpona" aria-hidden="true" focusable="false">
      <g className={motion.faint} data-animate="wheel">
        <g {...lines}>
          {/* The lotus at the heart. */}
          <circle cx={AC} cy={AC} r={6} {...dot(0)} />
          <circle cx={AC} cy={AC} r={16} {...step(0)} />
          {each(8).map((d) => (
            <g key={`lotus-${d}`} transform={turn(d)}>
              <path d={upPetal(18, 54, 16)} {...step(0)} />
              <path d={upPetal(24, 46, 6)} {...step(0)} />
            </g>
          ))}
          {/* A ring of dots. */}
          <circle cx={AC} cy={AC} r={60} {...step(1)} />
          {each(16, 11.25).map((d) => (
            <circle key={`dot-${d}`} cx={AC} cy={AC - 67} r={2.6} transform={turn(d)} {...dot(1)} />
          ))}
          {/* Double petals. */}
          {each(12, 15).map((d) => (
            <g key={`petal-${d}`} transform={turn(d)}>
              <path d={upPetal(74, 122, 18)} {...step(2)} />
              <path d={upPetal(84, 112, 8)} {...step(2)} />
            </g>
          ))}
          {/* A band of leaves. */}
          <circle cx={AC} cy={AC} r={127} {...step(3)} />
          {each(24).map((d) => (
            <path key={`leaf-${d}`} d={upPetal(129, 146, 5)} transform={turn(d)} {...step(3)} />
          ))}
          {/* Paisleys, each with its curl. */}
          {each(12, 15).map((d) => (
            <path key={`kolka-${d}`} d={PAISLEY} transform={turn(d)} {...step(4)} />
          ))}
          {/* The scalloped edge. */}
          <circle cx={AC} cy={AC} r={180} {...step(5)} />
          {each(36).map((d) => (
            <path key={`scallop-${d}`} d={SCALLOP} transform={turn(d)} {...step(5)} />
          ))}
          {/* And a last ring of dots, one on each scallop. */}
          {each(36).map((d) => (
            <circle key={`edge-${d}`} cx={AC} cy={AC - 192} r={2.2} transform={turn(d)} {...dot(6)} />
          ))}
          {/* And the outermost ring: petals, as the alpona by "Who we are" ends. */}
          {each(24, 7.5).map((d) => (
            <path key={`outer-${d}`} d={upPetal(200, 236, 8)} transform={turn(d)} {...step(7)} />
          ))}
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

/**
 * Colour thrown. Holi, and the one motif that uses its own palette rather than the theme's:
 * the point of the day is colour that is not the colour you started as. Every one is picked to
 * carry against the magenta ground.
 *
 * Bursts, not blobs. The old motif faded five shapes in from above and left them sitting
 * there, which read as decoration that had always been on the page. A splash arrives: it
 * opens fast from a point, throws flecks outward, and is gone before the next one lands.
 */
const BURSTS = [
  { x: 108, y: 104, r: 104, fill: '#ffd60a', seed: 3 },
  { x: 296, y: 152, r: 118, fill: '#a8e63a', seed: 7 },
  { x: 76, y: 286, r: 96, fill: '#5fd0ff', seed: 5 },
  { x: 312, y: 316, r: 108, fill: '#f28c28', seed: 11 },
  { x: 196, y: 214, r: 88, fill: '#2bb3a0', seed: 2 },
  { x: 214, y: 62, r: 74, fill: '#7b2fd6', seed: 13 },
  { x: 40, y: 176, r: 82, fill: '#f28c28', seed: 17 },
  { x: 360, y: 232, r: 86, fill: '#ffd60a', seed: 19 },
] as const

/**
 * An uneven splatter rather than a circle: radii wobble around the ring, so each burst has
 * the lopsided edge that thrown colour makes. Deterministic, so the shapes never shift
 * between renders.
 */
function splatter(r: number, seed: number): string {
  const points = 11
  const at = (i: number) => {
    const wobble = ((Math.sin(seed * 12.9898 + i * 78.233) + 1) / 2) * 0.55 + 0.72
    const angle = (i / points) * Math.PI * 2
    const radius = r * wobble
    return [Math.cos(angle) * radius, Math.sin(angle) * radius] as const
  }
  return (
    at(0).reduce((d, n) => `${d}${n.toFixed(1)} `, 'M') +
    Array.from({ length: points }, (_, i) => {
      const [cx, cy] = at(i + 0.5)
      const [x, y] = at(i + 1)
      return `Q${(cx * 1.12).toFixed(1)} ${(cy * 1.12).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`
    }).join(' ') +
    'Z'
  )
}

function Splash({ className }: Props) {
  return (
    <svg
      viewBox="0 0 400 400"
      preserveAspectRatio="none"
      className={className}
      data-backdrop="splash"
      aria-hidden="true"
      focusable="false"
    >
      <g className={motion.vivid} data-animate="splashes">
        {BURSTS.map((burst, index) => (
          <g
            key={burst.fill + burst.x}
            className={motion.burst}
            style={{ ['--burst' as string]: String(index) }}
            transform={`translate(${burst.x} ${burst.y})`}
          >
            <path className={motion.splat} fill={burst.fill} d={splatter(burst.r, burst.seed)} />
            {/* Flecks flung clear of the splat, each on its own line out. */}
            {Array.from({ length: 5 }, (_, i) => {
              const angle = (i / 5) * Math.PI * 2 + burst.seed
              return (
                <circle
                  key={i}
                  className={motion.fleck}
                  fill={burst.fill}
                  r={3.4 - (i % 2)}
                  style={{
                    ['--dx' as string]: `${(Math.cos(angle) * burst.r * 1.5).toFixed(1)}px`,
                    ['--dy' as string]: `${(Math.sin(angle) * burst.r * 1.5).toFixed(1)}px`,
                  }}
                />
              )
            })}
          </g>
        ))}
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

/** A point on a quadratic curve, for laying things along a drawn line. */
function along(p0: readonly [number, number], c: readonly [number, number], p1: readonly [number, number], t: number) {
  const u = 1 - t
  return [u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]] as const
}

/** One alpona footprint, heel at the origin, toes pointing up. */
const FOOT =
  'M0 0 c-7 0 -10 -9 -9 -20 c1 -11 5 -16 9 -16 c4 0 8 5 9 16 c1 11 -2 20 -9 20 Z ' +
  'M-7 -42 a3 3 0 1 0 0.1 0 M-2 -45 a3 3 0 1 0 0.1 0 M3 -45 a3 3 0 1 0 0.1 0 M8 -42 a2.6 2.6 0 1 0 0.1 0'

/** The full moon over drifting cloud, and Lakshmi's footprints walking in. Kojagori. */
function Moon({ className }: Props) {
  // Left, right, left, right: up from the bottom corner towards the door at the middle.
  const steps = [
    { x: 70, y: 372, turn: 28, side: -1 },
    { x: 104, y: 338, turn: 32, side: 1 },
    { x: 124, y: 296, turn: 26, side: -1 },
    { x: 160, y: 266, turn: 34, side: 1 },
    { x: 178, y: 222, turn: 24, side: -1 },
    { x: 214, y: 196, turn: 36, side: 1 },
  ]
  return (
    <svg viewBox="0 0 400 400" className={className} data-backdrop="moon" aria-hidden="true" focusable="false">
      <g {...lines} className={motion.faint}>
        <circle cx="292" cy="96" r="58" />
        <circle cx="292" cy="96" r="74" strokeDasharray="2 10" />
        <circle cx="272" cy="82" r="9" />
        <circle cx="306" cy="112" r="6" />
        <circle cx="314" cy="78" r="4" />
        <g className={motion.cloud} data-animate="cloud">
          <path d="M196 150 q4 -22 26 -18 q8 -18 30 -10 q20 -6 26 14 q20 2 16 18 h-98 q-12 -2 0 -4 Z" />
        </g>
        <g className={motion.cloudSlow} data-animate="cloud">
          <path d="M30 70 q4 -18 22 -15 q8 -15 26 -8 q16 -4 22 12 q16 2 13 15 h-82 q-10 -2 -1 -4 Z" />
        </g>
        <g data-animate="steps">
          {steps.map((step, i) => (
            <g key={i} transform={`translate(${step.x} ${step.y}) rotate(${step.turn}) scale(${step.side} 1)`}>
              <path className={motion.step} d={FOOT} style={{ animationDelay: `${i * 0.6}s` }} />
            </g>
          ))}
        </g>
        <path d="M300 388 c0 -40 -6 -70 -20 -96 M312 388 c2 -36 10 -62 26 -84 M324 388 c6 -30 18 -52 40 -66" />
        <path d="M280 292 l-10 -14 M284 304 l-14 -8 M338 304 l6 -16 M344 316 l12 -10 M364 322 l4 -16 M368 330 l14 -6" />
      </g>
    </svg>
  )
}

/*
 * Deepavali's night: fireworks of every colour and four kinds across the whole sky of the hero,
 * and a sill of diyas along its foot, each flame glowing in its own pool of light. Not a corner
 * motif — the dark is the point of the theme, and the left-hand corner alone left most of it
 * empty.
 */
type Firework = { x: number; y: number; r: number; colour: string; kind: 'rays' | 'dots' | 'peony' | 'willow' }

// In viewBox units of a 1240-wide sky. Kept to the dark between the words and the logo, over
// the logo's shoulders and along the top, so no burst opens behind the headline itself.
const FIREWORKS: Firework[] = [
  { x: 640, y: 80, r: 62, colour: '#ffb42e', kind: 'rays' },
  { x: 780, y: 250, r: 74, colour: '#5fd3ff', kind: 'peony' },
  { x: 610, y: 330, r: 34, colour: '#ff5fa2', kind: 'dots' },
  { x: 1150, y: 60, r: 46, colour: '#b98cff', kind: 'rays' },
  { x: 1205, y: 320, r: 40, colour: '#ff6b4a', kind: 'dots' },
  { x: 900, y: 55, r: 30, colour: '#ffffff', kind: 'rays' },
  { x: 480, y: 40, r: 26, colour: '#7ee36b', kind: 'peony' },
  { x: 730, y: 150, r: 46, colour: '#ff4f5e', kind: 'willow' },
  { x: 1010, y: 360, r: 28, colour: '#ffd166', kind: 'dots' },
  { x: 1060, y: 150, r: 54, colour: '#ffb42e', kind: 'willow' },
  { x: 20, y: 30, r: 36, colour: '#ff5fa2', kind: 'peony' },
]

function FireworkShape({ r, colour, kind }: Omit<Firework, 'x' | 'y'>) {
  const arms = kind === 'peony' ? 18 : kind === 'dots' ? 14 : 12
  return (
    <>
      {Array.from({ length: arms }, (_, k) => {
        const a = (k / arms) * Math.PI * 2
        const at = (d: number) => `${(Math.cos(a) * d).toFixed(1)} ${(Math.sin(a) * d).toFixed(1)}`
        if (kind === 'dots')
          return [0.45, 0.72, 1].map((f) => (
            <circle key={`${k}-${f}`} cx={(Math.cos(a) * r * f).toFixed(1)} cy={(Math.sin(a) * r * f).toFixed(1)} r={f === 1 ? 2.6 : 1.8} fill={colour} />
          ))
        if (kind === 'willow')
          // Arms that droop as they fall, like the gold willows that hang after the bang.
          return (
            <path
              key={k}
              d={`M${at(r * 0.2)} Q${at(r * 0.8)} ${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r + r * 0.45).toFixed(1)}`}
              stroke={colour}
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
            />
          )
        return (
          <g key={k}>
            <path d={`M${at(r * 0.3)} L${at(r)}`} stroke={colour} strokeWidth={kind === 'peony' ? 1.8 : 2.4} strokeLinecap="round" />
            {kind === 'peony' ? <circle cx={(Math.cos(a) * r).toFixed(1)} cy={(Math.sin(a) * r).toFixed(1)} r={2.4} fill={colour} /> : null}
          </g>
        )
      })}
      {kind === 'peony' ? <circle r={r * 0.55} fill="none" stroke={colour} strokeWidth={1} strokeDasharray="2 5" /> : null}
      <circle r={3} fill={colour} />
    </>
  )
}

const DIYAS = 14

function Diyas({ className }: Props) {
  // The motif is drawn twice on a page — the hero and the phone menu — and a gradient's id must
  // be the page's only one, or the flames take their colour from the copy that is hidden.
  const id = useId()
  const glow = `${id}-glow`
  const flame = `${id}-flame`
  return (
    <div className={`${className ?? ''} ${motion.night}`} data-backdrop="diyas" aria-hidden="true">
      <svg viewBox="0 0 1240 420" preserveAspectRatio="xMidYMid slice" className={motion.sky} focusable="false">
        <g className={motion.glowing}>
          {FIREWORKS.map((firework, i) => (
            <g key={i} transform={`translate(${firework.x} ${firework.y})`}>
              <g className={motion.firework} data-animate="spark" style={{ animationDelay: `${-((i * 0.83) % 5)}s` }}>
                <FireworkShape r={firework.r} colour={firework.colour} kind={firework.kind} />
              </g>
            </g>
          ))}
        </g>
      </svg>
      <svg viewBox={`0 0 ${DIYAS * 90} 90`} preserveAspectRatio="xMidYMax slice" className={motion.sill} focusable="false">
        <defs>
          <radialGradient id={glow}>
            <stop offset="0" stopColor="#ffd27a" stopOpacity="0.75" />
            <stop offset="0.45" stopColor="#ff9a3c" stopOpacity="0.25" />
            <stop offset="1" stopColor="#ff9a3c" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={flame} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#ff6b1a" />
            <stop offset="0.55" stopColor="#ffb42e" />
            <stop offset="1" stopColor="#fff3c4" />
          </linearGradient>
        </defs>
        {Array.from({ length: DIYAS }, (_, i) => (
          <g key={i} transform={`translate(${i * 90 + 45} 78)`}>
            <circle className={motion.glow} cy={-30} r={34} fill={`url(#${glow})`} style={{ animationDelay: `${-i * 0.53}s` }} />
            <path d="M-26 0 q26 22 52 0 q-9 -5 -26 -5 q-17 0 -26 5 Z" fill="#8a3b12" stroke="#d9822b" strokeWidth={1.5} />
            <path d="M-20 -1 q20 6 40 0" fill="none" stroke="#f2b24c" strokeWidth={1} strokeDasharray="2 3" />
            <path
              className={motion.flame}
              data-animate="flame"
              d="M0 -5 c-8 -9 -7 -21 0 -32 c7 11 8 23 0 32 Z"
              fill={`url(#${flame})`}
              style={{ animationDelay: `${-i * 0.37}s` }}
            />
          </g>
        ))}
      </svg>
    </div>
  )
}

/** Two strings of fairy lights twinkling, a star, and a little snow. Borodin. */
function Lights({ className }: Props) {
  const swags = [
    { from: [0, 70], via: [110, 160], to: [220, 60] },
    { from: [180, 150], via: [300, 250], to: [400, 120] },
  ] as const
  return (
    <svg viewBox="0 0 400 400" className={className} data-backdrop="lights" aria-hidden="true" focusable="false">
      <g {...lines} className={motion.faint}>
        <g className={motion.star} data-animate="star">
          <path d="M330 30 l9 24 h25 l-20 15 l8 25 l-22 -15 l-22 15 l8 -25 l-20 -15 h25 Z" />
        </g>
        {swags.map((swag, s) => (
          <g key={s}>
            <path d={`M${swag.from.join(' ')} Q${swag.via.join(' ')} ${swag.to.join(' ')}`} />
            {Array.from({ length: 9 }, (_, i) => {
              const [x, y] = along(swag.from, swag.via, swag.to, (i + 0.5) / 9)
              return (
                <g key={i} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
                  <path d="M-3 0 v5 h6 v-5" strokeWidth={1.5} />
                  <ellipse
                    className={motion.bulb}
                    data-animate="bulb"
                    cx="0"
                    cy="13"
                    rx="5.5"
                    ry="8"
                    fill="currentColor"
                    style={{ animationDelay: `${((i * 7 + s * 3) % 9) * 0.35}s` }}
                  />
                </g>
              )
            })}
          </g>
        ))}
        <g data-animate="snow">
          {[40, 96, 150, 238, 282, 352].map((x, i) => (
            <circle
              key={x}
              className={motion.flake}
              cx={x}
              cy="0"
              r={i % 2 ? 3 : 4.5}
              fill="currentColor"
              stroke="none"
              style={{ animationDelay: `${-i * 1.7}s` }}
            />
          ))}
        </g>
        <path d="M60 392 l30 -60 l30 60 Z M76 360 h28 M70 376 h40 M90 392 v8" />
      </g>
    </svg>
  )
}

// The festivals only. The portal's own looks carry no motif: a drawn alpona behind a table of
// names is the sort of decoration that makes a back office harder to read, not friendlier.
const backdrops: Record<PublicThemeName, (props: Props) => React.JSX.Element> = {
  festival: Alpona,
  'poila-boishakh': Fish,
  saraswati: Veena,
  holi: Splash,
  mahalaya: Kash,
  kojagori: Moon,
  deepavali: Diyas,
  borodin: Lights,
}

/** The decorative, gently animated motif behind the hero for the active theme. */
export function Backdrop({ theme, className, roll }: Props & { theme: ThemeName }) {
  const Motif = backdrops[theme as PublicThemeName]
  return Motif ? <Motif className={className} roll={roll} /> : null
}
