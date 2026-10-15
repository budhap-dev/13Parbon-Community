import { useLayoutEffect, useRef } from 'react'
import styles from '../Home.module.css'
import { usePlayOnce } from './usePlayOnce'

/*
 * An alpona in the space under "Who we are": the floor drawing done in rice paste at the door
 * for a puja, here in the theme's own colour. It draws itself ring by ring as it comes into
 * view, as a hand would from the centre out, rolling left to right as it goes, and is rubbed
 * out and drawn again. Decoration only, hidden from screen readers, and still for anybody who asks for less
 * movement.
 */
const C = 180

const at = (r: number, a: number) => [C + Math.cos(a) * r, C + Math.sin(a) * r].map((n) => n.toFixed(1)).join(' ')

/** A petal from radius `r1` out to `r2`, `w` wide in radians, pointing at angle `a`. */
function petal(r1: number, r2: number, a: number, w: number): string {
  return `M${at(r1, a)} Q${at((r1 + r2) / 2, a - w)} ${at(r2, a)} Q${at((r1 + r2) / 2, a + w)} ${at(r1, a)} Z`
}

const ring = (n: number, offset = 0) => Array.from({ length: n }, (_, i) => (i / n) * Math.PI * 2 + offset)

export function WhoAlpona() {
  const box = useRef<SVGSVGElement>(null)
  const motion = usePlayOnce(box)
  /*
   * Each line's own length, for the dash that draws it. Measured rather than normalised with
   * pathLength, which Chrome stopped honouring once the drawing was scaled down to fit the
   * column — every line came out as a row of specks.
   */
  useLayoutEffect(() => {
    box.current?.querySelectorAll<SVGGeometryElement>('path, circle').forEach((line) => {
      if (typeof line.getTotalLength === 'function') line.style.setProperty('--len', line.getTotalLength().toFixed(1))
    })
  }, [])
  return (
    <svg ref={box} viewBox="0 0 360 360" className={styles.whoAlpona} data-motion={motion} aria-hidden="true" focusable="false">
      <g className={styles.alponaRoll}>
      <g className={styles.alponaDraw} style={{ ['--step' as string]: 0 }}>
        <circle cx={C} cy={C} r={10} />
        {ring(8).map((a, i) => (
          <path key={i} d={petal(12, 44, a, 0.35)} />
        ))}
      </g>
      <g className={styles.alponaDraw} style={{ ['--step' as string]: 1 }}>
        <circle cx={C} cy={C} r={54} />
        {ring(8, Math.PI / 8).map((a, i) => (
          <path key={i} d={petal(56, 112, a, 0.32)} />
        ))}
        {ring(8, Math.PI / 8).map((a, i) => (
          <path key={`in-${i}`} d={petal(66, 98, a, 0.16)} />
        ))}
      </g>
      <g className={styles.alponaDraw} style={{ ['--step' as string]: 2 }}>
        <circle cx={C} cy={C} r={118} />
        {ring(24).map((a, i) => (
          <circle key={i} cx={C + Math.cos(a) * 126} cy={C + Math.sin(a) * 126} r={2.6} className={styles.alponaDot} />
        ))}
      </g>
      <g className={styles.alponaDraw} style={{ ['--step' as string]: 3 }}>
        {ring(16).map((a, i) => (
          <path key={i} d={petal(134, 172, a, 0.11)} />
        ))}
        {ring(16, Math.PI / 16).map((a, i) => (
          // A curl between each pair of petals, the flourish that makes it a Bengali alpona.
          <path key={`curl-${i}`} d={`M${at(136, a)} q${(Math.cos(a) * 14).toFixed(1)} ${(Math.sin(a) * 14).toFixed(1)} ${(Math.cos(a + 1.2) * 8).toFixed(1)} ${(Math.sin(a + 1.2) * 8).toFixed(1)}`} />
        ))}
      </g>
      </g>
    </svg>
  )
}
