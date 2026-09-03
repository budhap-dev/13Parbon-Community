import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// jsdom does not implement scrolling; ScrollRestoration calls it on navigation.
window.scrollTo = vi.fn()

afterEach(() => {
  cleanup()
})
