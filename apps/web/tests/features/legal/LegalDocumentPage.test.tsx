import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LegalDocumentPage } from '../../../src/features/legal/pages/LegalDocumentPage'
import * as legalApi from '../../../src/features/legal/api/legalApi'
import i18n from '../../../src/lib/i18n'

vi.mock('../../../src/features/legal/api/legalApi', () => ({
  getPublicLegalDocument: vi.fn(),
}))

const BODY = 'Section 1.\n\nThese words are the document.\n  Indented sub-clause.'

function view(documentType: 'TERMS' | 'PRIVACY_POLICY' | 'COOKIE_POLICY' = 'TERMS') {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <LegalDocumentPage documentType={documentType} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('legal document page', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await i18n.changeLanguage('en')
  })

  it('renders the published wording verbatim and never as markup', async () => {
    vi.mocked(legalApi.getPublicLegalDocument).mockResolvedValue({
      id: 'doc-1',
      documentType: 'TERMS',
      locale: 'en',
      version: 3,
      title: 'Terms and Conditions',
      body: `${BODY}<script>window.pwned = true</script>`,
      effectiveFrom: '2026-01-01T00:00:00Z',
    } as never)

    view()

    const rendered = await screen.findByText(/These words are the document/)
    // The body reaches the DOM as text, so the tag is visible content rather than an element.
    expect(rendered.textContent).toContain('<script>')
    expect(document.querySelector('script[data-testid]')).toBeNull()
    expect((window as unknown as { pwned?: boolean }).pwned).toBeUndefined()
    expect(await screen.findByRole('heading', { name: 'Terms and Conditions', level: 1 })).toBeInTheDocument()
    // Matched loosely: the date renders in the reader's locale, which the runner does not fix.
    expect(screen.getByText(/Version 3 · effective/)).toBeInTheDocument()
  })

  it('links to the sibling legal documents but not to itself', async () => {
    vi.mocked(legalApi.getPublicLegalDocument).mockResolvedValue({
      id: 'doc-2',
      documentType: 'PRIVACY_POLICY',
      locale: 'en',
      version: 1,
      title: 'Privacy Policy',
      body: BODY,
      effectiveFrom: '2026-01-01T00:00:00Z',
    } as never)

    view('PRIVACY_POLICY')

    expect(await screen.findByRole('link', { name: 'Terms and Conditions' })).toHaveAttribute(
      'href',
      '/legal/terms',
    )
    expect(screen.getByRole('link', { name: 'Cookie Notice' })).toHaveAttribute(
      'href',
      '/legal/cookie-policy',
    )
    expect(screen.queryByRole('link', { name: 'Privacy Policy' })).not.toBeInTheDocument()
  })

  it('says a document is unpublished instead of showing an empty page', async () => {
    const error = Object.assign(new Error('not found'), {
      body: { code: 'LEGAL_DOCUMENT_NOT_FOUND' },
    })
    Object.setPrototypeOf(error, (await import('../../../src/lib/api/client')).ApiError.prototype)
    vi.mocked(legalApi.getPublicLegalDocument).mockRejectedValue(error)

    view('COOKIE_POLICY')

    expect(await screen.findByText('This document has not been published yet.')).toBeInTheDocument()
  })

  it('warns when only the English version exists', async () => {
    await i18n.changeLanguage('so')
    vi.mocked(legalApi.getPublicLegalDocument).mockResolvedValue({
      id: 'doc-3',
      documentType: 'TERMS',
      locale: 'en',
      version: 1,
      title: 'Terms and Conditions',
      body: BODY,
      effectiveFrom: '2026-01-01T00:00:00Z',
    } as never)

    view()

    expect(await screen.findByRole('status')).toBeInTheDocument()
  })
})
