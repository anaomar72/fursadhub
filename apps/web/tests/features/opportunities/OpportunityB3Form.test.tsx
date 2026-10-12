import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { CreateOpportunityPage } from '../../../src/features/opportunities/pages/CreateOpportunityPage'
import { OrganizationMembershipContext } from '../../../src/features/organization/components/OrganizationMembershipContext'
import i18n from '../../../src/lib/i18n'

/**
 * These tests fill most of a long form one keystroke at a time. `delay: null` drops the timer
 * tick user-event waits between keystrokes (every keyboard and input event still fires, in order),
 * so the suite measures the form's behaviour rather than the machine's scheduler under load.
 * No timeout or assertion is relaxed.
 */
const user = userEvent.setup({ delay: null })

const ORGANIZATION_ID = 'org-1'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

let created: Record<string, unknown> | null = null

function stubApi() {
  created = null
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (init?.method === 'POST' && url.endsWith('/opportunities')) {
        created = JSON.parse(String(init.body))
        return jsonResponse({ id: 'opp-new' })
      }
      return jsonResponse({})
    }),
  )
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/organization/opportunities/new']}>
      <AppProviders>
        <OrganizationMembershipContext.Provider value={{ organizationId: ORGANIZATION_ID, role: 'ORGANIZATION_ADMIN' }}>
          <CreateOpportunityPage />
        </OrganizationMembershipContext.Provider>
      </AppProviders>
    </MemoryRouter>,
  )
}

function setDate(label: string, value: string) {
  const input = screen.getByLabelText(label) as HTMLInputElement
  return user.type(input, value)
}

async function fillRequiredFields() {
  await user.type(screen.getByLabelText('Title'), 'Frontend Intern')
  await user.type(screen.getByLabelText('Description'), 'Build interfaces.')
  await setDate('Start date', '2027-10-01')
  await setDate('End date', '2027-12-31')
  await setDate('Application deadline', '2027-09-20')
}

/**
 * The Backend Phase B3 fields as they appear in the FORM.
 *
 * <p>`opportunityPayload.test.ts` already proves the payload builder in isolation. This asserts the
 * other half — that the controls are actually rendered and wired to it. A pure-function test cannot
 * catch a field set that never reached the page, which is exactly the gap this closes.
 */
describe('Opportunity form — Backend Phase B3 fields', () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
    await i18n.changeLanguage('en')
  })

  it('renders every B3 control', () => {
    stubApi()
    renderPage()

    expect(screen.getByLabelText('How is this internship compensated?')).toBeInTheDocument()
    expect(screen.getByLabelText(/^Hours per week/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Skills/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^What you offer/)).toBeInTheDocument()
  })

  it('offers exactly the four compensation types the backend defines, plus "not stated"', () => {
    stubApi()
    renderPage()

    const select = screen.getByLabelText('How is this internship compensated?') as HTMLSelectElement
    expect(Array.from(select.options).map((option) => option.value)).toEqual([
      '',
      'UNPAID',
      'FIXED',
      'RANGE',
      'NEGOTIABLE',
    ])
  })

  describe('conditional amount fields', () => {
    it('shows no amount at all for UNPAID', async () => {
      stubApi()
      renderPage()

      await user.selectOptions(screen.getByLabelText('How is this internship compensated?'), 'UNPAID')

      expect(screen.queryByLabelText('Amount')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Currency')).not.toBeInTheDocument()
    })

    it('shows a single amount for FIXED and no maximum', async () => {
      stubApi()
      renderPage()

      await user.selectOptions(screen.getByLabelText('How is this internship compensated?'), 'FIXED')

      expect(screen.getByLabelText('Amount')).toBeInTheDocument()
      expect(screen.queryByLabelText('Maximum amount')).not.toBeInTheDocument()
    })

    it('shows both bounds for RANGE', async () => {
      stubApi()
      renderPage()

      await user.selectOptions(screen.getByLabelText('How is this internship compensated?'), 'RANGE')

      expect(screen.getByLabelText('Minimum amount')).toBeInTheDocument()
      expect(screen.getByLabelText('Maximum amount')).toBeInTheDocument()
    })
  })

  /**
   * The whole point of `buildCompensation`: hiding a control does not clear the value React Hook
   * Form still holds for it. This drives the switch through the real UI and asserts the wire.
   */
  it('does not submit a FIXED amount after the type is switched to UNPAID', async () => {
    stubApi()
    renderPage()

    await fillRequiredFields()
    await user.selectOptions(screen.getByLabelText('How is this internship compensated?'), 'FIXED')
    await user.type(screen.getByLabelText('Amount'), '500')
    await user.type(screen.getByLabelText('Currency'), 'USD')
    await user.selectOptions(screen.getByLabelText('Per'), 'MONTH')

    await user.selectOptions(screen.getByLabelText('How is this internship compensated?'), 'UNPAID')
    await user.click(screen.getByRole('button', { name: 'Create draft' }))

    await waitFor(() => expect(created).not.toBeNull())
    expect(created!.compensation).toEqual({ type: 'UNPAID' })
  })

  it('submits skills, perks and hours as entered', async () => {
    stubApi()
    renderPage()

    await fillRequiredFields()
    await user.type(screen.getByLabelText(/^Hours per week/), '20')
    await user.type(screen.getByLabelText(/^Skills/), 'React,TypeScript,')
    await user.type(screen.getByLabelText(/^What you offer/), 'Transport allowance{Enter}')
    await user.click(screen.getByRole('button', { name: 'Create draft' }))

    await waitFor(() => expect(created).not.toBeNull())
    expect(created!.skills).toEqual(['React', 'TypeScript'])
    expect(created!.perks).toEqual(['Transport allowance'])
    expect(created!.hoursPerWeek).toBe(20)
  })

  it('sends an explicit null for hours the organization left blank', async () => {
    stubApi()
    renderPage()

    await fillRequiredFields()
    await user.click(screen.getByRole('button', { name: 'Create draft' }))

    await waitFor(() => expect(created).not.toBeNull())
    expect(created!.hoursPerWeek).toBeNull()
    expect(created!.compensation).toBeNull()
  })

  it('refuses a RANGE missing its upper bound, before spending a request on it', async () => {
    stubApi()
    renderPage()

    await fillRequiredFields()
    await user.selectOptions(screen.getByLabelText('How is this internship compensated?'), 'RANGE')
    await user.type(screen.getByLabelText('Minimum amount'), '300')
    await user.type(screen.getByLabelText('Currency'), 'USD')
    await user.selectOptions(screen.getByLabelText('Per'), 'MONTH')
    await user.click(screen.getByRole('button', { name: 'Create draft' }))

    expect(await screen.findByText('A range needs both a minimum and a maximum.')).toBeInTheDocument()
    expect(created).toBeNull()
  })
})
