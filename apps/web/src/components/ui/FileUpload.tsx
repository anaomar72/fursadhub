import { useId, type ChangeEvent } from 'react'
import { cn } from '../../lib/utils/cn'
import { Icon } from './Icon'

export interface FileUploadProps { label:string; hint?:string; accept?:string; multiple?:boolean; disabled?:boolean; invalid?:boolean; onFiles:(files:File[])=>void; className?:string }

/**
 * The drop-zone file picker. The whole zone is the `<label>` of a visually hidden native input, so
 * it is keyboard-reachable, announces as a file control, and shows the shared focus ring around the
 * zone while the input inside it has focus. The hint — accepted types and size — is tied to the
 * input with `aria-describedby`, so it is read before a person picks a file, not only seen.
 */
export function FileUpload({label,hint,accept,multiple,disabled,invalid,onFiles,className}:FileUploadProps){
  const id=useId()
  const hintId=`${id}-hint`
  const change=(e:ChangeEvent<HTMLInputElement>)=>onFiles(Array.from(e.target.files??[]))
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed bg-surface p-5 text-center',
        'transition-colors duration-150 hover:bg-surface-muted focus-within:ring-2 focus-within:ring-focus-ring motion-reduce:transition-none',
        invalid?'border-danger':'border-border-strong',
        disabled&&'pointer-events-none cursor-not-allowed bg-control-disabled opacity-70',
        className,
      )}
    >
      <Icon name="upload" className="size-7 text-brand-accent-ink"/>
      <span className="mt-2 text-body font-semibold text-foreground">{label}</span>
      {hint&&<span id={hintId} className="mt-1 text-caption text-foreground-secondary">{hint}</span>}
      <input id={id} className="sr-only" type="file" accept={accept} multiple={multiple} disabled={disabled} aria-invalid={invalid||undefined} aria-describedby={hint?hintId:undefined} onChange={change}/>
    </label>
  )
}
