/**
 * WhatsApp's formatting, read out of plain text.
 *
 * What people write here has usually been written somewhere else first, and for this community
 * that somewhere is WhatsApp: a message copied out of the group carries its `*bold*` and
 * `_italic_` as the marks themselves. So that is the formatting we understand — the marks every
 * member already knows how to type, rather than a toolbar or Markdown nobody here writes.
 *
 * The text is stored exactly as written and only read this way on the way out, so nothing in
 * the database is markup, and what renders is built as React elements rather than HTML: a
 * stranger's feedback cannot put a tag on the page however it is worded.
 *
 * The rules are WhatsApp's own, near enough. A mark opens at the start of a word and closes at
 * the end of one, on the same line, so `snake_case_name`, `2*3*4` and a lone `*` stay as typed.
 */

export type Mark = 'bold' | 'italic' | 'strike' | 'code'

export type Inline = string | { mark: Mark; children: Inline[] }

export type Block =
  /** Lines that belong together: a single line break inside one is kept, as WhatsApp keeps it. */
  | { kind: 'paragraph'; lines: Inline[][] }
  | { kind: 'list'; ordered: boolean; start: number; items: Inline[][] }
  | { kind: 'quote'; lines: Inline[][] }
  /** ``` on lines of its own: kept exactly, spaces and all. */
  | { kind: 'code'; text: string }

const MARKS: { token: string; mark: Mark }[] = [
  // Longest first, so ``` is not read as three single backticks.
  { token: '```', mark: 'code' },
  { token: '`', mark: 'code' },
  { token: '*', mark: 'bold' },
  { token: '_', mark: 'italic' },
  { token: '~', mark: 'strike' },
]

/** A letter or a digit in any script — Bengali included — which a mark may not sit against. */
const WORDISH = /[\p{L}\p{N}]/u
const SPACE = /\s/

/** The inline formatting of one line. */
export function parseInline(text: string): Inline[] {
  const out: Inline[] = []
  let plain = ''
  let i = 0
  while (i < text.length) {
    const found = openingAt(text, i)
    if (!found) {
      plain += text[i]
      i += 1
      continue
    }
    const { token, mark, close } = found
    if (plain) out.push(plain)
    plain = ''
    const inner = text.slice(i + token.length, close)
    out.push({ mark, children: mark === 'code' ? [inner] : parseInline(inner) })
    i = close + token.length
  }
  if (plain) out.push(plain)
  return out
}

function openingAt(text: string, i: number): { token: string; mark: Mark; close: number } | null {
  const before = text[i - 1]
  if (before !== undefined && (WORDISH.test(before) || before === text[i])) return null
  for (const { token, mark } of MARKS) {
    if (!text.startsWith(token, i)) continue
    const from = i + token.length
    const first = text[from]
    if (first === undefined || SPACE.test(first)) return null
    const close = closingFrom(text, token, from + 1)
    return close === -1 ? null : { token, mark, close }
  }
  return null
}

function closingFrom(text: string, token: string, from: number): number {
  for (let j = text.indexOf(token, from); j !== -1; j = text.indexOf(token, j + 1)) {
    const last = text[j - 1]
    const after = text[j + token.length]
    if (SPACE.test(last)) continue
    if (after !== undefined && (WORDISH.test(after) || after === token[0])) continue
    return j
  }
  return -1
}

const BULLET = /^\s*[-*•]\s+(.*)$/
const NUMBERED = /^\s*(\d{1,3})[.)]\s+(.*)$/
const QUOTE = /^\s*>\s?(.*)$/
const FENCE = '```'

/** A whole message, as blocks: paragraphs, lists, quotes and monospace. */
export function parseBlocks(text: string): Block[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const blocks: Block[] = []
  let current: Block | null = null
  const end = () => {
    if (current) blocks.push(current)
    current = null
  }

  for (let n = 0; n < lines.length; n += 1) {
    const line = lines[n]

    // A fence that opens a line and is not closed on it runs to the line that closes it.
    // Never closed, and it was only ever three backticks: read on as ordinary text.
    if (line.trimStart().startsWith(FENCE) && !line.trimStart().slice(FENCE.length).includes(FENCE)) {
      const shut = lines.findIndex((later, m) => m > n && later.includes(FENCE))
      if (shut !== -1) {
        end()
        const opening = line.trimStart().slice(FENCE.length)
        const closing = lines[shut].slice(0, lines[shut].indexOf(FENCE))
        const body = [opening, ...lines.slice(n + 1, shut), closing]
        // The fences' own lines only count when something was written on them.
        if (!opening.trim()) body.shift()
        if (!closing.trim()) body.pop()
        blocks.push({ kind: 'code', text: body.join('\n') })
        n = shut
        continue
      }
    }

    if (!line.trim()) {
      end()
      continue
    }

    const bullet = BULLET.exec(line)
    const numbered = bullet ? null : NUMBERED.exec(line)
    if (bullet || numbered) {
      const ordered = Boolean(numbered)
      const item = parseInline((bullet ? bullet[1] : numbered![2]).trim())
      const list = current as Block | null
      if (list?.kind === 'list' && list.ordered === ordered) list.items.push(item)
      else {
        end()
        current = { kind: 'list', ordered, start: numbered ? Number(numbered[1]) : 1, items: [item] }
      }
      continue
    }

    const quote = QUOTE.exec(line)
    if (quote) {
      const block = current as Block | null
      if (block?.kind === 'quote') block.lines.push(parseInline(quote[1].trim()))
      else {
        end()
        current = { kind: 'quote', lines: [parseInline(quote[1].trim())] }
      }
      continue
    }

    const block = current as Block | null
    if (block?.kind === 'paragraph') block.lines.push(parseInline(line.trim()))
    else {
      end()
      current = { kind: 'paragraph', lines: [parseInline(line.trim())] }
    }
  }
  end()
  return blocks
}

/** Whether any of it is formatted at all, beyond lines and paragraphs. */
export function hasFormatting(text: string): boolean {
  return parseBlocks(text).some(
    (block) =>
      block.kind !== 'paragraph' || block.lines.some((line) => line.some((piece) => typeof piece !== 'string')),
  )
}

function flat(pieces: Inline[]): string {
  return pieces.map((piece) => (typeof piece === 'string' ? piece : flat(piece.children))).join('')
}

/** The words with the marks taken off, for anywhere that shows a line of it as plain text. */
export function plainText(text: string): string {
  return parseBlocks(text)
    .map((block) => {
      switch (block.kind) {
        case 'paragraph':
        case 'quote':
          return block.lines.map(flat).join('\n')
        case 'list':
          return block.items
            .map((item, i) => `${block.ordered ? `${block.start + i}.` : '•'} ${flat(item)}`)
            .join('\n')
        case 'code':
          return block.text
      }
    })
    .join('\n\n')
}
