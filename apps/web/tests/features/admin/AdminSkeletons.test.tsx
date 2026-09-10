import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  AdminChartSkeleton,
  AdminDetailSkeleton,
  AdminListSkeleton,
  AdminMetricsSkeleton,
  AdminTableSkeleton,
} from '../../../src/features/admin/components/AdminSkeletons'
import '../../../src/lib/i18n'

/**
 * Phase E. The platform console's loading treatment.
 *
 * <p>The console used to show one centred spinner in a bordered box on every page, which told the
 * reader nothing about what was arriving and resized the page when it was replaced. These assert the
 * two properties that make a skeleton worth having over a spinner: it is shaped like the thing being
 * fetched, and it announces itself once rather than once per bar.
 */

describe('platform console loading placeholders', () => {
  it('shapes the table placeholder like the table it stands in for', () => {
    const { container } = render(<AdminTableSkeleton columns={5} rows={4} />)

    // One header band of 5, then 4 rows of 5 — the geometry DataTable actually renders.
    const bars = container.querySelectorAll('[aria-hidden="true"]')
    expect(bars).toHaveLength(5 + 4 * 5)
  })

  it('announces a whole placeholder block once, not once per bar', () => {
    render(<AdminTableSkeleton columns={6} rows={8} />)

    // 54 decorative bars, one announcement. A screen reader must not hear "Loading" 54 times.
    expect(screen.getAllByRole('status')).toHaveLength(1)
  })

  it.each([
    ['metrics', <AdminMetricsSkeleton key="m" />],
    ['detail', <AdminDetailSkeleton key="d" />],
    ['chart', <AdminChartSkeleton key="c" />],
    ['list', <AdminListSkeleton key="l" />],
  ])('the %s placeholder is a single labelled region', (_name, element) => {
    render(element)
    expect(screen.getAllByRole('status')).toHaveLength(1)
  })

  it('drops its pulse under reduced motion', () => {
    const { container } = render(<AdminChartSkeleton />)
    const bar = container.querySelector('[aria-hidden="true"]')
    expect(bar?.className).toContain('motion-reduce:animate-none')
  })
})

describe('no platform page falls back to the generic spinner', () => {
  /*
   * Source-level, because the alternative is standing up fifteen pages' queries to observe a state
   * that lasts milliseconds. The rule being pinned is a rule about the code: the admin console
   * reaches for a shaped placeholder, never the generic centred spinner it used to use everywhere.
   */
  const adminRoot = resolve(process.cwd(), 'src/features/admin')

  const sources = ['pages', 'components'].flatMap((dir) =>
    readdirSync(resolve(adminRoot, dir))
      .filter((name) => name.endsWith('.tsx'))
      .map((name) => [`${dir}/${name}`, readFileSync(resolve(adminRoot, dir, name), 'utf8')] as const),
  )

  it('finds admin sources to check', () => {
    expect(sources.length).toBeGreaterThan(10)
  })

  it.each(sources)('%s renders no <LoadingState>', (_path, source) => {
    expect(source).not.toContain('<LoadingState')
  })
})
