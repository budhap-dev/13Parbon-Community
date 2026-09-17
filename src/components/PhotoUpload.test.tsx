import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PhotoUpload } from './PhotoUpload'

const jpeg = () => new File([new Uint8Array([1, 2, 3])], 'holi.jpg', { type: 'image/jpeg' })
const heic = () => new File([new Uint8Array([1])], 'IMG_0421.heic', { type: 'image/heic' })

/** jsdom has no canvas, so the preparing is stubbed where the real thing needs one. */
function stubPrepare() {
  const clean = new Uint8Array([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x04, 0x41, 0x41, 0xff, 0xda, 0x00, 0x02, 0x11, 0xff, 0xd9])
  vi.stubGlobal('createImageBitmap', async () => ({ width: 4000, height: 3000, close: vi.fn() }))
  // toBlob and arrayBuffer, the two bits of the browser the preparing leans on.
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({ drawImage: vi.fn() })) as never
  HTMLCanvasElement.prototype.toBlob = function (cb: BlobCallback) {
    cb(new Blob([clean], { type: 'image/jpeg' }))
  } as never
  Blob.prototype.arrayBuffer = async function () {
    return clean.buffer.slice(0) as ArrayBuffer
  }
  URL.createObjectURL = vi.fn(() => 'blob:preview')
}

describe('choosing a photograph', () => {
  it('says which formats it takes, before anybody tries', () => {
    render(<PhotoUpload canSend onSend={vi.fn()} onDone={vi.fn()} />)
    expect(screen.getByText('JPG, JPEG and PNG')).toBeInTheDocument()
  })

  it('turns one down by name, and does not pretend to have taken it', async () => {
    render(<PhotoUpload canSend onSend={vi.fn()} onDone={vi.fn()} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement

    // Fired directly: userEvent honours the accept attribute and would not let this through,
    // but a picker set to "All files" will, which is exactly why the guard is there.
    fireEvent.change(input, { target: { files: [heic()] } })

    // Somebody dragging photographs off an iPhone is the likeliest person to meet this.
    expect(await screen.findByRole('alert')).toHaveTextContent(/IMG_0421\.heic/)
    expect(screen.getByRole('alert')).toHaveTextContent(/JPG, JPEG and PNG/)
  })
})

describe('once it is ready', () => {
  it('says the location, camera and date are gone, and why', async () => {
    stubPrepare()
    render(<PhotoUpload canSend onSend={vi.fn()} onDone={vi.fn()} />)
    await userEvent.upload(document.querySelector('input[type="file"]') as HTMLInputElement, jpeg())

    const note = await screen.findByText(/No location, camera or date/)
    // Not "stripped": the picture was re-made, so there was never any to carry.
    expect(note.closest('p')).toHaveTextContent(/re-made here, so there was none to carry/)
  })

  it('shows the size it settled on', async () => {
    stubPrepare()
    render(<PhotoUpload canSend onSend={vi.fn()} onDone={vi.fn()} />)
    await userEvent.upload(document.querySelector('input[type="file"]') as HTMLInputElement, jpeg())

    expect(await screen.findByText(/1600×1200/)).toBeInTheDocument()
  })

  it('sends it and hands back where it landed', async () => {
    stubPrepare()
    const onSend = vi.fn(async () => ({ url: 'https://photos.example/full/x.jpg' }))
    const onDone = vi.fn()
    render(<PhotoUpload canSend onSend={onSend} onDone={onDone} />)
    await userEvent.upload(document.querySelector('input[type="file"]') as HTMLInputElement, jpeg())

    await userEvent.click(await screen.findByRole('button', { name: 'Put it in the bucket' }))
    await waitFor(() => expect(onDone).toHaveBeenCalledWith('https://photos.example/full/x.jpg'))
  })
})

describe('a whole evening at once', () => {
  const named = (name: string) => new File([new Uint8Array([1, 2, 3])], name, { type: 'image/jpeg' })

  it('takes several, and sends them in order with their place in the batch', async () => {
    stubPrepare()
    const onSend = vi.fn(async (_p: unknown, name: string, _index: number) => ({
      url: `https://photos.example/full/${name}.jpg`,
    }))
    const onDone = vi.fn()
    render(<PhotoUpload canSend multiple onSend={onSend} onDone={onDone} />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, [named('one.jpg'), named('two.jpg'), named('three.jpg')])

    await userEvent.click(await screen.findByRole('button', { name: 'Put all 3 in the bucket' }))
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(3))

    /*
     * The index is the whole point. The album has not grown by the time the second is signed,
     * so a caller numbering keys from its length alone would hand all three the same number and
     * the bucket would keep only the last.
     */
    expect(onSend.mock.calls.map((call) => [call[1], call[2]])).toEqual([
      ['one.jpg', 0],
      ['two.jpg', 1],
      ['three.jpg', 2],
    ])
  })

  it('keeps the rest when one of them will not go', async () => {
    stubPrepare()
    const onSend = vi.fn(async (_p: unknown, name: string) => {
      if (name === 'two.jpg') throw new Error('That photograph would not upload (500).')
      return { url: `https://photos.example/full/${name}.jpg` }
    })
    const onDone = vi.fn()
    render(<PhotoUpload canSend multiple onSend={onSend} onDone={onDone} />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, [named('one.jpg'), named('two.jpg'), named('three.jpg')])
    await userEvent.click(await screen.findByRole('button', { name: 'Put all 3 in the bucket' }))

    // The two that worked are gone from the list; the one that did not says so and stays.
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(2))
    // Named, because it is one of several: "that photograph" does not say which to try again.
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/would not upload/)
    expect(alert).toHaveTextContent(/two\.jpg/)
  })

  it('takes one only, where one is the right number', async () => {
    stubPrepare()
    render(<PhotoUpload canSend onSend={vi.fn()} onDone={vi.fn()} />)
    // The event cover is a single photograph, so the picker does not offer a multiple selection.
    expect(document.querySelector('input[type="file"]')).not.toHaveAttribute('multiple')
  })
})

describe('when there is nowhere to put it', () => {
  it('offers no button, and says what to do instead', async () => {
    stubPrepare()
    render(<PhotoUpload canSend={false} onSend={vi.fn()} onDone={vi.fn()} />)
    await userEvent.upload(document.querySelector('input[type="file"]') as HTMLInputElement, jpeg())

    await screen.findByText(/No location, camera or date/)
    expect(screen.queryByRole('button', { name: 'Put it in the bucket' })).not.toBeInTheDocument()
    // Everything up to the sending is real, and it says so rather than looking broken.
    expect(screen.getByRole('status')).toHaveTextContent(/prepare-photos\.mjs/)
  })
})
