import { createBrowserRouter, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PublicLayout, StudentLayout, UniversityLayout, OrganizationLayout, AdminLayout } from '../layouts'
import { HomePage } from '../pages/HomePage'
import { ComingSoonPage } from '../pages/ComingSoonPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { RequireAuth } from '../../lib/auth/RequireAuth'
import { RegisterPage } from '../../features/auth/pages/RegisterPage'
import { LoginPage } from '../../features/auth/pages/LoginPage'
import { VerifyEmailPage } from '../../features/auth/pages/VerifyEmailPage'
import { ForgotPasswordPage } from '../../features/auth/pages/ForgotPasswordPage'
import { ResetPasswordPage } from '../../features/auth/pages/ResetPasswordPage'
import { StudentAreaLayout } from '../../features/student/components/StudentAreaLayout'
import { StudentProfilePage } from '../../features/student/pages/ProfilePage'
import { EnrollmentPage } from '../../features/student/pages/EnrollmentPage'
import { UniversityAreaLayout } from '../../features/university/components/UniversityAreaLayout'
import { DepartmentsPage } from '../../features/university/pages/DepartmentsPage'
import { StudentsPage } from '../../features/university/pages/StudentsPage'
import { VerificationQueuePage } from '../../features/university/pages/VerificationQueuePage'
import { VerificationCaseDetailPage } from '../../features/university/pages/VerificationCaseDetailPage'
import { StaffPage } from '../../features/university/pages/StaffPage'
import { OrganizationAreaLayout } from '../../features/organization/components/OrganizationAreaLayout'
import { ProfilePage as OrganizationProfilePage } from '../../features/organization/pages/ProfilePage'
import { StaffPage as OrganizationStaffPage } from '../../features/organization/pages/StaffPage'
import { OpportunityListPage } from '../../features/opportunities/pages/OpportunityListPage'
import { CreateOpportunityPage } from '../../features/opportunities/pages/CreateOpportunityPage'
import { OpportunityDetailPage } from '../../features/opportunities/pages/OpportunityDetailPage'
import { PublicOpportunityListPage } from '../../features/opportunities/pages/PublicOpportunityListPage'
import { PublicOpportunityDetailPage } from '../../features/opportunities/pages/PublicOpportunityDetailPage'
import { ApplyPage } from '../../features/recruitment/pages/ApplyPage'
import { MyApplicationsPage } from '../../features/recruitment/pages/MyApplicationsPage'
import { CandidacyDetailPage } from '../../features/recruitment/pages/CandidacyDetailPage'
import { MyNominationsPage } from '../../features/recruitment/pages/MyNominationsPage'
import { OpportunityRequestsPage } from '../../features/recruitment/pages/OpportunityRequestsPage'
import { NominateStudentsPage } from '../../features/recruitment/pages/NominateStudentsPage'
import { UniversityNominationsPage } from '../../features/recruitment/pages/UniversityNominationsPage'
import { CandidatePoolPage } from '../../features/recruitment/pages/CandidatePoolPage'
import { CandidateDetailPage } from '../../features/recruitment/pages/CandidateDetailPage'
import { MyPlacementsPage } from '../../features/placements/pages/MyPlacementsPage'
import { StudentPlacementDetailPage } from '../../features/placements/pages/StudentPlacementDetailPage'
import { UniversityPlacementsPage } from '../../features/placements/pages/UniversityPlacementsPage'
import { OrganizationPlacementsPage } from '../../features/placements/pages/OrganizationPlacementsPage'
import { PlacementDetailPage } from '../../features/placements/pages/PlacementDetailPage'

function AdminIndex() {
  const { t } = useTranslation()
  return <ComingSoonPage areaLabel={t('nav.admin')} />
}

