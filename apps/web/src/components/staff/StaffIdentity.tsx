import { Icon } from '../ui/Icon'
import { cn } from '../../lib/utils/cn'

export interface StaffIdentityProps {
  /** Backend Phase B5. Null for an account created before B5. */
  displayName: string | null
  /** The account's contact address. Also the login credential for a legacy, username-less account. */
  email: string | null
  /** Backend Phase B5.5. Null for a legacy account that still signs in by email. */
  username: string | null
  /** Rendered under the identity — the role, and the scope where one exists. */
  children?: React.ReactNode
  /** Shown in place of a missing username, e.g. an "Assign username" control. */
  usernameAction?: React.ReactNode
  noDisplayNameLabel: string
  noUsernameLabel: string
  className?: string
}

/**
 * One managed staff member's identity, in the order Phase D section 26 defines:
 * **display name first** as the human identity, then email as contact, then username as the login
 * identifier. Three distinct things, shown as three distinct things.
 *
 * <p><strong>The fallback for a null display name is the email address itself, verbatim.</strong>
 * A staff account created before Backend Phase B5 genuinely has no name, and FursadHub does not
 * know one. Deriving "A. Hassan" from `ahassan@…` would invent an identity for a real person out of
 * a mailbox string — it is wrong about as often as it is right, and it is not FursadHub's to guess.
 * Showing the email is honest and is exactly what every pre-B5 client already showed.
 */
export function StaffIdentity({
  displayName,
  email,
  username,
  children,
  usernameAction,
  noDisplayNameLabel,
  noUsernameLabel,
  className,
}: StaffIdentityProps) {
  const primary = displayName?.trim() || email || noDisplayNameLabel
  // Only a second line when it says something the primary line does not.
  const showEmailSeparately = Boolean(displayName?.trim()) && Boolean(email)

  return (
    <div className={cn('min-w-0', className)}>
      <p className="truncate font-semibold text-foreground">{primary}</p>

      {showEmailSeparately && (
        <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-sm text-foreground-secondary">
          <Icon name="document" className="size-3.5 shrink-0" />
          <span className="truncate">{email}</span>
        </p>
      )}

      <p className="mt-0.5 flex min-w-0 flex-wrap items-center gap-1.5 text-sm text-foreground-secondary">
        <Icon name="idCard" className="size-3.5 shrink-0" />
        {username ? (
          <span className="truncate font-mono text-[13px]">{username}</span>
        ) : (
          <>
            <span className="text-muted">{noUsernameLabel}</span>
            {usernameAction}
          </>
        )}
      </p>

      {children}
    </div>
  )
}
