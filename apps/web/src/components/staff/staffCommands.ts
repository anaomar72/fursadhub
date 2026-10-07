/**
 * The managed-staff commands that lock a person out and are therefore confirmed first: suspend
 * (signs them out everywhere), reset password (invalidates the current one and signs them out) and
 * revoke (removes the membership, with no reverse operation). Reactivate restores access and runs
 * immediately.
 */
export type ConfirmedStaffCommand = 'suspend' | 'resetPassword' | 'revoke'

/**
 * The name a confirmation addresses a staff member by — the same precedence {@link StaffIdentity}
 * renders: display name, then email, then username for an account that has only that.
 */
export function staffName(member: { displayName: string | null; email: string | null; username: string | null }): string {
  return member.displayName || member.email || member.username || ''
}
