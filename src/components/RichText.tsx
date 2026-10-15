import { Fragment, type ReactNode } from 'react'
import { parseBlocks, type Block, type Inline } from '@/domain/whatsappText'
import styles from './RichText.module.css'

/**
 * Text somebody wrote, with WhatsApp's formatting shown as formatting — see `whatsappText.ts`.
 *
 * `inline` runs it all into one stretch of text: bold and italic stay, but lists and paragraphs
 * become the words in order. For a short excerpt whose box clamps it to a few lines, where a
 * list or a second paragraph would only be cut off half-drawn.
 */
export function RichText({ text, inline = false, className }: { text: string; inline?: boolean; className?: string }) {
  const blocks = parseBlocks(text)
  if (inline) {
    return (
      <span className={className}>
        {blocks.map((block, i) => (
          <Fragment key={i}>
            {i > 0 ? ' ' : null}
            {inlineBlock(block)}
          </Fragment>
        ))}
      </span>
    )
  }
  return (
    <div className={[styles.rich, className].filter(Boolean).join(' ')}>
      {blocks.map((block, i) => (
        <Fragment key={i}>{renderBlock(block)}</Fragment>
      ))}
    </div>
  )
}

function renderBlock(block: Block): ReactNode {
  switch (block.kind) {
    case 'paragraph':
      return <p>{lines(block.lines)}</p>
    case 'quote':
      return <blockquote className={styles.quote}>{lines(block.lines)}</blockquote>
    case 'list': {
      const items = block.items.map((item, i) => <li key={i}>{pieces(item)}</li>)
      return block.ordered ? (
        <ol className={styles.list} start={block.start === 1 ? undefined : block.start}>
          {items}
        </ol>
      ) : (
        <ul className={styles.list}>{items}</ul>
      )
    }
    case 'code':
      return <pre className={styles.pre}>{block.text}</pre>
  }
}

function inlineBlock(block: Block): ReactNode {
  switch (block.kind) {
    case 'paragraph':
    case 'quote':
      return joined(block.lines.map(pieces))
    case 'list':
      return joined(
        block.items.map((item, i) => (
          <>
            {block.ordered ? `${block.start + i}. ` : '• '}
            {pieces(item)}
          </>
        )),
      )
    case 'code':
      return <code className={styles.code}>{block.text}</code>
  }
}

function joined(parts: ReactNode[]): ReactNode {
  return parts.map((part, i) => (
    <Fragment key={i}>
      {i > 0 ? ' ' : null}
      {part}
    </Fragment>
  ))
}

/** The lines of a paragraph, with the breaks between them kept. */
function lines(rows: Inline[][]): ReactNode {
  return rows.map((row, i) => (
    <Fragment key={i}>
      {i > 0 ? <br /> : null}
      {pieces(row)}
    </Fragment>
  ))
}

function pieces(row: Inline[]): ReactNode {
  return row.map((piece, i) => {
    if (typeof piece === 'string') return <Fragment key={i}>{piece}</Fragment>
    const inner = pieces(piece.children)
    switch (piece.mark) {
      case 'bold':
        return <strong key={i}>{inner}</strong>
      case 'italic':
        return <em key={i}>{inner}</em>
      case 'strike':
        return <s key={i}>{inner}</s>
      case 'code':
        return (
          <code key={i} className={styles.code}>
            {inner}
          </code>
        )
    }
  })
}
