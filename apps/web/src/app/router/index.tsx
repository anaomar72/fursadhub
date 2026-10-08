import { lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RootRoute } from './RootRoute'
import { PublicLayout, AuthLayout, AccountLayout } from '../layouts'
const accountArea = () => import('./areas/account')
const adminArea = () => import('./areas/admin')
const authArea = () => import('./areas/auth')
const internshipArea = () => import('./areas/internship')
const organizationArea = () => import('./areas/organization')
const studentArea = () => import('./areas/student')
const universityArea = () => import('./areas/university')

import { HomePage } from '../pages/HomePage'
import { AboutPage } from '../pages/AboutPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { RequireAuth } from '../../lib/auth/RequireAuth'
import { RequireOrganizationCapability } from '../../features/organization/components/RequireOrganizationCapability'
import { RequireUniversityCapability } from '../../features/university/components/RequireUniversityCapability'
const RegisterPage = lazy(() => authArea().then((m) => ({ default: m.RegisterPage })))
const LoginPage = lazy(() => authArea().then((m) => ({ default: m.LoginPage })))
const VerifyEmailPage = lazy(() => authArea().then((m) => ({ default: m.VerifyEmailPage })))
const GetStartedPage = lazy(() => authArea().then((m) => ({ default: m.GetStartedPage })))
const ForgotPasswordPage = lazy(() => authArea().then((m) => ({ default: m.ForgotPasswordPage })))
const ResetPasswordPage = lazy(() => authArea().then((m) => ({ default: m.ResetPasswordPage })))
const StudentAreaLayout = lazy(() => studentArea().then((m) => ({ default: m.StudentAreaLayout })))
const StudentDashboardPage = lazy(() => studentArea().then((m) => ({ default: m.StudentDashboardPage })))
const StudentProfilePage = lazy(() => studentArea().then((m) => ({ default: m.StudentProfilePage })))
const EnrollmentPage = lazy(() => studentArea().then((m) => ({ default: m.EnrollmentPage })))
// Backend Phase B4 frontend enablement: the student's private saved internships.
const SavedInternshipsPage = lazy(() => studentArea().then((m) => ({ default: m.SavedInternshipsPage })))
const UniversityAreaLayout = lazy(() => universityArea().then((m) => ({ default: m.UniversityAreaLayout })))
const UniversityDashboardPage = lazy(() => universityArea().then((m) => ({ default: m.UniversityDashboardPage })))
const DepartmentsPage = lazy(() => universityArea().then((m) => ({ default: m.DepartmentsPage })))
const UniversityProfilePage = lazy(() => universityArea().then((m) => ({ default: m.UniversityProfilePage })))
const StudentsPage = lazy(() => universityArea().then((m) => ({ default: m.StudentsPage })))
const VerificationQueuePage = lazy(() => universityArea().then((m) => ({ default: m.VerificationQueuePage })))
const VerificationCaseDetailPage = lazy(() => universityArea().then((m) => ({ default: m.VerificationCaseDetailPage })))
const StaffPage = lazy(() => universityArea().then((m) => ({ default: m.StaffPage })))
// Phase 9: partner organizations, derived from the university's own placement list.
const PartnerOrganizationsPage = lazy(() => universityArea().then((m) => ({ default: m.PartnerOrganizationsPage })))
// Phase 10: the university staff/supervisor portal. Both routes read the SAME scoped placement
// list the API already narrowed to the caller's role, so neither widens anyone's reach.
const SupervisedStudentsPage = lazy(() => universityArea().then((m) => ({ default: m.SupervisedStudentsPage })))
const SupervisionQueuePage = lazy(() => universityArea().then((m) => ({ default: m.SupervisionQueuePage })))
const OrganizationAreaLayout = lazy(() => organizationArea().then((m) => ({ default: m.OrganizationAreaLayout })))
const OrganizationDashboardPage = lazy(() => organizationArea().then((m) => ({ default: m.OrganizationDashboardPage })))
const OrganizationProfilePage = lazy(() => organizationArea().then((m) => ({ default: m.OrganizationProfilePage })))
const OrganizationStaffPage = lazy(() => organizationArea().then((m) => ({ default: m.OrganizationStaffPage })))
const OpportunityListPage = lazy(() => organizationArea().then((m) => ({ default: m.OpportunityListPage })))
const CreateOpportunityPage = lazy(() => organizationArea().then((m) => ({ default: m.CreateOpportunityPage })))
const OpportunityDetailPage = lazy(() => organizationArea().then((m) => ({ default: m.OpportunityDetailPage })))
import { PublicOpportunityListPage } from '../../features/opportunities/pages/PublicOpportunityListPage'
import { PublicOpportunityDetailPage } from '../../features/opportunities/pages/PublicOpportunityDetailPage'
// Phase 8 student portal: internship discovery inside the authenticated shell.
const BrowseOpportunitiesPage = lazy(() => studentArea().then((m) => ({ default: m.BrowseOpportunitiesPage })))
const StudentOpportunityDetailPage = lazy(() => studentArea().then((m) => ({ default: m.StudentOpportunityDetailPage })))
import { PublicOrganizationProfilePage } from '../../features/organization/pages/PublicOrganizationProfilePage'
import { PublicOrganizationListPage } from '../../features/organization/pages/PublicOrganizationListPage'
import { PublicUniversityProfilePage } from '../../features/university/pages/PublicUniversityProfilePage'
import { PublicUniversitiesPage } from '../../features/university/pages/PublicUniversitiesPage'
const ApplyPage = lazy(() => internshipArea().then((m) => ({ default: m.ApplyPage })))
const MyApplicationsPage = lazy(() => internshipArea().then((m) => ({ default: m.MyApplicationsPage })))
const CandidacyDetailPage = lazy(() => internshipArea().then((m) => ({ default: m.CandidacyDetailPage })))
const MyNominationsPage = lazy(() => internshipArea().then((m) => ({ default: m.MyNominationsPage })))
const OpportunityRequestsPage = lazy(() => internshipArea().then((m) => ({ default: m.OpportunityRequestsPage })))
const NominateStudentsPage = lazy(() => internshipArea().then((m) => ({ default: m.NominateStudentsPage })))
const UniversityNominationsPage = lazy(() => internshipArea().then((m) => ({ default: m.UniversityNominationsPage })))
const CandidatePoolPage = lazy(() => internshipArea().then((m) => ({ default: m.CandidatePoolPage })))
// Phase 11: the organization-wide candidate pipeline, read one pool per recruiting internship
// because the API addresses candidacies per opportunity.
const OrganizationCandidatesPage = lazy(() => internshipArea().then((m) => ({ default: m.OrganizationCandidatesPage })))
const UniversityPartnersPage = lazy(() => organizationArea().then((m) => ({ default: m.UniversityPartnersPage })))
// Phase 13: the organization supervisor's cross-placement queue, over the two internship records
// the role may act on. It reads only the placement list the API already scoped to their assignments.
const OrganizationSupervisionQueuePage = lazy(() => organizationArea().then((m) => ({ default: m.OrganizationSupervisionQueuePage })))
const CandidateDetailPage = lazy(() => internshipArea().then((m) => ({ default: m.CandidateDetailPage })))
const MyPlacementsPage = lazy(() => internshipArea().then((m) => ({ default: m.MyPlacementsPage })))
const StudentPlacementDetailPage = lazy(() => internshipArea().then((m) => ({ default: m.StudentPlacementDetailPage })))
const UniversityPlacementsPage = lazy(() => internshipArea().then((m) => ({ default: m.UniversityPlacementsPage })))
const OrganizationPlacementsPage = lazy(() => internshipArea().then((m) => ({ default: m.OrganizationPlacementsPage })))
const PlacementDetailPage = lazy(() => internshipArea().then((m) => ({ default: m.PlacementDetailPage })))
// Phase 6 internship management. One placement is a workspace with sections; which sections exist
// mirrors the backend's authorization split, and the backend enforces it regardless.
const PlacementWorkspace = lazy(() => internshipArea().then((m) => ({ default: m.PlacementWorkspace })))
const WeeklyLogsPage = lazy(() => internshipArea().then((m) => ({ default: m.WeeklyLogsPage })))
const AttendancePage = lazy(() => internshipArea().then((m) => ({ default: m.AttendancePage })))
const EvaluationPage = lazy(() => internshipArea().then((m) => ({ default: m.EvaluationPage })))
const FinalReportPage = lazy(() => internshipArea().then((m) => ({ default: m.FinalReportPage })))
const DefensePage = lazy(() => internshipArea().then((m) => ({ default: m.DefensePage })))
const InternshipPolicyPage = lazy(() => universityArea().then((m) => ({ default: m.InternshipPolicyPage })))
// Phase 7 platform administration. Which tabs render is driven by the caller's platform roles;
// every endpoint behind them re-authorizes independently (CLAUDE.md section 24).
const AdminAreaLayout = lazy(() => adminArea().then((m) => ({ default: m.AdminAreaLayout })))
import {
  AdminLandingRedirect,
  RequirePlatformCapability,
} from '../../features/admin/components/RequirePlatformCapability'
const AdminDashboardPage = lazy(() => adminArea().then((m) => ({ default: m.AdminDashboardPage })))
const AdminOrganizationsPage = lazy(() => adminArea().then((m) => ({ default: m.AdminOrganizationsPage })))
const AdminUniversitiesPage = lazy(() => adminArea().then((m) => ({ default: m.AdminUniversitiesPage })))
const AdminEscalationsPage = lazy(() => adminArea().then((m) => ({ default: m.AdminEscalationsPage })))
const AdminUsersPage = lazy(() => adminArea().then((m) => ({ default: m.AdminUsersPage })))
const AdminOpportunitiesPage = lazy(() => adminArea().then((m) => ({ default: m.AdminOpportunitiesPage })))
const AdminPrivacyRequestsPage = lazy(() => adminArea().then((m) => ({ default: m.AdminPrivacyRequestsPage })))
const AdminLegalDocumentsPage = lazy(() => adminArea().then((m) => ({ default: m.AdminLegalDocumentsPage })))
const AdminTestimonialsPage = lazy(() => adminArea().then((m) => ({ default: m.AdminTestimonialsPage })))
const MyTestimonialPage = lazy(() => accountArea().then((m) => ({ default: m.MyTestimonialPage })))
const AdminAuditPage = lazy(() => adminArea().then((m) => ({ default: m.AdminAuditPage })))
const AdminPlatformRolesPage = lazy(() => adminArea().then((m) => ({ default: m.AdminPlatformRolesPage })))
// Phase 14: the Super Admin console's record pages, over admin endpoints that already existed.
const AdminUserDetailPage = lazy(() => adminArea().then((m) => ({ default: m.AdminUserDetailPage })))
const AdminOrganizationDetailPage = lazy(() => adminArea().then((m) => ({ default: m.AdminOrganizationDetailPage })))
const AdminUniversityDetailPage = lazy(() => adminArea().then((m) => ({ default: m.AdminUniversityDetailPage })))
// Phase 7 account area and public legal documents.
const AccountProfilePage = lazy(() => accountArea().then((m) => ({ default: m.AccountProfilePage })))
const NotificationsPage = lazy(() => accountArea().then((m) => ({ default: m.NotificationsPage })))
const PrivacyPage = lazy(() => accountArea().then((m) => ({ default: m.PrivacyPage })))
import { LegalDocumentPage } from '../../features/legal/pages/LegalDocumentPage'

