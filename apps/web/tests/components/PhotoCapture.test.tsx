import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PhotoCapture } from '../../src/components/ui/PhotoCapture'
import '../../src/lib/i18n'

describe('explicit photo capture', () => {
  const stop = vi.fn()
  const media = { getTracks: () => [{ stop }] } as unknown as MediaStream
  const getUserMedia = vi.fn()
  beforeEach(() => {
    stop.mockClear(); getUserMedia.mockReset().mockResolvedValue(media)
    vi.stubGlobal('navigator', Object.assign(Object.create(navigator), { mediaDevices: { getUserMedia } }))
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  })
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })
  it('does not request permission until Take photo, and stops on cancel', async () => {
    const onUse = vi.fn()
    render(<PhotoCapture onUse={onUse} />)
    expect(getUserMedia).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Take photo' }))
    await waitFor(() => expect(getUserMedia).toHaveBeenCalledWith({ video: { facingMode: 'user' }, audio: false }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(stop).toHaveBeenCalled()
    expect(onUse).not.toHaveBeenCalled()
  })
  it('stops a camera that resolves after the dialog is cancelled', async () => {
    let resolve!: (stream: MediaStream) => void
    getUserMedia.mockReturnValue(new Promise<MediaStream>((done) => { resolve = done }))
    render(<PhotoCapture onUse={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Take photo' }))
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }))
    await act(async () => resolve(media))
    expect(stop).toHaveBeenCalledOnce()
  })
  it('offers upload fallback on permission denial', async () => {
    getUserMedia.mockRejectedValue(new DOMException('Denied', 'NotAllowedError'))
    render(<PhotoCapture onUse={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Take photo' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('use Upload instead')
  })
  it('stops active tracks on navigation or unmount', async () => {
    const view = render(<PhotoCapture onUse={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Take photo' }))
    await waitFor(() => expect(getUserMedia).toHaveBeenCalled())
    view.unmount()
    expect(stop).toHaveBeenCalled()
  })
  it('keeps captures local through retake and uploads only when Use photo is chosen', async () => {
    const onUse = vi.fn()
    const createUrl = vi.fn().mockReturnValue('blob:captured-photo')
    const revokeUrl = vi.fn()
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: createUrl, revokeObjectURL: revokeUrl }))
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback => callback(new Blob(['photo'], { type: 'image/jpeg' })))
    render(<PhotoCapture onUse={onUse} />)
    await userEvent.click(screen.getByRole('button', { name: 'Take photo' }))
    const video = screen.getByLabelText('Live camera preview')
    fireEvent.loadedData(video)
    await userEvent.click(screen.getByRole('button', { name: 'Capture' }))
    expect(stop).toHaveBeenCalled()
    expect(onUse).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Retake' }))
    expect(revokeUrl).toHaveBeenCalledWith('blob:captured-photo')
    expect(getUserMedia).toHaveBeenCalledTimes(2)
    fireEvent.loadedData(video)
    await userEvent.click(screen.getByRole('button', { name: 'Capture' }))
    await userEvent.click(screen.getByRole('button', { name: 'Use photo' }))
    expect(onUse).toHaveBeenCalledOnce()
    expect(onUse.mock.calls[0][0]).toMatchObject({ name: 'photo.jpg', type: 'image/jpeg' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
