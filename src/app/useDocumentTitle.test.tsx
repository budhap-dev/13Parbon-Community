import { renderHook } from '@testing-library/react'
import { pageDescription, useDocumentTitle } from './useDocumentTitle'

const SITE_LINE = 'A Bengali cultural association in Leeds.'

describe('useDocumentTitle', () => {
  beforeEach(() => {
    document.head.innerHTML = `<meta name="description" content="${SITE_LINE}" />`
  })

  it('sets the page’s title and the line it is passed on with', () => {
    renderHook(() => useDocumentTitle('Gallery', 'Photos from our evenings.'))
    expect(document.title).toBe('Gallery · 13Parbon Community')
    expect(pageDescription()).toBe('Photos from our evenings.')
  })

  it('goes back to the site’s line on a page without one, so the last page’s is not left behind', () => {
    const { rerender } = renderHook(({ line }) => useDocumentTitle('Page', line), {
      initialProps: { line: 'One page’s own line.' as string | undefined },
    })
    rerender({ line: undefined })
    expect(pageDescription()).toBe(SITE_LINE)
  })
})
