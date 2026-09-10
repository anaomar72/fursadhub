import { useTranslation } from 'react-i18next'
import { Button } from './Button'
import { Modal } from './Modal'
export interface ConfirmationDialogProps { open:boolean; onClose:()=>void; onConfirm:()=>void; title:string; description:string; confirmLabel?:string; cancelLabel?:string; destructive?:boolean; loading?:boolean; closeLabel?:string }
export function ConfirmationDialog({open,onClose,onConfirm,title,description,confirmLabel,cancelLabel,destructive,loading,closeLabel}:ConfirmationDialogProps){const {t}=useTranslation();return <Modal open={open} onClose={onClose} closeLabel={closeLabel} title={title} footer={<><Button variant="ghost" onClick={onClose}>{cancelLabel??t('common:actions.cancel')}</Button><Button variant={destructive?'danger':'primary'} loading={loading} onClick={onConfirm}>{confirmLabel??t('common:actions.confirm')}</Button></>}><p className="text-sm text-foreground-secondary">{description}</p></Modal>}
