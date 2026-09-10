import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { AppShell } from '../../../src/app/layouts/AppShell'
import { ThemeProvider } from '../../../src/lib/theme/ThemeProvider'
import { useWorkspace, type WorkspaceFamily } from '../../../src/app/layouts/workspace'
import '../../../src/lib/i18n'

vi.mock('../../../src/lib/auth/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true, isInitializing: false, accessToken: 't', signIn: vi.fn(), signOut: vi.fn() }),
}))

function Probe() {
  return <span data-testid="family">{useWorkspace()}</span>
}

function renderShell(workspace?: WorkspaceFamily) {
  return render(
    <MemoryRouter>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <ThemeProvider>
          <AppShell areaLabel="Area" sections={[]} workspace={workspace}>
            <Probe />
          </AppShell>
        </ThemeProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

describe('workspace family', () => {
  /*
   * The family is published two ways on purpose: as `data-workspace` for the CSS custom properties
   * that carry the personality, and on a context for the few things that need it in JavaScript. If
   * those two ever disagreed, a page would be styled as one workspace while behaving as another.
   */
  it.each<[WorkspaceFamily]>([['student'], ['organization'], ['university'], ['platform']])(
    'stamps %s on the shell root and publishes the same value on the context',
    (family) => {
      const { container } = renderShell(family)
      expect(container.querySelector('[data-workspace]')).toHaveAttribute('data-workspace', family)
      expect(screen.getByTestId('family')).toHaveTextContent(family)
    },
  )

  it('falls back to neutral, so the role-neutral account area wears no personality', () => {
    const { container } = renderShell()
    expect(container.querySelector('[data-workspace]')).toHaveAttribute('data-workspace', 'neutral')
    expect(screen.getByTestId('family')).toHaveTextContent('neutral')
  })
})

describe('the area layouts pick the family that matches them', () => {
  /*
   * Read from source rather than rendered, because rendering these layouts means standing up their
   * membership queries — and the thing worth pinning here is the wiring, not the fetching.
   */
  const layout = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

  it.each([
    ['src/features/student/components/StudentAreaLayout.tsx', 'student'],
    ['src/features/organization/components/OrganizationAreaLayout.tsx', 'organization'],
    ['src/features/university/components/UniversityAreaLayout.tsx', 'university'],
    ['src/features/admin/components/AdminAreaLayout.tsx', 'platform'],
  ])('%s declares workspace="%s"', (path, family) => {
    const source = layout(path)
    expect(source).toContain(`workspace="${family}"`)
    // Every AppShell in the file, including the pre-membership setup branch, gets the same family —
    // otherwise a user without a membership yet would land in a differently-dressed workspace.
    const shells = source.match(/<AppShell/g)?.length ?? 0
    const stamped = source.match(new RegExp(`<AppShell workspace="${family}"`, 'g'))?.length ?? 0
    expect(stamped).toBe(shells)
  })
})

describe('the family variables are a real system, not decoration', () => {
  const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')

  function block(selector: string): Record<string, string> {
    const start = css.indexOf(selector)
    expect(start, `${selector} must exist`).toBeGreaterThan(-1)
    const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('\n}', start))
    const out: Record<string, string> = {}
    for (const [, name, value] of body.matchAll(/(--workspace-[\w-]+)\s*:\s*([^;]+);/g)) out[name] = value.trim()
    return out
  }

  const student = block("[data-workspace='student']")
  const organization = block("[data-workspace='organization']")
  const university = block("[data-workspace='university']")

  it('gives each family its own rhythm, and orders them student > university > organization', () => {
    const y = (v: string) => parseFloat(v)
    expect(y(student['--workspace-page-y'])).toBeGreaterThan(y(university['--workspace-page-y']))
    expect(y(university['--workspace-page-y'])).toBeGreaterThan(y(organization['--workspace-page-y']))
  })

  it('gives each family its own rule, so the distinction survives a greyscale screenshot of one', () => {
    const rules = [student, organization, university].map((f) => f['--workspace-rule'])
    expect(new Set(rules).size).toBe(3)
  })

  /*
   * The brief's constraint, encoded: the families differ in rhythm, surface and rule — NOT in brand
   * colour. A family block that redefined a brand anchor would be the start of three products.
   */
  it('never redefines a brand anchor', () => {
    for (const family of [student, organization, university]) {
      for (const name of Object.keys(family)) {
        expect(name.startsWith('--workspace-')).toBe(true)
      }
    }
    const familyCss = css.slice(css.indexOf('[data-workspace]'), css.indexOf('Public scroll entrance'))
    expect(familyCss).not.toMatch(/--color-brand-(navy|accent)\s*:/)
  })
})
