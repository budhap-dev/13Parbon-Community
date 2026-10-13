import { useState, type ReactNode } from 'react'
import { Button, type ButtonSize } from './Button'
import { ConfirmDialog } from './ConfirmDialog'

/**
 * A remove or delete button that asks first.
 *
 * Every one in the app is red and every one asks, by the committee's wish: one rule nobody has
 * to remember the exceptions to. The question names what goes and says whether it can come
 * back — "until you save" for a row in a form, "cannot be undone" for a thing that exists.
 */
export function ConfirmButton({
  title,
  body,
  confirmLabel = 'Remove',
  onConfirm,
  children,
  size = 'sm',
  disabled,
  className,
  'aria-label': ariaLabel,
}: {
  /** The question, e.g. "Remove the Treasurer?" */
  title: string
  /** What happens, and whether it can be undone. */
  body: ReactNode
  confirmLabel?: string
  onConfirm: () => void
  children: ReactNode
  size?: ButtonSize
  disabled?: boolean
  className?: string
  'aria-label'?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="danger" size={size} disabled={disabled} className={className} aria-label={ariaLabel} onClick={() => setOpen(true)}>
        {children}
      </Button>
      <ConfirmDialog
        open={open}
        title={title}
        confirmLabel={confirmLabel}
        onConfirm={() => {
          setOpen(false)
          onConfirm()
        }}
        onCancel={() => setOpen(false)}
      >
        {body}
      </ConfirmDialog>
    </>
  )
}

/** The words for taking a row out of a form that has not been saved. */
export const UNTIL_SAVED = 'It comes out of the form now, and off the site when you save. Leave without saving and it stays.'
