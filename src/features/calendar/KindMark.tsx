import type { EntryKind } from '@/domain/ritual'

/**
 * The shape that tells the four kinds apart, so colour is never the only thing that does:
 * a diamond for a puja, a circle for a festival, a triangle for a cultural day, and a star for
 * one of our own evenings. Decoration — the word for the kind is always said beside it.
 */
export function KindMark({ kind, className }: { kind: EntryKind; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false" data-kind={kind}>
      {kind === 'puja' ? <path d="M6 0.8 11.2 6 6 11.2 0.8 6Z" fill="currentColor" /> : null}
      {kind === 'festival' ? <circle cx="6" cy="6" r="4.6" fill="currentColor" /> : null}
      {kind === 'cultural' ? <path d="M6 1 11.2 10.6H0.8Z" fill="currentColor" /> : null}
      {kind === 'evening' ? (
        <path d="M6 0.6 7.6 4.2 11.5 4.5 8.5 7.1 9.4 11 6 8.9 2.6 11 3.5 7.1 0.5 4.5 4.4 4.2Z" fill="currentColor" />
      ) : null}
    </svg>
  )
}
