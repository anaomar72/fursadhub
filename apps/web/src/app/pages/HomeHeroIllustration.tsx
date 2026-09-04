import brandIcon from '../../assets/brand/Fursad Hub app icon.png'

/** Decorative vector scene based on the approved landing-page composition. */
export function HomeHeroIllustration() {
  return <div className="relative mx-auto aspect-[1.08/1] w-full max-w-[560px] overflow-hidden" aria-hidden="true">
    <div className="absolute inset-x-[8%] top-[4%] aspect-square rounded-full bg-brand-blue-soft opacity-80 dark:bg-info-bg" />
    <div className="absolute left-1/2 top-[17%] w-[38%] -translate-x-1/2 rounded-[28%] bg-brand-navy p-2 shadow-lg"><img src={brandIcon} alt="" className="aspect-square w-full rounded-[22%] object-cover" /></div>
    <svg viewBox="0 0 560 500" className="absolute inset-0 h-full w-full" fill="none">
      <path d="M56 437h448" stroke="currentColor" className="text-brand-primary" strokeWidth="2"/>
      <path d="M112 306v-60h26v60M145 306v-92h31v92M184 306v-46h22v46M355 313v-72h30v72M392 313v-105h34v105M433 313v-54h25v54" className="fill-brand-blue-soft dark:fill-info-bg"/>
      <circle cx="151" cy="337" r="35" className="fill-brand-navy"/>
      <path d="M126 364c-31 10-46 35-52 73h160c-5-38-24-63-57-73" className="fill-brand-primary"/>
      <path d="M132 326c8-19 36-20 47 0v27c-11 19-37 18-47 0Z" fill="#f6a878"/>
      <path d="M105 433h108l-16-52h-75Z" className="fill-brand-blue-strong"/>
      <path d="M174 387h79l17 48h-81Z" className="fill-brand-navy"/>
      <circle cx="221" cy="411" r="5" className="fill-brand-blue-soft dark:fill-info-bg"/>
      <circle cx="419" cy="335" r="33" className="fill-brand-navy"/>
      <path d="M371 437c4-47 17-69 47-78 34 7 55 32 67 78Z" className="fill-brand-secondary"/>
      <path d="M395 326c9-17 34-18 45 1v26c-11 17-35 16-45-1Z" fill="#f4ad7d"/>
      <path d="m405 378-52-61 13-10 61 55" className="stroke-brand-secondary" strokeWidth="18" strokeLinecap="round"/>
      <path d="m360 314-8-28m8 28 22-18" className="stroke-brand-navy" strokeWidth="5" strokeLinecap="round"/>
      <rect x="38" y="170" width="58" height="58" rx="12" className="fill-surface stroke-brand-primary" strokeWidth="2"/>
      <circle cx="67" cy="195" r="13" className="stroke-brand-primary" strokeWidth="3"/><path d="m77 205 10 10" className="stroke-brand-primary" strokeWidth="3"/>
      <rect x="456" y="175" width="66" height="58" rx="12" className="fill-surface stroke-border" strokeWidth="2"/>
      <path d="M472 216v-13h8v13m7 0v-25h8v25m7 0v-35h8v35" className="fill-brand-primary"/>
    </svg>
  </div>
}
