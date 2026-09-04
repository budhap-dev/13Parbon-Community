import { Icon } from './Icon'
import styles from './VenueMap.module.css'

type Props = {
  /** The name of the place, as it should read to someone looking for it. */
  venue: string
  /** Street or postcode, if there is one beyond the name. */
  address?: string
  coordinates?: { lat: number; lon: number }
}

/**
 * OpenStreetMap rather than a keyed service: no account to hold, and nothing that would make
 * the privacy notice untrue. The box is a small window around the pin.
 */
function embedUrl({ lat, lon }: { lat: number; lon: number }): string {
  const box = [lon - 0.005, lat - 0.0025, lon + 0.005, lat + 0.0025].map((n) => n.toFixed(5)).join(',')
  return `https://www.openstreetmap.org/export/embed.html?bbox=${box}&layer=mapnik&marker=${lat},${lon}`
}

/** Hands the address to whichever maps app the visitor already uses. */
function directionsUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

/**
 * Where a thing is happening, shown on the page about that thing. The venue belongs to the
 * event rather than to the association: we move around, and the map has to move with us.
 */
export function VenueMap({ venue, address, coordinates }: Props) {
  const full = address ? `${venue}, ${address}` : venue
  if (!coordinates) return null
  return (
    <>
      <iframe
        className={styles.map}
        title={`Map showing ${full}`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        src={embedUrl(coordinates)}
      />
      <a className={styles.directions} href={directionsUrl(full)} target="_blank" rel="noreferrer">
        Get directions
        <Icon name="external" size={15} />
      </a>
    </>
  )
}
