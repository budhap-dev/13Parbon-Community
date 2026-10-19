import { useEffect } from 'react'
import { site } from './site'

const descriptionTag = () => document.querySelector<HTMLMetaElement>('meta[name="description"]')

/**
 * The page's title, and the line it is passed on with: the text the share button puts above the
 * link in a WhatsApp message, and the description for a search engine that runs the page. A page
 * without a line of its own goes back to the site's, from index.html, so one page's line is never
 * left behind on the next.
 */
export function useDocumentTitle(title?: string, description?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${site.name}` : site.name
  }, [title])

  useEffect(() => {
    const tag = descriptionTag()
    if (!tag) return
    tag.dataset.site ??= tag.content
    tag.content = description ?? tag.dataset.site
  }, [description])
}

/** The line the page being looked at is passed on with, for the share button in the header. */
export function pageDescription(): string | undefined {
  return descriptionTag()?.content || undefined
}
