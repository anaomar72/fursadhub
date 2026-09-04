import type { ReactNode } from 'react'
import { Card } from './Card'
import { Avatar } from './Avatar'
export interface EntityCardProps { name:string; subtitle?:string; imageUrl?:string|null; meta?:ReactNode; actions?:ReactNode; children?:ReactNode; className?:string }
export function EntityCard({name,subtitle,imageUrl,meta,actions,children,className}:EntityCardProps){return <Card className={className}><div className="flex min-w-0 items-start gap-3"><Avatar name={name} src={imageUrl}/><div className="min-w-0 flex-1"><h3 className="truncate font-semibold text-foreground">{name}</h3>{subtitle&&<p className="mt-0.5 truncate text-sm text-muted">{subtitle}</p>}{meta&&<div className="mt-2 text-sm text-foreground-secondary">{meta}</div>}</div>{actions}</div>{children&&<div className="mt-4">{children}</div>}</Card>}
