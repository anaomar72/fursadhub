import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import i18n from '../../src/lib/i18n'
import { InstitutionVerificationCue } from '../../src/components/verification/InstitutionVerificationCue'
import { InstitutionVerificationPanel } from '../../src/components/verification/InstitutionVerificationPanel'

/**
 * The verification panel sits ON the profile, beside the upload; the dashboard cue sits elsewhere
 * and links TO the profile. Each must use wording for where it is: the panel must not send someone
 * "to the organization profile" they are already on, and the cue must not say "below" on a
 * dashboard with nothing below it.
 */
const noop = () => {}

function renderPanel(namespace: 'organization' | 'university', status: 'DRAFT' | 'NEEDS_CHANGES') {
  render(
    <InstitutionVerificationPanel
      namespace={namespace}
      status={status}
      hasEvidence={false}
      canManage
      upload={{ onFile: noop, pending: false, error: null }}
      submit={{ onSubmit: noop, pending: false, error: null }}
    />,
  )
}

function renderCue(namespace: 'organization' | 'university', status: 'DRAFT' | 'NEEDS_CHANGES') {
  render(
    <MemoryRouter>
      <InstitutionVerificationCue namespace={namespace} status={status} to={`/${namespace}/profile`} />
    </MemoryRouter>,
  )
}

describe('institution verification guidance follows its context', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it.each(['organization', 'university'] as const)('the %s profile panel points at the upload below it', (namespace) => {
    renderPanel(namespace, 'DRAFT')
    expect(screen.getByText(/document below/i)).toBeInTheDocument()
    expect(screen.queryByText(/on the (organization|university) profile/i)).not.toBeInTheDocument()
  })

  it.each(['organization', 'university'] as const)('the %s dashboard cue points at the profile, never "below"', (namespace) => {
    renderCue(namespace, 'DRAFT')
    expect(screen.getByText(new RegExp(`on the ${namespace} profile`, 'i'))).toBeInTheDocument()
    expect(screen.queryByText(/below/i)).not.toBeInTheDocument()
  })

  it('keeps the changes-requested guidance page-local on the profile', () => {
    renderPanel('organization', 'NEEDS_CHANGES')
    expect(screen.getByText(/Update your organization details or document/i)).toBeInTheDocument()
  })
})
