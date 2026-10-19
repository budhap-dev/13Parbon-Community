import { DEFAULT_PANJIKA, isPanjika, type Panjika } from '@/domain/bengaliDate'

/** Which panjika the reader last chose on the calendar page, kept in this browser only. */
export const PANJIKA_KEY = 'calendar-panjika'

export function readPanjika(storage: Pick<Storage, 'getItem'> | null = safeStorage()): Panjika {
  try {
    const saved = storage?.getItem(PANJIKA_KEY)
    return isPanjika(saved) ? saved : DEFAULT_PANJIKA
  } catch {
    return DEFAULT_PANJIKA
  }
}

export function savePanjika(panjika: Panjika, storage: Pick<Storage, 'setItem'> | null = safeStorage()): void {
  try {
    storage?.setItem(PANJIKA_KEY, panjika)
  } catch {
    // Private mode or blocked storage: the choice lasts until the page is closed.
  }
}

function safeStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}