/**
 * Route foundation — PublicLayout now also hosts the Phase 1 authentication pages, and each
 * role-area layout is gated behind RequireAuth (CLAUDE.md section 61 Phase 1 scope; this is UX
 * only, real authorization is enforced by the backend per CLAUDE.md section 24). Real feature
 * routes for each area are added phase by phase.
 */
export const router = createBrowserRouter([
  {
    // Pathless: it adds no URL segment and matches everything, so no route address changes.
    element: <RootRoute />,
    children: [
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'about', element: <AboutPage /> },
      { path: 'opportunities', element: <PublicOpportunityListPage /> },
      { path: 'opportunities/:opportunityId', element: <PublicOpportunityDetailPage /> },
      { path: 'organizations', element: <PublicOrganizationListPage /> },
      { path: 'organizations/:organizationId', element: <PublicOrganizationProfilePage /> },
      { path: 'universities', element: <PublicUniversitiesPage /> },
      { path: 'universities/:universityId', element: <PublicUniversityProfilePage /> },
      // Phase 7 legal documents. Public and unauthenticated on purpose: someone deciding whether to
      // register must be able to read the terms first (CLAUDE.md section 49).
      { path: 'legal/terms', element: <LegalDocumentPage documentType="TERMS" /> },
      { path: 'legal/privacy-policy', element: <LegalDocumentPage documentType="PRIVACY_POLICY" /> },
      { path: 'legal/cookie-policy', element: <LegalDocumentPage documentType="COOKIE_POLICY" /> },
    ],
  },
  {
    // Chrome-free auth shell (design references 06-09) — no public header/footer, see AuthLayout.
    element: <AuthLayout />,
    children: [
      { path: 'register', element: <RegisterPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'verify-email', element: <VerifyEmailPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
      // Signed-in, no workspace yet (see GetStartedPage). Inside the auth shell because it is the
      // last step of getting an account going, not a page of any one portal.
      {
        path: 'get-started',
        element: (
          <RequireAuth>
            <GetStartedPage />
          </RequireAuth>
        ),
      },
    ],
  },
  {
    path: '/student',
    element: (
      <RequireAuth>
        <StudentAreaLayout />
      </RequireAuth>
    ),
    children: [
      {
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard', element: <StudentDashboardPage /> },
          { path: 'enrollment', element: <EnrollmentPage /> },
          { path: 'profile', element: <StudentProfilePage /> },
          // Phase 4 recruitment. The apply route lives under /student because it requires an
          // authenticated student; the opportunity itself stays publicly browsable at /opportunities.
          // Discovery inside the student shell. The public catalogue at /opportunities stays as the
          // signed-out entry point; both read the same public endpoint.
          { path: 'opportunities', element: <BrowseOpportunitiesPage /> },
          { path: 'opportunities/:opportunityId', element: <StudentOpportunityDetailPage /> },
          { path: 'opportunities/:opportunityId/apply', element: <ApplyPage /> },
          { path: 'saved', element: <SavedInternshipsPage /> },
          { path: 'applications', element: <MyApplicationsPage /> },
          { path: 'applications/:candidacyId', element: <CandidacyDetailPage /> },
          { path: 'nominations', element: <MyNominationsPage /> },
          // Phase 5 placement. Read-only for the student — the hosting organization drives the
          // lifecycle and the university decides completion.
          { path: 'placements', element: <MyPlacementsPage /> },
          {
            path: 'placements/:placementId',
            element: <PlacementWorkspace area="student" />,
            children: [
              { index: true, element: <StudentPlacementDetailPage /> },
              // Phase 6. The student authors their own logs, report and disputes.
              { path: 'weekly-logs', element: <WeeklyLogsPage audience="student" /> },
              { path: 'attendance', element: <AttendancePage audience="student" /> },
              { path: 'final-report', element: <FinalReportPage audience="student" /> },
              { path: 'defense', element: <DefensePage audience="student" /> },
            ],
          },
        ],
      },
    ],
  },
  {
    path: '/university',
    element: (
      <RequireAuth>
        <UniversityAreaLayout />
      </RequireAuth>
    ),
    children: [
      {
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard', element: <UniversityDashboardPage /> },

          // Destinations the sidebar hides are unreachable by URL too, gated on the SAME capability
          // flags universityNavigation.ts uses. Live QA measured the matching backend refusals: a
          // supervisor's students / verification-cases / staff requests answer 403, and a
          // coordinator's staff request answers 403.
          {
            element: <RequireUniversityCapability capability="hasStudentDirectory" />,
            children: [{ path: 'students', element: <StudentsPage /> }],
          },
          {
            element: <RequireUniversityCapability capability="canReviewStudents" />,
            children: [
              { path: 'verification-cases', element: <VerificationQueuePage /> },
              { path: 'verification-cases/:caseId', element: <VerificationCaseDetailPage /> },
            ],
          },
          {
            element: <RequireUniversityCapability capability="canManageDepartments" />,
            children: [{ path: 'departments', element: <DepartmentsPage /> }],
          },
          {
            element: <RequireUniversityCapability capability="canProvisionStaff" />,
            children: [{ path: 'staff', element: <StaffPage /> }],
          },
          {
            // Institution-wide read of who hosts this university's students. A supervisor's
            // placement list is their own few assignments, which is not a partner directory.
            element: <RequireUniversityCapability capability="scopedToAssignedPlacements" invert />,
            children: [{ path: 'partners', element: <PartnerOrganizationsPage /> }],
          },
          // Deliberately NOT gated: the page renders read-only for a non-admin, and
          // universityNavigation.ts links every member here so they can see their own tenant.
          { path: 'profile', element: <UniversityProfilePage /> },
          // Phase 10. `my-students` is the supervisor's roster, collapsed from their assigned
          // placements because GET /universities/{id}/students admits only admins and coordinators;
          // `supervision` is the cross-placement review queue, open to all three roles in their own
          // scope. Both are re-authorized per request by the API regardless of who reaches the URL.
          {
            element: <RequireUniversityCapability capability="scopedToAssignedPlacements" />,
            children: [{ path: 'my-students', element: <SupervisedStudentsPage /> }],
          },
          {
            element: <RequireUniversityCapability capability="canReviewAcademicRecords" />,
            children: [{ path: 'supervision', element: <SupervisionQueuePage /> }],
          },
          {
            // Phase 4 nomination workflow.
            element: <RequireUniversityCapability capability="canNominate" />,
            children: [
              { path: 'opportunity-requests', element: <OpportunityRequestsPage /> },
              { path: 'opportunity-requests/:targetId', element: <NominateStudentsPage /> },
              { path: 'nominations', element: <UniversityNominationsPage /> },
            ],
          },
          // Phase 5 placements. The university reads placements and owns the university supervisor.
          { path: 'placements', element: <UniversityPlacementsPage /> },
          {
            path: 'placements/:placementId',
            element: <PlacementWorkspace area="university" />,
            children: [
              { index: true, element: <PlacementDetailPage area="university" /> },
              // Phase 6. Academic supervision: review logs, review the report, run the defense.
              { path: 'weekly-logs', element: <WeeklyLogsPage audience="reviewer" /> },
              { path: 'attendance', element: <AttendancePage audience="observer" /> },
              { path: 'final-report', element: <FinalReportPage audience="reviewer" /> },
              { path: 'defense', element: <DefensePage audience="university" /> },
              // Phase 10. Read-only: PlacementEvaluationService.get admits university staff in
              // scope through requireWorkplaceReadAccess, but every write requires the ASSIGNED
              // ORGANIZATION supervisor, so the university gets `reader` and no authoring controls.
              { path: 'evaluation', element: <EvaluationPage audience="reader" /> },
            ],
          },
          {
            // Phase 6 internship policy — the five completion requirements, per university/department.
            element: <RequireUniversityCapability capability="canConfigurePolicy" />,
            children: [{ path: 'internship-policy', element: <InternshipPolicyPage /> }],
          },
        ],
      },
    ],
  },
  {
    path: '/organization',
    element: (
      <RequireAuth>
        <OrganizationAreaLayout />
      </RequireAuth>
    ),
    children: [
      {
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard', element: <OrganizationDashboardPage /> },

          // Destinations the sidebar hides are unreachable by URL too. Each group is gated on the
          // SAME capability flag organizationNavigation.ts uses, so nav and routing cannot drift.
          {
            element: <RequireOrganizationCapability capability="canManageOpportunities" />,
            children: [
              { path: 'opportunities', element: <OpportunityListPage /> },
              { path: 'opportunities/new', element: <CreateOpportunityPage /> },
              { path: 'opportunities/:opportunityId', element: <OpportunityDetailPage /> },
            ],
          },
          {
            // Phase 4 candidate management — ONE unified pool per opportunity.
            // CandidacyAuthorization.RECRUITING_ROLES excludes ORGANIZATION_SUPERVISOR, which live
            // QA confirmed: a supervisor's candidate request answers 403.
            element: <RequireOrganizationCapability capability="canManageCandidates" />,
            children: [
              { path: 'opportunities/:opportunityId/candidates', element: <CandidatePoolPage /> },
              { path: 'candidacies/:candidacyId', element: <CandidateDetailPage /> },
              // Phase 11. Every candidate across the internships this organization is recruiting for.
              { path: 'candidates', element: <OrganizationCandidatesPage /> },
            ],
          },
          {
            // Phase 11. Partner universities, derived from the organization's own placement list.
            element: <RequireOrganizationCapability capability="canAdministerOrganization" />,
            children: [
              { path: 'partners', element: <UniversityPartnersPage /> },
              { path: 'staff', element: <OrganizationStaffPage /> },
            ],
          },
          {
            // Phase 13. Attendance and evaluations across this supervisor's assigned interns.
            element: <RequireOrganizationCapability capability="scopedToAssignedPlacements" />,
            children: [{ path: 'supervision', element: <OrganizationSupervisionQueuePage /> }],
          },
          // Phase 5 placements. Open to every member — the hosting organization drives the
          // lifecycle, and a supervisor's list is narrowed server-side to their own assignments.
          { path: 'placements', element: <OrganizationPlacementsPage /> },
          {
            path: 'placements/:placementId',
            element: <PlacementWorkspace area="organization" />,
            children: [
              { index: true, element: <PlacementDetailPage area="organization" /> },
              // Phase 6. Workplace records only — weekly logs, the final report and the defense are
              // university-only academic content and have no route here.
              { path: 'attendance', element: <AttendancePage audience="supervisor" /> },
              { path: 'evaluation', element: <EvaluationPage audience="evaluator" /> },
            ],
          },
          // Deliberately NOT gated: the page already renders read-only for a non-admin, and
          // organizationNavigation.ts links every member here so they can see their own tenant.
          { path: 'profile', element: <OrganizationProfilePage /> },
        ],
      },
    ],
  },
  {
    path: '/admin',
    element: (
      <RequireAuth>
        <AdminAreaLayout />
      </RequireAuth>
    ),
    children: [
      {
        children: [
          // Phase E. Each destination sits behind the capability that governs its API, mirrored from
          // PlatformAuthorization through adminCapabilities — the same flags that build the sidebar,
          // so a hidden destination is also unreachable by typing its URL. UX only: every endpoint
          // re-authorizes from current PostgreSQL data regardless of who reaches the route
          // (CLAUDE.md section 24). What the guards remove is a verification officer opening a
          // Super Admin page and watching every query on it answer 403.
          { index: true, element: <AdminLandingRedirect /> },
          {
            // requireReviewer — SUPER_ADMIN + VERIFICATION_OFFICER. The reason the second role
            // exists, so it is the widest gate in the console.
            element: <RequirePlatformCapability capability="canReviewInstitutions" />,
            children: [
              { path: 'organizations', element: <AdminOrganizationsPage /> },
              // Phase 14. Institution review happens on the record, not in a list row — GET
              // /admin/{organizations,universities}/{id} already existed and was never called.
              { path: 'organizations/:organizationId', element: <AdminOrganizationDetailPage /> },
              { path: 'universities', element: <AdminUniversitiesPage /> },
              { path: 'universities/:universityId', element: <AdminUniversityDetailPage /> },
            ],
          },
          {
            element: <RequirePlatformCapability capability="canReviewStudentCases" />,
            children: [{ path: 'verification-escalations', element: <AdminEscalationsPage /> }],
          },
          {
            element: <RequirePlatformCapability capability="canReadStatistics" />,
            children: [{ path: 'dashboard', element: <AdminDashboardPage /> }],
          },
          {
            element: <RequirePlatformCapability capability="canAdministerAccounts" />,
            children: [
              { path: 'users', element: <AdminUsersPage /> },
              // Phase 14. GET /admin/users/{id}, likewise already on AdminController.
              { path: 'users/:userId', element: <AdminUserDetailPage /> },
            ],
          },
          {
            // Backend Phase B6: platform-wide opportunity oversight. Read-only — no detail route,
            // because the record opens in a drawer over the filtered table.
            element: <RequirePlatformCapability capability="canOverseeOpportunities" />,
            children: [{ path: 'opportunities', element: <AdminOpportunitiesPage /> }],
          },
          {
            element: <RequirePlatformCapability capability="canAdministerCompliance" />,
            children: [
              { path: 'privacy-requests', element: <AdminPrivacyRequestsPage /> },
              { path: 'legal-documents', element: <AdminLegalDocumentsPage /> },
              { path: 'testimonials', element: <AdminTestimonialsPage /> },
            ],
          },
          {
            element: <RequirePlatformCapability capability="canReadAuditTrail" />,
            children: [{ path: 'audit', element: <AdminAuditPage /> }],
          },
          {
            // Platform-role grants and the managed verification-officer accounts that live on the
            // same page. Provisioning is not self-replicating: an officer must never reach this.
            element: <RequirePlatformCapability capability="canManagePlatformRoles" />,
            children: [{ path: 'platform-roles', element: <AdminPlatformRolesPage /> }],
          },
        ],
      },
    ],
  },
  {
    // Phase 7. Role-neutral: every signed-in person has notifications and privacy controls,
    // whatever else they are on FursadHub.
    path: '/account',
    element: (
      <RequireAuth>
        <AccountLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="profile" replace /> },
      { path: 'profile', element: <AccountProfilePage /> },
      { path: 'notifications', element: <NotificationsPage /> },
      { path: 'privacy', element: <PrivacyPage /> },
      { path: 'testimonial', element: <MyTestimonialPage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
  ],
  },
])
