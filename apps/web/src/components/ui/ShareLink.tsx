import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from './Icon'
export function ShareLink() {
  const { t } = useTranslation()
  const [result, setResult] = useState<'copied' | 'failed' | null>(null)
  return <div className="relative"><button type="button" aria-label={t('common:remediation.share')} title={t('common:remediation.share')} onClick={async () => {
    try { await navigator.clipboard.writeText(window.location.href); setResult('copied') } catch { setResult('failed') }
  }} className="flex size-10 items-center justify-center rounded-lg border border-border text-brand-navy focus-visible:ring-2 focus-visible:ring-focus-ring"><Icon name="link" className="size-5" /></button>
    {result && <div role="status" className="absolute end-0 top-11 z-20 w-60 rounded-lg border border-border bg-surface p-3 text-xs shadow-md">{t(`common:remediation.${result === 'copied' ? 'copied' : 'shareFailed'}`)}{result === 'failed' && <input aria-label={t('common:remediation.shareFailed')} readOnly value={window.location.href} onFocus={e => e.currentTarget.select()} className="mt-2 w-full rounded border border-border p-2" />}</div>}
  </div>
}
