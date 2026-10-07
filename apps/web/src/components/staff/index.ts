/**
 * Managed-staff identity presentation and commands (Backend Phase B5/B5.5), shared by the
 * University and Organization portals.
 *
 * <p>Not in `components/ui`, which is reserved for genuinely generic UI: these know what a managed
 * staff account is. Not inside either tenant feature either, because both use them identically and
 * a second copy is a second place for the "username is permanent, never renamed" rule to be lost.
 */
export { StaffIdentity, type StaffIdentityProps } from './StaffIdentity'
export { StaffIdentityControls, type StaffIdentityControlsProps } from './StaffIdentityControls'
export { staffName, type ConfirmedStaffCommand } from './staffCommands'
export { useStaffActionFeedback, type StaffActionFeedback, type StaffLifecycleCommand } from './useStaffActionFeedback'
export { StaffActionFeedbackAlert } from './StaffActionFeedbackAlert'
