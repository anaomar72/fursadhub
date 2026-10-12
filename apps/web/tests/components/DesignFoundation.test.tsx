import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import i18n from '../../src/lib/i18n'
import {
  Card,
  EmptyState,
  ErrorState,
  FormField,
  FormSection,
  Input,
  Metric,
  PageHeader,
  Panel,
  SkeletonPanel,
  StatusBadge,
} from '../../src/components/ui'
import { PublicContainer } from '../../src/app/layouts/PublicContainer'
import { ACCOUNT_STATUS_TONE, INSTITUTION_VERIFICATION_TONE, PRIVACY_REQUEST_TONE, toneOf } from '../../src/lib/status/statusTones'
import { USER_STATUS_TONE, INSTITUTION_STATUS_TONE } from '../../src/features/admin/statusTone'

afterEach(async () => {
  await i18n.changeLanguage('en')
})

describe('PageHeader', () => {
  it('is the page’s single h1, with a way back named by its destination', () => {
    render(
      <MemoryRouter>
        <PageHeader
          eyebrow="Platform"
          title="Accounts"
          description="Every account on FursadHub."
          back={{ to: '/admin/dashboard', label: 'Platform overview' }}
          actions={<button type="button">Export</button>}
        />
      </MemoryRouter>,
    )
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Accounts' })).toHaveClass('text-title-page', 'text-foreground')
    expect(screen.getByRole('link', { name: 'Platform overview' })).toHaveAttribute('href', '/admin/dashboard')
  })

  it('wraps its actions and lets them share the width on a phone, never clipping them', () => {
    render(<PageHeader title="Staff" actions={<button type="button">Create staff account</button>} />)
    const row = screen.getByRole('button', { name: 'Create staff account' }).parentElement!
    expect(row).toHaveClass('flex-wrap', 'max-sm:w-full')
  })

  it('carries no theme-specific text overrides — headings resolve through semantic tokens', () => {
    const { container } = render(<PageHeader eyebrow="Verification" title="Cases" />)
    expect(container.innerHTML).not.toMatch(/dark:/)
  })
})

describe('Panel and SectionHeading', () => {
  it('is a section named by its own title, with header action and footer', () => {
    render(
      <Panel title="Recent applications" description="The last five." action={<a href="/x">View all</a>} footer="Updated now">
        <p>Body</p>
      </Panel>,
    )
    const region = screen.getByRole('region', { name: 'Recent applications' })
    expect(within(region).getByRole('heading', { level: 2, name: 'Recent applications' })).toHaveClass('text-title-panel')
    expect(within(region).getByRole('link', { name: 'View all' })).toBeInTheDocument()
    expect(within(region).getByText('Updated now')).toBeInTheDocument()
  })

  it('is static — a border and no shadow', () => {
    render(<Panel title="Documents">x</Panel>)
    const region = screen.getByRole('region', { name: 'Documents' })
    expect(region.className).not.toMatch(/shadow/)
    expect(region).toHaveClass('border')
  })
})

describe('Card elevation', () => {
  it('gives a static card no shadow and an interactive card a resting one', () => {
    render(
      <>
        <Card data-testid="static">a</Card>
        <Card data-testid="interactive" interactive>
          b
        </Card>
      </>,
    )
    expect(screen.getByTestId('static').className).not.toMatch(/shadow/)
    expect(screen.getByTestId('interactive')).toHaveClass('shadow-xs', 'hover:shadow-md')
  })
})

describe('Metric', () => {
  it('names its link by label and value', () => {
    render(
      <MemoryRouter>
        <Metric label="Applications" value={12} context="Across 3 internships" to="/organization/candidates" />
      </MemoryRouter>,
    )
    const link = screen.getByRole('link')
    expect(link).toHaveAccessibleName(/Applications\s*12/)
    expect(screen.getByText('12')).toHaveClass('text-metric', 'tabular-nums')
  })
})

