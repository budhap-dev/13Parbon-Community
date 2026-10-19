import type { JSX } from 'react'

const lines = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

/**
 * A small drawing for each occasion on the calendar, in the same hand as the festival marks on
 * the home page: line only, in the colour of the text around it, so it sits right in every theme.
 * Decoration — the name is always written beside it — so hidden from screen readers.
 *
 * Chosen by a ritual's id, which stays the same from year to year. An occasion with no drawing
 * of its own gets the plain circle.
 */
export function RitualIcon({ id, className }: { id: string; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      <g {...lines}>{icons[id] ?? icons.default}</g>
    </svg>
  )
}

const trishul = (
  <>
    <path d="M32 58V14" />
    <path d="M32 8l-4 8h8z" />
    <path d="M18 14c0 10 6 16 14 16s14-6 14-16" />
    <path d="M18 14l-2-6M46 14l2-6" />
    <path d="M26 46h12" />
  </>
)

const chariot = (
  <>
    <path d="M14 40h36l-4-14H18z" />
    <path d="M22 26l10-16 10 16" />
    <path d="M32 10V6" />
    <circle cx="20" cy="48" r="7" />
    <circle cx="44" cy="48" r="7" />
    <path d="M20 44v8M16 48h8M44 44v8M40 48h8" />
  </>
)

const fullMoon = <circle cx="32" cy="22" r="11" />

