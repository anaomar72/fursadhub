import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { HomePage } from '../../src/app/pages/HomePage'
import i18n from '../../src/lib/i18n'

describe('approved public home page', () => {
  afterEach(async () => { await act(() => i18n.changeLanguage('en')) })

  it('uses supported public and registration routes', () => {
    render(<MemoryRouter><HomePage /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'Find an Internship' })).toHaveAttribute('href', '/opportunities')
    expect(screen.getByRole('link', { name: 'Get Started' })).toHaveAttribute('href', '/register')
    expect(screen.getByRole('heading', { name: 'How FursadHub Works' })).toBeInTheDocument()
  })

  it('renders the complete hero and ecosystem in Somali', async () => {
    await act(() => i18n.changeLanguage('so'))
    render(<MemoryRouter><HomePage /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Isku xidh. Baro. Koboc.' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sida FursadHub u Shaqayso' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Hel Tababar' })).toHaveAttribute('href', '/opportunities')
  })
})
