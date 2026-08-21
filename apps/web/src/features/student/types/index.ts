export interface StudentProfileResponse {
  userId: string
  fullName: string
  phone: string | null
}

export interface StudentEnrollmentResponse {
  id: string
  universityId: string
  departmentId: string
  studentNumber: string
  program: string
  academicYear: string
  verificationStatus: string
}

export interface ChallengeResponse {
  code: string
  expiresAt: string
}
