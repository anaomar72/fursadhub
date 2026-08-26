import { render, screen } from '@testing-library/react'
import { describe, expect, it, beforeEach } from 'vitest'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { CompletionChecklist } from '../../../src/features/placements/components/CompletionChecklist'
import i18n from '../../../src/lib/i18n'
import type {
  CompletionRequirementResponse,
  CompletionRequirementType,
  CompletionStatusResponse,
} from '../../../src/features/placements/types'

function requirement(
  type: CompletionRequirementType,
  overrides: Partial<CompletionRequirementResponse> = {},
): CompletionRequirementResponse {
  return {
    type,
    required: false,
    satisfied: true,
    detail: null,
    unmetCode: `${type}_INCOMPLETE`,
    ...overrides,
  }
}

function status(overrides: Partial<CompletionStatusResponse> = {}): CompletionStatusResponse {
  return {
    canComplete: false,
    policySource: 'UNIVERSITY',
    requirements: [
      requirement('WEEKLY_LOGS'),
      requirement('ATTENDANCE'),
      requirement('ORGANIZATION_EVALUATION'),
      requirement('FINAL_REPORT'),
      requirement('DEFENSE'),
    ],
    ...overrides,
  }
}

function renderChecklist(value: CompletionStatusResponse) {
  return render(
    <AppProviders>
      <CompletionChecklist status={value} />
    </AppProviders>,
  )
}

describe('CompletionChecklist', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('shows only the requirements this placement actually has', () => {
    renderChecklist(
      status({
        requirements: [
          requirement('WEEKLY_LOGS', { required: true, satisfied: true, detail: '12/12' }),
          requirement('FINAL_REPORT', { required: true, satisfied: false, detail: 'SUBMITTED' }),
          // Disabled requirements must be absent entirely — not rendered as unmet items, which
          // would tell the student they owe work nobody asked for.
          requirement('ATTENDANCE'),
          requirement('DEFENSE'),
          requirement('ORGANIZATION_EVALUATION'),
        ],
      }),
    )

    expect(screen.getByText('Weekly logs reviewed')).toBeInTheDocument()
    expect(screen.getByText('Final report approved')).toBeInTheDocument()
    expect(screen.queryByText('Attendance settled')).not.toBeInTheDocument()
    expect(screen.queryByText('Defense passed')).not.toBeInTheDocument()
    expect(screen.queryByText('Organization evaluation finalized')).not.toBeInTheDocument()
  })

  it('labels each requirement with its state rather than relying on colour', () => {
    renderChecklist(
      status({
        requirements: [
          requirement('WEEKLY_LOGS', { required: true, satisfied: true, detail: '12/12' }),
          requirement('DEFENSE', { required: true, satisfied: false, detail: 'MISSING' }),
        ],
      }),
    )

    // The accessible label carries the state, so the row reads correctly without seeing the tone.
    expect(screen.getByLabelText('Weekly logs reviewed: completed')).toBeInTheDocument()
    expect(screen.getByLabelText('Defense passed: outstanding')).toBeInTheDocument()
  })

  it('translates a known machine-readable detail and passes an unknown one through', () => {
    renderChecklist(
      status({
        requirements: [
          requirement('FINAL_REPORT', { required: true, satisfied: false, detail: 'MISSING' }),
          requirement('WEEKLY_LOGS', { required: true, satisfied: false, detail: '3/12' }),
        ],
      }),
    )

    expect(screen.getByText('not started')).toBeInTheDocument()
    // A count has no translation key and is rendered verbatim rather than swallowed.
    expect(screen.getByText('3/12')).toBeInTheDocument()
  })

  it('says the internship has no requirements when the policy enables none', () => {
    renderChecklist(status({ canComplete: true, policySource: 'PLATFORM_DEFAULT' }))

    expect(screen.getByText('This internship has no completion requirements.')).toBeInTheDocument()
    expect(screen.getByText('Ready to complete')).toBeInTheDocument()
  })

  it('counts the outstanding requirements in the summary badge', () => {
    renderChecklist(
      status({
        requirements: [
          requirement('WEEKLY_LOGS', { required: true, satisfied: false }),
          requirement('FINAL_REPORT', { required: true, satisfied: false }),
          requirement('DEFENSE', { required: true, satisfied: true }),
        ],
      }),
    )

    expect(screen.getByText('2 outstanding')).toBeInTheDocument()
  })

  it('renders the Somali labels when the language is Somali', async () => {
    await i18n.changeLanguage('so')

    renderChecklist(
      status({
        requirements: [requirement('FINAL_REPORT', { required: true, satisfied: false, detail: null })],
      }),
    )

    expect(screen.getByText('Dhammaystirka tababarka')).toBeInTheDocument()
    expect(screen.getByText('Warbixinta ugu dambaysa waa la ansixiyay')).toBeInTheDocument()

    await i18n.changeLanguage('en')
  })
})
