import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Every English key exists in Somali and vice versa (CLAUDE.md section 56). Plural keys may differ
 * only in their plural suffix — Somali and English need not use the same CLDR categories — so
 * `_one`/`_other` are compared as one key.
 */
const LOCALES = join(__dirname, '../../../src/locales')

function keys(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object') return [prefix]
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => keys(child, prefix ? `${prefix}.${key}` : key))
}

const normalise = (key: string) => key.replace(/_(zero|one|two|few|many|other)$/, '')

describe('locale parity', () => {
  const namespaces = readdirSync(join(LOCALES, 'en')).filter((file) => file.endsWith('.json'))

  it.each(namespaces)('%s has the same keys in English and Somali', (file) => {
    const en = new Set(keys(JSON.parse(readFileSync(join(LOCALES, 'en', file), 'utf8'))).map(normalise))
    const so = new Set(keys(JSON.parse(readFileSync(join(LOCALES, 'so', file), 'utf8'))).map(normalise))
    expect([...en].filter((key) => !so.has(key))).toEqual([])
    expect([...so].filter((key) => !en.has(key))).toEqual([])
  })
})
