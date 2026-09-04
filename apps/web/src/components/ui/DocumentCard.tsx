import type { ReactNode } from 'react'
import { Icon } from './Icon'
import { Card } from './Card'
export interface DocumentCardProps { name:string; meta?:ReactNode; status?:ReactNode; actions?:ReactNode; className?:string }
export function DocumentCard({name,meta,status,actions,className}:DocumentCardProps){return <Card padding="sm" className={className}><div className="flex min-w-0 items-center gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-brand-blue-soft text-brand-primary dark:bg-info-bg dark:text-info"><Icon name="document" className="size-5"/></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-foreground">{name}</p>{meta&&<div className="mt-0.5 text-xs text-muted">{meta}</div>}</div>{status}{actions}</div></Card>}
