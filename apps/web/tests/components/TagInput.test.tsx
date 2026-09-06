import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { TagInput } from '../../src/components/ui/TagInput'
import { MAX_PERKS, MAX_PERK_LENGTH, MAX_SKILLS, MAX_SKILL_LENGTH } from '../../src/features/opportunities/schemas/opportunityFormSchema'
import i18n from '../../src/lib/i18n'

function Harness({
  initial = [] as string[],
  maxTags = MAX_SKILLS,
  maxLength = MAX_SKILL_LENGTH,
}) {
  const [value, setValue] = useState(initial)
  return (
    <>
      <label htmlFor="tags">Skills</label>
      <TagInput id="tags" value={value} onChange={setValue} maxTags={maxTags} maxLength={maxLength} />
      <output data-testid="value">{JSON.stringify(value)}</output>
    </>
  )
}

function currentValue(): string[] {
  return JSON.parse(screen.getByTestId('value').textContent ?? '[]')
}

describe('TagInput (Backend Phase B3 skills and perks)', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('mirrors the backend limits it is configured with', () => {
    expect(MAX_SKILLS).toBe(20)
    expect(MAX_SKILL_LENGTH).toBe(60)
    expect(MAX_PERKS).toBe(15)
    expect(MAX_PERK_LENGTH).toBe(80)
  })

  it('adds a tag on Enter', async () => {
    render(<Harness />)

    await userEvent.type(screen.getByLabelText('Skills'), 'React{Enter}')

    expect(currentValue()).toEqual(['React'])
  })

  it('adds a tag on comma, so a pasted comma-separated list becomes separate chips', async () => {
    render(<Harness />)

    await userEvent.type(screen.getByLabelText('Skills'), 'React,TypeScript,SQL,')

    expect(currentValue()).toEqual(['React', 'TypeScript', 'SQL'])
  })

  it('commits a tag typed but not confirmed, rather than discarding it on submit', async () => {
    render(<Harness />)

    const field = screen.getByLabelText('Skills')
    await userEvent.type(field, 'React')
    await userEvent.tab()

    expect(currentValue()).toEqual(['React'])
  })

  it('removes the last tag with Backspace on an empty field', async () => {
    render(<Harness initial={['React', 'SQL']} />)

    await userEvent.type(screen.getByLabelText('Skills'), '{Backspace}')

    expect(currentValue()).toEqual(['React'])
  })

  it('removes a specific tag through its own labelled control', async () => {
    render(<Harness initial={['React', 'SQL']} />)

    await userEvent.click(screen.getByRole('button', { name: 'Remove React' }))

    expect(currentValue()).toEqual(['SQL'])
  })

  describe('duplicates', () => {
    it('refuses an exact duplicate', async () => {
      render(<Harness initial={['React']} />)

      await userEvent.type(screen.getByLabelText('Skills'), 'React{Enter}')

      expect(currentValue()).toEqual(['React'])
      expect(screen.getByRole('alert')).toHaveTextContent('That has already been added.')
    })

    /** "React" and "react" are one skill; listing both would only clutter the public card. */
    it('refuses a case-insensitive duplicate', async () => {
      render(<Harness initial={['React']} />)

      await userEvent.type(screen.getByLabelText('Skills'), 'react{Enter}')

      expect(currentValue()).toEqual(['React'])
    })
  })

  describe('limits', () => {
    it('refuses a tag longer than the per-entry limit', async () => {
      render(<Harness maxLength={5} />)

      const field = screen.getByLabelText('Skills')
      // maxLength on the input already stops typing past the bound; this asserts the guard behind it.
      expect(field).toHaveAttribute('maxLength', '5')
    })

    it('stops accepting tags at the maximum and says so', async () => {
      render(<Harness initial={['a', 'b']} maxTags={2} />)

      // At capacity the field is disabled rather than silently swallowing the next entry.
      expect(screen.getByLabelText('Skills')).toBeDisabled()
      expect(screen.getByText('2 of 2')).toBeInTheDocument()
    })

    it('reports how many of the allowance are used', () => {
      render(<Harness initial={['React']} maxTags={20} />)

      expect(screen.getByText('1 of 20')).toBeInTheDocument()
    })
  })

  it('ignores an empty or whitespace-only entry', async () => {
    render(<Harness />)

    await userEvent.type(screen.getByLabelText('Skills'), '   {Enter}')

    expect(currentValue()).toEqual([])
  })

  it('trims surrounding whitespace from a committed tag', async () => {
    render(<Harness />)

    await userEvent.type(screen.getByLabelText('Skills'), '  React  {Enter}')

    expect(currentValue()).toEqual(['React'])
  })
})
