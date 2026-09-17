import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { CandidateBoard } from '../../../src/features/recruitment/components/CandidateBoard'
import { PIPELINE_STAGES } from '../../../src/features/organization/candidatePipeline'
import i18n from '../../../src/lib/i18n'
import type { CandidateRowResponse } from '../../../src/features/recruitment/types'

function candidate(overrides: Partial<CandidateRowResponse>): CandidateRowResponse {
  return {
    id: 'cand-1',
    candidacyId: 'cand-1',
    studentUserId: 'stu-1',
    studentFullName: 'Amina Hassan',
    studentEmail: 'amina@example.test',
    status: 'SUBMITTED',
    source: 'SELF_APPLICATION',
    submittedAt: '2026-09-14T00:00:00Z',
    ...overrides,
  } as CandidateRowResponse
}

function renderBoard(candidates: CandidateRowResponse[]) {
  return render(
    <MemoryRouter>
      <CandidateBoard candidates={candidates} emptyMessage="No candidates yet." />
    </MemoryRouter>,
  )
}

describe('CandidateBoard', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  /**
   * Every stage must be present in the DOM, whatever the width.
   *
   * <p>The board is a horizontally scrolling flex row, sized at 16rem per column. Six columns need
   * roughly 1560px and the content area beside the portal rail is about 1110px on a 1440px screen,
   * so the last two — OFFERED and ACCEPTED — were clipped with nothing to suggest more lay beyond.
   * A recruiter whose only candidate had been accepted saw six empty-looking columns under a
   * "1 candidate" count.
   *
   * <p>jsdom has no layout, so this cannot assert the visual fix directly. What it CAN pin is the
   * invariant underneath it: the board renders a column for every real stage, and the candidate is
   * rendered into the right one rather than dropped.
   */
  it('renders a column for every pipeline stage', () => {
    renderBoard([candidate({ status: 'ACCEPTED' })])

    for (const stage of PIPELINE_STAGES) {
      const label = i18n.t(`recruitment:candidacyStatusValues.${stage}`)
      expect(screen.getByText(label), `no column for ${stage}`).toBeInTheDocument()
    }
  })

  it('puts an accepted candidate on the board rather than counting them as closed', () => {
    renderBoard([candidate({ status: 'ACCEPTED' })])

    // ACCEPTED is a stage, not a departure: the candidate is on the board and the closed count is 0.
    expect(screen.getByText('Amina Hassan')).toBeInTheDocument()
    expect(screen.getByText(/0 candidates have left the pipeline/i)).toBeInTheDocument()
  })

  it('keeps a candidate in exactly one column', () => {
    renderBoard([candidate({ status: 'SHORTLISTED' })])

    // The board's own direct children are the columns; the cards inside them are list items too,
    // so a bare getAllByRole('listitem') would count the card as a second "column".
    const board = screen.getByRole('list', { name: i18n.t('recruitment:pool.boardLabel') })
    const columns = [...board.children] as HTMLElement[]
    const holding = columns.filter((column) => within(column).queryByText('Amina Hassan'))

    expect(holding).toHaveLength(1)
    expect(holding[0]).toHaveTextContent(i18n.t('recruitment:candidacyStatusValues.SHORTLISTED'))
  })

  it('reports candidates who really did leave the pipeline, without giving them a column', () => {
    renderBoard([candidate({ id: 'c1', status: 'REJECTED' }), candidate({ id: 'c2', status: 'WITHDRAWN', studentFullName: 'Yusuf Warsame' })])

    expect(screen.getByText(/2 candidates have left the pipeline/i)).toBeInTheDocument()
    // A rejected candidate is not "at a stage" — no column, and not rendered as a card.
    expect(screen.queryByText('Yusuf Warsame')).not.toBeInTheDocument()
  })
})
