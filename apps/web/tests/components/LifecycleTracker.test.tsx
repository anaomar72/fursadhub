import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import i18n from '../../src/lib/i18n'
import { LifecycleTracker } from '../../src/components/ui'

describe('LifecycleTracker', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  const steps = [
    { id: 'a', label: 'Placement confirmed', state: 'complete' as const },
    { id: 'b', label: 'Weekly logs', state: 'attention' as const, group: 'req', description: '1 of 10 weeks reviewed' },
    { id: 'c', label: 'Final report', state: 'current' as const, group: 'req' },
    { id: 'd', label: 'Completion', state: 'upcoming' as const },
    { id: 'e', label: 'Defense', state: 'notReached' as const },
  ]

  it('is a named list whose every step states its state in words, not only colour', () => {
    render(<LifecycleTracker label="Internship progress" steps={steps} groups={{ req: 'Requirements — in any order' }} />)
    const tracker = screen.getByRole('list', { name: 'Internship progress' })
    expect(within(tracker).getByText('Placement confirmed')).toHaveTextContent('(completed)')
    expect(within(tracker).getByText('Weekly logs')).toHaveTextContent('(needs attention)')
    expect(within(tracker).getByText('Final report')).toHaveTextContent('(in progress)')
    expect(within(tracker).getByText('Completion')).toHaveTextContent('(not started)')
    expect(within(tracker).getByText('Defense')).toHaveTextContent('(not reached)')
    expect(within(tracker).getByText('1 of 10 weeks reviewed')).toBeInTheDocument()
  })

  it('draws grouped steps as one unordered set under the group heading, without numbering them', () => {
    render(<LifecycleTracker label="Internship progress" steps={steps} groups={{ req: 'Requirements — in any order' }} />)
    const heading = screen.getByText('Requirements — in any order')
    const group = heading.parentElement!
    expect(within(group).getByText('Weekly logs')).toBeInTheDocument()
    expect(within(group).getByText('Final report')).toBeInTheDocument()
    expect(within(group).queryByText('Completion')).not.toBeInTheDocument()
    expect(screen.queryByText(/^\d+$/)).not.toBeInTheDocument()
  })

  it('takes no focus of its own', () => {
    const { container } = render(<LifecycleTracker label="Progress" steps={steps} />)
    expect(container.querySelectorAll('a, button, [tabindex]')).toHaveLength(0)
  })

  it('reads its state words in Somali', async () => {
    await i18n.changeLanguage('so')
    render(<LifecycleTracker label="Horumarka" steps={[steps[0]]} />)
    expect(screen.getByText('Placement confirmed')).toHaveTextContent('(la dhammeeyay)')
    await i18n.changeLanguage('en')
  })
})
