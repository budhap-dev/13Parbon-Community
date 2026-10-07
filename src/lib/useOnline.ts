import { useSyncExternalStore } from 'react'

const subscribe = (changed: () => void) => {
  window.addEventListener('online', changed)
  window.addEventListener('offline', changed)
  return () => {
    window.removeEventListener('online', changed)
    window.removeEventListener('offline', changed)
  }
}

/**
 * Whether this device thinks it has a connection, kept current as it comes and goes.
 *
 * Only ever trusted in the one direction: `false` means the browser knows it is cut off, while
 * `true` means no more than "a network is plugged in". So it is used to explain a failure before
 * it happens, never to decide that something will work.
 */
export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  )
}
