import { about } from '@/app/about'
import { site } from '@/app/site'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { Button } from '@/components/Button'
import { Container } from '@/components/Container'
import { useSiteText } from '@/lib/api'
import styles from './About.module.css'

export function AboutPage() {
  const text = useSiteText()
  useDocumentTitle('About us')

  return (
    <Container className={styles.page}>
      <section className={styles.hero} aria-labelledby="about-title">
        <div className={styles.heroCopy}>
          <h1 id="about-title" className={styles.title}>
            About us
          </h1>
          <p className={styles.lead}>{text.tagline}</p>
          <p className={styles.lead}>{text.mission}</p>
          <div className={styles.cta}>
            <Button to="/events" variant="cream" size="sm">
              What’s on
            </Button>
            <Button to="/contact" variant="line" size="sm">
              Get in touch
            </Button>
          </div>
        </div>
        <div className={styles.logoWrap}>
          <img src={site.logo} alt={`${site.name} logo: the emblem between the skylines of Kolkata and our town`} className={styles.logo} />
        </div>
      </section>

      <section className={styles.section} aria-labelledby="story-title">
        <h2 id="story-title" className={styles.sectionTitle}>
          Our story
        </h2>
        <div className={styles.prose}>
          {about.story.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="values-title">
        <h2 id="values-title" className={styles.sectionTitle}>
          What we stand for
        </h2>
        <ul className={styles.values}>
          {about.values.map((value) => (
            <li key={value.title} className={styles.value}>
              <h3 className={styles.valueTitle}>{value.title}</h3>
              <p className={styles.valueText}>{value.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="committee-title">
        <h2 id="committee-title" className={styles.sectionTitle}>
          The committee
        </h2>
        <p className={styles.lead}>Elected each year at the annual general meeting. Reach any of them through the contact form.</p>
        <ul className={styles.committee}>
          {about.committee.map((member) => (
            <li key={member.role} className={styles.member}>
              <span className={styles.memberRole}>{member.role}</span>
              <span className={styles.memberName}>{member.name}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="faq-title">
        <h2 id="faq-title" className={styles.sectionTitle}>
          Questions people ask
        </h2>
        <div className={styles.faq}>
          {about.faq.map((item) => (
            <details key={item.q} className={styles.item}>
              <summary className={styles.question}>{item.q}</summary>
              <p className={styles.answer}>{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </Container>
  )
}