const icons: Record<string, JSX.Element> = {
  // New year: the boat from the community's own emblem.
  'poila-boishakh': (
    <>
      <path d="M10 40h44l-6 10H16z" />
      <path d="M32 40V14" />
      <path d="M32 16c8 2 13 6 15 11H32z" />
      <path d="M6 56q7-4 13 0t13 0t13 0t13 0" />
    </>
  ),
  // Haal khata: the red ledger opened for the year.
  'akshaya-tritiya': (
    <>
      <rect x="14" y="10" width="36" height="44" rx="3" />
      <path d="M22 10v44" />
      <path d="M30 22h12M30 30h12M30 38h8" />
    </>
  ),
  // Tagore: a quill and a page.
  'rabindra-jayanti': (
    <>
      <path d="M12 54h28" />
      <path d="M50 8C36 12 26 26 22 46c12-6 24-18 28-38z" />
      <path d="M22 46l14-22" />
    </>
  ),
  // Nazrul: an open book of songs.
  'nazrul-jayanti': (
    <>
      <path d="M32 18c-6-4-14-5-22-4v34c8-1 16 0 22 4 6-4 14-5 22-4V14c-8-1-16 0-22 4z" />
      <path d="M32 18v34" />
      <path d="M40 26l4-2v10" />
      <circle cx="41" cy="35" r="2.5" />
    </>
  ),
  // The taal-pakha, the palm fan a mother cools her jamai with.
  'jamai-shashthi': (
    <>
      <path d="M32 40C18 40 10 30 12 18 20 10 44 10 52 18c2 12-6 22-20 22z" />
      <path d="M32 40v18" />
      <path d="M32 40 20 16M32 40V12M32 40l12-24" />
    </>
  ),
  // Snan Yatra: water poured from a kalash.
  'snan-yatra': (
    <>
      <path d="M20 26c-4 6-4 16 4 20h16c8-4 8-14 4-20z" />
      <path d="M24 26h16M26 20h12l-2 6H28z" />
      <path d="M32 14c-3-4 3-6 0-10" />
      <path d="M22 54c0-3 2-5 2-5s2 2 2 5a2 2 0 0 1-4 0zM38 54c0-3 2-5 2-5s2 2 2 5a2 2 0 0 1-4 0z" />
    </>
  ),
  'rath-yatra': chariot,
  'ulto-rath': chariot,
  // Manasa: the snake.
  'manasa-puja': (
    <>
      <path d="M14 54c10 0 14-6 10-12s-6-12 4-14 16-8 12-16" />
      <path d="M40 12c2-4 8-4 10 0s-2 8-6 8-6-4-4-8z" />
      <path d="M50 14l6-2" />
    </>
  ),
  // Jhulan: the swing.
  jhulan: (
    <>
      <path d="M8 10h48" />
      <path d="M20 10v32M44 10v32" />
      <path d="M14 42h36v6H14z" />
      <path d="M26 54l2-6M38 54l-2-6" />
    </>
  ),
  // Janmashtami: the flute and a peacock feather.
  janmashtami: (
    <>
      <path d="M8 46 52 18" />
      <circle cx="20" cy="38" r="1.5" />
      <circle cx="28" cy="33" r="1.5" />
      <circle cx="36" cy="28" r="1.5" />
      <path d="M40 54c-4-10-2-24 8-34" />
      <ellipse cx="48" cy="20" rx="5" ry="7" transform="rotate(30 48 20)" />
      <circle cx="48" cy="20" r="2" />
    </>
  ),
  // Vishwakarma: kites in the September sky.
  'vishwakarma-puja': (
    <>
      <path d="M32 6 50 24 32 42 14 24z" />
      <path d="M32 6v36M14 24h36" />
      <path d="M32 42c-4 6 4 8 0 14" />
    </>
  ),
  // Mahalaya: kash grass at dawn.
  mahalaya: (
    <>
      <circle cx="46" cy="18" r="9" />
      <path d="M14 56c2-14 7-24 15-32" />
      <path d="M24 56c1-10 4-18 9-24" />
      <path d="M29 24l-7-3M29 24l-7 1M29 24l-7 5M29 24l7-3M29 24l7 1M29 24l7 5" />
      <path d="M4 56h56" />
    </>
  ),
  'durga-puja': trishul,
  // Basanti: the spring puja, a lotus.
  'basanti-puja': (
    <>
      <path d="M32 50c-6-8-6-20 0-30 6 10 6 22 0 30z" />
      <path d="M32 50c-10-2-18-10-20-22 10 2 16 10 20 22z" />
      <path d="M32 50c10-2 18-10 20-22-10 2-16 10-20 22z" />
      <path d="M14 54h36" />
    </>
  ),
  // Lakshmi: her owl, under the full moon.
  'lakshmi-puja': (
    <>
      <path d="M20 20l4 6M44 20l-4 6" />
      <path d="M20 22c0 10 0 18 4 26 4 6 12 6 16 0 4-8 4-16 4-26-8-4-16-4-24 0z" />
      <circle cx="27" cy="30" r="4" />
      <circle cx="37" cy="30" r="4" />
      <path d="M32 34l-2 4h4z" />
      <path d="M26 56l2-4M38 56l-2-4" />
    </>
  ),
  // Kali Puja: a diya.
  'kali-puja': (
    <>
      <path d="M10 38h44c-2 10-10 16-22 16S12 48 10 38z" />
      <path d="M44 38c4-2 8-2 10 0" />
      <path d="M32 32c-6-6 0-14 0-22 0 8 6 16 0 22z" />
    </>
  ),
  // Bhai Phonta: the phonta on a brother's forehead.
  'bhai-phonta': (
    <>
      <circle cx="32" cy="32" r="20" />
      <circle cx="32" cy="22" r="2.5" />
      <path d="M24 32h4M36 32h4" />
      <path d="M26 42c4 3 8 3 12 0" />
    </>
  ),
  // Kartik: his peacock's feather.
  'kartik-puja': (
    <>
      <path d="M22 58c4-14 10-28 20-40" />
      <ellipse cx="42" cy="18" rx="8" ry="12" transform="rotate(35 42 18)" />
      <ellipse cx="42" cy="18" rx="3.5" ry="5" transform="rotate(35 42 18)" />
      <path d="M28 44l-6-4M32 36l-6-4M36 28l-6-4" />
    </>
  ),
  // Nabanna: a sheaf of new rice.
  nabanna: (
    <>
      <path d="M32 58V30M32 30c-2-10-8-18-16-22M32 30c2-10 8-18 16-22" />
      <path d="M20 12l-4 2M24 18l-4 2M44 12l4 2M40 18l4 2" />
      <path d="M24 44h16" />
    </>
  ),
  // Jagaddhatri: a crown.
  'jagaddhatri-puja': (
    <>
      <path d="M12 46h40l-4-24-10 10-6-16-6 16-10-10z" />
      <path d="M14 52h36" />
      <circle cx="32" cy="12" r="2" />
    </>
  ),
  // Rash: the dance in a circle under the full moon.
  'rash-purnima': (
    <>
      {fullMoon}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const a = (i / 8) * 2 * Math.PI
        return <circle key={i} cx={32 + 20 * Math.cos(a)} cy={46 + 7 * Math.sin(a)} r="2" />
      })}
    </>
  ),
  // Poush Sankranti: pithe, crimped.
  'poush-sankranti': (
    <>
      <path d="M8 40c0-12 10-20 22-20-2 8-8 16-22 20z" />
      <path d="M14 34l3 3M20 29l3 3M26 24l2 3" />
      <path d="M34 46c4-12 14-18 24-16-2 10-12 16-24 16z" />
      <path d="M40 40l2 3M46 35l2 3M52 32l1 3" />
    </>
  ),
  // Saraswati: the veena.
  'saraswati-puja': (
    <>
      <circle cx="18" cy="46" r="10" />
      <circle cx="48" cy="20" r="7" />
      <path d="M24 40 43 21" />
      <path d="M27 44 46 25" />
    </>
  ),
  // Bhasha Dibas: the Shaheed Minar and the rising sun behind it.
  'bhasha-dibas': (
    <>
      <circle cx="32" cy="30" r="12" />
      <path d="M22 54V22l10-8 10 8v32" />
      <path d="M14 54V34M50 54V34" />
      <path d="M8 54h48" />
    </>
  ),
  // Shivratri: the lingam and the crescent.
  shivratri: (
    <>
      <path d="M24 44V28a8 8 0 0 1 16 0v16" />
      <path d="M10 44h38l6 6H16z" />
      <path d="M38 8a8 8 0 1 0 8 12 6 6 0 1 1-8-12z" />
    </>
  ),
  // Dol: colour thrown into the air.
  dol: (
    <>
      <path d="M20 44c-6-8-2-18 8-20s18 4 18 13-8 14-16 12" />
      <circle cx="14" cy="22" r="3" />
      <circle cx="50" cy="46" r="3" />
      <circle cx="46" cy="12" r="2.5" />
      <circle cx="22" cy="54" r="2.5" />
      <circle cx="56" cy="28" r="2" />
    </>
  ),
  // Annapurna: the pot and the ladle she feeds the world with.
  'annapurna-puja': (
    <>
      <path d="M12 30h40c0 14-8 22-20 22S12 44 12 30z" />
      <path d="M8 30h48" />
      <path d="M40 24 52 6" />
      <path d="M36 28c0-4 4-6 6-4" />
    </>
  ),
  // Neel Puja: Shiva's damru.
  'neel-puja': (
    <>
      <path d="M18 12h28L32 32zM18 52h28L32 32z" />
      <path d="M18 32h-6M46 32h6" />
      <circle cx="10" cy="36" r="2" />
      <circle cx="54" cy="28" r="2" />
    </>
  ),
  // Charak: the pole the gajan devotees swing from.
  charak: (
    <>
      <path d="M32 58V8" />
      <path d="M14 12h36" />
      <path d="M16 12l-4 22M48 12l4 22" />
      <circle cx="12" cy="38" r="3" />
      <circle cx="52" cy="38" r="3" />
      <path d="M20 58h24" />
    </>
  ),
  // Ram Navami: the bow and arrow.
  'ram-navami': (
    <>
      <path d="M16 8c20 8 20 40 0 48" />
      <path d="M16 8v48" />
      <path d="M8 32h46" />
      <path d="M48 26l6 6-6 6" />
    </>
  ),
  default: (
    <>
      <circle cx="32" cy="32" r="18" />
      <circle cx="32" cy="32" r="7" />
    </>
  ),
}
