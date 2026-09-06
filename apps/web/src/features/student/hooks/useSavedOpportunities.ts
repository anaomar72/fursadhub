import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query'
import * as studentApi from '../api/studentApi'
import type { SavedOpportunityStatusResponse } from '../types'

/**
 * The backend's cap on `GET /students/me/saved-opportunities/status`, applied to the RAW id list
 * before de-duplication (`SavedOpportunityController.MAX_STATUS_IDS`). Asking for more is a
 * `VALIDATION_FAILED`, so a listing longer than this is chunked rather than truncated.
 */
export const SAVED_STATUS_MAX_IDS = 50

export const SAVED_STATUS_KEY = ['student', 'saved-status'] as const
export const SAVED_LIST_KEY = ['student', 'saved-list'] as const

/** Splits into request-sized batches, preserving order. */
export function chunkOpportunityIds(ids: string[], size = SAVED_STATUS_MAX_IDS): string[][] {
  const chunks: string[][] = []
  for (let index = 0; index < ids.length; index += size) {
    chunks.push(ids.slice(index, index + size))
  }
  return chunks
}

export interface SavedStatus {
  /** Whether this opportunity is currently bookmarked. */
  isSaved: (opportunityId: string) => boolean
  /** True while the first answer is still in flight — controls render disabled, not wrong. */
  isLoading: boolean
  /** True when the student is not signed in as a student, or the endpoint refused: hide the control. */
  isUnavailable: boolean
}

/**
 * Which of the opportunities currently on screen the signed-in student has saved (Backend Phase B4).
 *
 * <p><strong>One request per page of cards, never one per card.</strong> The whole reason this
 * endpoint takes a list is to avoid the HTTP N+1 that a per-card `GET .../status/{id}` would
 * create; a 12-card grid is one call. Longer listings are split into deliberate chunks of
 * {@link SAVED_STATUS_MAX_IDS} because that is the server's bound — not silently truncated, which
 * would render the tail of the page with wrong bookmark state.
 *
 * <p>Ids are sorted inside each chunk so that re-ordering the same page (a filter that returns the
 * same set) reuses the cached answer instead of refetching.
 *
 * <p>`enabled` exists because the same cards render for signed-out visitors on the public
 * marketplace, where this authenticated endpoint must not be called at all.
 */
export function useSavedOpportunityStatus(opportunityIds: string[], options: { enabled?: boolean } = {}): SavedStatus {
  const enabled = options.enabled !== false && opportunityIds.length > 0

  const chunks = chunkOpportunityIds([...new Set(opportunityIds)].sort())

  const results = useQueries({
    queries: chunks.map((chunk) => ({
      queryKey: [...SAVED_STATUS_KEY, chunk.join(',')],
      queryFn: () => studentApi.getSavedOpportunityStatus(chunk),
      enabled,
      // A student's own bookmarks change only through this app, so a short freshness window keeps
      // navigation between the listing and a detail page from re-asking on every mount.
      staleTime: 30_000,
      retry: false,
    })),
  })

  const saved = new Set<string>()
  for (const result of results) {
    for (const id of result.data?.savedOpportunityIds ?? []) saved.add(id)
  }

  return {
    isSaved: (opportunityId: string) => saved.has(opportunityId),
    isLoading: enabled && results.some((result) => result.isLoading),
    // Anyone who is not a student gets an error here (no student profile). The bookmark control is
    // then hidden rather than rendered broken — it is a student-only affordance.
    isUnavailable: enabled && results.length > 0 && results.every((result) => result.isError),
  }
}

/**
 * Save/unsave one internship, with the bookmark flipping immediately.
 *
 * <p>Both endpoints are idempotent server-side, so a double click cannot create a second bookmark
 * or 404 on an already-removed one. The optimistic write goes into every cached status batch that
 * mentions the id, which is what keeps a card and the detail page it links to in agreement.
 *
 * <p>On failure the previous cache is restored, so a rejected save does not leave a bookmark that
 * only exists in the browser.
 */
export function useToggleSavedOpportunity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ opportunityId, saved }: { opportunityId: string; saved: boolean }) =>
      saved ? studentApi.unsaveOpportunity(opportunityId) : studentApi.saveOpportunity(opportunityId),

    onMutate: async ({ opportunityId, saved }) => {
      await queryClient.cancelQueries({ queryKey: SAVED_STATUS_KEY })
      const previous = queryClient.getQueriesData<SavedOpportunityStatusResponse>({ queryKey: SAVED_STATUS_KEY })

      queryClient.setQueriesData<SavedOpportunityStatusResponse>({ queryKey: SAVED_STATUS_KEY }, (current) => {
        if (!current) return current
        const ids = new Set(current.savedOpportunityIds)
        if (saved) ids.delete(opportunityId)
        else ids.add(opportunityId)
        return { savedOpportunityIds: [...ids] }
      })

      return { previous }
    },

    onError: (_error, _variables, context) => {
      for (const [key, data] of context?.previous ?? []) {
        queryClient.setQueryData(key, data)
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: SAVED_STATUS_KEY })
      // The saved LIST is server-filtered to what is currently public, so it is refetched rather
      // than patched locally — the client cannot decide whether a newly saved item belongs in it.
      void queryClient.invalidateQueries({ queryKey: SAVED_LIST_KEY })
    },
  })
}
