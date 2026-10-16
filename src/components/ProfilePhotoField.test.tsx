import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { PersonInput } from '@/domain/household'
import type { Prepared } from '@/lib/images/prepare'
import { confirmRemove } from '@/test/confirm'
import { ProfilePhotoField } from './ProfilePhotoField'

const PHOTO = 'https://photos.13parbon.org.uk/full/person-hhsen-abc123def456.jpg'
const prepared: Prepared = { full: new Blob(['f']), thumb: new Blob(['t']), width: 480, height: 480 }
const rina: PersonInput = { name: 'Rina Sen', ageGroup: 'adult' }
const file = () => new File(['x'], 'rina.jpg', { type: 'image/jpeg' })

// jsdom draws no pictures, so a chosen file has no size and no address of its own.
URL.createObjectURL ??= () => 'blob:test'
URL.revokeObjectURL ??= () => {}

/** The placing dialog, once its picture has "loaded" as a 1000 by 600 photograph. */
async function placeIt() {
  const dialog = await screen.findByRole('dialog', { name: 'Place the photograph of Rina Sen' })
  const picture = dialog.querySelector('img')!
  Object.defineProperty(picture, 'naturalWidth', { value: 1000 })
  Object.defineProperty(picture, 'naturalHeight', { value: 600 })
  fireEvent.load(picture)
  return dialog
}

function setup(person: PersonInput, send = vi.fn(async () => PHOTO), prepare = vi.fn(async () => prepared)) {
  const onChange = vi.fn()
  render(<ProfilePhotoField person={person} send={send} prepare={prepare} onChange={onChange} />)
  return { onChange, send, prepare }
}

describe('a grown-up’s own photograph', () => {
  it('is placed in its circle first, then made ready, sent, and kept on the form by its address', async () => {
    const { onChange, send, prepare } = setup(rina)
    await userEvent.upload(screen.getByLabelText('Add a photograph of Rina Sen'), file())
    const dialog = await placeIt()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Use this photo' }))
    // The square that was showing in the circle: the middle of a 1000 by 600 picture.
    expect(prepare).toHaveBeenCalledWith(expect.any(File), { sx: 200, sy: 0, sw: 600, sh: 600 })
    expect(send).toHaveBeenCalledWith(prepared)
    expect(onChange).toHaveBeenCalledWith(PHOTO)
  })

  it('says why, and keeps what was there, when it cannot be sent', async () => {
    const { onChange } = setup(rina, vi.fn(async () => Promise.reject(new Error('The upload was refused (403).'))))
    await userEvent.upload(screen.getByLabelText('Add a photograph of Rina Sen'), file())
    await userEvent.click(within(await placeIt()).getByRole('button', { name: 'Use this photo' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('The upload was refused (403).')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('is changed or taken off once there is one, and taking it off asks first', async () => {
    const { onChange } = setup({ ...rina, photo: PHOTO })
    expect(screen.getByLabelText('Change the photograph of Rina Sen')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Remove the photograph of Rina Sen' }))
    await confirmRemove()
    expect(onChange).toHaveBeenCalledWith(undefined)
  })

  it('sends nothing when the placing is cancelled', async () => {
    const { onChange, send } = setup(rina)
    await userEvent.upload(screen.getByLabelText('Add a photograph of Rina Sen'), file())
    await userEvent.click(within(await placeIt()).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(send).not.toHaveBeenCalled()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('says it shows on the public About page where their name is', () => {
    setup(rina)
    expect(screen.getByText(/on the public About page if it is there/)).toBeInTheDocument()
  })

  it('is not offered for a child, or where there is nowhere to send it', () => {
    const { container } = render(
      <>
        <ProfilePhotoField person={{ name: 'Mira Sen', ageGroup: 'child', age: 7 }} send={async () => PHOTO} onChange={() => {}} />
        <ProfilePhotoField person={rina} send={null} onChange={() => {}} />
      </>,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
