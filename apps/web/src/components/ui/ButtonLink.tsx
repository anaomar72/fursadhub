import { forwardRef } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { buttonClasses, type ButtonSize, type ButtonVariant } from './buttonStyles'

export interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant
  size?: ButtonSize
}

/**
 * A router link that looks exactly like a {@link Button}.
 *
 * <p>It is a real `<a>`, not a button with an onClick, so it keeps everything a link should have —
 * middle-click, open-in-new-tab, the browser's own status preview, and the correct role for a
 * screen reader. The rule is about what the control DOES: navigating is a link, acting is a button.
 */
export const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => (
    <Link ref={ref} className={buttonClasses(variant, size, className)} {...props} />
  ),
)

ButtonLink.displayName = 'ButtonLink'
