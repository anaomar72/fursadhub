import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '../../../lib/utils/cn'

export type InternshipArea = 'student' | 'university' | 'organization'

/**
 * Which internship-management sections each area may open.
 *
 * <p>This mirrors the backend's authorization split rather than inventing its own: academic
 * supervision content (weekly logs, the final report, defense) is the student's and the
 * university's, while workplace content (attendance, the evaluation) is shared with the host
 * organization. Hiding a link the backend would refuse keeps the UI honest — but the backend refuses
 * it regardless, since route guards are UX only (CLAUDE.md section 24).
 */
const SECTIONS: Record<InternshipArea, { path: string; labelKey: string }[]> = {
  student: [
    { path: '', labelKey: 'internship:nav.overview' },
    { path: 'weekly-logs', labelKey: 'internship:nav.weeklyLogs' },
    { path: 'attendance', labelKey: 'internship:nav.attendance' },
    { path: 'final-report', labelKey: 'internship:nav.finalReport' },
    { path: 'defense', labelKey: 'internship:nav.defense' },
  ],
  university: [
    { path: '', labelKey: 'internship:nav.overview' },
    { path: 'weekly-logs', labelKey: 'internship:nav.weeklyLogs' },
    { path: 'attendance', labelKey: 'internship:nav.attendance' },
    { path: 'final-report', labelKey: 'internship:nav.finalReport' },
    { path: 'defense', labelKey: 'internship:nav.defense' },
  ],
  // No weekly logs, no final report, no defense: those are university-only academic records.
  organization: [
    { path: '', labelKey: 'internship:nav.overview' },
    { path: 'attendance', labelKey: 'internship:nav.attendance' },
    { path: 'evaluation', labelKey: 'internship:nav.evaluation' },
  ],
}

interface InternshipNavProps {
  area: InternshipArea
  basePath: string
}

/**
 * Section navigation for one placement.
 *
 * <p>Horizontally scrollable rather than wrapping, so the longer Somali labels do not push the
 * layout wider than the viewport on a phone (BRAND_AND_UI_GUIDELINES.md — Somali text must not break
 * layout).
 */
export function InternshipNav({ area, basePath }: InternshipNavProps) {
  const { t } = useTranslation()

  return (
    <nav aria-label={t('internship:nav.label')} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-1 border-b border-border">
        {SECTIONS[area].map((section) => (
          <li key={section.path || 'overview'}>
            <NavLink
              to={section.path ? `${basePath}/${section.path}` : basePath}
              end={section.path === ''}
              className={({ isActive }) =>
                cn(
                  'inline-block whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-colors duration-150',
                  isActive
                    ? 'border-brand-primary font-medium text-foreground'
                    : 'border-transparent text-foreground-secondary hover:text-foreground',
                )
              }
            >
              {t(section.labelKey)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
