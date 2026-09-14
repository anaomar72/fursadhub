import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import i18n, { ensureLanguageLoaded } from './lib/i18n'

/**
 * Somali is code-split, so a visitor whose stored/detected language is Somali needs that chunk
 * before the first paint — otherwise the app renders once in the English fallback and visibly
 * re-renders when the bundle lands. English resolves instantly (it is compiled in), so this costs
 * an already-resolved promise for most visitors and one small fetch for the rest.
 */
await ensureLanguageLoaded(i18n.resolvedLanguage ?? i18n.language)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
