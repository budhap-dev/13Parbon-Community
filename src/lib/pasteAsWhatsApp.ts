/**
 * What was copied, written the way WhatsApp would write it.
 *
 * Copy a message out of the WhatsApp app and the marks come with it — `*bold*` is just text.
 * Copy it out of WhatsApp Web, a Word document or an email, though, and the clipboard holds the
 * formatting itself, as HTML, beside a plain copy with the bold already gone. A textarea takes
 * the plain one. This takes the HTML instead and puts the marks back, so the formatting survives
 * whichever way it was copied, and the box only ever holds text somebody could have typed.
 *
 * Returns null when the copy carried no formatting worth keeping, so the browser pastes as it
 * always does.
 */
export function pasteAsWhatsApp(html: string): string | null {
  if (!html.trim()) return null
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const state = { formatted: false }
  const text = tidy(walk(doc.body, state, false))
  return state.formatted && text ? text : null
}

type State = { formatted: boolean }

const SKIP = new Set(['script', 'style', 'head', 'meta', 'title', 'template'])
const BLOCK = new Set(['div', 'section', 'article', 'header', 'footer', 'tr', 'table', 'ul', 'ol'])
const PARAGRAPH = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'])

function walk(node: Node, state: State, pre: boolean): string {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? ''
    return pre ? text : text.replace(/\s+/g, ' ')
  }
  if (!(node instanceof HTMLElement)) return ''
  const tag = node.tagName.toLowerCase()
  if (SKIP.has(tag)) return ''
  if (tag === 'br') return '\n'

  if (tag === 'pre') {
    state.formatted = true
    return `\n\`\`\`\n${(node.textContent ?? '').replace(/\n$/, '')}\n\`\`\`\n`
  }

  const inner = () => Array.from(node.childNodes, (child) => walk(child, state, pre)).join('')

  if (tag === 'li') {
    state.formatted = true
    const list = node.parentElement
    const ordered = list?.tagName.toLowerCase() === 'ol'
    const at = list ? Array.from(list.children).indexOf(node) : 0
    const start = ordered ? Number(list?.getAttribute('start') ?? 1) || 1 : 1
    // A line each, one after another; the list round them gives the break before and after.
    return `\n${ordered ? `${start + at}.` : '-'} ${inner().trim()}`
  }

  if (tag === 'blockquote') {
    state.formatted = true
    const lines = tidy(inner()).split('\n')
    return `\n${lines.map((line) => `> ${line}`).join('\n')}\n`
  }

  let text = inner()
  const style = node.style
  const weight = style.fontWeight
  const bold = weight ? weight === 'bold' || weight === 'bolder' || Number(weight) >= 600 : tag === 'b' || tag === 'strong'
  const italic = style.fontStyle ? style.fontStyle === 'italic' : tag === 'i' || tag === 'em'
  const decoration = `${style.textDecoration} ${style.textDecorationLine}`
  const strike = decoration.includes('line-through') || tag === 's' || tag === 'del' || tag === 'strike'
  const code = tag === 'code' || tag === 'kbd' || tag === 'tt'

  // Innermost first, as WhatsApp writes them: *_both_*.
  if (code) text = wrap(text, '`', state)
  else {
    if (strike) text = wrap(text, '~', state)
    if (italic) text = wrap(text, '_', state)
    if (bold || /^h[1-6]$/.test(tag)) text = wrap(text, '*', state)
  }

  if (PARAGRAPH.has(tag)) return `\n\n${text}\n\n`
  if (BLOCK.has(tag)) return `\n${text}\n`
  return text
}

/**
 * Marks round the words, with any space at either end left outside them — `*bold *` is not
 * bold in WhatsApp — and line by line, since a mark cannot carry over a line break.
 */
function wrap(text: string, mark: string, state: State): string {
  return text
    .split('\n')
    .map((line) => {
      const match = /^(\s*)(.*?)(\s*)$/s.exec(line)!
      if (!match[2]) return line
      state.formatted = true
      return `${match[1]}${mark}${match[2]}${mark}${match[3]}`
    })
    .join('\n')
}

/** The spaces HTML's own layout left at the ends of lines go; inside ``` everything stays. */
function tidy(text: string): string {
  let fenced = false
  return text
    .split('\n')
    .map((line) => {
      if (line.trim() === '```') fenced = !fenced
      return fenced ? line : line.trim()
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
