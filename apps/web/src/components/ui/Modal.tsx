import { useEffect, useId, useRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/utils/cn'
import { Icon } from './Icon'
import { IconButton } from './IconButton'
export interface ModalProps { open:boolean; onClose:()=>void; title:string; description?:string; children:ReactNode; footer?:ReactNode; className?:string;
  /** Accessible name of the close control. Defaults to a translated generic label — pass one only
   * when the control needs a more specific name than "Close dialog". */
  closeLabel?:string }
export function Modal({open,onClose,title,description,children,footer,className,closeLabel}:ModalProps){const {t}=useTranslation();const ref=useRef<HTMLDialogElement>(null);const titleId=useId();const descriptionId=useId();useEffect(()=>{const d=ref.current;if(!d)return;if(open&&!d.open)d.showModal();if(!open&&d.open)d.close()},[open]);return <dialog ref={ref} aria-labelledby={titleId} aria-describedby={description?descriptionId:undefined} onCancel={e=>{e.preventDefault();onClose()}} onClose={()=>{if(open)onClose()}} className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-hidden rounded-xl border border-border bg-surface p-0 text-foreground shadow-lg backdrop:bg-overlay motion-safe:animate-menu-in motion-reduce:animate-none"><div className={cn('flex max-h-[90dvh] flex-col',className)}><header className="flex items-start gap-4 border-b border-border p-5"><div className="min-w-0 flex-1"><h2 id={titleId} className="text-lg font-bold">{title}</h2>{description&&<p id={descriptionId} className="mt-1 text-sm text-muted">{description}</p>}</div><IconButton label={closeLabel??t('common:a11y.closeDialog')} onClick={onClose}><Icon name="close" className="size-5"/></IconButton></header><div className="overflow-y-auto p-5">{children}</div>{footer&&<footer className="flex flex-wrap justify-end gap-2 border-t border-border p-4">{footer}</footer>}</div></dialog>}
