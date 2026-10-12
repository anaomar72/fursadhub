# Astra route inventory

Generated from the TypeScript route tree at 4b7b9ab. Includes parent layouts, index redirects and wildcard; pathless guards are inherited in routes.json. Route presence is not proof of runtime authorization.

| Route | Element | Router line |
|---|---|---|
| `/` | `<PublicLayout />` | 132 |
| `/` (index) | `<HomePage />` | 136 |
| `/about` | `<AboutPage />` | 137 |
| `/opportunities` | `<PublicOpportunityListPage />` | 138 |
| `/opportunities/:opportunityId` | `<PublicOpportunityDetailPage />` | 139 |
| `/organizations` | `<PublicOrganizationListPage />` | 140 |
| `/organizations/:organizationId` | `<PublicOrganizationProfilePage />` | 141 |
| `/universities` | `<PublicUniversitiesPage />` | 142 |
| `/universities/:universityId` | `<PublicUniversityProfilePage />` | 143 |
| `/legal/terms` | `<LegalDocumentPage documentType="TERMS" />` | 146 |
| `/legal/privacy-policy` | `<LegalDocumentPage documentType="PRIVACY_POLICY" />` | 147 |
| `/legal/cookie-policy` | `<LegalDocumentPage documentType="COOKIE_POLICY" />` | 148 |
| `/register` | `<RegisterPage />` | 155 |
| `/login` | `<LoginPage />` | 156 |
| `/verify-email` | `<VerifyEmailPage />` | 157 |
| `/forgot-password` | `<ForgotPasswordPage />` | 158 |
| `/reset-password` | `<ResetPasswordPage />` | 159 |
| `/get-started` | `( <RequireAuth> <GetStartedPage /> </RequireAuth> )` | 162 |
| `/student` | `( <RequireAuth> <StudentAreaLayout /> </RequireAuth> )` | 172 |
| `/student/` (index) | `<Navigate to="dashboard" replace />` | 182 |
| `/student/dashboard` | `<StudentDashboardPage />` | 183 |
| `/student/enrollment` | `<EnrollmentPage />` | 184 |
| `/student/profile` | `<StudentProfilePage />` | 185 |
| `/student/opportunities` | `<BrowseOpportunitiesPage />` | 190 |
| `/student/opportunities/:opportunityId` | `<StudentOpportunityDetailPage />` | 191 |
| `/student/opportunities/:opportunityId/apply` | `<ApplyPage />` | 192 |
| `/student/saved` | `<SavedInternshipsPage />` | 193 |
| `/student/applications` | `<MyApplicationsPage />` | 194 |
| `/student/applications/:candidacyId` | `<CandidacyDetailPage />` | 195 |
| `/student/nominations` | `<MyNominationsPage />` | 196 |
| `/student/placements` | `<MyPlacementsPage />` | 199 |
| `/student/placements/:placementId` | `<PlacementWorkspace area="student" />` | 200 |
| `/student/placements/:placementId/` (index) | `<StudentPlacementDetailPage />` | 204 |
| `/student/placements/:placementId/weekly-logs` | `<WeeklyLogsPage audience="student" />` | 206 |
| `/student/placements/:placementId/attendance` | `<AttendancePage audience="student" />` | 207 |
| `/student/placements/:placementId/final-report` | `<FinalReportPage audience="student" />` | 208 |
| `/student/placements/:placementId/defense` | `<DefensePage audience="student" />` | 209 |
| `/university` | `( <RequireAuth> <UniversityAreaLayout /> </RequireAuth> )` | 216 |
| `/university/` (index) | `<Navigate to="dashboard" replace />` | 226 |
| `/university/dashboard` | `<UniversityDashboardPage />` | 227 |
| `/university/students` | `<StudentsPage />` | 235 |
| `/university/verification-cases` | `<VerificationQueuePage />` | 240 |
| `/university/verification-cases/:caseId` | `<VerificationCaseDetailPage />` | 241 |
| `/university/departments` | `<DepartmentsPage />` | 246 |
| `/university/staff` | `<StaffPage />` | 250 |
| `/university/partners` | `<PartnerOrganizationsPage />` | 256 |
| `/university/profile` | `<UniversityProfilePage />` | 260 |
| `/university/my-students` | `<SupervisedStudentsPage />` | 267 |
| `/university/supervision` | `<SupervisionQueuePage />` | 271 |
| `/university/opportunity-requests` | `<OpportunityRequestsPage />` | 277 |
| `/university/opportunity-requests/:targetId` | `<NominateStudentsPage />` | 278 |
| `/university/nominations` | `<UniversityNominationsPage />` | 279 |
| `/university/placements` | `<UniversityPlacementsPage />` | 283 |
| `/university/placements/:placementId` | `<PlacementWorkspace area="university" />` | 284 |
| `/university/placements/:placementId/` (index) | `<UniversityPlacementOverview />` | 289 |
| `/university/placements/:placementId/weekly-logs` | `<WeeklyLogsPage audience="reviewer" />` | 291 |
| `/university/placements/:placementId/attendance` | `<AttendancePage audience="observer" />` | 292 |
| `/university/placements/:placementId/final-report` | `<FinalReportPage audience="reviewer" />` | 293 |
| `/university/placements/:placementId/defense` | `<DefensePage audience="university" />` | 294 |
| `/university/placements/:placementId/evaluation` | `<EvaluationPage audience="reader" />` | 298 |
| `/university/internship-policy` | `<InternshipPolicyPage />` | 304 |
| `/organization` | `( <RequireAuth> <OrganizationAreaLayout /> </RequireAuth> )` | 310 |
| `/organization/` (index) | `<Navigate to="dashboard" replace />` | 320 |
| `/organization/dashboard` | `<OrganizationDashboardPage />` | 321 |
| `/organization/opportunities` | `<OpportunityListPage />` | 328 |
| `/organization/opportunities/new` | `<CreateOpportunityPage />` | 329 |
| `/organization/opportunities/:opportunityId` | `<OpportunityDetailPage />` | 330 |
| `/organization/opportunities/:opportunityId/candidates` | `<CandidatePoolPage />` | 339 |
| `/organization/candidacies/:candidacyId` | `<CandidateDetailPage />` | 340 |
| `/organization/candidates` | `<OrganizationCandidatesPage />` | 342 |
| `/organization/partners` | `<UniversityPartnersPage />` | 349 |
| `/organization/staff` | `<OrganizationStaffPage />` | 350 |
| `/organization/supervision` | `<OrganizationSupervisionQueuePage />` | 356 |
| `/organization/placements` | `<OrganizationPlacementsPage />` | 360 |
| `/organization/placements/:placementId` | `<PlacementWorkspace area="organization" />` | 361 |
| `/organization/placements/:placementId/` (index) | `<OrganizationPlacementOverview />` | 367 |
| `/organization/placements/:placementId/attendance` | `<AttendancePage audience="supervisor" />` | 370 |
| `/organization/placements/:placementId/evaluation` | `<EvaluationPage audience="evaluator" />` | 371 |
| `/organization/profile` | `<OrganizationProfilePage />` | 376 |
| `/admin` | `( <RequireAuth> <AdminAreaLayout /> </RequireAuth> )` | 381 |
| `/admin/` (index) | `<AdminLandingRedirect />` | 397 |
| `/admin/organizations` | `<AdminOrganizationsPage />` | 403 |
| `/admin/organizations/:organizationId` | `<AdminOrganizationDetailPage />` | 406 |
| `/admin/universities` | `<AdminUniversitiesPage />` | 407 |
| `/admin/universities/:universityId` | `<AdminUniversityDetailPage />` | 408 |
| `/admin/verification-escalations` | `<AdminEscalationsPage />` | 413 |
| `/admin/dashboard` | `<AdminDashboardPage />` | 417 |
| `/admin/users` | `<AdminUsersPage />` | 422 |
| `/admin/users/:userId` | `<AdminUserDetailPage />` | 424 |
| `/admin/opportunities` | `<AdminOpportunitiesPage />` | 431 |
| `/admin/privacy-requests` | `<AdminPrivacyRequestsPage />` | 436 |
| `/admin/legal-documents` | `<AdminLegalDocumentsPage />` | 437 |
| `/admin/testimonials` | `<AdminTestimonialsPage />` | 438 |
| `/admin/audit` | `<AdminAuditPage />` | 443 |
| `/admin/platform-roles` | `<AdminPlatformRolesPage />` | 449 |
| `/account` | `( <RequireAuth> <AccountLayout /> </RequireAuth> )` | 455 |
| `/account/` (index) | `<Navigate to="profile" replace />` | 465 |
| `/account/profile` | `<AccountProfilePage />` | 466 |
| `/account/notifications` | `<NotificationsPage />` | 467 |
| `/account/privacy` | `<PrivacyPage />` | 468 |
| `/account/testimonial` | `<MyTestimonialPage />` | 469 |
| `/*` | `<NotFoundPage />` | 472 |
