interface ComingSoonPageProps {
  areaLabel: string
}

/** Shared placeholder for role-area index routes until each area's real features land. */
export function ComingSoonPage({ areaLabel }: ComingSoonPageProps) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
      <p className="text-sm font-medium text-foreground-secondary">{areaLabel}</p>
      <h1 className="mt-2 text-2xl font-semibold text-foreground">Coming soon</h1>
    </section>
  )
}
