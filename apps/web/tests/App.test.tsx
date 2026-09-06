import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from '../src/App'

describe('App', () => {
  it('renders the FursadHub home page through the full provider/router stack', async () => {
    render(<App />)

    // The approved landing headline (design-reference/presentation-refresh-2026, reference 01).
    expect(await screen.findByRole('heading', { name: /Find Internships\./ })).toBeInTheDocument()
    expect(screen.getAllByText(/FursadHub/).length).toBeGreaterThan(0)
  })
})
