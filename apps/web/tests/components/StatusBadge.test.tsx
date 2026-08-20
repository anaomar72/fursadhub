import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatusBadge } from '../../src/components/ui'

describe('StatusBadge', () => {
  it('always renders explicit text so status is never conveyed by color alone', () => {
    render(<StatusBadge tone="success">Verified</StatusBadge>)
    expect(screen.getByText('Verified')).toBeInTheDocument()
  })
})
