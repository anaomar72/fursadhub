import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { downloadAvatar } from '../../features/account/api/avatarApi'

/**
 * Resolves a user's avatar to a displayable blob URL, or null if they have none. The private
 * avatar route needs an Authorization header a plain `<img src>` cannot send, so the bytes are
 * fetched once and cached as bytes — unlike organization/university logos, which are
 * public and can be linked to directly (see PublicOrganizationSetupPage-style usage).
 */
export function useAvatarSrc(userId: string | null | undefined, hasAvatar: boolean) {
  const query = useQuery({
    queryKey: ['avatar', userId],
    queryFn: () => downloadAvatar(userId!),
    enabled: !!userId && hasAvatar,
    staleTime: 5 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })

  const [resource, setResource] = useState<{ blob: Blob; url: string } | null>(null)
  useEffect(() => {
    if (!query.data || !hasAvatar) return
    const url = URL.createObjectURL(query.data)
    // Synchronize the browser-owned object URL; each consumer releases its URL on replacement/unmount.
    // oxlint-disable-next-line react/set-state-in-effect -- Browser object URLs require paired creation and cleanup.
    setResource({ blob: query.data, url })
    return () => URL.revokeObjectURL(url)
  }, [query.data, hasAvatar])
  return hasAvatar && resource?.blob === query.data ? resource?.url ?? null : null
}
