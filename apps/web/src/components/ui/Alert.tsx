import type { ReactNode } from 'react'
import { cn } from '../../lib/utils/cn'
import { Icon } from './Icon'
export type AlertTone='info'|'success'|'warning'|'danger'
const styles={info:'border-info text-info bg-info-bg',success:'border-success text-success bg-success-bg',warning:'border-warning text-warning bg-warning-bg',danger:'border-danger text-danger bg-danger-bg'}
export function Alert({tone='info',title,children,actions,className}:{tone?:AlertTone;title?:string;children:ReactNode;actions?:ReactNode;className?:string}){return <div role={tone==='danger'?'alert':'status'} className={cn('flex items-start gap-3 rounded-lg border p-4',styles[tone],className)}><Icon name={tone==='info'?'info':tone==='success'?'check':'alert'} className="mt-0.5 size-5 shrink-0"/><div className="min-w-0 flex-1">{title&&<p className="font-semibold">{title}</p>}<div className="text-sm text-foreground-secondary">{children}</div></div>{actions}</div>}
