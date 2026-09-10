import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  FilterBar,
  FormField,
  LoadingState,
  PageHeader,
  Pagination,
  Select,
  StarRating,
  StatusBadge,
  Textarea,
  type DataTableColumn,
  type StatusTone,
} from '../../../components/ui'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import * as adminApi from '../api/adminApi'
import { formatDateTime } from '../../../lib/utils/formatDate'
import { testimonialAttribution } from '../../testimonials/attribution'
import type { Testimonial, TestimonialStatus } from '../../testimonials/types'

type ModerationAction = 'publish' | 'unpublish' | 'reject'

/** Rejecting must say why. Unpublishing may carry a note; publishing needs none. */
const NEEDS_NOTE = new Set<ModerationAction>(['reject'])

const FILTER_STATUSES: TestimonialStatus[] = ['SUBMITTED', 'PUBLISHED', 'REJECTED']

const STATUS_TONE: Record<TestimonialStatus, StatusTone> = {
  SUBMITTED: 'info',
  PUBLISHED: 'success',
  REJECTED: 'danger',
}

/**
 * Which commands each status offers. The state machine lives on the backend and refuses anything
 * invalid regardless of what this map renders — REJECTED is terminal.
 */
const ACTIONS: Record<TestimonialStatus, ModerationAction[]> = {
  SUBMITTED: ['publish', 'reject'],
  PUBLISHED: ['unpublish', 'reject'],
  REJECTED: [],
}

/**
 * Testimonial moderation.
 *
 * <p>This queue is the only way a testimonial reaches the public site. Nothing auto-publishes, and
 * there is deliberately no control here that edits the quote: a moderator publishes the author's own
 * words or refuses them, because a testimonial an administrator rewrote is not a testimonial.
 */
