import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AboutPage } from '../../src/app/pages/AboutPage'
import { PublicFooter } from '../../src/app/layouts/PublicFooter'
import i18n from '../../src/lib/i18n'

/**
 * The About hero illustration was invisible in the running application: the skyline asset is dark
 * navy line art on transparency, and it was placed on the navy identity band at `opacity-20` with
 * no filter — dark on dark. It read as a ghost.
 *
 * The approved footer inverts the same asset to a white silhouette before showing it. These
 * assertions pin the two properties that actually decide visibility — the inversion, and an opacity
 * that is not a wash — so the treatment cannot silently regress to dark-on-dark again.
 */
function renderWithProviders(ui: React.ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </MemoryRouter>,
  )
}

function skylineOf(container: HTMLElement): HTMLImageElement {
  const images = [...container.querySelectorAll('img')] as HTMLImageElement[]
  const skyline = images.find((image) => /skyline/i.test(image.getAttribute('src') ?? ''))
  if (!skyline) throw new Error('no skyline illustration rendered')
  return skyline
}

describe('About page illustration visibility', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('renders the approved skyline inverted, so it is visible on the navy band', () => {
    const { container } = renderWithProviders(<AboutPage />)
    const skyline = skylineOf(container)
    const className = skyline.className

    // Inversion is the property that makes dark line art readable on a dark ground.
    expect(className).toMatch(/\bbrightness-0\b/)
    expect(className).toMatch(/\binvert\b/)

    // And it must not be washed back out. `opacity-20` was the defect.
    const opacity = className.match(/opacity-(\d+)/)
    expect(opacity, 'skyline should declare an explicit opacity').not.toBeNull()
    expect(Number(opacity![1])).toBeGreaterThanOrEqual(35)
  })

  it('carries the same confidence as the approved footer treatment', () => {
    const about = renderWithProviders(<AboutPage />)
    const aboutSkyline = skylineOf(about.container).className
    about.unmount()

    const footer = renderWithProviders(<PublicFooter />)
    const footerSkyline = skylineOf(footer.container).className

    const treatment = (className: string) => ({
      inverted: /\bbrightness-0\b/.test(className) && /\binvert\b/.test(className),
      opacity: className.match(/opacity-(\d+)/)?.[1],
    })

    expect(treatment(aboutSkyline)).toEqual(treatment(footerSkyline))
  })

  it('keeps the illustration decorative rather than announced to screen readers', () => {
    const { container } = renderWithProviders(<AboutPage />)
    expect(skylineOf(container).getAttribute('alt')).toBe('')
  })
})
