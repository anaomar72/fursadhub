import { type ReactNode, useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../../lib/auth/AuthContext'
import { ThemeProvider } from '../../lib/theme/ThemeProvider'
import i18n from '../../lib/i18n'

/** Keeps `<html lang>` in sync with the active UI language — screen readers and browser
 * translation tooling read this attribute, not React state. The inline script in index.html
 * sets the initial value before hydration; this covers language changes at runtime. */
function useDocumentLanguageSync() {
  useEffect(() => {
    function apply(language: string) {
      document.documentElement.lang = language.startsWith('so') ? 'so' : 'en'
    }
    apply(i18n.resolvedLanguage ?? i18n.language)
    i18n.on('languageChanged', apply)
    return () => {
      i18n.off('languageChanged', apply)
    }
  }, [])
}

export function AppProviders({ children }: { children: ReactNode }) {
  useDocumentLanguageSync()
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  )

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
