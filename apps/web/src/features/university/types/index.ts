export type UniversityRole = 'UNIVERSITY_ADMIN' | 'DEPARTMENT_COORDINATOR' | 'UNIVERSITY_SUPERVISOR'

export interface UniversityResponse {
  id: string
  name: string
  slug: string
  city: string | null
  status: string
}

export interface DepartmentResponse {
  id: string
  universityId: string
  name: string
  code: string
}

export interface MyMembershipResponse {
  universityId: string
  role: UniversityRole
  departmentIds: string[]
}

export interface StaffMemberResponse {
  membershipId: string
  userId: string
  email: string | null
  role: UniversityRole
  departmentIds: string[]
  assignedAt: string
}

export interface StudentRowResponse {
  studentUserId: string
  email: string | null
  enrollmentId: string
  departmentId: string
  studentNumber: string
  program: string
  academicYear: string
  verificationStatus: string
}

export interface VerificationCaseResponse {
  id: string
  enrollmentId: string
  status: string
  reviewNotes: string | null
  submittedAt: string | null
  reviewedAt: string | null
  studentEmail: string | null
  universityId: string | null
  departmentId: string | null
  studentNumber: string | null
  program: string | null
  academicYear: string | null
}
