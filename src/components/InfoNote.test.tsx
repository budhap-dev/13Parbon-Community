import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { InfoNote } from './InfoNote'

describe('an explanation kept one tap away', () => {
  it('starts shut, showing only what it is about', () => {
    render(
      <InfoNote summary="What goes in the file">
        <p>Headcounts, and no children’s names.</p>
      </InfoNote>,
    )
    expect(screen.getByText('What goes in the file')).toBeVisible()
    expect(screen.getByText('Headcounts, and no children’s names.')).not.toBeVisible()
  })

  it('opens to the rest when its line is pressed, and shuts again', async () => {
    render(
      <InfoNote summary="What goes in the file">
        <p>Headcounts, and no children’s names.</p>
      </InfoNote>,
    )
    await userEvent.click(screen.getByText('What goes in the file'))
    expect(screen.getByText('Headcounts, and no children’s names.')).toBeVisible()
    await userEvent.click(screen.getByText('What goes in the file'))
    expect(screen.getByText('Headcounts, and no children’s names.')).not.toBeVisible()
  })
})
