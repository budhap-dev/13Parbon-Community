import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createApi, createMockApi, useApi, useSaveSettings } from '@/lib/api'
import { previewAccounts } from '@/lib/auth/previewAccounts'
import { useSession } from '@/lib/auth/session'
import { useNow } from '@/lib/clock'
import { defaultSettings } from './defaults'
import { AppProviders } from './providers'
import { useSettings } from './SettingsContext'
import { useTheme } from './theme/ThemeContext'

function Probe() {
  useApi()
  const { theme } = useTheme()
  return (
    <p>
      {useNow().toISOString()} {theme}
    </p>
  )
}

describe('AppProviders', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('provides the api, the clock and the theme', () => {
    const now = () => new Date('2026-09-03T10:00:00Z')
    render(
      <AppProviders api={createMockApi()} now={now} theme="holi">
        <Probe />
      </AppProviders>,
    )
    expect(screen.getByText('2026-09-03T10:00:00.000Z holi')).toBeInTheDocument()
    expect(document.documentElement.dataset.theme).toBe('holi')
  })

  /*
   * Stepping into a sample household swaps the client, and what the queries held has to go
   * with it. It used to go by clearing the cache — which left the settings, watched by a
   * provider that never unmounts, holding on to a query nothing could refresh any more. From
   * then until a reload, the committee's screen showed every save as unsaved, and each save was
   * built on settings from before the one before it.
   */
  it('goes on hearing about saved settings after a preview has been opened', async () => {
    const real = createApi({})
    const fixtures = createApi({})
    // The same person signed in for real: no `preview` on the session at all.
    const { preview: _preview, ...admin } = previewAccounts[1]
    await real.settings.save({ ...defaultSettings, showNews: true }, { householdId: admin.householdId, role: 'admin' })

    function Settings() {
      const settings = useSettings()
      const { enterPreview } = useSession()
      const save = useSaveSettings()
      return (
        <>
          <p>
            news {String(settings.showNews)}, feedback {String(settings.showFeedback)}
          </p>
          <button type="button" onClick={() => enterPreview(previewAccounts[1])}>
            Walk through
          </button>
          <button type="button" onClick={() => save.mutate({ ...settings, showFeedback: true })}>
            Save
          </button>
        </>
      )
    }

    render(
      <AppProviders api={real} previewApi={fixtures} session={admin}>
        <Settings />
      </AppProviders>,
    )
    expect(await screen.findByText('news true, feedback false')).toBeInTheDocument()

    // Into the preview: the sample data's settings, not the real ones left over.
    await userEvent.click(screen.getByRole('button', { name: 'Walk through' }))
    expect(await screen.findByText('news false, feedback false')).toBeInTheDocument()

    // And a save made from here on is one the screen finds out about.
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.getByText('news false, feedback true')).toBeInTheDocument())
  })
})
