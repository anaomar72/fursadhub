import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { FormField } from '../../src/components/ui/FormField'
import { Input } from '../../src/components/ui/Input'

it('associates the label, hint, error and existing description with the actual input', () => {
  render(<><p id="existing">Use your work address.</p><FormField label="Email" htmlFor="email" hint="We will contact you here." error="Enter a valid email."><Input aria-describedby="existing" /></FormField></>)
  const input = screen.getByRole('textbox', { name: 'Email' })
  expect(input).toHaveAttribute('aria-invalid', 'true')
  expect(input).toHaveAccessibleDescription('Use your work address. We will contact you here. Enter a valid email.')
})
