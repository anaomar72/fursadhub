import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { NotificationList } from '../../../src/features/notifications/components/NotificationList'
import i18n from '../../../src/lib/i18n'
import type { NotificationItem } from '../../../src/features/notifications/types'

function notification(overrides: Partial<NotificationItem> = {}): NotificationItem {
  return {
    id: 'n-1',
    type: 'WEEKLY_LOG_RETURNED',
    payload: { weekNumber: 3 },
    linkPath: '/student/placements/pl-1/weekly-logs',
    readAt: null,
    createdAt: '2026-10-01T09:00:00Z',
    ...overrides,
  }
}

function renderList(notifications: NotificationItem[], onMarkRead = vi.fn()) {
  render(
    <MemoryRouter>
      <NotificationList notifications={notifications} onMarkRead={onMarkRead} emptyLabel="Nothing here." />
    </MemoryRouter>,
  )
  return onMarkRead
}

describe('NotificationList', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('renders a notification from its type code and payload, not from server text', async () => {
    renderList([notification()])

    // The wire carries only WEEKLY_LOG_RETURNED and { weekNumber: 3 } — the sentence is built here.
    expect(screen.getByText('Week 3 of your internship log has been returned for changes.')).toBeInTheDocument()
  })

  it('renders the same notification in Somali when the UI language changes', async () => {
    await i18n.changeLanguage('so')
    renderList([notification()])

    expect(
      screen.getByText('Toddobaadka 3 ee diiwaanka tababarkaaga waxaa loo soo celiyay in wax laga beddelo.'),
    ).toBeInTheDocument()
  })

  it('falls back to a generic line for a code it does not recognise', async () => {
    renderList([notification({ type: 'SOMETHING_ADDED_IN_A_LATER_RELEASE', payload: {} })])

    expect(screen.getByText('You have a new update on FursadHub.')).toBeInTheDocument()
    // Never leaks the raw enum name at the user.
    expect(screen.queryByText(/SOMETHING_ADDED_IN_A_LATER_RELEASE/)).not.toBeInTheDocument()
  })

  it('marks unread state in words, not by colour alone', async () => {
    renderList([notification({ readAt: null })])

    expect(screen.getByText('New')).toBeInTheDocument()
  })

  it('does not label a read notification as new', async () => {
    renderList([notification({ readAt: '2026-10-01T10:00:00Z' })])

    expect(screen.queryByText('New')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mark as read' })).not.toBeInTheDocument()
  })

  it('marks a notification read on request', async () => {
    const onMarkRead = renderList([notification()])

    await userEvent.click(screen.getByRole('button', { name: 'Mark as read' }))

    expect(onMarkRead).toHaveBeenCalledWith('n-1')
  })

  it('shows the empty label when there is nothing to show', () => {
    renderList([])

    expect(screen.getByText('Nothing here.')).toBeInTheDocument()
  })

  it('links only to relative in-app paths', () => {
    renderList([notification()])

    const link = screen.getByRole('link', { name: 'Open' })
    expect(link).toHaveAttribute('href', '/student/placements/pl-1/weekly-logs')
  })

  it('omits the open link when a notification has no destination', () => {
    renderList([notification({ linkPath: null })])

    expect(screen.queryByRole('link', { name: 'Open' })).not.toBeInTheDocument()
  })
})
