import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from '../../src/components/ui'

describe('Button', () => {
  it('invokes onClick when enabled', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Submit</Button>)

    await userEvent.click(screen.getByRole('button', { name: 'Submit' }))

    expect(onClick).toHaveBeenCalledOnce()
  })

  it('disables the button and does not fire onClick while loading', async () => {
    const onClick = vi.fn()
    render(
      <Button onClick={onClick} loading>
        Submit
      </Button>,
    )

    const button = screen.getByRole('button', { name: 'Submit' })
    expect(button).toBeDisabled()

    await userEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })
})