/**
 * Route foundation — PublicLayout now also hosts the Phase 1 authentication pages, and each
 * role-area layout is gated behind RequireAuth (CLAUDE.md section 61 Phase 1 scope; this is UX
 * only, real authorization is enforced by the backend per CLAUDE.md section 24). Real feature
 * routes for each area are added phase by phase.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'opportunities', element: <PublicOpportunityListPage /> },
      { path: 'opportunities/:opportunityId', element: <PublicOpportunityDetailPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'verify-email', element: <VerifyEmailPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
    ],
  },
  {
    path: '/student',
    element: (
      <RequireAuth>
        <StudentLayout />
      </RequireAuth>
    ),
    children: [
      {
        element: <StudentAreaLayout />,
        children: [
          { index: true, element: <Navigate to="enrollment" replace /> },
          { path: 'enrollment', element: <EnrollmentPage /> },
          { path: 'profile', element: <StudentProfilePage /> },
          // Phase 4 recruitment. The apply route lives under /student because it requires an
          // authenticated student; the opportunity itself stays publicly browsable at /opportunities.
          { path: 'opportunities/:opportunityId/apply', element: <ApplyPage /> },
          { path: 'applications', element: <MyApplicationsPage /> },
          { path: 'applications/:candidacyId', element: <CandidacyDetailPage /> },
          { path: 'nominations', element: <MyNominationsPage /> },
          // Phase 5 placement. Read-only for the student — the hosting organization drives the lifecycle.
          { path: 'placements', element: <MyPlacementsPage /> },
          { path: 'placements/:placementId', element: <StudentPlacementDetailPage /> },
        ],
      },
    ],
  },
  {
    path: '/university',
    element: (
      <RequireAuth>
        <UniversityLayout />
      </RequireAuth>
    ),
    children: [
      {
        element: <UniversityAreaLayout />,
        children: [
          { index: true, element: <Navigate to="students" replace /> },
          { path: 'students', element: <StudentsPage /> },
          { path: 'departments', element: <DepartmentsPage /> },
          { path: 'verification-cases', element: <VerificationQueuePage /> },
          { path: 'verification-cases/:caseId', element: <VerificationCaseDetailPage /> },
          { path: 'staff', element: <StaffPage /> },
          // Phase 4 nomination workflow.
          { path: 'opportunity-requests', element: <OpportunityRequestsPage /> },
          { path: 'opportunity-requests/:targetId', element: <NominateStudentsPage /> },
          { path: 'nominations', element: <UniversityNominationsPage /> },
          // Phase 5 placements. The university reads placements and owns the university supervisor.
          { path: 'placements', element: <UniversityPlacementsPage /> },
          { path: 'placements/:placementId', element: <PlacementDetailPage area="university" /> },
        ],
      },
    ],
  },
  {
    path: '/organization',
    element: (
      <RequireAuth>
        <OrganizationLayout />
      </RequireAuth>
    ),
    children: [
      {
        element: <OrganizationAreaLayout />,
        children: [
          { index: true, element: <Navigate to="opportunities" replace /> },
          { path: 'opportunities', element: <OpportunityListPage /> },
          { path: 'opportunities/new', element: <CreateOpportunityPage /> },
          { path: 'opportunities/:opportunityId', element: <OpportunityDetailPage /> },
          // Phase 4 candidate management — ONE unified pool per opportunity.
          { path: 'opportunities/:opportunityId/candidates', element: <CandidatePoolPage /> },
          { path: 'candidacies/:candidacyId', element: <CandidateDetailPage /> },
          // Phase 5 placements. The hosting organization drives the lifecycle.
          { path: 'placements', element: <OrganizationPlacementsPage /> },
          { path: 'placements/:placementId', element: <PlacementDetailPage area="organization" /> },
          { path: 'profile', element: <OrganizationProfilePage /> },
          { path: 'staff', element: <OrganizationStaffPage /> },
        ],
      },
    ],
  },
  {
    path: '/admin',
    element: (
      <RequireAuth>
        <AdminLayout />
      </RequireAuth>
    ),
    children: [{ index: true, element: <AdminIndex /> }],
  },
  { path: '*', element: <NotFoundPage /> },
])
