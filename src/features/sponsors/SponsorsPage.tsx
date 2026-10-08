import { useEffect } from 'react'
import { Link, useLocation } from 'react-router'
import { useSettings } from '@/app/SettingsContext'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { Container } from '@/components/Container'
import { SponsorLogo } from '@/components/SponsorLogo'
import { TAKEDOWN_PROMISE } from '@/domain/contact'
import { GROUP_TITLES, groupByLevel, namesInASentence } from '@/domain/sponsors'
import styles from './Sponsors.module.css'

/**
 * Who helps pay for the year, and the one place on the site that links out to them.
 *
 * Every sponsored link is here rather than scattered over the home page and the evenings, so
 * the logos elsewhere come to this page, by the sponsor's own anchor, and this page says who
 * they are before it sends anybody away.
 *
 * Behind the Sponsors switch like any section the committee can take down. A person or a family
 * is never on it until the committee has ticked that they agreed; see `isOnShow`.
 */
function NameHeading({ level, className, children }: { level: 2 | 3; className: string; children: string }) {
  return level === 2 ? <h2 className={className}>{children}</h2> : <h3 className={className}>{children}</h3>
}

export function SponsorsPage() {
  useDocumentTitle('Our sponsors')
  const { sponsors, festivals } = useSettings()
  const groups = groupByLevel(sponsors)
  const festivalName = new Map(festivals.map((f) => [f.id, f.name]))

  // A link to one sponsor — a logo on the home page, a name under a festival, or one shared —
  // lands on their entry rather than at the top of the page.
  const { hash } = useLocation()
  useEffect(() => {
    if (hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView?.()
  }, [hash, sponsors])

  return (
    <Container className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>Our sponsors</h1>
        <p className={styles.intro}>
          Hiring the hall, the food and the pujo all cost money. These are the businesses, families
          and friends who help pay. Thank you.
        </p>
      </header>

      {groups.length === 0 ? <p className={styles.none}>We have nobody to thank here just yet.</p> : null}

      {groups.map((group) => {
        // A heading over the only group there is says nothing the page title did not.
        const titled = groups.length > 1
        const big = group.level === 'gold'
        return (
          <section
            key={group.level || 'none'}
            className={styles.group}
            aria-labelledby={titled ? `group-${group.level || 'none'}` : undefined}
            aria-label={titled ? undefined : 'Our sponsors'}
          >
            {titled ? (
              <h2 id={`group-${group.level || 'none'}`} className={styles.groupTitle}>
                {GROUP_TITLES[group.level]}
              </h2>
            ) : null}
            <ul className={big ? styles.bigList : styles.list}>
              {group.sponsors.map((sponsor) => {
                const helps = sponsor.festivalIds.map((id) => festivalName.get(id)).filter((n): n is string => !!n)
                // The name is printed beside the logo here, so a sponsor with no logo gets no
                // tile: a white box saying "Shapla Travel" over a heading saying it again.
                const entryClass = big ? styles.bigEntry : sponsor.logo ? styles.entry : styles.entryNoLogo
                return (
                  <li key={sponsor.id}>
                    <article id={sponsor.id} className={entryClass}>
                      {sponsor.logo ? (
                        <SponsorLogo
                          name={sponsor.name}
                          logo={sponsor.logo}
                          alt=""
                          className={big ? styles.bigLogo : styles.logo}
                        />
                      ) : null}
                      <div className={styles.words}>
                        {/* A level under the page title when there are several; straight under it when not. */}
                        <NameHeading level={titled ? 3 : 2} className={styles.name}>
                          {sponsor.name}
                        </NameHeading>
                        {sponsor.blurb ? <p className={styles.blurb}>{sponsor.blurb}</p> : null}
                        {helps.length > 0 ? (
                          <p className={styles.helps}>Helps put on {namesInASentence(helps)}</p>
                        ) : null}
                        {sponsor.href ? (
                          <a className={styles.visit} href={sponsor.href} target="_blank" rel="sponsored noopener">
                            Visit their website{' '}
                            <span className={styles.visuallyHidden}>– {sponsor.name}, opens in a new tab</span>
                            <span aria-hidden="true">&nbsp;↗</span>
                          </a>
                        ) : null}
                      </div>
                    </article>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}

      <footer className={styles.foot}>
        <p>
          Would you like to sponsor an evening? <Link to="/contact">Talk to the committee.</Link>
        </p>
        <p>
          Named here and would rather not be? <Link to="/contact">Tell us</Link> and we will take it
          off — {TAKEDOWN_PROMISE}.
        </p>
      </footer>
    </Container>
  )
}
