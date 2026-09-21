import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { defaultSettings } from '@/app/defaults'
import { createMockApi, type ApiClient } from '@/lib/api'
import { createTestApi, renderWithProviders } from '@/test/render'
import { HomePage } from '../HomePage'
import { FeedbackStrip } from './FeedbackStrip'

/**
 * The strip is behind two switches that both start off, which is why it needs a test of its
 * own: rendered through the home page with the defaults it draws nothing, so a suite that only
 * went through `HomePage` would have said the section worked while never once running it.
 */
function withFeedback(over: Partial<ApiClient> = {}, audience: 'public' | 'admins' = 'public'): ApiClient {
  const base = createTestApi()
  return {
    ...base,
    settings: {
      ...base.settings,
      get: async () => ({
        ...defaultSettings,
        showFeedback: true,
        home: { ...defaultSettings.home, feedback: audience },
      }),
    },
    ...over,
  }
}

describe('the strip on the home page', () => {
  it('shows the newest few notes, by name', async () => {
    renderWithProviders(<FeedbackStrip />, { api: withFeedback() })
    const strip = await screen.findByRole('region', { name: 'What people say' })
    // From the fixtures: the one piece the committee has approved.
    expect(within(strip).getByText(/left with our daughter in the dance line/i)).toBeInTheDocument()
    expect(within(strip).getByText('Meera Ghosh')).toBeInTheDocument()
  })

  it('points at the page where there is more, and a box to add to it', async () => {
    renderWithProviders(<FeedbackStrip />, { api: withFeedback() })
    const strip = await screen.findByRole('region', { name: 'What people say' })
    expect(within(strip).getByRole('link', { name: /Read more, or tell us/ })).toHaveAttribute('href', '/feedback')
  })

  it('carries nothing that has not been approved', async () => {
    renderWithProviders(<FeedbackStrip />, { api: withFeedback() })
    await screen.findByRole('region', { name: 'What people say' })
    expect(screen.queryByText(/the hall gets very cold/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/testing testing/i)).not.toBeInTheDocument()
  })

  /**
   * A committee that turns the section on before working through the queue gets an unchanged
   * home page, not an empty heading over a gap.
   */
  it('draws nothing at all while nothing has been approved', async () => {
    const base = createMockApi()
    const { container } = renderWithProviders(<FeedbackStrip />, {
      api: withFeedback({ feedback: { ...base.feedback, listApproved: async () => [] } }),
    })
    expect(await screen.findByRole('region', { name: 'What people say' }).catch(() => null)).toBeNull()
    expect(container).toBeEmptyDOMElement()
  })
})

describe('the switches in front of it', () => {
  it('is off the home page until the committee turns the section on', async () => {
    renderWithProviders(<HomePage />, { api: createTestApi() })
    // The defaults: showFeedback false, and the section for the committee only.
    await screen.findByRole('region', { name: 'Our year' })
    expect(screen.queryByRole('region', { name: 'What people say' })).not.toBeInTheDocument()
  })

  it('appears once both the switch and the audience allow it', async () => {
    renderWithProviders(<HomePage />, { api: withFeedback() })
    expect(await screen.findByRole('region', { name: 'What people say' })).toBeInTheDocument()
  })

  /**
   * Two switches, and either one closes it. The page-level switch is about whether the
   * feature exists at all; the audience is about whether this particular section belongs on
   * the front page yet.
   */
  it('stays off the home page for a visitor while the section is the committee’s alone', async () => {
    renderWithProviders(<HomePage />, { api: withFeedback({}, 'admins') })
    await screen.findByRole('region', { name: 'Our year' })
    expect(screen.queryByRole('region', { name: 'What people say' })).not.toBeInTheDocument()
  })
})