describe('FormField', () => {
  it('marks optional fields with a translated word rather than an asterisk', async () => {
    const { rerender } = render(
      <FormField label="Website" htmlFor="website" optional>
        <Input />
      </FormField>,
    )
    expect(screen.getByText('Optional')).toBeInTheDocument()
    expect(screen.queryByText('*')).not.toBeInTheDocument()

    await i18n.changeLanguage('so')
    rerender(
      <FormField label="Website" htmlFor="website" optional>
        <Input />
      </FormField>,
    )
    expect(screen.getByText('Ikhtiyaari')).toBeInTheDocument()
  })

  it('exposes required fields to assistive technology', () => {
    render(
      <FormField label="Email" htmlFor="email" required>
        <Input />
      </FormField>,
    )
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAttribute('aria-required', 'true')
  })

  it('describes a success confirmation, and lets an error replace it', () => {
    const { rerender } = render(
      <FormField label="Username" htmlFor="username" success="Username is available.">
        <Input />
      </FormField>,
    )
    expect(screen.getByRole('textbox', { name: 'Username' })).toHaveAccessibleDescription('Username is available.')

    rerender(
      <FormField label="Username" htmlFor="username" success="Username is available." error="Choose another username.">
        <Input />
      </FormField>,
    )
    expect(screen.queryByText('Username is available.')).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Username' })).toHaveAccessibleDescription('Choose another username.')
  })

  it('draws controls with the strong border (WCAG 1.4.11), not the hairline', () => {
    render(<Input aria-label="Name" />)
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveClass('border-border-strong', 'h-10')
  })
})

describe('FormSection', () => {
  it('is a named group whose description is announced with it', () => {
    render(
      <FormSection title="Contact" description="How students reach you.">
        <FormField label="Phone" htmlFor="phone">
          <Input />
        </FormField>
      </FormSection>,
    )
    const group = screen.getByRole('group', { name: 'Contact' })
    expect(group).toHaveAccessibleDescription('How students reach you.')
    expect(within(group).getByRole('textbox', { name: 'Phone' })).toBeInTheDocument()
  })
})

describe('ErrorState', () => {
  it('has an inline variant for one failed section — quiet, translated, retryable', async () => {
    const user = userEvent.setup()
    let retried = 0
    render(<ErrorState variant="inline" onRetry={() => (retried += 1)} />)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent("This section couldn't be loaded.")
    expect(alert.className).not.toMatch(/bg-danger-bg/)
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(retried).toBe(1)
  })

  it('keeps the block variant for a page-level failure', () => {
    render(<ErrorState />)
    expect(screen.getByRole('alert')).toHaveClass('bg-danger-bg')
    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument()
  })
})

describe('EmptyState', () => {
  it('accepts a contextual icon by name', () => {
    const { container } = render(<EmptyState icon="briefcase" title="No internships yet" />)
    expect(container.querySelector('svg')).not.toBeNull()
    expect(screen.getByText('No internships yet')).toBeInTheDocument()
  })
})

describe('Skeleton presets', () => {
  it('announce loading once per region, however many bars they draw', () => {
    render(<SkeletonPanel rows={5} />)
    expect(screen.getAllByRole('status')).toHaveLength(1)
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument()
  })
})

describe('status tone registry', () => {
  it('gives one state the same tone everywhere it is shown', () => {
    // The admin screens and the institution's own profile used to disagree about SUSPENDED.
    expect(INSTITUTION_STATUS_TONE).toBe(INSTITUTION_VERIFICATION_TONE)
    expect(USER_STATUS_TONE).toBe(ACCOUNT_STATUS_TONE)
    expect(INSTITUTION_VERIFICATION_TONE.SUSPENDED).toBe('danger')
    expect(PRIVACY_REQUEST_TONE.IN_REVIEW).toBe('info')
  })

  it('renders an unknown wire value as neutral instead of throwing', () => {
    expect(toneOf(ACCOUNT_STATUS_TONE, 'SOMETHING_NEW')).toBe('neutral')
    expect(toneOf(ACCOUNT_STATUS_TONE, null)).toBe('neutral')
    render(<StatusBadge tone={toneOf(ACCOUNT_STATUS_TONE, 'ACTIVE')}>Active</StatusBadge>)
    expect(screen.getByText('Active')).toHaveClass('text-success')
  })
})

describe('PublicContainer', () => {
  it('shares the app content width and gutters, with the public section rhythm on request', () => {
    render(
      <PublicContainer as="section" spacing="section" aria-label="Featured">
        x
      </PublicContainer>,
    )
    const section = screen.getByRole('region', { name: 'Featured' })
    expect(section).toHaveClass('max-w-7xl', 'px-4', 'sm:px-6', 'lg:px-8', 'py-10', 'lg:py-16')
    expect(section.className).not.toMatch(/\[/)
  })
})

describe('Routes used by PageHeader back links', () => {
  it('navigates to the named destination', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/detail']}>
        <Routes>
          <Route path="/detail" element={<PageHeader title="Detail" back={{ to: '/list', label: 'Candidates' }} />} />
          <Route path="/list" element={<p>List page</p>} />
        </Routes>
      </MemoryRouter>,
    )
    await user.click(screen.getByRole('link', { name: 'Candidates' }))
    expect(screen.getByText('List page')).toBeInTheDocument()
  })
})
