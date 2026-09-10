import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { LineChart } from '../../src/components/ui/LineChart'

const POINTS = [
  { label: 'Jan', fullLabel: 'January 2026', value: 4 },
  { label: 'Feb', fullLabel: 'February 2026', value: 9 },
  { label: 'Mar', fullLabel: 'March 2026', value: 2 },
]

function renderChart(points = POINTS) {
  return render(
    <LineChart
      points={points}
      seriesLabel="Month"
      caption="Recorded events per month"
      valueLabel="Events"
      tableLabel="Show the numbers"
      emptyLabel="Nothing recorded yet."
    />,
  )
}

describe('LineChart', () => {
  it('names the series through its caption rather than a legend', () => {
    renderChart()

    // One series needs no legend box — the accessible name identifies it.
    expect(screen.getByRole('img', { name: 'Recorded events per month' })).toBeInTheDocument()
  })

  it('offers the same numbers as a real table', async () => {
    renderChart()

    await userEvent.click(screen.getByRole('button', { name: 'Show the numbers' }))
    const table = screen.getByRole('table')

    expect(within(table).getByText('January 2026')).toBeInTheDocument()
    expect(within(table).getByText('9')).toBeInTheDocument()
  })

  it('keeps the table collapsed until asked', () => {
    renderChart()
    expect(screen.getByRole('button', { name: 'Show the numbers' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })

  it('says so instead of drawing an empty plot', () => {
    renderChart([])
    expect(screen.getByText('Nothing recorded yet.')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('draws a flat baseline rather than dividing by zero when every value is zero', () => {
    const { container } = renderChart(POINTS.map((point) => ({ ...point, value: 0 })))
    const polyline = container.querySelector('polyline')

    expect(polyline).not.toBeNull()
    expect(polyline!.getAttribute('points')).not.toMatch(/NaN/)
  })

  it('scales to its container rather than forcing the page to scroll', () => {
    const { container } = renderChart()
    const svg = container.querySelector('svg')!

    expect(svg.getAttribute('viewBox')).toBeTruthy()
    expect(svg.getAttribute('width')).toBeNull()
  })

  it('takes its colour from a theme token, not a baked-in hex', () => {
    const { container } = renderChart()
    const polyline = container.querySelector('polyline')!

    // The dark step is a chosen token value, so the mark must never hardcode a colour.
    expect(polyline.getAttribute('stroke')).toBe('var(--color-chart-series)')
  })

  it('handles a single point without collapsing the x scale', () => {
    const { container } = renderChart([POINTS[0]])
    const circle = container.querySelector('circle')!

    expect(circle.getAttribute('cx')).not.toMatch(/NaN/)
  })
})
