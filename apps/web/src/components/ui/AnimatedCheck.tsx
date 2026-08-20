import { cn } from '../../lib/utils/cn'

export interface AnimatedCheckProps {
  label: string
  className?: string
}

/**
 * Reusable one-time "VERIFIED" confirmation: circle scales/fades in, the
 * checkmark draws, then the label fades in — then the animation stops and a
 * stable verified state remains (BRAND_AND_UI_GUIDELINES.md section 14).
 *
 * Plays once per mount; it must never be re-triggered on ordinary re-renders,
 * and never continuously pulse. `motion-reduce:` disables the drawing
 * animation and shows the final state immediately.
 */
export function AnimatedCheck({ label, className }: AnimatedCheckProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3 text-success', className)}>
      <svg
        width="56"
        height="56"
        viewBox="0 0 56 56"
        fill="none"
        role="img"
        aria-hidden="true"
        className="motion-reduce:[&_*]:animate-none"
      >
        <circle
          cx="28"
          cy="28"
          r="26"
          className="fill-success-bg stroke-success animate-verified-circle motion-reduce:animate-none"
          strokeWidth="2"
        />
        <path
          d="M18 28.5L24.5 35L38 20"
          className="stroke-success animate-verified-check motion-reduce:animate-none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={24}
          strokeDasharray={24}
        />
      </svg>
      <span className="animate-verified-text text-sm font-medium motion-reduce:animate-none" aria-live="polite">
        {label}
      </span>
    </div>
  )
}