export function AdminTestimonialsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<TestimonialStatus | ''>('SUBMITTED')
  const [page, setPage] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [prompting, setPrompting] = useState<{ id: string; action: ModerationAction } | null>(null)
  const [note, setNote] = useState('')

  const testimonialsQuery = useQuery({
    queryKey: ['admin', 'testimonials', status, page],
    queryFn: () => adminApi.listTestimonials({ status: status === '' ? undefined : status, page }),
  })

  const moderate = useMutation({
    mutationFn: ({
      id,
      action,
      moderationNote,
    }: {
      id: string
      action: ModerationAction
      moderationNote?: string
    }) => {
      setError(null)
      return adminApi.moderateTestimonial(id, action, moderationNote).catch((cause) => {
        setError(apiErrorMessage(t, 'admin', 'testimonials', cause))
        throw cause
      })
    },
    onSuccess: () => {
      setPrompting(null)
      setNote('')
      void queryClient.invalidateQueries({ queryKey: ['admin', 'testimonials'] })
      // The public wall reads a different cache key; drop it so a published quote appears.
      void queryClient.invalidateQueries({ queryKey: ['public-testimonials'] })
    },
  })

  function run(testimonial: Testimonial, action: ModerationAction) {
    if (NEEDS_NOTE.has(action) || action === 'unpublish') {
      setNote('')
      setPrompting({ id: testimonial.id, action })
      return
    }
    moderate.mutate({ id: testimonial.id, action })
  }

  const columns: DataTableColumn<Testimonial>[] = [
    {
      key: 'author',
      header: t('admin:testimonials.author'),
      render: (testimonial) => (
        <div className="min-w-0">
          <p className="font-medium text-foreground">{testimonial.authorDisplayName}</p>
          <p className="text-xs text-foreground-secondary">
            {testimonialAttribution(t, testimonial)}
          </p>
        </div>
      ),
    },
    {
      key: 'body',
      header: t('admin:testimonials.quote'),
      render: (testimonial) => (
        <div className="max-w-prose">
          {/*
            The rating is published with the quote, so the moderator has to be able to see it before
            deciding. Without it this queue showed only the words, and a one-star review and a
            five-star review reached the publish button looking identical. Renders nothing for a
            testimonial written before ratings existed, which is itself the useful signal.
          */}
          <StarRating value={testimonial.rating} className="mb-2" />
          <blockquote className="whitespace-pre-line text-sm leading-6 text-foreground">
            {testimonial.body}
          </blockquote>
        </div>
      ),
    },
    {
      key: 'status',
      header: t('admin:testimonials.statusFilter'),
      render: (testimonial) => (
        <StatusBadge tone={STATUS_TONE[testimonial.status]}>
          {t(`testimonials:status.${testimonial.status}`)}
        </StatusBadge>
      ),
    },
    {
      key: 'submittedAt',
      header: t('admin:testimonials.submittedAt'),
      className: 'whitespace-nowrap',
      render: (testimonial) => (
        <span className="text-foreground-secondary">{formatDateTime(testimonial.submittedAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: <span className="sr-only">{t('admin:testimonials.actions')}</span>,
      render: (testimonial) => (
        <div className="flex flex-col items-stretch gap-2">
          <div className="flex flex-wrap gap-2">
            {ACTIONS[testimonial.status].map((action) => (
              <Button
                key={action}
                size="sm"
                variant={action === 'publish' ? 'primary' : 'outline'}
                loading={moderate.isPending && moderate.variables?.id === testimonial.id}
                onClick={() => run(testimonial, action)}
              >
                {t(`admin:testimonials.${action}`)}
              </Button>
            ))}
          </div>

          {prompting?.id === testimonial.id && (
            <div className="rounded-lg border border-border bg-surface-muted p-3">
              <FormField
                htmlFor={`testimonial-note-${testimonial.id}`}
                label={t(`admin:testimonials.noteLabel.${prompting.action}`)}
              >
                <Textarea
                  id={`testimonial-note-${testimonial.id}`}
                  rows={3}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
              </FormField>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  loading={moderate.isPending}
                  disabled={NEEDS_NOTE.has(prompting.action) && note.trim() === ''}
                  onClick={() =>
                    moderate.mutate({
                      id: testimonial.id,
                      action: prompting.action,
                      moderationNote: note,
                    })
                  }
                >
                  {t('common:actions.confirm')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setPrompting(null)}>
                  {t('common:actions.cancel')}
                </Button>
              </div>
            </div>
          )}
        </div>
      ),
    },
  ]

  const data = testimonialsQuery.data

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={t('admin:dashboard.eyebrow')}
        title={t('admin:testimonials.title')}
        description={t('admin:testimonials.description')}
      />

      {error && <Alert tone="danger">{error}</Alert>}

      <FilterBar>
        <Select
          aria-label={t('admin:testimonials.statusFilter')}
          className="sm:w-56"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as TestimonialStatus | '')
            setPage(0)
          }}
        >
          <option value="">{t('admin:testimonials.allStatuses')}</option>
          {FILTER_STATUSES.map((value) => (
            <option key={value} value={value}>
              {t(`testimonials:status.${value}`)}
            </option>
          ))}
        </Select>
      </FilterBar>

      {testimonialsQuery.isLoading ? (
        <LoadingState label={t('common:status.loading')} />
      ) : testimonialsQuery.isError ? (
        <ErrorState
          title={t('common:status.error')}
          onRetry={() => void testimonialsQuery.refetch()}
          retryLabel={t('common:actions.retry')}
        />
      ) : (
        <>
          <p className="text-sm text-foreground-secondary" aria-live="polite">
            {t('admin:testimonials.resultCount', { count: data?.totalElements ?? 0 })}
          </p>
          <DataTable
            caption={t('admin:testimonials.title')}
            columns={columns}
            rows={data?.content ?? []}
            rowKey={(testimonial) => testimonial.id}
            empty={<EmptyState title={t('admin:testimonials.empty')} />}
          />
          {(data?.totalPages ?? 0) > 1 && (
            <Pagination page={page} totalPages={data!.totalPages} onPageChange={setPage} />
          )}
        </>
      )}
    </div>
  )
}
