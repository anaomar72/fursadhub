import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from '../src/App'

describe('App', () => {
  it('renders the FursadHub home page through the full provider/router stack', async () => {
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Opening doors to your future.' })).toBeInTheDocument()
    expect(screen.getAllByText(/FursadHub/).length).toBeGreaterThan(0)
  })
})
