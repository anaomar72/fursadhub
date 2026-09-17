import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AboutPage } from '../../src/app/pages/AboutPage'
import { PublicFooter } from '../../src/app/layouts/PublicFooter'
import i18n from '../../src/lib/i18n'

/**
 * The About hero illustration was once invisible in the running application: the skyline asset was
 * dark navy line art on transparency, placed on the navy identity band at `opacity-20` with no
 * filter — dark on dark. It read as a ghost. The fix at the time was a `brightness-0 invert` pair
 * that repainted the art white before drawing it.
 *
 * <p>The asset itself is now the white silhouette (white pixels carrying the original alpha), so
 * the filter pair has gone: it was re-deriving, on every paint, a result that can simply be stored.
 * The INVARIANT these tests protect is unchanged and is the thing that actually decides visibility
 * — light artwork on the navy band, at an opacity that is not a wash. Only the mechanism moved,
 * from a runtime filter to the asset.
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

  it('draws the approved skyline light, so it is visible on the navy band', () => {
    const { container } = renderWithProviders(<AboutPage />)
    const className = skylineOf(container).className

    // The asset is already a white silhouette. Re-darkening it here would recreate the original
    // dark-on-dark defect, so a `brightness-0` without a matching `invert` must never appear.
    const darkens = /\bbrightness-0\b/.test(className) && !/\binvert\b/.test(className)
    expect(darkens, 'skyline must not be darkened on the navy band').toBe(false)

    // And it must not be washed back out. `opacity-20` was the defect.
    const opacity = className.match(/opacity-(\d+)/)
    expect(opacity, 'skyline should declare an explicit opacity').not.toBeNull()
    expect(Number(opacity![1])).toBeGreaterThanOrEqual(35)
  })

  it('ships the silhouette as the asset rather than filtering it at paint time', () => {
    const { container } = renderWithProviders(<AboutPage />)
    const skyline = skylineOf(container)

    // The full-colour source cost 579KB to deliver colour both call sites immediately discarded.
    expect(skyline.getAttribute('src')).toMatch(/\.webp$/)
    expect(skyline.className).not.toMatch(/\bbrightness-0\b/)
  })

  it('carries the same confidence as the approved footer treatment', () => {
    const about = renderWithProviders(<AboutPage />)
    const aboutSkyline = skylineOf(about.container).className
    about.unmount()

    const footer = renderWithProviders(<PublicFooter />)
    const footerSkyline = skylineOf(footer.container).className

    const treatment = (className: string) => ({
      darkened: /\bbrightness-0\b/.test(className),
      opacity: className.match(/opacity-(\d+)/)?.[1],
    })

    expect(treatment(aboutSkyline)).toEqual(treatment(footerSkyline))
  })

  it('keeps the illustration decorative rather than announced to screen readers', () => {
    const { container } = renderWithProviders(<AboutPage />)
    expect(skylineOf(container).getAttribute('alt')).toBe('')
  })
})
