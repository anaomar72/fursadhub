export type SocialPlatform = 'linkedin' | 'github' | 'portfolio' | 'x' | 'instagram' | 'youtube'

export function SocialIcon({ platform, className = 'size-5' }: { platform: SocialPlatform; className?: string }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {platform === 'linkedin' && <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 10v7M7 7v.1M11 17v-7M11 13c0-4 6-4 6 0v4" /></>}
    {platform === 'github' && <><path d="M8 21v-3c-4 1-5-2-5-2m13 5v-4c0-1-.3-1.7-1-2 4-.5 5-2 5-5 0-1-.4-2-1-3 .2-1 .2-2-.3-3-2-.1-3.5.9-4 1a13 13 0 0 0-5.4 0c-.5-.1-2-1.1-4-1-.5 1-.5 2-.3 3-.6 1-1 2-1 3 0 3 1 4.5 5 5-.7.3-1 1-1 2" /></>}
    {platform === 'portfolio' && <><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M8 7V3h8v4M3 12a20 20 0 0 0 18 0M12 12v4" /></>}
    {platform === 'x' && <><path d="m4 3 12 18h4L8 3H4ZM20 3l-7 8M11 14l-7 7" /></>}
    {platform === 'instagram' && <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><path d="M17.5 6.5h.01" /></>}
    {platform === 'youtube' && <><rect x="2" y="5" width="20" height="14" rx="4" /><path d="m10 9 5 3-5 3V9Z" /></>}
  </svg>
}
