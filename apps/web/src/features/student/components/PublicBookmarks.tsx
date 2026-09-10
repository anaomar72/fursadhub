import { createContext, useContext, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStudentMarketplaceAccess } from '../hooks/useStudentMarketplaceAccess'
import { useSavedOpportunityStatus, type SavedStatus } from '../hooks/useSavedOpportunities'
import { BookmarkButton } from './BookmarkButton'
import { Icon } from '../../../components/ui'

const Context = createContext<{ authenticated: boolean; canAct: boolean; status: SavedStatus } | null>(null)
export function PublicBookmarks({ ids, children }: { ids: string[]; children: ReactNode }) {
  const { isAuthenticated, canAct } = useStudentMarketplaceAccess()
  const status = useSavedOpportunityStatus(ids, { enabled: canAct })
  return <Context.Provider value={{ authenticated: isAuthenticated, canAct, status }}>{children}</Context.Provider>
}
export function PublicBookmark({ id, inline = false }: { id: string; inline?: boolean }) {
  const { t } = useTranslation()
  const location = useLocation()
  const ctx = useContext(Context)
  if (!ctx) return null
  if (ctx.authenticated && !ctx.canAct) return null
  if (!ctx.authenticated) return <Link to="/login" state={{ from: location }} title={t('student:saved.save')} aria-label={t('student:saved.save')} className={`relative z-10 inline-flex items-center justify-center gap-2 rounded-lg text-foreground-secondary focus-visible:ring-2 focus-visible:ring-focus-ring ${inline ? 'h-10 w-full border border-border px-3 text-sm font-semibold' : 'size-8'}`}><Icon name="bookmark" className="size-4" />{inline && t('student:saved.save')}</Link>
  return <BookmarkButton opportunityId={id} saved={ctx.status.isSaved(id)} disabled={ctx.status.isLoading} available={!ctx.status.isUnavailable} variant={inline ? 'inline' : 'card'} className={inline ? 'w-full' : undefined} />
}
