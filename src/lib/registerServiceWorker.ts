/**
 * Starts public/sw.js, which is what lets a phone install the site as an app.
 *
 * Only in a real build. Under `npm run dev` a worker would hold on to Vite's files between
 * edits, and the page you are looking at would stop being the code you just saved.
 *
 * Waits for the page to finish loading, so fetching the worker never competes with the first
 * paint. A browser without service workers, or one that refuses (private browsing, blocked
 * storage), simply gets the website — nothing here is needed to use it.
 */
export function registerServiceWorker(
  production: boolean = import.meta.env.PROD,
  nav: Navigator = navigator,
  win: Window = window,
): void {
  if (!production || !('serviceWorker' in nav)) return
  const register = () => {
    nav.serviceWorker.register('/sw.js').catch(() => {})
  }
  if (win.document.readyState === 'complete') register()
  else win.addEventListener('load', register, { once: true })
}
