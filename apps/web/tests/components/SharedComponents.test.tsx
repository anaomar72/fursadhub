import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { PasswordInput, Switch, ThemeToggle } from '../../src/components/ui'
import { ThemeProvider } from '../../src/lib/theme/ThemeProvider'
import '../../src/lib/i18n'

describe('shared interactive components', () => {
  it('reveals and hides a password accessibly', async () => {
    const user = userEvent.setup()
    render(<PasswordInput aria-label="Password" defaultValue="secret" />)
    const input = screen.getByLabelText('Password')
    expect(input).toHaveAttribute('type', 'password')
    await user.click(screen.getByRole('button', { name: 'Show password' }))
    expect(input).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeInTheDocument()
  })

  it('exposes switch state and keyboard interaction', async () => {
    const user = userEvent.setup()
    function Example() {
      const [checked, setChecked] = useState(false)
      return <Switch label="Email notifications" checked={checked} onCheckedChange={setChecked} />
    }
    render(<Example />)
    const control = screen.getByRole('switch', { name: 'Email notifications' })
    expect(control).toHaveAttribute('aria-checked', 'false')
    control.focus()
    await user.keyboard('[Space]')
    expect(control).toHaveAttribute('aria-checked', 'true')
  })

  it('uses the Phase 1 theme provider', async () => {
    const user = userEvent.setup()
    render(<ThemeProvider><ThemeToggle /></ThemeProvider>)
    await user.click(screen.getByRole('button', { name: 'Use dark theme' }))
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(screen.getByRole('button', { name: 'Use light theme' })).toBeInTheDocument()
  })
})
