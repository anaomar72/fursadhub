import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as universityApi from '../api/universityApi'
import { useUniversityMembership } from '../components/UniversityMembershipContext'
import { LoadingSpinner, Select, StatusBadge } from '../../../components/ui'
import type { StatusTone } from '../../../components/ui'

const STATUS_TONE: Record<string, StatusTone> = {
  DRAFT: 'neutral',
  SUBMITTED: 'info',
  UNDER_REVIEW: 'info',
  NEEDS_MORE_EVIDENCE: 'warning',
  VERIFIED: 'success',
  REJECTED: 'danger',
  REVOKED: 'danger',
}

export function StudentsPage() {
  const { t } = useTranslation()
  const { universityId, role, departmentIds } = useUniversityMembership()
  const [departmentId, setDepartmentId] = useState<string>(role === 'DEPARTMENT_COORDINATOR' && departmentIds.length === 1 ? departmentIds[0] : '')

  const departmentsQuery = useQuery({ queryKey: ['departments', universityId], queryFn: () => universityApi.listDepartments(universityId) })
  const studentsQuery = useQuery({
    queryKey: ['university', 'students', universityId, departmentId],
    queryFn: () => universityApi.listStudents(universityId, departmentId || undefined),
  })

  const visibleDepartments =
    role === 'UNIVERSITY_ADMIN' ? departmentsQuery.data : departmentsQuery.data?.filter((d) => departmentIds.includes(d.id))

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-foreground">{t('university:students.title')}</h1>
        <Select className="w-auto" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
          <option value="">{t('university:students.allDepartments')}</option>
          {visibleDepartments?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
      </div>

      {studentsQuery.isLoading ? (
        <div className="flex justify-center py-10">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase text-foreground-secondary">
              <tr>
                <th className="px-4 py-2">{t('university:students.email')}</th>
                <th className="px-4 py-2">{t('university:students.studentNumber')}</th>
                <th className="px-4 py-2">{t('university:students.program')}</th>
                <th className="px-4 py-2">{t('university:students.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {studentsQuery.data?.map((student) => (
                <tr key={student.enrollmentId}>
                  <td className="px-4 py-2 text-foreground">{student.email}</td>
                  <td className="px-4 py-2 text-foreground-secondary">{student.studentNumber}</td>
                  <td className="px-4 py-2 text-foreground-secondary">{student.program}</td>
                  <td className="px-4 py-2">
                    <StatusBadge tone={STATUS_TONE[student.verificationStatus] ?? 'neutral'}>
                      {t(`university:students.statusValues.${student.verificationStatus}`)}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
              {studentsQuery.data?.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-foreground-secondary">
                    {t('university:students.empty')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
