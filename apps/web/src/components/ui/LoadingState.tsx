import { useTranslation } from 'react-i18next'
import { LoadingSpinner } from './LoadingSpinner'
export function LoadingState({label}:{label?:string}){const {t}=useTranslation();return <div role="status" className="flex min-h-32 flex-col items-center justify-center gap-3 rounded-lg border border-border bg-surface p-6 text-sm text-muted"><LoadingSpinner/><span>{label??t('common:status.loading')}</span></div>}
