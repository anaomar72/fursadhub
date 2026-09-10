import { render, screen } from '@testing-library/react'
import { MemoryRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { OrganizationMembershipContext } from '../../src/features/organization/components/OrganizationMembershipContext'
import { RequireOrganizationCapability } from '../../src/features/organization/components/RequireOrganizationCapability'
import type { OrganizationCapabilities } from '../../src/features/organization/organizationCapabilities'
import { UniversityMembershipContext } from '../../src/features/university/components/UniversityMembershipContext'
import { RequireUniversityCapability } from '../../src/features/university/components/RequireUniversityCapability'
import type { UniversityCapabilities } from '../../src/features/university/universityCapabilities'
import type { MyOrganizationMembershipResponse, OrganizationRole } from '../../src/features/organization/types'
import type { MyMembershipResponse, UniversityRole } from '../../src/features/university/types'

/**
 * Direct URL navigation, not nav-link visibility.
 *
 * <p>Each case mounts the real guard at a real route and asserts on what renders. The protected
 * element is a sentinel: if it appears at all the page mounted, which is exactly the "briefly render
 * protected content" failure being guarded against. A denied role must land on its portal dashboard.
 *
 * <p>Every expectation below was checked against a running backend first — the DENIED rows are the
 * ones whose API answered 403 in live QA, and the ALLOWED rows are real working destinations. These
 * are UX assertions; the backend re-authorizes every request regardless (CLAUDE.md section 24).
 */

const ORG_PROTECTED = 'PROTECTED ORGANIZATION PAGE'
const UNI_PROTECTED = 'PROTECTED UNIVERSITY PAGE'

function organizationAt(role: OrganizationRole, capability: keyof OrganizationCapabilities) {
  const membership = { organizationId: 'org-1', organizationName: 'Acme', role } as MyOrganizationMembershipResponse
  render(
    <MemoryRouter initialEntries={['/organization/guarded']}>
      <OrganizationMembershipContext.Provider value={membership}>
        <Routes>
          <Route path="/organization" element={<Outlet />}>
            <Route path="dashboard" element={<p>organization dashboard</p>} />
            <Route element={<RequireOrganizationCapability capability={capability} />}>
              <Route path="guarded" element={<p>{ORG_PROTECTED}</p>} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/organization/dashboard" replace />} />
        </Routes>
      </OrganizationMembershipContext.Provider>
    </MemoryRouter>,
  )
}

function universityAt(role: UniversityRole, capability: keyof UniversityCapabilities, invert = false) {
  const membership = { universityId: 'uni-1', role, departmentIds: ['dept-1'] } as MyMembershipResponse
  render(
    <MemoryRouter initialEntries={['/university/guarded']}>
      <UniversityMembershipContext.Provider value={membership}>
        <Routes>
          <Route path="/university" element={<Outlet />}>
            <Route path="dashboard" element={<p>university dashboard</p>} />
            <Route element={<RequireUniversityCapability capability={capability} invert={invert} />}>
              <Route path="guarded" element={<p>{UNI_PROTECTED}</p>} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/university/dashboard" replace />} />
        </Routes>
      </UniversityMembershipContext.Provider>
    </MemoryRouter>,
  )
}

describe('organization portal route authorization', () => {
  // Denied: the destination the sidebar hides for this role, and whose API refuses it.
  it.each<[OrganizationRole, keyof OrganizationCapabilities]>([
    ['RECRUITER', 'canAdministerOrganization'],
    ['ORGANIZATION_SUPERVISOR', 'canAdministerOrganization'],
    ['ORGANIZATION_SUPERVISOR', 'canManageCandidates'],
    ['ORGANIZATION_SUPERVISOR', 'canManageOpportunities'],
    ['RECRUITER', 'scopedToAssignedPlacements'],
  ])('%s cannot reach a %s route by direct URL', (role, capability) => {
    organizationAt(role, capability)
    expect(screen.queryByText(ORG_PROTECTED)).not.toBeInTheDocument()
    expect(screen.getByText('organization dashboard')).toBeInTheDocument()
  })

  it.each<[OrganizationRole, keyof OrganizationCapabilities]>([
    ['ORGANIZATION_ADMIN', 'canAdministerOrganization'],
    ['ORGANIZATION_ADMIN', 'canManageCandidates'],
    ['ORGANIZATION_ADMIN', 'canManageOpportunities'],
    ['RECRUITER', 'canManageCandidates'],
    ['RECRUITER', 'canManageOpportunities'],
    ['ORGANIZATION_SUPERVISOR', 'scopedToAssignedPlacements'],
  ])('%s still reaches its own %s route', (role, capability) => {
    organizationAt(role, capability)
    expect(screen.getByText(ORG_PROTECTED)).toBeInTheDocument()
  })
})

describe('university portal route authorization', () => {
  // Denied. Live QA measured 403 for the coordinator on staff, and for the supervisor on staff,
  // the student directory and the verification queue.
  it.each<[UniversityRole, keyof UniversityCapabilities]>([
    ['DEPARTMENT_COORDINATOR', 'canProvisionStaff'],
    ['DEPARTMENT_COORDINATOR', 'canEditUniversityProfile'],
    ['UNIVERSITY_SUPERVISOR', 'canProvisionStaff'],
    ['UNIVERSITY_SUPERVISOR', 'hasStudentDirectory'],
    ['UNIVERSITY_SUPERVISOR', 'canReviewStudents'],
    ['UNIVERSITY_SUPERVISOR', 'canNominate'],
    ['UNIVERSITY_SUPERVISOR', 'canManageDepartments'],
    ['UNIVERSITY_SUPERVISOR', 'canConfigurePolicy'],
  ])('%s cannot reach a %s route by direct URL', (role, capability) => {
    universityAt(role, capability)
    expect(screen.queryByText(UNI_PROTECTED)).not.toBeInTheDocument()
    expect(screen.getByText('university dashboard')).toBeInTheDocument()
  })

  it('a UNIVERSITY_SUPERVISOR cannot reach the institution-wide partner directory', () => {
    universityAt('UNIVERSITY_SUPERVISOR', 'scopedToAssignedPlacements', true)
    expect(screen.queryByText(UNI_PROTECTED)).not.toBeInTheDocument()
  })

  it.each<[UniversityRole, keyof UniversityCapabilities]>([
    ['UNIVERSITY_ADMIN', 'canProvisionStaff'],
    ['UNIVERSITY_ADMIN', 'hasStudentDirectory'],
    ['UNIVERSITY_ADMIN', 'canManageDepartments'],
    ['UNIVERSITY_ADMIN', 'canEditUniversityProfile'],
    ['UNIVERSITY_ADMIN', 'canConfigurePolicy'],
    ['DEPARTMENT_COORDINATOR', 'canConfigurePolicy'],
    // A coordinator's real work: verification, nominations, their department roster.
    ['DEPARTMENT_COORDINATOR', 'canReviewStudents'],
    ['DEPARTMENT_COORDINATOR', 'canNominate'],
    ['DEPARTMENT_COORDINATOR', 'hasStudentDirectory'],
    // A supervisor's real work.
    ['UNIVERSITY_SUPERVISOR', 'canReviewAcademicRecords'],
    ['UNIVERSITY_SUPERVISOR', 'scopedToAssignedPlacements'],
  ])('%s still reaches its own %s route', (role, capability) => {
    universityAt(role, capability)
    expect(screen.getByText(UNI_PROTECTED)).toBeInTheDocument()
  })

  it('a coordinator with no assigned departments is failed closed, matching the server', () => {
    const membership = {
      universityId: 'uni-1',
      role: 'DEPARTMENT_COORDINATOR',
      departmentIds: [],
    } as unknown as MyMembershipResponse
    render(
      <MemoryRouter initialEntries={['/university/guarded']}>
        <UniversityMembershipContext.Provider value={membership}>
          <Routes>
            <Route path="/university" element={<Outlet />}>
              <Route path="dashboard" element={<p>university dashboard</p>} />
              <Route element={<RequireUniversityCapability capability="canReviewStudents" />}>
                <Route path="guarded" element={<p>{UNI_PROTECTED}</p>} />
              </Route>
            </Route>
          </Routes>
        </UniversityMembershipContext.Provider>
      </MemoryRouter>,
    )
    expect(screen.queryByText(UNI_PROTECTED)).not.toBeInTheDocument()
  })
})
