import { useEffect, useRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/utils/cn'
import { Icon } from './Icon'
import { IconButton } from './IconButton'
export interface DrawerProps { open:boolean; onClose:()=>void; title:string; children:ReactNode; side?:'left'|'right'; footer?:ReactNode; closeLabel?:string }
export function Drawer({open,onClose,title,children,side='right',footer,closeLabel}:DrawerProps){
  const {t}=useTranslation()
  const panelRef=useRef<HTMLElement>(null)
  const triggerFocusRef=useRef<HTMLElement|null>(null)
  // Same contract as AppShell's mobile nav drawer: focus moves into the panel on open, Escape
  // closes it, and focus returns to whatever opened it — so a keyboard/screen-reader user is never
  // left wondering where they landed or stranded past a closed drawer.
  useEffect(()=>{
    if(!open) return undefined
    triggerFocusRef.current=document.activeElement as HTMLElement|null
    panelRef.current?.querySelector<HTMLElement>('a,button,input,select,textarea')?.focus()
    function handleKeyDown(e:KeyboardEvent){if(e.key==='Escape')onClose()}
    document.addEventListener('keydown',handleKeyDown)
    return ()=>{
      document.removeEventListener('keydown',handleKeyDown)
      triggerFocusRef.current?.focus()
    }
  },[open,onClose])
  if(!open)return null
  const resolvedCloseLabel=closeLabel??t('common:a11y.closeDrawer')
  return <div className="fixed inset-0 z-50" role="presentation"><button aria-label={resolvedCloseLabel} className="absolute inset-0 bg-overlay" onClick={onClose}/><aside ref={panelRef} role="dialog" aria-modal="true" aria-label={title} className={cn('absolute inset-y-0 flex w-[min(26rem,90vw)] flex-col bg-surface shadow-lg motion-safe:animate-menu-in motion-reduce:animate-none',side==='right'?'right-0':'left-0')}><header className="flex items-center justify-between border-b border-border p-4"><h2 className="font-bold">{title}</h2><IconButton label={resolvedCloseLabel} onClick={onClose}><Icon name="close" className="size-5"/></IconButton></header><div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>{footer&&<footer className="border-t border-border p-4">{footer}</footer>}</aside></div>
}
