import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Reveal } from '../../src/components/ui'

/** Captures the observer so a test can decide when the element "enters the viewport". */
function stubObserver() {
  const instances: { callback: IntersectionObserverCallback; disconnect: () => void }[] = []
  const disconnect = vi.fn()
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: IntersectionObserverCallback) {
        instances.push({ callback, disconnect })
      }
      observe() {}
      unobserve() {}
      disconnect = disconnect
    },
  )
  return { instances, disconnect }
}

afterEach(() => vi.unstubAllGlobals())

describe('public scroll reveal', () => {
  it('renders its content immediately, hidden only by opacity', () => {
    stubObserver()
    render(<Reveal>Featured internships</Reveal>)

    // In the DOM and in the accessibility tree from first paint — a reveal must never gate content
    // behind an observer that might not fire.
    expect(screen.getByText('Featured internships')).toBeInTheDocument()
  })

  it('reveals once and then stops observing', () => {
    const { instances, disconnect } = stubObserver()
    const { container } = render(<Reveal>Content</Reveal>)

    const element = container.firstElementChild!
    expect(element).toHaveClass('fh-reveal')
    expect(element).not.toHaveClass('fh-reveal-in')

    act(() => {
      instances[0].callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver)
    })

    expect(element).toHaveClass('fh-reveal-in')
    // Reveal-once: scrolling back up must not replay it, and a section near the fold must not
    // flicker as the page settles.
    expect(disconnect).toHaveBeenCalled()
  })

  it('is visible from the start when the browser cannot observe', () => {
    // Degrade to shown, never to hidden — a crawler, a print stylesheet or an old browser must
    // still get the content.
    vi.stubGlobal('IntersectionObserver', undefined)
    const { container } = render(<Reveal>Content</Reveal>)
    expect(container.firstElementChild).toHaveClass('fh-reveal-in')
  })

  it('caps the stagger so a late card never waits noticeably longer than an early one', () => {
    const { instances } = stubObserver()
    const { container } = render(<Reveal index={40}>Content</Reveal>)

    act(() => {
      instances[0].callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver)
    })

    const delay = (container.firstElementChild as HTMLElement).style.transitionDelay
    expect(delay).toBe('240ms')
  })

  it('renders as the element the layout needs, so a list item stays a list item', () => {
    stubObserver()
    const { container } = render(
      <ul>
        <Reveal as="li">Card</Reveal>
      </ul>,
    )
    expect(container.querySelector('li')).toHaveClass('fh-reveal')
  })
})
