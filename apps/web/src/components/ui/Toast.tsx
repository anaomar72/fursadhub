import { useEffect, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/utils/cn'
import { Icon } from './Icon'
import { IconButton } from './IconButton'
export type ToastTone='info'|'success'|'warning'|'danger'
export interface ToastProps { open:boolean; onClose:()=>void; title:string; description?:ReactNode; tone?:ToastTone; duration?:number; action?:ReactNode; className?:string }
const tones={info:'border-info',success:'border-success',warning:'border-warning',danger:'border-danger'}
export function Toast({open,onClose,title,description,tone='info',duration=5000,action,className}:ToastProps){const {t}=useTranslation();useEffect(()=>{if(!open||duration<=0)return;const id=window.setTimeout(onClose,duration);return()=>window.clearTimeout(id)},[open,onClose,duration]);if(!open)return null;return <div role={tone==='danger'?'alert':'status'} aria-live={tone==='danger'?'assertive':'polite'} className={cn('pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border bg-surface p-4 text-foreground shadow-lg motion-safe:animate-menu-in motion-reduce:animate-none',tones[tone],className)}><Icon name={tone==='success'?'check':tone==='info'?'info':'alert'} className="mt-0.5 size-5 shrink-0"/><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{title}</p>{description&&<div className="mt-1 text-sm text-foreground-secondary">{description}</div>}{action&&<div className="mt-2">{action}</div>}</div><IconButton size="sm" label={t('common:a11y.dismissNotification')} onClick={onClose}><Icon name="close" className="size-4"/></IconButton></div>}
export function ToastViewport({children}:{children:ReactNode}){const {t}=useTranslation();return <div className="pointer-events-none fixed inset-x-4 top-4 z-[70] flex flex-col items-end gap-2 sm:left-auto sm:w-96" aria-label={t('common:a11y.notifications')}>{children}</div>}
