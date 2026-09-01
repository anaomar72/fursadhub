import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/utils/cn'

interface DoorCard {
  role: 'student' | 'organization' | 'university'
  href: string
}

const DOORS: DoorCard[] = [
  { role: 'student', href: '/register?role=student' },
  { role: 'organization', href: '/register?role=organization' },
  { role: 'university', href: '/register?role=university' },
]

/**
 * The landing page (replacing the Phase 0 placeholder). Its one job: get a student, an
 * organization, or a university to self-identify and start the right registration path.
 *
 * <p>The three "doors" are the hero's signature element, not decoration next to a generic
 * "Sign up" button — they literally extend the brand's own doorway concept ("Opening doors to
 * your future"), and each one *is* the entry point into its role's registration flow
 * (docs/product/BRAND_AND_UI_GUIDELINES.md section 1-2).
 */
const LIFECYCLE_ITEMS = ['logs', 'attendance', 'supervision', 'evaluation', 'defense'] as const

export function HomePage() {
  const { t } = useTranslation()
  const location = useLocation()

  // Arriving from another page via a "#how-it-works" link (e.g. the footer or navbar on
  // /opportunities) needs a manual scroll — React Router doesn't scroll to a hash on navigation
  // the way a full page load would. Same-page anchor clicks are handled by the browser natively
  // (index.css sets scroll-behavior: smooth, off under prefers-reduced-motion).
  useEffect(() => {
    if (location.hash !== '#how-it-works') return
    document.getElementById('how-it-works')?.scrollIntoView({ block: 'start' })
  }, [location.hash])

  return (
    <div className="flex flex-col">
      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="animate-hero-fade motion-reduce:animate-none mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-primary">
            {t('common:landing.eyebrow')}
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {t('app.tagline')}
          </h1>
          <p className="mt-4 text-lg text-foreground-secondary">{t('common:landing.subhead')}</p>
          <a
            href="#how-it-works"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-foreground-secondary underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          >
            {t('common:landing.secondaryCta')}
            <span aria-hidden="true">↓</span>
          </a>
        </div>

        <div className="animate-hero-fade motion-reduce:animate-none mt-12 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {DOORS.map((door) => (
            <DoorCardLink key={door.role} door={door} />
          ))}
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-16 border-t border-border bg-surface-muted">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="font-[family-name:var(--font-display)] text-center text-2xl font-semibold text-foreground">
            {t('common:landing.howItWorks.title')}
          </h2>
          <ol className="mx-auto mt-8 grid max-w-4xl grid-cols-1 gap-8 sm:grid-cols-3">
            {(['sourcing', 'recruitment', 'placement'] as const).map((step, index) => (
              <li key={step} className="text-center">
                <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-brand-primary text-sm font-semibold text-on-brand">
                  {index + 1}
                </div>
                <h3 className="mt-3 text-sm font-semibold text-foreground">
                  {t(`common:landing.howItWorks.steps.${step}.title`)}
                </h3>
                <p className="mt-1 text-sm text-foreground-secondary">
                  {t(`common:landing.howItWorks.steps.${step}.body`)}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:items-center md:gap-16">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-foreground">
              {t('common:landing.lifecycle.title')}
            </h2>
            <p className="mt-3 text-foreground-secondary">{t('common:landing.lifecycle.body')}</p>
          </div>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {LIFECYCLE_ITEMS.map((item) => (
              <li
                key={item}
                className="flex items-center gap-3 rounded-md border border-border bg-surface px-4 py-3 text-sm font-medium text-foreground"
              >
                <CheckDotIcon />
                {t(`common:landing.lifecycle.items.${item}`)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-t border-border bg-surface-muted">
        <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-16 text-center sm:px-6">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-foreground sm:text-3xl">
            {t('common:landing.cta.title')}
          </h2>
          <p className="mt-3 text-foreground-secondary">{t('common:landing.cta.body')}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/register"
              className="inline-flex h-11 items-center justify-center rounded-md bg-brand-primary px-6 text-sm font-medium text-on-brand transition-colors duration-150 ease-in-out hover:bg-brand-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            >
              {t('common:landing.cta.primary')}
            </Link>
            <Link
              to="/login"
              className="inline-flex h-11 items-center justify-center rounded-md border border-border bg-transparent px-6 text-sm font-medium text-foreground transition-colors duration-150 ease-in-out hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            >
              {t('common:landing.cta.secondary')}
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-10 text-center sm:px-6">
        <p className="text-sm text-foreground-secondary">{t('common:landing.trustLine')}</p>
      </section>
    </div>
  )
}

function DoorCardLink({ door }: { door: DoorCard }) {
  const { t } = useTranslation()

  return (
    <Link
      to={door.href}
      className={cn(
        'group flex flex-col gap-3 rounded-lg border border-border bg-surface p-6',
        'transition-all duration-150 ease-in-out',
        'hover:-translate-y-0.5 hover:border-brand-primary hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary',
      )}
    >
      <DoorIcon />
      <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-foreground">
        {t(`common:landing.doors.${door.role}.title`)}
      </h2>
      <p className="text-sm text-foreground-secondary">{t(`common:landing.doors.${door.role}.body`)}</p>
      <span className="mt-auto flex items-center gap-1 text-sm font-medium text-brand-primary">
        {t(`common:landing.doors.${door.role}.cta`)}
        <span aria-hidden="true" className="transition-transform duration-150 ease-in-out group-hover:translate-x-0.5">
          →
        </span>
      </span>
    </Link>
  )
}

function CheckDotIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="shrink-0 text-brand-primary">
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
      <path d="M6.5 10.5l2.25 2.25L14 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** A small arched-doorway mark, echoing the brand's own logo concept (an open door, a path forward). */
function DoorIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" role="img" aria-hidden="true" className="text-brand-primary">
      <path
        d="M10 34V16C10 10.4772 14.4772 6 20 6C25.5228 6 30 10.4772 30 16V34"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
      />
      <path d="M15 34V17" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" opacity="0.5" />
      <path d="M25 34L32 30" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
    </svg>
  )
}
