import { Outlet } from 'react-router'
import { useSettings, useSettingsFailed, useSettingsLoaded } from './SettingsContext'
import { NotFoundPage } from '@/features/placeholder'

/**
 * A section of the website that the committee can take down.
 *
 * The switches used to change the navigation and nothing else, which is less than the screen
 * that offers them says: "turning this off pulls the whole gallery at once", and of the news,
 * "a page of placeholders reads worse than no page". Both were untrue of a visitor holding the
 * address — every album, every photograph and an empty news page answered exactly as before.
 *
 * The gallery one is the reason this matters rather than being tidy. A committee that has
 * switched the photographs off, because somebody asked or because a night is being reviewed,
 * has not taken anything down: the pages stay, the pictures stay, and the only thing that has
 * gone is the link. This makes the switch mean what it says.
 *
 * Sign-in is deliberately not gated the same way. Its note says so out loud — "the portal still
 * works for anybody who knows the address" — because a member who is already signed in should
 * not be locked out of their own household by a switch about a link in the header.
 */
export function SectionGate({ setting }: { setting: 'showPhotos' | 'showNews' | 'showFeedback' | 'showQuizzes' | 'showSponsors' }) {
  const settings = useSettings()
  const loaded = useSettingsLoaded()
  const { failed } = useSettingsFailed()
  // Nothing until the switches have arrived. Drawn on the code's values, a link somebody shared
  // to a section the committee has switched on showed "not found" first and then the page —
  // and lost its #anchor on the way. A read that failed outright falls back to the code's
  // values, as everywhere else, rather than leaving the page blank for good.
  if (!loaded && !failed) return null
  // Not found rather than a message saying it has been turned off: whether the committee is
  // still getting a section ready is nobody else's business, and a page that says "come back
  // later" is a page that invites somebody to keep trying.
  return settings[setting] ? <Outlet /> : <NotFoundPage />
}
