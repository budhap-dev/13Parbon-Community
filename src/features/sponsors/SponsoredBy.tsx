import { Fragment } from 'react'
import { Link } from 'react-router'
import { useSettings } from '@/app/SettingsContext'
import { sponsoredByLead, sponsorsOf } from '@/domain/sponsors'

/**
 * "Co-sponsored by Raj Sweets and the Bose family." — under a festival, or on one of its evenings.
 *
 * Names as the committee typed them, capitals and all: "the Bose family" and "The Curry House"
 * are both right, and no rule about the start of a name gets both. Each links to the sponsor's
 * entry on the Sponsors page, unless `linked` is off because the line sits inside something that
 * is already one big link — a card on the home page, where a link inside a link goes nowhere.
 *
 * Nothing at all while sponsors are switched off or nobody on show helps with this festival.
 */
export function SponsoredBy({
  festivalId,
  linked = true,
  className,
}: {
  festivalId: string | undefined
  linked?: boolean
  className?: string
}) {
  const { showSponsors, sponsors } = useSettings()
  const who = showSponsors ? sponsorsOf(festivalId, sponsors) : []
  if (who.length === 0) return null

  return (
    <p className={className}>
      {sponsoredByLead(who.length)}{' '}
      {who.map((sponsor, i) => (
        <Fragment key={sponsor.id}>
          {i === 0 ? '' : i === who.length - 1 ? ' and ' : ', '}
          {linked ? <Link to={`/sponsors#${sponsor.id}`}>{sponsor.name}</Link> : sponsor.name}
        </Fragment>
      ))}
      .
    </p>
  )
}
