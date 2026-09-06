import type { SVGProps } from 'react'

export type IconName = 'alert' | 'check' | 'chevronDown' | 'chevronLeft' | 'chevronRight' | 'close' | 'document' | 'eye' | 'eyeOff' | 'filter' | 'globe' | 'info' | 'menu' | 'moon' | 'search' | 'sun' | 'upload'
  // Phase 7 authenticated-shell navigation icons.
  | 'home' | 'briefcase' | 'clipboard' | 'users' | 'building' | 'bank' | 'graduationCap' | 'shield' | 'chart' | 'settings' | 'logout' | 'bell' | 'user' | 'userCheck' | 'badgeCheck' | 'layers' | 'scale' | 'lock'

const paths: Record<IconName, React.ReactNode> = {
  alert: <><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.7 2.5 17.2A2 2 0 0 0 4.2 20h15.6a2 2 0 0 0 1.7-2.8L13.7 3.7a2 2 0 0 0-3.4 0Z"/></>,
  check: <path d="m5 12 4 4L19 6"/>, chevronDown: <path d="m6 9 6 6 6-6"/>, chevronLeft: <path d="m15 18-6-6 6-6"/>, chevronRight: <path d="m9 18 6-6-6-6"/>, close: <path d="M18 6 6 18M6 6l12 12"/>,
  document: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
  eyeOff: <><path d="m3 3 18 18"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 4.2A10 10 0 0 1 12 4c6.5 0 10 8 10 8a18 18 0 0 1-2.1 3.2M6.6 6.6C3.7 8.5 2 12 2 12s3.5 8 10 8a9.8 9.8 0 0 0 4.1-.9"/></>,
  filter: <path d="M4 5h16M7 12h10M10 19h4"/>, menu: <path d="M4 6h16M4 12h16M4 18h16"/>, globe: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></>, info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></>,
  moon: <path d="M20.5 14.3A8 8 0 0 1 9.7 3.5 9 9 0 1 0 20.5 14.3Z"/>, search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>, sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>, upload: <><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 15v5h16v-5"/></>,
  home: <><path d="m3 10.5 9-7 9 7"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-6h4v6"/></>,
  briefcase: <><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/></>,
  clipboard: <><path d="M9 4h6v3H9z"/><path d="M15 5.5h2A1.5 1.5 0 0 1 18.5 7v12A1.5 1.5 0 0 1 17 20.5H7A1.5 1.5 0 0 1 5.5 19V7A1.5 1.5 0 0 1 7 5.5h2"/><path d="M9 12h6M9 16h4"/></>,
  users: <><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 5.2a3.5 3.5 0 0 1 0 6.6M18 14.4a6.5 6.5 0 0 1 3.5 5.6"/></>,
  building: <><path d="M4 21V5.5A1.5 1.5 0 0 1 5.5 4h7A1.5 1.5 0 0 1 14 5.5V21"/><path d="M14 10h4.5A1.5 1.5 0 0 1 20 11.5V21M3 21h18"/><path d="M7 8h4M7 12h4M7 16h4M17 14h.01M17 17.5h.01"/></>,
  bank: <><path d="m3 10 9-6 9 6"/><path d="M5.5 10v8M9.5 10v8M14.5 10v8M18.5 10v8M3 21h18"/></>,
  graduationCap: <><path d="M22 9.5 12 5 2 9.5l10 4.5 10-4.5Z"/><path d="M6 11.5V16c0 1.4 2.7 2.8 6 2.8s6-1.4 6-2.8v-4.5"/></>,
  shield: <><path d="M12 3 5 6v5.5c0 4.2 2.9 7.6 7 9.5 4.1-1.9 7-5.3 7-9.5V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 14.5a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z"/></>,
  logout: <><path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3"/><path d="m16 17 5-5-5-5M21 12H9"/></>,
  bell: <><path d="M18 8a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7"/><path d="M13.7 20a2 2 0 0 1-3.4 0"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M5 21a7 7 0 0 1 14 0"/></>,
  userCheck: <><circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="m16.5 11.5 2 2 4-4"/></>,
  badgeCheck: <><path d="m12 2.5 2.2 1.7 2.8-.3 1 2.6 2.5 1.2-.6 2.7 1.6 2.3-1.9 2-.3 2.8-2.7.7-1.6 2.3-2.6-1-2.6 1-1.6-2.3-2.7-.7-.3-2.8-1.9-2 1.6-2.3-.6-2.7 2.5-1.2 1-2.6 2.8.3L12 2.5Z"/><path d="m9 12 2 2 4-4"/></>,
  layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/></>,
  scale: <><path d="M12 3v18M7 21h10M4 8h16M12 8 8 15h8L12 8Z"/><path d="M4 8 2 15h4L4 8ZM20 8l-2 7h4l-2-7Z"/></>,
  lock: <><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><path d="M12 14.5v2.5"/></>,
}

export function Icon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>
}
