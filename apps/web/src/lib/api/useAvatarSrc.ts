import { useQuery } from '@tanstack/react-query'
import { downloadAvatar } from '../../features/account/api/avatarApi'

/**
 * Resolves a user's avatar to a displayable blob URL, or null if they have none. The private
 * avatar route needs an Authorization header a plain `<img src>` cannot send, so the bytes are
 * fetched once and cached as an object URL — unlike organization/university logos, which are
 * public and can be linked to directly (see PublicOrganizationSetupPage-style usage).
 */
export function useAvatarSrc(userId: string | null | undefined, hasAvatar: boolean) {
  const query = useQuery({
    queryKey: ['avatar', userId],
    queryFn: async () => {
      const blob = await downloadAvatar(userId!)
      return URL.createObjectURL(blob)
    },
    enabled: !!userId && hasAvatar,
    staleTime: 5 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })

  return query.data ?? null
}
