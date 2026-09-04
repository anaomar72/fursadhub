import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card, Icon } from '../../components/ui'
import { HomeHeroIllustration } from './HomeHeroIllustration'

const audiences = ['student', 'organization', 'university'] as const
const capabilities = ['internships', 'entities', 'pipeline'] as const

export function HomePage() {
  const { t } = useTranslation()
  return <div className="overflow-x-clip bg-background">
    <section className="mx-auto grid w-full max-w-7xl gap-10 px-4 pb-12 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-8 lg:pb-16 lg:pt-14">
      <div className="animate-hero-fade motion-reduce:animate-none">
        <h1 aria-label={`${t('common:landing.hero.connect')} ${t('common:landing.hero.learn')} ${t('common:landing.hero.grow')}`} className="font-display text-5xl font-extrabold leading-[1.05] tracking-[-0.045em] text-brand-navy dark:text-foreground sm:text-6xl lg:text-7xl">
          <span className="block">{t('common:landing.hero.connect')}</span>
          <span className="mt-2 block"><span className="text-brand-primary">{t('common:landing.hero.learn')}</span> {t('common:landing.hero.grow')}</span>
        </h1>
        <p className="mt-8 max-w-xl text-base leading-8 text-foreground-secondary sm:text-lg">{t('common:landing.hero.description')}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link to="/opportunities" className="inline-flex h-12 items-center justify-center rounded-md bg-brand-primary px-6 text-sm font-semibold text-on-brand shadow-sm transition-[background-color,transform,box-shadow] hover:-translate-y-0.5 hover:bg-brand-blue-strong hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transform-none motion-reduce:transition-none">{t('common:landing.hero.browse')}</Link>
          <Link to="/register" className="inline-flex h-12 items-center justify-center rounded-md border border-brand-primary bg-surface px-6 text-sm font-semibold text-brand-primary transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-brand-blue-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transform-none motion-reduce:transition-none dark:border-info dark:text-info dark:hover:bg-info-bg">{t('common:landing.hero.getStarted')}</Link>
        </div>
      </div>
      <div className="animate-hero-fade motion-reduce:animate-none"><HomeHeroIllustration /></div>
    </section>

    <section aria-label={t('common:landing.capabilities.label')} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="grid overflow-hidden rounded-xl border border-border bg-surface shadow-xs sm:grid-cols-3">
        {capabilities.map((item, index) => <div key={item} className="flex items-center gap-4 border-b border-border px-6 py-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"><CapabilityIcon index={index}/><div><p className="font-bold text-brand-navy dark:text-foreground">{t(`common:landing.capabilities.${item}.title`)}</p><p className="mt-0.5 text-sm text-foreground-secondary">{t(`common:landing.capabilities.${item}.body`)}</p></div></div>)}
      </div>
    </section>

    <section id="how-it-works" className="scroll-mt-24 px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="text-center"><h2 className="font-display text-3xl font-bold tracking-tight text-brand-navy dark:text-foreground sm:text-4xl">{t('common:landing.ecosystem.title')}</h2><p className="mt-3 text-foreground-secondary">{t('common:landing.ecosystem.subtitle')}</p></div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {audiences.map((audience, index) => <Card key={audience} padding="lg" className="group min-h-52 transition-[border-color,box-shadow,transform] hover:-translate-y-1 hover:border-brand-primary hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none"><div className="flex items-start gap-4"><StakeholderIcon index={index}/><div><h3 className="text-lg font-bold text-brand-navy dark:text-foreground">{t(`common:landing.ecosystem.${audience}.title`)}</h3><p className="mt-3 leading-7 text-foreground-secondary">{t(`common:landing.ecosystem.${audience}.body`)}</p></div></div></Card>)}
        </div>
      </div>
    </section>
  </div>
}

function CapabilityIcon({ index }: { index: number }) { const names = ['search', 'globe', 'check'] as const; return <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-blue-soft text-brand-primary"><Icon name={names[index]} className="size-5" /></span> }

function StakeholderIcon({ index }: { index: number }) {
  return <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand-primary text-on-brand shadow-sm"><svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{index===0?<><circle cx="12" cy="8" r="4"/><path d="M5 21a7 7 0 0 1 14 0"/></>:index===1?<><path d="M4 21V9l8-5 8 5v12M8 21v-6h8v6M8 11h.01M12 11h.01M16 11h.01"/></>:<><path d="m3 10 9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 21h18"/></>}</svg></span>
}
