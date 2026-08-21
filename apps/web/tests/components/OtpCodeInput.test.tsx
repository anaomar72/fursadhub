import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { OtpCodeInput } from '../../src/components/ui'

function Harness({ onComplete }: { onComplete?: (value: string) => void }) {
  const [value, setValue] = useState('')
  return <OtpCodeInput value={value} onChange={setValue} onComplete={onComplete} label="Verification code" />
}

describe('OtpCodeInput', () => {
  it('accepts only digits and advances focus per box', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    const boxes = screen.getAllByLabelText(/verification code —/i)
    await user.type(boxes[0], 'a1')

    expect(boxes[0]).toHaveValue('1')
    expect(boxes[1]).toHaveFocus()
  })

  it('fills all boxes from a pasted 4-digit code', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    const boxes = screen.getAllByLabelText(/verification code —/i)
    boxes[0].focus()
    await user.paste('1234')

    expect(boxes.map((box) => (box as HTMLInputElement).value)).toEqual(['1', '2', '3', '4'])
  })

  it('moves focus back and clears the previous box on backspace from an empty box', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    const boxes = screen.getAllByLabelText(/verification code —/i)
    await user.type(boxes[0], '1')
    expect(boxes[1]).toHaveFocus()

    await user.keyboard('{Backspace}')

    expect(boxes[0]).toHaveFocus()
    expect(boxes[0]).toHaveValue('')
  })

  it('calls onComplete exactly once when the 4th digit is entered', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    render(<Harness onComplete={onComplete} />)

    const boxes = screen.getAllByLabelText(/verification code —/i)
    await user.type(boxes[0], '1')
    await user.type(boxes[1], '2')
    await user.type(boxes[2], '3')
    await user.type(boxes[3], '4')

    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete).toHaveBeenCalledWith('1234')
  })
})
