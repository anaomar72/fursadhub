import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '../../src/lib/i18n'
import { DataTable, ToastProvider, useToast, type DataTableColumn } from '../../src/components/ui'

interface Row {
  id: string
  name: string
  applications: number
}

const ROWS: Row[] = [
  { id: 'b', name: 'Beta Logistics', applications: 3 },
  { id: 'a', name: 'Alpha Bank', applications: 12 },
  { id: 'c', name: 'Cadaado NGO', applications: 7 },
]

const COLUMNS: DataTableColumn<Row>[] = [
  { key: 'name', header: 'Organization', primary: true, render: (r) => r.name, sortValue: (r) => r.name },
  { key: 'applications', header: 'Applications', align: 'end', render: (r) => r.applications, sortValue: (r) => r.applications },
]

function renderTable(props: Partial<Parameters<typeof DataTable<Row>>[0]> = {}) {
  return render(
    <MemoryRouter initialEntries={['/list']}>
      <Routes>
        <Route
          path="/list"
          element={
            <DataTable<Row>
              caption="Organizations"
              columns={COLUMNS}
              rows={ROWS}
              rowKey={(r) => r.id}
              rowHref={(r) => `/organizations/${r.id}`}
              {...props}
            />
          }
        />
        <Route path="/organizations/:id" element={<p>Detail page</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

const bodyNames = () =>
  within(screen.getByRole('table')).getAllByRole('rowheader').map((cell) => cell.textContent)

describe('DataTable semantics', () => {
  it('does not make rows focusable or give them a click role', () => {
    renderTable()
    for (const row of within(screen.getByRole('table')).getAllByRole('row')) {
      expect(row).not.toHaveAttribute('tabindex')
      expect(row).not.toHaveAttribute('role', 'button')
    }
  })

  it('navigates through a real link in the identifying row header', async () => {
    const user = userEvent.setup()
    renderTable()
    const header = screen.getByRole('rowheader', { name: 'Alpha Bank' })
    const link = within(header).getByRole('link', { name: 'Alpha Bank' })
    expect(link).toHaveAttribute('href', '/organizations/a')
    link.focus()
    await user.keyboard('{Enter}')
    expect(screen.getByText('Detail page')).toBeInTheDocument()
  })

  it('lets a pointer click anywhere on the row follow that same link', async () => {
    const user = userEvent.setup()
    renderTable()
    await user.click(screen.getByRole('cell', { name: '12' }))
    expect(screen.getByText('Detail page')).toBeInTheDocument()
  })

  it('sorts on the client and reports the direction through aria-sort', async () => {
    const user = userEvent.setup()
    renderTable()
    const header = screen.getByRole('columnheader', { name: 'Applications' })
    expect(header).toHaveAttribute('aria-sort', 'none')

    await user.click(within(header).getByRole('button', { name: 'Applications' }))
    expect(header).toHaveAttribute('aria-sort', 'ascending')
    expect(bodyNames()).toEqual(['Beta Logistics', 'Cadaado NGO', 'Alpha Bank'])

    await user.click(within(header).getByRole('button', { name: 'Applications' }))
    expect(header).toHaveAttribute('aria-sort', 'descending')
    expect(bodyNames()).toEqual(['Alpha Bank', 'Cadaado NGO', 'Beta Logistics'])

    await user.click(within(header).getByRole('button', { name: 'Applications' }))
    expect(header).toHaveAttribute('aria-sort', 'none')
    expect(bodyNames()).toEqual(['Beta Logistics', 'Alpha Bank', 'Cadaado NGO'])
  })

  it('offers no sort control on a column without a sort value', () => {
    render(
      <DataTable<Row>
        columns={[{ key: 'name', header: 'Organization', render: (r) => r.name }]}
        rows={ROWS}
        rowKey={(r) => r.id}
      />,
    )
    const header = screen.getByRole('columnheader', { name: 'Organization' })
    expect(header).not.toHaveAttribute('aria-sort')
    expect(within(header).queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows placeholder rows while loading, marks the table busy and announces once', () => {
    renderTable({ loading: true, loadingRows: 4 })
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getAllByRole('status')).toHaveLength(1)
    expect(screen.queryByText('Alpha Bank')).not.toBeInTheDocument()
  })

  it('uses tighter cells in the dense variant', () => {
    renderTable({ density: 'dense' })
    expect(screen.getByRole('rowheader', { name: 'Alpha Bank' })).toHaveClass('px-3', 'py-2')
  })
})

describe('DataTable on a phone', () => {
  const original = window.matchMedia
  beforeEach(() => {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia
  })
  afterEach(() => {
    window.matchMedia = original
  })

  it('renders the explicit mobile renderer as a list of whole-row links instead of a table', () => {
    renderTable({ renderMobileRow: (r) => <span>{r.name} — {r.applications}</span> })
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    const list = screen.getByRole('list', { name: 'Organizations' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(3)
    expect(within(list).getByRole('link', { name: 'Alpha Bank — 12' })).toHaveAttribute('href', '/organizations/a')
  })

  it('keeps the table (scrolling inside its own frame) when no mobile renderer is given', () => {
    renderTable()
    expect(screen.getByRole('table').parentElement).toHaveClass('overflow-x-auto')
  })
})

function ToastTrigger({ tone, title }: { tone: 'success' | 'error'; title: string }) {
  const toast = useToast()
  return (
    <button type="button" onClick={() => (tone === 'success' ? toast.success(title) : toast.error(title))}>
      Trigger {tone}
    </button>
  )
}

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('announces a success politely, then dismisses itself', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(
      <ToastProvider>
        <ToastTrigger tone="success" title="Profile saved" />
      </ToastProvider>,
    )
    const polite = document.querySelector('[data-toast-announcer="polite"]')!
    // Live regions without a role, so they never collide with a page's own role="status"/"alert".
    expect(polite).not.toHaveAttribute('role')
    await user.click(screen.getByRole('button', { name: 'Trigger success' }))
    expect(polite).toHaveTextContent('Profile saved')
    expect(screen.getByRole('region', { name: 'Notifications' })).toHaveTextContent('Profile saved')

    act(() => {
      vi.advanceTimersByTime(6000 + 200)
    })
    expect(screen.queryByRole('region', { name: 'Notifications' })).not.toBeInTheDocument()
  })

  it('announces an error assertively and never dismisses it on its own', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(
      <ToastProvider>
        <ToastTrigger tone="error" title="Could not save" />
      </ToastProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'Trigger error' }))
    expect(document.querySelector('[data-toast-announcer="assertive"]')).toHaveTextContent('Could not save')

    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    const region = screen.getByRole('region', { name: 'Notifications' })
    expect(region).toHaveTextContent('Could not save')

    await user.click(within(region).getByRole('button', { name: 'Dismiss notification' }))
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(screen.queryByRole('region', { name: 'Notifications' })).not.toBeInTheDocument()
  })

  it('stops the clock while the pointer is on the toast', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(
      <ToastProvider>
        <ToastTrigger tone="success" title="Saved" />
      </ToastProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'Trigger success' }))
    await user.hover(within(screen.getByRole('region', { name: 'Notifications' })).getByText('Saved'))
    act(() => {
      vi.advanceTimersByTime(20_000)
    })
    expect(screen.getByRole('region', { name: 'Notifications' })).toHaveTextContent('Saved')
  })

  it('refuses to be used outside its provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<ToastTrigger tone="success" title="x" />)).toThrow(/ToastProvider/)
    spy.mockRestore()
  })
})
